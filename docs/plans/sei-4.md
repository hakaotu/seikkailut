# Plan: SEI-4 + SEI-9 + SEI-10 (Espanja in the app) and SEI-48 (Espanja auto-advance)

Architect, 2026-10-26. Inputs:
- `docs/backlog.md`: SEI-4 (criteria 1–11), SEI-9 (1–4), SEI-10 (1–3), SEI-48 (1–15).
- `docs/design/sei-4.md` + `.html`. Approved by the owner: design Q31, translations Q32,
  old stars not migrated Q33. Cited below as "design §x".
- `docs/design/sei-46.md` (shared auto-advance design, Q29), through design §3.5.
- `docs/plans/sei-3.md` (approved Q30). Its Phase A builds the shared auto-advance
  controller and the shell's `say(parts, { auto: true })`; Phases B and C build Sanat. Cited
  as "sei-3 §x".
- `docs/plans/sei-2.md` (the Matikka model), `docs/architecture.md`, `docs/tech-debt.md`.
- `originals/espanjavalmentaja.html` ("old r. n").
- The code at HEAD `901070c` **plus the uncommitted working tree** of the developer doing
  sei-3 Phase A step A2 (`git status` at the start of this session: `registry.js`,
  `shell.js`, `fake-game.js`, `helpers.mjs`, `nosound.spec.mjs` modified). Line numbers
  marked "(wt)" are from that working tree and may move before it is committed.

The design is the source for every string, colour and pixel value. This plan repeats them
only where a test depends on them or the code has to choose something.

