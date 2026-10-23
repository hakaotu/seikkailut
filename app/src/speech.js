// The only place that touches speechSynthesis. One instance is shared by all games.
//
// Every path out of 'playing' is driven by this service (start timer, cap timer,
// events guarded by a generation token), never by a single event that may not come.
// Everything from the caller's tap to the first synth.speak() runs synchronously, and so do
// all parts up to the first one with pauseMs. A part with pauseMs > 0 is spoken from a timer,
// that long after the previous part's onend; a pause timer and a 2 s start timer for that part
// are cleared with the rest, so stop() or a new say() kills a pending second reading.
//
// onState(state, reason): 'playing' | 'idle' | 'failed'.
// reason on 'failed': 'unsupported' | 'missing' | 'nostart' | 'error'.

function normalise(lang) {
  return String(lang || '').toLowerCase().replace(/_/g, '-');
}

// Voice names for pickVoice, lower case and without accents. Edit the lists here.
// GOOD: natural-sounding device voices, in order of preference, by language prefix.
// AVOID: Apple's robotic "Eloquence" set and its novelty voices; used only when
// nothing else matches the language. A voice with Enhanced, Premium or Siri
// in its name or voiceURI is a bonus, but only for a voice listed in GOOD. Google's
// network voices rank below the local good ones.
const GOOD_VOICES = {
  fi: ['satu', 'onni'],
  es: ['monica', 'jorge', 'marisol', 'paulina'],
};
const AVOID_VOICES = new Set([
  'eddy', 'flo', 'grandma', 'grandpa', 'reed', 'rocko', 'sandy', 'shelley',
  'albert', 'bad news', 'bahh', 'bells', 'boing', 'bubbles', 'cellos', 'good news',
  'jester', 'organ', 'superstar', 'trinoids', 'whisper', 'wobble', 'zarvox',
]);
const BONUS_NAME = /enhanced|premium|siri/i;
const BONUS_URI = /enhanced|premium/i;

