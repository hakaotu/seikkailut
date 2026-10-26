// SEI-1 criteria 3-5 (fit, target sizes, stuck speech) run against the real Espanja (plan sei-4 9.5).
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, settle, buttonRects, checkSizes, noSidewaysOverflow } from './helpers.mjs';
import {
  openEspanja, startRound, current, answerRight, answerWrong, skip, next, playRound, view, button,
} from './espanja-helpers.mjs';

// Seed 26 asks gris, adiós, por favor, buenas tardes, ... in the first round after a load: `buenas tardes` (13
// characters, and `hyvää iltapäivää` as its Finnish prompt) is question 4, the longest word on screen.
const SEED = 26;
const LONGEST = { fi2es: 'hyvää iltapäivää', es2fi: 'buenas tardes' };

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, SEED);
});

const dirCard = (page, dir) => view(page).locator(`.es-dir[data-dir="${dir}"]`);

// Skips ahead to the question with the longest word.
async function toLongest(page, testInfo, direction) {
  for (let i = 0; i < 9; i++) {
    const q = await current(page);
    if (q.pair.es === 'buenas tardes') {
      expect(direction === 'fi2es' ? q.pair.fi : q.pair.es).toBe(LONGEST[direction]);
      return;
    }
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  throw new Error('no buenas tardes in the first round of seed 26');
}

// Walks through every state of the question screen and the choose screen in one direction and runs
// `check(name)` on each. The state right after the longest word is answered is where the feedback row is fullest.
async function eachScreen(page, testInfo, direction, check) {
  await openEspanja(page, testInfo);
  await check('choose');
  await startRound(page, testInfo, { direction });
  await check('question 1, unanswered');
  await toLongest(page, testInfo, direction);
  await check('longest word, unanswered');
  await answerWrong(page, testInfo);
  await check('longest word, answered wrong');
  await next(page, testInfo);
  await answerRight(page, testInfo);
  await check('answered right (Seuraava waits)');
  await next(page, testInfo);
  await skip(page, testInfo);
  await check('skipped');
  await press(view(page).locator('.es-change'), testInfo);
  await settle(page);
  await check('mid-round choose');
  await press(dirCard(page, direction === 'fi2es' ? 'es2fi' : 'fi2es'), testInfo);
  await check('mid-round choose, other direction (hint)');
  await press(dirCard(page, direction), testInfo);
  await press(button(page, 'Takaisin kysymykseen'), testInfo);
  await settle(page);
  await next(page, testInfo);
  for (let i = 7; i <= 10; i++) {
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  await check('end screen');
}

for (const direction of ['fi2es', 'es2fi']) {
  test(`SEI-1 / 3: no sideways scroll on any screen; on the device sizes no vertical scroll either (${direction})`, async ({ page }, testInfo) => {
    await eachScreen(page, testInfo, direction, async (name) => {
      await noSidewaysOverflow(page, name);
      if (testInfo.project.name === 'narrow') return; // narrow windows may scroll vertically (design 3.10)
      const ih = await page.evaluate(() => window.innerHeight);
      for (const r of await buttonRects(page)) expect(r.bottom, `${name}: ${r.name} bottom`).toBeLessThanOrEqual(ih);
      const sh = await page.evaluate(() => document.documentElement.scrollHeight);
      expect(sh, `${name}: scrollHeight`).toBeLessThanOrEqual(ih);
    });
  });

  test(`SEI-1 / 4: every button is at least 44 x 44 with touch-action: manipulation, on every screen (${direction})`, async ({ page }, testInfo) => {
    await eachScreen(page, testInfo, direction, async (name) => {
      // On the narrow window the page scrolls while it is driven; the sticky bar would then cover
      // Kuuntele, and the frame's 12 px gap rule is about the page as it opens.
      await page.evaluate(() => window.scrollTo(0, 0));
      await checkSizes(page, name);
    });
  });
}

test('SEI-1 / 3: the end screen of each tier fits', async ({ page }, testInfo) => {
  for (const pattern of ['ssssssssss', 'rrrrrrrrww', 'rrrrrrrrrr']) {
    await openEspanja(page, testInfo); // a fresh page load each time: the seed starts again
    await startRound(page, testInfo, { direction: 'fi2es' });
    await playRound(page, testInfo, pattern);
    await expect(view(page).locator('.es-end')).toBeVisible();
    await noSidewaysOverflow(page, `end ${pattern}`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await checkSizes(page, `end ${pattern}`);
    if (testInfo.project.name !== 'narrow') {
      const ih = await page.evaluate(() => window.innerHeight);
      for (const r of await buttonRects(page)) expect(r.bottom, `end ${pattern}: ${r.name} bottom`).toBeLessThanOrEqual(ih);
      expect(await page.evaluate(() => document.documentElement.scrollHeight), `end ${pattern}: scrollHeight`).toBeLessThanOrEqual(ih);
    }
  }
});

test('SEI-1 / 3: the stars in the top bar fit in every form (0, 3, 10, 11, 1000)', async ({ page }, testInfo) => {
  for (const n of ['0', '3', '10', '11', '1000']) {
    await page.addInitScript((v) => window.localStorage.setItem('espanja.stars', v), n);
    await openEspanja(page, testInfo);
    await noSidewaysOverflow(page, `${n} stars`);
    const slot = await view(page).locator('.status-slot').boundingBox();
    const bar = await view(page).locator('.game-bar').boundingBox();
    expect(slot.x + slot.width, `${n} stars: inside the bar`).toBeLessThanOrEqual(bar.x + bar.width);
    const scrolls = await view(page).locator('.status-slot').evaluate((e) => e.scrollWidth > e.clientWidth);
    expect(scrolls, `${n} stars: nothing cut off`).toBe(false);
  }
});

test('SEI-1 / 4: a whole round can be played by tapping only (touch projects)', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'touch projects only');
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrwsrrrwrr');
  await expect(view(page).locator('.es-end')).toBeVisible();
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  await press(view(page).locator('.es-change'), testInfo);
  await settle(page);
  await press(dirCard(page, 'es2fi'), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(view(page).locator('.es-end')).toBeVisible();
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await expect(view(page).locator('.es-play')).toBeVisible();
});

for (const mode of ['nostart', 'noend', 'absent']) {
  test(`SEI-1 / 5: a whole round plays to the end while speech is stuck (${mode})`, async ({ page }, testInfo) => {
    await installFakeSpeech(page, { mode });
    await openEspanja(page, testInfo);
    await startRound(page, testInfo, { direction: 'es2fi' });
    for (let i = 0; i < 10; i++) {
      await (i % 2 ? skip : answerRight)(page, testInfo);
      await expect(view(page).locator('.es-next')).toBeEnabled(); // at once, not after onend
      await expect(view(page).locator('.listen')).toBeEnabled();
      await expect(page.getByRole('button', { name: 'Etusivu' })).toBeEnabled();
      await next(page, testInfo);
    }
    await expect(view(page).locator('.es-end')).toBeVisible();
    await expect(view(page).locator('.listen')).toBeEnabled();
    await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
    await expect(page.locator('#home')).toBeVisible();
    await expect(page.locator('.badge:visible')).toHaveCount(0);
  });
}
