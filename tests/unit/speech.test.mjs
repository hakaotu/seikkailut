import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createSpeech } from '../../app/src/speech.js';

class FakeUtterance {
  constructor(text) {
    this.text = text;
  }
}

function makeSynth(voices = []) {
  const synth = {
    voices,
    spoken: [],
    cancels: 0,
    listeners: {},
    speak(u) {
      this.spoken.push(u);
    },
    cancel() {
      this.cancels += 1;
    },
    getVoices() {
      return this.voices;
    },
    addEventListener(type, fn) {
      (this.listeners[type] ||= []).push(fn);
    },
    setVoices(list) {
      this.voices = list;
      (this.listeners.voiceschanged || []).forEach((fn) => fn());
    },
  };
  return synth;
}

const voice = (lang, localService = true) => ({ lang, localService, name: lang });

function recorder() {
  const log = [];
  const fn = (state, reason) => log.push(reason ? `${state}:${reason}` : state);
  fn.log = log;
  return fn;
}

function setup(voices) {
  const synth = makeSynth(voices);
  const speech = createSpeech({ synth, Utterance: FakeUtterance });
  return { synth, speech };
}

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());

test('no synth: failed unsupported, no throw', () => {
  const speech = createSpeech({ synth: undefined, Utterance: undefined });
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa' }], cb);
  assert.deepEqual(cb.log, ['failed:unsupported']);
  speech.stop();
});

test('only English voices: failed missing, speak never called', () => {
  const { synth, speech } = setup([voice('en-US')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa' }], cb);
  assert.deepEqual(cb.log, ['failed:missing']);
  assert.equal(synth.spoken.length, 0);
});

test('empty voice list: speaks with lang only, no voice set', () => {
  const { synth, speech } = setup([]);
  const cb = recorder();
  assert.equal(speech.availability('fi-FI'), 'unknown');
  speech.say('fi-FI', [{ text: 'kissa' }], cb);
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].lang, 'fi-FI');
  assert.equal(synth.spoken[0].voice, undefined);
  assert.deepEqual(cb.log, []);
});

test('fi_FI voice counts as available and is picked', () => {
  const fi = voice('fi_FI');
  const { synth, speech } = setup([voice('en-US'), fi]);
  assert.equal(speech.availability('fi-FI'), 'available');
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa', rate: 0.78 }], cb);
  assert.equal(synth.spoken[0].voice, fi);
  assert.equal(synth.spoken[0].rate, 0.78);
});

test('prefers the exact tag with a local voice over a remote one', () => {
  const remote = voice('es-ES', false);
  const local = voice('es-ES', true);
  const { speech } = setup([voice('es-MX'), remote, local]);
  assert.equal(speech.pickVoice('es-ES'), local);
});

const named = (name, lang, localService = true) => ({ name, lang, localService });
const eloquence = ['Eddy', 'Flo', 'Grandma', 'Grandpa', 'Reed', 'Rocko', 'Sandy', 'Shelley'];

test('Finnish: Satu is chosen over Eloquence voices whatever the order', () => {
  const satu = named('Satu', 'fi-FI');
  const others = eloquence.map((n) => named(n, 'fi-FI'));
  for (const list of [[satu, ...others], [...others, satu], [...others.slice(0, 3), satu, ...others.slice(3)]]) {
    const { speech } = setup([voice('en-US'), ...list]);
    assert.equal(speech.pickVoice('fi-FI'), satu);
  }
});

test('Enhanced beats plain, in either order', () => {
  const plain = named('Satu', 'fi-FI');
  const enhanced = named('Satu (Enhanced)', 'fi-FI');
  assert.equal(setup([plain, enhanced]).speech.pickVoice('fi-FI'), enhanced);
  assert.equal(setup([enhanced, plain]).speech.pickVoice('fi-FI'), enhanced);
  const premium = named('Mónica (Premium)', 'es-ES');
  const monica = named('Mónica', 'es-ES');
  assert.equal(setup([monica, premium]).speech.pickVoice('es-ES'), premium);
});

