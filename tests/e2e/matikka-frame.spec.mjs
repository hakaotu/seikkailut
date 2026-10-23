// SEI-1 criteria 3-5 (fit, target sizes, stuck speech) run against the real Matikka (plan O1).
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, settle, buttonRects, checkSizes, noSidewaysOverflow } from './helpers.mjs';
import {
  openMatikka, startRound, answerRight, answerWrong, next, playRound, typeNumber, view, button,
} from './matikka-helpers.mjs';

let seed = 500;
test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, (seed += 1));
});

// Walks through every screen of the game and runs `check(name)` on each.
async function eachScreen(page, testInfo, check) {
  await openMatikka(page, testInfo);
  await check('choose');
  await startRound(page, testInfo, { level: 'Helppo' });
  await check('Helppo, unanswered');
  await answerWrong(page, testInfo);
  await check('Helppo answered wrong');
  await press(view(page).locator('.mk-change'), testInfo);
  await settle(page);
  await check('mid-round choose');
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  await press(view(page).locator('.mk-change'), testInfo);
  await settle(page);
  await press(view(page).getByRole('radio', { name: /^Vaikea/ }), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  await typeNumber(page, testInfo, '9999');
  await check('Vaikea 9999 typed');
  await press(button(page, 'OK, tarkista vastaus'), testInfo);
  await check('Vaikea 9999 answered wrong');
  await next(page, testInfo);
  for (let i = 2; i <= 10; i++) {
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  await check('end screen');
}

test('SEI-1 / 3: no sideways scroll on any screen; on the device sizes no vertical scroll either', async ({ page }, testInfo) => {
  await eachScreen(page, testInfo, async (name) => {
    await noSidewaysOverflow(page, name);
    if (testInfo.project.name === 'narrow') return; // narrow windows may scroll vertically (design 3.9)
    const ih = await page.evaluate(() => window.innerHeight);
    for (const r of await buttonRects(page)) expect(r.bottom, `${name}: ${r.name} bottom`).toBeLessThanOrEqual(ih);
    const sh = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(sh, `${name}: scrollHeight`).toBeLessThanOrEqual(ih);
  });
});

test('SEI-1 / 3: the longest problem, 9999 typed, stays inside its row', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Vaikea', ops: ['sub'] });
  await typeNumber(page, testInfo, '9999');
  const fits = await page.evaluate(() => {
    const p = document.querySelector('.game-view[data-game="matikka"] .mk-problem');
    return { scrollWidth: p.scrollWidth, clientWidth: p.clientWidth, font: p.style.fontSize };
  });
  expect(fits.scrollWidth, JSON.stringify(fits)).toBeLessThanOrEqual(fits.clientWidth);
  await noSidewaysOverflow(page, '9999');
});

test('SEI-1 / 3: the longest problem, 100 - 100 answered wrong with 9999, stays inside its slot', async ({ page }, testInfo) => {
  await page.addInitScript(() => { Math.random = () => 0.99999; }); // after the seed: forces 100 - 100
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Vaikea', ops: ['sub'] });
  expect(await view(page).locator('.mk-problem').getAttribute('aria-label')).toBe('Lasku 1 / 10: 100 miinus 100');
  await typeNumber(page, testInfo, '9999');
  await press(button(page, 'OK, tarkista vastaus'), testInfo);
  await expect(view(page).locator('.mk-yours')).toBeVisible();
  const fits = await page.evaluate(() => {
    const p = document.querySelector('.game-view[data-game="matikka"] .mk-problem');
    const y = p.querySelector('.mk-yours');
    const slot = p.parentElement.getBoundingClientRect();
    const mark = y.querySelector('.mk-mark').getBoundingClientRect();
    const yr = y.getBoundingClientRect();
    return {
      scrollWidth: p.scrollWidth, clientWidth: p.clientWidth, font: p.style.fontSize,
      yoursRight: Math.max(yr.right, mark.right), slotRight: slot.right, yoursLeft: yr.left, slotLeft: slot.left,
    };
  });
  const info = JSON.stringify(fits);
  expect(fits.scrollWidth, info).toBeLessThanOrEqual(fits.clientWidth);
  expect(fits.yoursRight, info).toBeLessThanOrEqual(fits.slotRight);
  expect(fits.yoursLeft, info).toBeGreaterThanOrEqual(fits.slotLeft);
  await noSidewaysOverflow(page, '100 - 100 answered wrong');
  // the device projects fit on one row; only the narrow window may drop the chip under the box
  const wrapped = await view(page).locator('.mk-problem').evaluate((n) => n.classList.contains('is-wrapped'));
  expect(wrapped, info).toBe(testInfo.project.name === 'narrow');
});

test('SEI-1 / 4: every button is at least 44 x 44 with touch-action: manipulation, on every screen', async ({ page }, testInfo) => {
  await eachScreen(page, testInfo, async (name) => {
    // On the narrow window the page scrolls while it is driven; the sticky bar would then cover
    // Kuuntele, and the frame's 12 px gap rule is about the page as it opens.
    await page.evaluate(() => window.scrollTo(0, 0));
    await checkSizes(page, name);
  });
});

test('SEI-1 / 4: a Helppo round and a Keskitaso round can be played by tapping only (touch projects)', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'touch projects only');
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 6);
  await expect(view(page).locator('.mk-end')).toBeVisible();
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  await press(view(page).locator('.mk-change'), testInfo);
  await settle(page);
  await press(view(page).getByRole('radio', { name: /^Keskitaso/ }), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  await playRound(page, testInfo, 6);
  await expect(view(page).locator('.mk-end')).toBeVisible();
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await expect(view(page).locator('.mk-play')).toBeVisible();
});

for (const mode of ['nostart', 'noend', 'absent']) {
  test(`SEI-1 / 5: a whole round plays to the end while speech is stuck (${mode})`, async ({ page }, testInfo) => {
    await installFakeSpeech(page, { mode });
    await openMatikka(page, testInfo);
    await startRound(page, testInfo, { level: 'Helppo' });
    for (let i = 0; i < 10; i++) {
      await answerRight(page, testInfo);
      await expect(view(page).locator('.mk-next')).toBeEnabled(); // at once, not after onend
      await expect(view(page).locator('.listen')).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Etusivu' })).toBeEnabled();
      await next(page, testInfo);
    }
    await expect(view(page).locator('.mk-end')).toBeVisible();
    await expect(view(page).locator('.listen')).toBeEnabled();
    await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.badge:visible')).toHaveCount(0);
  });
}
