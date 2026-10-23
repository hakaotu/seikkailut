import { test, expect } from '@playwright/test';
import { installFakeSpeech, press, speakCalls, GAME_IDS } from './helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

// The fake records, per speak(), whether it ran inside a click listener (addEventListener is
// wrapped to count click listeners on the stack). Speech started after an await, from a timer,
// a hashchange or an awaited import() would record false.

for (const id of GAME_IDS) {
  test(`tapping the ${id} card speaks inside the tap`, async ({ page }, testInfo) => {
    await page.goto('/');
    await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
    await expect.poll(async () => (await speakCalls(page)).length).toBeGreaterThan(0);
    const calls = await speakCalls(page);
    expect(calls[0].inDispatch).toBe(true);
    expect(calls.every((c) => c.inDispatch)).toBe(true);
  });
}

test('Kuuntele as the very first tap after a reload on a game address speaks inside the tap', async ({ page }, testInfo) => {
  await page.goto('/#/espanja');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Espanja' })).toBeVisible();
  expect(await speakCalls(page)).toEqual([]);
  await press(page.locator('.game-view:not([hidden]) .listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(1);
  const [call] = await speakCalls(page);
  expect(call.inDispatch).toBe(true);
  expect(call.lang).toBe('es-ES');
  expect(call.text).toBe('hola');
});

test('reload on #/sanat makes no speak call before a tap', async ({ page }) => {
  await page.goto('/#/sanat');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Sanat' })).toBeVisible();
  await page.waitForTimeout(300);
  expect(await speakCalls(page)).toEqual([]);
});

test('Sanat queues two parts from one tap, the second slower', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  const calls = await speakCalls(page);
  expect(calls.map((c) => c.text)).toEqual(['kissa', 'kissa']);
  expect(calls.map((c) => c.rate)).toEqual([0.78, 0.52]);
  expect(calls.every((c) => c.lang === 'fi-FI' && c.voice === 'fi-FI')).toBe(true);
});