test('an Eloquence or novelty voice is used only when it is the only Finnish voice', () => {
  const eddy = named('Eddy (suomi (Suomi))', 'fi-FI');
  const zarvox = named('Zarvox', 'fi-FI');
  assert.equal(setup([named('Alex', 'en-US'), eddy]).speech.pickVoice('fi-FI'), eddy);
  assert.equal(setup([zarvox, eddy]).speech.pickVoice('fi-FI'), zarvox);
  assert.equal(setup([eddy, named('Satu', 'fi-FI')]).speech.pickVoice('fi-FI').name, 'Satu');
  assert.equal(setup([zarvox, voice('fi-FI')]).speech.pickVoice('fi-FI').name, 'fi-FI');
});

test('Spanish: Mónica is chosen over Rocko, and a Finnish voice is never used for Spanish', () => {
  const monica = named('Mónica', 'es-ES');
  const rocko = named('Rocko', 'es-ES');
  const satu = named('Satu', 'fi-FI');
  assert.equal(setup([rocko, satu, monica]).speech.pickVoice('es-ES'), monica);
  assert.equal(setup([monica, rocko]).speech.pickVoice('es-ES'), monica);
  assert.equal(setup([satu, rocko]).speech.pickVoice('es-ES'), rocko);
  assert.equal(setup([satu]).speech.pickVoice('es-ES'), null);
});

test('Google network voice ranks below a local good voice but above an unknown one', () => {
  const google = named('Google español', 'es-ES', false);
  const monica = named('Mónica', 'es-ES');
  const other = named('Whatever', 'es-ES');
  assert.equal(setup([google, monica]).speech.pickVoice('es-ES'), monica);
  assert.equal(setup([other, google]).speech.pickVoice('es-ES'), google);
});

test('the exact tag still beats a prefix match within the same rank', () => {
  const mx = named('Mónica', 'es-MX');
  const es = named('Mónica', 'es-ES');
  assert.equal(setup([mx, es]).speech.pickVoice('es-ES'), es);
  assert.equal(setup([es, mx]).speech.pickVoice('es-ES'), es);
  const otherMx = named('Whatever', 'es-MX');
  const otherEs = named('Whatever', 'es-ES');
  assert.equal(setup([otherMx, otherEs]).speech.pickVoice('es-ES'), otherEs);
  assert.equal(setup([voice('es-MX'), voice('es-ES', false)]).speech.pickVoice('es-ES').lang, 'es-ES');
});

test('two good voices with the same tag: the one earlier in the list wins, whatever the device order', () => {
  const jorge = named('Jorge', 'es-ES');
  const monica = named('Mónica', 'es-ES');
  assert.equal(setup([jorge, monica]).speech.pickVoice('es-ES'), monica);
  assert.equal(setup([monica, jorge]).speech.pickVoice('es-ES'), monica);
});

test('the Enhanced bonus applies only to known good voices', () => {
  const satu = named('Satu', 'fi-FI');
  const mystery = named('Mystery (Enhanced)', 'fi-FI');
  assert.equal(setup([mystery, satu]).speech.pickVoice('fi-FI'), satu);
  assert.equal(setup([satu, mystery]).speech.pickVoice('fi-FI'), satu);
  const google = named('Google suomi (Premium)', 'fi-FI', false);
  assert.equal(setup([google, satu]).speech.pickVoice('fi-FI'), satu);
  assert.equal(setup([satu, google]).speech.pickVoice('fi-FI'), satu);
});

test('Enhanced or Premium in the voiceURI counts, not only in the name', () => {
  const enhanced = { ...named('Satu', 'fi-FI'), voiceURI: 'com.apple.voice.enhanced.fi-FI.Satu' };
  const compact = { ...named('Satu', 'fi-FI'), voiceURI: 'com.apple.voice.compact.fi-FI.Satu' };
  assert.equal(setup([compact, enhanced]).speech.pickVoice('fi-FI'), enhanced);
  assert.equal(setup([enhanced, compact]).speech.pickVoice('fi-FI'), enhanced);
});

test('two parts are both spoken synchronously, in order', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa', rate: 0.78 }, { text: 'kissa', rate: 0.52 }], cb);
  assert.equal(synth.spoken.length, 2);
  assert.deepEqual(synth.spoken.map((u) => u.rate), [0.78, 0.52]);
});

