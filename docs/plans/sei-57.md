# Plan: SEI-57 – Espanja: choose a topic before the round

Task: SEI-57, `docs/backlog.md` section E (criteria 1-5, 8, 9; criteria 6-7 are
option B and do not apply, Q55). Owner-approved design: `docs/design/sei-57.md`
(+ `.html`), Q56 "ok" 2026-10-27, approved as is. Star rule Q57 = option 1:
threshold = 80 % of the round length rounded up (8/10, 7/8, 6/7). Answers in
`docs/questions.md` Q55-Q57. Written 2026-10-27 against `main` at `c364228`.

## 1. Context and constraints

What exists now (read, with lines):

- `app/src/games/espanja-logic.js:5` `MAX_QUESTIONS = 10`. `:10-95` `WORDS`, 79
  pairs `{es, fi, topic}`, topics in this order: `tervehdys` 8, `väri` 10,
  `numero` 12, `eläin` 16, `ruoka` 16, `viikonpäivä` 7, `perhe` 10 (the counts
  and order are asserted by `tests/unit/espanja-logic.test.mjs:115-121`).
- `newRound(direction, rng)` (`:124-133`): `shuffle(WORDS, rng).slice(0, MAX_QUESTIONS)`,
  then for each pair the wrong options are 3 of
  `WORDS.filter(w => w !== pair && w.topic === pair.topic)`. Returns
  `{direction, questions, index, endShown, starGiven}`. Wrong options are already
  always from the question's own topic.
- Hard-coded 10 in the logic: `endTier` `:200-204` (`a >= MAX_QUESTIONS`,
  `a >= 8`), `earnsStar` `:206` (`a >= 8`), `endTexts` `:224`, `:226`
  (`${a} / ${MAX_QUESTIONS}`), `:228` (`saat 8 oikein`), `questionLive` `:253`,
  `endLive` `:277-278`. `listenParts('end')` calls `endTexts(a, b, c)` at `:182`.
- `chooseHint(draftDir, round)` `:238-240` knows only the direction.
- `app/src/games/espanja.js:25` `WORD_LINE` (`Sanat: 7 aihetta (79 sanaa)`), shown
  at `:100` in `.es-words` under the direction cards.
- State `:77-78`: `direction` (committed) and `draft` (choose-screen copy). No
  topic.
- Hard-coded 10 in the screens: the bar is built with
  `'<i></i>'.repeat(MAX_QUESTIONS)` at `:110`; `renderHud` `:230`;
  `renderAnswerState` `:303` (`last`); `renderQuestion` `:314` (word label);
  `beginRound` `:403`, `answer` `:413` and `:421` (`waits`), `skipQuestion`
  `:435`, `next` `:448`, `showEnd` `:472` (`reportProgress` totals and the last
  index).
- `renderChoose` `:213-224`: `backBtn.hidden = !(open && round.direction === draft)`.
- `renderQuestion` `:322`: `Vaihda` label `Vaihda suuntaa. Nyt {dir}.`
- End screen `:124-128`: `Pelaa uudelleen` and `.es-new-dir` `Vaihda suuntaa`;
  `.es-dir-end` shows the direction only (`renderEnd` `:350-351`).
- `openChoose` `:482-488` copies `direction` into `draft`; `startFromDraft`
  `:490-493` commits it; `beginRound` `:398-407` uses the committed value, so
  `Pelaa uudelleen` (`:514`) keeps it.
- `shell.js:24-30` `badgeFor` prints `Kesken {done}/{total}` from whatever
  `total` the game reports, so `Kesken 3/7` needs no shell change.
- Sanat's pattern being reused (`app/src/games/sanat.js`): `themeButtonHtml`
  `:68-76` (`role="radio"`, emoji span `aria-hidden`, name span, `.sn-tick`),
  radiogroup `:129`, `settings`/`draft` `:98-99`, `backBtn.hidden = !open ||
  draft.theme !== round.theme` `:301`; text helpers `selectionLine`,
  `selectionLabel`, `changeLabel`, `chooseHint` live in `sanat-logic.js`
  (imported `:20`). `THEME_UI` (pictures) sits in `sanat.js:44-47`.
- CSS: shared shadow / pressed / focus selector lists `app/styles/app.css:60-163`
  (every game button class is listed by hand). Espanja choose screen
  `:1395-1437`: `.es-choose { gap: 8px }`, `.es-group-label` (22 px, **no
  height or line-height set**) `:1396`, `.es-dirs` `margin-bottom: 4px` `:1397`,
  `.es-tick` 28 px at 10 px `:1421-1435`, `.es-words` `:1436`, hint 30 px
  `:1437`. Bar `:1443-1445` (`flex: 1` blocks, so hiding blocks widens the rest).
  `[hidden] { display: none !important }` `:21`.
- Tests that pin the round to 10: `tests/e2e/espanja-helpers.mjs:18`
  (`/^Kysymys (\d+) \/ 10: (.+)$/`) and `:82` (`/^[rws]{10}$/`).

Must not break:

- **Criterion 1/2: with `Kaikki aiheet` (the default) a round is exactly
  today's**: same draw for the same random numbers, 10 questions, star at 8.
  This is also what keeps every fixed-seed e2e test valid (§6.3).
- The tap rule (`docs/architecture.md` "Navigation and the tap rule"): tiles
  speak nothing; `Aloita` speaks as now.
- The 500 ms tap guard on every Espanja handler (`guarded`, `espanja.js:182-185`).
- The desktop choose screen must still fit 1280 x 720 with no vertical scroll
  (`tests/e2e/espanja-frame.spec.mjs:69-78`). This is the tight one (§5 step 5).
