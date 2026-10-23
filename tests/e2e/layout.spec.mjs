import { test, expect } from '@playwright/test';
import { installFakeSpeech, press, buttonRects, GAME_IDS } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

async function noSidewaysOverflow(page, what) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(m.scrollWidth, `${what}: scrollWidth ${m.scrollWidth} vs innerWidth ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
  const vw = m.innerWidth;
  for (const r of await buttonRects(page)) {
    expect(r.left, `${what}: button ${r.name} left`).toBeGreaterThanOrEqual(0);
    expect(r.right, `${what}: button ${r.name} right`).toBeLessThanOrEqual(vw);
  }
}

test('front page: no sideways scroll, buttons inside the screen', async ({ page }) => {
  await page.goto('/');
  await noSidewaysOverflow(page, 'front page');
});

test('front page: all three cards fit without scrolling on the device sizes', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'narrow', 'narrow windows may scroll vertically (design 3.1)');
  await page.goto('/');
  const ih = await page.evaluate(() => window.innerHeight);
  for (const r of await buttonRects(page, 'button.game-card')) {
    expect(r.bottom, `card ${r.name}`).toBeLessThanOrEqual(ih);
    expect(r.top).toBeGreaterThanOrEqual(0);
  }
});

for (const id of GAME_IDS) {
  test(`${id}: no sideways scroll, Etusivu and Kuuntele inside the screen, bar stays on top`, async ({ page }, testInfo) => {
    await page.goto('/');
    await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
    await expect(page.locator(`.game-view[data-game="${id}"]`)).toBeVisible();
    await noSidewaysOverflow(page, id);

    const vw = await page.evaluate(() => window.innerWidth);
    for (const sel of ['.game-view:not([hidden]) .back-btn', '.game-view:not([hidden]) .listen']) {
      const [r] = await buttonRects(page, sel);
      expect(r, sel).toBeTruthy();
      expect(r.left).toBeGreaterThanOrEqual(0);
      expect(r.right).toBeLessThanOrEqual(vw);
    }

    await page.evaluate(() => {
      document.querySelector('.game-view:not([hidden]) .game-area').style.minHeight = '3000px';
      window.scrollTo(0, 2000);
    });
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    const barTop = await page.evaluate(() => document.querySelector('.game-view:not([hidden]) .game-bar').getBoundingClientRect().top);
    expect(barTop).toBe(0);
    await noSidewaysOverflow(page, `${id} scrolled`);
  });
}

test('Kuuntele does not change width between ready and playing', async ({ page }, testInfo) => {
  await installFakeSpeech(page, { mode: 'noend' });
  await page.goto('/#/sanat');
  const listen = page.locator('.game-view:not([hidden]) .listen');
  await expect(listen).toHaveAttribute('data-state', 'ready');
  const ready = (await listen.boundingBox()).width;
  await press(listen, testInfo);
  await expect(listen).toHaveAttribute('data-state', 'playing');
  const playing = (await listen.boundingBox()).width;
  expect(playing).toBeCloseTo(ready, 0);
});
