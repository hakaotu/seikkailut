// Automatic advance after a right answer (SEI-46, design docs/design/sei-46.md). Every test body runs
// against a game driver, so the next game that gets the wait runs the same bodies (SEI-47).
// The waits are real time: the games' tap guard reads performance.now(), which page.clock would freeze
// (docs/plans/sei-3.md D5). The 4000 ms is not configurable from a test on purpose.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import { AUTO_ADVANCE_MS } from '../../app/src/games/auto-advance.js';
import * as mk from './matikka-helpers.mjs';
import * as sn from './sanat-helpers.mjs';
import * as es from './espanja-helpers.mjs';

// The design's number, written out here on purpose: a test that reads the app's constant would
// follow it when it is changed by mistake. 47/14 below checks the app's constant against this one.
const FOUR_S = 4000;
const WAIT = FOUR_S + 500; // long enough to see that nothing happened

const matikka = {
  name: 'Matikka',
  view: mk.view,
  cardSel: 'button.game-card[data-game="matikka"]',
  open: mk.openMatikka,
  start: (page, testInfo) => mk.startRound(page, testInfo, { level: 'Helppo' }),
  right: mk.answerRight,
  wrong: mk.answerWrong,
  next: mk.next,
  // The item's label: the problem's aria-label changes with every new item.
  probe: { sel: '.mk-problem', attr: 'aria-label' },
  focusSel: '.mk-problem', // where focus goes on a new item
  itemLabelStart: (n) => `Lasku ${n} /`,
  newItemLive: (n) => new RegExp(`^Lasku ${n} / 10: .*\\.$`),
  readParts: 1, // speak calls a new item makes (Sanat reads a word twice)
  wrongShowsNext: true, // a wrong answer leaves Seuraava visible and starts no wait
  lockedSel: '.mk-option', // a control that is locked after the answer
  nextSel: '.mk-next',
  nextName: 'Seuraava lasku',
  lastLabel: 'Katso tulos',
  autoSentence: 'Seuraava lasku tulee itsestään.',
  liveSel: '.mk-live',
  changeSel: '.mk-change',
  backName: 'Takaisin laskuun',
  endSel: '.mk-end',
};

const sanat = {
  name: 'Sanat',
  view: sn.view,
  cardSel: 'button.game-card[data-game="sanat"]',
  open: sn.openSanat,
  start: (page, testInfo) => sn.startRound(page, testInfo, { level: 'Helppo' }),
  right: sn.spellRight,
  wrong: sn.spellWrong,
  next: sn.next,
  // The label of the item is the live region's last "Sana n / 10" text (answers have other texts).
  probe: { sel: '.sn-live', text: true, match: '^Sana \\d+ / 10' },
  focusSel: '.sn-image', // Helppo: the picture is a button and gets the focus
  itemLabelStart: (n) => `Sana ${n} /`,
  newItemLive: (n) => new RegExp(`^Sana ${n} / 10\\. \\d+ kirjainta\\. Vihje: .*$`),
  readParts: 2,
  wrongShowsNext: false,
  lockedSel: '.sn-tile',
  nextSel: '.sn-next',
  nextName: 'Seuraava sana',
  lastLabel: 'Katso tulos',
  autoSentence: 'Seuraava sana tulee itsestään.',
  liveSel: '.sn-live',
  changeSel: '.sn-change',
  backName: 'Takaisin sanaan',
  endSel: '.sn-end',
};
// Espanja is driven in Espanja -> Suomi, so that a new question is read from the timer and the shared "new item is
// read once" rows apply. Suomi -> Espanja reads nothing on a new question and has its own rows below.
const espanja = {
  name: 'Espanja',
  view: es.view,
  cardSel: 'button.game-card[data-game="espanja"]',
  open: es.openEspanja,
  start: (page, testInfo) => es.startRound(page, testInfo, { direction: 'es2fi' }),
  right: es.answerRight,
  wrong: es.answerWrong,
  next: es.next,
  probe: { sel: '.es-word', attr: 'aria-label' },
  focusSel: '.es-word',
  itemLabelStart: (n) => `Kysymys ${n} /`,
  newItemLive: (n) => new RegExp(`^Kysymys ${n} / 10: .*\\.$`),
  readParts: 1,
  wrongShowsNext: true,
  lockedSel: '.es-option',
  nextSel: '.es-next',
  nextName: 'Seuraava kysymys',
  lastLabel: 'Katso tulos',
  autoSentence: 'Seuraava kysymys tulee itsestään.',
  liveSel: '.es-live',
  changeSel: '.es-change',
  backName: 'Takaisin kysymykseen',
  endSel: '.es-end',
};
const GAMES = [matikka, sanat, espanja];

