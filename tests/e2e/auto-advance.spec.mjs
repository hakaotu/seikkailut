// Automatic advance after a right answer (SEI-46, design docs/design/sei-46.md). Every test body runs
// against a game driver, so the next game that gets the wait runs the same bodies (SEI-47).
// The waits are real time: the games' tap guard reads performance.now(), which page.clock would freeze
// (docs/plans/sei-3.md D5). The 4000 ms is not configurable from a test on purpose.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import { AUTO_ADVANCE_MS } from '../../app/src/games/auto-advance.js';
import * as mk from './matikka-helpers.mjs';

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
  itemSel: '.mk-problem', // its aria-label changes with every new item
  itemNo: async (page) => Number(/^Lasku (\d+) \/ 10/.exec(await mk.view(page).locator('.mk-problem').getAttribute('aria-label'))[1]),
  itemLabelStart: (n) => `Lasku ${n} /`,
  nextSel: '.mk-next',
  nextName: 'Seuraava lasku',
  lastLabel: 'Katso tulos',
  autoSentence: 'Seuraava lasku tulee itsestään.',
  liveSel: '.mk-live',
  changeSel: '.mk-change',
  backName: 'Takaisin laskuun',
  endSel: '.mk-end',
};
const GAMES = [matikka];

const isDesktop = (testInfo) => testInfo.project.name === 'desktop';

// Records the time of every click (capture phase) and of every change of the item's label, in the page.
async function trackTimes(page, d) {
  await page.evaluate((sel) => {
    window.__clicks = [];
    window.__changes = [];
    document.addEventListener('click', () => window.__clicks.push(performance.now()), true);
    const el = document.querySelector(`.game-view:not([hidden]) ${sel}`);
    new MutationObserver(() => window.__changes.push({ at: performance.now(), label: el.getAttribute('aria-label') })).observe(el, {
      attributes: true,
      attributeFilter: ['aria-label'],
    });
  }, d.itemSel);
}

