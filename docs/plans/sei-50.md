# Plan: SEI-50 – SEI-56 (more Sanat words, five new Espanja topics)

Tasks: SEI-50 (Sanat Normaali), SEI-51 (Sanat Harry Potter), SEI-52 – SEI-56
(Espanja topics `numero`, `eläin`, `ruoka`, `viikonpäivä`, `perhe`). Backlog
`docs/backlog.md` section E. Owner-approved design: `docs/design/sei-50.md`
(Q48 "ok", Q49 KORPINKYNSI, Q50 topics mixed; `docs/questions.md`). One change,
one review. Written 2026-10-27 against `main` at `1aac928`.

## 1. Context and constraints

What exists now (read, with lines):

- `app/src/games/sanat-logic.js:11-36` `WORDS` (24 entries, KISSA … TULI),
  `:38-59` `HP_WORDS` (20, JÄSTI … TAIKAJUOMA). Entry shape
  `{ word, emoji, hint }`. `newDeck` (`:120-127`) shuffles the whole list and
  takes `MAX_WORDS` = 10, so it scales to any list of 10 or more with no change.
  `syllabify` (`:77-108`) is not changed.
- `app/src/games/sanat.js:338-376` `renderSlots` builds one `.sn-slot` per
  letter inside `.sn-slots` (`slotsEl`), grouped in `.sn-syl` with `.sn-dash`
  when tavutus is on. `slotsEl` keeps its element across words; only its
  children are replaced (`:357`, `:373`).
- `app/styles/app.css:1138-1153` `.sn-slot` 56 px wide; `:1280-1290` iPad
  portrait (`min-width: 600px and min-height: 900px`) 60 px; `:1292-1301`
  (`max-width: 599.98px`) 44 px. `box-sizing: border-box` everywhere (`:20`),
  so the width includes the border.
- `app/src/games/espanja-logic.js:10-29` `WORDS` (18 pairs `{ es, fi, topic }`).
  `newRound` (`:58-67`): ten pairs from a shuffle of all `WORDS`; for each, the
  wrong options are `WORDS.filter(w => w !== pair && w.topic === pair.topic)`
  shuffled and cut to 3 (`:62-63`). So wrong options are always from the same
  topic, and a topic needs at least 4 pairs. The smallest new topic,
  `viikonpäivä`, has 7 (6 others ≥ 3). **No change to `newRound` is needed for
  SEI-53/8, 54/8, 55/9, 56/8.**
- `hintLine` (`:83`) and `questionLive` (`:187`) print `pair.topic` as is, so the
  topic string in the data is the on-screen text (design §3.2).
- `app/src/games/espanja.js:25`:
  `` const WORD_LINE = `Sanat: tervehdykset ja värit (${WORDS.length} sanaa)`; ``
  shown on the Espanja choose screen (`:100`). **After this change it would read
  "Sanat: tervehdykset ja värit (79 sanaa)", which is false.** The design spec
  does not cover it (its §1 says the choose screen shows no counts or topics;
  that is true for Sanat only). See open question O1.

Must not break:

- The 24 / 20 / 18 existing entries stay byte-identical and first, in order
  (SEI-50/1, SEI-51/1, SEI-52/1).
- Words with ≤ 10 letters keep today's box sizes on every width; < 600 px is
  unchanged for all words (design §3.4).
- Everything in the Sanat and Espanja specs (`sei-3.md`, `sei-4.md`) apart from
  the above.

## 2. Files to create or modify