const isDesktop = (testInfo) => testInfo.project.name === 'desktop';

// In the page: the time of every click (capture phase), the time of every change of the item's label, and
// the current label (window.__label()). The label is read as the driver's probe says.
async function trackTimes(page, d) {
  await page.evaluate((probe) => {
    window.__clicks = [];
    window.__changes = [];
    document.addEventListener('click', () => window.__clicks.push(performance.now()), true);
    const el = document.querySelector(`.game-view:not([hidden]) ${probe.sel}`);
    let label = null;
    const read = () => {
      const v = probe.text ? el.textContent : el.getAttribute(probe.attr);
      if (v && (!probe.match || new RegExp(probe.match).test(v))) return v;
      return null;
    };
    label = read();
    window.__label = () => label;
    new MutationObserver(() => {
      const v = read();
      if (v === null || v === label) return;
      label = v;
      window.__changes.push({ at: performance.now(), label });
    }).observe(el, { attributes: true, childList: true, characterData: true, subtree: true });
  }, d.probe);
}

// For each label change after the first (the first is the round's start): ms since the last click before it.
function gaps(page) {
  return page.evaluate(() =>
    window.__changes.slice(1).map((c) => c.at - Math.max(...window.__clicks.filter((t) => t < c.at))),
  );
}

const itemNo = async (page) => Number(/(\d+) \/ 10/.exec(await page.evaluate(() => window.__label()))[1]);
const speakCount = async (page) => (await speakCalls(page)).length;
// The number of speak calls once any reading that was just started has had its pause and second part.
const quietCount = async (page) => {
  await page.waitForTimeout(1500);
  return speakCount(page);
};

const nextBtn = (page, d) => d.view(page).locator(d.nextSel);
// Read at once, not retried: a retrying expect would wait for a stale timer to remove the class by itself.
const isCounting = (page, d) => nextBtn(page, d).evaluate((e) => e.classList.contains('aa-counting'));
const listen = (page, d) => d.view(page).locator('.listen');

// Plays items 1..n-1 right, leaving each wait by pressing Seuraava.
async function toItem(page, testInfo, d, n) {
  for (let i = 1; i < n; i++) {
    await d.right(page, testInfo);
    await d.next(page, testInfo);
  }
}

// An opened game with a round started and the timing tracker installed. `speech` is the fake speech's options.
async function begin(page, testInfo, d, { seed = 21, speech = {} } = {}) {
  await installFakeSpeech(page, speech);
  await seedRandom(page, seed);
  await d.open(page, testInfo);
  await trackTimes(page, d);
  await d.start(page, testInfo);
}