test('no onstart: not failed at 1999 ms, failed at 2000 ms and cancel called', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa' }], cb);
  const cancelsBefore = synth.cancels;
  mock.timers.tick(1999);
  assert.deepEqual(cb.log, []);
  mock.timers.tick(1);
  assert.deepEqual(cb.log, ['failed:nostart']);
  assert.equal(synth.cancels, cancelsBefore + 1);
});

test('onstart but never onend: playing, then idle at start + 12000 ms with cancel', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'kissa' }], cb);
  mock.timers.tick(500);
  synth.spoken[0].onstart();
  assert.deepEqual(cb.log, ['playing']);
  const cancelsBefore = synth.cancels;
  mock.timers.tick(11999);
  assert.deepEqual(cb.log, ['playing']);
  mock.timers.tick(1);
  assert.deepEqual(cb.log, ['playing', 'idle']);
  assert.equal(synth.cancels, cancelsBefore + 1);
  // the start timer must not fire later
  mock.timers.tick(5000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('onend of the first of two parts is still playing; idle after the second', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'a' }, { text: 'b' }], cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  assert.deepEqual(cb.log, ['playing']);
  synth.spoken[1].onstart();
  synth.spoken[1].onend();
  assert.deepEqual(cb.log, ['playing', 'idle']);
  // cap timer was cleared: nothing more happens
  mock.timers.tick(20000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('second say: first caller gets idle once; stale events do not touch the second', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const first = recorder();
  const second = recorder();
  speech.say('fi-FI', [{ text: 'a' }], first);
  const staleUtterance = synth.spoken[0];
  staleUtterance.onstart();
  speech.say('fi-FI', [{ text: 'b' }], second);
  assert.deepEqual(first.log, ['playing', 'idle']);
  synth.spoken[1].onstart();
  // events of the cancelled first utterance arrive late
  staleUtterance.onerror({ error: 'interrupted' });
  staleUtterance.onend();
  assert.deepEqual(first.log, ['playing', 'idle']);
  assert.deepEqual(second.log, ['playing']);
});

test('onerror synthesis-failed: failed; canceled: idle', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'a' }], cb);
  synth.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(cb.log, ['failed:error']);

  const cb2 = recorder();
  speech.say('fi-FI', [{ text: 'b' }], cb2);
  synth.spoken[1].onerror({ error: 'canceled' });
  assert.deepEqual(cb2.log, ['idle']);
});

test('voiceschanged adding fi-FI notifies subscribers and flips availability', () => {
  const { synth, speech } = setup([voice('en-US')]);
  let calls = 0;
  const off = speech.onVoicesChanged(() => calls++);
  assert.equal(speech.availability('fi-FI'), 'missing');
  synth.setVoices([voice('en-US'), voice('fi-FI')]);
  assert.equal(calls, 1);
  assert.equal(speech.availability('fi-FI'), 'available');
  off();
  synth.setVoices([]);
  assert.equal(calls, 1);
});

test('stop() mid-speech: cancel, idle, later events ignored', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'a' }], cb);
  synth.spoken[0].onstart();
  const cancelsBefore = synth.cancels;
  speech.stop();
  assert.equal(synth.cancels, cancelsBefore + 1);
  assert.deepEqual(cb.log, ['playing', 'idle']);
  synth.spoken[0].onend();
  synth.spoken[0].onerror({ error: 'synthesis-failed' });
  mock.timers.tick(20000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

// ---- pauseMs: a later part is spoken from a timer after the previous part's onend ----

const PAIR = [{ text: 'kissa', rate: 0.78 }, { text: 'kissa', rate: 0.52, pauseMs: 700 }];

test('pauseMs: the first part is spoken at once, the second 700 ms after the first ends', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  assert.equal(synth.spoken.length, 1);
  assert.equal(synth.spoken[0].rate, 0.78);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(699);
  assert.equal(synth.spoken.length, 1);
  mock.timers.tick(1);
  assert.equal(synth.spoken.length, 2);
  assert.equal(synth.spoken[1].rate, 0.52);
});

