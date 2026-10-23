// The only place that touches speechSynthesis. One instance is shared by all games.
//
// Every path out of 'playing' is driven by this service (start timer, cap timer,
// events guarded by a generation token), never by a single event that may not come.
// Everything from the caller's tap to the last synth.speak() runs synchronously.
//
// onState(state, reason): 'playing' | 'idle' | 'failed'.
// reason on 'failed': 'unsupported' | 'missing' | 'nostart' | 'error'.

function normalise(lang) {
  return String(lang || '').toLowerCase().replace(/_/g, '-');
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
  let current = null; // { gen, onState, started, utterances, startTimer, capTimer }
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
    const list = voices();
    return (
      list.find((v) => normalise(v.lang) === tag && v.localService) ||
      list.find((v) => normalise(v.lang) === tag) ||
      list.find((v) => normalise(v.lang).split('-')[0] === prefix) ||
      null
    );
  }

  function clearTimers(call) {
    if (!call) return;
    if (call.startTimer != null) clearTimer(call.startTimer);
    if (call.capTimer != null) clearTimer(call.capTimer);
    call.startTimer = null;
    call.capTimer = null;
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

    const call = { gen: g, onState, started: false, utterances: [], startTimer: null, capTimer: null };
    current = call;
    cancel();

    const voice = pickVoice(lang);
    const last = parts.length - 1;
    parts.forEach((part, i) => {
      const u = new Utterance(part.text);
      u.lang = lang;
      if (voice) u.voice = voice;
      u.rate = part.rate || 1;
      u.onstart = () => {
        if (gen !== g || current !== call || call.started) return;
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
        if (i === last) finish(call, 'idle');
      };
      u.onerror = (event) => {
        if (gen !== g || current !== call) return;
        const err = event && event.error;
        if (err === 'canceled' || err === 'interrupted') finish(call, 'idle');
        else finish(call, 'failed', 'error');
      };
      // Keep a reference: Chrome can collect an unreferenced utterance and never fire onend.
      call.utterances.push(u);
    });
    call.utterances.forEach((u) => synth.speak(u));

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