| Path | Change |
|---|---|
| `app/src/games/sanat-logic.js` | Append 36 entries to `WORDS`, 21 to `HP_WORDS` (design §4.1, §4.2), in table order. Change the comment at `:10` so "verbatim" covers only the first 24 / 20, and add one comment line above each appended block naming the source (`docs/design/sei-50.md §4.1` / `§4.2`). |
| `app/src/games/sanat.js` | In `renderSlots`, one line: `slotsEl.classList.toggle('is-long', ws.word.length >= 11)`, with a comment citing design §3.4. |
| `app/styles/app.css` | One rule, placed after the iPad portrait block (`:1280-1290`): `@media (min-width: 600px) { .game-view[data-game='sanat'] .sn-slots.is-long .sn-slot { width: 52px; } }`. |
| `app/src/games/espanja-logic.js` | Append 61 pairs to `WORDS` (design §4.4) in the spec's order: numero, eläin, ruoka, viikonpäivä, perhe. Change the comment at `:8-9` so it covers only the first 18; one comment line per new topic naming its task. |
| `app/src/games/espanja.js` | `WORD_LINE` (`:25`): **blocked on O1.** Only the text changes. |
| `tests/unit/sanat-logic.test.mjs` | See §6.1. |
| `tests/unit/espanja-logic.test.mjs` | See §6.2. |
| `tests/e2e/sanat-frame.spec.mjs` | `:64` assertion; new 11-letter test (§6.3). |
| `tests/e2e/espanja-frame.spec.mjs` | New seed for `SEED` (`:10`) and its comment (`:8-9`, `:31`). |
| `tests/e2e/espanja.spec.mjs` | New seed at `:416` and its comment (`:414-415`); the `WORD_LINE` assertion after O1. |

No new files in the repo. The extraction script in step 1 lives in the
session scratchpad and is not committed.

## 3. Data model / API / contract changes

None. Same entry shapes, no new fields, no new exports. Readers of the lists:
`newDeck`, `sanat.js` (via word states), `tests/e2e/sanat.spec.mjs:5` and
`espanja-helpers.mjs:6` (both look words up by text, which stays unique),
`newRound`, `espanja.js:25`. All keep working with longer arrays; the one that
changes meaning is `WORD_LINE` (O1).

The `is-long` class is new DOM state on `.sn-slots`, read only by `app.css`.

## 4. Architecture doc impact

Statements in `docs/architecture.md` this change makes false:

1. Line 89: "A round is `MAX_WORDS` = 10 distinct words from `WORDS` (Normaali,
   24 entries) or `HP_WORDS` (Harry Potter, 20)" → 60 and 41.
2. Line 101: "A round is 10 distinct words of `WORDS` (18 pairs, topics
   `tervehdys`, `väri`)" → 79 pairs, seven topics `tervehdys`, `väri`,
   `numero`, `eläin`, `ruoka`, `viikonpäivä`, `perhe`.

Statements to add (nothing currently says the opposite): the `.sn-slots.is-long`
rule (≥ 11 letters, ≥ 600 px, 52 px) in the Sanat section; the new
`sanat-frame` 11-letter test in the Tests section; the header line 3 list of
tasks. If O1 changes `WORD_LINE`, its text is not in the architecture doc today,
so nothing becomes false there.

## 5. Ordered steps

Each step ends with a check. Steps 1-6 are Sanat and can ship without the
Espanja steps; steps 7-10 are Espanja; step 9 waits for O1.

**Step 1 — Extract the tables mechanically (the hard part; do not type them).**
The risk in this change is transcription: 57 words, 57 emoji (five with an
invisible U+FE0F), 57 hints, 61 pairs with accents. Write a throwaway Node script
in the scratchpad that reads `docs/design/sei-50.md` as UTF-8 and:

- Finds the tables by heading, not by line number: `### 4.1` (rows today at
  lines 187-222), `### 4.2` (236-256), and under `### 4.4` the five tables that
  follow the lines starting `**SEI-52 — `, `**SEI-53 — `, `**SEI-54 — `,
  `**SEI-55 — `, `**SEI-56 — ` (rows 313-324, 333-348, 354-369, 380-386,
  395-404). The topic is the backticked word in that bold line.
- Takes data rows only (skips the header and the `|---|` row), splits on `|`,
  trims each cell. No cell in these tables contains `|`.
