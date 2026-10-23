# Architecture

As-is description after SEI-1, SEI-45 (voice ranking, pause between parts) and SEI-2/5/6 (Matikka port). Intent and history live in `docs/plans/`; the design spec is `docs/design/sei-1.md` (+ `.html`).

## What this is

Seikkailut: one static web app (Finnish UI, `lang="fi"`) meant to hold three children's games, Matikka, Sanat, Espanja, behind a front page. Target device is an iPad in Safari. Matikka is a real game; Sanat and Espanja are still the same placeholder. Hosted on GitHub Pages at https://hakaotu.github.io/seikkailut/ (see Layout).

`originals/` holds the three old standalone HTML games and `vauhti.mp3`. They are reference material: not served, not imported, not modified.

## Layout

- `app/` is the deployable unit: `index.html`, `styles/app.css`, `src/*.js`. No build step, no runtime dependencies, ES modules loaded directly by `<script type="module" src="src/app.js">`.
- `scripts/serve.mjs` serves `app/` as web root (`node:http`). Flags `--port` (default 8080), `--host` (default 127.0.0.1; use 0.0.0.0 for a device on the LAN). Serves `.js` as `text/javascript`, sends `Cache-Control: no-cache`, returns 403 for paths outside `app/`.
- `tests/unit/` (`node:test`, pure modules) and `tests/e2e/` (Playwright). `package.json` is `"type": "module"`; its only dependency is the dev dependency `@playwright/test` (pinned 1.64.1).
- `.github/workflows/pages.yml` uploads `app/` as the Pages artifact and deploys it on push to `main` and on `workflow_dispatch`. It does not run the tests. The remote `origin` is https://github.com/hakaotu/seikkailut (public).
- `README.md` (Finnish): one-paragraph description and the local run and test commands.
- Commands: `npm run serve`, `npm run test:unit` (`node --test tests/unit/`), `npm run test:e2e` (`playwright test`), `npm test` (both).

## Module map (`app/src/`)

| File | Role |
|---|---|
| `app.js` | Entry. `boot({games, document, window, speech})` creates the shell, starts it, adds a passive `touchstart` listener (so `:active` shows on iPad), and last sets `html[data-booted]`. The bottom of the file calls `boot` with the real registry and `createSpeech` over `window.speechSynthesis`. |
| `router.js` | Pure, no DOM. `parseRoute(hash, knownIds)`, `routeToHash`, `titleFor`. Routes are `#/` and `#/<game-id>`; any other hash is home. Titles: `Seikkailut`, `<Name> – Seikkailut` (en dash). |
| `shell.js` | Owns front page and game views. Exports `createShell` and `badgeFor(progress)`. Builds one `<section class="game-view">` per game on first open and keeps it hidden/shown until page reload. Handles the "no sound" notice, the "Peli ei auennut." error, badges, title, scroll-to-top, focus. |
| `listen-button.js` | `createListenButton({label, onTap})` returns `{element, setState}`. States `ready | playing | novoice` in `data-state`. Never sets `disabled`. |
| `speech.js` | The only module that touches `speechSynthesis`. See Speech. |
| `games/registry.js` | Exports `GAMES`, three entries `{id, name, lang, listenLabel, module}` in order matikka (`fi-FI`), sanat (`fi-FI`), espanja (`es-ES`). Matikka's `module` is the static import of `matikka.js`. Its header comment is the game contract. |
| `games/matikka.js` | Default export `{ create(ctx) }`: the Matikka screens, state and handlers. See Matikka. Touches the DOM only inside `create`, so the registry unit test can import it in Node. |
| `games/matikka-logic.js` | Matikka's rules and texts, pure (no DOM, no `document` at import). Every random choice takes an `rng` argument, default `Math.random` read at call time. Exports `MAX_QUESTIONS` (10), `LEVELS`, `OPS`, `generateProblem`, `makeChoices`, `newRound`, `pickLevel`, `toggleOp`, `typeDigit`, `deleteDigit`, `starsFor`, `endTier`, `endTexts`, `wrongTexts`, `problemSpeech`, `problemLabel`, `settingsLine` and others. |
| `games/placeholder.js` | `placeholder({question, area, hint, sample})` returns a game module with no logic; `show({autoRead})` calls `ctx.speech.say(sample)` when `autoRead`. Never calls `reportProgress`. Used by sanat (`kissa` twice at rates 0.78 and 0.52 with `pauseMs: 700` on the second) and espanja (`hola`). |

