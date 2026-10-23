# Plan: SEI-2 + SEI-5 + SEI-6 — Matikka in the app, honest wrong-answer feedback, real result on the end screen

Architect, 2026-10-23. Input: `docs/backlog.md` SEI-2 (criteria 1–10), SEI-5
(1–2), SEI-6 (1–2); the approved design `docs/design/sei-2.md` +
`docs/design/sei-2.html` (owner Q20, 2026-10-23; level names Helppo /
Keskitaso / Vaikea, Q21 default); `originals/matikkaseikkailu.html` ("old
r. n" below); `docs/architecture.md`; `docs/tech-debt.md` TD-2, TD-3, TD-4;
`docs/plans/sei-1.md` §3.1, §6, O1; the code at commit `8ad4a54`.

The design spec is the source for every string, colour and pixel value. This
plan repeats them only where a test depends on them.

---

## 1. Context and constraints

**What exists now** (all read at `8ad4a54`):

| Fact | Where |
|---|---|
| Matikka is the placeholder: `listen()` says `yksi plus kaksi` at 0.75, never reports progress | `app/src/games/registry.js:53-62`, `app/src/games/placeholder.js:22-29` |
| The contract comment says "A game is an object { create(ctx) }" (TD-2 wording not yet applied) | `registry.js:8` |
| Shell calls `game.module.create(ctx)` once per page session; `ctx.status` is the `.status-slot` element itself; `ctx.root` is `.game-area`; `ctx.question` is `.q-slot` | `app/src/shell.js:172-189`, `:115`, `:127-128` |
| The view element is built hidden; `el.hidden = false` happens in `openGame` after `create` and before `show` | `shell.js:110`, `:271-282` |
| `autoRead = byTap && !resuming`, `resuming = badgeFor(progress) !== null` | `shell.js:270`, `:282` |
| Badge iff `done >= 1 && !finished` | `shell.js:24-30` |
| Speech failure from a non-Kuuntele tap shows the notice only once per language; from Kuuntele always | `shell.js:66-76`, `:150-159`, `:178-181` |
| `.status-slot:empty` is hidden; max width 40 % | `app/styles/app.css:307-316` |
| Below 420 px the question slot takes the full row, so Kuuntele wraps below it | `app.css:348`, `:512` |
| Every `button` gets `touch-action: manipulation` | `app.css:45-53` |
| Pressed/focus styles exist only for `.game-card, .back-btn, .listen, .ok-btn, .accent-btn` | `app.css:55-87` |
| `targets.spec` treats `.ok-btn` and `.accent-btn` as frame buttons (≥ 56 px, ≥ 12 px apart from each other); `nosound.spec` and `targets.spec` locate the notice's `Selvä` as `view.locator('.ok-btn')` (strict: must match one element) | `tests/e2e/targets.spec.mjs:4`, `:48`; `tests/e2e/nosound.spec.mjs:37`, `:40`, `:108` |
| `gesture.spec` expects a card tap on every game, Matikka included, to produce a `speak` call | `tests/e2e/gesture.spec.mjs:12-22` |
| The gesture fake counts only click listeners attached with `addEventListener` and only trusted events | `tests/e2e/helpers.mjs:25-50` |
| Unit test imports the registry in Node with no `document` | `tests/unit/registry.test.mjs:4-12` |
| Playwright's clock fakes `performance`, `Date`, timers and `Event.timeStamp` | playwright.dev/docs/clock, fetched 2026-10-23 |
| Old distractor fill `while (choices.size < 4) choices.add(answer + choices.size)` never ends when `answer + size` is already in the set (e.g. set `{5, 7}` after 50 tries: adds 7 forever) | old r. 419 |
| Old wrong-answer texts promise a retry that does not exist | old r. 300 vs r. 512, 583 (buttons disabled) |
| Old end screen says `Mahtavaa!` / `Olet matikkamestari!` for any score, read aloud after a 600 ms timer | old r. 290-292, 682 |

**Baseline to compare against:** `npm run test:unit` 43/43 and
`npx playwright test` 194 passed / 2 skipped / 0 failed, main session's run at
`96d8cc0` (backlog history, 2026-10-23). The developer re-runs at the start
(step 0) and writes the numbers down; nothing since `96d8cc0` touched code.

**What must not break:**
- The tap rule (architecture "Navigation and the tap rule"): every `say` caused
  by a tap or key press is called synchronously inside that handler. No timer,
  `await`, or dynamic `import()` before it. All Matikka click listeners are
  attached with `addEventListener` (otherwise `gesture.spec` is blind to them).
- `gesture.spec`, `nosound.spec`, `targets.spec`, `layout.spec` keep passing.
  One `gesture.spec` test changes on purpose (§6, step 3), because the design
  removes Matikka's read-aloud on a first open.
- Sanat and Espanja stay on the placeholder, unchanged.
- No `localStorage`, no assets, no change to `shell.js`, `speech.js`,
  `router.js`, `listen-button.js`, `app.js`, `index.html`.

**TD-3 and TD-4:** this plan does not touch `goBack`, `openFromCard` or the
notice code in `shell.js`, so neither is fixed here (the tech-debt rule is "fix
if touched"). Matikka's own screen-reader region is a separate element inside
`ctx.root` and does not use `#live`, so TD-4 does not get worse.

**TD-2** is settled in step 3: the `registry.js` comment gets the combined
wording. I cannot edit `docs/tech-debt.md` (my write boundary is
`docs/plans/`); the main session marks TD-2 closed when step 3 lands.

---

## 2. Files to create or modify

| Path | Change |
|---|---|
| `app/src/games/matikka-logic.js` | **New.** Pure, no DOM, no `document` at import. Every random choice takes an `rng` argument (default: `() => Math.random()`, read at call time). Exports: `MAX_QUESTIONS = 10`; `LEVELS` (`easy`/`medium`/`hard` → `{ name: 'Helppo'|'Keskitaso'|'Vaikea', typed: false|true|true }`); `OPS` (`add`/`sub`/`mul` → symbol `+`/`−`/`×`, word `plus`/`miinus`/`kertaa`); `PRAISE` (old r. 299, unchanged); `generateProblem(level, ops, rng)` (old r. 361–406 verbatim in ranges); `makeChoices(answer, level, rng)` (§4.2); `newRound(settings, rng)`; `pickLevel(draft, level)` (Vaikea turns `mul` on, old r. 430–433); `toggleOp(ops, op)` → `{ ops, refused }`; `typeDigit(value, d)`, `deleteDigit(value)` (§3.4 rules); `starsFor(score, answered)` (`answered === 0 ? 0 : Math.round(score * 5 / answered)`; old r. 647–648's formula with the multiplication first, so a half such as 7/10 × 5 = 3.5 is computed from integers and rounds up as the design table expects); `endTier(score)` → `'perfect'|'good'|'done'` (10 / 7–9 / 0–6); `endTexts(score)` → `{ title, line, speech }` from design §3.6; `problemSpeech(p)`, `problemLabel(p, n)`, `wrongTexts(answer)`, `settingsLine(settings)`. |
| `app/src/games/matikka.js` | **New.** `export default { create(ctx) }`. DOM for the three screens, state (§4.1), handlers, keyboard listener, confetti, tap guard. Uses `document.createElement` only inside `create` (the registry unit test imports it without a DOM). |
| `app/src/games/registry.js` | **Modify.** `import matikka from './matikka.js';` and `module: matikka` for the `matikka` entry (other two unchanged). Replace line 8 with the TD-2 wording: *"A game is an object `{ create(ctx) }`. Each real game lives in `app/src/games/<id>.js` and default-exports that object; this file imports it statically and puts it in the entry's `module` field. The placeholder keeps its factory form until it is removed."* |
| `app/styles/app.css` | **Modify.** Matikka block scoped under `.game-view[data-game='matikka']`, classes prefixed `mk-`. Add `.mk-primary` and `.mk-secondary` (and the option/key classes) to the existing pressed and focus-visible selector lists (`app.css:55-87`) instead of reusing `.accent-btn` / `.ok-btn` (see §8). Placeholder CSS stays (Sanat, Espanja use it). |
| `tests/unit/matikka-logic.test.mjs` | **New.** §6.1. |
| `tests/e2e/helpers.mjs` | **Modify.** Move `checkSizes` (from `targets.spec.mjs:6-32`) and `noSidewaysOverflow` (from `layout.spec.mjs:8-19`) here and export them, unchanged. Add `seedRandom(page, seed)`: an init script replacing `Math.random` with mulberry32(seed). Add `settle(page)`: `page.waitForTimeout(550)` (the in-game tap guard, §4.4). |
| `tests/e2e/matikka-helpers.mjs` | **New.** `problem(page)`: reads the accessible name of `.mk-problem` (`Lasku 5 / 10: 7 plus 5`) and returns `{ n, a, op, b, answer }`. `startRound(page, testInfo, { level, ops })`, `answerRight(page, testInfo)`, `answerWrong(page, testInfo)` (Helppo: tap an option ≠ answer; typed: tap the digits of `answer + 1`, then OK), `next(page, testInfo)`. All taps go through `press` (tap on touch projects). |
| `tests/e2e/targets.spec.mjs`, `tests/e2e/layout.spec.mjs` | **Modify.** Import the moved helpers. No assertion changes. |
| `tests/e2e/gesture.spec.mjs` | **Modify.** §6, row "SEI-1 / 6". |
| `tests/e2e/matikka.spec.mjs` | **New.** Criteria tests, §6.2. |
| `tests/e2e/matikka-frame.spec.mjs` | **New.** SEI-1 criteria 3–5 re-run against the real game (O1), §6.3. |

No file is deleted. `placeholder.js` stays for Sanat and Espanja.

---

## 3. Data model, API and contract changes

**Game contract:** unchanged in shape. `registry.js`'s `module` for
`matikka` becomes the default export of `matikka.js`; its shape is still
`{ create }`, which is what `shell.js:173` and `registry.test.mjs:11` read.
The fake registry (`tests/e2e/fixtures/registry.js`) does not import either and
is unaffected. Only the comment wording changes (TD-2).

**`reportProgress` use by Matikka** (design §5):
- `Aloita`, `Aloita uusi kierros`, `Pelaa uudelleen` → `{ done: 0, total: 10, finished: false }`.
- Each answer → `{ done: answered, total: 10, finished: false }` (on the answer, not on Seuraava).
- `Katso tulos` → `{ done: 10, total: 10, finished: true }`.
- Nothing is reported before the first `Aloita` (no badge, as now).

**"Kesken 10/10"** (designer's note, design §6): after the 10th answer and
before `Katso tulos`, the badge reads `Kesken 10/10`. This is the contract
working as written (`finished` = end screen shown) and is what the design
chose: on return the child sees the 10th feedback and `Katso tulos`. Kept;
tested in §6.2 so it is a decision, not an accident. Alternative in §8.

**Persistence:** none. All state is in memory in the instance; reload gives the
choose screen with defaults (design §2, §5).

---

## 4. Design of the game module

### 4.1 State (in `create`, never global)

```
settings = { level: 'easy', ops: { add: true, sub: true, mul: false } }  // committed
draft    = copy of settings                    // the choose screen's working copy
hint     = false                               // "Ainakin yksi laskutapa..." visible
screen   = 'choose' | 'question' | 'end'
round    = null | {
  problems: [{ a, b, op, answer,
               choices: [4 numbers] | null,    // made once, in newRound (Helppo only)
               given: null | number,           // the child's answer
               correct: null | boolean,
               praise: null | string }],       // chosen once, shown again on return
  index, score, answered, streak,
  typed: '',                                   // unfinished typed answer
  endShown: false }
roundOpen = round !== null && !round.endShown
```

Options and the child's answer are stored per problem (designer's note), so
anything rebuilt from state shows the same thing. In practice the DOM is not
rebuilt on return at all (below), but the end-screen line and the live region
read from this state.

### 4.2 Distractors (`makeChoices`), the loop fix

Keep the old random phase (old r. 409–417: up to 50 tries of
`answer + rand(-range, range)`, negatives replaced by `rand(0, range)`, ranges
5 / 8 / 15). Replace the fill (old r. 419) with a deterministic walk that
cannot repeat a candidate: for `k = 1, 2, 3, …` try `answer + k`, then
`answer - k` if `>= 0`, adding each if absent, until there are 4. It ends by
`k = 3` at the latest, because every candidate is new. Then shuffle with
Fisher–Yates using `rng` (the old `sort(() => Math.random() - .5)` is biased
and cannot take an `rng`).

### 4.3 DOM and rendering

- Three screen containers inside `ctx.root` and three matching question-row
  children inside `ctx.question`; switching screens toggles `hidden`. The shell
  keeps the view in the DOM between visits (`shell.js:37`), so returning from
  the front page shows exactly what was left, with no rebuild. `Takaisin
  laskuun` only toggles back to the question container, so the typed value and
  feedback are untouched.
- The question container's content is rebuilt from `round.problems[index]` when
  a new problem starts (`Aloita`, `Seuraava`, `Pelaa uudelleen`, `Aloita uusi
  kierros`).
- Stars live in `ctx.status` (`role="img"`, name `Tähdet: n / 5`).
- The "appear" animation is added with a class when a new problem is built and
  removed on `animationend`, so un-hiding the container does not replay it.
- Seuraava keeps its place with `visibility: hidden` until an answer. Such a
  button receives no taps and is skipped by Tab, and `buttonRects`
  (`helpers.mjs:146-160`) ignores it.
- Locked options and keys after an answer use real `disabled` (design §3.3:
  answer lock, not waiting for speech, so rule 4 is not involved).
- Screen-reader messages go to one visually hidden `role="status"` element in
  `ctx.root`, set once per event (design §7 table). It is never cleared and
  refilled in the same tick (the TD-4 pattern).
- **Fitting the problem row** (design §3.2): after the problem or typed value
  changes, and in `show()` (the view is hidden during `create`, so it measures
  0), step the font size down by 4 px from 56 while
  `el.scrollWidth > el.clientWidth`, down to 36 px (28 px below 420 px). This
  is synchronous layout reading in the handler. It is not an await, so the tap
  rule holds.
- Confetti: an `aria-hidden`, `pointer-events: none`, `overflow: hidden`
  absolutely positioned layer over `ctx.root`. `overflow: hidden` keeps falling
  pieces from widening the page, which `layout.spec` would catch. One
  `setTimeout` removes it after 3.5 s (perfect) or 3 s (good). `hide()` clears
  the timer and removes the layer. With `prefers-reduced-motion: reduce` it is
  never created.

### 4.4 Handlers, speech, and the tap guard

Every handler that speaks does its state change and DOM update, then calls
`ctx.speech.say(...)` **last and synchronously**. All parts have no `pauseMs`.

| Tap / key | Speech (rate) |
|---|---|
| `Aloita`, `Aloita uusi kierros`, `Pelaa uudelleen`, `Seuraava` | `problemSpeech` e.g. `7 plus 5` (0.75) |
| Right answer | `String(answer)` (0.9) |
| Wrong answer | `Ei ihan. Oikea vastaus on 12.` (0.85) |
| `Katso tulos` | `endTexts(score).speech` (0.85) |
| Kuuntele on choose / question / end | instructions / the problem / the end sentence |
| `Takaisin laskuun`, `Vaihda`, `Vaihda laskuja`, level and op buttons | nothing |
| `show({ autoRead: true })` | the problem, only if `screen === 'question'` and the current problem has `given === null`, else nothing |

`pitch` is not set (designer's note; `speech.js` has no pitch).

**Tap guard (design §3.8):** `screenChangedAt = performance.now()` is set on
the four in-game screen changes: choose→question, question→end, end→question
and question/end→choose. It is not set on `Seuraava` (same screen) or on
`show()`. Every Matikka button handler is wrapped by `guarded(fn)`, which
returns without doing anything if `performance.now() - screenChangedAt < 500`.
There is no `disabled`, no class and no timer, so nothing visible changes and
nothing re-enables later. Kuuntele and Etusivu belong to the shell and are not
wrapped. The guard runs before `say` in the same handler, so it adds no delay
to speech.

**Keyboard** (design §3.4). There is one `keydown` listener on `document`,
added in `show()` and removed in `hide()`. It is active only when
`screen === 'question'` and the level is typed (old r. 694: Helppo ignores
keys). It ignores events with Ctrl, Cmd or Alt held.
- `0`–`9`: if the current problem is unanswered, `typeDigit`.
- `Backspace`: if unanswered, `deleteDigit` and `preventDefault()`.
- `Enter`:
  - **If `event.target` is a button that is not a keypad key, do nothing.**
    The button handles its own Enter (the designer's note). Otherwise
    `Seuraava` would run twice and a problem would be skipped.
  - If the target is a keypad key (digit, `Poista` or `OK`), `preventDefault()`
    and treat Enter as OK or Seuraava. Reason: desktop Chrome focuses a button
    when it is clicked with the mouse. A child who clicks `7` and then presses
    Enter would otherwise get `77` instead of submitting. This applies a rule
    the design does not spell out for this case, so it is flagged in §10.
  - Anywhere else (the problem has focus after `Aloita`/`Seuraava`, design §7),
    Enter is OK when unanswered and Seuraava / Katso tulos when answered.

### 4.5 Focus (design §7)

`Aloita` / `Takaisin laskuun` / `Seuraava` → the problem element
(`tabindex="-1"`). An answer moves focus to Seuraava / Katso tulos. `Vaihda` →
the `Mitä lasketaan?` heading. `Katso tulos` → the end heading. `show()` never
moves focus, because the shell focuses the game title (`shell.js:279`). Use
`focus({ preventScroll: true })` everywhere, as the shell does.

---

## 5. Architecture doc impact

Statements in `docs/architecture.md` this change makes false, quoted:

1. Line 3: "As-is description after SEI-1 and SEI-45 (voice ranking, pause
   between parts)." It is now also after SEI-2, SEI-5 and SEI-6.
2. Line 7: "Only the shell exists; all three games are the same placeholder."
3. Line 30 (placeholder row): "Registry entries use it with per-game sample
   speech (matikka `yksi plus kaksi`, sanat …, espanja `hola`)." Matikka no
   longer uses it.
4. Line 46–48 (Game contract): "A game module is `{ create(ctx) }`." This is
   incomplete after TD-2. It needs the per-file default-export wording.
5. Line 68: "Unit (`tests/unit/`): `router`, `speech`, `registry`, `badge`."
   `matikka-logic` is missing.
6. Line 69: the e2e spec list is missing `matikka` and `matikka-frame`.
7. Line 70: the description of `helpers.mjs` lacks `checkSizes`,
   `noSidewaysOverflow`, `seedRandom` and `settle`. "No test hooks exist in
   shipped code" stays true and must stay true.

Additions, not corrections: module-map rows for `matikka.js` and
`matikka-logic.js`; a short Matikka section (screens, state kept in memory, tap
guard, keyboard rule, progress reporting including `Kesken 10/10`).

Not made false: the tap rule (line 36), including "Exception, only inside
`speech.js`". Matikka's only timers are the confetti removal, which is not
speech. Line 48 "Nothing in the repo reads or writes `localStorage` yet" stays
true. Line 81, the iPad open question, changes only if §7 B is done. Scribe
should not touch it before then.

---

## 6. Ordered steps

Each step ends green on `npm test` unless it says otherwise. Commit per step.

**Step 0. Baseline.** `npm run test:unit` and `npx playwright test`. Write
down the counts (expected 43/43 and 194/2/0, as at `96d8cc0`).

**Step 1. `matikka-logic.js` + unit tests (§6.1).** Check: `npm run
test:unit` passes. Temporarily restore the old fill line and confirm that the
termination test fails on its 1000 ms timeout instead of hanging the run.

**Step 2. Move `checkSizes` / `noSidewaysOverflow` to `helpers.mjs`; add
`seedRandom`, `settle`.** No behaviour change. Check: Playwright counts are
identical to step 0.

**Step 3. Matikka skeleton, choose screen, registry swap, TD-2 comment,
gesture.spec update.** `create/show/hide/listen`, the choose screen with
levels, toggles, hint and `Aloita` (it starts a round and reads problem 1;
the question screen can be minimal here: the problem row, the four options and
nothing else). Change `gesture.spec` in the same commit, because the swap
breaks the old Matikka card test (§6, row SEI-1 / 6). Check: full suite green.
The new choose-screen tests in `matikka.spec` (SEI-2 / 3, 4) pass.

**Step 4. Question screen, Helppo.** Info row (score, 10-block bar), streak
row, options and their states, feedback (praise / `Ei ihan.` + `Oikea vastaus
on N.`), Seuraava, settings line, `Vaihda` (it may go to the choose screen
without the mid-round buttons until step 7), stars, live region, speech.
Check: SEI-2 / 1, 6, 7 (Helppo), 8, 9 and SEI-5 / 1 pass.

**Step 5. Typed levels.** Keypad, answer box in the problem row, wrong-answer
box beside it, keyboard listener with the Enter rule from §4.4. Check: SEI-2 /
2, 3, 5, 7 (typed) and SEI-5 / 2 pass. Also the keyboard test on `desktop`
(§6.2): a mouse click on `7` followed by Enter submits rather than typing `77`,
and Enter on a focused Seuraava advances exactly one problem.

**Step 6. End screen.** `Katso tulos` on the 10th answer, three tiers, stars,
confetti, `Pelaa uudelleen`, `Vaihda laskuja`, `reportProgress finished`.
Check: SEI-2 / 10, SEI-6 / 1, 2 pass.

**Step 7. Mid-round choose screen, resume, tap guard (riskiest, see §11).**
- `Vaihda` copies `settings` into `draft` and shows the choose screen with
  `Takaisin laskuun` + `Aloita uusi kierros` when `roundOpen`, otherwise
  `Aloita`.
- `Takaisin laskuun` discards `draft` and `hint` and shows the question
  container untouched.
- `Aloita uusi kierros` commits `draft` and starts a new round.
- `Vaihda laskuja` from the end screen gives the `Aloita` form.
- The tap guard is added to every Matikka button handler.
- `hide()` removes the keyboard listener and the confetti.

Check: the resume and guard tests in §6.2 pass. Re-run the whole suite.
`settle()` must be in every test that taps a game button right after a screen
change, or that test will fail on the guard. That is the guard working, not
flakiness.

**Step 8. Layout.** The two layouts (≥ 900 px two columns, < 900 px one
column), < 600 px and < 420 px variants, problem-row fitting. Check:
`matikka-frame.spec` (§6.3) passes on all four projects, including the
no-vertical-scroll check on the three device projects. **If a screen does not
fit, stop and report** the project, the screen and the measured overshoot in
px. Do not shrink anything below the design's sizes; that goes back to the
designer.

**Step 9. Mutation pass for the reviewer's hand-over** (§6.4), then the full
suite. Write down the counts.

---

## 6. Test plan, by criterion

### 6.1 Unit (`tests/unit/matikka-logic.test.mjs`, `node:test`)

A seeded mulberry32 `rng` in the test file; N = 5000 problems per level per op.

| What | Asserts | A failing test looks like |
|---|---|---|
| Ranges (SEI-2 / 1–3) | easy: add `a+b ≤ 10`, sub `0 ≤ a-b ≤ 10`, mul `1 ≤ a,b ≤ 5`. medium: add/sub operands ≤ 20, `a-b ≥ 0`, mul `a ∈ 1..5, b ∈ 1..10`. hard: add sum ≤ 100, sub `10 ≤ a ≤ 100, b ≤ a`, mul `a,b ∈ 2..10`. Every `answer` equals the operation's result. | `hard sub: a = 101`. |
| Only selected ops (SEI-2 / 4) | With `{ add: false, sub: false, mul: true }` every problem is `mul`. | An `add` appears. |
| Choices (SEI-2 / 1) | `makeChoices` over the same N: 4 values, distinct, all ≥ 0, exactly one equals `answer`. | 3 distinct values, or two equal to the answer. |
| Fill terminates (designer's note) | `makeChoices(5, 'easy', () => 0.65)` (the constant makes every try `5 + 2`, so the old fill loops) returns 4 distinct values; test `{ timeout: 1000 }`. Also `answer = 0` with `() => 0`. | Test times out at 1000 ms. |
| `pickLevel` (SEI-2 / 3) | `hard` sets `mul: true` from off; `easy`/`medium` leave ops unchanged; `hard` with mul already on leaves it on. | `medium` turns mul on. |
| `toggleOp` (SEI-2 / 4) | Turning off the last op gives `refused: true` and unchanged ops; otherwise it flips. | All three off. |
| Typing (SEI-2 / 5) | `typeDigit('123','4') = '1234'`, `typeDigit('1234','5') = '1234'`, `typeDigit('0','7') = '7'`, `typeDigit('','0') = '0'`, `deleteDigit('') = ''`, `deleteDigit('12') = '1'`. | `'07'`. |
| Stars (SEI-2 / 9) | `starsFor(0,0) = 0`, `(0,1) = 0`, `(1,2) = 3`, `(n,10)` for n = 0..10 equals `[0,1,1,2,2,3,3,4,4,5,5]` (design §3.6). | `(0,0) = 5` (old r. 647). |
| Speech words (SEI-2 / 8) | `problemSpeech` gives `7 plus 5`, `9 miinus 3`, `4 kertaa 6`. | `7 + 5`. |
| Wrong text (SEI-5) | `wrongTexts(12)` gives `{ title: 'Ei ihan.', line: 'Oikea vastaus on 12.', speech: 'Ei ihan. Oikea vastaus on 12.' }`; none matches `/yrit\|kokeil\|uudelleen\|uudestaan/i`. | The old `Ei ihan, yritä uudelleen! 💪`. |
| End texts (SEI-6) | `endTier`: 10 → perfect, 7–9 → good, 0–6 → done. `endTexts(2).speech = 'Kierros valmis. Sait 2 oikein. Harjoittelemalla oppii!'`; `endTexts(0).speech = 'Kierros valmis. Harjoittelemalla oppii!'`; `endTexts(8).title = 'Hienoa!'`; `endTexts(10)` = `Täydellinen tulos!` / `Olet matikkamestari!`. For n = 0..9, no title, line or speech matches `/mestari\|mahtavaa/i`. | Score 2 gets `Olet matikkamestari!`. |
| No DOM at import | Existing `registry.test.mjs` (it now imports `matikka.js` through the registry). | `ReferenceError: document is not defined`. |

### 6.2 E2E, `tests/e2e/matikka.spec.mjs` (all four projects unless noted)

Each test uses `installFakeSpeech`, `seedRandom(page, <fixed seed>)` and
`settle()` after every in-game screen change. Answers come from parsing the
problem's accessible name (`matikka-helpers.mjs`), not from any hook.

| Crit. | Test | Asserts | A failure looks like |
|---|---|---|---|
| SEI-2 / 1 | Helppo round | For each of 10 problems: exactly 4 option buttons, exactly one whose number equals the parsed answer, operands within Helppo's ranges. | 3 options, or the parsed `7 + 5` has no `12` option. |
| SEI-2 / 2 | Keskitaso round | Keypad present (`1`…`9`, `Poista`, `0`, `OK`), no options; operands within the ranges; typing the answer and OK scores it right. | Options shown on Keskitaso. |
| SEI-2 / 3 | Vaikea | On the choose screen with Kertolasku off, tapping `Vaikea` makes Kertolasku `aria-pressed="true"`; round operands within Vaikea's ranges; keypad shown. | Kertolasku still `false`. |
| SEI-2 / 4 | Ops | Turn off Vähennyslasku, turn on Kertolasku, `Aloita`: all 10 problems are `plus` or `kertaa`. With only Yhteenlasku on, tapping it keeps `aria-pressed="true"` and shows `Ainakin yksi laskutapa pitää olla valittuna.`; the next tap on a level button clears it. A level/op tap alone does not start a round: Kesken badge absent, still on choose screen (E1). | A `miinus` problem; hint never appears. |
| SEI-2 / 5 | Keypad + keys | Tap `1`,`2`,`3`,`4`,`5` → box shows `1234`. `Poista` → `123`. Clear to empty, `OK` → nothing (no feedback, no `speak` call, box `?`). `0` then `7` → `7`. **Desktop only:** keys `1`,`2`, `Backspace`, `Enter` give the same; Ctrl+`5` changes nothing; mouse-click `7` then Enter submits (feedback appears, box not `77`); after answering, Enter with focus on Seuraava advances exactly one problem (`Lasku 2 / 10`, not 3). | `77`; `Lasku 3 / 10` after one Enter. |
| SEI-2 / 6 | Right answer | Feedback text is one of the 8 praise strings; the problem row shows `= 12` in the answer box; the last `speak` is `{ text: '12', rate: 0.9 }`. | No speak, or `12` missing from the row. |
| SEI-2 / 7 | Wrong answer | Helppo: the right option has `aria-label` `12, oikea vastaus` and the chosen one `13, sinun vastauksesi, väärin`. Typed: the answer box shows the right number and a separate element shows the child's number, both visible at once. | Only the wrong number shown. |
| SEI-2 / 8 | Speech | `Aloita` → first `speak` text equals `${a} ${word} ${b}` of the parsed problem, rate 0.75, `inDispatch: true`; Kuuntele on the question screen → same text again; also after answering. | Text `7 + 5`; no speak on Kuuntele. |
| SEI-2 / 9 | HUD | Before any answer: `Pisteet: 0 / 0`, stars name `Tähdet: 0 / 5`, 0 filled blocks. Answers W, R: `Pisteet: 1 / 2`, `Tähdet: 3 / 5`, bar name `2 laskua 10:stä tehty`. Three rights in a row: `🔥 3 peräkkäin oikein!` visible; it is still visible on the next problem before answering; it disappears after a wrong one. | Stars 5 before answers; streak shown at 2. |
| SEI-2 / 10 | Next and end | Seuraava → `Lasku 2 / 10` and its speak. On problem 10 the button reads `Katso tulos`; tapping it shows the end screen with result, confetti layer children > 0 (score ≥ 7) and `Pelaa uudelleen`; `Pelaa uudelleen` → `Lasku 1 / 10`, `Pisteet: 0 / 0`, speak of problem 1. **Desktop:** Enter (focus on the problem) advances after an answer. | End screen appears by itself; no confetti at 10/10. |
| SEI-5 / 1 | Helppo wrong | Feedback is `Ei ihan.` + `Oikea vastaus on N.`; feedback area text does not match `/yrit\|kokeil\|uudelleen\|uudestaan/i`; all 4 options are `disabled`; last speak `Ei ihan. Oikea vastaus on N.`; Seuraava visible. | Old retry text while options are locked. |
| SEI-5 / 2 | Typed wrong | Same text rule; all 12 keys `disabled`; **desktop:** pressing `9` does not change either number (E13). | Typed number changes after answering. |
| SEI-6 / 1 | 2/10 | Answer 2 right, 8 wrong, `Katso tulos`: heading `Kierros valmis!`, `2 / 10 oikein`, `Harjoittelemalla oppii!`, `Tähdet: 1 / 5`, confetti layer absent; last speak `Kierros valmis. Sait 2 oikein. Harjoittelemalla oppii!`; end screen text and that speak do not match `/mestari\|mahtavaa/i`. | `Olet matikkamestari!` on 2/10. |
| SEI-6 / 2 | 10/10 vs 2/10 | 10/10: heading `Täydellinen tulos!`, `10 / 10 oikein`, result-area `data-tier="perfect"` and computed background `rgb(255, 244, 214)` (2/10: `done`, `rgb(255, 255, 255)`), confetti pieces = 100; with `page.emulateMedia({ reducedMotion: 'reduce' })` 0 pieces but the same heading and background. | Same heading or background for both. |
| Design §3.6 | 8/10 | `Hienoa!`, `Hyvin laskettu!`, confetti 40, background `rgb(227, 247, 234)`. | 100 pieces at 8/10. |
| Resume (design §2, §6) | Etusivu and back | After 4 answers: badge `Kesken 4/10`; reopen shows the same `Lasku`, same `Pisteet`, same feedback; zero new speak calls. Round started with 0 answered: Etusivu, card → a speak of problem 1, `inDispatch: true`. After the 10th answer, Etusivu: badge `Kesken 10/10`; reopen shows the feedback and `Katso tulos`. After `Katso tulos`, Etusivu: no badge; reopen shows the same end screen, no confetti, no new speak. During confetti, Etusivu removes the layer immediately. | Fresh round on reopen; speech on resume; confetti still in DOM after leaving. |
| Mid-round choose (design §3.1) | Vaihda | `Vaihda` after an answer shows `Takaisin laskuun` and `Aloita uusi kierros`; change the level, then `Takaisin laskuun` → same problem, same feedback, same settings line (draft discarded), no speak. Type `12` (unanswered), `Vaihda`, `Takaisin laskuun` → box still `12`. `Vaihda` → `Aloita uusi kierros` → `Lasku 1 / 10`, `Pisteet: 0 / 0`, new settings line. From the end screen, `Vaihda laskuja` shows only `Aloita`. | Typed value lost; draft applied on Takaisin. |
| Tap guard (design §3.8) | Double tap | In one `page.evaluate`, `click()` `Katso tulos` and then `Pelaa uudelleen`: the end screen stays (`Pelaa uudelleen` ignored). After `settle()`, `Pelaa uudelleen` works. The same for `Aloita` followed at once by an option click: the option is not answered. Kuuntele right after a screen change still speaks. | `Lasku 1 / 10` after the double click. |
| Accessibility (design §7) | Names | Levels are `role="radio"` in a `radiogroup` named `Taso` with `aria-checked`; ops have `aria-pressed`; `Poista`, `OK, tarkista vastaus`, `Seuraava lasku`, `Vaihda tasoa ja laskuja` are reachable by role and name; focus is on the problem after `Aloita` and on Seuraava after an answer. | `getByRole('button', { name: 'Poista' })` not found. |

### 6.3 SEI-1 criteria re-run against the real game (O1), `tests/e2e/matikka-frame.spec.mjs` + `gesture.spec.mjs`

| Crit. | Test | Asserts | A failure looks like |
|---|---|---|---|
| SEI-1 / 3 | Every screen, all projects | `noSidewaysOverflow` on: the choose screen; the mid-round choose screen; Helppo answered wrong; Vaikea with `9999` typed, unanswered and answered wrong; the end screen. On the three device projects (not `narrow`), every visible button's `bottom ≤ innerHeight` on each of those screens with the notice closed (design §3.1, §3.9: no scrolling). On `narrow`, the problem element's right edge is ≤ its row's right edge with `9999` typed. | `scrollWidth 344 vs innerWidth 320`; `Seuraava` bottom 731 > 720 on `desktop`. |
| SEI-1 / 4 | Round by tap only (touch projects) and sizes (all) | A whole Helppo round and a whole Keskitaso round driven only with `tap()`, through the end screen and `Pelaa uudelleen`. `checkSizes` on each of the screens above: every visible button ≥ 44 × 44 and has `touch-action: manipulation`. | Option 40 px tall on `narrow`. |
| SEI-1 / 5 | Round with stuck speech | For modes `nostart`, `noend` and `absent`: a whole Helppo round plays to the end screen. After each answer Seuraava is enabled at once, and Kuuntele and Etusivu are never `disabled`. After `Katso tulos`, Etusivu shows no badge. These tests do **not** use `page.clock`, because a paused clock also freezes `performance.now()` and the tap guard would ignore every tap. | Seuraava appears only after `onend`; round stuck. |
| SEI-1 / 6 | `gesture.spec` | The card loop becomes `['sanat', 'espanja']`. New Matikka tests: (a) the first card tap makes **zero** speak calls (design §3.7: the choose screen reads nothing); (b) `Aloita`, a right answer, a wrong answer, `Seuraava`, `Katso tulos`, `Pelaa uudelleen`, `Aloita uusi kierros` and Kuuntele on each screen each produce a speak with `inDispatch: true`; (c) round started with 0 answered, Etusivu, card tap → speak `inDispatch: true` (the card → `show` → `say` path that the old test covered). | `inDispatch: false` because a handler speaks from `setTimeout` (old r. 493, 682). |

Why (a) replaces the old expectation: the old test asserted that the
placeholder's auto-read happens. The approved design removes auto-read on the
choose screen. Test (c) keeps the card-tap-to-speech chain covered on the real
game, and Sanat and Espanja still cover it with the placeholder.

### 6.4 Mutations for the hand-over (developer runs them; reviewer may re-run)

Apply one at a time, run the named spec, and write down the failed / total
counts:
1. `await Promise.resolve()` before `say` in the `Aloita` handler → `gesture.spec` must fail on all 4 projects.
2. `setTimeout(() => say(...), 0)` in the `Katso tulos` handler → `gesture.spec` must fail.
3. Restore the old fill line in `makeChoices` → `matikka-logic.test` must fail on its timeout.
4. Remove the guard check → the tap-guard test must fail.
5. Drop the "target is a non-keypad button" check in the Enter handler → the desktop "advances exactly one" test must fail.
6. Swap the end texts for scores 0–6 with the 10/10 texts → SEI-6 / 1 must fail.

---

## 7. Verification in the real environment

Nothing deploys until the main session pushes `main`, which runs
`.github/workflows/pages.yml`. A green suite has no real speech and no iPad.

**A. Mac, main session (can be done without the owner).** After the push, on
https://hakaotu.github.io/seikkailut/ in real Chrome (Playwright
`channel: 'chrome'`, not headless, as in the SEI-45 measurement):
1. Matikka card → the choose screen shows `Mitä lasketaan?` with `Helppo`
   selected and `+` and `−` on; no speech.
2. `Aloita` → `Lasku 1 / 10`. Record the `SpeechSynthesisUtterance.voice.name`
   used, read in the page. Right answer: the same voice the Sanat card gets
   (Satu (Enhanced) on 2026-10-23). This covers SEI-45 criterion 4 for Matikka.
3. Answer exactly 2 right and 8 wrong → the end screen shows `Kierros valmis!`
   and `2 / 10 oikein`. Then `Pelaa uudelleen` and answer 10 right →
   `Täydellinen tulos!` with confetti.
Write down the date, URL, commit and the voice name.

**B. Owner on the Mac (one listening step).** On the published page in Chrome:
Matikka, `Aloita`, then answer the first problem wrong on purpose. Right
answer: he hears the problem, then `Ei ihan. Oikea vastaus on …`. Ask only:
heard both / not.

**C. iPad, owner, when an iPad is at hand.** This also closes the open SEI-1
and SEI-45 check. The main session gives one step per message, in this order:
1. Fresh Safari tab, open https://hakaotu.github.io/seikkailut/, tap
   **Sanat** once → "kissa", a pause, "kissa" slower: both / only the first /
   none. (SEI-1 / 6 first-tap sound; SEI-45 / 7–8 second part after the
   pause.)
2. While it speaks: the Kuuntele button turns coloured with moving bars and no
   yellow notice appears: yes / no. (`onstart` on iPad, SEI-1 R3.)
3. Etusivu → **Matikka** → `Aloita` → the problem is heard from that tap: yes /
   no. (The in-game tap path, the first one that is not a card or Kuuntele.)
4. Play the round to the end with the finger only → the end screen with the
   result is heard after `Katso tulos`, and nothing needed scrolling: yes / no.

Record the answers, the iPad model and iOS version, and the date in the task.

Proposal for the main session, by precedent (SEI-1 was closed on the Mac
observation, Q15): SEI-2, SEI-5 and SEI-6 can close on A + B. C is recorded
when it happens and then closes the iPad open question in `architecture.md`.

---

## 8. Alternatives considered

| Alternative | Rejected because |
|---|---|
| One `render()` that rebuilds the whole game DOM from state after every event | Replays the appear animation and loses focus on every digit. The shell already keeps the DOM between visits, so persistent screen containers are less code and give "same as when you left" for free. |
| Report `finished: true` on the 10th answer to avoid `Kesken 10/10` | The badge would vanish before the child has seen the result. The design chose `Kesken 10/10` deliberately (design §6), and the contract defines `finished` as end screen shown. |
| Tap guard by setting `disabled` for 500 ms, or by a re-enable timer | A visible change the design rules out ("Ei näkyvää muutosta"). It also blurs the line around rule 4 (no control disabled while waiting for speech) and adds a timer to reason about. A timestamp compare has neither problem. |
| Reuse `.accent-btn` / `.ok-btn` for Matikka's buttons | `nosound.spec` and `targets.spec` locate `Selvä` as `view.locator('.ok-btn')` in strict mode, and a second match fails them. `targets.spec` would also apply the frame-only 12 px gap rule to game buttons. Adding `mk-` classes to the shared selector lists keeps the look without the coupling. |
| A test hook such as `window.__matikka.answer` | Architecture: "No test hooks exist in shipped code." Parsing the problem's accessible name plus a seeded `Math.random` from an init script gives deterministic tests with nothing extra shipped. |
| `page.clock` to drive the tap guard in tests | A paused clock freezes `performance.now()`. Two synchronous `click()` calls in one `evaluate` test the guard exactly, and `settle()` (550 ms real time) passes it. |
| Keep the old fill and only cap its iterations | It could still return fewer than 4 options. The deterministic walk always gives 4. |
| All code in `matikka.js` | The ranges, distractors, texts and stars could then only be tested through a browser. A pure module matches `router.js` and runs under `node:test`. |
| Add `pitch` to `speech.js` | The designer dropped pitch 1.05 as inaudible. It would be a `speech.js` change for no observed need. |
| Keep the old "level tap restarts the round" | Approved design E1. |

---

## 9. Risks

- **R1–R3 from SEI-1 still open**: first-tap speech, a second part after the
  pause, and `onstart` on iPad Safari. Matikka adds no new kind of speech path
  (every `say` is synchronous in a click handler, with no pauses). §7 C settles
  all three.
- **Fit on the 720 px desktop and iPad landscape.** The design's height sums
  (§3.1 ≈ 522 px of content, §3.9 ≈ 440 px) use the design fonts. Playwright's
  WebKit and Chromium may fall back to other fonts with other line heights. Step
  8 stops and reports instead of shrinking.
- **The guard ignores real taps for 500 ms** after a screen change. This is by
  design. If the owner reports "the button did not react", this is the first
  suspect.
- **Test time.** Full rounds on 4 projects add roughly a minute (estimate, not
  measured). `settle()` costs 550 ms per screen change, about 2–3 per round.
- **Keyboard Enter on a keypad key** (§4.4) applies a rule the design did not
  spell out for that case. It only matters on a computer.

---

## 10. Open questions

**For the owner: none.** Every business choice was settled by Q20 and Q21.

**For the main session (not the owner):**
- **O1.** §4.4 decides that Enter on a focused keypad key means OK, not "press
  this key again". The design's rule (Enter on a focused button belongs to the
  button) is kept for every other button. If the designer disagrees, only the
  keypad case changes. It is one condition in the keydown handler and one
  desktop test.
- **O2.** TD-2 is closed by step 3. `docs/tech-debt.md` needs the entry marked
  closed by someone with write access there.
- **O3.** Closing on A + B with C later (§7), as for SEI-1.

---

## 11. Riskiest step

**Step 7: the mid-round choose screen, resume and tap guard.** It is where
several states combine:
- the round is open, closed, or answered but not yet shown;
- `draft` versus `settings`;
- a typed but unsubmitted value;
- the shell's `autoRead`/`resuming`, which is derived from what Matikka last
  reported;
- a guard that silently drops taps.

A mistake here does not crash anything. It shows a child the wrong problem,
loses their round, reads aloud on return, or makes a button look dead. That is
why §4.1 fixes the state shape before any code, why the DOM is kept rather than
rebuilt, and why §6.2 has a row for each return path (0 answered, 4 answered,
10 answered not shown, end shown, during confetti, Vaihda, then Takaisin with
a typed value).