- Sanat: column 2 = word, 3 = emoji (copied as is, no normalisation), 4 = hint
  with a trailing ` (N)`; strip it with `/^(.*) \((\d+)\)$/` and **assert that
  the stripped hint's length equals N** (this re-checks every count in the spec),
  5 = the "Sovellus" syllables (`LEH-MÄ`). Column 1 must run 25..60 and 21..41
  without gaps.
- Espanja: column 1 = es, 2 = fi.
- Fails if any value contains `'` or `\` (the code uses single-quoted strings).
- Prints: the JS lines to append to each array, in the existing style
  (`{ word:'LEHMÄ', emoji:'🐄', hint:'Sanoo ammuu!' },` and
  `{ es: 'uno', fi: 'yksi', topic: 'numero' },`); the test table of
  `[word, 'SYL-LA-BLES']` pairs for §6.1; the test table of 61 `[es, fi, topic]`
  rows for §6.2; the counts.

Check: the script prints 36, 21, 12, 16, 16, 7, 10 rows and no length mismatch.
Then confirm the five U+FE0F emoji came through: have the script print each
emoji's code points (`[...e].map(c => c.codePointAt(0).toString(16))`); PILVI,
SADE, LUMI, KYNÄ, TYLYAHO end in `fe0f` (design §6 lists all five) and no other
new emoji does. Keep the script; the reviewer runs it again (§6.4).

**Step 2 — Append the Sanat entries.** Paste the printed lines at the end of
`WORDS` and `HP_WORDS`; fix the two comments.
Check: `git diff -U0 app/src/games/sanat-logic.js` shows only added lines inside
the arrays (plus the edited comment line); no `-` line touches an existing
entry. `npm run test:unit` now fails only on the size test at
`sanat-logic.test.mjs:34-50` (expected).

**Step 3 — Update the Sanat unit tests (§6.1).** Check: `npm run test:unit`
passes. Then mutate once: change one new hint to contain its word, and change
`KORPINKYNSI`'s syllable row in the test; each must fail. Revert.

**Step 4 — The 11-letter box rule.** Add the `classList.toggle` in
`renderSlots` and the CSS rule. Specificity: the new selector (`.game-view`,
attribute, `.sn-slots`, `.is-long`, `.sn-slot`) outranks both existing width
rules, so it wins over the iPad portrait 60 px without depending on order;
`min-width: 600px` keeps it off the < 600 px rule. Check: in `npm run serve` at
1280 x 720, a Harry Potter round with tavutus on, reached KORPINKYNSI: boxes are
52 px and on one row; a 10-letter word in the same round still has 56 px boxes.

**Step 5 — Sanat e2e (§6.3).** Check: `npx playwright test
tests/e2e/sanat-frame.spec.mjs tests/e2e/sanat.spec.mjs` passes on all four
projects. Mutate once: remove the CSS rule; the new test must fail on
`desktop` (the row wraps) and on `ipad-portrait` (box width 60, not 52). Revert.

**Step 6 — Full suite for the Sanat half.** `npm test` passes.

**Step 7 — Append the Espanja pairs.** Paste the 61 printed lines; fix the
comment. Check: the `git diff -U0` rule of step 2; `npm run test:unit` fails
only on `espanja-logic.test.mjs:26-44` (table) and possibly `:80-92`
(fairness, §6.2).

**Step 8 — Update the Espanja unit tests (§6.2) and the two e2e seeds.**
Find the seeds with a scratch Node script that imports `newRound` from
`app/src/games/espanja-logic.js` and the mulberry32 of `tests/e2e/helpers.mjs:249-260`
(same as `seeded` in the unit tests), on the assumption the existing comment
at `espanja.spec.mjs:414-415` already relies on: `newRound` is the page's first
`Math.random` consumer after a load.
- `espanja-frame.spec.mjs`: the smallest seed whose first round has
  `buenas tardes` as **question 4** (the walk in `eachScreen` `:36-65` is
  written for that position: wrong on 4, right on 5, skip on 6, then 7-10).
- `espanja.spec.mjs:416`: the smallest seed whose first round contains
  `adiós`, `buenas tardes` and `por favor`. Expect a search of roughly a
  thousand seeds (P per seed = C(76,7)/C(79,10) ≈ 0.15 %).
Write each seed's ten questions into its comment, as the current comment does.
Check: `npx playwright test tests/e2e/espanja.spec.mjs tests/e2e/espanja-frame.spec.mjs`
passes on all four projects; if `toLongest` throws, the first-consumer
assumption is wrong for this seed — stop and report rather than loosening the walk.

**Step 9 — `WORD_LINE` (blocked on O1).** Set the text the designer gives;
add the assertion in §6.3. Check: the Espanja choose screen shows it, and
`espanja-frame` still passes on `narrow` (the choose screen is one of its checked
states, `:38`).

**Step 10 — Full suite.** `npm test` passes; report the run time of
`npm run test:unit` before and after (the fairness test grows, §6.2).

## 6. Test plan

### 6.1 `tests/unit/sanat-logic.test.mjs`

Replace the size test at `:34-50` and add tests. The tables in these tests come
from step 1's script output, not from typing.

| Criterion | Test | Fails when |
|---|---|---|
| SEI-50/1, SEI-51/1 | `WORDS.length` 60, `HP_WORDS.length` 41; `WORDS[0]` KISSA, `WORDS[23]` TULI, `WORDS[24]` LEHMÄ, last PAITA; `HP_WORDS[0]` JÄSTI, `[19]` TAIKAJUOMA, `[20]` ROHKELIKKO, last KORPINKYNSI. The old entries' content is checked by the diff rule (step 2) and the reviewer. | an entry is lost, moved or inserted before the old ones |
| SEI-50/2, SEI-51/2 | `new Set([...WORDS, ...HP_WORDS].map(e => e.word)).size === 101` | a word is in both lists or twice in one |
| SEI-50/3, SEI-51/4 | every word only `ALPHABET` letters (kept); every Normaali word 3-7 letters; every HP word ≤ 10 letters except exactly one, `KORPINKYNSI`, with 11 (Q49) | a 12-letter word, a second 11-letter word, a space or hyphen |
| SEI-50/4, SEI-51/5 | for **new** entries only (`WORDS.slice(24)`, `HP_WORDS.slice(20)`): hint ≤ 30 characters and `hint.toLowerCase()` does not include `word.toLowerCase()` | a hint gives the word away. Old entries are exempt on purpose: `PALLO` "Pallolla pelataan" and `SAMMAKKO` "Suklaasammakko!" already contain their word and criterion 1 keeps them (§9) |
| SEI-50/5, SEI-51/6 (code part) | each list's emoji are unique within the list; the entries PILVI, SADE, LUMI, KYNÄ, TYLYAHO have an emoji ending in `️` | a picture repeats in one list; a variation selector was lost in copying |
| SEI-50/6, SEI-51/7 | table of 57 `[word, 'SYL-LA-BLES']` (the spec's "Sovellus" column); asserts the table's words equal `WORDS.slice(24)` then `HP_WORDS.slice(20)` word by word, and `syllabify(word).join('-')` equals each row | the app would hyphenate a new word differently from the recorded one. **If this fails, do not change `syllabify` or the word: stop and report** (criterion 6: such a word is left out or goes to the architect) |
| SEI-50/7, SEI-51/9 | for each theme, seeds 1-500 in 100 groups of 5 consecutive seeds: in each group at least one deck contains an entry at index ≥ 24 (Normaali) / ≥ 20 (HP). Distinctness within a deck is the existing test at `:52-62` | the new entries are never drawn |

Existing tests that iterate all words (`:91-93` wordSpeech, `:110-124`
shuffleTiles) now cover the new words without change.

Expected per-round probability of a deck with no new word (design §5.2,
recomputed): Normaali C(24,10)/C(60,10) = 1 961 256 / 75 394 027 566 ≈ 2.6e-5;
HP C(20,10)/C(41,10) = 184 756 / 1 121 099 408 ≈ 1.6e-4. A group of five
failing is ≈ 1e-19, so the test is deterministic in practice; it is seeded anyway.

### 6.2 `tests/unit/espanja-logic.test.mjs`

| Criterion | Test | Fails when |
|---|---|---|
| SEI-52/1 (and 53-56/1) | `:26-44`: compare `WORDS.slice(0, 18)` to the existing table (unchanged), and a new test: `WORDS.slice(18)` deepEquals the 61-row table from step 1; `WORDS.length` 79 | an old pair changed, a new pair differs from the approved spec |
| SEI-52 – 56/1 sizes, SEI-55/8 | topics in first-appearance order equal `['tervehdys', 'väri', 'numero', 'eläin', 'ruoka', 'viikonpäivä', 'perhe']`, sizes `[8, 10, 12, 16, 16, 7, 10]`; the `viikonpäivä` pairs equal lunes…domingo / maanantai…sunnuntai in order | a topic misspelt (it is screen text), a day missing |
| SEI-52 – 56/2, SEI-54/9 | `:46-54`: replace the hard-coded `['tervehdys', 'väri']` with the topic list derived from `WORDS`; keeps global and per-topic uniqueness of `fi` and `es` (so `naranja` can exist once only) | a duplicate Finnish or Spanish text |
| SEI-52/6 (code part) | every `es` has at most 2 words (`split(' ').length <= 2`) | a three-word phrase |
| SEI-52/3, 53/8, 54/8, 55/9, 56/8 | `:94-107`: run for **both** directions, seeds 1-1000 each (criterion asks 200); keep all its assertions (4 options, one right, all from the question's topic, distinct `fi` and `es`); add: every one of the 7 topics occurred as a question at least once per direction, so the test is not vacuous | `newRound` ever mixes topics or repeats a pair |
| SEI-52/7 | the star and end-screen tests are untouched and keep passing | — |

**The fairness test at `:80-92` must change.** It draws N = 20000 first
questions and allows ±15 % around N / |WORDS|. With 18 words that is
E = 1111, ±167, about 5 standard deviations. With 79 words it is E = 253, ±38,
about 2.4 SD per word, and with 79 words some word lands outside more often
than not (rough estimate ~70 %, from 79 × P(|Z| > 2.4) ≈ 79 × 0.016). The run is
seeded, so it either always passes or always fails, but a pass would be luck.
Set **N = 79 000** (E = 1000, ±150 ≈ 4.8 SD). Keep the 15 %.

### 6.3 E2E

- `sanat-frame.spec.mjs:64`: `toBe(10)` becomes `toBeGreaterThanOrEqual(10)`
  with message "a word of ten or more letters". Reason: the round's seed comes
  from a module counter under `fullyParallel: true`, so which words are drawn is
  not fixed, and with 41 words P(KORPINKYNSI in at least one of the three
  rounds) = 1 − (31/41)^3 ≈ 0.57, which would fail `toBe(10)`. P(no word of ≥ 10
  letters in three rounds) = (C(32,10)/C(41,10))^3 = (64 512 240 / 1 121 099 408)^3
  ≈ 1.9e-4.
- New test in `sanat-frame.spec.mjs`, **"design 3.4: an 11-letter word fits on
  one row at ≥ 600 px"**. Fixed seed set in the test (`seedRandom(page, N)`
  after the `beforeEach`, as `espanja.spec.mjs:416` does). Harry Potter, Vaikea,
  tavutus on (the tallest case in design §3.4). Skip + Seuraava until the current
  word is KORPINKYNSI, across rounds with `Pelaa uudelleen`, at most 8 rounds;
  fail with "KORPINKYNSI not reached with seed N" otherwise (pick the seed so it
  comes in round 1). At KORPINKYNSI:
  - projects with width ≥ 600: every `.sn-slot` box is 52 ± 0.5 px wide and all
    have the same `y` (one row); `fits()` (no sideways or vertical scroll);
  - `narrow`: every box 44 px; `noSidewaysOverflow`;
  - then tavutus off (Vaihda valintoja → Tavutus → Takaisin sanaan): same checks.
  - The first word of the round that has ≤ 10 letters: boxes 56 px
    (`desktop`, `ipad-landscape`) / 60 px (`ipad-portrait`) / 44 px (`narrow`),
    so the rule does not leak to other words; and the class is removed on the
    next word (`.sn-slots` is reused, `sanat.js:357`).
  Fails when: the rule is missing (desktop wraps; portrait 60 px), applied on
  narrow, or applied to a 10-letter word.
- `espanja.spec.mjs` (step 9, after O1): on the choose screen,
  `.es-words` has the agreed text.

### 6.4 What the reviewer checks by hand

- Run step 1's script again and diff its output against the appended code
  (`WORDS.slice(24)`, `HP_WORDS.slice(20)`, Espanja `WORDS.slice(18)` imported
  in Node and compared with `deepEqual`).
- `git diff -U0` of the two logic files: no removed line inside an array.
- The mutations in steps 3 and 5.

## 7. Verification in the real environment

Nothing deploys itself. After the change is merged to `main`, `pages.yml`
publishes `app/`.

**Main session, no owner needed** (after the Pages run finishes; responses may
be cached up to ~10 min):

- `curl -s https://hakaotu.github.io/seikkailut/src/games/sanat-logic.js | grep -c "word:'"`
  → `101`; `| grep -c KORPINKYNSI` → `1`.
