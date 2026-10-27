// Driving the real Espanja from a test. The current question is read from the question word's accessible
// name ("Kysymys 3 / 10: punainen"; 7 or 8 in a short topic), the same thing a screen reader gets, and the pair is looked up in the
// word list the game uses, so no hook exists in the game.
import { expect } from '@playwright/test';
import { press, settle, speakCalls } from './helpers.mjs';
import { WORDS } from '../../app/src/games/espanja-logic.js';

export const view = (page) => page.locator('.game-view[data-game="espanja"]');
export const button = (page, name, exact = true) => view(page).getByRole('button', { name, exact });

// The texts of the four options, in display order.
export const optionTexts = (page) => view(page).locator('.es-option-text').allTextContents();

// { n, total, direction, pair, answerText, wrongText }. The direction follows from which side of the pair the word is:
// no Finnish text equals a Spanish one (unit test), so the lookup cannot be ambiguous.
export async function current(page) {
  const label = await view(page).locator('.es-word').getAttribute('aria-label');
  const m = /^Kysymys (\d+) \/ (\d+): (.+)$/.exec(label);
  expect(m, `question label "${label}"`).toBeTruthy();
  const [, n, total, prompt] = m;
  const fi = WORDS.find((w) => w.fi === prompt);
  const direction = fi ? 'fi2es' : 'es2fi';
  const pair = fi || WORDS.find((w) => w.es === prompt);
  expect(pair, `a pair for "${prompt}"`).toBeTruthy();
  const answerText = direction === 'fi2es' ? pair.es : pair.fi;
  const wrongText = (await optionTexts(page)).find((t) => t !== answerText);
  return { n: Number(n), total: Number(total), direction, pair, answerText, wrongText };
}

export async function openEspanja(page, testInfo) {
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="espanja"]'), testInfo);
  await expect(view(page).locator('.es-choose')).toBeVisible();
}

// From the choose screen: pick the topic (when given) and the direction, and press the start button.
export async function startRound(page, testInfo, { direction = 'fi2es', topic, start = 'Aloita' } = {}) {
  if (topic) await press(view(page).locator(`.es-topic[data-topic="${topic}"]`), testInfo);
  await press(view(page).locator(`.es-dir[data-dir="${direction}"]`), testInfo);
  await press(button(page, start), testInfo);
  await expect(view(page).locator('.es-play')).toBeVisible();
  await settle(page);
}

const option = (page, text) => button(page, `Vastaus ${text}`);

export async function answerRight(page, testInfo) {
  const q = await current(page);
  await press(option(page, q.answerText), testInfo);
  await expect(view(page).locator('.es-fb')).not.toBeEmpty();
  return q;
}

export async function answerWrong(page, testInfo) {
  const q = await current(page);
  await press(option(page, q.wrongText), testInfo);
  await expect(view(page).locator('.es-fb')).not.toBeEmpty();
  return q;
}

export async function skip(page, testInfo) {
  const q = await current(page);
  await press(button(page, 'Ohita kysymys'), testInfo);
  await expect(view(page).locator('.es-fb')).not.toBeEmpty();
  return q;
}

// Seuraava, or Katso tulos on the last question; the end screen is a screen change, so wait out the guard.
export async function next(page, testInfo) {
  const last = (await view(page).locator('.es-next-label').textContent()) === 'Katso tulos';
  await press(view(page).locator('.es-next'), testInfo);
  if (last) {
    await expect(view(page).locator('.es-end')).toBeVisible();
    await settle(page);
  }
}

const MOVES = { r: answerRight, w: answerWrong, s: skip };

// One character of `pattern` per question: r right, w wrong, s skipped. Each is followed by Seuraava (Katso tulos
// on the last) at once, so the auto-advance wait after a right answer never runs out.
export async function playRound(page, testInfo, pattern) {
  expect(pattern).toMatch(/^[rws]+$/);
  expect(pattern.length).toBe((await current(page)).total);
  for (const c of pattern) {
    await MOVES[c](page, testInfo);
    await next(page, testInfo);
  }
}

// The number of speak calls once nothing has started for `quietMs`: a reading's later parts come from timers
// (a 500 ms pause), and an auto-advance reading from a 4 s timer, so a fixed sleep would be a guess.
export async function settledCount(page, quietMs = 800) {
  let before = (await speakCalls(page)).length;
  for (let quietSince = Date.now(); Date.now() - quietSince < quietMs; await page.waitForTimeout(100)) {
    const n = (await speakCalls(page)).length;
    if (n !== before) {
      before = n;
      quietSince = Date.now();
    }
  }
  return before;
}