- Stars stay one count under `espanja.stars`; nothing new in `localStorage`.

## 2. Files to create or modify

| Path | Change |
|---|---|
| `app/src/games/espanja-logic.js` | Add `ALL_TOPICS`, `TOPICS`, `wordsIn`, `roundLength`, `starThreshold`, `topicName`, `topicLine`, `selectionLine`, `selectionLabel`, `changeLabel`. Change `newRound`, `endTier`, `earnsStar`, `endTexts`, `listenParts`, `chooseHint`, `questionLive`, `endLive` (§3). `MAX_QUESTIONS` stays 10 and now means "the longest round". |
| `app/src/games/espanja.js` | `topic` / `draftTopic` state; topic tiles and the header row on the choose screen; remove `WORD_LINE` and `.es-words`; every round-length use reads `round.questions.length`; end screen `Vaihda valintoja` and the selection line; `Vaihda` label (§4). |
| `app/styles/app.css` | Add `.es-topic` to the four shared lists (`:60-163`); new rules for `.es-topic-head`, `.es-topic-line`, `.es-topics`, `.es-topic`, `.es-topic-emoji`, `.es-topic-name`, the smaller tick; pin `.es-group-label` height; `.es-dirs` margin-bottom 4 → 0; delete `.es-words` (`:1436`); breakpoints < 600 and < 420 (§5 step 5). |
| `tests/unit/espanja-logic.test.mjs` | Update the callers of changed signatures; new tests (§6.1). |
| `tests/e2e/espanja-helpers.mjs` | `current()` reads any round length and returns `total`; `startRound` takes `topic`; `playRound` accepts any length equal to the round's (§6.2). |
| `tests/e2e/espanja.spec.mjs` | Four existing tests change only expected text (§6.2). |
| `tests/e2e/espanja-topics.spec.mjs` | **New file.** The SEI-57 e2e tests (§6.2). |
| `tests/e2e/espanja-frame.spec.mjs` | Extra states in `eachScreen` and one short-round end screen (§6.2). |

Nothing else changes: `shell.js`, `registry.js`, `auto-advance.js`,
`speech.js`, other games.

## 3. Data model / API / contract changes (`espanja-logic.js`)

**Topic table** (new, pure data, after `WORDS`). Kept in the logic file, not in
`espanja.js` like Sanat's `THEME_UI`, because the unit test that "every topic in
`WORDS` has a tile" must import it in Node, and the line/label text builders
that use the names belong beside the other text builders here.

```js
export const ALL_TOPICS = 'kaikki';
// design sei-57 §3.1: order = WORDS order; `label` is the tile text (soft hyphens for < 420 px), `name` the accessible name
export const TOPICS = [
  { id: 'kaikki',      emoji: '🎲', label: 'Kaikki',              name: 'Kaikki aiheet' },
  { id: 'tervehdys',   emoji: '👋', label: 'Terveh­dykset',  name: 'Tervehdykset' },
  { id: 'väri',        emoji: '🎨', label: 'Värit',               name: 'Värit' },
  { id: 'numero',      emoji: '🔢', label: 'Numerot',             name: 'Numerot' },
  { id: 'eläin',       emoji: '🐶', label: 'Eläimet',             name: 'Eläimet' },
  { id: 'ruoka',       emoji: '🍎', label: 'Ruoka',               name: 'Ruoka' },
  { id: 'viikonpäivä', emoji: '📅', label: 'Viikon­päivät',  name: 'Viikonpäivät' },
  { id: 'perhe',       emoji: '👪', label: 'Perhe',               name: 'Perhe' },
];
```

Emoji code points exactly as design §3.1 (U+1F3B2, 1F44B, 1F3A8, 1F522, 1F436,
1F34E, 1F4C5, 1F46A), no U+FE0F. `pair.topic` strings are **not** changed (the
hint line `Aihe: viikonpäivä.` shows them, design §3.3).

**New functions:**

- `wordsIn(topic)` = `topic === ALL_TOPICS ? WORDS : WORDS.filter(w => w.topic === topic)`.
  For `kaikki` it returns `WORDS` itself (same array, same order), which is what
  keeps the draw identical.
- `roundLength(topic)` = `Math.min(MAX_QUESTIONS, wordsIn(topic).length)`.
  kaikki 10, tervehdys 8, väri 10, numero 10, eläin 10, ruoka 10,
  viikonpäivä 7, perhe 10.
- `starThreshold(n)` = `Math.ceil((4 * n) / 5)`. Integer arithmetic on purpose:
  `0.8 * n` is a float product and a future `n` could land on `x.0000000001`
  and round up one too many. 10 → 8, 8 → 7, 7 → 6 (Q57).
- `topicName(topic)` = the `name` from `TOPICS`.
- `topicLine(topic)`: `` `${name}: ${s} sanaa` `` plus
  `` `, kierroksessa ${s} kysymystä` `` when `s < MAX_QUESTIONS`, `s = wordsIn(topic).length`
  (design §3.2). `Kaikki aiheet: 79 sanaa`, `Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä`.
- `selectionLine(topic, dir)` = `` `${topicName(topic)} · ${DIRECTIONS[dir].name}` `` (end screen, design §3.4).
- `selectionLabel(topic, dir)` = `` `Aihe ${lower(name)}. Suunta ${DIRECTIONS[dir].name}.` `` (design §8).
- `changeLabel(topic, dir)` = `` `Vaihda aihetta tai suuntaa. Nyt ${lower(name)}, ${DIRECTIONS[dir].name}.` `` (design §8).
  `lower` = `toLocaleLowerCase('fi')`; every name is one or two common nouns,
  so lower case is the right Finnish form (`kaikki aiheet`, `viikonpäivät`).
  The names match Sanat's helpers on purpose (`sanat-logic.js`, imported at
  `sanat.js:20`).

