// The three games. Each entry: { id, name, lang, listenLabel, module }.
// `module` is the game itself ({ create }), brought in by a STATIC import: a dynamic
// import() would put an await between the tap and speechSynthesis.speak() and iPad
// Safari would no longer treat the speech as started by the tap.
//
// Game module contract
// --------------------
// A game is an object `{ create(ctx) }`. Each real game lives in app/src/games/<id>.js and
// default-exports that object; this file imports it statically and puts it in the entry's
// `module` field.
// create is called once, synchronously, the first time the game is opened in a page session.
// It returns an instance:
//
//   instance = {
//     show({ autoRead })  // every time the view becomes visible, synchronously inside
//                         // the tap handler when opened by a tap. autoRead === true
//                         // only when opened by a tap AND not resuming a round.
//     hide()              // when leaving: stop timers, remove any document/window
//                         // listeners added in show(). Do not reset round state.
//     listen()            // synchronously from the Kuuntele tap. Must call
//                         // ctx.speech.say(...) synchronously, or do nothing.
//   }
//
// ctx given to create:
//   ctx.root        the game's own area inside the white game card, below the question row
//   ctx.question    the question slot left of Kuuntele in the question row
//   ctx.status      this game's element in the top-bar status slot (max 40 % width)
//   ctx.speech.say(parts, opts?)  parts = [{ text, rate?, pauseMs? }]. Speaks in the game's language;
//                   parts without pauseMs are queued in the same call, a part with
//                   pauseMs is spoken that many ms after the previous part ends.
//                   Drives this game's Kuuntele state.
//                   Cancels anything already speaking, in any game.
//                   opts.auto === true marks a reading the game starts by itself (the
//                   auto-advance timer), not from a tap: if it fails, Kuuntele is left
//                   alone and the notice is not shown.
//   ctx.speech.stop()      stops speech
//   ctx.reportProgress({ done, total, finished })
//                   done = answered or skipped in this round (0..total), finished = end
//                   screen shown. The front page shows "Kesken {done}/{total}" iff
//                   done >= 1 && !finished. A new round reports { done: 0, finished: false }.
//
// Rules for ports
//   1. No globals. Query only inside ctx.root, ctx.question, ctx.status; no
//      document.getElementById (three game views can be in the DOM at once and ids
//      like speakBtn/nextBtn repeat across the originals).
//   2. Document/window listeners only between show and hide.
//   3. No direct speechSynthesis. No timer or await between a tap and the say it
//      causes. Speech chained by setTimeout from onend is replaced by one
//      say([...parts]). Pauses between parts are `pauseMs` on the later part; the
//      first part is never delayed. A reading the game starts by itself (not from a tap)
//      passes { auto: true }; its failure never changes Kuuntele or shows the notice.
//   4. No game control is disabled while waiting for speech.
//   5. Static assets go under app/assets/ (no Drive fetch).
//   6. localStorage keys are prefixed with the game id.

import matikka from './matikka.js';
import sanat from './sanat.js';
import espanja from './espanja.js';

export const GAMES = [
  {
    id: 'matikka',
    name: 'Matikka',
    lang: 'fi-FI',
    listenLabel: 'Kuuntele lasku',
    module: matikka,
  },
  {
    id: 'sanat',
    name: 'Sanat',
    lang: 'fi-FI',
    listenLabel: 'Kuuntele sana',
    module: sanat,
  },
  {
    id: 'espanja',
    name: 'Espanja',
    lang: 'es-ES',
    listenLabel: 'Kuuntele',
    module: espanja,
  },
];
