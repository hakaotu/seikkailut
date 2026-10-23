# Plan: SEI-45 criterion 8 — a pause between the two readings

Scope: only SEI-45 criterion 8 (`docs/backlog.md` lines 209–217). Voice choice
(criteria 1–3) is already built and is not touched here.

Observation it answers (backlog lines 164–173): on 2026-10-23 the owner, Mac,
Chrome, https://hakaotu.github.io/seikkailut/, Sanat card, heard "kissa" twice
as one word, "kissakissa", and asked for a calmer repetition. The main session
read in Chrome (Playwright, same Mac, same day): two queued utterances, voice
Satu (fi-FI), rates 0.78 and 0.52, no gap between them.

---

## 1. Context and constraints

What exists now (all read 2026-10-23, commit 9297b55):

- `app/src/games/registry.js` lines 70–73: Sanat's sample is
  `[{ text: 'kissa', rate: 0.78 }, { text: 'kissa', rate: 0.52 }]`.
- `app/src/games/placeholder.js` line 22: `listen = () => ctx.speech.say(sample)`.
  `shell.js` lines 178–180 forward it to `speech.say(game.lang, parts, cb)`.
- `app/src/speech.js` `say` (lines 137–200) creates every utterance and calls
  `synth.speak` for each in one synchronous loop (line 191). The synth's own
  queue plays them back to back, so the only gap is whatever the voice leaves
  at an utterance boundary, which for Satu in Chrome is none audible.
- State machine in `say`: `onstart` of the first part to start sets
  `call.started`, clears the 2000 ms start timer, reports `playing` and starts
  the 12000 ms cap timer (lines 164–177). `onend` of the last part gives `idle`
  (178–181). `onerror` `canceled`/`interrupted` gives `idle`, anything else
  `failed('error')` (182–187). Every handler is guarded by
  `gen !== g || current !== call`. `clearTimers` (113–119) clears only
  `startTimer` and `capTimer`.
- Shell (`shell.js` 66–76): `playing` → button `playing`; `idle` → `ready`;
  `failed` → `novoice` ("Ei ääntä") plus the yellow notice when from a tap.