**Changed signatures** (every caller is listed; nothing outside Espanja and its
tests calls these):

| Function | Before | After | Callers |
|---|---|---|---|
| `newRound` | `(direction, rng)` | `(direction, topic, rng)`; result gains `topic` | `espanja.js:400`; unit test `:149`, `:165`, `:179`, `:218`, `:289`, `:356` |
| `endTier` | `(a)` | `(a, n)` | `endTexts`; unit `:313` |
| `earnsStar` | `(a)` | `(a, n)` | `endTexts`, `espanja.js:344`, `:465`; unit `:311-312` |
| `endTexts` | `(a, b, c)` | `(a, b, c, n)` | `listenParts :182`, `endLive`, `espanja.js:328`, `:475`; unit `:317`, `:328-335` |
| `chooseHint` | `(draftDir, round)` | `(draftDir, draftTopic, round)` | `espanja.js:219`; unit `:344-351` |

`n` has **no default**. A default of 10 would let a missed call site silently
give a 7-question round a 10-question end screen; without one, a missed site
gives `NaN` comparisons and fails the tests below.

`newRound` body after the change (the hard constraint is the first line: same
array, same `shuffle` call, so the same numbers are consumed for `kaikki`):

```js
const questions = shuffle(wordsIn(topic), rng)
  .slice(0, roundLength(topic))
  .map((pair) => { /* unchanged: wrong options from WORDS of pair.topic */ });
return { direction, topic, questions, index: 0, endShown: false, starGiven: false };
```

With a single topic, `pair.topic === topic` for every question, so the wrong
options are from the chosen topic with no further change (criterion 3). With
`n` = topic size (väri, perhe, tervehdys, viikonpäivä) every word of the topic
appears exactly once (design §4, §6).

**Round length is derived, never stored**: everywhere it is
`round.questions.length`. `questionLive` and `endLive` use it;
`endTier(a, n)`: `a >= n` perfect, `a >= starThreshold(n)` good, else done;
`earnsStar(a, n)` = `a >= starThreshold(n)`; `endTexts` uses `n` in
`scoreNumber`, `score` and `starLine` (`Tähti tulee, kun saat ${starThreshold(n)} oikein.`);
`endLive` the same sentence. For `n = 10` every text is byte-identical to now.

`chooseHint(draftDir, draftTopic, round)`: `''` when `!round || round.endShown`;
otherwise, first match (design §3.1): both differ → `Toinen aihe ja suunta
alkavat uudella kierroksella.`; topic differs → `Toinen aihe alkaa uudella
kierroksella.`; direction differs → `Toinen suunta alkaa uudella kierroksella.`
(unchanged text); else `''`.

**Game contract:** `reportProgress({done, total, finished})` now reports
`total = n` (7 or 8 for short topics). The contract already allows any total;
`badgeFor` prints it. No other contract change.

## 4. Behaviour in `espanja.js`

**State** (next to `:77-78`): `let topic = ALL_TOPICS; let draftTopic = topic;`
Kept in the `create` closure like `direction`: survives going to the front page
and back, gone on reload (design §3.1 "muistetaan istunnon ajan"). Nothing is
written to storage.

**Choose screen DOM** (`:97-107`), in this order (design §3.1, DOM order =
visual order = Tab order, design §8):

1. `<div class="es-topic-head"><div class="es-group-label">Aihe</div><div class="es-topic-line" id="es-topic-line"></div></div>`
2. `<div class="es-topics" role="radiogroup" aria-label="Aihe">` + one button per `TOPICS` entry:
   `<button type="button" class="es-topic" role="radio" aria-checked="false" aria-label="{name}" aria-describedby="es-topic-line" data-topic="{id}">`
   `<span class="es-topic-emoji" aria-hidden="true">{emoji}</span><span class="es-topic-name">{label}</span><span class="es-tick" aria-hidden="true">{CHECK}</span></button>`
3. existing `Suunta` label, `.es-dirs`, hint, actions. **Delete** the `.es-words`
   line (`:100`) and `WORD_LINE` (`:25`).

`aria-label` is set on **every** tile, not only `Kaikki`: the visible label of
two tiles contains a soft hyphen, and an accessible name computed from content
could carry it into the name a screen reader or a Playwright `name` match sees.

