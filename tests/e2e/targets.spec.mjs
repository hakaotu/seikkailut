import { test, expect } from '@playwright/test';
import { installFakeSpeech, press, checkSizes, GAME_IDS } from './helpers.mjs';

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
