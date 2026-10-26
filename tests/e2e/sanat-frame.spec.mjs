// SEI-1 criteria 3-5 (fit, target sizes, stuck speech) run against the real Sanat (plan 9.5).
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, settle, buttonRects, checkSizes, noSidewaysOverflow } from './helpers.mjs';
import { view, button, openSanat, startRound, currentWord, spellWrong, spellRight, skip, next, playRound } from './sanat-helpers.mjs';

let seed = 900;
test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, (seed += 1));
});

// No sideways scroll anywhere; on the device projects every button is inside the window and the page does
// not scroll vertically (design 3.10; narrow windows may scroll).
async function fits(page, testInfo, name) {
  await noSidewaysOverflow(page, name);
  if (testInfo.project.name === 'narrow') return;
  const ih = await page.evaluate(() => window.innerHeight);
  for (const r of await buttonRects(page)) expect(r.bottom, `${name}: ${r.name} bottom`).toBeLessThanOrEqual(ih);
  const sh = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(sh, `${name}: scrollHeight`).toBeLessThanOrEqual(ih);
}

// A Harry Potter round with tavutus on, on one level: every word of the deck (the ten-letter ones among
// them) is checked while open; the first word also wrong and skipped.
async function levelRound(page, testInfo, level, check) {
  await startRound(page, testInfo, { theme: 'Harry Potter', level, tavutus: true });
  let longest = 0;
  for (let i = 1; i <= 10; i++) {
    const word = await currentWord(page);
    longest = Math.max(longest, word.length);
    await check(`${level} ${word}`);
    if (i === 1) {
      await spellWrong(page, testInfo);
      await page.waitForTimeout(600); // the shake (0.5 s) has ended: a moving box is measured a hair off
      await check(`${level} ${word} wrong`);
    }
    await skip(page, testInfo);
    if (i === 1) {
      await page.waitForTimeout(600); // the picture's appear animation (0.45 s) has ended
      await check(`${level} ${word} skipped`);
    }
    await next(page, testInfo);
  }
  return longest;
}

async function eachScreen(page, testInfo, check) {
  await openSanat(page, testInfo);
  await check('choose');
  const longest = [];
  for (const level of ['Helppo', 'Keskitaso', 'Vaikea']) {
    longest.push(await levelRound(page, testInfo, level, check));
    await check(`end screen after ${level}`);
    await press(button(page, 'Vaihda valintoja'), testInfo);
    await settle(page);
    await check('choose after a round');
  }
  return longest;
}

test('SEI-1 / 3: no sideways scroll on any screen; on the device sizes no vertical scroll either, also with a ten-letter word and tavutus', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const longest = await eachScreen(page, testInfo, (name) => fits(page, testInfo, name));
  expect(Math.max(...longest), 'a ten-letter word was among the words checked').toBe(10);
});

test('SEI-1 / 3: the mid-round choose screen (both forms) fits', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await press(view(page).locator('.sn-change'), testInfo);
  await settle(page);
  await fits(page, testInfo, 'mid-round choose');
  await press(view(page).getByRole('radio', { name: /^Harry/ }), testInfo);
  await fits(page, testInfo, 'mid-round choose, new list (hint)');
});

test('SEI-1 / 4: every button is at least 44 x 44 with touch-action: manipulation, on every screen', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  await eachScreen(page, testInfo, async (name) => {
    // The narrow window scrolls while it is driven and the sticky bar would cover Kuuntele; the frame's
    // 12 px gap rule is about the page as it opens.
    await page.evaluate(() => window.scrollTo(0, 0));
    await checkSizes(page, name);
  });
});

test('SEI-1 / 4: a Helppo and a Vaikea round can be played by tapping only (touch projects)', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'touch projects only');
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 'FRFSFFFFFF');
  await expect(view(page).locator('.sn-end')).toBeVisible();
  await press(button(page, 'Vaihda valintoja'), testInfo);
  await settle(page);
  await startRound(page, testInfo, { level: 'Vaikea' });
  await playRound(page, testInfo, 'RFFSFFFFFF');
  await expect(view(page).locator('.sn-end')).toBeVisible();
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
});

for (const mode of ['nostart', 'noend', 'absent']) {
  test(`SEI-1 / 5: a whole round plays to the end with Ohita and Seuraava while speech is stuck (${mode})`, async ({ page }, testInfo) => {
    await installFakeSpeech(page, { mode });
    await openSanat(page, testInfo);
    await startRound(page, testInfo, { level: 'Keskitaso' });
    for (let i = 0; i < 10; i++) {
      await press(button(page, 'Ohita sana'), testInfo);
      await expect(view(page).locator('.sn-fb')).toHaveAttribute('data-kind', 'skipped');
      await expect(view(page).locator('.sn-next')).toBeEnabled(); // at once, not after onend
      await expect(view(page).locator('.listen')).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Etusivu' })).toBeEnabled();
      await next(page, testInfo);
    }
    await expect(view(page).locator('.sn-end')).toBeVisible();
    await expect(view(page).locator('.sn-rows')).toContainText('10 sanaa ohitettu');
    await expect(view(page).locator('.listen')).toBeEnabled();
    await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.badge:visible')).toHaveCount(0);
  });
}
