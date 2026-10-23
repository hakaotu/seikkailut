import { test, expect } from '@playwright/test';
import { installFakeSpeech, press, GAME_IDS } from './helpers.mjs';

const NAMES = { matikka: 'Matikka', sanat: 'Sanat', espanja: 'Espanja' };

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

test('front page has three game buttons in order', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Seikkailut' })).toBeVisible();
  const cards = page.locator('button.game-card');
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((els) => els.map((e) => e.dataset.game))).toEqual(GAME_IDS);
  expect(await cards.locator('.t').allTextContents()).toEqual(['Matikka', 'Sanat', 'Espanja']);
  // Reachable by name, with the description as part of it.
  await expect(page.getByRole('button', { name: /^Matikka\s+Laske ja harjoittele numeroita/ })).toBeVisible();
});

test('registry ids equal the cards data-game values', async ({ page }) => {
  await page.goto('/');
  const registryIds = await page.evaluate(async () => (await import('/src/games/registry.js')).GAMES.map((g) => g.id));
  const cardIds = await page.locator('button.game-card').evaluateAll((els) => els.map((e) => e.dataset.game));
  expect(registryIds).toEqual(cardIds);
});

for (const id of GAME_IDS) {
  test(`tapping ${id} opens that game`, async ({ page }, testInfo) => {
    await page.goto('/');
    await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
    await expect(page).toHaveURL(new RegExp(`#/${id}$`));
    await expect(page.getByRole('heading', { level: 1, name: NAMES[id] })).toBeVisible();
    await expect(page).toHaveTitle(`${NAMES[id]} – Seikkailut`);
    await expect(page.locator('#home')).toBeHidden();
  });
}

test('unknown address shows the front page; known game address opens the game', async ({ page }) => {
  await page.goto('/#/shakki');
  await expect(page.locator('#home')).toBeVisible();
  await expect(page).toHaveTitle('Seikkailut');
  await page.goto('/#/sanat');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Sanat' })).toBeVisible();
});
