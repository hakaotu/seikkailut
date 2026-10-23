# Architecture

As-is description after SEI-1. Intent and history live in `docs/plans/`; the design spec is `docs/design/sei-1.md` (+ `.html`).

## What this is

Seikkailut: one static web app (Finnish UI, `lang="fi"`) meant to hold three children's games, Matikka, Sanat, Espanja, behind a front page. Target device is an iPad in Safari. Only the shell exists; all three games are the same placeholder. Nothing is deployed and no GitHub remote or `.github/` exists.

`originals/` holds the three old standalone HTML games and `vauhti.mp3`. They are reference material: not served, not imported, not modified.

## Layout

- `app/` is the deployable unit: `index.html`, `styles/app.css`, `src/*.js`. No build step, no runtime dependencies, ES modules loaded directly by `<script type="module" src="src/app.js">`.
- `scripts/serve.mjs` serves `app/` as web root (`node:http`). Flags `--port` (default 8080), `--host` (default 127.0.0.1; use 0.0.0.0 for a device on the LAN). Serves `.js` as `text/javascript`, sends `Cache-Control: no-cache`, returns 403 for paths outside `app/`.
- `tests/unit/` (`node:test`, pure modules) and `tests/e2e/` (Playwright). `package.json` is `"type": "module"`; its only dependency is the dev dependency `@playwright/test` (pinned 1.64.1).
- Commands: `npm run serve`, `npm run test:unit` (`node --test tests/unit/`), `npm run test:e2e` (`playwright test`), `npm test` (both).

## Module map (`app/src/`)

| File | Role |
|---|---|
| `app.js` | Entry. `boot({games, document, window, speech})` creates the shell, starts it, adds a passive `touchstart` listener (so `:active` shows on iPad), and last sets `html[data-booted]`. The bottom of the file calls `boot` with the real registry and `createSpeech` over `window.speechSynthesis`. |
| `router.js` | Pure, no DOM. `parseRoute(hash, knownIds)`, `routeToHash`, `titleFor`. Routes are `#/` and `#/<game-id>`; any other hash is home. Titles: `Seikkailut`, `<Name> – Seikkailut` (en dash). |
| `shell.js` | Owns front page and game views. Exports `createShell` and `badgeFor(progress)`. Builds one `<section class="game-view">` per game on first open and keeps it hidden/shown until page reload. Handles the "no sound" notice, the "Peli ei auennut." error, badges, title, scroll-to-top, focus. |
| `listen-button.js` | `createListenButton({label, onTap})` returns `{element, setState}`. States `ready | playing | novoice` in `data-state`. Never sets `disabled`. |
| `speech.js` | The only module that touches `speechSynthesis`. See Speech. |
| `games/registry.js` | Exports `GAMES`, three entries `{id, name, lang, listenLabel, module}` in order matikka (`fi-FI`), sanat (`fi-FI`), espanja (`es-ES`). Its header comment is the game contract. |
| `games/placeholder.js` | `placeholder({question, area, hint, sample})` returns a game module with no logic; `show({autoRead})` calls `ctx.speech.say(sample)` when `autoRead`. Never calls `reportProgress`. Registry entries use it with per-game sample speech (matikka `yksi plus kaksi`, sanat `kissa` twice at rates 0.78 and 0.52, espanja `hola`). |

`index.html` holds the static front page (`#home`, three `button.game-card[data-game]`, each with a hidden badge), `#game-views` (empty, shell fills it), `#live` (polite live region) and the `.boot-error` block. `app.css` sets per-game colours via `[data-game="..."]` custom properties.

## Navigation and the tap rule

Invariant: from a `click` handler to `speechSynthesis.speak()` everything is synchronous: no `await`, no `setTimeout`, no dynamic `import()`, no `hashchange`-driven rendering. Registry therefore uses static imports. Reason: iPad Safari must see speech started by the tap. This is unverified on a real iPad.

- Card tap: `history.pushState({fromHome: true}, '', '#/<id>')` then `render(route, {byTap: true})` in the same handler.
- Etusivu / `Etusivulle` button (`goBack`): if `history.state.fromHome`, `history.back()`, else `pushState('#/')`; then renders home synchronously.
- `popstate` and `hashchange` call `render` without `byTap`, so nothing is auto-read. Reload on `#/<id>` also does not auto-read.
- `render` does nothing if the route equals the one shown (`shownRoute`).
- Every route change calls `speech.stop()` first, and `instance.hide()` on the game being left.
- App click listeners must be attached with `addEventListener`, not `onclick =` or inline onclick: `tests/e2e/helpers.mjs` wraps `EventTarget.prototype.addEventListener` and counts trusted click listeners on the stack, and the fake `speak` records whether it ran inside one (`gesture.spec.mjs`).
- `autoRead` passed to `show` is `byTap && !resuming`; `resuming` means the view exists and `badgeFor(progress)` is non-null.