- The old Sanaseikkailu did pause: `originals/sanaseikkailu.html` lines 504–511
  speak the word at 0.78, then on `onend` wait 380 ms with `setTimeout`, then
  speak it at 0.52. Syllables use 220 ms (line 517), 400 ms before syllables
  (line 501). So "a timer after onend" is the original behaviour, which SEI-1
  dropped on purpose (registry.js header rule 3: "Pauses between parts are not
  offered"; sei-1 plan R2).

Must not break:

- **SEI-1 criterion 6 / tap rule** (architecture.md line 36): the first
  `synth.speak` runs synchronously inside the tap. This plan keeps that for the
  first reading; only the second reading moves to a timer.
- **SEI-1 criterion 5**: no button stays locked; whatever the browser does,
  the call ends in `idle` or `failed` by itself.
- **Slower second reading**: SEI-45 criterion 4 (backlog line 194) lists
  "hitaampi toisto" as an existing use case. Rates 0.78 and 0.52 stay.
- Matikka and Espanja (one part each) must behave exactly as now.

### What is known about a `speak()` from a timer

- **iPad Safari.** WebKit `Source/WebCore/Modules/speech/SpeechSynthesis.cpp`,
  `SpeechSynthesis::speak` (fetched from WebKit `main` on 2026-10-23, about
  lines 153–167): under `PLATFORM(IOS_FAMILY)`, a `speak()` made while
  `UserGestureIndicator::processingUserGesture()` calls
  `removeBehaviorRestriction(RequireUserGestureForSpeechStart)`; any later
  `speak()` without a gesture is refused only while that restriction is still
  set. Read literally: once the first reading starts inside the tap, the
  timer's `speak()` is allowed for that page. A refused call **returns
  silently**: no `onstart`, no `onerror`. This is WebKit `main`; which WebKit
  the owner's iPad runs is unknown, and nothing has been heard on an iPad.
  Still an open question until the iPad check (section 7 C).
- **Chrome.** Blink `third_party/blink/renderer/modules/speech/speech_synthesis.cc`,
  `SpeechSynthesis::speak` (fetched from chromium `main` 2026-10-23): it is
  gated by `IsAllowedToStartByAutoplay()`, which for the
  user-activation-required policy returns `AutoplayPolicy::IsDocumentAllowedToPlay`
  (document has been activated). After the tap that is true, so the timer's
  `speak()` is allowed. A refused call fires `onerror` with `not-allowed`.
  Not measured yet; section 7 A measures it.

---

## 2. Mechanisms compared

| Mechanism | Pause length | Inside the tap? | Keeps slower 2nd reading | Verdict |
|---|---|---|---|---|
| **A. Timer after `onend`** of part 1, then `speak(part 2)` | Exact, ours (ms) | Part 1 yes, part 2 no | Yes | **Chosen** |
| B. Silent spacer utterance queued synchronously between the parts (same word at `volume = 0`) | Length of the spoken spacer: depends on voice and rate, not ours | All yes | Yes | **Fallback** if the iPad refuses A |
| C. Empty / whitespace / "…" spacer utterance | Unknown: an empty utterance may be skipped or end at once (no source read; open) | All yes | Yes | Rejected: may give zero pause, which is today's bug |
| D. Punctuation in one utterance (`"kissa. kissa."`) | The voice's sentence pause, not ours | Yes | **No**: one utterance has one rate | Rejected: loses the slower reading (criterion 4) |
| E. Punctuation at the end of each part (`"kissa."` × 2) | Voice-dependent; may be none at an utterance boundary | Yes | Yes | Rejected: unmeasured, no knob to turn if the owner says "still too fast" |
| F. Timer from the tap (not from `onend`) | Unknown, because part 1's length is unknown | No | Yes | Rejected: overlaps or drifts |

Why A over B as the primary: A gives a pause we set in milliseconds and can
tune after the owner listens; B's silence is the duration of an inaudible word,
it adds a third utterance whose events the state machine must ignore, and
whether `volume = 0` is honoured on every engine is unread. A is also what the
old Sanaseikkailu did. A's one risk is iPad (part 2 refused); the code below
makes that harmless (the call ends `idle`, nothing locks), and section 7 C
decides whether B is needed.

**Fallback B, not built now.** If the iPad check shows only the first "kissa",
the follow-up change is: for a part with `pauseMs`, queue synchronously, in
the tap, a spacer utterance (the same text, `volume = 0`, rate 1) before it,
and ignore the spacer's events except as "still playing". If the spacer is
audible on the iPad too, the last resort is no pause on that device (today's
behaviour). Either is a new plan, not something the developer improvises.

---

## 3. Data model / contract change

`parts = [{ text, rate?, pauseMs? }]`.

- `pauseMs` (new, optional, number of milliseconds): silence between the end of
  the previous part and the start of this one. Ignored on the first part
  (index 0), so the first reading is never delayed. Missing, 0 or not a
  positive finite number means "queue right after the previous part, in the
  same synchronous pass" — exactly today's behaviour.
- Readers of the old shape: `placeholder.js` (passes `sample` through
  unchanged), `tests/e2e/fixtures/registry.js` / `fake-game.js` (no `pauseMs`,
  behaviour unchanged). No game other than the placeholders exists yet.
  SEI-3 (Sanat port) will be the next writer: the originals' 380 / 220 / 400 ms
  gaps map onto `pauseMs` directly.

Sanat's sample becomes
`[{ text: 'kissa', rate: 0.78 }, { text: 'kissa', rate: 0.52, pauseMs: 700 }]`.

Why 700 ms: the old game used 380 ms after `onend` and nobody reported it;
the owner asked for calmer than today's 0 ms, so roughly double the old value,
still under a second so the second reading follows before a child's attention
moves on. This is a starting value, not a measured one; the owner's listen in
section 7 B is the check, and the number is one edit in `registry.js`.

### Rates: 0.78 and 0.52 stay

The owner's words were about the repetition ("toistotahti … rauhallisempi",
"kuulostaa … yhteen kirjoitettuna"), which is the missing gap, not the speed of
each reading. 0.52 is already about two thirds of the first reading, and the
slower repetition is an existing use case (criterion 4). Slowing either reading
further is not proposed. **No owner question:** criterion 8 already ends with
the owner saying whether the pace is calm; if he says no, the next lever is
`pauseMs` (then the rates), adjusted from his answer.

