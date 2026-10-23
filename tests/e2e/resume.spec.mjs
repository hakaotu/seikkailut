import { test, expect } from '@playwright/test';
import { installFakeSpeech, useFakeRegistry, press, speakCalls } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await useFakeRegistry(page);
});

const card = (page, id) => page.locator(`button.game-card[data-game="${id}"]`);
const back = (page) => page.getByRole('button', { name: 'Etusivu' });
const badge = (page, id) => card(page, id).locator('.badge');

test('an unfinished round shows a badge and resumes the same instance without speech', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'matikka'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Matikka' })).toBeFocused();
  // opened by a tap, nothing done yet: auto-read happened
  await expect.poll(async () => (await speakCalls(page)).length).toBe(1);

  for (let i = 0; i < 4; i++) await page.evaluate(() => window.__fake.matikka.answer());
  await press(back(page), testInfo);

  await expect(badge(page, 'matikka')).toBeVisible();
  await expect(badge(page, 'matikka')).toContainText('Kesken 4/10');
  await expect(card(page, 'matikka')).toHaveAccessibleName(/Kesken, 4 tehtävää 10:stä tehty\./);
  await expect(badge(page, 'sanat')).toBeHidden();

  const callsBefore = (await speakCalls(page)).length;
  await press(card(page, 'matikka'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Matikka' })).toBeVisible();
  const fake = await page.evaluate(() => ({ ...window.__fake.matikka }));
  expect(fake.creates).toBe(1);
  expect(fake.done).toBe(4);
  expect(fake.shows).toEqual([true, false]);
  expect((await speakCalls(page)).length).toBe(callsBefore);
});

test('finishing the round removes the badge; reopening reads aloud again', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'matikka'), testInfo);
  await page.evaluate(() => { window.__fake.matikka.answer(); window.__fake.matikka.finish(); });
  await press(back(page), testInfo);
  await expect(badge(page, 'matikka')).toBeHidden();
  await press(card(page, 'matikka'), testInfo);
  await expect(page.getByRole('heading', { level: 1, name: 'Matikka' })).toBeVisible();
  const shows = await page.evaluate(() => window.__fake.matikka.shows);
  expect(shows).toEqual([true, true]);
});

test('no badge at 0 done; badge at 9; none after reload', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'espanja'), testInfo);
  await press(back(page), testInfo);
  await expect(badge(page, 'espanja')).toBeHidden();

  await press(card(page, 'espanja'), testInfo);
  for (let i = 0; i < 9; i++) await page.evaluate(() => window.__fake.espanja.answer());
  await press(back(page), testInfo);
  await expect(badge(page, 'espanja')).toContainText('Kesken 9/10');

  await page.reload();
  await expect(page.locator('#home')).toBeVisible();
  await expect(page.locator('.badge:visible')).toHaveCount(0);
});

test('two unfinished games show two badges', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(card(page, 'matikka'), testInfo);
  await page.evaluate(() => window.__fake.matikka.answer());
  await press(back(page), testInfo);
  await press(card(page, 'sanat'), testInfo);
  for (let i = 0; i < 2; i++) await page.evaluate(() => window.__fake.sanat.answer());
  await press(back(page), testInfo);
  await expect(page.locator('.badge:visible')).toHaveCount(2);
  await expect(badge(page, 'matikka')).toContainText('Kesken 1/10');
  await expect(badge(page, 'sanat')).toContainText('Kesken 2/10');
});

test('a game opened by reload on its address does not read aloud', async ({ page }) => {
  await page.goto('/#/sanat');
  await expect(page.getByRole('heading', { level: 1, name: 'Sanat' })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await speakCalls(page)).toEqual([]);
});