// "Satu (Enhanced)" and "Eddy (suomi (Suomi))" both reduce to the part before " (".
function baseName(name) {
  return String(name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(' (')[0]
    .trim();
}

// Higher is better: [name score, exact tag and local > exact tag > prefix, earlier in GOOD].
function voiceRank(v, tag, prefix) {
  const full = baseName(v.name);
  const good = (GOOD_VOICES[prefix] || []).indexOf(full);
  let score = 0;
  if (AVOID_VOICES.has(full)) score = -100;
  else {
    if (good >= 0) {
      score = 20;
      if (BONUS_NAME.test(String(v.name || '')) || BONUS_URI.test(String(v.voiceURI || ''))) score += 30;
    } else if (full.startsWith('google')) score = 10;
  }
  const exact = normalise(v.lang) === tag;
  // -good: between good voices of equal score and tag match, the one earlier in GOOD wins.
  return [score, exact ? (v.localService ? 2 : 1) : 0, -good];
}

export function createSpeech({
  synth,
  Utterance,
  setTimeout: setTimer = (...args) => globalThis.setTimeout(...args),
  clearTimeout: clearTimer = (...args) => globalThis.clearTimeout(...args),
  startTimeoutMs = 2000,
  maxMs = 12000,
} = {}) {
  let gen = 0;
  let current = null; // { gen, onState, started, utterances, startTimer, capTimer, pauseTimer, partTimer, waiting }
  const listeners = new Set();

  function voices() {
    try {
      return synth && synth.getVoices ? Array.from(synth.getVoices()) : [];
    } catch {
      return [];
    }
  }

  function availability(lang) {
    if (!synth || !Utterance) return 'unsupported';
    const list = voices();
    if (list.length === 0) return 'unknown';
    const prefix = normalise(lang).split('-')[0];
    const found = list.some((v) => {
      const l = normalise(v.lang);
      return l === prefix || l.startsWith(prefix + '-');
    });
    return found ? 'available' : 'missing';
  }

  function pickVoice(lang) {
    const tag = normalise(lang);
    const prefix = tag.split('-')[0];
    let best = null;
    let bestRank = null;
    for (const v of voices()) {
      if (normalise(v.lang).split('-')[0] !== prefix) continue;
      const rank = voiceRank(v, tag, prefix);
      const better =
        !best ||
        rank.some((n, i) => {
          for (let j = 0; j < i; j++) if (rank[j] !== bestRank[j]) return false;
          return n > bestRank[i];
        });
      if (better) {
        best = v;
        bestRank = rank;
      }
    }
    return best;
  }

  function clearTimers(call) {
    if (!call) return;
    if (call.startTimer != null) clearTimer(call.startTimer);
    if (call.capTimer != null) clearTimer(call.capTimer);
    if (call.pauseTimer != null) clearTimer(call.pauseTimer);
    if (call.partTimer != null) clearTimer(call.partTimer);
    call.startTimer = null;
    call.capTimer = null;
    call.pauseTimer = null;
    call.partTimer = null;
  }

  function cancel() {
    try {
      if (synth) synth.cancel();
    } catch {
      // nothing useful to do
    }
  }

  // Ends the call: later events from its utterances are ignored.
  function finish(call, state, reason) {
    if (current !== call) return;
    clearTimers(call);
    current = null;
    call.onState(state, reason);
  }

  function say(lang, parts, onState) {
    const previous = current;
    const g = ++gen;
    if (previous) {
      clearTimers(previous);
      current = null;
      previous.onState('idle');
    }

    const avail = availability(lang);
    if (avail === 'unsupported' || avail === 'missing') {
      cancel();
      onState('failed', avail);
      return;
    }

    const call = {
      gen: g,
      onState,
      started: false,
      utterances: [],
      startTimer: null,
      capTimer: null,
      pauseTimer: null,
      partTimer: null,
      waiting: null, // index of the delayed part that has been spoken but has not started yet
    };
    current = call;
    cancel();

    const voice = pickVoice(lang);
    const last = parts.length - 1;
    // Silence before part i, in ms. Never before the first part.
    const pauses = parts.map((part, i) => {
      const ms = part.pauseMs;
      return i > 0 && typeof ms === 'number' && Number.isFinite(ms) && ms > 0 ? ms : 0;
    });
    const firstDelayed = pauses.findIndex((ms) => ms > 0);

    // Speaks part `from` and the parts after it, up to the next part that has a pause.
    function speakRun(from) {
      for (let i = from; i <= last; i++) {
        if (i > from && pauses[i] > 0) break;
        synth.speak(call.utterances[i]);
      }
    }

    parts.forEach((part, i) => {
      const u = new Utterance(part.text);
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = part.rate || 1;
      u.onstart = () => {
        if (gen !== g || current !== call) return;
        if (call.waiting === i) {
          if (call.partTimer != null) clearTimer(call.partTimer);
          call.partTimer = null;
          call.waiting = null;
        }
        if (call.started) return;
        call.started = true;
        if (call.startTimer != null) clearTimer(call.startTimer);
        call.startTimer = null;
        onState('playing');
        call.capTimer = setTimer(() => {
          if (gen !== g || current !== call) return;
          current = null;
          clearTimers(call);
          cancel();
          onState('idle');
        }, maxMs);
      };
      u.onend = () => {
        if (gen !== g || current !== call) return;
        if (i === last) {
          finish(call, 'idle');
        } else if (pauses[i + 1] > 0) {
          call.pauseTimer = setTimer(() => {
            if (gen !== g || current !== call) return;
            call.pauseTimer = null;
            call.waiting = i + 1;
            // A browser may refuse a speak() that is not from a tap without any event.
            call.partTimer = setTimer(() => {
              if (gen !== g || current !== call) return;
              current = null;
              clearTimers(call);
              cancel();
              onState('idle');
            }, startTimeoutMs);
            speakRun(i + 1);
          }, pauses[i + 1]);
        }
      };
      u.onerror = (event) => {
        if (gen !== g || current !== call) return;
        const err = event && event.error;
        if (err === 'canceled' || err === 'interrupted') finish(call, 'idle');
        // The first reading was heard; a refusal of the later one (Chrome: not-allowed) is not a failure.
        else if (firstDelayed >= 0 && i >= firstDelayed) finish(call, 'idle');
        else finish(call, 'failed', 'error');
      };
      // Keep a reference: Chrome can collect an unreferenced utterance and never fire onend.
      call.utterances.push(u);
    });
    speakRun(0);

    call.startTimer = setTimer(() => {
      if (gen !== g || current !== call || call.started) return;
      current = null;
      clearTimers(call);
      cancel();
      onState('failed', 'nostart');
    }, startTimeoutMs);
  }

  function stop() {
    gen++;
    const previous = current;
    current = null;
    clearTimers(previous);
    cancel();
    if (previous) previous.onState('idle');
  }

  function onVoicesChanged(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  if (synth && typeof synth.addEventListener === 'function') {
    synth.addEventListener('voiceschanged', () => {
      for (const listener of Array.from(listeners)) listener();
    });
  } else if (synth) {
    synth.onvoiceschanged = () => {
      for (const listener of Array.from(listeners)) listener();
    };
  }

  return { availability, pickVoice, say, stop, onVoicesChanged };
}
