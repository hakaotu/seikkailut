// Driving the real Sanat from a test. The current word is read from the fake speech record: the
// last speak at rate 0.78 is always the word (design 3.8; every other reading uses another rate), the
// same idea as Matikka's helper reading the problem's accessible name, so no hook exists in the game.
import { expect } from '@playwright/test';
import { press, settle, speakCalls } from './helpers.mjs';

export const view = (page) => page.locator('.game-view[data-game="sanat"]');
export const button = (page, name, exact = true) => view(page).getByRole('button', { name, exact });

export async function openSanat(page, testInfo) {
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(view(page).locator('.sn-choose')).toBeVisible();
}

// From the choose screen: pick the list, the level and tavutus, press the start button.
export async function startRound(page, testInfo, { theme = 'Normaali', level = 'Helppo', tavutus = false, start = 'Aloita' } = {}) {
  await press(view(page).getByRole('radio', { name: new RegExp(`^${theme}`) }), testInfo);
  await press(view(page).getByRole('radio', { name: new RegExp(`^${level}`) }), testInfo);
  const toggle = button(page, 'Tavutus');
  if (((await toggle.getAttribute('aria-pressed')) === 'true') !== tavutus) await press(toggle, testInfo);
  await press(button(page, start), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  await settle(page);
}

// The word that was last read at the normal pace, in capitals.
export async function currentWord(page) {
  const calls = await speakCalls(page);
  const reading = [...calls].reverse().find((c) => c.rate === 0.78);
  expect(reading, 'a word reading in the speech record').toBeTruthy();
  return reading.text.toUpperCase();
}
