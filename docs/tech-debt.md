# Tech debt

Recorded by the architect. These come from reading code, not from a failure anyone saw.
Severity and timing are the architect's opinion about the debt. They are not a
symptom severity. An item goes to pm only after someone sees it happen.

Severity scale used here:
- **high**: future work is built on it and it would let a real defect through unnoticed.
- **medium**: a real defect is plausible, but only for some users or situations.
- **low**: cosmetic, or harmless if it happens.

Open items are listed first, with the item that most affects future work at the top.

---

## TD-1: The gesture test (SEI-1 criterion 6) misses two of the three failures it is meant to catch

- **Found:** SEI-1 review, 2026-10-23. Checked against the code at `c3a657c`.
- **Where:** `tests/e2e/helpers.mjs:24-26` sets the flag and `:70` records it. The flag is
  read in `tests/e2e/gesture.spec.mjs:18-19` and `:31`. The method is in plan
  `docs/plans/sei-1.md` §6, row 6.
- **What:** a capture-phase `click` listener on `window` sets `__inDispatch = true`, and a
  bubble-phase listener clears it. The window bubble listener runs last. Microtasks queued
  by the card's listener run after that listener returns, which is before the window
  bubble listener runs. So the flag is still `true` while those microtasks run, and the
  test passes. Mutations the reviewer ran on `openFromCard` (`app/src/shell.js:314-318`)
  against `gesture.spec` (28 tests, all 4 projects):
  - a) `await Promise.resolve()` before `render`: 28 passed, 0 failed. Not caught anywhere.
  - b) `await import("./games/registry.js")` before `render`: 3 failed, all on `desktop`
    (Chromium). Not caught on WebKit.
  - c) `setTimeout(…, 0)`: 12 failed. Caught on every project.
- **The reviewer's fix will probably not work either.** The suggestion was to record
  whether `window.event` is set. In the DOM spec's "inner invoke", the current event is
  set at step 10, the listener is called at step 13 and the event is restored only at
  step 15 (dom.spec.whatwg.org, fetched 2026-10-23). My reading is that the microtask
  checkpoint runs inside step 13, as part of WebIDL's "clean up after running script".
  If so, `window.event` is still set during mutation (a), and that test would also pass.
  This has not been run. The mutation run in the fix below settles it either way.
- **Severity: high.** SEI-2 to SEI-4 put real game code between the tap and `say()`.
  Plan §3.1 rule 3 forbids `await` there, and this test is the only automatic check of
  that rule. As it stands, a port that adds an `await` passes. Whether a microtask delay
  actually breaks first-tap speech on iPad Safari is not known (plan R1). Until a device
  shows otherwise, the test should enforce the rule as written.
- **When:** fix it before SEI-2 starts, as a separate small change, so that SEI-2 is
  reviewed against a test that works.
- **Fix (amends plan §6 row 6, see the amendment note in `docs/plans/sei-1.md`):** In
  `installFakeSpeech`'s init script, wrap `EventTarget.prototype.addEventListener`.
  For `click` listeners, the wrapper sets `window.__inListener++` before calling the
  original and `window.__inListener--` in `finally`. A `WeakMap` maps each original
  listener to its wrapper so that `removeEventListener` still works. The fake `speak`
  records `inDispatch: window.__inListener > 0`. Remove the two window flag listeners
  (`helpers.mjs:25-26`). Microtasks run only after the wrapper's `finally`, so all three
  mutations record `false`. This works because every app click listener is attached with
  `addEventListener` (`shell.js:163,164,207,322`, `listen-button.js:34`). A future
  `onclick =` property would not be wrapped, so add a line saying so to the `shell.js`
  header comment next to the existing `stopPropagation` note. Also rewrite or delete the
  `gesture.spec.mjs:54-61` test, which checks the old flag. Under the new method,
  `stopPropagation` no longer affects the test.
- **Done when:** with each of mutations a, b and c applied to `openFromCard` one at a
  time, and then with mutation a applied to the `onTap` path in `shell.js:150-159`,
  `npx playwright test tests/e2e/gesture.spec.mjs` fails on all 4 projects for the
  tests that cover that path. Unmutated, it passes on all 4. The pass/fail counts per
  mutation are written into the hand-over.

