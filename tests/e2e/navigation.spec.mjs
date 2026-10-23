import { test, expect } from '@playwright/test';
import { installFakeSpeech, press } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

const card = (page, id) => page.locator(`button.game-card[data-game="${id}"]`);
const back = (page) => page.getByRole('button', { name: 'Etusivu' });

test('switching games never reloads the page', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => { window.__marker = 'same-page'; });

  await press(card(page, 'sanat'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Sanat' })).toBeVisible();
  await press(back(page), testInfo);
  await expect(page.locator('#home')).toBeVisible();
  await press(card(page, 'espanja'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Espanja' })).toBeVisible();

  await page.goBack();
  await expect(page.locator('#home')).toBeVisible();
  await press(card(page, 'matikka'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Matikka' })).toBeVisible();

  expect(await page.evaluate(() => window.__marker)).toBe('same-page');
  expect(await page.evaluate(() => performance.getEntriesByType('navigation').length)).toBe(1);
});

test('browser back from a game goes to the front page', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'sanat'), testInfo);
  await expect(page).toHaveURL(/#\/sanat$/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/$|\/$/);
  await expect(page.locator('#home')).toBeVisible();
  await expect(page).toHaveTitle('Seikkailut');
});

test('Etusivu does not grow the history: round trips keep one step', async ({ page }, testInfo) => {
  await page.goto('/');
  const start = await page.evaluate(() => history.length);
  for (let i = 0; i < 3; i++) {
    await press(card(page, 'matikka'), testInfo);
    await expect(page.getByRole('heading', { level: 1, name: 'Matikka' })).toBeVisible();
    expect(await page.evaluate(() => history.length)).toBe(start + 1);
    await press(back(page), testInfo);
    await expect(page.locator('#home')).toBeVisible();
  }
  // The last Etusivu left the address on the front page. The history length check above
  // is what guards that Etusivu went back one step.
  await expect(page).toHaveURL(/\/(#\/)?$/);
});

test('Etusivu from a directly opened game goes home and back returns to the game once', async ({ page }, testInfo) => {
  await page.goto('/#/espanja');
  await expect(page.getByRole('heading', { level: 1, name: 'Espanja' })).toBeVisible();
  await press(back(page), testInfo);
  await expect(page.locator('#home')).toBeVisible();
  await expect(page).toHaveURL(/#\/$/);
  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Espanja' })).toBeVisible();
});

test('focus returns to the card of the game just left', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'sanat'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Sanat' })).toBeFocused();
  await press(back(page), testInfo);
  await expect(card(page, 'sanat')).toBeFocused();
});

test('the page scrolls to the top on every switch', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'matikka'), testInfo);
  await page.evaluate(() => {
    document.querySelector('.game-area').style.minHeight = '3000px';
    window.scrollTo(0, 1500);
  });
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  await press(back(page), testInfo);
  await expect(page.locator('#home')).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
