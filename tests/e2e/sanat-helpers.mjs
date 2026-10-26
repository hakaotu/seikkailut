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

// The letters in the boxes, '' for an empty box.
export function slotLetters(page) {
  return view(page).locator('.sn-slot').evaluateAll((els) => els.map((e) => e.textContent));
}

export const isAlphabet = (page) => view(page).locator('.sn-letters.is-alphabet').isVisible();

// Taps the first enabled tile, or the alphabet key, with that letter.
export function letterButton(page, letter) {
  return view(page).locator('.sn-letters button:not([disabled])').filter({ hasText: new RegExp(`^${letter}$`) }).first();
}

export async function spell(page, testInfo, letters) {
  for (const l of letters) await press(letterButton(page, l), testInfo);
}

const feedbackKind = (page) => view(page).locator('.sn-fb');

// Spells the current word. Waits for the verdict to show.
export async function spellRight(page, testInfo) {
  const word = await currentWord(page);
  await spell(page, testInfo, word);
  await expect(feedbackKind(page)).toHaveAttribute('data-kind', 'right');
  return word;
}

// The letters of a wrong spelling of `word`: on the alphabet one letter is replaced (KISSA -> KISTA);
// from tiles two different letters are swapped, because only the word's own letters are on offer.
export function wrongSpelling(word, alphabet) {
  const letters = [...word];
  if (alphabet) {
    const i = Math.floor(letters.length / 2);
    letters[i] = letters[i] === 'X' ? 'Y' : 'X';
    return letters.join('');
  }
  const j = letters.findIndex((l) => l !== letters[0]);
  [letters[0], letters[j]] = [letters[j], letters[0]];
  return letters.join('');
}

export async function spellWrong(page, testInfo) {
  const word = await currentWord(page);
  const wrong = wrongSpelling(word, await isAlphabet(page));
  await spell(page, testInfo, wrong);
  await expect(feedbackKind(page)).toHaveAttribute('data-kind', 'wrong');
  return { word, wrong };
}

// A wrong spelling, then Aloita alusta and the right one: counted as "meni ensin väärin".
export async function spellRetry(page, testInfo) {
  await spellWrong(page, testInfo);
  await press(button(page, 'Aloita sana alusta'), testInfo);
  return spellRight(page, testInfo);
}

export async function skip(page, testInfo) {
  const word = await currentWord(page);
  await press(button(page, 'Ohita sana'), testInfo);
  await expect(feedbackKind(page)).toHaveAttribute('data-kind', 'skipped');
  return word;
}

// Seuraava, or Katso tulos on the tenth; the end screen is a screen change, so wait out the guard.
export async function next(page, testInfo) {
  const last = (await view(page).locator('.sn-next-label').textContent()) === 'Katso tulos';
  await press(view(page).locator('.sn-next'), testInfo);
  if (last) {
    await expect(view(page).locator('.sn-end')).toBeVisible();
    await settle(page);
  }
}

// Plays the whole round: one letter per word, 'F' right first time, 'R' right after a wrong try, 'S'
// skipped. Each word is followed by Seuraava / Katso tulos.
export async function playRound(page, testInfo, pattern) {
  for (const kind of pattern) {
    if (kind === 'F') await spellRight(page, testInfo);
    else if (kind === 'R') await spellRetry(page, testInfo);
    else await skip(page, testInfo);
    await next(page, testInfo);
  }
}
