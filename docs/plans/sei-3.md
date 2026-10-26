# Plan: SEI-46 + SEI-47 (automatic advance) and SEI-3 + SEI-7 + SEI-8 (Sanat in the app)

Architect, 2026-10-26. Inputs:
- `docs/backlog.md`: SEI-3 (criteria 1–11), SEI-7 (1–3), SEI-8 (1–3), SEI-46 (1–10),
  SEI-47 (1–14).
- `docs/design/sei-3.md` + `.html`. Approved by the owner (Q26). Q27: a skipped word is
  shown and read first, then `Seuraava` (design E5).
- `docs/design/sei-46.md` + `.html`. Approved by the owner (Q29). Covers both games and
  changes A1–A5.
- `docs/design/sei-4.md` (in progress), read only to keep the auto-advance helper usable
  by Espanja.
- `docs/architecture.md`, `docs/plans/sei-2.md` (model), `docs/tech-debt.md`.
- `originals/sanaseikkailu.html` ("old r. n" below).
- The code at HEAD `9edf77d`. The last code commit is `33d4c25`; every commit after it
  is docs only.

The two design specs are the source for every string, colour and pixel value. This plan
repeats them only where a test depends on them or the code has to choose something.

---

## 1. Context and constraints

**What exists now** (read at `9edf77d`):

| Fact | Where |
|---|---|
| Sanat is the placeholder. It says `kissa` twice (0.78, then 0.52 with `pauseMs: 700`). | `app/src/games/registry.js:63-77`, `app/src/games/placeholder.js:22-29` |
| `ctx.speech.say(parts)` takes one argument. The shell's wrapper reads `view.originTap` and passes it to `onSpeechState` as `fromTap`. | `app/src/shell.js:177-185` |
| `originTap` is true only inside the Kuuntele `onTap`, so `fromTap` means "from Kuuntele", not "from any tap". | `shell.js:150-158` |
| On `failed`, the button always goes to `novoice`. The notice shows if `fromTap`, or else once per language. | `shell.js:71-75` |
| `Selvä` hides the notice and focuses Kuuntele. | `shell.js:164-167` |
| Leaving a game calls `instance.hide()`, via the front page or via another game. | `shell.js:230-241`, `:253-261` |
| Matikka's Seuraava: `<button class="mk-primary mk-big mk-next">` holding a label span and an arrow SVG. `is-waiting` hides it with `visibility: hidden` while the problem is unanswered. Its `aria-label` is `Seuraava lasku` or `Katso tulos`. | `app/src/games/matikka.js:128-129`, `:386-388`; `app/styles/app.css:797` |
| `next()` does nothing if the current problem is unanswered. That makes a second advance impossible. | `matikka.js:525-526` |
| `answer()` focuses Seuraava (`:493`), announces (`:498`), then calls `say` last (`:499`). | `matikka.js:477-506` |
| Its only `setTimeout` today is the confetti removal. | `matikka.js:460` |
| Its click listeners go through `guarded`, which reads `performance.now()`. | `matikka.js:225-229`, `:590` |
| Brand colours are the custom properties `--brand`, `--brand-dark` and `--brand-light`, set per `[data-game]` (Matikka green, Sanat violet). The design's `--a`, `--ad` and `--al` mean these. | `app.css:16-17` |
| Pressed and focus styles come from shared selector lists, which name each game class. | `app.css:55-111` |
| Matikka's button rules are scoped `.game-view[data-game='matikka'] .mk-primary`, specificity (0,3,0). | `app.css:623-641` |
| `nosound.spec` and `targets.spec` locate the notice's `Selvä` as `view.locator('.ok-btn')` in strict mode. A game button with class `.ok-btn` would break them. | `tests/e2e/nosound.spec.mjs:37,40`; `tests/e2e/targets.spec.mjs:18` |
| `matikka.spec` asserts `.mk-next` `toHaveText('Katso tulos')`. A text node added inside the button would break it. | `tests/e2e/matikka.spec.mjs:301` |
| `gesture.spec` has three tests that rely on the Sanat placeholder: the card tap speaks, `kissa` twice. | `tests/e2e/gesture.spec.mjs:14-24`, `:47-59` |
| `registry.test.mjs` stubs `document` and reads the placeholder's `kissa` sample. | `tests/unit/registry.test.mjs:16-41` |
| The fake speech wraps `addEventListener` and records `inDispatch` for each `speak`. It never refuses a `speak`. | `tests/e2e/helpers.mjs:21-130` |
| `settle()` waits 550 ms of real time. The suite does not use `page.clock` for game timers, because the guard reads `performance.now()`. | `helpers.mjs:226-230` |
| `serve.mjs` already serves `.mp3` as `audio/mpeg`. | `scripts/serve.mjs:14` |
| Old Sanat word lists, alphabet, praise and syllabifier: `WORDS` r. 341, `HP_WORDS` r. 368, `ALPHABET` r. 391, `PRAISE_OK` r. 393, `syllabify` and its constants r. 410–446. The victory clip plays at volume 0.8 from 0 s and is stopped by a 3000 ms timer. | `originals/sanaseikkailu.html` (lines as given), victory clip r. 718–729 |

**Baseline:** unit 61/61 and Playwright 371 passed / 9 skipped / 0 failed. The main
session ran these after `33d4c25` (backlog history, 2026-10-23). No code has changed
since. The developer re-runs them at step A0 and writes the numbers down.

**What must not break:**
- The tap rule. Every `say` caused by a tap or key press is called synchronously in that
  handler. The only new exception is the auto-advance reading, which starts from a timer
  by design (sei-46 §3.2). It is marked `auto` (decision D2), so a test can tell it apart.
- Every existing spec keeps passing, apart from the deliberate changes listed in §3
  (`gesture.spec` Sanat tests and `registry.test` Sanat test).
- Espanja stays on the placeholder. `placeholder.js` and its CSS stay.
- No `localStorage`.