for (const d of GAMES) {
  test.describe(d.name, () => {
    test('46/1: a right answer starts the wait; the new item comes by itself at 4 s', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const btn = nextBtn(page, d);
      await expect(btn).toHaveClass(/aa-counting/);
      await expect(btn).toBeVisible();
      const fill = btn.locator('.aa-fill');
      expect(await fill.evaluate((e) => getComputedStyle(e).animationDuration)).toBe(`${FOUR_S / 1000}s`);
      await expect(btn.locator('.aa-ticks')).toBeHidden(); // no reduced motion: no ticks
      const waiting = await btn.boundingBox();
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
      if (isDesktop(testInfo)) {
        const [gap] = await gaps(page);
        console.log(`${d.name}: right answer to new item ${gap.toFixed(0)} ms`);
        expect(gap).toBeGreaterThanOrEqual(FOUR_S - 10);
        expect(gap).toBeLessThanOrEqual(FOUR_S + 800);
      }
      // the same button without the wait: answer item 2 and end that wait with Kuuntele
      await d.right(page, testInfo);
      await press(listen(page, d), testInfo);
      expect(await isCounting(page, d)).toBe(false);
      const plain = await btn.boundingBox();
      expect(Math.abs(plain.width - waiting.width)).toBeLessThanOrEqual(0.5);
      expect(Math.abs(plain.height - waiting.height)).toBeLessThanOrEqual(0.5);
    });

    test('46/2: the answer is spoken to its end before the new item is read', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page); // the last call is the answer
      await expect.poll(() => speakCount(page), { timeout: 6000 }).toBeGreaterThan(base);
      const calls = await speakCalls(page);
      // calls[base - 1]: the answer, calls[base]: the new item (from the timer)
      expect(calls[base - 1].endedAt).not.toBeNull();
      expect(calls[base - 1].endedAt).toBeLessThan(calls[base].at);
      expect(calls[base].at - calls[base - 1].at).toBeGreaterThanOrEqual(FOUR_S - 200);
    });

    test('46/3: the new item is read once, has focus, and Seuraava is hidden and not counting', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page);
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
      expect(await quietCount(page)).toBe(base + d.readParts); // once: all the parts of one reading
      const calls = await speakCalls(page);
      expect(calls[base].inDispatch).toBe(false);
      await expect(d.view(page).locator(d.focusSel)).toBeFocused();
      await expect(nextBtn(page, d)).toBeHidden();
      expect(await isCounting(page, d)).toBe(false);
    });

    test('46/4: a wrong answer starts no wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.wrong(page, testInfo);
      if (d.wrongShowsNext) await expect(nextBtn(page, d)).toBeVisible();
      else await expect(nextBtn(page, d)).toBeHidden(); // a wrong word is tried again, there is nothing to go on to
      expect(await isCounting(page, d)).toBe(false);
      const base = await quietCount(page);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      if (d.wrongShowsNext) await expect(nextBtn(page, d)).toBeVisible();
      expect(await speakCount(page)).toBe(base);
    });

    test('46/5: Seuraava skips the wait, once; the stale timer does nothing', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await page.waitForTimeout(1000);
      await press(nextBtn(page, d), testInfo);
      expect(await itemNo(page)).toBe(2);
      expect(await isCounting(page, d)).toBe(false); // the wait ended with the tap
      const base = await quietCount(page); // Seuraava's own reading is done
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(2);
      await expect(nextBtn(page, d)).toBeHidden(); // item 2 is still unanswered
      expect(await speakCount(page)).toBe(base);
    });

    test('46/5: Seuraava pressed the moment the timer has advanced changes nothing more', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await toItem(page, testInfo, d, 2);
      // in the page: when the timer brings item 3, press Seuraava in the same task
      const racing = page.evaluate(
        ({ nextSel, target }) =>
          new Promise((resolve) => {
            const obs = new MutationObserver(() => {
              const label = window.__label();
              if (!label || !label.startsWith(target)) return;
              obs.disconnect();
              document.querySelector(`.game-view:not([hidden]) ${nextSel}`).click();
              resolve(label);
            });
            obs.observe(document.querySelector('.game-view:not([hidden])'), { attributes: true, childList: true, characterData: true, subtree: true });
            setTimeout(() => resolve('timeout'), 7000);
          }),
        { nextSel: d.nextSel, target: d.itemLabelStart(3) },
      );
      await d.right(page, testInfo);
      expect(await racing).toMatch(/^(Lasku|Sana|Kysymys) 3 \//);
      await page.waitForTimeout(600);
      expect(await itemNo(page)).toBe(3);
      await expect(nextBtn(page, d)).toBeHidden(); // unanswered
    });

    test('46/6: leaving ends the wait: Etusivu', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      const before = (await speakCalls(page)).length;
      await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
      await expect(page.locator('#home')).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      await expect(page.locator('#home')).toBeVisible();
      await expect(d.view(page)).toBeHidden();
      expect((await speakCalls(page)).length).toBe(before);
    });

    test('46/6: leaving ends the wait: Vaihda', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await press(d.view(page).locator(d.changeSel), testInfo);
      expect(await isCounting(page, d)).toBe(false);
      const before = (await speakCalls(page)).length;
      await page.waitForTimeout(WAIT);
      expect(await d.view(page).getByRole('button', { name: d.backName }).isVisible()).toBe(true); // still the choose screen
      expect((await speakCalls(page)).length).toBe(before);
    });

    test('46/6: leaving ends the wait: Kuuntele', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await press(listen(page, d), testInfo);
      expect(await isCounting(page, d)).toBe(false);
      await expect(nextBtn(page, d)).toBeVisible();
      const before = await quietCount(page); // Kuuntele's own reading is done
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(before);
    });

    test('46/6: a page that turns hidden ends the wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      expect(await speakCount(page)).toBe(base);
    });

    test('46/6: Tab to another control ends the wait (keyboard)', async ({ page }, testInfo) => {
      test.skip(!isDesktop(testInfo), 'keyboard focus');
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page);
      await expect(nextBtn(page, d)).toBeFocused(); // the game moved focus here; that does not end the wait
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await page.keyboard.press('Tab');
      await expect(nextBtn(page, d)).not.toBeFocused();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      expect(await speakCount(page)).toBe(base);
    });

    test('46/6: Selvä on the Ei ääntä notice ends the wait', async ({ page }, testInfo) => {
      // speech accepted but never started: the notice appears 2 s after the answer's reading
      await begin(page, testInfo, d, { speech: { mode: 'nostart' } });
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      const notice = d.view(page).locator('.notice');
      await expect(notice).toBeVisible({ timeout: 3500 });
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/); // the notice alone does not end it
      await press(notice.locator('.ok-btn'), testInfo);
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
    });

    test('46/6: taps that change nothing do not end the wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      // an empty part of the card, and a locked answer button
      const area = await d.view(page).locator('.game-panel').boundingBox();
      await page.mouse.click(area.x + 6, area.y + area.height - 6);
      await d.view(page).locator(d.lockedSel).first().click({ force: true });
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
    });

    test('46/6: coming back shows the same item with a full Seuraava, no reading, no new wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page);
      await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
      await press(page.locator(d.cardSel), testInfo);
      await expect(d.view(page)).toBeVisible();
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      expect(await speakCount(page)).toBe(base); // the card tap on a resumed round reads nothing
    });

    test('46/6: Vaihda then back to the round: the same item, a full Seuraava, no new wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const base = await speakCount(page);
      await press(d.view(page).locator(d.changeSel), testInfo);
      await settle(page);
      await press(d.view(page).getByRole('button', { name: d.backName }), testInfo);
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await itemNo(page)).toBe(1);
      expect(await speakCount(page)).toBe(base); // nothing changed, so nothing is read
    });

    test('46/7: a right answer on item 10 shows Katso tulos, no wait, no end screen by itself', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await toItem(page, testInfo, d, 10);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveText(d.lastLabel);
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      await expect(d.view(page).locator(d.endSel)).toBeHidden();
      expect(await itemNo(page)).toBe(10);
    });

    test('46/8: reduced motion: four steps and three ticks, same timing', async ({ page }, testInfo) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const btn = nextBtn(page, d);
      await expect(btn).toHaveClass(/aa-counting/);
      const fill = btn.locator('.aa-fill');
      expect(await fill.evaluate((e) => getComputedStyle(e).animationTimingFunction)).toMatch(/^steps\(4, (jump-)?start\)$/);
      await expect(btn.locator('.aa-ticks')).toBeVisible();
      expect(await btn.locator('.aa-ticks > i').count()).toBe(3);
      // the first step is 25 % filled, from the first moment until 1 s
      expect(await fill.evaluate((e) => getComputedStyle(e).clipPath)).toBe('inset(0px 75% 0px 0px)');
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
      if (isDesktop(testInfo)) {
        const [gap] = await gaps(page);
        console.log(`${d.name}, reduced motion: right answer to new item ${gap.toFixed(0)} ms`);
        expect(gap).toBeGreaterThanOrEqual(FOUR_S - 10);
      }
    });

    test('46/9: the right-answer announcement ends with the sentence on items 1-9, not on 10; the name does not change', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      const live = d.view(page).locator(d.liveSel);
      await expect(live).toHaveText(new RegExp(`${d.autoSentence}$`));
      await expect(d.view(page).getByRole('button', { name: d.nextName, exact: true })).toBeVisible();
      await expect(nextBtn(page, d)).toHaveText(/^Seuraava$/); // the layers add no text
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
      await expect(live).toHaveText(d.newItemLive(2));
      await expect(live).not.toContainText('itsestään');
    });

    test('46/9: item 10 announces no wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await toItem(page, testInfo, d, 10);
      await d.right(page, testInfo);
      await expect(d.view(page).locator(d.liveSel)).toHaveText(/^Oikein!/);
      await expect(d.view(page).locator(d.liveSel)).not.toContainText('itsestään');
    });

    test('46/10: a whole round with no tap between the answers; Katso tulos waits', async ({ page }, testInfo) => {
      test.skip(!isDesktop(testInfo), 'about 40 s of real time, desktop only');
      test.setTimeout(120000);
      await begin(page, testInfo, d);
      for (let i = 1; i <= 10; i++) {
        await expect.poll(() => itemNo(page), { timeout: 8000 }).toBe(i);
        await d.right(page, testInfo);
      }
      const g = await gaps(page);
      console.log(`${d.name}: nine gaps from the right answer to the next item, ms: ${g.map((x) => x.toFixed(0)).join(', ')}`);
      expect(g.length).toBe(9);
      for (const gap of g) {
        expect(gap).toBeGreaterThanOrEqual(FOUR_S - 10);
        expect(gap).toBeLessThanOrEqual(FOUR_S + 800);
      }
      await expect(nextBtn(page, d)).toHaveText(d.lastLabel);
      await page.waitForTimeout(WAIT);
      await expect(d.view(page).locator(d.endSel)).toBeHidden();
    });

    test('47/14: the waiting Seuraava is the shared one (aa-btn) and its fill runs for the shared constant', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await expect(nextBtn(page, d)).toHaveClass(/aa-btn/);
      await d.right(page, testInfo);
      const ms = await nextBtn(page, d).evaluate((e) => e.style.getPropertyValue('--aa-ms'));
      expect(AUTO_ADVANCE_MS).toBe(FOUR_S);
      expect(ms).toBe(`${AUTO_ADVANCE_MS}ms`);
    });
  });
}

