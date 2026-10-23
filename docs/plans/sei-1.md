# Plan: SEI-1 — one app: front page, game selection, shared game frame, listen button

Architect, 2026-10-23. Input: `docs/backlog.md` SEI-1 (criteria 1–6), the
approved design `docs/design/sei-1.md` + `docs/design/sei-1.html` (owner
approved 2026-10-23, Q8), owner decisions Q9 (short names Matikka, Sanat,
Espanja) and Q10 (an unfinished round continues, no confirmation, kept until
reload), `docs/brief.md`, and the three files in `originals/`.

UI strings are quoted in Finnish exactly as in the design spec; the design
spec is the source for every pixel value, colour and string. This plan does
not repeat them except where a test depends on them.

---

## 1. Context and constraints

**What exists now.** No application code, no `docs/architecture.md`, no git
remote (`.git/config` has no `[remote]` section). Three single-file games in
`originals/`, each a standalone HTML page with all its script in global
scope:

| Fact the plan rests on | Where |
|---|---|
| Sana disables the listen button and re-enables it only inside speech `onend` callbacks; if speech never starts, `onend` never fires and the button stays disabled for good | `originals/sanaseikkailu.html` 490–492 (`btn.disabled = true`), re-enabled only at 499–500 and 507–508, both inside callbacks passed to `speak(…, onend)`; `speak` attaches `onend` and nothing else (473–484: no `onerror`, no timeout) |
| Sana and Matikka start speech on a timer after a question loads, outside any tap | Sana 592 `setTimeout(speakWord, 550)`; Matikka 493 `setTimeout(speakProblem, 500)` |
| Voice choice in the Finnish games: `fi-FI` local voice, then `fi-FI`, then any `fi*` | Sana 462–466; Matikka 331–335 |
| Espanja sets only `u.lang = "es-ES"`, no voice check, and its listen button chains options with `setTimeout(i*600)` where each call cancels the previous one | Espanja 230–238 (`cancel()` at 236), 408–416 (411) |
| All three share global names with different meanings: `$` is `getElementById` in Matikka (320) and `querySelector` in Espanja (224); `deck`, `qIndex`, `score`, `speak`, `initVoices`, `initGame` repeat; element ids `speakBtn`, `nextBtn` repeat | Matikka 310–322, Sana 399–407, 527; Espanja 217–226 |
| Matikka listens to the whole document for keys; Espanja listens to window resize | Matikka 692–708; Espanja 246 |
| Espanja keeps stars in `localStorage` key `es_stars` | Espanja 382–391 |
| Sana loads `vauhti.mp3` from Google Drive through Apps Script when hosted there, else from a relative path | Sana 811–825 |
| The deployed Sanaseikkailu's `Code.gs` serves the HTML with `createHtmlOutputFromFile` + `setXFrameOptionsMode(ALLOWALL)`, no `addMetaTag`, and `getAudioBase64` reads a Drive file | github.com/hakaotu/sanaseikkailu `Code.gs` on `main`, fetched 2026-10-23 (not in this repo) |
| That repo is public | github.com/hakaotu/sanaseikkailu, page shows "Public", fetched 2026-10-23 |

**What must not break.** Nothing in this repo is live. The live Sanaseikkailu
(Apps Script, other repo) is untouched by this plan; the backlog risk
"Nykyinen julkaisu" already says the old one stays until the new one is seen
working. `originals/` is reference material and is not modified or served.

**Scope.** The shell only: front page, routing, the shared game frame,
the listen button and its speech service, the "no sound" notice, the two
error states, and one placeholder game that stands in for all three until
SEI-2 – SEI-4 replace it. No game logic is ported. No profiles (SEI-11).

**Constraint that shapes everything: the tap must reach `speak()` in the same
call stack.** Design 3.4 rule 4 and 3.5 (criterion 6) require that the first
tap on a front-page card or on Kuuntele produces sound on iPad Safari. The
plan therefore forbids anything asynchronous between a `click` handler and
`speechSynthesis.speak()`: no `hashchange`-driven rendering, no dynamic
`import()`, no `setTimeout`, no `await`. Several choices below (static
imports, `pushState` instead of setting `location.hash`) exist only for this.
Whether iPad Safari actually honours a synchronous call is not verified on a
device; see Risks R1.

---

## 2. Files to create or modify

All application files live under `app/`, which is the deployable unit (served
as static files, nothing else from the repo is published). Every path below
is new unless marked otherwise.