- `curl -s https://hakaotu.github.io/seikkailut/src/games/espanja-logic.js | grep -c "topic: '"`
  → `79`; `| grep -c "topic: 'viikonpäivä'"` → `7`.
- `curl -s https://hakaotu.github.io/seikkailut/styles/app.css | grep -c is-long` → `1`.
- Optional: a scratch Playwright script against the live URL at 1280 x 720
  (Chromium) with the seed of §6.3, screenshot of KORPINKYNSI with tavutus on:
  one row of boxes.

**Owner only (a human must see or hear it):**

- SEI-50/5, SEI-51/6: open `docs/design/sei-50.html` in Chrome on the Mac and
  say whether any picture shows as an empty square or two small pictures
  (same / different is enough). The page uses the app's emoji font (design §9).
  This can be asked before or after deploy.
- SEI-52 – 56/5: listen to each of the 61 new Spanish words in Chrome on the
  Mac and name any that sound wrong. Playing rounds is a poor way to reach all
  61 (each round is 10 of 79, random). Who can make it cheaper: the designer can
  add a "Kuuntele" button per word to `docs/design/sei-50.html` (inside the
  designer's write boundary) that speaks with `lang = 'es-ES'` and prints the
  voice it used, so the owner can check it is the same voice the app picks
  (`monica` is first in the Spanish `GOOD_VOICES`, `docs/architecture.md` line 63). Without that page, the
  owner plays Espanja → Suomi rounds, where each question reads the Spanish word
  aloud. The main session decides which; this plan does not need the page.

Neither is checked on an iPad; that stays in the architecture doc's open
questions.

## 8. Alternatives considered

- **A committed unit test that parses `docs/design/sei-50.md`.** Strongest
  guard against transcription, but it ties the test suite to a design document
  that is history once shipped; the next list change would have to edit an old
  spec or the parser. Rejected; the same check runs once in step 1 and again by
  the reviewer, and the existing pattern (SEI-9 test at `:26-44`) is a table in
  the test.
- **Typing the tables, then a second typed copy in the tests.** Two
  transcriptions by the same hand repeat the same slip; invisible U+FE0F would
  not be caught by eye. Rejected for step 1's script.
- **Shrinking boxes by measuring overflow in JS** (like Matikka's `fitProblem`).
  More general, but the design asks for one fixed width at one threshold; a
  class and one CSS rule meets it exactly and is testable.
- **A `data-length` attribute with CSS attribute selectors.** Works, but the
  codebase's state classes are `is-*` (`is-popping`, `is-wrapped`); the class
  matches.
- **Changing `newRound` to guarantee topic balance.** Not asked; Q50 settled
  that topics stay mixed.
- **Raising the fairness tolerance instead of N.** A looser bound tests less;
  N = 79 000 keeps the original strength. If the runtime is a problem (step 10),
  the fallback is a 5-SD bound (`5 * Math.sqrt(expected)`) at N = 20 000.

## 9. Risks and open questions

**O1 (blocks step 9 only) — the Espanja choose-screen line.** `espanja.js:25`
shows "Sanat: tervehdykset ja värit (18 sanaa)" (design `sei-4.md` line 201-202,
E15). The SEI-50 spec says no screen text changes, which is not true here: with
79 pairs the line either names two topics out of seven or must change. This is
copy, so it is the designer's to write and the owner's to see; I have not
picked a text. The plan needs only one string. Until it is decided, Sanat
(steps 1-6) can ship alone; shipping Espanja with the old line would show
"tervehdykset ja värit (79 sanaa)".

Risks:

- **Seed assumption (step 8).** The new e2e seeds assume `newRound` is the first
  `Math.random` call after a load, as the existing seed 26 did. If a future
  change adds an earlier call, these tests fail loudly (`toLongest` throws). Not
  silent.
- **Hyphenation.** I traced 26 of the 57 new words through `syllabify`
  (`sanat-logic.js:77-108`) by hand, including every one with a vowel pair or
  a consonant pair (TYLYAHO, KASVIHUONE, PÄIVÄKIRJA, KALJUUNA, KENTAURI,
  ALRUUNA, LUIHUINEN, ROHKELIKKO, TÄHTITORNI, PUUSKUPUH, ETSIJÄ, SULKAKYNÄ,
  FEENIKS, KORPINKYNSI, KIRAHVI, PYÖRÄ, PÄÄRYNÄ, JUUSTO, KRUUNU, LYÖJÄ, SIENI,
  LEIJONA, APINA, ETANA, MAITO, LEIPÄ); all match the spec. The unit test in
  §6.1 is the real check for all 57.
- **Box width on iPad hardware.** 52 px at 692 px total on a 712 px row
  (design §3.4) is verified only in WebKit at the project sizes.
- **Runtime** of the unit suite grows (fairness test ×4, options test ×2).
  Reported in step 10.

## 10. Tech debt (for `docs/tech-debt.md`, which is outside my write boundary)

From reading code, not from anything observed:

- **Two existing Sanat hints contain their word.** `sanat-logic.js:20`
  PALLO "Pallolla pelataan", `:53` SAMMAKKO "Suklaasammakko!". On Helppo the hint
  is shown and announced (`sanat.js:548`), so it can give the word away. Copied
  verbatim from the old game. SEI-50/1 keeps them, so this plan does not touch
  them, and the new hint test exempts the first 24 / 20. Severity: low.
  Fix only if the owner wants new hints for those two (copy, designer).
- **E2E seeds are tied to list sizes.** `espanja-frame.spec.mjs:10` and
  `espanja.spec.mjs:416` pick seeds for a specific round, and
  `espanja-frame`'s walk (`:36-65`) is hard-wired to the longest word being
  question 4. Every change to the Espanja list breaks them and costs a seed
  search. Severity: low. A sturdier walk would locate the word wherever it is.