// For each label change after the first (the first is the round's start): ms since the last click before it.
function gaps(page) {
  return page.evaluate(() =>
    window.__changes.slice(1).map((c) => c.at - Math.max(...window.__clicks.filter((t) => t < c.at))),
  );
}

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
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
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
      await expect.poll(async () => (await speakCalls(page)).length, { timeout: 6000 }).toBe(3);
      const calls = await speakCalls(page);
      // 0: the item read by Aloita, 1: the answer, 2: the new item (from the timer)
      expect(calls[1].endedAt).not.toBeNull();
      expect(calls[1].endedAt).toBeLessThan(calls[2].at);
      expect(calls[2].at - calls[1].at).toBeGreaterThanOrEqual(FOUR_S - 200);
    });

    test('46/3: the new item is read once, has focus, and Seuraava is hidden and not counting', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
      await page.waitForTimeout(300);
      const calls = await speakCalls(page);
      expect(calls.length).toBe(3);
      expect(calls[2].inDispatch).toBe(false);
      await expect(d.view(page).locator(d.itemSel)).toBeFocused();
      await expect(nextBtn(page, d)).toBeHidden();
      expect(await isCounting(page, d)).toBe(false);
    });

    test('46/4: a wrong answer starts no wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.wrong(page, testInfo);
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      await expect(nextBtn(page, d)).toBeVisible();
      expect((await speakCalls(page)).length).toBe(2);
    });

    test('46/5: Seuraava skips the wait, once; the stale timer does nothing', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await page.waitForTimeout(1000);
      await press(nextBtn(page, d), testInfo);
      expect(await d.itemNo(page)).toBe(2);
      expect(await isCounting(page, d)).toBe(false); // the wait ended with the tap
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(2);
      await expect(nextBtn(page, d)).toBeHidden(); // item 2 is still unanswered
      expect((await speakCalls(page)).length).toBe(3); // Aloita, the answer, Seuraava's reading
    });

    test('46/5: Seuraava pressed the moment the timer has advanced changes nothing more', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await toItem(page, testInfo, d, 2);
      // in the page: when the timer brings item 3, press Seuraava in the same task
      const racing = page.evaluate(
        ({ itemSel, nextSel, target }) =>
          new Promise((resolve) => {
            const item = document.querySelector(`.game-view:not([hidden]) ${itemSel}`);
            const obs = new MutationObserver(() => {
              if (!item.getAttribute('aria-label').startsWith(target)) return;
              obs.disconnect();
              document.querySelector(`.game-view:not([hidden]) ${nextSel}`).click();
              resolve(item.getAttribute('aria-label'));
            });
            obs.observe(item, { attributes: true, attributeFilter: ['aria-label'] });
            setTimeout(() => resolve('timeout'), 7000);
          }),
        { itemSel: d.itemSel, nextSel: d.nextSel, target: d.itemLabelStart(3) },
      );
      await d.right(page, testInfo);
      expect(await racing).toMatch(/^Lasku 3 \//);
      await page.waitForTimeout(600);
      expect(await d.itemNo(page)).toBe(3);
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
      const before = (await speakCalls(page)).length; // Aloita, the answer, Kuuntele
      expect(before).toBe(3);
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(before);
    });

    test('46/6: a page that turns hidden ends the wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(2);
    });

    test('46/6: Tab to another control ends the wait (keyboard)', async ({ page }, testInfo) => {
      test.skip(!isDesktop(testInfo), 'keyboard focus');
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toBeFocused(); // the game moved focus here; that does not end the wait
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await page.keyboard.press('Tab');
      await expect(nextBtn(page, d)).not.toBeFocused();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(2);
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
      expect(await d.itemNo(page)).toBe(1);
    });

    test('46/6: taps that change nothing do not end the wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      // an empty part of the card, and a locked answer button
      const area = await d.view(page).locator('.game-panel').boundingBox();
      await page.mouse.click(area.x + 6, area.y + area.height - 6);
      await d.view(page).locator('.mk-option').first().click({ force: true });
      await expect(nextBtn(page, d)).toHaveClass(/aa-counting/);
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
    });

    test('46/6: coming back shows the same item with a full Seuraava, no reading, no new wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
      await press(page.locator(d.cardSel), testInfo);
      await expect(d.view(page)).toBeVisible();
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      const before = (await speakCalls(page)).length;
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(before);
      expect(before).toBe(2); // Aloita and the answer; the card tap on a resumed round reads nothing
    });

    test('46/6: Vaihda then back to the round: the same item, a full Seuraava, no new wait', async ({ page }, testInfo) => {
      await begin(page, testInfo, d);
      await d.right(page, testInfo);
      await press(d.view(page).locator(d.changeSel), testInfo);
      await settle(page);
      await press(d.view(page).getByRole('button', { name: d.backName }), testInfo);
      await expect(nextBtn(page, d)).toBeVisible();
      expect(await isCounting(page, d)).toBe(false);
      await page.waitForTimeout(WAIT);
      expect(await d.itemNo(page)).toBe(1);
      expect((await speakCalls(page)).length).toBe(2);
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
      expect(await d.itemNo(page)).toBe(10);
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
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
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
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
      await expect(live).toHaveText(/^Lasku 2 \/ 10: .*\.$/);
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
        await expect.poll(() => d.itemNo(page), { timeout: 8000 }).toBe(i);
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
      await expect.poll(() => d.itemNo(page), { timeout: 6000 }).toBe(2);
      await page.waitForTimeout(2500);
      const calls = await speakCalls(page);
      expect(calls[calls.length - 1].refused).toBe(true);
      expect(calls[calls.length - 1].inDispatch).toBe(false);
      await expect(listen(page, d)).toHaveAttribute('data-state', 'ready');
      await expect(listen(page, d)).toContainText('Kuuntele');
      await expect(d.view(page).locator('.notice')).toBeHidden();
      expect(await d.itemNo(page)).toBe(2);
      await press(listen(page, d), testInfo);
      const after = await speakCalls(page);
      expect(after[after.length - 1].inDispatch).toBe(true);
      expect(after[after.length - 1].refused).toBeUndefined();
    });
  }
}