---

## 4. Files to create or modify

| Path | Change |
|---|---|
| `app/src/speech.js` | `say` speaks parts up to (not including) the first part with `pauseMs > 0` synchronously, as now. When a part ends and the next part has `pauseMs > 0`, start a pause timer; when it fires, speak the next run of parts (that part and the following ones without `pauseMs`). New per-call fields `pauseTimer`, `partTimer`, `waiting` (index of the delayed part awaiting `onstart`, or `null`). `clearTimers` clears all four timers. Update header comment lines 3–5 (the "synchronously to the last `synth.speak()`" sentence becomes false). Details in step 3. |
| `app/src/games/registry.js` | Sanat sample second part gets `pauseMs: 700`. Header: line 25–27 contract text gains `pauseMs?`; rule 3's "Pauses between parts are not offered." becomes "Pauses between parts are `pauseMs` on the later part; the first part is never delayed." |
| `tests/unit/speech.test.mjs` | New tests U1–U8 (section 6). Existing test "two parts are both spoken synchronously, in order" stays unchanged: it has no `pauseMs` and guards today's behaviour. |
| `tests/unit/registry.test.mjs` | One new test U9: Sanat's sample is `kissa` 0.78, then `kissa` 0.52 with `pauseMs >= 500`, and the first part has no `pauseMs`. |
| `tests/e2e/helpers.mjs` | Fake `speak` record gains `at: performance.now()`; fake utterances record `endedAt` on the record when `onend` fires (store the record index on `u`). Nothing else changes. |
| `tests/e2e/gesture.spec.mjs` | Card-tap test (lines 12–21): assert `calls[0].inDispatch === true`; for `sanat` the second call is `inDispatch === false` by design, so replace `every(...)` with "every call before the first delayed part is in dispatch" (for the real registry: matikka and espanja have one call, sanat's first call). Test "Sanat queues two parts…" (44–52) becomes E1 (section 6). |
| `tests/e2e/nosound.spec.mjs` | Test (c) lines 93 and 109: with `nostart`, part 1 never starts so part 2 is never spoken: expected counts become `1` and `2` (were `2` and `4`). |

Not changed: `shell.js`, `placeholder.js`, `listen-button.js`, `app.js`.

---

## 5. Ordered steps

Each step ends with a command whose result tells you whether it worked.

1. **Registry test first (U9), then registry.** Add U9, run
   `npm run test:unit` → U9 fails (no `pauseMs`). Add `pauseMs: 700` →
   passes. Header comment updated in the same step.

2. **Unit tests U1–U8 against today's `speech.js`.** Run `npm run test:unit`.
   Expected: U1, U2, U3, U4, U5, U6, U7 fail (part 2 is spoken at once, so
   `synth.spoken.length` is 2 straight after `say`); U8 passes (it guards
   behaviour that must not change). If U8 fails now, the test is wrong.

3. **`speech.js` — the hard step.** Rules, in this order:

   a. Build all utterances first, as now (line 159 loop), and keep them in
      `call.utterances` (the Chrome GC reason at line 188 still applies to the
      delayed ones). Also keep `pauses[i]` = the part's `pauseMs` if
      `i > 0` and it is a positive finite number, else 0.

   b. `speakRun(from)`: call `synth.speak(utterances[i])` for `i = from`,
      `from+1`, … stopping before the next `i > from` with `pauses[i] > 0`.
      In `say`, call `speakRun(0)` synchronously where line 191 is today. The
      start timer (lines 193–199) is unchanged and still covers part 0.

   c. In `onend` of part `i` (after the existing `gen`/`current` guard): if
      `i === last`, `finish(call, 'idle')` as now. Else if `pauses[i+1] > 0`,
      `call.pauseTimer = setTimer(fire, pauses[i+1])`. Else do nothing (the
      next part is already queued). `fire` checks
      `gen !== g || current !== call` first and returns if stale; then
      `call.pauseTimer = null`, `call.waiting = i+1`,
      `call.partTimer = setTimer(noStart, startTimeoutMs)`, `speakRun(i+1)`.
      Do not `cancel()` before `speakRun` here: the synth is idle, and a
      cancel would fire `interrupted` on nothing useful.

   d. `noStart` (iPad silent refusal): stale guard, then `current = null`,
      `clearTimers(call)`, `cancel()`, `onState('idle')`. **Idle, not
      `failed('nostart')`**: the child has already heard the first reading;
      "Ei ääntä" and the yellow notice would be false.

   e. `onstart` of any part: after the stale guard, if `call.waiting === i`,
      clear `partTimer` and set `waiting = null`. Then the existing
      first-start logic, still guarded by `call.started`, so `playing` is
      reported once per call and the cap timer is started once, from the
      first part's start. Note the current early return at line 165 includes
      `call.started`; move the `waiting` check above it.

   f. `onerror` of part `i`: `canceled`/`interrupted` → `idle` as now. Any
      other error: if `i` was spoken from a pause timer (`pauses[k] > 0` for
      the run containing `i`, simplest: `i >= firstDelayed`), finish `idle`;
      otherwise `failed('error')` as now. This covers Chrome's `not-allowed`
      on the timer's `speak()` and keeps behaviour for synchronous parts.

   g. `clearTimers` also clears `pauseTimer` and `partTimer`. This is what makes
      `stop()`, a new `say`, a route change, the cap and every `finish` kill a
      pending second reading. `stop()` and the `previous` branch in `say`
      already call `clearTimers` (lines 141, 206), so no other change there.

   What happens across the pause, stated so the reviewer can check it:
   - **`playing`**: stays on from part 1's `onstart` through the pause to part
     2's `onend`. Part 1's `onend` is not the last, so nothing is reported;
     the button keeps its bars during the silence (one Kuuntele = one
     reading-pair).
   - **12 s cap**: still one timer from the first `onstart`; the pause counts
     against it. Sanat ≈ 0.6 s + 0.7 s + 1.0 s, far under 12 s (durations
     estimated, not measured). Not changed.
   - **Generation counter**: the pause timer and the part timer check
     `gen !== g || current !== call`, and are cleared by `clearTimers`; a
     second tap, `stop()` or leaving the game during the pause means part 2
     is never spoken. Old utterances' late events stay inert as now.

   Check: `npm run test:unit` → all of U1–U9 and the existing 30 pass.

4. **E2E helpers and specs.** Change `helpers.mjs`, `gesture.spec.mjs`,
   `nosound.spec.mjs` as in section 4. Check: `npm run test:e2e` → all pass
   in all four projects; E1 fails if you set `pauseMs` to 0 in the registry
   (try it once, then revert).

5. **Full suite.** `npm test` green. Then the verifications in section 7.

---

## 6. Test plan, against criterion 8

Criterion 8 parts: (8a) a clearly audible pause between the two readings,
(8b) they do not sound like one word, (8c) the owner says the pace is calm,
(8d) the pause does not delay or block the first reading; SEI-1 c6 still holds
(iPad), (8e, inherited SEI-1 c5) nothing locks.

Unit (`tests/unit/speech.test.mjs`, fake synth, `mock.timers`; parts below are
`P = [{text:'kissa',rate:0.78},{text:'kissa',rate:0.52,pauseMs:700}]`):

| Id | Criterion | Test | A failing run looks like |
|---|---|---|---|
| U1 | 8a, 8d | `say(P)`: `synth.spoken.length === 1` immediately, rate 0.78. Part 1 `onstart`, `onend`; `tick(699)` → still 1; `tick(1)` → 2, rate 0.52. | Length 2 right after `say` (no pause, today's bug), or still 1 after 700 ms. |
| U2 | 8a | Across U1's pause, `cb.log` is `['playing']`; after part 2 `onstart`+`onend` it is `['playing','idle']`. | `idle` after part 1 (button flickers back to ready mid-word), or `playing` twice. |
| U3 | 8e | `stop()` during the pause, then `tick(5000)`: `spoken.length === 1`, log `['playing','idle']`. | A second "kissa" after leaving the game (length 2). |
| U4 | 8e | New `say` (one part) during the pause: old part 2 never spoken; first callback `['playing','idle']`, second untouched by the old timer. | Old part 2 appended after the new call's utterance. |
| U5 | 8e | Part 2 spoken but no `onstart` (iPad silent refusal): `tick(1999)` → `['playing']`; `tick(1)` → `['playing','idle']`, `cancel` called once more. | `failed:nostart` (false "Ei ääntä"), or `playing` until 12 s. |
| U6 | 8e | Part 2 `onerror({error:'not-allowed'})` (Chrome refusal) → `['playing','idle']`. | `failed:error`. |
| U7 | 8e | Part 1 `onstart` at t, `onend`, pause, part 2 `onstart`, no `onend`: `idle` at exactly t+12000, not t+700+12000. | Cap restarted by part 2's start. |
| U8 | regression | Two parts **without** `pauseMs`: both spoken synchronously (existing test, line 183, unchanged) and an `onerror('synthesis-failed')` on part 2 still gives `failed:error`. | Behaviour change for parts with no pause. |
| U9 | 8a | `registry.test.mjs`: Sanat sample = `kissa`/0.78 (no `pauseMs`), `kissa`/0.52 with `pauseMs >= 500`. | Someone removes the pause or puts it on the first part. |

Mutation hints for the reviewer: dropping the stale guard in `fire` breaks U4;
not clearing `pauseTimer` in `clearTimers` breaks U3; reporting `failed` in
`noStart` breaks U5; honouring `pauseMs` on part 0 breaks U1's first assertion
and the gesture spec.

E2E (Playwright, fake speech):

| Id | Criterion | Test | Failing run |
|---|---|---|---|
| E1 | 8a, 8d | `gesture.spec`: tap Sanat card; two calls, texts `kissa`×2, rates `[0.78, 0.52]`; `calls[0].inDispatch === true`; `calls[1].at - calls[0].endedAt >= 650` (700 minus timer slack). | Gap ≈ 0 (no pause), or first call not in dispatch. |
| E2 | 8d | `gesture.spec` card loop: first call of every game in dispatch. | Any game's first speak moved out of the tap. |
| E3 | 8e | `nosound` (c) with updated counts 1 / 2: Sanat still reaches `novoice` at 2 s from a part 1 that never starts. | Count 2 means part 2 was spoken without part 1 ever ending. |

8b and 8c are judged by ear only (section 7 B). No automated test can say
"does not sound like one word".

---

## 7. Verification in the real environment

Nothing deploys until the commit reaches `main` (Pages workflow,
architecture.md line 16). After the deploy:

**A. Main session, no owner (Mac, real Chrome, real Satu).** The same setup the
main session used on 2026-10-23 (backlog line 169). Playwright with
`channel: 'chrome'`, headed (headless Chrome may list no voices), against
https://hakaotu.github.io/seikkailut/. Before load, `addInitScript` wraps
`speechSynthesis.speak` to attach `addEventListener('start'|'end')` on each
utterance and push `{text, rate, voice: u.voice && u.voice.name, event,
t: performance.now()}` to `window.__log`; record `tTap = performance.now()`
just before tapping the Sanat card (via `page.evaluate`, then click). Read
`window.__log` after 5 s. Right answer:
- 4 events: start/end `kissa` 0.78, start/end `kissa` 0.52, voice `Satu`
  (or `Satu (Enhanced)` if Q19 installed it).
- `start(part 2) − end(part 1)` between 700 and 1000 ms.
- `start(part 1) − tTap` under 1000 ms (criterion 5's limit; record it).
Write the three numbers, the voice name, the Chrome version and the date into
the task. If part 1 `end` never appears, see risk R-B.

**B. Owner, Mac, Chrome (8b, 8c).** One observation: open
https://hakaotu.github.io/seikkailut/, tap Sanat once. "Kuuluuko kaksi
erillistä kissaa, ja onko tahti nyt rauhallinen: kyllä / ei." If "ei, liian
nopea", raise `pauseMs` (e.g. to 1000) and ask again; if "liian hidas",
lower it. Do this after Q19 is closed, so the owner is not judging voice and
pause in the same listen.

**C. Owner, iPad, Safari (8d, SEI-1 c6, sei-1 R2).** Only when the iPad is at
hand, together with SEI-45 criterion 7 and SEI-2. Fresh tab, open the site,
tap Sanat once, nothing tapped before. What it must show:
1. The first "kissa" starts right away from that single tap (8d, SEI-1 c6).
2. A short silence, then a slower "kissa": **both / only the first / none**.
3. The Kuuntele button is back to normal within a few seconds and no yellow
   notice appears.
"Only the first" means WebKit refused the timer's `speak()`: build fallback
B (section 2) as a new plan. "None" is the older SEI-1 R1 problem, not this
change. Record iPad model and iOS version (Settings › General › About) and
the date in the task.

---

## 8. Architecture doc impact

Statements in `docs/architecture.md` this change makes false, quoted:

1. Line 36: "Invariant: from a `click` handler to `speechSynthesis.speak()`
   everything is synchronous: no `await`, no `setTimeout`, …" — now true for
   the first `speak()` and every part up to the first `pauseMs`; a part with
   `pauseMs` is spoken from a timer after the previous part's `onend`.
2. Line 48: "`speech.say(parts)` with `parts = [{text, rate?}]`" — becomes
   `[{text, rate?, pauseMs?}]`.
3. Line 57: "then creates all utterances and calls `synth.speak` for each,
   synchronously." — false for parts with `pauseMs`.
4. Line 59: "Start timer 2000 ms: no `onstart` gives `failed('nostart')` and
   `cancel()`. Cap timer 12000 ms from `onstart` …" — incomplete: add the
   pause timer, the 2000 ms part timer for a delayed part (→ `idle`, not
   `failed`), "cap from the first `onstart`, pauses included", and that a
   non-cancel error on a delayed part gives `idle`.
5. Line 30: "sanat `kissa` twice at rates 0.78 and 0.52" — add "700 ms apart".
6. Line 79: "queued two-part speech … unverified on the target device" —
   becomes "a second part spoken from a timer after a pause".
7. Line 68 (`helpers.mjs` description): add that each record carries `at` and
   `endedAt`. Not false today, incomplete after.

Not in the architecture doc but stale after this change (developer updates):
`speech.js` header lines 3–5, `registry.js` header lines 25–27 and rule 3
(lines 39–41).

Separate note for the main session: architecture.md does not describe the
voice ranking SEI-45 already added (`GOOD_VOICES`, `AVOID_VOICES`, bonus) —
line 56 mentions only `availability`. That gap predates this plan; scribe can
close it in the same run.

---

## 9. Alternatives considered

See section 2 for the six mechanisms. Also rejected:

- **A pause setting inside `speech.js` (one gap for every multi-part call)**
  instead of `pauseMs` per part: SEI-3 needs different gaps (380 / 400 / 220
  ms in the original), and Matikka may want none. Per part costs nothing extra.
- **Slower rates instead of a pause**: does not separate the words; the
  boundary stays gapless. Also changes the existing slow-repetition use case.
- **Recorded audio (route B of SEI-45)**: Q16 chose route A; out of scope.
- **Detect iPad and pick B automatically at runtime**: extra code for a
  failure nobody has seen; WebKit's source suggests A works. Revisit only
  after check C.

---

## 10. Risks and open questions

- **R-A — iPad refuses the timer's `speak()`.** Grounded only in WebKit
  `main` source, not in a device. Impact if wrong: iPad hears one "kissa",
  button returns to ready after 2 s, no notice (U5). Check: 7 C. Fallback: B.
- **R-B — Chrome on macOS drops `onend`** (sei-1 plan R6). Before this change
  the synth's own queue still played part 2; now part 2 waits for part 1's
  `onend`, so a dropped `onend` loses the second reading and the button stays
  `playing` until the 12 s cap. Check 7 A shows whether part 1's `end` fires
  with Satu. If it does not, the follow-up is a backstop timer (estimated
  part length) — a new plan.
- **R-C — 700 ms is a guess.** The owner's listen (7 B) tunes it.
- **R-D — First reading's timing unchanged but unmeasured** on the hosted
  site; 7 A records it.
- Open: which WebKit/iOS version the owner's iPad runs (information, only
  when the iPad is at hand; not asked now).

No owner question from this plan.