// D2 (docs/plans/sei-3.md): the browser refuses speech that no tap started. The fake does the same.
for (const untrusted of ['error', 'silent']) {
  for (const d of GAMES) {
    test(`D2 ${d.name}: a refused auto reading (${untrusted}) leaves Kuuntele ready and shows no notice`, async ({ page }, testInfo) => {
      await begin(page, testInfo, d, { speech: { untrusted } });
      await d.right(page, testInfo);
      await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
      await page.waitForTimeout(2500);
      const calls = await speakCalls(page);
      expect(calls[calls.length - 1].refused).toBe(true);
      expect(calls[calls.length - 1].inDispatch).toBe(false);
      await expect(listen(page, d)).toHaveAttribute('data-state', 'ready');
      await expect(listen(page, d)).toContainText('Kuuntele');
      await expect(d.view(page).locator('.notice')).toBeHidden();
      expect(await itemNo(page)).toBe(2);
      await press(listen(page, d), testInfo);
      const after = await speakCalls(page);
      expect(after[after.length - 1].inDispatch).toBe(true);
      expect(after[after.length - 1].refused).toBeUndefined();
    });
  }
}

// ---- Sanat only (SEI-47): what has no counterpart in Matikka ----

test.describe('Sanat', () => {
  const d = sanat;
  const audio = (page) => page.evaluate(() => window.__audio);

  test('47/2: a wrong word starts no wait; once corrected a wait starts, and the next word comes', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await sn.spellWrong(page, testInfo);
    await page.waitForTimeout(WAIT);
    expect(await itemNo(page)).toBe(1);
    expect(await isCounting(page, d)).toBe(false);
    // two letters were swapped; start the word again and spell it right
    await press(sn.button(page, 'Aloita sana alusta'), testInfo);
    await sn.spellRight(page, testInfo);
    await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
    await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
  });

  test('47/2: a wrong word corrected by taking out one letter starts the wait', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    const word = await sn.currentWord(page);
    const wrong = sn.wrongSpelling(word, false);
    await sn.spell(page, testInfo, wrong);
    await expect(sn.view(page).locator('.sn-fb')).toHaveAttribute('data-kind', 'wrong');
    // take out the letters that differ, and put the right ones in
    const differing = [...word].map((l, i) => (l !== wrong[i] ? i : -1)).filter((i) => i >= 0);
    for (const i of differing) await press(sn.button(page, `Kirjain ${i + 1}: ${wrong[i]}. Poista.`), testInfo);
    await sn.spell(page, testInfo, differing.map((i) => word[i]).join(''));
    await expect(sn.view(page).locator('.sn-fb')).toHaveAttribute('data-kind', 'right');
    await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
  });

  test('47/3: a skipped word starts no wait; it waits for Seuraava', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await sn.skip(page, testInfo);
    await expect(nextBtn(page, d)).toBeVisible();
    expect(await isCounting(page, d)).toBe(false);
    const base = await quietCount(page);
    await page.waitForTimeout(WAIT);
    expect(await itemNo(page)).toBe(1);
    await expect(nextBtn(page, d)).toBeVisible();
    expect(await speakCount(page)).toBe(base);
  });

  test('47/4: the victory clip starts in the tap, is stopped at 3 s, and the next word is read only after that', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await d.right(page, testInfo);
    await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
    const [play, pause] = await audio(page);
    expect(play.kind).toBe('play');
    expect(play.inDispatch).toBe(true);
    expect(pause.kind).toBe('pause');
    expect(pause.at - play.at).toBeGreaterThanOrEqual(2990);
    expect(pause.at - play.at).toBeLessThanOrEqual(3400);
    const calls = await speakCalls(page);
    const nextWord = calls.filter((c) => c.rate === 0.78)[1];
    expect(nextWord.at - play.at).toBeGreaterThanOrEqual(FOUR_S - 10);
    expect(nextWord.at).toBeGreaterThan(pause.at);
  });

  test('47/7: tapping the picture ends the wait and reads the word', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await d.right(page, testInfo);
    await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
    await press(sn.button(page, 'Kuva. Kuuntele sana.'), testInfo);
    expect(await isCounting(page, d)).toBe(false);
    const base = await quietCount(page);
    await page.waitForTimeout(WAIT);
    expect(await itemNo(page)).toBe(1);
    expect(await speakCount(page)).toBe(base);
  });

  // The same round twice: moving on by timer, and moving on with Seuraava. The result must not differ.
  async function playPattern(page, testInfo, byTimer) {
    await installFakeSpeech(page);
    await seedRandom(page, 31);
    await sn.openSanat(page, testInfo);
    await trackTimes(page, d);
    await sn.startRound(page, testInfo, { level: 'Helppo' });
    const badges = [];
    for (let i = 1; i <= 10; i++) {
      const kind = i === 1 ? 'F' : i === 2 ? 'R' : i === 3 ? 'S' : 'F';
      if (kind === 'F') await sn.spellRight(page, testInfo);
      else if (kind === 'R') await sn.spellRetry(page, testInfo);
      else await sn.skip(page, testInfo);
      if (i === 10 || kind === 'S' || !byTimer) await sn.next(page, testInfo);
      else await expect.poll(() => itemNo(page), { timeout: 8000 }).toBe(i + 1);
      if (i === 3 || i === 6) {
        await expect.poll(() => itemNo(page)).toBe(i + 1);
        await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
        badges.push(await page.locator('.badge:visible .badge-text').textContent());
        await press(page.locator(d.cardSel), testInfo);
        await expect(sn.view(page).locator('.sn-play')).toBeVisible();
        await settle(page);
      }
    }
    return { badges, end: await sn.view(page).locator('.sn-result').innerText(), heading: await sn.view(page).locator('.sn-q-end').innerText() };
  }

  test('47/10: the result and the badge do not depend on how the child moved on', async ({ page, context }, testInfo) => {
    test.skip(!isDesktop(testInfo), 'about a minute of real time, desktop only');
    test.setTimeout(180000);
    const byTimer = await playPattern(page, testInfo, true);
    const page2 = await context.newPage();
    const byTap = await playPattern(page2, testInfo, false);
    expect(byTimer.badges).toEqual(['Kesken 3/10', 'Kesken 6/10']);
    expect(byTap).toEqual(byTimer);
    expect(byTimer.end).toContain('8 / 10');
    expect(byTimer.end).toContain('Vain 1 sana meni ensin väärin');
    expect(byTimer.end).toContain('1 sana ohitettu');
  });
});