**Tech debt:** TD-4 (`shell.js:49-62`, the notice's live region) is next to the
`onSpeechState` change in D2, but this plan does not touch it. That is deliberate (§14).
TD-1 and TD-3 are not touched.

---

## 2. Architecture decisions

**D1. One auto-advance controller, used by every game.** New file
`app/src/games/auto-advance.js`. It owns the timer, the wait's visual state and the
listeners that end the wait. The game owns two things: when to start the wait, and what
"advance" means (its own Seuraava function). Matikka, Sanat and, later, Espanja call the
same code with the same constant. This is how SEI-47 / 14 (both games identical) holds
by construction. The test in §9.3 also runs one test body against both games.

**D2. sei-46 §5.2 / A4: a reading the game started by itself never touches Kuuntele or
the notice.** The contract gets an optional second argument,
`ctx.speech.say(parts, { auto: true })`. The shell carries `auto` into `onSpeechState`.
On `failed` with `auto`:
- the button is not set to `novoice`;
- `noVoiceReason` is not written;
- the notice is not shown;
- if the button reads `playing` (an error after a start), it goes back to `ready`;
- otherwise nothing happens.

`playing` and `idle` are handled as now. Reasons:
- The failure the design worries about is a refusal of a non-tap `speak`. That says
  nothing about whether the device has a voice.
- A missing language is already shown when the game opens (`checkAvailabilityOnOpen`,
  `shell.js:78-85`), so ignoring `failed('missing')` here hides nothing.
- Only the shell knows the button and the notice. The game only knows that the reading
  was its own idea.

Rejected alternatives are in §11.

**D3. Ending the wait (sei-46 §3.3) without reaching outside the game.**
- **Kuuntele:** the game's `listen()` ends the wait.
- **Sanat image tap, Vaihda, Seuraava:** the game's own handlers end it.
- **Etusivu or browser back:** `hide()` ends it.
- **`Selvä` and Tab or Shift+Tab:** while a wait runs, the controller listens for
  `focusin` on `document`. Any `focusin` whose target is not the waiting button ends the
  wait. `Selvä` always focuses Kuuntele (`shell.js:166`), so it ends the wait without the
  game knowing the notice exists (rule 1: query only inside your own slots).
  - Taps that the design says must *not* end the wait never move focus: a locked option,
    a used tile, a done word's box, an empty area, scrolling.
  - A mouse click on a focusable button (Kuuntele, image, Vaihda) moves focus in desktop
    Chrome. Each of those ends the wait anyway.
- **Page hidden:** a `visibilitychange` listener on `document`, also only while a wait
  runs.

Both listeners are added in `start()` and removed in `cancel()`. `hide()` calls `cancel()`.
So rule 2 (document listeners only between `show` and `hide`) holds.

**D4. The fill layer holds no text node.** Its label is CSS generated content from a
`data-label` attribute, beside a copy of the arrow SVG. Each button's `textContent` and
accessible name stay exactly as they are (`matikka.spec.mjs:301`), and the layer is
`aria-hidden`.

**D5. Tests wait in real time.** The 4000 ms constant is not configurable from a test.
Reason: architecture says "No test hooks exist in shipped code", and `page.clock` stops
`performance.now()` from advancing on its own while paused. The game guards read
`performance.now()`, and the Playwright docs (fetched 2026-10-26) do not say how it
behaves after `install()` without `pauseAt`. Unverified, so not relied on. Real-time
waits cost about 4–5 s per advance. §9.3 keeps the long tests to one project.

**D6. Sanat uses its own `sn-` classes, not `.accent-btn` or `.ok-btn`.** The design
table (sei-3 §1) names `.accent-btn` and `.ok-btn`. The same strict-locator and
frame-gap reasons that the sei-2 plan §8 gave for Matikka apply here unchanged. Sanat
buttons look the same, scoped under `.game-view[data-game='sanat']`, and their classes
join the shared lists at `app.css:55-111`. This deliberately departs from the design's
class names, not from its look.

**D7. The victory sound** is one `Audio` object per Sanat instance, created in `create`.
Its URL is `new URL('../../assets/vauhti.mp3', import.meta.url)`, so it does not depend on
the page path under `/seikkailut/`.
- `play()` is called in the same tap, after `say` (design §3.6).
- A 3000 ms timer pauses it and rewinds it (old r. 725–728).
- `hide()` stops it at once (design §2).
- `Seuraava` does not stop it. The old `nextWord` did not either, and sei-46 §3.4 says
  Seuraava stops nothing new.

---

## 3. Files to create or modify

| Path | Change |
|---|---|
| `app/src/games/auto-advance.js` | **New.** §5. Exports `AUTO_ADVANCE_MS = 4000`, `fillMarkup(label, iconSvg)` (a string) and `createAutoAdvance({ button, onAdvance, delayMs, doc, setTimer, clearTimer })`. No DOM access at import. |
| `app/src/shell.js` | **Modify.** `say(parts, opts)` in the ctx (`:178-181`) passes `opts && opts.auto === true` into `onSpeechState(view, state, reason, fromTap, auto)`. The `failed` branch (`:71-75`) gets the D2 rule. Nothing else changes. |
| `app/src/games/registry.js` | **Modify.** Phase A: the `ctx.speech.say` comment (`:28-32`) documents `opts.auto`. Rule 3 (`:44-48`) gets the sentence: *"A reading the game starts by itself (not from a tap) passes `{ auto: true }`; its failure never changes Kuuntele or shows the notice."* Phase B: `import sanat from './sanat.js'` and `module: sanat`. The `sanat` entry's placeholder arguments are removed. Rule 5 stays. |
| `app/src/games/matikka.js` | **Modify (Phase A).** §5.3. |
| `app/styles/app.css` | **Modify.** Phase A: a new unscoped section "Auto-advance (docs/design/sei-46.md)" with `aa-` classes (§5.2). Phase B: a Sanat block scoped `.game-view[data-game='sanat']`, prefix `sn-`. Add `sn-primary`, `sn-secondary`, `sn-level`, `sn-toggle`, `sn-theme`, `sn-tile`, `sn-key` and `sn-image` to the lists at `:55-111`. |
| `app/assets/vauhti.mp3` | **New.** A byte-identical copy of `originals/vauhti.mp3`. Check with `shasum` on both. This creates `app/assets/`. |
| `app/src/games/sanat-logic.js` | **New.** Pure, with no DOM and no `document` at import. §6.2. |
| `app/src/games/sanat.js` | **New.** `export default { create(ctx) }`. §6. |
| `tests/unit/auto-advance.test.mjs` | **New.** §9.1. |
| `tests/unit/sanat-logic.test.mjs` | **New.** §9.1. |
| `tests/unit/registry.test.mjs` | **Modify (Phase B).** Delete the Sanat `kissa` test (`:14-41`). Its claim moves to `sanat-logic.test` (`wordSpeech`). The first test is unchanged; it still proves that importing the registry, now including `sanat.js`, touches no `document`. |
| `tests/e2e/helpers.mjs` | **Modify.** (a) The `installFakeSpeech` option `untrusted: 'error' \| 'silent'`. A `speak` with `window.__inListener === 0` is recorded with `refused: true`. `'error'` then fires `onerror({ error: 'not-allowed' })` from `realTimeout(…, 0)`; `'silent'` fires nothing. (b) `recordAudio(page)`: an init script wrapping `HTMLMediaElement.prototype.play` and `pause`. It records `{ kind, src, at: performance.now(), inDispatch }` in `window.__audio`, and `play` resolves without sound. Without the option, nothing changes. |
| `tests/e2e/fixtures/fake-game.js` | **Modify (Phase A).** Add `fake.sayAuto()` (step A2). No new button. |
| `tests/e2e/sanat-helpers.mjs` | **New.** The Sanat drivers, parallel to `matikka-helpers.mjs`. The current word is read from the fake speech record: the last `speak` with rate 0.78 is always the word (design §3.8), upper-cased. This is the same idea as Matikka reading the problem's accessible name, and it needs no hook. Exports `view`, `openSanat`, `startRound(page, testInfo, { theme, level, tavutus })`, `currentWord`, `spell(page, testInfo, letters)` (taps the first enabled tile, or the alphabet key, with that exact name), `spellRight`, `spellWrong` (Vaikea: one letter replaced, `KISSA` → `KISTA` style; Helppo and Keskitaso: two different letters swapped), `skip`, `next`, `playRound(page, testInfo, pattern)`. |
| `tests/e2e/auto-advance.spec.mjs` | **New.** Both games, one body per test (§9.3). |
| `tests/e2e/sanat.spec.mjs` | **New.** §9.4. |
| `tests/e2e/sanat-frame.spec.mjs` | **New.** SEI-1 criteria 3–5 against real Sanat, as `matikka-frame.spec` does. |
| `tests/e2e/gesture.spec.mjs` | **Modify.** Phase A: one Matikka test (§9.2). Phase B: the card loop at `:14` becomes `['espanja']`. `:47-59` is replaced by Sanat tests (§9.4, row "tap rule"). `:39-45` (reload makes no speak call) stays as it is. |
| `tests/e2e/nosound.spec.mjs` | **Modify (Phase B), comment only.** `:93` "part 1 never starts, so … part 2 is never spoken" no longer describes Sanat's choose-screen Kuuntele, which speaks one part. Reword it. The assertion (`length` 1) still holds. |

No file is deleted. `placeholder.js` stays for Espanja.

---

## 4. Data model, API and contract changes

**`ctx.speech.say(parts, opts?)`.** `opts.auto === true` marks a reading the game started
by itself.
- Callers today: `matikka.js:219`, `placeholder.js:22`, `tests/e2e/fixtures/fake-game.js:38`.
  All call it with one argument, which still means "not auto", so none of them change.
- `speech.js` is untouched: `auto` never reaches it.
- Readers of the shell's new behaviour: only the auto-advance paths in `matikka.js`,
  `sanat.js` and, later, the Espanja game.

**`reportProgress`:** unchanged. Sanat reports `done = a + b + c`, the words finished
right-first-time (a), right-after-retry (b) and skipped (c). It reports when a word
finishes, not on Seuraava (design §5). The auto-advance never calls it, so the badge
cannot depend on how the child moved on (SEI-47 / 10).

**State added to games** (memory only, nothing stored):
- **Matikka:** one controller instance. Whether a wait is running is the controller's
  `running()`. sei-46 §6 calls for a per-item state `odotus: ei | käynnissä | loppunut`.
  "loppunut" needs no field: a wait can only start in the handler that answers the item,
  and an item is answered once. A wait that has ended can therefore never restart for
  that item.
- **Sanat:** the same, plus §6.1.

---

## 5. The auto-advance controller

### 5.1 API (`app/src/games/auto-advance.js`)

```
createAutoAdvance({ button, onAdvance, delayMs = AUTO_ADVANCE_MS,
                    doc = document, setTimer = setTimeout, clearTimer = clearTimeout })
  -> { start(), cancel(), running() }
```

The defaults are read when `createAutoAdvance` is called, not when the module loads, so a
Node import is safe.

**`start()`:**
1. `cancel()` if a wait is already running.
2. `button.style.setProperty('--aa-ms', delayMs + 'ms')`.
3. Remove `aa-counting`, read `button.offsetWidth`, then add `aa-counting`. Reading the
   width restarts the CSS animation even within one task.
4. `doc.addEventListener('focusin', onFocusIn)` and
   `doc.addEventListener('visibilitychange', onVisibility)`.
5. Start the timer.

**When the timer fires:** `cancel()`, then `onAdvance()`. The order matters. When
`onAdvance` moves focus to the new item, the listener is already gone.

**`cancel()`:** clear the timer, remove `aa-counting`, remove both listeners. It is
idempotent.

**`onFocusIn(e)`:** `if (e.target !== button) cancel()`.

**`onVisibility()`:** `if (doc.visibilityState === 'hidden') cancel()`.

**`fillMarkup(label, iconSvg)`** returns
`<span class="aa-fill" aria-hidden="true" data-label="…">ICON</span>` +
`<span class="aa-ticks" aria-hidden="true"><i></i><i></i><i></i></span>`.
The game puts this inside its Seuraava button once, in `create`.

### 5.2 CSS (one section, unscoped, after the game blocks)

- `.aa-btn { position: relative; overflow: hidden; }`. The fill sits inside the padding
  box. The button's own `box-shadow` (pressed shadow and focus ring) is not clipped by
  `overflow`.
- `.aa-fill` and `.aa-ticks` are `display: none` unless the button has `aa-counting`.
- `.game-view[data-game] .aa-btn.aa-counting` has specificity (0,4,0), which beats the
  game's (0,3,0) button rule. It sets:
  - `background: var(--brand-light)` and `color: var(--brand)`;
  - the 3 px brand border as an **inset `box-shadow`** combined with `var(--shadow)`, so
    the button's size does not change. §9.3 checks the bounding box.
- `.aa-fill`: `position: absolute; inset: 0;` with the same flex centring, gap and font
  as the button, `background: var(--brand)`, `color: #fff`.
  - `::before { content: attr(data-label); }`
  - `animation: aa-fill var(--aa-ms) linear forwards`, where `aa-fill` runs from
    `clip-path: inset(0 100% 0 0)` to `clip-path: inset(0 0 0 0)`.
  - `.aa-btn.aa-counting:active .aa-fill { animation-play-state: paused; }` holds the fill
    during a press (sei-46 §4.2).
- Under `prefers-reduced-motion: reduce`, the fill uses
  `animation-timing-function: steps(4, jump-start)`, and `.aa-ticks` shows three 3 px
  lines at 25 %, 50 % and 75 %, in `--brand` at 35 % opacity (sei-46 §4.3). The timer is
  the same.

### 5.3 Matikka wiring (Phase A)

- The `nextBtn` markup (`matikka.js:128-129`) gets class `aa-btn` and
  `fillMarkup('Seuraava', ARROW)`.
- After the DOM is built:
  `const auto = createAutoAdvance({ button: nextBtn, onAdvance: () => next({ auto: true }) })`.
- `say` helper (`:219`) becomes `(text, rate, opts) => ctx.speech.say([{ text, rate }], opts)`.
- `answer()`: after `focusEl(nextBtn)` (`:493`), if `p.correct && round.index < MAX_QUESTIONS - 1`:
  - call `auto.start()`;
  - append ` Seuraava lasku tulee itsestään.` to the right-answer announcement (`:498`),
    in the same write (sei-46 §8).

  `say` stays last.
- `next({ auto = false } = {})`:
  - first line `auto.cancel()` (called with the default `false` for the flag; this is the
    controller's `cancel`);
  - then the existing guard at `:526`;
  - its `say` passes `{ auto }`.

  The click listener at `:590` becomes `guarded(() => next())`. Reason: `guarded`
  forwards the click event as an argument, and that must not reach the options object.
  The Enter path at `:621` already calls `next()` with no argument.
- `listen()`, `openChoose()` and `hide()` each call `auto.cancel()` first.
- `showEnd()` needs nothing: no wait runs on item 10.
- The timer path does not go through `guarded`. It is not a tap, and sei-46 §9 says an
  advance is not a screen change.

---

## 6. Sanat (`sanat.js`, `sanat-logic.js`)

The design spec is followed section by section. This section fixes only what the code
has to decide.

### 6.1 State (in `create`, never global)

```
settings = { theme: 'normal', level: 'easy', tavutus: false }   // committed
draft    = copy of settings                                     // choose screen working copy
screen   = 'choose' | 'word' | 'end'
round    = null | {
  theme,                              // the list this deck came from
  words: [ wordState × 10 ],
  index, endShown: false }
wordState = {
  word, emoji, hint,
  level: null | 'easy'|'medium'|'hard',   // set when the word becomes current or restarts
  tiles: [{ id, letter, used }] | null,   // easy/medium only; shuffled once per (re)start
  slots: [ { letter, tileId|null } | null ] (length = word.length),
  picks: [slotIndex, …],                  // placement order, for Poista
  wrong: 0,                               // failed full checks; survives a level restart
  result: 'open' | 'first' | 'retry' | 'skipped',
  praise: null | string,
  showWrong: false }                      // the "Ei ihan." line is visible
counts: a = #first, b = #retry, c = #skipped, done = a + b + c
roundOpen = round !== null && !round.endShown
```

A word's `level` is fixed when it becomes current. A level change on a finished word
therefore applies from the next word (design §3.1). `tavutus` is read from `settings` at
render time, because it changes display and speech only, never the letters in the slots.

### 6.2 `sanat-logic.js` exports

Every random choice takes an `rng` argument, as `matikka-logic.js` does.
- **Data:**
  - `WORDS`, `HP_WORDS`: verbatim from old r. 341–389, 24 and 20 entries `{ word, emoji, hint }`;
  - `ALPHABET` (old r. 391);
  - `PRAISE` (old r. 393, `PRAISE_OK`; `PRAISE_ERR` is dropped, design E6);
  - `MAX_WORDS = 10`.
- `syllabify(word)`: old r. 410–446 verbatim, including `VOWELS` and `DIPHTHONGS`.
- `newDeck(theme, rng)`: 10 distinct entries of the chosen list.
- `shuffleTiles(word, rng)`: Fisher–Yates. Reshuffle while the order spells the word, at
  most 20 times (design §3.3, E13). Ids are positions in the word.
- `startWord(ws, level, rng)`: sets `level`, empty `slots`, `picks = []`, `showWrong = false`,
  and `tiles` (or `null` for `hard`). It keeps `wrong` and `result`.
- **Word edits:**
  - `place(ws, letter, tileId)` → index of the slot filled, or `-1` when full;
  - `removeAt(ws, i)` (frees its tile, takes `i` out of `picks`);
  - `removeLast(ws)`;
  - `clearAll(ws)`;
  - `isFull(ws)`;
  - `check(ws)` → `'right' | 'wrong'`. Right sets `result` to `'first'` if `wrong === 0`,
    otherwise `'retry'`. Wrong does `wrong += 1` and `showWrong = true`, and the letters
    stay;
  - `skip(ws)`: `result = 'skipped'`, slots show the word, all tiles back and locked.

  Each takes and returns the word state; the tests assert on the returned value.
- **Speech:** `wordSpeech(word, tavutus)`, `letterSpeech(l)`, `wrongSpeech(lastLetter, word)`,
  `skipSpeech(word)`, `chooseSpeech(roundOpen)`, `endTexts(a, b, c)` →
  `{ tier, title, rows, line, speech }`, `endTier(a)`.
- `starsFor(a, done)`: `done === 0 ? 0 : Math.round(a * 5 / done)`. At the end, `done = 10`,
  so this equals the design's `round(a / 2)`.
- `chooseHint(draft, round, wordOpen)` gives design §3.1's hint line.
- `backToWord({ settings, draft, wordOpen })` → `{ restart, read }`. It is the whole
  `Takaisin sanaan` decision as a pure function (§8, step B6).

### 6.3 Speech

As design §3.8. Every handler changes state and the DOM first, then calls `say` last,
synchronously. Later parts carry `pauseMs`.
- `play()` of the victory clip comes after `say` in the right-answer tap.
- The auto-advance reading is `wordSpeech(...)` with `{ auto: true }`.
- `show({ autoRead })` reads the word only if `screen === 'word'` and the current word is
  `open`.

### 6.4 Auto-advance in Sanat (Phase C)

Same as §5.3:
- The Sanat Seuraava button (`aria-label` `Seuraava sana`) gets `aa-btn` and the fill.
- The wait starts in the letter tap that makes the word right, when `index < 9`, after
  focus moves to Seuraava.
- The live text gets ` Seuraava sana tulee itsestään.`.
- `next({ auto })` cancels first and returns if the current word is `open`.
- The image tap, `listen()`, `Vaihda` and `hide()` cancel.
- `Ohita` and a wrong check never start a wait.

---

## 7. Architecture doc impact

Statements in `docs/architecture.md` that this change makes false, quoted with line
numbers at `9edf77d`. Scribe changes these and nothing else, plus the listed additions.

**After Phase A (SEI-46):**
1. L3: "As-is description after SEI-1, SEI-45 (…) and SEI-2/5/6 (Matikka port)." Add SEI-46.
2. L38: "Exception, only inside `speech.js`: a part with `pauseMs` is spoken from a
   timer…". Now there is a second exception: a game's auto-advance reading, marked
   `{ auto: true }`.
3. L50: "`speech.say(parts)` with `parts = […]`". The signature is now
   `say(parts, opts?)` with `opts.auto`.
4. L66: "`failed` sets the button to `novoice` (…) and shows the notice, always when it
   came from a Kuuntele tap, otherwise once per language per page session." This is now
   false for `auto` readings (D2).
5. L72: "Speech: every handler changes state and DOM first and calls `ctx.speech.say`
   last…; `Aloita`, `Seuraava`, … each speak." The list lacks the timer-driven advance.
6. L78: "the only Matikka `setTimeout` removes it". Matikka now also has the
   auto-advance timer, inside the controller.
7. L83–85: the unit list lacks `auto-advance`; the e2e list lacks `auto-advance`; the
   `helpers.mjs` description lacks the `untrusted` option.

Addition: a module-map row for `games/auto-advance.js`, and one short paragraph (wait
start rule, cancel triggers, `focusin` and `visibilitychange` only while running).

**After Phase B and C (SEI-3, 7, 8, 47):**

8. L3 again: add SEI-3, 7, 8 and 47.
9. L7: "Matikka is a real game; Sanat and Espanja are still the same placeholder."
10. L13: "`app/` is the deployable unit: `index.html`, `styles/app.css`, `src/*.js`." It
    now also holds `assets/vauhti.mp3`.
11. L29: "Matikka's `module` is the static import of `matikka.js`." Sanat's is too.
12. L32: "Used by sanat (`kissa` twice …) and espanja (`hola`)." Now espanja only.
13. L50: "assets under `app/assets/` (directory does not exist yet)."
14. L83–85: the unit list lacks `sanat-logic`; the e2e list lacks `sanat` and
    `sanat-frame`; the helpers description lacks `recordAudio` and `sanat-helpers.mjs`.

Additions: module-map rows for `sanat.js` and `sanat-logic.js`, and a Sanat section of
the same size as the Matikka one (screens, state, `Takaisin sanaan` rule, victory clip,
progress counting).

**Not made false:**
- L45 (listeners via `addEventListener`).
- L50 "Nothing in the repo reads or writes `localStorage` yet".
- L74 (tap guard: `screenChangedAt` set by `goTo`, not Seuraava; the timer does not set it).
- L85 "No test hooks exist in shipped code" (must stay true).
- L86.
- L96 (iPad open question). It gains one more unverified item, timer-started readings.
  That is an addition, not a correction.
- L98 is a dated report about the placeholder and stays true as history. Scribe may trim
  it to stay under the line limit.

---

## 8. Ordered steps

Each step ends green on `npm test` unless it says otherwise. Commit after each step.
Phase A is shippable alone. Phase B does not depend on Phase A having been pushed, only
on its code.

### Phase A: SEI-46 (Matikka auto-advance) and the shared pieces

**A0. Baseline.** Run `npm run test:unit` and `npx playwright test`, and write down the
counts. Expected: 61/61 and 371/9/0, as after `33d4c25`.

**A1. `auto-advance.js` and its unit tests (§9.1).** Check: `npm run test:unit` passes.
Then delete the `cancel()` call at the top of the timer callback; the test "focus change
during onAdvance does not re-cancel" or "listeners removed after firing" must fail.
Restore it.

**A2. Shell D2, the registry comment, and the fake `untrusted` option.** No game uses
`auto` yet, so test the shell against the fake registry. Add
`fake.sayAuto = () => ctx.speech.say([{ text: id }], { auto: true })` to
`tests/e2e/fixtures/fake-game.js`, next to `fake.answer` (`:15-18`). Tests call it with
`page.evaluate`, which runs outside any listener, so the fake treats it as a non-tap
reading. No button is added, so no existing fake-registry test sees a change. It stays
as the permanent shell-level test of D2.

Check (in `nosound.spec`, new tests, all 4 projects):
- With `untrusted: 'error'`: after `sayAuto`, Kuuntele keeps `data-state="ready"` and
  `Kuuntele …` text after 300 ms, and the notice stays hidden.
- With `untrusted: 'silent'`: the same after 2.3 s of real time (the 2 s start timer
  fired).
- Contrast test: the same failure without `auto`, from a Kuuntele tap, still gives
  `novoice` and the notice. This proves the test can see the difference.

**A3. CSS `aa-` section and Matikka wiring (§5.2, §5.3).** Check: the whole existing
suite is still green, and the SEI-46 rows of §9.3 pass. If an existing Matikka test now
fails with "`.mk-next` not visible", or with an unexpected `Lasku n+1`, the auto-advance
overtook a slow test. Change that test to answer wrong where the right answer is not
what it tests. Do not change the 4000 ms. Write each such change into the hand-over.

**A4. `gesture.spec` Matikka auto test (§9.2).** Then do the mutation runs of §9.6 for
the Phase A mutations (M1–M5).

**Shipping point.** The main session may push here. Then do §10 A1 and A2.

### Phase B: Sanat (SEI-3, SEI-7, SEI-8), without auto-advance

**B1. `sanat-logic.js` and its unit tests (§9.1).** Check: unit tests pass. Then set the
reshuffle limit to 0; the "never identity" test must fail.

**B2. Asset, registry swap, choose screen.**
- Copy `vauhti.mp3`.
- Do the `registry.js` swap and remove the old `registry.test` Sanat test.
- Build the `sanat.js` skeleton (`create`, `show`, `hide`, `listen`) and the choose
  screen:
  - theme cards, tavutus toggle and level cards (`role="radio"`, `aria-checked`,
    `aria-pressed`);
  - hint line;
  - `Aloita`.
- `Aloita` builds the deck, shows a minimal word screen (question row and slots only)
  and reads word 1.
- Rewrite `gesture.spec` `:14` and `:47-59` in the same commit, because the swap breaks
  them.

Check:
- the full suite is green;
- `shasum app/assets/vauhti.mp3 originals/vauhti.mp3` gives two equal hashes;
- `curl -sI http://127.0.0.1:8080/assets/vauhti.mp3` under `npm run serve` shows
  `Content-Type: audio/mpeg`.

**B3. Word screen, Helppo and Keskitaso.**
- Info row, slots (all six states), tiles, image or `?`, feedback row.
- Right: green, praise, victory clip, image revealed.
- Wrong: letters stay, shake, `Ei ihan.`.
- `Seuraava` / `Katso tulos`, stars, live region, speech.

Check: SEI-3 / 1, 3, 4, 8, 9 and SEI-7 / 1 (Helppo variant) pass.

**B4. Vaikea, removal, Ohita.**
- Alphabet with 30 keys; the full-row shake.
- Tapping a filled slot removes that letter; `Poista`; `Aloita alusta`.
- `Ohita` with the grey word and `Sana on …`.

Check: SEI-3 / 5, 10; SEI-7 / 1, 2, 3 pass.

**B5. End screen and scoring.**
- a / b / c rows with `sana`/`sanaa`, three tiers, confetti.
- `Pelaa uudelleen`, `Vaihda valintoja`, `reportProgress` finished.

Check: SEI-3 / 11 and SEI-8 / 1–3 pass.

**B6. Mid-round choose, `Takaisin sanaan`, resume, guard (the riskiest step, §15).**
Build in this order, and run the named check before going on:
1. `Vaihda` copies `settings` into `draft` and shows the choose screen in its round form.
   The hint comes from `chooseHint`. `Takaisin sanaan` is hidden when
   `draft.theme !== round.theme`.

   Check: the row "hint and buttons" in §9.4.
2. `Takaisin sanaan` commits `draft.level` and `draft.tavutus` to `settings`, then
   applies `backToWord`:

   | level changed | tavutus changed | word open | result |
   |---|---|---|---|
   | yes | any | yes | `startWord(ws, settings.level, rng)` (slots cleared, tiles reshuffled, `wrong` kept); read word in this tap |
   | yes | any | no | nothing re-rendered except via tavutus; no read; the next word uses the new level |
   | no | yes | yes | slots and letters kept, hyphens re-rendered; read word in this tap |
   | no | yes | no | hyphens re-rendered; no read |
   | no | no | any | exactly the same state; no read |

   Check: the `backToWord` unit table (all five rows) and the e2e rows in §9.4
   (SEI-3 / 6).
3. `Aloita uusi kierros` commits all of `draft` and starts a new round.
   `Vaihda valintoja` from the end screen gives the `Aloita` form.
4. Add the tap guard (`guarded`, `GUARD_MS = 500`, `screenChangedAt` in `goTo`) to every
   Sanat button handler. Tiles and keys do **not** get it inside the word screen: they
   change no screen, and fast double taps are allowed (design §3.9). Being on the
   handler list still means they are ignored for 500 ms after a screen change, which is
   the Matikka rule.
5. `hide()`: stop the victory clip and clear its timer, remove the confetti, and (Phase C)
   cancel the wait.

Check: the resume and guard rows in §9.4. Then re-run the whole suite. `settle()` must
follow every Sanat screen change in tests.

**B7. Layout.**
- The design's §3.10 sizes at ≥ 900, 600–899, < 600 and < 420 px.
- Slots wrap only at syllable boundaries when tavutus is on (one non-wrapping group per
  syllable).

Check: `sanat-frame.spec` passes on all four projects. That includes the worst case
"Vaikea, TAIKASAUVA (or the longest word in the seeded deck) with tavutus" fitting
548 px of game height on `desktop` with no vertical scroll. **If it does not fit:**
1. First apply the design's own fallback: alphabet key height 56 → 52 px.
2. If it still does not fit, stop and report the project, the screen and the overshoot
   in px. Do not shrink anything else; that goes back to the designer.

**Shipping point (optional).** Sanat without auto-advance can be pushed here. It is
harmless, but SEI-47 then differs from Matikka until Phase C. Default: push B and C
together.

### Phase C: SEI-47 (Sanat auto-advance)

**C1. Wire the controller into Sanat (§6.4).** Check: the SEI-47 rows of §9.3 pass. They
are the same test bodies as SEI-46, run against the Sanat driver. Add the Sanat-only
rows (retry, skip, victory clip timing, image tap).

**C2. Mutation pass (§9.6, M6–M10), then the full suite.** Write down the counts and the
total Playwright run time, compared with A0.

---

## 9. Test plan, by criterion

### 9.1 Unit tests (`node:test`)

`tests/unit/auto-advance.test.mjs` uses a fake button (`classList`, `style.setProperty`,
`offsetWidth`), a fake `doc` (a listener registry and `visibilityState`) and injected
timers through `mock.timers`.

| What | Asserts | A failing test looks like |
|---|---|---|
| Fires once at 4000 ms | `onAdvance` not called at 3999 ms, called exactly once at 4000 ms. `AUTO_ADVANCE_MS === 4000`. | Called at 0 ms, or twice. |
| cancel | After `cancel()` at 2000 ms, nothing happens at 4000 ms. `aa-counting` removed. Both doc listeners removed (registry empty). | `onAdvance` called after cancel. |
| start twice | Two `start()` calls 1 s apart lead to one `onAdvance`, at 5000 ms. | Two calls. |
| focusin | A `focusin` with `target === button` keeps the wait. Any other target cancels it. | Own focus cancels. |
| visibility | `visibilitychange` with `visible` keeps the wait; with `hidden` it cancels. | Wait survives hidden. |
| Listeners only while running | Before `start`, after `cancel` and after firing, the doc registry has 0 listeners. During a wait, exactly 2. | A leaked `focusin` listener. |
| Fire order | Inside `onAdvance`, `running()` is false and the registry is empty. | Advance runs with the listener still attached. |
| No DOM at import | The import works in Node with no `document`. | `ReferenceError`. |

`tests/unit/sanat-logic.test.mjs`, with a seeded mulberry32 `rng`:

| Crit. | Asserts | Failure |
|---|---|---|
| SEI-3 / 1, 2 | `WORDS.length === 24`, first `KISSA`, last `TULI`; `HP_WORDS.length === 20`, first `JÄSTI`, last `TAIKAJUOMA`. Every entry has a non-empty `emoji` and `hint`. Every letter is in `ALPHABET`. No duplicates. Over 500 seeds, `newDeck('normal')` gives 10 distinct entries, all from `WORDS`; the same for `hp` and `HP_WORDS`. | An HP word in a Normaali deck. |
| SEI-3 / 7 | `syllabify`: KISSA → KIS·SA, AUTO → AU·TO, TAIKASAUVA → TAI·KA·SAU·VA, LOHIKÄÄRME → LO·HI·KÄÄR·ME, PUU → PUU, KAMMIO → KAM·MI·O (design §5). | `['KI','SSA']`. |
| SEI-3 / 8, SEI-45 | `wordSpeech('KISSA', false)` deep-equals `[{text:'kissa',rate:0.78},{text:'kissa',rate:0.52,pauseMs:700}]`. With tavutus: `[{kissa,0.78},{kis,0.62,pauseMs:700},{sa,0.62,pauseMs:400}]`. `wordSpeech('PUU', true)` gives `[{puu,0.78},{puu,0.62,pauseMs:700}]`. Part 0 never has `pauseMs`. This replaces `registry.test.mjs:16-41`. | No pause on the second part. |
| E13 | `shuffleTiles('PUU', rng)` over 2000 seeds never spells `PUU`. The same for every word in both lists. Tile ids are a permutation of `0..n-1`. | Identity order seen. |
| SEI-7 / 1 | KISSA on Vaikea: place K,I,S,T,A → `check` is `'wrong'`, `wrong === 1`, slots still `K I S T A`. `removeAt(3)` → slots `K I S _ A`. `place('S')` fills index 3. `check` is `'right'` and `result === 'retry'`. | Slots empty after the wrong check. |
| SEI-7 / 2 | Helppo KISSA: place three letters, then `removeLast` → the third slot is empty and its tile is `used: false`. Repeated `removeLast` undoes picks in reverse order. After a `removeAt` in the middle, `removeLast` removes the latest pick, not the rightmost. | The wrong tile freed. |
| SEI-7 / 3 | `skip` gives `result: 'skipped'`, slots spelling the word, all tiles back. | Counted as right. |
| SEI-8 / 1–3 | `endTexts(9,1,0)`: title `Hienoa!`, rows `9 sanaa heti oikein` and `1 sana oikein uudella yrityksellä` (no skipped row). `endTexts(7,0,3)` has the row `3 sanaa ohitettu`. `endTexts(10,0,0)`: tier `perfect`, title `Täydellinen tulos!`, speech `Täydellinen tulos! Kaikki 10 sanaa heti oikein. Olet tosi hyvä lukija!`. `endTexts(0,0,10).speech === 'Kierros valmis. Ohitettu 10. Harjoittelemalla oppii!'`. For a = 0..9, no output matches `/hyvä lukija/`. | 10/10 text at 9/10. |
| Stars | `starsFor(0,0) = 0`; `starsFor(a,10)` for a = 0..10 equals `[0,1,1,2,2,3,3,4,4,5,5]`. | 5 stars before any word. |
| B6 | `backToWord` for all five rows of the table in §8 B6. `chooseHint` for the three hint cases. | Restart when only tavutus changed. |

### 9.2 Tap rule (`gesture.spec.mjs`)

| Crit. | Test | Asserts | Failure |
|---|---|---|---|
| SEI-46, D2 | Matikka auto | Answer problem 1 right and wait 4.5 s. The new `speak` has `inDispatch: false` and its text is problem 2. Every earlier call has `inDispatch: true`. | The auto reading recorded as in-dispatch, which would mean the test can no longer see the difference. |
| SEI-1 / 6, Sanat | Card tap | First open makes **zero** speak calls (choose screen silent, design §3.8). | Speech on card tap. |
| SEI-1 / 6, Sanat | Every spoken event | For `Aloita`, a letter, the last letter right (`__audio` play with `inDispatch: true`), a wrong last letter, `Ohita`, `Seuraava`, `Takaisin sanaan` after a level change, the image tap, `Katso tulos`, `Pelaa uudelleen`, `Aloita uusi kierros`, and Kuuntele on all three screens: the **first** speak of each event has `inDispatch: true`. Every `inDispatch: false` call starts ≥ 250 ms after the previous call's `endedAt`, so it is a `pauseMs` part. | A word read from `setTimeout`. |
| SEI-1 / 6, Sanat | 0 done, Etusivu, card | The card tap reads the current word with `inDispatch: true`. | No speech, or a timer. |

### 9.3 Auto-advance, `tests/e2e/auto-advance.spec.mjs` (one body, both games)

`const GAMES = [matikkaDriver, sanatDriver]`. Each driver provides `open`, `start`,
`right`, `wrong`, `itemLabel` (`Lasku n / 10` or `Sana n / 10`), `nextBtn` and `listen`.
Phase A runs the Matikka driver only; C1 adds Sanat. All 4 projects unless the row says
"desktop". Each advance waits in real time (D5).

| Crit. (46 / 47) | Test | Asserts | Failure |
|---|---|---|---|
| 46/1, 47/1 | Starts and advances | After a right answer on item 1: Seuraava has `aa-counting`, its bounding box equals the box of a plain Seuraava (wrong-answer state) within 0.5 px, and `.aa-fill` has `animationDuration` `4s`. `itemLabel` changes to item 2 with no tap. **Desktop:** time from the answer click (capture listener timestamp) to the label change is ≥ 3990 ms and ≤ 4800 ms. | Advances at 0 s, or never. |
| 46/2, 47/4 | Sound not cut | Matikka: the answer speak's `endedAt` < the next problem speak's `at`. Sanat (`recordAudio`): play at t0 with `inDispatch: true`; pause at t0 + [2990, 3400] ms; the next word's first speak ≥ t0 + 3990 ms. **The fake ends speech in 45 ms, so for speech this only proves the order. The real proof is §10.** | Pause after the next word. |
| 46/3, 47/5 | New item | Read once (1 speak group, `inDispatch: false`), focus on the item (problem element or image or question text), Seuraava hidden (`visibility: hidden` / not visible), no `aa-counting`. | Seuraava visible on an unanswered item. |
| 46/4, 47/2, 47/3 | No wait | Matikka wrong: no `aa-counting`, the item is unchanged after 4.5 s. Sanat wrong check: no Seuraava at all. Then correct it: a wait starts (47/2). Sanat `Ohita`: no `aa-counting`, still the same word after 4.5 s, `Seuraava` visible. | Wait after a skip. |
| 46/5, 47/6 | Seuraava skips the wait | Tap Seuraava at about 1 s: item 2 at once. After a further 4.5 s, still item 2. Then the race: in one `page.evaluate`, wait for the label to reach item 2 (driven by the timer), then call `nextBtn.click()` synchronously → still item 2, unanswered. | Item 3 (double advance). |
| 46/6, 47/7 | Leaving cancels | For each of: Etusivu, `Vaihda`, Kuuntele, (Sanat) image tap, `Selvä` (nostart mode: the notice is open from `Aloita`), Tab (desktop), `visibilitychange` to hidden (test overrides `document.visibilityState` and dispatches the event): `aa-counting` removed at once, and after 4.5 s the item is unchanged and no new speak exists. For Etusivu, the front page shows no game content. | An item appears on the front page. |
| sei-46 §3.3 "Ei lopeta" | Does not cancel | `page.mouse.click` on a locked option, a used tile, and an empty area of the card; the wait continues and advances. | A blank-area click cancels. |
| 46/6, 47/8 | Return | After Etusivu during a wait, open the card again: same item, Seuraava visible and full (no `aa-counting`), zero new speak calls, and still the same item after 4.5 s. The same through `Vaihda` → `Takaisin laskuun` / `Takaisin sanaan`. | It advances by itself after the return. |
| 46/7, 47/9 | Item 10 | Right on item 10: `Katso tulos`, no `aa-counting`, end screen hidden after 4.5 s. | End screen by itself. |
| 46/8, 47/11 | Reduced motion | `emulateMedia({ reducedMotion: 'reduce' })`: `.aa-fill` `animationTimingFunction` is `steps(4, start)` or `steps(4, jump-start)`; `.aa-ticks` visible with 3 children; at about 200 ms `clip-path` is `inset(0px 75% 0px 0px)`; the advance comes at ≥ 3990 ms (desktop). Without reduced motion, ticks hidden. | Steps missing, or an earlier advance. |
| 46/9, 47/12 | Screen reader | The live region after the right answer ends with `Seuraava lasku tulee itsestään.` / `Seuraava sana tulee itsestään.` (items 1–9), and on item 10 it does not contain `itsestään`. After the advance, it equals the usual new-item text. Seuraava's accessible name is unchanged during the wait. | The sentence on item 10. |
| D2 | iPad refusal simulated | `untrusted: 'error'` and, separately, `'silent'`: after the auto advance plus 2.5 s, Kuuntele `data-state="ready"`, the notice hidden, the item shown. Then tap Kuuntele → a speak with `inDispatch: true`. | `Ei ääntä` after an auto reading. |
| 46/10, 47/13 | Full round (desktop only) | All 10 right with no tap after the answers: items 2–10 arrive by themselves, `Katso tulos` waits. The test logs each gap in ms. Sanat runs with Normaali, Helppo, tavutus off. | A missing advance. |
| 47/10 | Score independent of transition (Sanat; desktop) | Same seed, same pattern (first, retry, skip, first × 7): once moving on by timer, once by Seuraava. End-screen text, the badge after each word (Etusivu check at words 3 and 6) and `reportProgress` counts are identical. | A different `Pisteet` line. |
| 47/14 | Parity | This whole file is the evidence: one body per row for both games. Plus: both games' Seuraava have `aa-btn`, and both waits measure the same constant (`AUTO_ADVANCE_MS` imported in the test from `auto-advance.js`). | A row that needs a game-specific branch other than the driver. |

### 9.4 Sanat criteria, `tests/e2e/sanat.spec.mjs`

`installFakeSpeech`, `recordAudio`, `seedRandom` and `settle()` after each screen change.
All four projects unless noted.

| Crit. | Asserts | Failure |
|---|---|---|
| SEI-3 / 1 | Normaali round: every word (from speech) is in `WORDS`; on Helppo the image shows that entry's emoji and the hint its hint. | Word without its emoji. |
| SEI-3 / 2 | Choose Harry Potter → `Aloita`: 10 words, all in `HP_WORDS`. Mid-round, changing the list hides `Takaisin sanaan` and shows `Toiset sanat alkavat uudella kierroksella.`. `Aloita uusi kierros` → `Sana 1 / 10`, `Pisteet: 0 / 0`. | Normaali word in an HP round. |
| SEI-3 / 3 | Helppo: image button named `Kuva. Kuuntele sana.`, the hint visible, tiles = the word's letters as a multiset, not in word order. Image tap → the word read. | Tiles in order. |
| SEI-3 / 4 | Keskitaso: the `?` circle is not a button, the instruction text shown. After a right word, the image appears as a button and the hint replaces the instruction. | Image visible before the answer. |
| SEI-3 / 5 | Vaikea: no tiles; 30 keys `A`…`Z`, `Å`, `Ä`, `Ö`, `Poista`, in that order. The same letter twice is allowed. | 26 keys. |
| SEI-3 / 6 | Level change on an open word with 2 letters placed → `Takaisin sanaan`: same word (same speech text), slots empty, new level's input shown, `Pisteet` unchanged, word read in that tap. Level change on a finished word: same finished state, no speak; the next word uses the new level. List change: §SEI-3/2 row. | Points reset. |
| SEI-3 / 7 | Tavutus on with an open word containing letters: the letters kept (E2) and hyphens between syllables (`aria-hidden`). For a word with a known split, the hyphen positions match `syllabify`. Kuuntele speaks the word, then syllables at 0.62. | Letters cleared. |
| SEI-3 / 8 | New word: two speaks, same text, 0.78 then 0.52, the second ≥ 650 ms after the first ended. Each letter tap → `{letter, 0.9}`. | One reading. |
| SEI-3 / 9 | Right: every slot `data-state="right"`, the praise is one of `PRAISE`, audio play recorded in dispatch, pause 3000 ± 400 ms later. | No pause recorded. |
| SEI-3 / 10, SEI-7 / 1 | Wrong (Vaikea `…T…` variant): `Ei ihan.` and `Napauta kirjainta, jonka haluat vaihtaa.` visible; all letters still in the slots; the speak sequence is letter, `Ei ihan.`, word slow. Tap the wrong slot → only that slot empties; place the right letter → right, `result` counted as retry. `Aloita alusta` empties all slots and removes the message. | Other letters lost. |
| SEI-7 / 2 | On each level: three letters, `Poista` → the third slot empty; Helppo/Keskitaso: that exact tile enabled again (same position in the row). | Wrong tile restored. |
| SEI-7 / 3 | `Ohita`: grey word in the slots, `Ohitettu.` / `Sana on KISSA.`-form text, speak `Sana on <word>.` at 0.8, no audio play, bar and badge +1, the same word still shown until `Seuraava` (Q27). | Next word at once. |
| SEI-8 / 1 | 9 first + 1 after two wrongs: the end shows `9 / 10`, `9 sanaa heti oikein`, `1 sana oikein uudella yrityksellä`, `Hienoa!`. | `10 / 10`. |
| SEI-8 / 2 | 7 first + 3 skipped: `3 sanaa ohitettu`. | No skipped row. |
| SEI-8 / 3 | All first: `10 / 10`, `Täydellinen tulos!`, `data-tier="perfect"`, 100 confetti pieces (0 with reduced motion), a different heading and background from SEI-8 / 1. | Same tier. |
| SEI-3 / 11 | `Pisteet: a / done` and bar blocks = done after each word; stars `Tähdet: n / 5`; `Katso tulos` on word 10; `Pelaa uudelleen` → word 1 read. | Bar filled on Seuraava instead of on finish. |
| Resume (design §2) | 0 done with letters placed → Etusivu → card: no badge, letters kept, word read in the tap. 3 done → badge `Kesken 3/10`, return shows the same state, zero speaks. After word 10 → `Kesken 10/10`. After `Katso tulos` → no badge; the same end screen, no confetti, no speak. Etusivu during the victory clip → pause recorded at once. | Clip still playing on the front page. |
| Guard | In one `evaluate`, `Aloita` then a tile click → the tile ignored. After `settle()` it works. | A letter placed. |
| Hint and buttons | Mid-round choose: hint priority (list > level > empty), `Takaisin sanaan` hidden for a changed list. | Wrong hint. |
| Accessibility | Names from design §7 (`Poista viimeisin kirjain`, `Aloita sana alusta`, `Ohita sana`, `Seuraava sana`, `Vaihda sanoja, tasoa ja tavutusta. Nyt …`); radiogroups `Sanat` and `Taso`; focus after right/skip on Seuraava, after wrong on the first filled slot. | `getByRole` not found. |

### 9.5 SEI-1 frame criteria against real Sanat (`sanat-frame.spec.mjs`)

| Crit. | Asserts | Failure |
|---|---|---|
| SEI-1 / 3 | `noSidewaysOverflow` on: the choose screen (both forms); Helppo, Keskitaso and Vaikea words with the longest word in the seeded deck and tavutus on; wrong state; skipped state; end screen. On the three device projects, every visible button's `bottom ≤ innerHeight` on each screen, with the notice closed. | Alphabet bottom 556 > 548 + offset on `desktop`. |
| SEI-1 / 4 | A whole Helppo and a whole Vaikea round by `tap()` only (touch projects). `checkSizes` on each screen: every button ≥ 44 × 44 with `touch-action: manipulation`. | Slot 40 px wide on `narrow`. |
| SEI-1 / 5 | Modes `nostart`, `noend`, `absent`: a whole round to the end screen using `Ohita` and `Seuraava` only (the word cannot be read from speech in `absent`). Kuuntele and Etusivu never `disabled`. | Round stuck. |

### 9.6 Mutations for the hand-over

Apply one at a time, run the named spec, and write down failed / total:

| # | Mutation | Must fail |
|---|---|---|
| M1 | Remove the `auto` branch in `onSpeechState` | the D2 rows (nosound A2 tests and auto-advance "iPad refusal") |
| M2 | `delayMs` 4000 → 1000 | auto-advance "starts and advances" timing (desktop) |
| M3 | Remove `auto.cancel()` from Matikka `next()` | "Seuraava skips the wait" (item 3) |
| M4 | Remove the `focusin` listener | `Selvä` and Tab rows |
| M5 | Start the wait also on a wrong answer | 46/4 row |
| M6 | In Sanat `check`, set `'first'` even when `wrong > 0` | SEI-8 / 1 |
| M7 | Clear the slots on a wrong check (old behaviour) | SEI-7 / 1 (unit and e2e) |
| M8 | `backToWord` restarts on a tavutus-only change | unit B6 and e2e SEI-3 / 7 |
| M9 | Call `victory.play()` from `setTimeout(…, 0)` | gesture Sanat "every spoken event" (audio `inDispatch`) |
| M10 | Start the wait after `Ohita` | 47/3 row |

---

## 10. Verification in the real environment

Nothing deploys until the main session pushes `main`, which runs
`.github/workflows/pages.yml`. A green suite has no real speech, no real audio and no
iPad.

**A1. Matikka on the Mac, main session (after the Phase A push).** On
https://hakaotu.github.io/seikkailut/ in real Chrome (Playwright `channel: 'chrome'`,
headed, 1280×720, as in the SEI-2 check):
1. Matikka → Helppo → `Aloita`. Answer problems 1–10 right, tapping nothing in between.
   In the page, timestamp each answer click with a capture `click` listener, and each
   change of `.mk-problem`'s `aria-label` with a `MutationObserver`.
   - Right answer: 9 advances, each gap between 4000 and 4300 ms; `Katso tulos` waits
     after 10.
   - Record: the date, commit, Chrome version, the 9 gaps, and the voice name.
2. On one right answer, record `speechSynthesis` events for the answer (wrap `speak` to
   log `onend` time). Right answer: the answer's `onend` comes before the next problem's
   `speak`. This is SEI-46 / 2 with real speech.
3. Once, answer wrong. Right answer: no fill, and the problem does not change in 10 s.

**A2. Owner, Mac (one look).** "Open Matikka, start, answer the first problem right and
tap nothing. Does the Seuraava button fill up and the next problem come by itself and
get read aloud: yes / no?"

**B1. Sanat on the Mac, main session (after the B+C push).** Same setup:
1. Normaali, Helppo, tavutus off. Play 10 words right with no tap after the last letter.
   Record the 9 gaps (last letter tap → `Sana n / 10` announcement or the new image), and
   the list, level and tavutus (SEI-47 / 13).
2. Wrap `HTMLMediaElement.prototype.play` and `pause` in the page to record times.
   Right answer: pause about 3000 ms after play, and the next word's `speak` after the
   pause (SEI-47 / 4, open question 1).
3. One round with a wrong word corrected, 3 skipped, the rest right: the end screen shows
   the three rows with the right counts.
4. Harry Potter, Vaikea, tavutus on: one word spelled, and the syllables heard in the
   Kuuntele reading as separate speak calls.

Record the date, URL, commit, Chrome version, voice name and the numbers.

**B2. Owner, Mac (one look, one listen).** "Open Sanat, press Aloita, spell the word.
When it is right, do you hear the jingle, and does the next word come by itself after
the button fills: yes / no?"

**C. iPad (pending; no iPad available now).** When an iPad is at hand, the main session
gives one step per message. These add to the SEI-2 plan §7 C list:
1. Matikka: answer right, tap nothing → is the next problem read aloud (timer-started
   speech)? yes / no. If no, does Kuuntele still say `Kuuntele lasku`, with no yellow
   notice? (D2.)
2. Sanat: `Aloita` → is the word heard from that tap? yes / no.
3. Sanat: spell a word right → do the jingle and the letter both sound? (design §5:
   audio may duck speech.)
4. Sanat: after a right word, tap nothing → is the next word read aloud?

Record the iPad model, iOS version and date. Until then, the iPad open question in
`architecture.md` stays, with "timer-started reading" added.

**Closing proposal, by precedent** (SEI-1 and SEI-2 closed on Mac observations, Q15 and
Q24):
- SEI-46 closes on A1 + A2.
- SEI-3, 7, 8 and 47 close on B1 + B2.
- C is recorded when it happens.

---

## 11. Alternatives considered

| Alternative | Rejected because |
|---|---|
| Wait for the answer speech to end before starting the 4 s | Games get no end event from `say` (sei-46 §6). Adding one changes `speech.js` for a case the fixed 4 s already covers (speech ≤ 2 s, clip ≤ 3 s). |
| A per-game copy of the timer and fill | SEI-47 / 14 asks for identical behaviour. Two copies drift, and Espanja would make three. |
| Ending the wait on `Selvä` via a new shell→game hook (`instance.noticeClosed()`) | It widens the contract for one case. A `focusin` rule covers `Selvä`, Tab and every focus-taking control, which is what design §3.3 lists. |
| A4 in the shell by timing: ignore failures of readings not started from a tap | The shell cannot tell a timer-started `say` from a tap-started one without help. `originTap` covers only Kuuntele. Guessing from `event`/`isTrusted` would need a global. An explicit `auto` flag is one boolean and testable. |
| A4 in `speech.js` (never report `failed` for some calls) | `speech.js` knows nothing about buttons or notices. Its `failed` is accurate; the policy belongs to the shell. |
| Not reading the new item when it arrives by timer (Kuuntele only) | SEI-46 / 3 and SEI-47 / 5 require the reading. |
| A test-only delay override (query string or global) | "No test hooks exist in shipped code" (architecture L85). Real waits cost run time, not correctness. |
| `page.clock` for the waits | It freezes `performance.now()` while paused, and the guard reads it. Its behaviour after `install()` without `pauseAt` is not documented on the page fetched 2026-10-26. |
| Fill label as a real text node | Breaks `toHaveText` on `.mk-next` (`matikka.spec.mjs:301`) and duplicates the label for any text reader. |
| The 3 px border as a real `border` during the wait | Changes the box by 6 px on a 64 px button. An inset shadow does not. |
| Sanat buttons as `.accent-btn` / `.ok-btn` (design table) | The strict `.ok-btn` locator for `Selvä` and the frame gap rule (§1); the same reason as sei-2 plan §8. |
| Extracting Matikka's guard, confetti and button CSS into shared modules now | Not asked by any criterion. It changes Matikka code that is done and verified. Listed as debt (§14) for when Espanja makes a third copy. |
| Decide the word for tests through a hook | The speech record already carries the word (rate 0.78 part), with nothing shipped. |
| Victory sound through Web Audio | `HTMLAudioElement` matches the old game and is enough. Web Audio adds an unlock dance on iPad for no criterion. |

---

## 12. Risks

- **R1. Timer-started speech on iPad Safari (unverified).** If refused, D2 keeps the UI
  honest, but on Sanat Keskitaso and Vaikea the child must tap Kuuntele to hear the new
  word (backlog SEI-47 risk). §10 C1 and C4 settle it. A visual prompt is deliberately
  not built (sei-46 §5.2).
- **R2. Existing tests overtaken by the 4 s timer.** A Matikka test that takes > 4 s
  between a right answer and its Seuraava will now fail. Step A3 says how to fix it
  (answer wrong where right is not the point), not by lengthening the delay.
- **R3. Run time.** The auto-advance spec adds roughly 2 games × ~12 rows × ~5 s per
  project, plus the desktop full rounds (2 × ~40 s). This is an estimate, not measured;
  the developer records the real total at C2.
- **R4. Sanat fits 548 px with 8 px to spare (design §3.10).** Fonts differ in
  Playwright's engines. Step B7 has the design's fallback, then stop and report.
- **R5. Victory clip and speech together on iPad (design §5, unverified).** §10 C3.
- **R6. `focusin` semantics on iPad.** iPad Safari does not focus a tapped button, but
  every cancel trigger there either has an explicit handler or moves focus
  programmatically (`Selvä`). A tap on a focusable control without its own cancel would
  not end the wait on iPad but would on desktop. Today every focusable control in the
  word and question screens is in the cancel list, so the effect is nil. Keep it so.
- **R7. Emoji 🫕 and 🪄 on older iPads** (design §5). Not testable here.

---

## 13. Open questions

**For the owner: none.** Business rules are settled by Q25 (Matikka rules), Q26
(Sanat design), Q27 (skip shows the word first), Q28 (Sanat as Matikka) and Q29 (shared
auto-advance design).

**For the main session (not the owner):**
- **O1. Verifying rule vs. continuing.** If Phase A is pushed alone, SEI-46 enters
  `verifying`. The owner's rule says not to start the next task while one is
  `verifying`. Either close SEI-46 with A1 + A2 before starting Phase B, or ask the owner
  whether Sanat work may continue meanwhile. This plan does not assume either.
- **O2.** D6 departs from the design's class names (`.accent-btn` / `.ok-btn`) for
  Sanat, as the SEI-2 plan did. Nothing visible changes. Tell the designer if they track
  class names.
- **O3.** Push B and C together (default), or B first?

---

## 14. Debt found while reading (for `docs/tech-debt.md`; outside my write boundary)

Severity is the architect's opinion about the debt, not a symptom. None of these has
been seen to harm anyone.

1. **Duplicated game scaffolding.** After this plan, the tap guard (`matikka.js:225-229`),
   confetti (`:434-461`), stars rendering and the primary/secondary button CSS
   (`app.css:623-641`) exist twice, as `mk-` and `sn-`. Espanja (sei-4) would make three.
   *Medium:* a fix to one copy (for example, the guard) will be missed in the others.
   *When:* plan SEI-4 with a shared module for these.
2. **The name `fromTap` in `shell.js:66` means "from Kuuntele".** It is set only by
   Kuuntele (`:150-158`), not by any tap. D2 adds `auto` next to it. *Low:* it misleads
   the next reader. *When:* rename to `fromListen` the next time the function is
   touched for another reason.
3. **TD-4 is adjacent to D2 but not fixed.** D2 changes `onSpeechState` (`:66-76`). TD-4
   lives in `showNotice` / `hideNotice` (`:49-62`) and needs a VoiceOver check that
   cannot happen without an iPad. This plan reads TD-4's trigger ("next time the notice
   code is touched") as not met. If the main session reads it otherwise, it is a
   separate small change.
4. **Game timers cannot be tested with `page.clock`** because the guard reads
   `performance.now()` (`helpers.mjs:226-229`). Every time-based game test pays real
   seconds. *Low:* run time only. *When:* if the suite exceeds a time the owner cares
   about, inject the clock into the games through `ctx` (not a test hook: a real
   dependency).
5. **`nosound.spec.mjs:93` comment** describes the placeholder's two-part reading. Fixed
   in this plan (step B2), listed so that TD bookkeeping knows.

---

## 15. Riskiest step

**B6: Sanat's mid-round choose screen, `Takaisin sanaan`, resume and guard.** This is
where these meet:
- three settings with different "apply when" rules (list: only for a new round; level:
  now if the word is open, otherwise from the next word; tavutus: now, keeping the
  letters);
- per-word bookkeeping (slots, tile ids, pick order, a `wrong` count that must survive a
  level restart);
- the shell's `resuming` / `autoRead`, derived from what Sanat last reported;
- the guard that drops taps silently;
- in Phase C, a wait that must already have ended at `Vaihda`.

A mistake here crashes nothing. Instead, the child sees:
- letters vanish;
- a word that was wrong counted as right-first-time;
- a word restarting when only the hyphens should change;
- a word read aloud on return.

That is why:
- the decision is a pure function (`backToWord`) with a five-row unit table;
- B6 is split into five sub-steps, each with its own check;
- mutations M6–M8 target exactly these rules.
