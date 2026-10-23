import { test, expect } from '@playwright/test';
import { installFakeSpeech, useFakeRegistry, press, buttonRects } from './helpers.mjs';

test('a game that fails to open shows Peli ei auennut and is retried next time', async ({ page }, testInfo) => {
  await installFakeSpeech(page);
  await useFakeRegistry(page);
  await page.addInitScript(() => { window.__failCreate = { espanja: true }; });
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="espanja"]'), testInfo);

  const v = page.locator('.game-view[data-game="espanja"]');
  await expect(v.getByRole('heading', { name: 'Peli ei auennut.' })).toBeFocused();
  await expect(v).toContainText('Palaa etusivulle ja kokeile uudelleen.');
  await expect(v.getByRole('heading', { level: 1, name: 'Espanja' })).toBeVisible();
  for (const r of await buttonRects(page, '.accent-btn')) {
    expect(r.width).toBeGreaterThanOrEqual(56);
    expect(r.height).toBeGreaterThanOrEqual(56);
  }

  await press(v.getByRole('button', { name: 'Etusivulle' }), testInfo);
  await expect(page.locator('#home')).toBeVisible();

  await page.evaluate(() => { window.__failCreate = {}; });
  await press(page.locator('button.game-card[data-game="espanja"]'), testInfo);
  await expect(page.locator('.game-view[data-game="espanja"] .game-error')).toHaveCount(0);
  expect(await page.evaluate(() => window.__fake.espanja.creates)).toBe(2);
});

test('the boot error stays hidden when the app starts', async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-booted', '');
  await page.waitForTimeout(3300);
  await expect(page.locator('.boot-error')).toBeHidden();
});

test('the boot error appears after 3 s when the script does not start', async ({ page }) => {
  await page.route('**/src/app.js', (route) => route.abort());
  await page.goto('/');
  await expect(page.locator('.boot-error')).toBeHidden();
  await expect(page.locator('.boot-error')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.boot-error')).toContainText('Seikkailut ei käynnistynyt.');
});