## TD-2: Two different descriptions of the game contract

- **Found:** SEI-1 review, 2026-10-23.
- **Where:** `app/src/games/registry.js:8` says "A game is an object { create(ctx) }".
  Plan §3.1 says "an ES module whose default export is { create(ctx) }".
- **What:** the code uses the object form. `registry.js` puts the object returned by
  `placeholder(...)` into `module` (`registry.js:54,66,81`), and the shell calls
  `game.module.create` (`shell.js:173`). Nobody approved the change of wording.
- **Decision (architect, 2026-10-23):** the two descriptions do not conflict, and SEI-2
  to SEI-4 build against this combined wording: *"A game is an object `{ create(ctx) }`.
  Each real game lives in `app/src/games/<id>.js` and default-exports that object.
  `registry.js` imports it statically and puts it in the entry's `module` field."* The
  placeholder keeps its factory form until it is removed. Plan §3.1 is amended to match.
  The comment at `registry.js:8` gets the same wording in SEI-2, which is the first task
  that adds a game file.
- **Severity: low.** It is only wording, and both descriptions work with the current code.
- **When:** in SEI-2, as part of that work. Plan SEI-2 against the combined wording.

## TD-3: A quick card tap after Etusivu might be overwritten by the front page

- **Found:** SEI-1 review, 2026-10-23.
- **Where:** `app/src/shell.js:305-311` (`goBack`), `:314-318` (`openFromCard`),
  `:324` (popstate → `renderFromLocation`).
- **What:** `goBack` calls `history.back()`, which completes later, and then shows the
  front page straight away. Normally the `popstate` that follows does nothing, because
  the route is already `home` (`shell.js:293`). Suppose a card is tapped after
  `history.back()` but before the back step has completed. That card's `pushState` and
  the late back step then run in an order that has not been checked. One possible
  result is that the URL ends at `#/` and `popstate` shows the front page over the game
  that was just opened. Nobody has seen this happen and it has not been reproduced.
- **Severity: low.** It needs a second tap within the moment before the back step
  completes. The worst outcome is the front page with the speech stopped, and one more
  tap fixes it.
- **When:** no scheduled fix. Fix it if someone sees it happen, or if a later task changes
  `goBack` anyway. Likely fix: remember that a back step is pending and ignore the next
  `popstate` that arrives while it is.

## TD-4: The "no sound" notice may not be read out by VoiceOver

- **Found:** SEI-1 review, 2026-10-23.
- **Where:** `app/src/shell.js:54-55` (clear, then refill in the same tick), `:59-62`
  (`hideNotice` clears `#live` for any view), `app/index.html:18` (`#live`, polite).
- **What:** (1) Clearing the region and refilling it in the same tick gives one final
  change. When the text is the same as last time, which happens after every failed
  Kuuntele tap, VoiceOver often does not read it again. (2) `hideNotice(view)` empties
  `#live` even when `view` is not the visible game. It is called for every view from
  the `voiceschanged` loop (`shell.js:88-95`) and from `showError`. So an announcement
  for the visible game can be removed before it is read. Not observed. No VoiceOver user
  is known.
- **Severity: medium for screen-reader users, none for everyone else.** The notice itself
  is still shown on screen.
- **When:** next time `shell.js` notice code is touched, or before any VoiceOver use is
  expected, whichever is first. Fix: set the text in a later task (`setTimeout` is fine
  here because no speech depends on it), and have `hideNotice` clear `#live` only when
  `view === current`. Check with VoiceOver on the iPad. The automated tests cannot hear it.

## TD-5: A test comment describes a check the test does not make

- **Found:** SEI-1 review, 2026-10-23.
- **Where:** `tests/e2e/navigation.spec.mjs:51-52`.
- **What:** the comment says "going back again does not reopen the game", but the test
  only checks the URL after the last Etusivu. The history-length check on line 47 is what
  actually guards the "one step" claim.
- **Severity: low.**
- **When:** in the same change as TD-1, since it is test-only. Either add
  `await page.goBack()` and check that the URL does not match `#/matikka`, or change the
  comment to describe the URL check.