| Path | Change |
|---|---|
| `package.json` | New. `"type": "module"`, `"private": true`. Scripts: `serve` → `node scripts/serve.mjs`, `test:unit` → `node --test tests/unit/`, `test:e2e` → `playwright test`, `test` → both. One devDependency: `@playwright/test`, pinned to an exact version. No runtime dependencies. |
| `.gitignore` (modify) | Add `node_modules/`, `test-results/`, `playwright-report/`. |
| `scripts/serve.mjs` | New. ~40 lines on `node:http` + `node:fs`: serves `app/` as web root; MIME map at least `.html .js .css .svg .mp3 .json`, with `.js` as `text/javascript` (module scripts are refused otherwise); `--port` (default 8080) and `--host` (default `127.0.0.1`; `0.0.0.0` for the iPad check in §8). Rejects paths that resolve outside `app/`. |
| `app/index.html` | New. `lang="fi"`. `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` (no `user-scalable=no`, design §7). Contains, as static markup: the boot-error block (design 3.6), the front page (h1 `Seikkailut`, `Mitä pelataan?`, three `<button class="game-card" data-game="matikka|sanat|espanja">` with the art, title and description from design 3.1, art `aria-hidden="true"`), an empty `<div id="game-views">`, and one live region for the notice. Loads `styles/app.css` and `<script type="module" src="src/app.js">`. |
| `app/styles/app.css` | New. Tokens from design §4 as custom properties; per-game theme by `[data-game="…"]` setting `--brand`, `--brand-dark`, `--brand-light`. Layout breakpoints 900 / 600 / 420 px (design 3.1, 3.2). Button states from design 3.3, including `touch-action: manipulation`, `-webkit-touch-callout: none`, `user-select: none`, `-webkit-tap-highlight-color: transparent` on buttons. Boot error: hidden by `html[data-booted]`, and otherwise revealed only after 3 s by a CSS animation delay so it does not flash on a normal load. `prefers-reduced-motion` stops the Soi wave bars. **No `overflow-x: hidden` on `html`/`body`**: it would hide exactly the overflow criterion 3 forbids, and the e2e test would stop seeing it. |
| `app/src/app.js` | New. Entry point. Exports `boot({ games, document, window, speech })`; the bottom of the file calls it with the real registry and real speech service. Sets `document.documentElement.dataset.booted = ''` only after the shell has rendered. Registers one passive `touchstart` listener on `document` so `:active` shows on iPad (design 3.3). |
| `app/src/router.js` | New. Pure functions, no DOM: `parseRoute(hash, knownIds)` → `{ view: 'home' }` or `{ view: 'game', id }` (empty, `#/`, `#`, unknown id, any other shape → home, design 3.0); `routeToHash(route)`; `titleFor(route, games)` → `Seikkailut` / `Matikka – Seikkailut` etc. (design 3.0 table, en dash). |
| `app/src/speech.js` | New. `createSpeech({ synth, Utterance, setTimeout, clearTimeout, startTimeoutMs = 2000, maxMs = 12000 })`. Details in step 3 — this is the hard part. |
| `app/src/listen-button.js` | New. `createListenButton({ label, onTap })` → `{ element, setState(state) }`, states `ready | playing | novoice` (design 3.4 table). Never sets `disabled` (rule 1). Visible text is `label`, or `Ei ääntä` in `novoice`; the accessible name follows design §7 ("Ei ääntä. Kuuntele sana"). Speaker icon is inline SVG. Width does not change between `ready` and `playing`. |
| `app/src/shell.js` | New. Owns the views: renders the front page state (badges, focus), creates one game view per game on first open and keeps it, switches between them, shows the notice and the "Peli ei auennut" error, updates `document.title`, scrolls to top on every switch, focuses per design §7. Details in step 5. |
| `app/src/games/registry.js` | New. Exports `GAMES`: an array of `{ id, name, lang, listenLabel, module }` for `matikka` (`fi-FI`, `Kuuntele lasku`), `sanat` (`fi-FI`, `Kuuntele sana`), `espanja` (`es-ES`, `Kuuntele`). `module` is a **static** `import` (see constraint). In SEI-1 all three point at `placeholder.js` with a per-game sample text. |
| `app/src/games/placeholder.js` | New. Implements the game contract (§3) with no game logic: the question slot shows the mockup's placeholder text (design html: `Tehtävä` / `Kuva ja vihje` / `Kysymyssana`, dashed area `… oma alue`), and `listen()` speaks a fixed sample: Matikka `yksi plus kaksi` at rate 0.75 (Matikka 357's rate), Sanat `kissa` at 0.78 then again at 0.52 as two queued parts (Sana 504–506's pattern, without the pause), Espanja `hola` at 0.9 (Espanja 234). Auto-reads when opened by a tap (design 3.5). Never reports progress. Removed piece by piece as SEI-2 – SEI-4 land. |
| `tests/unit/router.test.mjs` | New. `node:test`. |
| `tests/unit/speech.test.mjs` | New. `node:test` with a fake synth and `mock.timers`. |
| `tests/unit/badge.test.mjs` | New. Badge text and visibility rule (exported pure helper `badgeFor(progress)` from `shell.js`). |
| `playwright.config.mjs` | New. `webServer` runs `node scripts/serve.mjs --port 4173`. Projects listed in §6. |
| `tests/e2e/*.spec.mjs` | New. See §6. |
| `tests/e2e/fixtures/registry.js`, `tests/e2e/fixtures/fake-game.js` | New. A fake registry served in place of `app/src/games/registry.js` via Playwright `page.route`, so the resume and badge behaviour can be tested without test hooks in the shipped code. The fake game exposes `window.__fake.<id>.answer()` and `.finish()`, which call `reportProgress`. |
| `.github/workflows/pages.yml` | New, **only if Q11 is answered A** (§10). Uploads `app/` with `actions/upload-pages-artifact` and deploys with `actions/deploy-pages` on push to `main`. Not created otherwise. |

---

## 3. Contracts

There is no old shape; nothing reads these yet. They are the interface
SEI-2 – SEI-4 build against, so they are written down here and must be
copied into a comment block at the top of `app/src/games/registry.js`.

### 3.1 Game module contract

A game is an object `{ create(ctx) }`. Each real game lives in
`app/src/games/<id>.js` and default-exports that object. `registry.js` imports
it statically and puts it in the entry's `module` field. (Amended 2026-10-23,
`docs/tech-debt.md` TD-2. The original wording said "an ES module whose
default export is `{ create(ctx) }`".)
`create` is called once, synchronously, the first time the game is opened in
a page session. It returns an instance:

```
instance = {
  show({ autoRead })  // called every time the view becomes visible, synchronously
                      // inside the tap handler when opened by a tap.
                      // autoRead === true only when opened by a tap AND not resuming.
  hide()              // called when leaving: stop timers, remove any document/window
                      // listeners added in show(). Do not reset round state (Q10).
  listen()            // called synchronously from the Kuuntele tap. Must call
                      // ctx.speech.say(...) synchronously, or do nothing.
}
```

`ctx` given to `create`:

| Field | Meaning |
|---|---|
| `ctx.root` | The game's own area inside the white game card, below the question row. |
| `ctx.question` | The question slot left of Kuuntele in the question row. |
| `ctx.status` | This game's element inside the top-bar status slot (max 40 % width, design 3.2). |
| `ctx.speech.say(parts)` | `parts` = `[{ text, rate? }]`. Speaks in the game's language; all parts are queued in the same call. Drives this game's Kuuntele state. Cancels anything already speaking, in any game. |
| `ctx.speech.stop()` | Stops speech. |
| `ctx.reportProgress({ done, total, finished })` | `done` = answered or skipped in this round (0…total), `finished` = end screen shown. Shell shows `Kesken {done}/{total}` iff `done ≥ 1 && !finished` (design 3.1, §6). A new round reports `{ done: 0, finished: false }`. |

Rules for ports (each one is a direct consequence of an originals line above):

1. No globals. Query only inside `ctx.root`, `ctx.question`, `ctx.status`;
   no `document.getElementById` — three game views can be in the DOM at once
   and ids like `speakBtn`/`nextBtn` repeat across the originals.
2. Document/window listeners (Matikka 692, Espanja 246) only between `show`
   and `hide`.
3. No direct `speechSynthesis`. No timer or `await` between a tap and the
   `say` it causes (replaces Matikka 493, Sana 592). Speech chained by
   `setTimeout` from `onend` (Sana 497–510) and `setTimeout(i*600)` chains
   (Espanja 411) are replaced by one `say([...parts])`. Pauses between parts
   are not offered by SEI-1; if SEI-3 needs them, it extends `say` and checks
   on the iPad first (R2).
4. No game control is disabled while waiting for speech (design 3.4 rule 2).
5. Static assets go under `app/assets/` (SEI-3 moves `vauhti.mp3` there; no
   Drive fetch).
6. `localStorage` keys are prefixed with the game id. Note for SEI-4: stars
   saved by the original Espanja under `es_stars` live in that file's own
   browser storage and cannot be read by the new app on another address; the
   new app starts at zero unless the owner is told and agrees.

### 3.2 Routing contract

Hashes `#/`, `#/matikka`, `#/sanat`, `#/espanja` (design 3.0). Navigation
from a tap uses `history.pushState` and renders synchronously in the same
handler. `popstate` and `hashchange` (back button, iPad swipe, typed address)
render with `autoRead: false`. Render is idempotent: rendering the current
route again does nothing.

---

## 4. Architecture doc impact

`docs/architecture.md` does not exist. This plan makes no existing statement
false. After review, scribe creates the file; these are the statements it
should contain and nothing more about SEI-1 (keeps it bounded):

1. The app is static files under `app/`, no build, no runtime dependencies;
   `node scripts/serve.mjs` serves it locally. (Plus where it is hosted, per
   Q11.)
2. Entry `app/src/app.js` → `shell.js`; routes are `#/` and `#/<game-id>`;
   tap navigation is `pushState` + synchronous render.
3. Games plug in through `app/src/games/registry.js` and the contract in its
   header comment (`create(ctx)` → `show/hide/listen`, `ctx.speech`,
   `ctx.reportProgress`). Game views are created once and kept until reload.
4. All speech goes through `app/src/speech.js`: voice check per language, 2 s
   start limit, 12 s cap, generation token; the listen button is never
   disabled.
5. Nothing is stored except what a game stores itself.
6. Tests: `npm run test:unit` (node:test, pure modules), `npm run test:e2e`
   (Playwright, WebKit with touch at the iPad sizes, Chromium at desktop
   size). Real speech is only verified on a device.

---

## 5. Ordered steps

### Step 0 — Preconditions

`node --version` must print v20.4 or later (`mock.timers` in `node:test`
appeared in 20.4). If older or missing, stop and report; do not work
around it. Not checked by the architect (no shell access).

Check: version printed.

### Step 1 — Scaffold and static front page

Create `package.json`, `.gitignore` additions, `scripts/serve.mjs`,
`app/index.html` with static markup, and the front-page part of
`app/styles/app.css` (tokens, card layout at the three breakpoints, button
states, boot-error rule). No JS yet beyond an empty `src/app.js` that does
not set `data-booted`.

Check: `npm run serve`, open `http://127.0.0.1:8080/` in Chrome. Three cards
in the order Matikka, Sanat, Espanja with the design's art, titles and
descriptions; resize the window across 900 and 600 px and the layout switches
between side by side and stacked. After 3 s the boot error `Seikkailut ei
käynnistynyt.` appears — correct at this step, since nothing sets
`data-booted`. `curl -I http://127.0.0.1:8080/src/app.js` shows
`Content-Type: text/javascript`. `curl -I http://127.0.0.1:8080/../package.json`
does not return the file.

### Step 2 — Router

Write `router.js` and `tests/unit/router.test.mjs`.

Check: `npm run test:unit` passes. Cases: `''`, `'#'`, `'#/'` → home;
`'#/matikka'` → game matikka; `'#/shakki'`, `'#/Matikka'`, `'#/matikka/x'`,
`'#matikka'` → home; `titleFor` gives `Espanja – Seikkailut` with U+2013. A
failing test looks like `'#/shakki'` returning `{ view: 'game', id: 'shakki' }`.

### Step 3 — Speech service (the hard part)

`app/src/speech.js`, written and unit-tested before any UI uses it. The
service is a single instance shared by all games; per-language state is
derived, per-call state is tracked by a generation token.

**Language and voice.**
- `normalise(lang)` → lower case, `_` replaced by `-` (some platforms report
  `fi_FI`).
- `availability(lang)`:
  - `synth` missing → `'unsupported'`;
  - `synth.getVoices()` empty → `'unknown'`;
  - some voice whose normalised `lang` starts with the 2-letter prefix
    (`fi`, `es`) → `'available'`;
  - otherwise → `'missing'`.
- `pickVoice(lang)`: same order as Sana 462–466 — exact tag and
  `localService`, then exact tag, then prefix match.
- Listens to `voiceschanged` and notifies subscribers, so a button in
  `novoice` returns to `ready` when the language appears (design 3.4 rule 6).

**`say(lang, parts, onState)`** — everything up to and including the last
`synth.speak()` runs synchronously:
1. `gen = ++this.gen`. Clear both timers. Tell the previous caller's
   `onState('idle')` (another game's or this game's button leaves `playing`).
2. Re-read `availability(lang)` (the voice list is often populated by now).
   `'unsupported'` or `'missing'` → `onState('failed', reason)` and return
   without speaking. This is the "no wrong-language reading" rule (design 3.4
   rule 5): a Finnish text is never handed to a non-Finnish voice when the
   list says Finnish is absent. `'unknown'` → speak with `u.lang` only.
3. `synth.cancel()`. For each part: new `Utterance(text)`, `lang` = the BCP-47
   tag, `voice` = `pickVoice` if any, `rate` = part rate or 1; attach
   `onstart`, `onend`, `onerror` handlers that first check `gen === this.gen`
   and otherwise return. Keep references to the utterances on the instance
   until the call finishes (Chrome can garbage-collect an unreferenced
   utterance and then never fire `onend`). `synth.speak(u)` for each, in order.
4. Start the **start timer** (2000 ms). If no `onstart` arrives before it
   fires → `synth.cancel()`, `onState('failed', 'nostart')`.
5. First `onstart` → clear the start timer, `onState('playing')`, start the
   **cap timer** (12000 ms from this moment). When the cap fires →
   `synth.cancel()`, `onState('idle')`.
6. `onend` of the **last** utterance → clear the cap timer, `onState('idle')`.
7. `onerror`: `event.error` `'canceled'` or `'interrupted'` → `idle`; any
   other value → `failed`. Stale-generation events are ignored, so our own
   `cancel()` in step 3 of the next call cannot flip the new call's state —
   this is the defect at Sana 490–510 turned inside out: every path out of
   `playing` is driven by the service, not by an event that may never come.

**`stop()`**: `gen++`, clear timers, `synth.cancel()`, current caller
`onState('idle')`. Called by the shell on every route change (design 3.2:
Etusivu stops speech at once).

**Unit tests** (`tests/unit/speech.test.mjs`, fake synth recording `speak`
and `cancel` calls, with methods to fire `start/end/error` on a recorded
utterance and to set the voice list; `mock.timers.enable({ apis:
['setTimeout'] })`):

| Test | Passing | What a failure looks like |
|---|---|---|
| no synth | `say` → `failed('unsupported')`, no throw | throws `TypeError` on `synth.cancel` |
| voices `[en-US]`, `say('fi-FI')` | `failed('missing')`, `speak` never called | `speak` called with an English voice |
| voices `[]` | `speak` called, `u.voice` unset, `u.lang === 'fi-FI'` | `failed` returned, button would be dead on first load |
| voices `[fi_FI]` | `available`, voice picked | `missing` |
| two parts | `speak` called twice synchronously, in order, before `say` returns | second part spoken from `onend` |
| no `onstart` | at 1999 ms still not failed; at 2000 ms `failed('nostart')`, `cancel` called | stays `playing`/`ready` forever |
| `onstart`, never `onend` | `playing`; at start+12000 ms `idle`, `cancel` called | stays `playing` |
| `onend` of first of two parts | still `playing`; `idle` only after the second | `idle` after the first |
| second `say` while first speaks; then the first call's stale `onend`/`onerror('interrupted')` fires | first caller got `idle` once; second caller's state unaffected | second caller flips to `idle`/`failed` |
| `onerror('synthesis-failed')` | `failed` | `idle` |
| `voiceschanged` adds `fi-FI` | subscriber notified, `availability` → `available` | button stays `novoice` |
| `stop()` mid-speech | `cancel` called, `idle`, later events ignored | late `onend` re-enters a state |

Check: `npm run test:unit` passes, and temporarily deleting the cap timer
line makes exactly the "never `onend`" test fail (do this once, revert, and
say so in the hand-over).

### Step 4 — Registry and placeholder game

Write `registry.js` (with the contract comment from §3.1) and
`placeholder.js`.

Check: a small unit test imports `registry.js` (no DOM needed at import time)
and asserts three entries, ids `matikka`, `sanat`, `espanja` in that order,
languages `fi-FI`, `fi-FI`, `es-ES`, labels as in design 3.4. Fails if a
module touches `document` at import time.

### Step 5 — Shell, listen button, notice, boot

Write `listen-button.js`, `shell.js`, `app.js`.

Shell behaviour, each point tied to the design:
- **Card tap** (`click`, which also covers Enter/Space): `pushState` to the
  game hash, then synchronously: `speech.stop()`; hide the current view; if
  the game has no view yet, build it (top bar with Etusivu button + h1 +
  status slot; notice slot; game card with question row and Kuuntele; game
  area) and call `create(ctx)`; unhide; set title; `scrollTo(0, 0)`; focus
  the h1 (`tabindex="-1"`); call `show({ autoRead: !resuming })`. `resuming`
  = the instance existed and its last report was not `finished`, and at
  least one task was done; otherwise `autoRead: true`. (design 3.5, 3.2
  "Paluu kesken kierroksen".)
- **Etusivu button / popstate / hashchange to home**: `speech.stop()`,
  `instance.hide()`, hide the view, show the front page, update badges, title
  `Seikkailut`, focus the card of the game just left (design §7). Etusivu uses
  `history.back()` when the previous entry is the front page we pushed,
  otherwise `pushState('#/')`, so the history does not grow on every round
  trip (design 3.0: one step per switch, back returns home).
- **Direct load / reload with a game hash**: render the game with
  `autoRead: false` (design 3.5).
- **Kuuntele**: `onTap` → `instance.listen()` synchronously. The game's
  `ctx.speech.say` passes the game's `lang` and wires `onState` to that
  game's button and to the notice rule below.
- **Notice** (design 3.4 "Ei ääntä -ilmoitus"): shown in the game's notice
  slot when (a) the game opens and `availability` is `unsupported`/`missing`
  — once per language per page session — or (b) any `say` started from a
  Kuuntele tap ends in `failed` — every time. Text variant by language and
  by `unsupported` vs other reasons, exactly as the design. `Selvä` closes it
  and focuses Kuuntele; Kuuntele stays `novoice`. The notice is announced via
  a polite live region once.
- **Errors**: `create` or `show` throws → the game card shows `Peli ei
  auennut.` with the `Etusivulle` button, focus on its heading; the view is
  discarded so the next attempt calls `create` again. The boot error is the
  pure-CSS rule from step 1 plus `data-booted` set at the end of `boot`.
- **Badges**: `badgeFor(progress)` returns `null` or `{ text: 'Kesken 4/10',
  srText: 'Kesken, 4 tehtävää 10:stä tehty.' }`; applied to the card on every
  return to the front page.
- **Not built**: the `Peli aukeaa…` loading text (design 3.2). With static
  imports and synchronous `create`, the browser cannot paint between the tap
  and the opened game, so the 300 ms condition can never be met. Recorded
  here so the reviewer does not read it as a gap.

Check, by hand in Chrome at `npm run serve`: tap Matikka → address
`#/matikka`, title `Matikka – Seikkailut`, green top bar, `yksi plus kaksi`
is heard; Etusivu → front page, focus ring on the Matikka card when using the
keyboard; browser back from a game → front page; reload on `#/sanat` → Sanat
opens with no sound; `#/shakki` → front page; Kuuntele while it is speaking
restarts it.

### Step 6 — Styling to the design

Complete `app.css` for the frame: sticky 76 px top bar, Etusivu pill (icon only
below 420 px with the text kept for screen readers), 30 px h1, status slot at
max 40 %, question row wrapping below 420 px, game card max 760 px, the
notice and its narrow layout, Kuuntele states including the striped
`novoice` look and the wave bars. Use `100dvh` with a `100vh` fallback for
heights (design 3.2: visible area, not screen height).

Check: compare by eye against `docs/design/sei-1.html` sections 3, 5 and 6 at
820×1130, 1180×770, 1280×720 and 375 wide (Chrome device toolbar). Then the
e2e specs in step 7 make it repeatable.

### Step 7 — End-to-end tests

Set up Playwright (`npx playwright install webkit chromium`) and write the
specs in §6. Check: `npm run test:e2e` passes on all projects, and each spec
has been seen to fail once by breaking the thing it guards (list which
break was used per spec in the hand-over).

### Step 8 — Device check on the iPad (see §7)

### Step 9 — Hosting (only after Q11 is answered)

If A: create the GitHub repository (owner or main session with the owner's
access), add `pages.yml`, push, enable Pages from Actions. If B: stop and
return to the architect — B needs a small build step that inlines the modules
into one HTML file and an `addMetaTag` viewport, which this plan does not
specify.

**Amendment 2026-10-23 (architect, after Q14).** Hosting stays A: public
GitHub repository, GitHub Pages. The owner's condition: the children's ages
do not appear; users are described only as "1.–2.-luokkalaisille". So,
before the first push:

1. Scrub the ages from the docs. Found on 2026-10-23 by searching the repo
   (excluding `node_modules/`) for the age figures, "ikäi" and "vuotia":
   `docs/brief.md:14`, `docs/backlog.md:14` and `:435`,
   `docs/design/sei-1.md:16` and `:443`, `docs/questions.md:35`. Rewrite each
   to the grade wording (or, where the age argues a design point, to "1.–2.-
   luokkalaisen"), without changing the meaning of any criterion.
2. Check: re-run the same search on the working tree and on
   `docs/architecture.md`, `docs/tech-debt.md`, `app/`, `tests/`; zero hits.
   The owner is not asked to check this.
3. Push a fresh history: one squashed commit of the scrubbed tree on a new
   orphan branch (`git checkout --orphan publish`, commit, push it as
   `main` to the new remote). The local history, which contains the ages,
   is never pushed. Check: `git log --oneline origin/main` shows exactly one
   commit, and a search of that commit's tree for the age figures finds
   nothing.
4. Then as above: `pages.yml`, enable Pages from Actions. Afterwards the
   local `main` is moved to the published commit (the old history may be
   kept as a local-only branch, never pushed), so later commits build on the
   published one and a plain `git push` cannot carry the old commits.

---

## 6. Test plan, by criterion

Playwright projects (sizes are design 3.1 / 3.2's visible areas):

| Project | Engine | Viewport | Touch |
|---|---|---|---|
| `ipad-portrait` | WebKit | 820 × 1130 | `hasTouch: true`, `isMobile: true` |
| `ipad-landscape` | WebKit | 1180 × 770 | same |
| `desktop` | Chromium | 1280 × 720 | no |
| `narrow` | WebKit | 320 × 700 | `hasTouch: true` |

WebKit in Playwright approximates Safari's layout engine; it is not iPad
Safari and has no real speech. Every speech test injects a fake
`speechSynthesis` / `SpeechSynthesisUtterance` with `page.addInitScript`.

| Crit. | Spec | Asserts | A failure looks like |
|---|---|---|---|
| 1 | `home.spec` (all projects) | Three `button.game-card` in order with names `Matikka`, `Sanat`, `Espanja`; tapping each (`tap` on touch projects, `click` on desktop) lands on `#/<id>` with that h1 and title. Registry ids equal the cards' `data-game` values. | Espanja card opens Sanat; a card is a `div` (not reachable by Tab). |
| 2 | `navigation.spec` | Record `performance.getEntriesByType('navigation').length` and a `window.__marker` set at start; go home → Sanat → Etusivu → Espanja → browser back → Matikka; marker still present (no reload). Back from a game goes home; Etusivu then browser back does not reopen the game in a loop. | `__marker` undefined after a switch (page reloaded); back stays on the game. |
| 2 + Q10 | `resume.spec` (fake registry) | Open Matikka, `__fake.matikka.answer()` ×4, Etusivu → Matikka card shows `Kesken 4/10` and its accessible name contains `Kesken, 4 tehtävää 10:stä tehty.`; reopen → same instance (fake's internal counter still 4), no `speak` call on reopen; `finish()` → badge gone; reload → no badge. Two games unfinished at once → two badges. | Badge on 0/10; reopen creates a fresh instance; speech plays on resume. |
| 3 | `layout.spec` (all projects, front page and each game) | `document.documentElement.scrollWidth <= innerWidth`; every visible `button` has `rect.left >= 0` and `rect.right <= innerWidth`. Front page at the three device projects: every card's `rect.bottom <= innerHeight` (design 3.1: fits without scrolling). Game views: Etusivu and Kuuntele inside the viewport, and the top bar still at `top: 0` after `scrollTo(0, 2000)`. | A 340 px min-width card on `narrow` pushes `scrollWidth` to 356; Kuuntele clipped at the right on `narrow`. |
| 4 | `targets.spec` (all projects, front page, each game, notice open) | Every visible `button` is at least 44 × 44 CSS px (CSS px equal points at the iPad's default zoom); frame buttons (`.game-card`, Etusivu, Kuuntele, `Selvä`, `Etusivulle`) at least 56 × 56; gaps between adjacent frame buttons at least 12 px. On touch projects the whole flow of `navigation.spec` is driven with `tap` only, no keyboard or mouse. Buttons have `touch-action: manipulation` (computed style). | Etusivu icon-only button measures 48 × 48 on `narrow`. |
| 5 | `nosound.spec` | Four injected fakes: (a) no `speechSynthesis` at all; (b) voices `[en-US]` only; (c) `speak` accepted but never fires `onstart`; (d) `onstart` but never `onend`. With `page.clock`: (a)/(b) Kuuntele shows `Ei ääntä` as soon as the game opens and the notice appears once, with the language-specific adult line; (c) after tapping Kuuntele, at 2 s the button shows `Ei ääntä` and the notice appears; (d) at 12 s the button is back to `ready`. In all four: Kuuntele, Etusivu, `Selvä` stay clickable (`isEnabled()`), never `disabled`; tapping Kuuntele in `novoice` calls `speak` again or re-shows the notice. With the fake game: `answer()` ×10 + `finish()` completes while speech is stuck in (c) and (d). | Button `disabled` after tap in (c) — the Sana 490–492 behaviour; notice never shows in (b) because a non-Finnish voice was used. |
| 6 | `gesture.spec` | Init script adds a capture-phase `click` listener on `window` that sets `__inDispatch = true` and a bubble-phase one that sets it `false`; the fake `speak` records `__inDispatch` per call. Tap a card → the first `speak` call happened with `__inDispatch === true`. Tap Kuuntele as the very first interaction after a reload on `#/espanja` → same. Reload on `#/sanat` → zero `speak` calls before any tap. (Zero calls on reopening an unfinished round is in `resume.spec`, which has the fake game that reports progress; the placeholder never does.) | `__inDispatch === false` because rendering moved to `hashchange` or the game is loaded with `import()`. |
| 5, 6 (unit) | `speech.test.mjs` | The table in step 3. | As in step 3. |

The shell must not call `stopPropagation` on `click`, or the bubble listener
in `gesture.spec` would not run; a test that sees `__inDispatch` stuck at
`true` across two separate taps flags this.

**Amendment 2026-10-23 (architect, after the SEI-1 review): this replaces the
method in row 6.** The window capture/bubble flag cannot see a microtask delay:
the review showed `await Promise.resolve()` passes on all projects and
`await import()` passes on WebKit. New method: the init script wraps
`EventTarget.prototype.addEventListener` so that every `click` listener runs
between `__inListener++` and `__inListener--` (the decrement is in `finally`;
a `WeakMap` keeps `removeEventListener` working). The fake `speak` records
`inDispatch: __inListener > 0`. Done when mutations (a) `await
Promise.resolve()`, (b) `await import(...)` and (c) `setTimeout(...,0)`, each
placed before `render` in `openFromCard`, all fail `gesture.spec` on all 4
projects. With this method, the `stopPropagation` paragraph above no longer
applies. App click listeners must be attached with `addEventListener`, not
with `onclick =`. Must land before SEI-2. Details are in `docs/tech-debt.md` TD-1.

**What these tests cannot show:** that iPad Safari plays sound from the first
tap, that the iPad has Finnish and Spanish voices, and that `onstart` fires on
iPad Safari at all (if it did not, the 2 s rule would show `Ei ääntä` while
sound plays). Those are §7.

**Criteria 4 and 5 say "play each game's round to the end".** In SEI-1 there
is no round; the tests prove it for the frame and a fake game. The same
`layout`, `targets`, `nosound` and `gesture` specs iterate over the registry,
so they run against each real game automatically once SEI-2 – SEI-4 swap the
placeholder out; each port adds driving a real round to the end. See open
question O1.

---

## 7. Verification in the real environment

Nothing deploys itself, and the green suite has no real speech. Two
observations are needed; only someone holding the iPad can make the second.

**A. Computer (main session can do this).** `npm run serve`, open
`http://127.0.0.1:8080/` in Chrome on the Mac and, if available, Safari.
Tap through Matikka, Sanat, Espanja and back. Right answer: three cards,
each game opens with its colour and name, `yksi plus kaksi` / `kissa`
(twice, second slower) / `hola` in Spanish is heard on opening, Etusivu and
browser back return without a reload, and on macOS without a Finnish voice
the notice appears instead of English speech.

**B. iPad (owner).** Until hosting exists, the Mac serves the app on the home
network: the main session runs `node scripts/serve.mjs --host 0.0.0.0` and
gives the owner the address `http://<mac-lan-ip>:8080/` (macOS may ask once
to allow incoming connections for `node`). Precondition: Mac and iPad on the
same Wi-Fi. If Q11 is answered A and the page is up, use that address
instead. The smallest observation that settles criteria 5 and 6 on the
device, asked one step at a time:

1. Fresh tab, open the address, tap **Sanat** once → "kissa" heard twice from
   that single tap: same / not. (Criterion 6, and that two queued parts play
   on iPad, R2.)
2. Tap Etusivu, tap **Espanja** → Spanish "hola" heard, or the yellow notice
   appears: which. (Spanish voice present or not.)
3. While it speaks, the Kuuntele button turns coloured with moving bars and
   no notice appears: yes / no. (R3: `onstart` fires on iPad.)

Record the answers, the iPad model and iOS version (Settings › General ›
About), and the date in the task.

---

## 8. Alternatives considered

| Alternative | Rejected because |
|---|---|
| Embed the three original HTML files unchanged in iframes | Fastest route to "all games in one app", but the frame must own Kuuntele and start speech inside the child's tap; cross-frame calls, heights (design 3.2's per-device table), focus return and the Sana defect would all stay. The originals' timed auto-speech (Matikka 493, Sana 592) has to be rewritten for iPad anyway. |
| A framework (React, Svelte, Vue) and a bundler | The originals are plain HTML/JS; three small games do not need components or a build, and no-build keeps hosting trivial and the code readable to the next person. |
| One HTML file like the originals | Tests could not import the router or speech modules, and three ports in one file would collide. Kept as a build output only if hosting B is chosen. |
| Render on `hashchange` / set `location.hash` | `hashchange` is dispatched as a separate task, after the tap's handler has returned, so speech started there is outside the gesture (criterion 6). |
| Load games lazily with `import()` | Same reason: the await breaks the gesture chain. Three small games load fine up front. |
| Destroy the game on leave and restore from saved state | Q10 only asks to keep the round until reload; keeping the instance alive is less code and no serialisation format to maintain. Profiles (SEI-11) can revisit. |
| Disable Kuuntele while speaking (originals) | It is the defect criterion 5 targets (Sana 490–510). |
| Jest / Vitest for unit tests | `node:test` is built in and enough for pure modules; one fewer dependency. |
| `overflow-x: hidden` as the fix for sideways scrolling | Hides overflow instead of removing it; buttons could sit off-screen while the test passes. |
| Only manual testing | Four viewports × four views × no-sound variants is too many to re-check by hand on every port. |

---

## 9. Risks

- **R1 — first-tap speech on iPad Safari is unverified.** The design rests
  on "speak synchronously in the tap handler and iPad allows it". Automated
  tests prove the call is synchronous; only §7 B step 1 proves the iPad plays
  it. If it fails, the fallback is to speak a short silent/near-empty
  utterance on the very first tap anywhere, before routing — but that is a
  design change to bring back, not to improvise.
- **R2 — queued multi-part speech on iPad.** Sana needs a word twice (and
  syllables). SEI-1 queues all parts in one call; whether iPad Safari plays a
  queue started in a tap is checked by §7 B step 1. Pauses between parts are
  not built; SEI-3 decides after seeing this result.
- **R3 — `onstart` may not fire on some browser.** Then the 2 s rule would
  show `Ei ääntä` while sound plays. Covered by §7 B step 3. Fallback if it
  happens: treat `synth.speaking === true` at 2 s as started.
- **R4 — voices on the owner's iPad.** Finnish and Spanish voices may be
  missing; the app then shows the notice with the design's adult instructions.
  Observed in §7 B step 2.
- **R5 — WebKit in Playwright is not iPad Safari.** Layout numbers are
  close but not proof; Safari's toolbars change the visible height. Design
  3.2 already measures from the visible area; §7 B is the real check.
- **R6 — Chrome speech quirks.** Chrome on macOS can drop `onend` and has
  been known to stop long utterances; the generation token, kept references
  and the 12 s cap make these harmless to the game, at worst the button
  returns to `ready` early.
- **R7 — Kids could reach the placeholder app** if hosting A is public
  before SEI-2 – SEI-4 land. It plays nothing harmful; the old games keep
  working where they are.

---

## 10. Open questions

**For the owner (one question; business choice).**

**Q11 (decision) — Where will the new Seikkailut live on the internet?**
Context: today only Sanaseikkailu is online, through Google; the new app
needs one address the iPad and the computer open.
- **A (recommended):** a free GitHub web page, like the code you already keep
  public on GitHub (address of the form `hakaotu.github.io/seikkailut`).
  Opens quickly, no Google notice bar above the game, and later the app can
  be put on the iPad home screen and work without internet (the proposed
  SEI-18). The game code is visible to anyone, as Sanaseikkailu's already
  is; no personal data is in it.
- **B:** the same Google setup as Sanaseikkailu today. Familiar, but Google
  shows its own notice above the app, it starts slower, it needs an extra
  build step, and offline / home-screen use (SEI-18) would not be possible.
- **Default if "don't know":** A. SEI-1 does not wait for the answer: the
  iPad check in §7 runs from the Mac on the home Wi-Fi. The answer is needed
  before SEI-2 is shown to the children.

Suggested Finnish wording for the main session:
> Uusi Seikkailut tarvitsee osoitteen, jonka iPad ja tietokone avaavat.
> Nyt verkossa on vain Sanaseikkailu Googlen kautta. Laitetaanko uusi
> (A, suositus) ilmaiseksi GitHubin verkkosivuksi, kuten Sanaseikkailun koodi
> jo on julkisesti GitHubissa — avautuu nopeasti, ei Googlen ilmoituspalkkia,
> ja myöhemmin voi toimia iPadin kotinäytöltä ilman verkkoa — vai (B) samaan
> Google-palveluun kuin Sanaseikkailu nyt? Jos et tiedä, valitaan A.

**For the main session (not the owner).**
- **O1** — Criteria 4 and 5 mention playing each game's round to the end;
  SEI-1 can only show this for the frame and a fake game (§6). Proposal:
  SEI-1 closes on frame-level evidence plus §7, and SEI-2 – SEI-4 each
  re-run the SEI-1 specs against the real game. If that is not acceptable,
  pm should split the round-level part of criteria 4–5 into the port tasks.
- **O2** — Node version on the Mac is unchecked (step 0).
- **O3** — Hosting A needs a GitHub repository for this repo (none exists:
  no remote). Creating it is a click step for the owner or a `gh` command for
  the main session, given at step 9 only.