## Game contract (full text in `registry.js` header)

A game module is `{ create(ctx) }`. `create` is called once per page session, synchronously, on first open; it returns `{ show({autoRead}), hide(), listen() }`. `ctx` has `root`, `question`, `status` (DOM slots), `speech.say(parts)` with `parts = [{text, rate?}]` and `speech.stop()`, and `reportProgress({done, total, finished})`. The front-page badge `Kesken {done}/{total}` shows iff `done >= 1 && !finished`. Rules for ports: no globals or `getElementById` (several views are in the DOM at once); document/window listeners only between `show` and `hide`; no direct `speechSynthesis`; no timer or await between tap and `say`; no control disabled while waiting for speech; assets under `app/assets/` (directory does not exist yet); `localStorage` keys prefixed with the game id. Nothing in the repo reads or writes `localStorage` yet.

If `create` or `show` throws, the shell shows `Peli ei auennut.` with an `Etusivulle` button and marks the view failed; the next open discards it and calls `create` again.

## Speech (`speech.js`)

`createSpeech({synth, Utterance, setTimeout, clearTimeout, startTimeoutMs=2000, maxMs=12000})` returns `{availability, pickVoice, say, stop, onVoicesChanged}`; one instance is shared by all games.

- `availability(lang)`: `unsupported` (no synth/Utterance), `unknown` (empty voice list), `available` (a voice with the same 2-letter prefix), `missing`. `say` refuses `unsupported` and `missing` (reports `failed`; never hands Finnish text to a non-Finnish voice); `unknown` speaks with `u.lang` only.
- `say(lang, parts, onState)` cancels any current call (its callback gets `idle`), then creates all utterances and calls `synth.speak` for each, synchronously. `onState(state, reason)` with state `playing | idle | failed`; reasons `unsupported | missing | nostart | error`.
- A generation counter plus `current` call object make events from superseded calls inert. Utterances are kept referenced until the call ends.
- Start timer 2000 ms: no `onstart` gives `failed('nostart')` and `cancel()`. Cap timer 12000 ms from `onstart`: gives `idle` and `cancel()`. `onend` of the last part gives `idle`. `onerror` `canceled`/`interrupted` gives `idle`, anything else `failed('error')`.
- `voiceschanged` notifies `onVoicesChanged` subscribers; the shell moves `novoice` buttons back to `ready` when the language appears.

Shell side: `failed` sets the button to `novoice` (label `Ei ääntä`) and shows the notice, always when it came from a Kuuntele tap, otherwise once per language per page session. Opening a game whose language is `unsupported`/`missing` also shows it. `Selvä` hides the notice and focuses Kuuntele. The notice text is hard-coded Finnish in `shell.js` (`ADULT_TEXT`).

## Tests

- Unit (`tests/unit/`): `router`, `speech` (fake synth, `mock.timers`), `registry`, `badge`.
- E2E (`tests/e2e/*.spec.mjs`): `home`, `navigation`, `layout`, `targets`, `resume`, `gesture`, `nosound`, `errors`. Playwright starts `node scripts/serve.mjs --port 4173`. Projects: `ipad-portrait` 820x1130 and `ipad-landscape` 1180x770 (WebKit, touch), `desktop` 1280x720 (Chromium), `narrow` 320x700 (WebKit, touch).
- `tests/e2e/helpers.mjs` injects a fake `speechSynthesis` (modes `normal`, `nostart`, `noend`, `absent`) and records each `speak` with whether it ran inside a click dispatch. `useFakeRegistry` serves `tests/e2e/fixtures/registry.js` and `fake-game.js` in place of the real registry; the fake game reports progress and exposes `window.__fake[id]`, and `window.__failCreate` makes `create` throw. No test hooks exist in shipped code.
- Real speech is not covered by any test.

## Conventions

- CSS has no `overflow-x: hidden` on `html`/`body`, on purpose, so the layout specs can see sideways overflow.
- Buttons are real `<button>` elements; the Kuuntele button is never `disabled`.
- The "Peli aukeaa…" loading text from the design is not built (synchronous create leaves no time to show it).

## Open questions

- No iPad device check has been done: first-tap speech, queued two-part speech, `onstart` firing, and presence of Finnish/Spanish voices are unverified on the target device.
- Hosting: GitHub Pages is intended, but no workflow, remote or deployment exists. Whether the `app/` root works under a subpath is untested.
- Node v26.11.0 on the Mac in use (checked 2026-10-23) meets the plan's 20.4+ for `node:test` `mock.timers`.
