import { test, expect } from '@playwright/test';
import { installFakeSpeech, press, buttonRects, GAME_IDS } from './helpers.mjs';

const FRAME = '.game-card, .back-btn, .listen, .ok-btn, .accent-btn';

async function checkSizes(page, what) {
  for (const r of await buttonRects(page, 'button')) {
    expect(r.width, `${what}: ${r.name} width`).toBeGreaterThanOrEqual(44);
    expect(r.height, `${what}: ${r.name} height`).toBeGreaterThanOrEqual(44);
  }
  const frame = await buttonRects(page, FRAME);
  for (const r of frame) {
    expect(r.width, `${what}: frame ${r.name} width`).toBeGreaterThanOrEqual(56);
    expect(r.height, `${what}: frame ${r.name} height`).toBeGreaterThanOrEqual(56);
  }
  for (let i = 0; i < frame.length; i++) {
    for (let j = i + 1; j < frame.length; j++) {
      const a = frame[i];
      const b = frame[j];
      const dx = Math.max(a.left - b.right, b.left - a.right, 0);
      const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
      expect(Math.hypot(dx, dy), `${what}: gap between ${a.name} and ${b.name}`).toBeGreaterThanOrEqual(12);
    }
  }
  const noManipulation = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => b.getBoundingClientRect().width > 0)
      .filter((b) => getComputedStyle(b).touchAction !== 'manipulation')
      .map((b) => b.className),
  );
  expect(noManipulation, `${what}: buttons without touch-action: manipulation`).toEqual([]);
}

test('front page buttons are large enough and apart', async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto('/');
  await checkSizes(page, 'front page');
});

for (const id of GAME_IDS) {
  test(`${id}: frame buttons are large enough and apart, also with the notice open`, async ({ page }, testInfo) => {
    await installFakeSpeech(page, { voices: ['en-US'] }); // no Finnish or Spanish: the notice opens
    await page.goto('/');
    await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
    const view = page.locator(`.game-view[data-game="${id}"]`);
    await expect(view.locator('.notice')).toBeVisible();
    await checkSizes(page, `${id} with notice`);
    await press(view.locator('.ok-btn'), testInfo);
    await expect(view.locator('.notice')).toBeHidden();
    await checkSizes(page, `${id} notice closed`);
  });
}

test('the whole flow works by tapping only (touch projects)', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.use.hasTouch, 'touch projects only');
  await installFakeSpeech(page);
  await page.goto('/');
  for (const id of GAME_IDS) {
    await page.locator(`button.game-card[data-game="${id}"]`).tap();
    await expect(page.locator(`.game-view[data-game="${id}"]`)).toBeVisible();
    await page.locator(`.game-view[data-game="${id}"] .listen`).tap();
    await page.getByRole('button', { name: 'Etusivu' }).tap();
    await expect(page.locator('#home')).toBeVisible();
  }
});