`index.html` holds the static front page (`#home`, three `button.game-card[data-game]`, each with a hidden badge), `#game-views` (empty, shell fills it), `#live` (polite live region) and the `.boot-error` block. `app.css` sets per-game colours via `[data-game="..."]` custom properties.

## Navigation and the tap rule

Invariant: from a `click` handler (for Matikka's computer-keyboard Enter, a `keydown` handler) to the first `speechSynthesis.speak()` everything is synchronous: no `await`, no `setTimeout`, no dynamic `import()`, no `hashchange`-driven rendering. Registry therefore uses static imports. Reason: iPad Safari must see speech started by the tap. This is unverified on a real iPad. Exception, only inside `speech.js`: a part with `pauseMs` is spoken from a timer after the previous part's `onend`, so not inside the tap; every part before the first `pauseMs` still is.

- Card tap: `history.pushState({fromHome: true}, '', '#/<id>')` then `render(route, {byTap: true})` in the same handler.
- Etusivu / `Etusivulle` button (`goBack`): if `history.state.fromHome`, `history.back()`, else `pushState('#/')`; then renders home synchronously.
- `popstate` and `hashchange` call `render` without `byTap`, so nothing is auto-read. Reload on `#/<id>` also does not auto-read.
- `render` does nothing if the route equals the one shown (`shownRoute`).
- Every route change calls `speech.stop()` first, and `instance.hide()` on the game being left.
- App click and keydown listeners must be attached with `addEventListener`, not `onclick =` or inline onclick: `tests/e2e/helpers.mjs` wraps `EventTarget.prototype.addEventListener` and counts trusted click and keydown listeners on the stack, and the fake `speak` records whether it ran inside one (`gesture.spec.mjs`).
- `autoRead` passed to `show` is `byTap && !resuming`; `resuming` means the view exists and `badgeFor(progress)` is non-null.

## Game contract (full text in `registry.js` header)

A game module is `{ create(ctx) }`. A real game lives in `app/src/games/<id>.js` and default-exports it; `registry.js` imports it statically. The placeholder keeps its factory form until it is removed. `create` is called once per page session, synchronously, on first open; it returns `{ show({autoRead}), hide(), listen() }`. `ctx` has `root`, `question`, `status` (DOM slots), `speech.say(parts)` with `parts = [{text, rate?, pauseMs?}]` and `speech.stop()`, and `reportProgress({done, total, finished})`. The front-page badge `Kesken {done}/{total}` shows iff `done >= 1 && !finished`. Rules for ports: no globals or `getElementById` (several views are in the DOM at once); document/window listeners only between `show` and `hide`; no direct `speechSynthesis`; no timer or await between tap and `say`; no control disabled while waiting for speech; assets under `app/assets/` (directory does not exist yet); `localStorage` keys prefixed with the game id. Nothing in the repo reads or writes `localStorage` yet.

If `create` or `show` throws, the shell shows `Peli ei auennut.` with an `Etusivulle` button and marks the view failed; the next open discards it and calls `create` again.

## Speech (`speech.js`)

`createSpeech({synth, Utterance, setTimeout, clearTimeout, startTimeoutMs=2000, maxMs=12000})` returns `{availability, pickVoice, say, stop, onVoicesChanged}`; one instance is shared by all games.

- `availability(lang)`: `unsupported` (no synth/Utterance), `unknown` (empty voice list), `available` (a voice with the same 2-letter prefix), `missing`. `say` refuses `unsupported` and `missing` (reports `failed`; never hands Finnish text to a non-Finnish voice); `unknown` speaks with `u.lang` only.
- `pickVoice(lang)` ranks voices of the language prefix by `[score, exact tag (local > remote), earlier in GOOD_VOICES]`. Score: voice in `AVOID_VOICES` -100; in `GOOD_VOICES[prefix]` (fi: satu, onni; es: monica, jorge, marisol, paulina) 20, plus 30 if its name matches `enhanced|premium|siri` or its `voiceURI` matches `enhanced|premium`; name starting `google` 10; otherwise 0. Names are compared by the part before ` (`, lower case, accents removed.
- `say(lang, parts, onState)` cancels any current call (its callback gets `idle`), then creates all utterances and calls `synth.speak` synchronously for part 0 and the following parts up to the first one with `pauseMs`. `onState(state, reason)` with state `playing | idle | failed`; reasons `unsupported | missing | nostart | error`.
- `pauseMs` is silence before that part; ignored on part 0 and unless a finite number > 0. When the previous part ends, a pause timer of `pauseMs` runs; then the part and the parts after it up to the next `pauseMs` are spoken from the timer.
- A generation counter plus `current` call object make events from superseded calls inert. Utterances are kept referenced until the call ends.
- Start timer 2000 ms: no `onstart` gives `failed('nostart')` and `cancel()`. Cap timer 12000 ms from the first `onstart`, pauses included: gives `idle` and `cancel()`. `onend` of the last part gives `idle`. `onerror` `canceled`/`interrupted` gives `idle`; any other error gives `failed('error')`, except on a part at or after the first `pauseMs` part, where it gives `idle`. A delayed part also has a 2000 ms timer started when it is spoken; if its `onstart` does not come, the call ends `idle` (not `failed`). `stop()` or a new `say()` clears all four timers.
- `voiceschanged` notifies `onVoicesChanged` subscribers; the shell moves `novoice` buttons back to `ready` when the language appears.

Shell side: `failed` sets the button to `novoice` (label `Ei ääntä`) and shows the notice, always when it came from a Kuuntele tap, otherwise once per language per page session. Opening a game whose language is `unsupported`/`missing` also shows it. `Selvä` hides the notice and focuses Kuuntele. The notice text is hard-coded Finnish in `shell.js` (`ADULT_TEXT`).

## Matikka (`games/matikka.js`, `games/matikka-logic.js`)

- Three screens (choose, question, end) are built once in `create` and stay in the DOM; switching toggles `hidden`, so returning from the front page shows what was left. All state is in memory in the instance; nothing is stored, reload gives the choose screen with defaults (Helppo, `+` and `−` on).
- Levels: Helppo (`easy`) shows four option buttons; Keskitaso and Vaikea (`typed: true`) show a keypad. Picking Vaikea turns multiplication on. The last operation toggle cannot be turned off (hint shown). A round is `MAX_QUESTIONS` = 10 problems, generated up front in `newRound`.
- Speech: every handler changes state and DOM first and calls `ctx.speech.say` last, synchronously, with no `pauseMs`. The choose screen is silent on first open; `Aloita`, `Seuraava`, `Pelaa uudelleen`, `Aloita uusi kierros`, an answer, `Katso tulos` and Kuuntele each speak. `show({autoRead})` speaks only on the question screen with the current problem unanswered.
- `reportProgress`: `{done: 0, finished: false}` when a round starts; `{done: answered, ...}` on each answer, not on Seuraava; `{done: 10, finished: true}` on `Katso tulos`. So after the 10th answer and before `Katso tulos` the badge reads `Kesken 10/10`.
- Tap guard: every Matikka button handler is wrapped in `guarded`, which does nothing if `performance.now() - screenChangedAt < 500`; `screenChangedAt` is set by `goTo` (a screen change, not Seuraava). It sets no `disabled` and no timer. Kuuntele and Etusivu belong to the shell and are not guarded. Tests therefore wait with `settle()` (real 550 ms) after a screen change and must not use `page.clock`, which freezes `performance.now()`.
- Keyboard: one `keydown` listener on `document`, added in `show`, removed in `hide`; active only on the question screen of a typed level. Digits and Backspace edit the answer; Enter on a focused button does nothing unless that button is a keypad key, where it means OK/Seuraava (otherwise Seuraava would run twice).
- After an answer, option buttons or keypad keys are `disabled` (answer lock), not while waiting for speech.
- `fitProblem` steps the problem row font from 56 px (40 px under 420 px) down by 4 px while it overflows, to a floor of 36 px (28 px under 420 px); under 420 px, if it still overflows at the floor, it adds `is-wrapped` to the problem element, which lets the row wrap (`flex-wrap: wrap` in `app.css`). It runs in `renderBox`, on `resize` and in `show`.
- Confetti: an `aria-hidden` layer appended to `ctx.root` for scores 7-10 (40 pieces, 3 s; 10/10: 100 pieces, 3.5 s), none under `prefers-reduced-motion: reduce`; the only Matikka `setTimeout` removes it; `hide()` and leaving the end screen remove it.
- Wrong answers say `Ei ihan.` + `Oikea vastaus on N.` (no retry is offered). End texts depend on score tier (`endTier`: 10 / 7-9 / 0-6); `Täydellinen tulos!` and `Olet matikkamestari!` appear only at 10/10. Stars: `round(score * 5 / answered)`, 0 when nothing is answered.

## Tests

- Unit (`tests/unit/`): `router`, `speech` (fake synth, `mock.timers`), `registry`, `badge`, `matikka-logic` (seeded rng).
- E2E (`tests/e2e/*.spec.mjs`): `home`, `navigation`, `layout`, `targets`, `resume`, `gesture` (includes Matikka speech-in-tap tests), `nosound`, `errors`, `matikka`, `matikka-frame` (sideways overflow, no vertical scroll on the device projects, sizes, stuck-speech rounds). `tests/e2e/matikka-helpers.mjs` has the Matikka drivers (`openMatikka`, `startRound`, `answerRight`, `answerWrong`, `next`, `playRound`); they read the answer from the problem's accessible name, not from a hook. Playwright starts `node scripts/serve.mjs --port 4173`. Projects: `ipad-portrait` 820x1130 and `ipad-landscape` 1180x770 (WebKit, touch), `desktop` 1280x720 (Chromium), `narrow` 320x700 (WebKit, touch).
- `tests/e2e/helpers.mjs` injects a fake `speechSynthesis` (modes `normal`, `nostart`, `noend`, `absent`) and exports `checkSizes`, `noSidewaysOverflow`, `seedRandom(page, seed)` (init script replacing `Math.random` with mulberry32) and `settle(page)`, and records each `speak` with whether it ran inside a click or keydown dispatch, when it was called (`at`) and when its `onend` fired (`endedAt`, null until then). `useFakeRegistry` serves `tests/e2e/fixtures/registry.js` and `fake-game.js` in place of the real registry; the fake game reports progress and exposes `window.__fake[id]`, and `window.__failCreate` makes `create` throw. No test hooks exist in shipped code.
- Real speech is not covered by any test.

## Conventions

- CSS has no `overflow-x: hidden` on `html`/`body`, on purpose, so the layout specs can see sideways overflow.
- Buttons are real `<button>` elements; the Kuuntele button is never `disabled`.
- The "Peli aukeaa…" loading text from the design is not built (synchronous create leaves no time to show it).

## Open questions

- No iPad device check has been done: first-tap speech, a second part spoken from a timer after a pause, `onstart` firing, and presence of Finnish/Spanish voices are unverified on the target device.
- Reported by the main session, not reproducible from the repo: on 2026-10-23 in real Chrome on the published site at commit 253c20f, the Matikka card opened the choose screen with no speech, `Aloita` spoke with Satu (Enhanced), and 2/10 and 10/10 gave different end screens. Not checked on an iPad.
- Reported by the main session, not reproducible from the repo: on 2026-10-23 in desktop Chrome on the Mac, Sanat used the voice "Satu (Enhanced)" and the gap between the two `kissa` readings was 708 ms.
- Hosting: on 2026-10-23 the live site under the `/seikkailut/` subpath was loaded in WebKit (820x1130, touch) by the main session: the front page showed three cards, Matikka opened at `#/matikka`, Etusivu returned, no page errors. Speech was not heard. The iPad check above is still open for the hosted site.
- Node v26.11.0 on the Mac in use (checked 2026-10-23) meets the plan's 20.4+ for `node:test` `mock.timers`.