// ---- Espanja only (SEI-48): what has no counterpart in Matikka or Sanat ----

test.describe('Espanja', () => {
  const d = espanja;
  const fi2es = { ...espanja, start: (page, testInfo) => es.startRound(page, testInfo, { direction: 'fi2es' }) };
  const home = (page, testInfo) => press(page.getByRole('button', { name: 'Etusivu' }), testInfo);

  test('48/3: a skipped question starts no wait; it waits for Seuraava', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await d.right(page, testInfo);
    await d.next(page, testInfo);
    await es.skip(page, testInfo);
    await expect(nextBtn(page, d)).toBeVisible();
    expect(await isCounting(page, d)).toBe(false);
    const base = await es.settledCount(page, 600); // the skip's own reading is done
    await page.waitForTimeout(WAIT);
    expect(await itemNo(page)).toBe(2);
    await expect(nextBtn(page, d)).toBeVisible();
    expect(await speakCount(page)).toBe(base);
  });

  test('48/7: Suomi -> Espanja moves on by itself with no reading; Kuuntele then reads the four options', async ({ page }, testInfo) => {
    await begin(page, testInfo, fi2es);
    await fi2es.right(page, testInfo);
    const base = await es.settledCount(page, 600); // the answer's reading
    await expect.poll(() => itemNo(page), { timeout: 6000 }).toBe(2);
    expect(await es.settledCount(page, 800)).toBe(base); // the new question is not read
    await press(listen(page, fi2es), testInfo);
    await expect.poll(() => speakCount(page), { timeout: 5000 }).toBe(base + 4);
    const calls = await speakCalls(page);
    expect(calls[base].inDispatch).toBe(true);
    expect(calls.slice(base).map((c) => c.text)).toEqual((await es.optionTexts(page)).map((t) => t.replace(/[¡!¿?]/g, '').trim()));
  });

  test('48/9: Vaihda during the wait, then a new round: question 1 stays', async ({ page }, testInfo) => {
    await begin(page, testInfo, d);
    await d.right(page, testInfo);
    await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
    await press(d.view(page).locator(d.changeSel), testInfo);
    await settle(page);
    await press(es.button(page, 'Aloita uusi kierros'), testInfo);
    await expect(d.view(page).locator('.es-play')).toBeVisible();
    await settle(page);
    expect(await itemNo(page)).toBe(1);
    await page.waitForTimeout(WAIT);
    expect(await itemNo(page)).toBe(1);
    expect(await isCounting(page, d)).toBe(false);
  });

  // The same round twice: moving on by timer, and moving on with Seuraava. The result must not differ.
  async function playPattern(page, testInfo, byTimer) {
    await installFakeSpeech(page);
    await seedRandom(page, 41);
    await es.openEspanja(page, testInfo);
    await trackTimes(page, d);
    await es.startRound(page, testInfo, { direction: 'fi2es' });
    const badges = [];
    const pattern = 'rwsrrrrrrr';
    for (let i = 1; i <= 10; i++) {
      const kind = pattern[i - 1];
      await (kind === 'r' ? es.answerRight : kind === 'w' ? es.answerWrong : es.skip)(page, testInfo);
      if (i === 10 || kind !== 'r' || !byTimer) await es.next(page, testInfo);
      else await expect.poll(() => itemNo(page), { timeout: 8000 }).toBe(i + 1);
      if (i === 3 || i === 6) {
        await expect.poll(() => itemNo(page)).toBe(i + 1);
        await home(page, testInfo);
        badges.push(await page.locator('.badge:visible .badge-text').textContent());
        await press(page.locator(d.cardSel), testInfo);
        await expect(es.view(page).locator('.es-play')).toBeVisible();
        await settle(page);
      }
    }
    return {
      badges,
      end: await es.view(page).locator('.es-result').innerText(),
      heading: await es.view(page).locator('.es-q-end').innerText(),
      stars: await es.view(page).locator('.status-slot').getAttribute('aria-label'),
    };
  }

  test('48/11: the result, the stars and the badge do not depend on how the child moved on', async ({ page, context }, testInfo) => {
    test.skip(!isDesktop(testInfo), 'about a minute of real time, desktop only');
    test.setTimeout(180000);
    const byTimer = await playPattern(page, testInfo, true);
    await page.evaluate(() => window.localStorage.removeItem('espanja.stars')); // the second player starts from 0 stars
    const page2 = await context.newPage();
    const byTap = await playPattern(page2, testInfo, false);
    expect(byTimer.badges).toEqual(['Kesken 3/10', 'Kesken 6/10']);
    expect(byTap).toEqual(byTimer);
    expect(byTimer.end).toContain('8 / 10');
    expect(byTimer.end).toContain('1 väärin');
    expect(byTimer.end).toContain('1 ohitettu');
    expect(byTimer.stars).toBe('Tähtiä: 1');
  });
});