The `id` is a deliberate first in a game module. `aria-describedby` needs an
id; the element-reference alternative (`ariaDescribedByElements`) is not safe
to assume in older iPad Safari. It is unique because exactly one Espanja view
exists per page; a failed view is removed before `create` runs again
(`shell.js:273-274`). The registry rule (`architecture.md`: "no globals or
`getElementById`") is about lookups, and none is added: the element is still
found with `root.querySelector('.es-topic-line')`.

**renderChoose** (`:213-224`) adds: each tile `aria-checked` / `is-selected`
from `draftTopic`; `topicLineEl.textContent = topicLine(draftTopic)`;
`chooseHintEl.textContent = chooseHint(draft, draftTopic, round)`;
`backBtn.hidden = !(open && round.direction === draft && round.topic === draftTopic)`.

**Listeners** (`:502-507`): each tile `click` → `guarded(() => { draftTopic = b.dataset.topic; renderChoose(); })`.
No speech, no focus move, nothing started.

**openChoose** (`:482-488`): also `draftTopic = topic`. **startFromDraft**
(`:490-493`): also `topic = draftTopic`. **beginRound**: `newRound(direction, topic)`.
`backToRound` unchanged (it is only reachable when nothing differs).

Mid-round change, all cases: tile and card taps change only the draft; the
round is untouched until `Aloita uusi kierros`; tapping back to the round's
topic and direction brings `Takaisin kysymykseen` back and empties the hint
(design §6 last-but-one bullet). This is the existing direction mechanism with
one more field.

**Round length** — replace every `MAX_QUESTIONS` in `espanja.js` with
`total()` = `round.questions.length`:

- `:230` bar label `${done} kysymystä ${n}:stä tehty`, with
  `n = round ? total() : MAX_QUESTIONS` (`renderHud` runs at `create`, `:521`,
  before any round exists).
- `:303` `last = round.index === total() - 1`.
- `:314` `Kysymys ${i} / ${total()}: …`.
- `:403`, `:413`, `:435` `reportProgress` `total: total()`; `:472` `{done: total(), total: total(), finished: true}`.
- `:421` `waits = round.index < total() - 1` (no wait on the last question of a
  7- or 8-question round either).
- `:448` `round.index === total() - 1` → `showEnd`.
- `:344`, `:465` `earnsStar(a, total())`; `:328`, `:475` `endTexts(a, b, c, total())`.
- Bar (`:110`): keep building `MAX_QUESTIONS` blocks once. In `renderHud`
  toggle `hidden` on blocks `i >= n` (`n` = `round ? total() : MAX_QUESTIONS`).
  `[hidden]` is `display: none` and the blocks are `flex: 1`, so 7 blocks fill
  the same width (design §3.3). After this step `MAX_QUESTIONS` is used in
  `espanja.js` only for the bar's node count.

**Question screen labels**: `:322` `changeBtn` `aria-label` = `changeLabel(round.topic, dir)`.
Visible text `Vaihda` unchanged.

**End screen** (`:126-128`, `renderEnd` `:350-351`): button text `Vaihda
valintoja` (class `es-new-dir` kept so no CSS moves); `dirEnd.textContent =
selectionLine(round.topic, round.direction)`, `aria-label =
selectionLabel(…)`. `Pelaa uudelleen` unchanged (`beginRound` uses the
committed `topic` and `direction`, criterion 8).

**Kuuntele** on the choose screen: unchanged (`hola`, design §3.1).

## 5. Ordered steps

Each step ends with a check that must pass before the next starts.

1. **Logic: topics and the draw.** Add `ALL_TOPICS`, `TOPICS`, `wordsIn`,
   `roundLength`; change `newRound` to `(direction, topic, rng)` and record
   `topic`. Update `espanja.js:400` to `newRound(direction, ALL_TOPICS)` for
   now. Update the six unit callers to pass `'kaikki'`. Add unit tests U1-U4
   (§6.1). *Check:* `npm run test:unit` green; `npx playwright test
   tests/e2e/espanja.spec.mjs --project=desktop` green with no test edits
   (proves the default draw did not move).
2. **Logic: round length in texts and stars.** Add `starThreshold`; change
   `endTier`, `earnsStar`, `endTexts`, `endLive`, `questionLive`, `listenParts`
   as §3; add `chooseHint` topic argument and `topicName`, `topicLine`,
   `selectionLine`, `selectionLabel`, `changeLabel`. In `espanja.js` replace
   every round-length use (§4 list) with `total()` and pass `n`; pass
   `draftTopic` (still always `kaikki`) to `chooseHint`. Update unit tests
   `:310-340`, `:344-351`, `:355-388` to the new signatures; add U5-U9.
   *Check:* `npm run test:unit` green; `npx playwright test
   tests/e2e/espanja.spec.mjs tests/e2e/auto-advance.spec.mjs --project=desktop`
   green with no test edits (every default-round text is unchanged).
3. **Screens: state, tiles, end screen.** State, tile DOM, header row, removal
   of `.es-words`/`WORD_LINE`, listeners, `renderChoose`, `openChoose`,
   `startFromDraft`, `beginRound(topic)`, `Vaihda` label, end-screen button and
   line (§4). Update the four existing e2e tests whose text changes (§6.2
   "changed"). No CSS yet. *Check:* `npx playwright test
   tests/e2e/espanja.spec.mjs tests/e2e/gesture.spec.mjs --project=desktop`
   green. (Layout is unstyled; the frame spec is expected to fail until step 5.)
4. **Helpers.** Generalise `current`, `startRound`, `playRound` (§6.2).
   *Check:* `npx playwright test tests/e2e/espanja.spec.mjs
   tests/e2e/espanja-frame.spec.mjs tests/e2e/auto-advance.spec.mjs
   --project=ipad-portrait` — `espanja.spec` and `auto-advance` green (ipad-portrait has height to spare, so the frame spec there tests the helpers, not the budget).
5. **CSS and the height budget — the hard step.** See below. *Check:* the
   frame spec on all four projects (§6.2) and the measurement in 5e.
6. **New e2e file** `tests/e2e/espanja-topics.spec.mjs` (§6.2). *Check:* it is
   green on all four projects, and each test fails when its mutation in §6.2 is
   applied (the developer tries at least the threshold and the
   `backBtn` mutation).
7. **Frame spec states** (§6.2). *Check:* `npx playwright test
   tests/e2e/espanja-frame.spec.mjs` green on all four projects.
8. *Check:* `npm test` green, all projects.

### Step 5 in detail (CSS, and why it is the risk)

Design §7 budgets the desktop choose screen at **546 px of 548**. Today the
screen uses about 390 (design `sei-4.md:234-235`), so no current test has ever
been near the limit, and two of the heights the design counts are not fixed in
the CSS today: `.es-group-label` has no height or line-height (`app.css:1396`),
so its height is the font's "normal" line height for 22 px of `Chalkboard SE` /
`Comic Sans MS` / fallback, which differs per machine and per browser; and the
design counts 8 px after the direction cards while the code has `gap 8 +
margin-bottom 4` = 12 (`:1395`, `:1397`). Counting the code as it would be
without changes: 28 + 148 + 28 + 128 + 30 + 64 + 5 gaps × 8 + 4 + 4 = 474 in the
root, 550 with the question row, **2 px over**. So:

- 5a. Shared lists (`:60-163`): add `.es-topic` to the shadow, `:active`,
  `:focus` and `:focus-visible` lists, as `.es-dir` is.
- 5b. Pin the label heights the budget counts:
  `.es-group-label { height: 28px; line-height: 28px; }` (applies to `Suunta`
  too, as the design's 28 assumes); `.es-topic-head { display: flex;
  align-items: center; justify-content: space-between; gap: 12px; height: 28px; }`;
  `.es-topic-line { font-size: 20px; color: var(--grey); white-space: nowrap; }`.
- 5c. Spacing to the design's numbers: `.es-topics { display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 4px; }`
  (8 gap + 4 = the design's 12 after the tiles); `.es-dirs` `margin-bottom: 4px` → `0`
  (the design's 8 after the cards; this is the only visible change to existing
  spacing, 4 px).
- 5d. The tile: `--shadow: 0 4px 0 #c9cbd6; position: relative; display: flex;
  flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-width: 0; height: 68px; padding: 0 6px; border: 3px solid #c9cbd6;
  border-radius: 18px; background: #fff; color: var(--ink);`
  `.es-topic-emoji { font-size: 26px; line-height: 1; }`
  `.es-topic-name { font-size: 20px; font-weight: bold; line-height: 1.1; white-space: nowrap; }`
  Selected: `.es-topic.is-selected { --shadow: 0 4px 0 var(--brand-dark); border: 4px solid var(--brand); background: var(--brand-light); }`
  and `.es-topic.is-selected .es-tick { display: flex; }`; smaller tick
  `.es-topic .es-tick { top: 6px; right: 6px; width: 24px; height: 24px; }`
  with its svg 16 px. (`--brand` etc. are Espanja's red, `app.css:18`, which is
  the design's `#c62828` / `#8e0000` / `#fdeceb`.)
- `< 600 px` (inside the existing block `:1585-1611`): `.es-topic-head {
  flex-direction: column; align-items: flex-start; height: auto; gap: 0; }`,
  `.es-topic-line { font-size: 18px; white-space: normal; }`, `.es-topics {
  grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }`,
  `.es-topic-name { font-size: 18px; }`.
- `< 420 px` (`:1625-1631`): `.es-topic { height: auto; min-height: 68px; padding: 6px; }`,
  `.es-topic-name { white-space: normal; text-align: center; }` (breaks only at
  the soft hyphen, design §6).
- Delete `.es-words` (`:1436`).
- 5e. **Measure before trusting the frame spec.** On `desktop` (1280 x 720) and
  `ipad-landscape` (1180 x 770), in the choose state with no round, log
  `document.documentElement.scrollHeight`, `innerHeight`, and the
  `getBoundingClientRect().bottom` of `.es-start`, and write the three numbers
  with the project name into the PR / handover. Right answer: scrollHeight ≤
  innerHeight and `.es-start` bottom ≤ innerHeight on both. Also log the
  `scrollWidth` vs `clientWidth` of each `.es-topic-name` on `desktop` with
  `Tervehdykset` selected (4 px border, narrowest inner width): scrollWidth ≤
  clientWidth, else the name is clipped or spills.
- **If 5e does not fit, stop.** Do not shrink tiles, drop gaps or change type
  sizes on your own: those are the design's numbers and the owner approved the
  screen. Report the measured overflow and the line it comes from; the fix
  goes back to the designer.

## 6. Test plan

### 6.1 Unit (`tests/unit/espanja-logic.test.mjs`)

Updated callers: `newRound('fi2es', seeded(s))` → `newRound('fi2es', 'kaikki', seeded(s))`
(`:149`, `:165`, `:179`, `:218`, `:289`, `:356`); `earnsStar(7)` → `earnsStar(7, 10)`
etc. (`:311-313`); `endTexts(…)` gain `, 10` (`:317`, `:328-335`); `chooseHint`
gains `'kaikki'` (`:344-351`). Expected values do not change.

| # | Criterion | Test | A failing run looks like |
|---|---|---|---|
| U1 | 5 | `TOPICS` ids are `['kaikki', ...TOPICS-in-WORDS-order]` (use the test's own `TOPICS` at `:23`); names, labels without `­`, and emoji equal design §3.1 row by row; every `WORDS` topic has an entry; every topic has ≥ 4 words. | Adding a topic to `WORDS` without a tile fails "every WORDS topic has an entry", not a blank tile on screen. |
| U2 | 4 | `roundLength` per topic = `[10, 8, 10, 10, 10, 10, 7, 10]`. | `roundLength('viikonpäivä')` 10 → the 7-round criterion is broken. |
| U3 | 3, 4 | For each of the 7 topics × both directions × seeds 1-200 (2 800 rounds): `questions.length === roundLength(topic)`; `round.topic === topic`; every `q.pair.topic` and every option's topic is the chosen topic; 4 distinct options, exactly one `=== q.pair`, 4 distinct `fi` and 4 distinct `es`; pairs distinct. For `väri`, `perhe`, `tervehdys`, `viikonpäivä`, the set of pairs equals `wordsIn(topic)`. | Message names direction, topic and seed, e.g. `es2fi viikonpäivä seed 17: 'rojo' beside 'lunes'`. |
| U4 | 1, 2 | Kaikki is today's draw: for seeds 1-200 and both directions, `newRound(dir, 'kaikki', seeded(s))` deep-equals a reference copy of the pre-SEI-57 function (pasted into the test, using the exported `shuffle` and `WORDS`), minus the new `topic` field. | Any change in how many random numbers the default path consumes fails here first, before e2e seeds 5 / 22 / 826 silently pick other words. |
| U5 | 4 | `starThreshold` 10→8, 8→7, 7→6; `earnsStar`: (8,10) t, (7,10) f, (7,8) t, (6,8) f, (6,7) t, (5,7) f; `endTier` (7,7) perfect, (6,7) good, (5,7) done, (8,8) perfect, (7,8) good, (6,8) done, and 10/9/8/7 of 10 as now. | `Math.round(0.8*n)` would give 8→6: fails (6,8) f. |
| U6 | 4, 8 | `endTexts(5, 2, 0, 7)`: `score` `5 / 7 oikein`, `scoreNumber` `5 / 7`, `starLine` `Tähti tulee, kun saat 6 oikein.`; `endTexts(0, 7, 0, 7).rows` `0 oikein`, `7 väärin`; `endTexts(6, 0, 1, 7).title` `Hienoa!`. | A leftover `MAX_QUESTIONS` prints `5 / 10`. |
| U7 | 4, 9 | On `newRound('fi2es', 'viikonpäivä', seeded(5))`: `questionLive` = `Kysymys 1 / 7: {fi}. Aihe viikonpäivä. Valitse espanjaksi.`; after 6 right + 1 skipped `endLive(round, true, 5)` = `Hienoa! 6 / 7 oikein. 1 ohitettu. Sait tähden! Tähtiä nyt 5.`; after 5 right + 2 wrong `endLive(round, false, 0)` = `Kierros valmis! 5 / 7 oikein. Tähti tulee, kun saat 6 oikein.` (design §8). | |
| U8 | — (design 3.1) | `chooseHint` four branches with an open round, plus `''` for `null` and for `endShown`. | |
| U9 | 9 | `topicLine` for kaikki, eläin, värit, tervehdys, viikonpäivä exactly as design §3.2; `selectionLine('viikonpäivä','fi2es')` `Viikonpäivät · Suomi → Espanja`; `selectionLine('kaikki','es2fi')` `Kaikki aiheet · Espanja → Suomi`; `selectionLabel` `Aihe viikonpäivät. Suunta Suomi → Espanja.`; `changeLabel` `Vaihda aihetta tai suuntaa. Nyt viikonpäivät, Suomi → Espanja.` and `… Nyt kaikki aiheet, Suomi → Espanja.` | |

### 6.2 E2E

**Helpers** (`espanja-helpers.mjs`): `current` regex
`/^Kysymys (\d+) \/ (\d+): (.+)$/`, returns `total` too. `startRound(page,
testInfo, { direction, topic, start })`: if `topic` is given, press
`.es-topic[data-topic="…"]` first. `playRound`: `expect(pattern).toMatch(/^[rws]+$/)`
and, before the first move, `expect(pattern.length).toBe((await current(page)).total)`.
Existing callers all pass 10 characters on 10-question rounds, so they keep working.

**Changed in `espanja.spec.mjs`** (text only):

- `:37-40` → `.es-topic-line` has `Kaikki aiheet: 79 sanaa` (title: SEI-57 / Q52 line moved).
- `:401` → `Vaihda aihetta tai suuntaa. Nyt kaikki aiheet, Suomi → Espanja.`
- `:619-633` → button `Vaihda valintoja` (title too); add: `Kaikki aiheet` radio still checked.
- `:639` → `.es-dir-end` `Kaikki aiheet · Espanja → Suomi`.

**New `tests/e2e/espanja-topics.spec.mjs`** (own `seed` counter starting at
570, `installFakeSpeech` + `seedRandom` in `beforeEach` as `espanja.spec.mjs:18-21`).
Every test below is seed-agnostic: it reads the question from the label, so any
seed works.

| Criterion | Test | Fails when |
|---|---|---|
| 5 | Radiogroup `Aihe` has 8 radios named, in order, `Kaikki aiheet, Tervehdykset, Värit, Numerot, Eläimet, Ruoka, Viikonpäivät, Perhe`; only `Kaikki aiheet` checked; each tile's emoji span is `aria-hidden`; all tiles come before `.es-dir` in document order. | a tile missing, reordered, or a second default. |
| 1, 2 | From the choose screen, one press on `Aloita` gives `Kysymys 1 / 10`; play `rrrrrrrrww` → `Hienoa!`, `8 / 10 oikein`, star +1 (the default is today's round, one tap as before; design §3.1 "Napautukset": 1 → 1). | the default became a topic, or Aloita needs a topic first. |
| 3 | `Viikonpäivät`, `fi2es`: 7 questions, each prompt a weekday, all four option texts weekdays (`topicWords('viikonpäivä','es')` as at `espanja.spec.mjs:33`), 7 distinct prompts = all seven; `es2fi` for `Eläimet`: 10 questions, all prompts and options animals. | a wrong option from another topic; a repeated day. |
| 4 | `Viikonpäivät`: bar shows 7 visible blocks (`.es-bar i:visible`), name `0 kysymystä 7:stä tehty`; after 3 answers `Etusivu` → badge `Kesken 3/7`; on question 7 the button reads `Katso tulos`, and a right answer there does **not** start the wait (`aa-counting` false); `rrrrrrw` → `Hienoa!`, `6 / 7 oikein`, `Sait tähden!`, star +1, 40 confetti pieces. | a hard-coded 10 left in `next`/`waits`/`reportProgress`. |
| 4 | `Viikonpäivät` `rrrrrww` → `Kierros valmis!`, `5 / 7 oikein`, `Tähti tulee, kun saat 6 oikein.`, star unchanged, live `Kierros valmis! 5 / 7 oikein. Tähti tulee, kun saat 6 oikein.` | threshold mutated to `Math.floor` or to "two errors" (5/7 would get a star). |
| 4 | `Tervehdykset` `rrrrrrrw` → `7 / 8 oikein`, star; `rrrrrrww` (new load) → no star, `Tähti tulee, kun saat 7 oikein.` | |
| 8 | After a `Viikonpäivät` / `es2fi` round: `.es-dir-end` `Viikonpäivät · Espanja → Suomi`; `Pelaa uudelleen` → `Kysymys 1 / 7`, prompt is a Spanish weekday; again to the end, `Vaihda valintoja` → `Viikonpäivät` and `Espanja → Suomi` checked, only `Aloita` shown. | `beginRound` ignores `topic`; `openChoose` does not copy it. |
| design 3.1 | Mid-round: start `Perhe`; `Vaihda`; `Takaisin kysymykseen` visible, hint empty. Tap `Värit`: Takaisin hidden, hint `Toinen aihe alkaa uudella kierroksella.`, choose screen still shown, no new speak. Tap the other direction: `Toinen aihe ja suunta alkavat uudella kierroksella.` Tap `Perhe` back: `Toinen suunta alkaa uudella kierroksella.` Tap the direction back: Takaisin visible, hint empty; Takaisin returns to the same question. Then tap `Värit`, `Aloita uusi kierros` → `Kysymys 1 / 10`, prompt a colour. | `backBtn.hidden` still checks the direction only. |
| design 3.1 | Tap guard: `.es-change` then `.es-topic[data-topic="perhe"]` in one evaluate (as `clickBoth`, `espanja.spec.mjs:664-668`) → `Kaikki aiheet` still checked; after `settle`, the tap works. | tile listener not wrapped in `guarded`. |
| design 3.1 | Session memory: pick `Ruoka`, start, `Etusivu`, card, `Vaihda` → `Ruoka` checked; `page.reload()` and open → `Kaikki aiheet` checked; `localStorage` has no key other than `espanja.stars` (if any). | topic stored, or reset on Etusivu. |
| 9 / design 8 | Each tile `toHaveAccessibleDescription` = the current topic line (check `Kaikki aiheet` → `Kaikki aiheet: 79 sanaa`, then tap `Viikonpäivät` and check its description `Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä`); the radiogroup itself has no description; `Vaihda` name `Vaihda aihetta tai suuntaa. Nyt viikonpäivät, Suomi → Espanja.` in a weekday round; `.es-dir-end` `aria-label` `Aihe viikonpäivät. Suunta Suomi → Espanja.`; tile taps produce no `speak`. | describedby on the group, or a tile that speaks. |

**Frame spec** (`espanja-frame.spec.mjs`), criterion 9:

- In `eachScreen`, after `check('choose')`: press the `Viikonpäivät` tile,
  `check('choose, Viikonpäivät (longest topic line)')`, press `Kaikki aiheet`
  back before `startRound`. Tile taps draw no random numbers, so seed 5's first
  round (comment `:8-10`) is unchanged.
- At the mid-round choose (`:52-57`): also press `Perhe`,
  `check('mid-round choose, other topic and direction (hint)')`, then press the
  round's topic back (`Kaikki aiheet`) before `Takaisin kysymykseen`.
- `the end screen of each tier fits` (`:90-105`): add a `Viikonpäivät` round
  with `rrrrrrr` (the longest selection line is `Tervehdykset · Espanja → Suomi`
  — add that one too with `es2fi` and `rrrrrrww`).
- These run the existing checks: no sideways overflow on all projects; no
  vertical scroll and every button bottom ≤ innerHeight on `desktop`,
  `ipad-landscape`, `ipad-portrait`; 44 x 44 targets everywhere. A failure looks
  like `choose: es-start bottom: expected ≤ 720, received 722`.

### 6.3 Fixed seeds that could break

The default (`kaikki`) path calls `shuffle(WORDS, rng)` exactly as now and no new
code draws random numbers on the choose screen, so these keep their words:
`espanja-frame.spec.mjs` seed 5 (`:8-12`, relies on `buenas tardes` at
question 4), `espanja.spec.mjs:418-444` seed 826, `gesture.spec.mjs:161` seed 22.
U4 is the guard: if it fails, these will too. `espanja.spec.mjs` already runs
under `fullyParallel: true` (`playwright.config.mjs:8`) with a per-worker
`seed += 1` counter, so its other tests are already seed-agnostic; the new tests
go in a new file anyway so the existing file's order is not touched.
`auto-advance.spec.mjs:84` and `:133` match `/ 10` but drive default rounds
only, so they stay valid.

## 7. Verification in the real environment

1. **Developer, on the Mac, before handing over** (desktop Chrome):
   `npm run serve`, open `http://127.0.0.1:8080/`, tap Espanja.
   - Eight tiles, `Kaikki` selected, the line right of `Aihe` reads
     `Kaikki aiheet: 79 sanaa`; `Aloita` visible without scrolling.
   - Tap `Viikonpäivät`: line `Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä`.
     `Aloita`: `Kysymys 1 / 7`-style first question, hint `Aihe: viikonpäivä.`,
     bar of 7. Answer 6 right, 1 wrong, `Katso tulos`: `Hienoa!`, `6 / 7
     oikein`, `Sait tähden!`, the star count in the top bar goes up by one
     (write down before and after). Line under the buttons:
     `Viikonpäivät · Suomi → Espanja`.
   - Record date, commit and the before/after star numbers in the handover.
2. **Owner, on the iPad, after the push to `main`** (Pages deploys `app/` on
   push, `architecture.md` Layout): open
   https://hakaotu.github.io/seikkailut/, tap Espanja. One look, landscape:
   eight tiles each with a picture (no empty box or `?` instead of an emoji),
   no name cut off, `Aloita` visible without scrolling. Same / different from
   the developer's screenshot is enough. Only the owner has the target
   device; this also covers the "older iPad emoji" claim in design §3.1, which
   nothing in the repo can check. Note for the main session: a played round
   there adds a real star to the child's count, so the look does not need a
   round played.

## 8. Architecture doc impact

Statements in `docs/architecture.md` this change makes false (quoted):

- `:101` "A round is 10 distinct words of `WORDS` (79 pairs, seven topics: …);
  the choose-screen line `Sanat: N aihetta (M sanaa)` (`WORD_LINE`) is computed
  from `WORDS` (distinct topics, length)". Also incomplete: "`direction` is
  committed, `draft` is the choose screen's copy" (topic / draftTopic added).
- `:102` "`Takaisin kysymykseen` is shown only when the draft direction equals
  the open round's" (topic too).
- `:103` "`{done: 10, finished: true}` in `showEnd` (`Katso tulos`); the badge
  reads `Kesken 10/10` before it. Tiers: `endTier` 10 `perfect`, 8-9 `good`,
  else `done`".
- `:104` "iff `earnsStar(a)` (`a >= 8`)".
- `:106` "`answer` calls `auto.start()` only for a right answer with
  `index < 9` … no wait on a wrong answer, `Ohita` or question 10. Cancelled by
  … `openChoose` (`Vaihda`, `Vaihda suuntaa`)".
- `:111` "After a right answer on items 1-9 Matikka (problems), Sanat (words)
  and Espanja (questions) call `auto.start()` … item 10 start no wait" (Espanja:
  items 1 to n−1, no wait on item n).
- `:36` "Exports `MAX_QUESTIONS` (10)" stays literally true but its meaning
  changes to "the longest round"; the export list gains `TOPICS`, `roundLength`,
  `starThreshold` and the text helpers.
- `:121` E2E list: does not mention `espanja-topics`; incomplete, not false.
- Header `:3` list of covered tasks: add SEI-57.

No other statement changes (shell, contract, speech, other games).

## 9. Alternatives considered

- **Repeat words to keep every round at 10** (E8 option b): owner default (a)
  kept in the approved design; rejected.
- **Store the round length on the round**: one more field that can disagree with
  `questions.length`; derived instead.
- **Default `n = 10` on `earnsStar` / `endTexts`**: keeps old unit calls
  compiling but turns a missed call site into a silent wrong end screen;
  rejected (§3).
- **Filter topics in `newRound` by drawing from all words and discarding**:
  changes how many random numbers the default path uses and breaks seeds 5 /
  22 / 826; rejected in favour of `wordsIn` returning `WORDS` itself.
- **Rebuild the bar per round**: equally small, but adds node churn; hiding the
  unused blocks keeps `barBlocks` constant.
- **Topic table in `espanja.js` like Sanat's `THEME_UI`**: the "every topic has
  a tile" test must run in Node against the logic, so it lives in
  `espanja-logic.js`. A deliberate small deviation from Sanat.
- **`aria-describedby` on the radiogroup**: design §8 puts it on each tile so it
  is not read twice.
- **Save the topic in `localStorage`**: out of scope (design §9).

## 10. Risks and open questions

Risks:

- **Desktop height (step 5).** 2 px of slack in the design's own count, and two
  heights the design assumes are not fixed today. Pinned in 5b-5c and measured in
  5e; if it still does not fit, it goes back to the designer, not into a quiet
  CSS squeeze.
- **`Tervehdykset` / `Viikonpäivät` on a 169 px tile at 20 px bold** with a 4 px
  selected border leaves about 149 px; the design estimates 140 px for the name,
  in a font whose fallback differs per machine. Measured in 5e; same rule if it
  spills.
- **Emoji on an older iPad**: only checkable by the owner (§7.2).
- The first element `id` in a game module (§4). Safe today because there is
  one Espanja view; a future second instance would duplicate it.

Flags on the design (built as written; for the main session to pass to the
designer if wanted, none needs the owner):

1. Design §7 counts 8 px below the direction cards, the code has 12; the plan
   removes the extra 4 px to meet the design's 546 px (§5 5c).
2. Design §8 gives the end-screen selection label only for `Viikonpäivät`; for
   `Kaikki aiheet` the plan derives `Aihe kaikki aiheet. Suunta …`, which a
   screen reader says a little awkwardly ("aihe kaikki aiheet").
3. Design §6: "`Pelaa uudelleen` = the same 7 words … with different wrong
   options". The wrong options are a new random draw, so usually different, not
   guaranteed different. The plan does not add a guarantee.

No open questions for the owner.

## 11. Tech debt seen while planning (for `docs/tech-debt.md`; the architect cannot write there)

- **Low: `aria-label` on a plain `<span>`** (`.es-dir-end`, `espanja.js:128`,
  `:351`). A generic element's name is not reliably announced; the new
  selection label continues the pattern rather than fixing it. Same in Sanat's
  selection line if it uses a span (not checked).
- **Low: shared button selector lists** (`app.css:60-163`). Every new button
  class must be added to four lists by hand; a missed one silently loses the
  press shadow or the focus ring. This plan adds a fifth Espanja class to them.
- **Medium: the Espanja desktop choose screen has 2 px of vertical slack after
  this change.** Any future line on that screen (design §6 names SEI-40's ninth
  topic) overflows on 1280 x 720. Not a defect today; it constrains the next
  Espanja choose-screen change.
