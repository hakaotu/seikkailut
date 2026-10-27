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
  expect(Math.max(...longest), 'a word of ten or more letters was among the words checked').toBeGreaterThanOrEqual(10);
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

// ---------- SEI-51 / 4: the 11-letter word (design sei-50 3.4) ----------

// The boxes of the word on screen: width and top of each.
const boxes = (page) => view(page).locator('.sn-slots .sn-slot').evaluateAll((els) =>
  els.map((e) => { const r = e.getBoundingClientRect(); return { w: r.width, y: r.top }; }));

// The box width the word's length gets on this project: 56 px, 60 on iPad portrait, 44 under 600 px; 52 from 600 px
// when the word has 11 letters or more.
function boxWidth(testInfo, long) {
  const name = testInfo.project.name;
  if (name === 'narrow') return 44;
  if (long) return 52;
  return name === 'ipad-portrait' ? 60 : 56;
}

async function expectBoxes(page, testInfo, word, name) {
  const b = await boxes(page);
  expect(b.length, `${name}: one box per letter`).toBe(word.length);
  for (const x of b) expect(x.w, `${name}: box width`).toBeCloseTo(boxWidth(testInfo, word.length >= 11), 0);
  // Only the long word is promised one row: a ten-letter word with tavutus already wraps on iPad portrait (design 3.4, unchanged).
  if (word.length >= 11 && testInfo.project.name !== 'narrow') {
    expect(new Set(b.map((x) => Math.round(x.y))).size, `${name}: one row`).toBe(1);
  }
  await fits(page, testInfo, name);
}

// Skip + Seuraava until the current word is `target`, across rounds (Pelaa uudelleen); at most 8 rounds.
async function reachWord(page, testInfo, target, seedUsed) {
  for (let round = 1; round <= 8; round++) {
    for (let i = 1; i <= 10; i++) {
      if ((await currentWord(page)) === target) return;
      await skip(page, testInfo);
      await next(page, testInfo);
    }
    await press(button(page, 'Pelaa uudelleen'), testInfo);
    await expect(view(page).locator('.sn-play')).toBeVisible();
    await settle(page);
  }
  throw new Error(`${target} not reached with seed ${seedUsed}`);
}

test('design 3.4: an 11-letter word fits on one row at 600 px and wider, and the narrower boxes stay with that word', async ({ page }, testInfo) => {
  test.setTimeout(120000);
  // Seed 38 deals TAIKASAUVA (10 letters), KORPINKYNSI, JÄSTI, ... in the first Harry Potter round after a load
  // (found with newDeck and the same generator). It is set after the beforeEach's seed, which it replaces.
  await seedRandom(page, 38);
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { theme: 'Harry Potter', level: 'Vaikea', tavutus: true });
  const first = await currentWord(page);
  expect(first.length, 'the first word has ten letters or fewer').toBeLessThanOrEqual(10);
  await expectBoxes(page, testInfo, first, `${first} (tavutus on)`);

  await reachWord(page, testInfo, 'KORPINKYNSI', 38);
  await expectBoxes(page, testInfo, 'KORPINKYNSI', 'KORPINKYNSI (tavutus on)');
  await expect(view(page).locator('.sn-slots')).toHaveClass(/is-long/);

  await press(view(page).locator('.sn-change'), testInfo);
  await settle(page);
  await press(button(page, 'Tavutus'), testInfo);
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  await settle(page);
  await expect(view(page).locator('.sn-dash')).toHaveCount(0);
  await expectBoxes(page, testInfo, 'KORPINKYNSI', 'KORPINKYNSI (tavutus off)');

  // The boxes are reused for the next word: the narrower width must not stay.
  await skip(page, testInfo);
  await next(page, testInfo);
  const after = await currentWord(page);
  expect(after.length, 'the next word has ten letters or fewer').toBeLessThanOrEqual(10);
  await expect(view(page).locator('.sn-slots')).not.toHaveClass(/is-long/);
  await expectBoxes(page, testInfo, after, `${after} after KORPINKYNSI`);
});