test('pauseMs: playing stays on across the pause, idle only after the second part', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  assert.deepEqual(cb.log, ['playing']);
  assert.equal(synth.spoken.length, 1);
  mock.timers.tick(700);
  assert.deepEqual(cb.log, ['playing']);
  synth.spoken[1].onstart();
  assert.deepEqual(cb.log, ['playing']);
  synth.spoken[1].onend();
  assert.deepEqual(cb.log, ['playing', 'idle']);
  mock.timers.tick(20000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('pauseMs: stop() during the pause means the second part is never spoken', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(300);
  speech.stop();
  mock.timers.tick(5000);
  assert.equal(synth.spoken.length, 1);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('pauseMs: a new say during the pause drops the old second part and leaves the new call alone', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const first = recorder();
  const second = recorder();
  speech.say('fi-FI', PAIR, first);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(300);
  speech.say('fi-FI', [{ text: 'hola' }], second);
  assert.deepEqual(first.log, ['playing', 'idle']);
  synth.spoken[1].onstart();
  mock.timers.tick(5000);
  assert.deepEqual(synth.spoken.map((u) => u.text), ['kissa', 'hola']);
  assert.deepEqual(first.log, ['playing', 'idle']);
  assert.deepEqual(second.log, ['playing']);
});

test('pauseMs: a delayed part that never starts ends in idle after 2000 ms, not failed', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(700);
  assert.equal(synth.spoken.length, 2);
  const cancelsBefore = synth.cancels;
  mock.timers.tick(1999);
  assert.deepEqual(cb.log, ['playing']);
  mock.timers.tick(1);
  assert.deepEqual(cb.log, ['playing', 'idle']);
  assert.equal(synth.cancels, cancelsBefore + 1);
  mock.timers.tick(20000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('pauseMs: an error such as not-allowed on a delayed part gives idle, not failed', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(700);
  synth.spoken[1].onerror({ error: 'not-allowed' });
  assert.deepEqual(cb.log, ['playing', 'idle']);
  mock.timers.tick(20000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('pauseMs: the 12 s cap runs from the first onstart, the pause counts against it', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  mock.timers.tick(500);
  synth.spoken[0].onstart(); // t = 500
  mock.timers.tick(100);
  synth.spoken[0].onend(); // t = 600
  assert.equal(synth.spoken.length, 1);
  mock.timers.tick(700); // t = 1300, second part spoken
  synth.spoken[1].onstart();
  mock.timers.tick(11199); // t = 12499
  assert.deepEqual(cb.log, ['playing']);
  mock.timers.tick(1); // t = 12500 = 500 + 12000
  assert.deepEqual(cb.log, ['playing', 'idle']);
});

test('no pauseMs: parts stay queued together and an error on the second still fails', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', [{ text: 'a' }, { text: 'b' }], cb);
  assert.equal(synth.spoken.length, 2);
  synth.spoken[0].onstart();
  synth.spoken[0].onend();
  mock.timers.tick(5000);
  assert.equal(synth.spoken.length, 2);
  synth.spoken[1].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(cb.log, ['playing', 'failed:error']);
});

test('pauseMs: an error on the first part still fails, even though a later part is delayed', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(cb.log, ['failed:error']);
});

test('pauseMs: an error on the first part after it started still fails', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  synth.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.deepEqual(cb.log, ['playing', 'failed:error']);
});

test('pauseMs: a dropped onend on the first part ends in idle at the 12 s cap, the second is never spoken', () => {
  const { synth, speech } = setup([voice('fi-FI')]);
  const cb = recorder();
  speech.say('fi-FI', PAIR, cb);
  synth.spoken[0].onstart();
  mock.timers.tick(12000);
  assert.deepEqual(cb.log, ['playing', 'idle']);
  assert.equal(synth.spoken.length, 1);
});

test('pauseMs on the first part, or 0, or not a number, is ignored', () => {
  for (const parts of [
    [{ text: 'a', pauseMs: 700 }, { text: 'b' }],
    [{ text: 'a' }, { text: 'b', pauseMs: 0 }],
    [{ text: 'a' }, { text: 'b', pauseMs: 'x' }],
    [{ text: 'a' }, { text: 'b', pauseMs: NaN }],
  ]) {
    const { synth, speech } = setup([voice('fi-FI')]);
    speech.say('fi-FI', parts, recorder());
    assert.equal(synth.spoken.length, 2);
  }
});