**When this runs.** After sei-3 Phases A, B and C have landed (main session's instruction).
Step E0 re-checks every assumption this plan makes about that code (§2).

---

## 1. Context and constraints

**What exists now:**

| Fact | Where |
|---|---|
| Espanja is the placeholder: `Kysymyssana` box, one `say` of `hola` at 0.9. | `app/src/games/registry.js:82-93` (wt), `app/src/games/placeholder.js:22-29` |
| After sei-3 Phase B, Espanja is the placeholder's only user (sei-3 §3 "`placeholder.js` stays for Espanja"). | sei-3 §3, last line |
| Espanja's brand colours already match the design: `--brand: #c62828; --brand-dark: #8e0000; --brand-light: #fdeceb`. | `app/styles/app.css:18` |
| The shared auto-advance controller exists: `AUTO_ADVANCE_MS = 4000`, `fillMarkup(label, iconSvg)`, `createAutoAdvance({ button, onAdvance, delayMs, doc, setTimer, clearTimer }) → { start, cancel, running }`. The timer callback calls `cancel()` before `onAdvance()`. `focusin` on anything but the button, or `visibilitychange` to hidden, cancels. | `app/src/games/auto-advance.js:11`, `:18-23`, `:25-70`, `:62-66`, `:37-43` |
| The shell's `say(parts, opts)` passes `auto` to `onSpeechState`; an `auto` failure never sets `novoice` or shows the notice. | `app/src/shell.js:66-83`, `:185-189` (wt) |
| Registry rule 3 documents `{ auto: true }`; rule 6 says `localStorage` keys are prefixed with the game id. Line 10 says "The placeholder keeps its factory form until it is removed." | `registry.js:10`, `:50-51`, `:54` (wt) |
| `Selvä` focuses Kuuntele, so it ends a wait through the controller's `focusin` rule. | `shell.js:171-174` |
| Leaving a game calls `instance.hide()`; `resuming` is "view exists and badge non-null"; `show({ autoRead: byTap && !resuming })`. | `shell.js:243`, `:263`, `:278`, `:290` |
| The Matikka patterns Espanja copies: `GUARD_MS = 500` and `guarded` reading `performance.now()`; `goTo` sets `screenChangedAt`; confetti layer + one `setTimeout`; `answer()` focuses Seuraava then announces then calls `say` last; `next()` returns if unanswered; Seuraava hidden by `is-waiting` (`visibility: hidden`). | `app/src/games/matikka.js:18`, `:225-229`, `:422-430`, `:434-461`, `:477-506`, `:525-537`, `:386`; `app.css:797` |
| Matikka's praise list, which the design says Espanja uses unchanged (design §1 table, "Kehut"). | `app/src/games/matikka-logic.js:20` |
| Shared pressed/focus selector lists name every game button class. | `app.css:55-111` |
| `targets.spec` treats `.ok-btn` and `.accent-btn` as frame buttons; `nosound.spec` and `targets.spec` find `Selvä` as `view.locator('.ok-btn')` in strict mode. A game button with either class breaks them. | `tests/e2e/helpers.mjs:175`; `tests/e2e/targets.spec.mjs:18`; `tests/e2e/nosound.spec.mjs:37,40` |
| Specs that open every real game, so they will run against real Espanja: `home` (tap opens), `layout` (no sideways scroll, frame inside), `targets` (sizes with the notice open and closed, tap-only flow), `nosound` (a)/(b) (no speak call on open, Kuuntele re-shows the notice). | `home.spec.mjs:28-37`, `layout.spec.mjs:23-47`, `targets.spec.mjs:10-35`, `nosound.spec.mjs:15-49`, `:52-67` |
| `gesture.spec` has two Espanja placeholder tests: the card loop (card tap speaks) and "Kuuntele as the very first tap after a reload … `hola`". | `tests/e2e/gesture.spec.mjs:14-24`, `:26-37` |
| `resume.spec` and `errors.spec` use the fake registry, so they do not see real Espanja. | `resume.spec.mjs:6`, `errors.spec.mjs:6` |
| The fake speech can refuse non-tap `speak` calls (`untrusted: 'error' | 'silent'`). | `helpers.mjs:19-22`, `:110-114` (wt) |
| `seedRandom` replaces `Math.random` before load; `settle()` waits 550 ms real time. | `helpers.mjs:222-233`, `:237-239` |
| Old game: 18 pairs (8 `tervehdys`, 10 `väri`); biased shuffle `sort(() => Math.random() - .5)`; distractors from the same `cat`; option `aria-label` `Vastaus …`; es→fi right answer speaks the prompt; star at `score >= 8`; key `es_stars`. | old r. 193–214, 226, 287–290, 308, 330–332, 364, 382–387 |
| Nothing in the repo reads or writes `localStorage`. | `docs/architecture.md:50` |

**Baseline:** the developer runs `npm run test:unit` and `npx playwright test` at E0 and
writes down the counts. sei-3 ends with its own counts (sei-3 §8 C2); they should match.

**What must not break:**
- The tap rule (architecture "Navigation and the tap rule"). Every `say` caused by a tap
  is called synchronously in that handler. The only timer-started readings are the
  auto-advance reading (marked `{ auto: true }`) and the `pauseMs` parts inside
  `speech.js` (Kuuntele's four options, design §3.8).
- Every existing spec keeps passing, except the deliberate `gesture.spec` changes in §3.
- Matikka and Sanat are not touched (decision D5).
- "No test hooks exist in shipped code" (architecture L85) stays true.

---

## 2. Assumptions about sei-3 code, to re-check at E0

This plan is written against sei-3's Phase A interface and the code already on disk. Phases
A–C will have landed when this starts. The developer checks each row before writing any
Espanja code. **If a row differs only in naming, adapt the wiring and note it in the
hand-over. If it differs in behaviour, stop and report; do not redesign.**

| # | Assumption | Where it should be | How to check | If different |
|---|---|---|---|---|
| R1 | `createAutoAdvance` and `fillMarkup` have the signature in §1 and cancel before advancing. | `app/src/games/auto-advance.js` | Read the file. Unit tests in `tests/unit/auto-advance.test.mjs` still pass. | Behaviour change → stop. |
| R2 | An unscoped CSS section styles `.aa-btn`, `.aa-btn.aa-counting`, `.aa-fill`, `.aa-ticks` from `--brand`, `--brand-light`, `--brand-dark`, with the counting rule at specificity (0,4,0) (`.game-view[data-game] .aa-btn.aa-counting`, sei-3 §5.2). | `app/styles/app.css`, section "Auto-advance" (absent from the file at `901070c`) | `grep -n 'aa-' app/styles/app.css`. Note the counting rule's selector. | Espanja's Seuraava rule must have lower specificity than whatever the counting rule is. Adjust the Espanja selector, never the shared one. |
| R3 | `ctx.speech.say(parts, { auto: true })` and the D2 rule are committed. | `shell.js` `onSpeechState` and the ctx `say` wrapper; `registry.js` rule 3 | `git log -p -- app/src/shell.js`; the nosound "D2" tests pass. | Stop. |
| R4 | Matikka is wired as sei-3 §5.3: `next({ auto })` calls `auto.cancel()` first, the click listener is `guarded(() => next())`, the timer path skips `guarded`, `listen` / `openChoose` / `hide` cancel. | `app/src/games/matikka.js` | Read `next`, `answer`, `listen`, `hide`. | Copy whatever the landed Matikka does; note differences. |
| R5 | `tests/e2e/auto-advance.spec.mjs` runs one test body per row against a list of drivers `{ open, start, right, wrong, itemLabel, nextBtn, listen }` (sei-3 §9.3), with game-only rows outside the shared loop. | `tests/e2e/auto-advance.spec.mjs` | Read the file and its driver objects. | Add Espanja the way Sanat was added; if drivers have a different shape, implement that shape. |
| R6 | `installFakeSpeech({ untrusted })` is committed. | `tests/e2e/helpers.mjs` | Read. | Stop. |
| R7 | Sanat no longer uses the placeholder. | `registry.js` `sanat` entry imports `sanat.js` | `grep -rn placeholder app/ tests/` shows only the Espanja entry, `placeholder.js` itself, its CSS block and `gesture.spec`'s card loop over `['espanja']`. | If Sanat still uses it, keep `placeholder.js` and its CSS; skip their deletion in E2. |
| R8 | The sei-3 "return after cancel" rule is "Seuraava full, no speech, no new wait" (sei-3 §9.3 row "Return"). | `auto-advance.spec.mjs` | Read the row. | Stop (SEI-48 / 10 assumes this). |
| R9 | Where the landed Matikka and Sanat put Seuraava's hidden state (`is-waiting` + `visibility: hidden`, `app.css:797`). | `app.css` | Read. | Follow the landed pattern. |
| R10 | `docs/architecture.md` has been rewritten by the sei-3 scribe run. | `docs/architecture.md` | Read. §7 quotes lines as at `901070c`; find them by text. | Re-quote in the hand-over. |

---

## 3. Architecture decisions

**D1. Same shape as Matikka.** Two new files, following `matikka.js` and
`matikka-logic.js`:
- `app/src/games/espanja-logic.js`: data, rules, texts, the stars codec. Pure, with no DOM
  and nothing read at import. Every random choice takes an `rng`.
- `app/src/games/espanja.js`: `export default { create(ctx) }`, three screens built once in
  `create` and switched with `hidden`, all state in memory except the collected stars.

**D2. Options are word objects, not strings.** Each question stores its four options as
references into `WORDS`, and the answer is compared by identity. The old game compared
`textContent` (old r. 324). With the corrected list the texts are unique, but identity does
not depend on that. The unit test also checks uniqueness (design §5 "Ehto rakentajalle").

**D3. Collected stars.** Key `espanja.stars`. This follows registry rule 6 (prefix = game
id) and the design's example (design §5).
- Value: an integer as a string.
- Read once in `create`.
- Written once, in the same tap that first shows the end screen of a round with `a >= 8`.
- `parseStars(raw)`: `Number(raw)`. A missing, non-numeric, non-finite or negative value
  gives 0. Any other value is rounded down (`Math.floor`). So `'2.7'` → 2 and `'0.5'` → 0.
  This is my reading of design §5 "desimaali → 0 (desimaali alaspäin)": round down.
- Access goes through `getStorage = () => window.localStorage`, called inside `try`, because
  reading the property itself can throw when storage is blocked. Any throw leaves the
  in-memory count, with no message (design §5).
- The old key `es_stars` is never read or written (Q33, SEI-4 / 11).
- `round.starGiven` (design §5 "Tähti annettu tältä kierrokselta") makes the grant
  idempotent even if `showEnd` ran twice.

**D4. Auto-advance (SEI-48) is the sei-3 controller, wired the same way as Matikka.**
Espanja does not define any timing, look or cancel rule of its own (design §3.5: "yksi
toteutus"). The full wiring is in §6.4.

**D5. No shared module for guard, confetti and button CSS in this plan.** sei-3 §14 item 1
proposed one. I decided against it here, for three reasons:
1. When this plan was written, the Sanat copies did not exist yet. A shared API designed
   now is designed against two copies, one of which I cannot read.
2. Extracting means changing Matikka (done, verified on the Mac, Q24) and Sanat (just
   landed). No SEI-4/9/10/48 criterion asks for that. A regression there would land
   inside an Espanja review.
3. The Espanja copies are small. The guard is 5 lines (`matikka.js:225-229`) and confetti
   is about 30 (`:434-461`).

Espanja therefore has its own `es-` copies. This is a deliberate third copy. §13 item 1
gives the refactor a concrete trigger: one task, after SEI-4 is `done`, with three copies
to compare and three e2e suites as its safety net.

**D6. `es-` classes, not `.accent-btn` / `.ok-btn`.** This is the reason sei-2 §8 and sei-3
D6 give (`targets.spec` / `nosound.spec` strict locators and the frame gap rule). The
Espanja classes join the shared lists at `app.css:55-111`.

**D7. The praise list is a copy, pinned by a test.** `espanja-logic.js` has its own
`PRAISE`. A unit test asserts that it deep-equals `matikka-logic.js`'s `PRAISE`. An import
from `matikka-logic.js` would be one line, but it would make one game depend on another,
which nothing does today. The test makes any future divergence a conscious decision.

**D8. Delete the placeholder.** After this plan, no game uses `placeholder.js`, subject to
check R7. Delete it and its CSS block (`app.css:495-521`, comment "removed as SEI-2 –
SEI-4 land"). Also update the sentence at `registry.js:10`.

---

## 4. Files to create or modify

| Path | Change |
|---|---|
| `app/src/games/espanja-logic.js` | **New.** §5.2. |
| `app/src/games/espanja.js` | **New.** §6. |
| `app/src/games/registry.js` | **Modify.** `import espanja from './espanja.js'`; the `espanja` entry gets `module: espanja` (`id`, `name`, `lang: 'es-ES'` and `listenLabel: 'Kuuntele'` stay). Remove `import { placeholder }` (R7). Line 10: delete "The placeholder keeps its factory form until it is removed." |
| `app/src/games/placeholder.js` | **Delete** (R7, D8). |
| `app/styles/app.css` | **Modify.** (a) A new block `/* ---------- Espanja (docs/design/sei-4.md) ---------- */`, every rule scoped `.game-view[data-game='espanja']`, prefix `es-`. (b) Add `es-primary`, `es-secondary`, `es-dir`, `es-option` to the four lists at `:55-111`. (c) Delete the placeholder block `:495-521` (R7). (d) Reduced-motion rules for the appear, pop, shake and star pop. |
| `tests/unit/espanja-logic.test.mjs` | **New.** §9.1. |
| `tests/e2e/espanja-helpers.mjs` | **New.** The drivers (§9.2). They read the current question from the question word's accessible name `Kysymys n / 10: <prompt>`, look up the pair in `WORDS` imported from `app/src/games/espanja-logic.js`, and know the answer. This is the same idea as `matikka-helpers.mjs`, with no hook. Exports `view`, `button`, `openEspanja`, `startRound(page, testInfo, { direction })`, `current`, `answerRight`, `answerWrong`, `skip`, `next`, `playRound(page, testInfo, pattern)` (pattern is a string of `r`/`w`/`s`, one per question). |
| `tests/e2e/espanja.spec.mjs` | **New.** §9.3. |
| `tests/e2e/espanja-frame.spec.mjs` | **New.** SEI-1 criteria 3–5 against real Espanja, as `matikka-frame.spec` does (§9.5). |
| `tests/e2e/auto-advance.spec.mjs` | **Modify.** Add an Espanja driver to the shared rows, and add the Espanja-only rows (§9.4). |
| `tests/e2e/gesture.spec.mjs` | **Modify.** Delete the card loop `:14-24` (after sei-3 B it covers only `['espanja']`; the Espanja card is now silent). Keep `:26-37` unchanged: the choose screen's Kuuntele still says `hola` at 0.9, `es-ES`, one call (design §3.1). Add the Espanja tap-rule tests (§9.6). |

Nothing else changes. `shell.js`, `speech.js`, `auto-advance.js`, `matikka*.js` and
`sanat*.js` are not modified.

---

## 5. Data model, API and contract changes

### 5.1 Contracts

- **Game contract:** unchanged. Espanja uses `ctx.root`, `ctx.question`, `ctx.status`,
  `ctx.speech.say(parts, opts?)`, `ctx.speech.stop`, `ctx.reportProgress`.
- **`localStorage`:** new key `espanja.stars`. This is the first storage in the repo.
  - Readers and writers: only `espanja.js`, through `espanja-logic.js`'s
    `loadStars` / `saveStars`.
  - Old shape: there is none in this origin. The old `es_stars` lived in a file-origin
    page (design §5) and is never read (Q33).
- **`reportProgress`:** `{ done: a + b + c, total: 10, finished }`.
  - Reported on `Aloita`, `Aloita uusi kierros` and `Pelaa uudelleen` (`done: 0`), on every
    answer and every `Ohita`, and with `finished: true` when the end screen first shows.
  - Not reported on `Seuraava` or on an auto-advance. That is what makes SEI-48 / 11 hold.
- **`placeholder.js` removed:** readers are `registry.js` (updated) and the architecture
  module map (§7).

### 5.2 `espanja-logic.js` exports

- **Data:**
  - `MAX_QUESTIONS = 10`.
  - `WORDS`: 18 entries `{ es, fi, topic }`, in old r. 195–213 order, with the three Q32
    changes. `adiós` → `näkemiin`, `buenas tardes` → `hyvää iltapäivää`, `por favor` →
    `ole kiltti`. `topic` is `'tervehdys'` or `'väri'`.
  - `PRAISE` (D7).
  - `DIRECTIONS`:
    - `fi2es: { name: 'Suomi → Espanja', how: 'Valitse espanjaksi' }`
    - `es2fi: { name: 'Espanja → Suomi', how: 'Valitse suomeksi' }`
  - `STARS_KEY = 'espanja.stars'`.
- **Shuffling and rounds:**
  - `shuffle(list, rng)`: Fisher–Yates. Returns a new array.
  - `newRound(direction, rng)` →
    `{ direction, questions, index: 0, endShown: false, starGiven: false }`.
    - `questions` holds 10 distinct words from `shuffle(WORDS)`.
    - Each question is `{ pair, options, result: 'open', chosen: null, praise: null }`.
    - `options = shuffle([pair, ...shuffle(sameTopicOthers).slice(0, 3)])`.
    - Every question's options are drawn at round start (design §5), so a return shows
      the same options in the same order.
- **Question text and actions:**
  - `promptOf(pair, dir)` and `optionText(pair, dir)`.
  - `spoken(text)`: removes `¡ ! ¿ ?` and trims (old r. 331).
  - `hintLine(pair, dir)` → `Aihe: väri. Valitse espanjaksi.`
  - `pairLine(pair)` → `rojo = punainen` (Spanish first, both directions).
  - `choose(q, pair, rng)`: sets `chosen` and `result` (`'right'` or `'wrong'`). On right
    it picks `praise`. It does nothing if `q.result !== 'open'`.
  - `skip(q)`: `result = 'skipped'`. It does nothing if the question is not open.
  - `counts(round)` → `{ a, b, c, done }`.
- **Speech:** `listenParts(screen, round)` gives the parts for Kuuntele (design §3.8):

  | Screen and state | Parts |
  |---|---|
  | choose | `[{ text: 'hola', rate: 0.9 }]` |
  | question, fi2es, open | the four options in display order, each `rate: 0.9`; parts 2–4 have `pauseMs: 500` |
  | question, any other case | `[{ text: spoken(pair.es), rate: 0.9 }]` |
  | end | `[{ text: endTexts(...).speech, rate: 0.9 }]` |

  `answerParts(q)` is `[{ text: spoken(q.pair.es), rate: 0.9 }]`. It is used for right,
  wrong and skip alike, because the spoken word is always the pair's Spanish word
  (design §3.8 rows "Vastaus oikein / väärin / Ohita").
- **End screen:**
  - `endTier(a)`: `'perfect'` if a = 10, `'good'` if a = 8–9, `'done'` otherwise.
  - `earnsStar(a)`: `a >= 8`.
  - `endTexts(a, b, c)` →
    `{ tier, title, score: 'a / 10 oikein', rows, phraseEs, phraseFi, speech }`.
    - `rows` has the a-row always, the b-row only when b ≥ 1 and the c-row only when
      c ≥ 1 (design §3.7).
    - `speech` is `Perfecto`, `Muy bien` or `Sigue practicando`.
- **Live-region texts** (design §8): `questionLive(round)`, `rightLive(round, autoNext)`,
  `wrongLive(round)`, `skippedLive(round)`, `endLive(round, starGot, total)`.
  `rightLive` appends ` Seuraava kysymys tulee itsestään.` only when `autoNext` is true.
- **Choose screen:** `chooseHint(draftDir, round)` gives
  `'Toinen suunta alkaa uudella kierroksella.'` if a round is open and the direction
  differs, and `''` otherwise.
- **Stars:**
  - `parseStars(raw)` (D3).
  - `loadStars(getStorage)` returns `parseStars(getStorage().getItem(STARS_KEY))`, or `null`
    if anything throws. `null` means "keep what is in memory", which is 0 at `create`.
  - `saveStars(getStorage, n)` returns `true` or `false`.

### 5.3 State in `espanja.js` (memory only, apart from `stars`)

```
direction = 'fi2es'            // committed: the direction of the current/next round
draft     = 'fi2es'            // choose screen working copy
screen    = 'choose' | 'question' | 'end'
round     = null | newRound(...)
stars     = loadStars(...) ?? 0
screenChangedAt, confettiLayer, confettiTimer   // as Matikka
auto      = createAutoAdvance({ button: nextBtn, onAdvance: () => next({ auto: true }) })
roundOpen = round !== null && !round.endShown
```

The design's per-question wait state (`odotus: ei | käynnissä | loppunut`, design §3.5)
needs no field, for the reason in sei-3 §4:
- `auto.running()` says whether a wait is running.
- A wait can start only in the tap that answers a question, and a question is answered
  once.

---

## 6. `espanja.js`

The design is followed section by section. This section fixes only what the code has to
decide.

### 6.1 DOM (built once in `create`)

- **`ctx.question`:**
  - `h2.es-heading.es-q-choose` (`Mitä pelataan?`, `tabindex="-1"`);
  - `div.es-q-play`, holding the question word `.es-word` (`tabindex="-1"`, its
    `aria-label` `Kysymys n / 10: <prompt>`, `lang="es"` in es2fi) and `.es-hint`;
  - `h2.es-heading.es-q-end` (`tabindex="-1"`).
- **`ctx.root`:** three `section.es-screen` (`es-choose`, `es-play`, `es-end`) and
  `div.sr-only.es-live[role=status]`.
  - **Choose:** `radiogroup` `Suunta` with two `button.es-dir[role=radio]`; the word line;
    `.es-choose-hint[role=status]`; actions `Takaisin kysymykseen` (secondary), `Aloita`
    and `Aloita uusi kierros` (primary).
  - **Play:**
    - `.es-info`: `Pisteet: a / done` and a 10-block bar with `role="img"`.
    - `.es-options` with `role="group"`, `aria-label="Vastausvaihtoehdot"`.
    - `.es-feedback`: an icon, two text lines, and on the right
      `button.es-primary.es-big.es-next.aa-btn`. That button holds a label span, the
      arrow, and `fillMarkup('Seuraava', ARROW)`. Its `aria-label` is `Seuraava kysymys` or
      `Katso tulos`.
    - `.es-foot`: `Ohita` (`aria-label` `Ohita kysymys`) and `Vaihda` (`aria-label`
      `Vaihda suuntaa. Nyt <name>.`).
  - **End:** a medal, the score, the rows, the star row, the phrase lines, `Pelaa
    uudelleen`, `Vaihda suuntaa`, and the direction line.
- **`ctx.status`:** `role="img"`, `aria-label` `Tähtiä: n` (design §3.0). It holds:
  - `.es-stars-many`: n star SVGs, rendered only when 1 ≤ n ≤ 10;
  - `.es-stars-few`: one star and `× n`, or an empty star and `0` when n = 0.

  CSS shows `.es-stars-many` only at `(min-width: 600px)` and only when it is rendered.
  Otherwise it shows `.es-stars-few`. This needs no `resize` listener.

### 6.2 Handlers

Each handler follows Matikka's order: change state, render, focus, announce, `say` last,
all synchronous. Every button listener is `guarded`, including options and `Seuraava`
(design §3.9).

| Handler | Does | Speech (last) |
|---|---|---|
| direction card | `draft = id`; render the choose screen (hint, buttons) | none |
| `Aloita`, `Aloita uusi kierros` | `direction = draft`; `beginRound()` | see `beginRound` |
| `beginRound` (also `Pelaa uudelleen`) | `auto.cancel()`; `round = newRound(direction)`; `goTo('question')`; render; `reportProgress({ done: 0, total: 10, finished: false })`; focus the word; announce `questionLive` | es2fi: `spoken(prompt)` at 0.9; fi2es: none |
| `Takaisin kysymykseen` | `goTo('question')`; focus the word | none |
| option | `choose(q, pair)`; `reportProgress(done)`; render; focus Seuraava; **if right and `index < 9`: `auto.start()`**; announce | `answerParts(q)` |
| `Ohita` | `skip(q)`; `reportProgress`; render; focus Seuraava; announce | `answerParts(q)` |
| `next({ auto = false } = {})` | `auto.cancel()` (the controller); return if `q.result === 'open'`; on index 9 go to `showEnd()`; otherwise `index += 1`, render, focus the word, announce | es2fi: `spoken(prompt)` with `{ auto }`; fi2es: none |
| `showEnd` | `round.endShown = true`; if `earnsStar(a) && !round.starGiven`: `starGiven = true`, `stars += 1`, `saveStars`, render the status with the pop; `reportProgress({ done: 10, total: 10, finished: true })`; render the end screen; `goTo('end')`; confetti (perfect: 100 pieces / 3500 ms, good: 40 / 3000, done: none; none under reduced motion); focus the heading; announce `endLive` | `endTexts.speech` at 0.9 |
| `Vaihda` (play), `Vaihda suuntaa` (end) | `auto.cancel()`; `draft = direction`; render the choose screen; `goTo('choose')`; focus the heading | none |
| `listen()` | `auto.cancel()`; then `say(listenParts(screen, round))` | the parts |
| `show({ autoRead })` | none | if `autoRead && screen === 'question' && q.result === 'open' && direction === 'es2fi'`: `spoken(prompt)` |
| `hide()` | `auto.cancel()`; `clearConfetti()` | none |

The `Seuraava` click listener is `guarded(() => next())`, so the click event never lands in
the options object (sei-3 §5.3). The timer path (`onAdvance`) does not go through
`guarded`, and it does not set `screenChangedAt` (design §3.9 last bullet).

Espanja adds no document or window listener of its own. There is no keyboard handler:
Enter and Space on a focused button are the browser's own (design §8). The only document
listeners are the controller's, and they exist only while a wait runs, so registry rule 2
holds.

### 6.3 Rendering rules that tests depend on

- **Options after the answer:** all four are `disabled`.
  - Right option: `is-right`, ✓, `aria-label` `Vastaus X, oikea vastaus`.
  - Wrong chosen option: `is-wrong`, ✗, struck through, `aria-label`
    `Vastaus X, sinun vastauksesi, väärin`.
  - The others: `is-dim`.
  - Before the answer, the `aria-label` is `Vastaus X` (old r. 308). Spanish texts carry
    `lang="es"`.
- **Seuraava:** `is-waiting` (`visibility: hidden`) while the question is open (R9).
  `Ohita` gets `visibility: hidden` once the question is answered (design §3.2).
- **Feedback** (design §3.4):
  - right: praise, then `pairLine`;
  - wrong: `Ei ihan.`, then `Oikea vastaus on <answer in the answer language>.`;
  - skipped: `Ohitettu.`, then the same second line.
- **Info row:** `Pisteet: a / done`; the first `done` bar blocks are full; the bar's label
  is `<done> kysymystä 10:stä tehty`.

### 6.4 Auto-advance wiring (SEI-48)

All of it is §6.2's rows. Collected here for the reviewer:
- **Start:** only in the option handler, only when the answer is right and `index < 9`.
  The wait starts after `focusEl(nextBtn)`, so the game's own focus move is not a
  `focusin` on another element. It starts before `announce` and `say`.
- **No start:** on a wrong answer, `Ohita`, question 10, or a return.
- **Cancel:** `next()` (first line), `listen()`, `Vaihda` / `Vaihda suuntaa`, `beginRound`
  and `hide()`. `Selvä`, Tab and page-hidden cancel through the controller.
- **The advance:** `next({ auto: true })`. In es2fi it reads the new word with
  `{ auto: true }`; in fi2es it reads nothing (design §3.8).
- **Live text:** `rightLive(round, index < 9)`, so the sentence is missing on question 10.

---

## 7. Architecture doc impact

Statements in `docs/architecture.md` that this change makes false, quoted as at
`901070c`. The sei-3 scribe run will have edited some of these lines first (R10). Find them
by their text.

1. L3: "As-is description after SEI-1, SEI-45 (…) and SEI-2/5/6 (Matikka port)." Add
   SEI-4/9/10/48.
2. L7: "Matikka is a real game; Sanat and Espanja are still the same placeholder." After
   sei-3 this probably reads "Espanja is still the placeholder". Either way it is false:
   all three are real games.
3. L29: "Matikka's `module` is the static import of `matikka.js`." This now holds for all
   three games.
4. L32: the whole `games/placeholder.js` row. The file is deleted.
5. L50: "The placeholder keeps its factory form until it is removed." It has been removed.
6. L50: "Nothing in the repo reads or writes `localStorage` yet." Espanja reads and writes
   `espanja.stars`.
7. L83: the unit list lacks `espanja-logic`.
8. L84: the e2e list lacks `espanja` and `espanja-frame`. The helpers description lacks
   `espanja-helpers.mjs`.
9. L34: "`index.html` holds …" stays true. Only check that no sentence there claims
   placeholder CSS exists.

**Additions:**
- module-map rows for `games/espanja.js` and `games/espanja-logic.js`;
- an Espanja section of at most 12 lines: screens, state, the star key and grant rule
  (`a >= 8`, once per round, on the first end screen), speech per direction, and the
  auto-advance start and cancel points;
- one line in the iPad open question (L96): "Espanja: timer-started reading in Espanja →
  Suomi; `localStorage` persistence on iPad Safari".

**Not made false:**
- L38 (the tap rule and its exceptions; sei-3 already adds the `auto` exception);
- L45;
- L74 (Matikka's guard);
- L85 "No test hooks exist in shipped code";
- L86.

Line budget: architecture.md is 101 lines at `901070c`, and sei-3 adds a Sanat section.
Scribe should net about +14 lines for this change.

---

## 8. Ordered steps

Each step ends with `npm test` green unless it says otherwise. Commit after each step.

**E0. Preconditions and baseline.**
- Walk §2 R1–R10 and write one line per row into the hand-over: "as assumed" or "differs:
  …".
- Run `npm run test:unit` and `npx playwright test`, and record the counts and the total
  Playwright time.

Check: every row is answered, and no row says "stop".

**E1. `espanja-logic.js` and its unit tests (§9.1).**

Check: `npm run test:unit` passes. Then, one at a time:
- replace `shuffle` with the old `sort(() => rng() - 0.5)`. The uniformity test must fail.
- change `por favor`'s `fi` back to `ole hyvä`. The SEI-9 test must fail.

Restore both.

**E2. Registry swap, skeleton, choose screen, status stars, placeholder removal.**
- `espanja.js` with `create` / `show` / `hide` / `listen`, the choose screen (cards, word
  line, hint, `Aloita`), the status stars from `loadStars`, and `listen()` on the choose
  screen.
- `Aloita` shows a minimal question screen: the word and hint only.
- `registry.js` swap. Delete `placeholder.js` and its CSS (R7).
- `gesture.spec`: delete `:14-24`; add "Espanja: the card tap reads nothing".
- CSS for the choose screen and the status slot, including adding the `es-` classes to
  `app.css:55-111`.

Check:
- the whole suite is green, including `home`, `layout`, `targets` and `nosound` against
  real Espanja, and `gesture.spec:26-37` unchanged;
- `grep -rn placeholder app/ tests/` prints nothing.

**E3. The question screen without auto-advance.**
- Info row, options, answer (right and wrong), feedback, `Seuraava` / `Katso tulos`,
  `Ohita`, `Vaihda` (to the choose screen, not yet in its mid-round form), the live region,
  speech and `reportProgress`.

Check: §9.3 rows for SEI-4 / 1–6, 10, SEI-9 / 2–4, SEI-10 / 1–2.

**Write these tests so that E6 cannot break them.** After a right answer on questions
1–9, a test either presses `Seuraava` at once or finishes within 3 s. Where "right" is not
what a test checks, it answers wrong. sei-3 R2 is the same risk.

**E4. End screen and stars.**
- The three tiers, rows, phrase, confetti, `showEnd` star grant and save, the status pop,
  `Pelaa uudelleen` and `Vaihda suuntaa`.

Check: §9.3 rows for SEI-4 / 7–9, 11 and SEI-10 / 2–3.

**E5. Mid-round choose screen, resume and guard.**
1. `Vaihda` shows the round form: `Takaisin kysymykseen` and `Aloita uusi kierros`, or
   only `Aloita uusi kierros` plus the hint when the draft direction differs (`chooseHint`).
   Check: §9.3 "mid-round choose".
2. `Takaisin kysymykseen` returns to the same question, the same options in the same order
   and the same feedback, with no speech. Check: §9.3 "return" rows.
3. The guard: `guarded` on every button, `GUARD_MS = 500`, `screenChangedAt` set in
   `goTo`. Check: §9.3 "guard".
4. `hide()`: confetti removed. Check: §9.3 "resume".

**E6. Layout and frame.**
- Design §3.3 sizes per width (≥ 600, 420–599, < 420), §3.10 (< 600: Seuraava full width
  under the text, `Ohita` / `Vaihda` stacked), the end screen ≥ 900 in two columns, and
  the status forms.
- `espanja-frame.spec.mjs` (§9.5).

Check: it passes on all four projects. That includes the desktop 548 px game height with
no vertical scroll for the longest question word, `hyvää iltapäivää` (fi2es prompt). Find
it by seed and write the seed down.

If it does not fit, stop and report the project, the screen and the overshoot in px. Do
not shrink anything; that goes back to the designer.

**E7. SEI-48: wire the controller (§6.4), then the tests (§9.4). This is the riskiest step
(§12).**
1. Add `aa-btn` and `fillMarkup` to the Seuraava markup. Check: the bounding box of a
   plain (wrong-answer) Seuraava is unchanged from E3, within 0.5 px. The fill layer is
   `display: none`.
2. Create `auto` after the DOM is built. Add `auto.start()` to the option handler, the
   cancels from §6.4, `next({ auto })`, and `rightLive(…, index < 9)`. Check: one manual
   desktop run with `npm run serve`, es2fi, right on question 1, no tap: the question
   changes about 4 s later and the new word is spoken once.
3. Add the Espanja driver to the shared rows of `auto-advance.spec.mjs` (R5). The driver
   uses es2fi, so that the shared "new item is read once" row applies. Check: every shared
   row passes for Espanja on all four projects.
4. Add the Espanja-only rows (§9.4). Check: they pass.
5. Re-run the whole suite. If an E3–E5 test now fails with an unexpected `Kysymys n+1` or
   a hidden `Seuraava`, the timer overtook it. Fix the test as E3 says, not the 4000 ms.
   List each such change in the hand-over.

**E8. Mutation pass and final counts.**
- Run §9.7 M1–M10, one at a time, and record failed / total for the named spec.
- Run the full suite and record the counts and the total Playwright time against E0.
- Find and record one seed for §10 A3: in es2fi, the 10 questions include `buenas tardes`
  and `por favor`.

**Shipping point.** E0–E8 in one push. SEI-4/9/10 without SEI-48 would make Espanja the
only game without auto-advance, against SEI-48 / 15. If the main session wants SEI-4
alone, the push point is after E6. E7 then follows as its own push.

---

## 9. Test plan, by criterion

All e2e tests use `installFakeSpeech`, `seedRandom` where content matters, and `settle()`
after every screen change. They run on all four projects unless a row says "desktop". A
fresh Playwright context per test means `localStorage` starts empty.

### 9.1 Unit, `tests/unit/espanja-logic.test.mjs` (`node:test`, seeded mulberry32 `rng`)

| Crit. | Asserts | A failing test looks like |
|---|---|---|
| SEI-9 / 1–4 | `WORDS` deep-equals the 18 rows of design §5's table, in order: `{es, fi, topic}`. In particular `adiós → näkemiin`, `buenas tardes → hyvää iltapäivää`, `por favor → ole kiltti`. No `fi` equals `moi moi / hei hei`, `hyvää iltaa` or `ole hyvä`. Topic sizes are 8 and 10. | `por favor = ole hyvä` still present. |
| design §5 condition | Within each topic, every `fi` and every `es` is unique. Across the whole list too. | Two options `kiitos`. |
| SEI-4 / 3 | Over 1000 seeds, `newRound` gives 10 questions with distinct `pair`s, all in `WORDS`. Uniformity: over 20 000 seeds, each word appears as question 1 with frequency within ±15 % of 1/18. | The old biased sort, which skews first positions. |
| SEI-4 / 1, 2 | For every question over 1000 seeds: `options.length === 4`; exactly one `=== pair`; the other three share `pair.topic` and are distinct. `optionText` is `es` for fi2es and `fi` for es2fi; `promptOf` is the other one. | A colour among greeting options. |
| SEI-4 / 3 | `hintLine(rojo, 'fi2es') === 'Aihe: väri. Valitse espanjaksi.'`; `hintLine(hola, 'es2fi') === 'Aihe: tervehdys. Valitse suomeksi.'` | Old format `(väri)`. |
| SEI-4 / 4, SEI-10 / 2 | `choose` sets `right` or `wrong` once. A second `choose` or a `skip` after it changes nothing. `skip` on an open question gives `skipped`, `chosen === null`. `counts` after r, w, s, r gives `{a: 2, b: 1, c: 1, done: 4}`. | A skip counted as right. |
| SEI-4 / 5 | `listenParts('question', fi2es open round)` gives 4 parts, the option texts in display order, rate 0.9, `pauseMs` undefined on part 0 and 500 on parts 1–3. After an answer, a single part `spoken(pair.es)`. es2fi gives a single part with the prompt. `spoken('¿qué tal?') === 'qué tal'`. Choose gives `hola`. | `¿` sent to speech; a pause on part 0. |
| SEI-4 / 8, SEI-10 / 3 | `earnsStar`: 7 is false, 8 is true. `endTier(10, 9, 8, 7)` gives perfect, good, good, done. `endTexts(6, 0, 4)`: title `Kierros valmis!`, score `6 / 10 oikein`, rows `✓ 6 oikein` and `» 4 ohitettu` (no wrong row), speech `Sigue practicando`. `endTexts(0, 10, 0)` rows `0 oikein` and `10 väärin`. | A wrong row with 0. |
| D3, SEI-4 / 9, 11 | `parseStars`: `null`, `''`, `'abc'`, `'-3'`, `'Infinity'`, `'0.5'` give 0; `'2.7'` gives 2; `'12'` gives 12. `loadStars` with a storage whose `getItem` throws gives `null`; with `getStorage` itself throwing gives `null`. `saveStars` writes `'5'` under `espanja.stars` and never touches `es_stars`; a throwing `setItem` gives `false`. | `es_stars` read. |
| SEI-48 / 13 | `rightLive(r, true)` ends with `Seuraava kysymys tulee itsestään.`; `rightLive(r, false)` contains no `itsestään`. | Sentence on question 10. |
| D7 | `PRAISE` deep-equals `matikka-logic.js` `PRAISE`. | Drift. |
| Import | Importing `espanja-logic.js` and `espanja.js` in Node touches no `document`. `tests/unit/registry.test.mjs:5-12` already covers `espanja.js` through the registry. | `ReferenceError: document`. |

### 9.2 Drivers (`espanja-helpers.mjs`)

- `current(page)` parses `/^Kysymys (\d+) \/ 10: (.+)$/` from `.es-word`'s `aria-label`.
  It finds the pair by `fi` (fi2es) or `es` (es2fi) in `WORDS` and returns
  `{ n, pair, answerText, wrongText }`. `wrongText` is the text of the first option
  button that is not the answer.
- `answerRight` presses `getByRole('button', { name: 'Vastaus <answer>', exact: true })`.

No hook ships in the app.

### 9.3 E2E, `tests/e2e/espanja.spec.mjs`

| Crit. | Asserts | A failing test looks like |
|---|---|---|
| SEI-4 / 1 | fi2es, seeded round, all 10 questions: the word has no `lang="es"`; the 4 option texts are the Spanish words of the pair's topic and carry `lang="es"`; exactly one is the pair's `es`. | Finnish options. |
| SEI-4 / 2 | es2fi: the word has `lang="es"`, the options are Finnish. Mid-round `Vaihda`, then the other card: `Takaisin kysymykseen` hidden, hint `Toinen suunta alkaa uudella kierroksella.` visible; `Aloita uusi kierros` gives `Kysymys 1 / 10`, `Pisteet: 0 / 0`, direction switched. | The old round continues in the new direction. |
| SEI-4 / 3 | Over one round (Ohita × 10 to move fast), 10 distinct prompts; each hint matches its pair's topic. | A repeated word. |
| SEI-4 / 4 | Right: the chosen option has `is-right`, ✓ visible, the others `is-dim`, all 4 `disabled`. Wrong: the chosen option `is-wrong` with `text-decoration-line: line-through`, the right one `is-right`. `page.mouse.click` on a disabled option: `Pisteet` unchanged. | Option clickable twice. |
| SEI-4 / 5 | fi2es Kuuntele before answering: 4 speaks with exactly the option texts in DOM order (spoken form), the first `inDispatch: true`, each later one ≥ 450 ms after the previous `endedAt`. es2fi Kuuntele: 1 speak, the prompt. es2fi right answer: the answer tap's speak is the prompt again, `inDispatch: true`. | Options cut off at 600 ms intervals (old r. 411). |
| SEI-4 / 6, SEI-10 / 2 | Before an answer, `Seuraava` is not visible and not focusable (`visibility: hidden`). `Ohita` then `Seuraava` gives question n+1. | Seuraava usable unanswered. |
| SEI-4 / 7 | After r, w, s: `Pisteet: 1 / 3`, 3 bar blocks full. End screen `x / 10 oikein`; `Pelaa uudelleen` gives `Kysymys 1 / 10`, `Pisteet: 0 / 0`, same direction. (The criterion's old texts `Sait x/10 pistettä` and `Uusi kierros` were replaced by the approved design, design E4/E6; the test checks the design's text.) | Bar filled on Seuraava. |
| SEI-4 / 8 | `rrrrrrrrww` → `Hienoa!`, 40 confetti pieces, status `Tähtiä: 1`. `rrrrrrrwww` → `Kierros valmis!`, 0 pieces, `Tähtiä: 0`. 10/10 → `Täydellinen tulos!`, 100 pieces. Reduced motion: 0 pieces. Display: with `espanja.stars = '10'` set by `page.evaluate` before opening, desktop shows 10 star SVGs; `'11'` shows `× 11`; on `narrow`, `'3'` shows `× 3`. | 10 stars + `×11` (old format, design E8). |
| SEI-4 / 9 | Earn 1 star; `page.reload()` gives `Tähtiä: 1`. Then a **new page in the same context**, open Espanja: `Tähtiä: 1`. `localStorage.getItem('espanja.stars') === '1'`. | 0 after reload. |
| SEI-4 / 10 | Live region after `Aloita`: `Kysymys 1 / 10: <prompt>. Aihe <topic>. <how>.` After `Seuraava`: the next one. The group is named `Vastausvaihtoehdot`; each option is named `Vastaus <text>`. | No announcement on a new question. |
| SEI-4 / 11 | `localStorage.es_stars = '7'` set through `page.evaluate`, then reload, then open Espanja: `Tähtiä: 0`, empty star with `0` visible; `es_stars` still `'7'`; `espanja.stars` is `null`. | 7 stars shown. |
| SEI-9 / 4 | Seeds chosen so that `adiós`, `buenas tardes` and `por favor` are asked, both directions. Every prompt and option text collected over those rounds contains none of `moi moi`, `hei hei`, `hyvää iltaa`, `ole hyvä`; `näkemiin`, `hyvää iltapäivää` and `ole kiltti` appear. | An old form shown. |
| SEI-10 / 1 | Wrong: `Ei ihan.` and `Oikea vastaus on <answer>.` visible, ✗ icon; the speak is the pair's Spanish word. | Colour only. |
| SEI-10 / 2, 3 | `rrrrrrssss` (6 right, 4 skipped) → `6 / 10 oikein`, `✓ 6 oikein`, `» 4 ohitettu`, no wrong row, `Kierros valmis!`, `Tähti tulee, kun saat 8 oikein.`, 0 confetti, `Tähtiä: 0`. Each `Ohita` adds 1 to `Pisteet`' divisor and to the badge. | Skips counted as right. |
| Mid-round choose | Design §3.1 three button forms; card tap changes only the draft (no new round until a button). | Card tap restarts. |
| Return | Answer wrong on q3, `Etusivu` → badge `Kesken 3/10`; card → same word, same option order (compare text arrays), same feedback, 0 new speaks. Same through `Vaihda` → `Takaisin kysymykseen`. | Options reshuffled. |
| Resume, 0 done | `Aloita` (es2fi), `Etusivu`, card: no badge, the word read in the card tap (`inDispatch: true`). fi2es: no speak. | Read in fi2es. |
| Resume, end | After `Katso tulos`: no badge; return shows the same end screen, no confetti, no speak, star count unchanged (no second grant). | Second star. |
| Guard | In one `evaluate`: `Aloita` then an option click: ignored. After `settle()`: works. | Answer registered. |
| a11y names | `Ohita kysymys`, `Seuraava kysymys` / `Katso tulos`, `Vaihda suuntaa. Nyt Suomi → Espanja.`, radiogroup `Suunta`, status `Tähtiä: n`. Focus after an answer is on `Seuraava`; after a new question, on the word. | `getByRole` not found. |

### 9.4 SEI-48, `tests/e2e/auto-advance.spec.mjs`

**Shared rows**, with the Espanja driver added (es2fi). These are the same bodies as
Matikka and Sanat (R5):

| SEI-48 | Shared row (sei-3 §9.3) |
|---|---|
| 1 | "Starts and advances" (desktop timing 3990–4800 ms; bounding box unchanged; `animationDuration` `4s`) |
| 2 | "No wait" (wrong answer) |
| 4 | "Item 10" |
| 5 | "Sound not cut": the answer speak's `endedAt` < the next speak's `at`. The fake ends speech in 45 ms, so this proves order only; §10 A3 is the real check. |
| 6 | "New item": one speak, `inDispatch: false`, focus on the word, Seuraava hidden, no `aa-counting` |
| 8 | "Seuraava skips the wait", including the race |
| 9 | "Leaving cancels": Etusivu, `Vaihda`, Kuuntele, `Selvä` (nostart mode), Tab (desktop), hidden |
| — | "Does not cancel": locked option, empty area |
| 10 | "Return" |
| 12 | "Reduced motion" |
| 13 | "Screen reader": `Seuraava kysymys tulee itsestään.` |
| 14 | "Full round" (desktop; logs 9 gaps) |
| D2 | "iPad refusal simulated" (`untrusted` error and silent) |
| 15 | "Parity": Espanja's Seuraava has `aa-btn`, the wait equals the imported `AUTO_ADVANCE_MS` |

**Espanja-only rows:**

| SEI-48 | Asserts | A failing test looks like |
|---|---|---|
| 3 | `Ohita` on q2: no `aa-counting`, `Seuraava` visible, still `Kysymys 2 / 10` after 4.5 s. | Advances after a skip. |
| 7 | fi2es, right on q1, no tap: `Kysymys 2 / 10` arrives after about 4 s with **zero** new speaks. Then Kuuntele gives 4 speaks, the first `inDispatch: true`. | Finnish word sent to `es-ES` speech. |
| 9 | "starts a new round": during a wait, `Vaihda` → `Aloita uusi kierros` (after `settle`) gives `Kysymys 1 / 10`, still `Kysymys 1 / 10` 4.5 s later. | Question 2 appears in the new round. |
| 11 (desktop) | Same seed and pattern `r w s r r r r r r r` (8 right, 1 wrong, 1 skip), once moving on by timer and once by `Seuraava`. End text, rows, `Tähtiä: 1` in both, and the badge at q3 and q6 (Etusivu check) are identical. | A different `Pisteet` line. |

### 9.5 SEI-1 frame criteria, `tests/e2e/espanja-frame.spec.mjs`

| Crit. | Asserts | A failing test looks like |
|---|---|---|
| SEI-1 / 3 | `noSidewaysOverflow` on: the choose screen (all three forms); the question screen in both directions, unanswered, right, wrong and skipped, with the longest prompt (`hyvää iltapäivää` / `buenas noches`); the end screen in all three tiers. On the three device projects, every visible button's `bottom ≤ innerHeight` with the notice closed. On `narrow`: options in one column. | `Vaihda` below the fold on `desktop`. |
| SEI-1 / 4 | A whole round by `tap()` only (touch projects). `checkSizes` on each screen. | An option 40 px high on `narrow`. |
| SEI-1 / 5 | Modes `nostart`, `noend`, `absent`: a whole round to the end using the driver (it reads the accessible name, so it works with no speech). Kuuntele and Etusivu are never `disabled`. | Round stuck. |

### 9.6 Tap rule, `tests/e2e/gesture.spec.mjs`

| Crit. | Test | A failing test looks like |
|---|---|---|
| SEI-1 / 6 | Espanja card tap: 0 speaks (the choose screen is silent). | Speech on open. |
| SEI-1 / 6 | Every spoken event: Kuuntele on the choose, question and end screens; es2fi `Aloita`; an answer right and wrong; `Ohita`; `Seuraava`; `Katso tulos`; `Pelaa uudelleen`; `Aloita uusi kierros`. For each, the **first** speak has `inDispatch: true`. Every `inDispatch: false` speak is either a fi2es Kuuntele part ≥ 450 ms after the previous `endedAt`, or none (no auto-advance in this test: every right answer is followed by `Seuraava` within 1 s). | A word read from `setTimeout`. |
| SEI-1 / 6 | `:26-37` stays (reload, Kuuntele → `hola`, `es-ES`, in dispatch). | — |

### 9.7 Mutations for the hand-over

| # | Mutation | Must fail |
|---|---|---|
| M1 | `newRound` uses `sort(() => rng() - 0.5)` | unit uniformity |
| M2 | Distractors from all of `WORDS`, not the same topic | unit SEI-4 / 1 |
| M3 | `por favor` back to `ole hyvä` | unit SEI-9, e2e SEI-9 / 4 |
| M4 | `earnsStar` `>= 7` | e2e SEI-4 / 8 (7/10 gives a star) |
| M5 | `showEnd` ignores `starGiven` and is called again on return (call it from `show` when `screen === 'end'`) | "Resume, end" (second star) |
| M6 | `loadStars` reads `es_stars` | e2e SEI-4 / 11 |
| M7 | `auto.start()` also after `Ohita` | SEI-48 / 3 row |
| M8 | Remove `auto.cancel()` from `next()` | shared "Seuraava skips the wait" (Espanja driver) |
| M9 | `next({ auto: true })` reads the word without `{ auto }` | shared D2 row (Espanja) |
| M10 | Speak the prompt in fi2es on advance | SEI-48 / 7 row |

---

## 10. Verification in the real environment

Nothing deploys until the main session pushes `main`, which runs
`.github/workflows/pages.yml`. A green suite has no real speech, no real storage
persistence across a browser restart, and no iPad.

**A. Mac, main session, after the push.** On https://hakaotu.github.io/seikkailut/ in real
Chrome (Playwright `channel: 'chrome'`, headed, 1280×720, as in the SEI-2 and sei-3 checks):
1. Open Espanja. Right answer: the choose screen, `Suomi → Espanja` selected, the status
   reads `Tähtiä: 0` (fresh context). Kuuntele: record
   `speechSynthesis` utterance `voice.name`. Expected: Mónica or a Mónica Enhanced/Premium
   voice, never a toy voice (SEI-45 / 2, / 4 for Espanja).
2. fi2es, answer all 10 right and tap nothing in between. Record:
   - each answer click with a capture `click` listener;
   - each change of `.es-word`'s `aria-label` with a `MutationObserver`.

   Right answer: 9 gaps, each 4000–4300 ms; `Katso tulos` waits; tap → `Täydellinen
   tulos!` and `Tähtiä: 1`. Then reload → still `Tähtiä: 1`.
3. es2fi with the E8 seed (injected with the same init script as `seedRandom`), so that
   `buenas tardes` comes up. On the right answer to it, wrap `speak` to log `onend` times.
   Right answer:
   - the answer's `onend` comes before the next question's `speak` (SEI-48 / 5);
   - the answer reading is shorter than 4000 ms (record ms);
   - the new word is heard (SEI-48 / 6).
4. One round `rrrrrrssss`: `6 / 10 oikein`, `» 4 ohitettu`, no star (SEI-10 / 3).
5. With the same seed, `por favor` shows `ole kiltti` and `buenas tardes` shows
   `hyvää iltapäivää` (SEI-9 / 4).

Record the date, URL, commit, Chrome version, voice name, seed and the numbers.

**B. Owner, Mac (one look and listen).** "Open Espanja, choose Espanja → Suomi, press
Aloita and answer the first question right, then tap nothing. Do you hear the Spanish word,
does the button fill up, and does the next word come and get read by itself: yes / no?"

**C. Owner, Mac, a later day (one look).** "Open Espanja again: does the top bar still show
the star you got: yes / no?" This is SEI-4 / 9 across a real browser restart. The main
session cannot see the owner's browser storage, so only he can answer.

**D. iPad (pending; no iPad available).** These add to sei-3 §10 C. One step per message,
when an iPad is at hand:
1. Espanja, Espanja → Suomi, `Aloita`: is the word heard from that tap?
2. Answer right, tap nothing: is the next word read aloud (timer-started speech)? If not,
   does Kuuntele still say `Kuuntele`, with no yellow notice (D2)?
3. After earning a star, close Safari fully and reopen the site: is the star still there?

Record the iPad model, iOS version and date.

**Closing proposal, by precedent** (SEI-1, SEI-2 closed on Mac observations, Q15 and Q24):
- SEI-4, SEI-9 and SEI-10 close on A + C;
- SEI-48 closes on A2–A3 + B;
- D is recorded when it happens.

---

## 11. Alternatives considered

| Alternative | Rejected because |
|---|---|
| Extract `guard`, confetti and button CSS into a shared module now (sei-3 §14.1) | D5: one of the two copies did not exist when this was planned, no criterion asks for it, and it reopens verified Matikka and fresh Sanat inside an Espanja review. It is scheduled as debt with a trigger instead (§13). |
| Import `PRAISE` from `matikka-logic.js` | It would be the first dependency between games. A copy pinned by a test gives the same guarantee and keeps games independent (D7). |
| Store options as strings and compare text (old r. 324) | It depends on unique texts, which held only after SEI-9. Identity cannot break (D2). |
| Key `es_stars` (old) | Registry rule 6 requires the game-id prefix. Reading it would also contradict Q33. |
| Grant the star on the 10th answer | Design §3.7: the star comes when the end screen first shows. Reload before `Katso tulos` gives no star. |
| Render the status stars from JS on `resize` | It needs a window listener, kept between show and hide. Two pre-rendered forms toggled by a CSS media query need nothing. |
| A per-game auto-advance in Espanja | SEI-48 / 15, design §3.5: one implementation. |
| Read the new fi2es question aloud on advance | Design §3.8: Finnish cannot be spoken in `es-ES`, and reading 4 options takes about 6.5 s. SEI-48 / 7 requires no reading. |
| Keep `placeholder.js` "just in case" | Dead code. Its CSS comment already says it goes when SEI-4 lands. |
| A test-only delay override for the 4 s | Architecture L85 (no test hooks). The same choice as sei-3 D5. |

---

## 12. Risks

- **R-A. The riskiest step is E7, because it is built against code this plan could not
  read in its final form.** §2 R1–R5, R8 and R9 are the guard. If sei-3's landed
  controller, CSS or test drivers differ, the developer adapts the naming or stops.
- **R-B. The timer overtakes slow tests (sei-3 R2).** E3 says how to write tests that
  survive E7; E7.5 says how to fix the ones that do not.
- **R-C. Specificity.** The `aa-counting` look must beat `.game-view[data-game='espanja']
  .es-primary` (0,3,0). R2 checks the landed selector. E7.1 checks the bounding box and
  the colours visually against design §3.5.
- **R-D. Espanja's brand red equals "wrong" red** (design §4). This is a design choice,
  not a code risk. The tests check ✗, the strike-through and the text, not colour only.
- **R-E. `localStorage` on iPad Safari** can be cleared after weeks without use (backlog
  risk). It is not testable here. §10 D3 covers the restart case only.
- **R-F. Timer-started speech on iPad** (SEI-48 risk, es2fi only). D2 keeps the UI honest.
  §10 D2 settles it.
- **R-G. Run time.** About 14 shared rows plus 4 Espanja rows × about 5 s × 4 projects,
  plus 2 desktop full rounds × about 40 s. That is an estimate, not a measurement; E8
  records the real total against E0.
- **R-H. Two tabs** can lose a star (design §6, accepted).

---

## 13. Debt (outside scope; for `docs/tech-debt.md`, which is outside my write boundary)

Severity is the architect's opinion about the debt, not a symptom. None of these has been
seen to harm anyone.

1. **Three copies of the game scaffolding** (`mk-`, `sn-`, `es-`): the tap guard, confetti,
   and the primary / secondary / option button CSS. This updates sei-3 §14 item 1 with a
   firm trigger. *Medium:* a fix to one copy will be missed in the others.
   - *When:* one refactor task after SEI-4 is `done`. Shape it as `games/kit.js`
     (`createGuard`, `createConfetti`) plus unscoped `g-` button classes.
   - *Safety net:* the three games' e2e suites, unchanged.
2. **`fromTap` in `shell.js` means "from Kuuntele"** (sei-3 §14 item 2). It is still open
   and not touched here. *Low.*
3. **TD-4** (the notice's live region). It is not touched; this plan does not modify
   `shell.js`. *Medium for screen-reader users,* as recorded.
4. **Game timers cannot use `page.clock`** (sei-3 §14 item 4). Espanja adds about 18 more
   real-time 4 s waits. *Low, run time only.*
5. **Stars are shared by everyone on the device** until profiles (SEI-11) exist (design §6).
   This is a known limit, not debt to fix here.

---

## 14. Open questions

**For the owner: none.** The business rules are settled:
- Q31: the Espanja design, including auto-advance with the same rules;
- Q32: the translations;
- Q33: old stars start from zero;
- Q25 / Q28 / Q29: the shared auto-advance rules.

**For the main session (not the owner):**
- **O1. The `verifying` rule.** This plan starts after sei-3. If SEI-3/7/8/47 (or SEI-46)
  are still `verifying`, the owner's rule says not to start the next task. Settle that
  before handing E0 to the developer.
- **O2.** Push E0–E8 together (default), or SEI-4/9/10 at E6 and SEI-48 after E7?
- **O3.** SEI-4 criterion 7's texts (`Sait x/10 pistettä`, `Uusi kierros`) were replaced by
  the approved design (`x / 10 oikein`, `Pelaa uudelleen`; design E4/E6, Q31). The tests
  check the design's text. pm may want to note this in the task so that the reviewer does
  not read it as a miss.
