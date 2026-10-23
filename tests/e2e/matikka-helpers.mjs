// Driving the real Matikka from a test. The answer is read from the problem's accessible name
// ("Lasku 5 / 10: 7 plus 5"), the same thing a screen reader gets, so no hook exists in the game.
import { expect } from '@playwright/test';
import { press, settle } from './helpers.mjs';

export const view = (page) => page.locator('.game-view[data-game="matikka"]');
export const button = (page, name, exact = true) => view(page).getByRole('button', { name, exact });

const WORDS = { plus: 'add', miinus: 'sub', kertaa: 'mul' };
const RESULT = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b };

export async function problem(page) {
  const label = await view(page).locator('.mk-problem').getAttribute('aria-label');
  const m = /^Lasku (\d+) \/ 10: (\d+) (plus|miinus|kertaa) (\d+)$/.exec(label);
  expect(m, `problem label "${label}"`).toBeTruthy();
  const [, n, a, word, b] = m;
  const op = WORDS[word];
  return { n: Number(n), a: Number(a), b: Number(b), op, word, answer: RESULT[op](Number(a), Number(b)) };
}

export async function openMatikka(page, testInfo) {
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="matikka"]'), testInfo);
  await expect(view(page).locator('.mk-choose')).toBeVisible();
}

// From the choose screen: pick the level, make the toggles match `ops`, press the start button.
// `ops` is a list of 'add' | 'sub' | 'mul'; omitted leaves the toggles as they are.
export async function startRound(page, testInfo, { level = 'Helppo', ops = null, start = 'Aloita' } = {}) {
  await press(view(page).getByRole('radio', { name: new RegExp(`^${level}`) }), testInfo);
  if (ops) {
    const names = { add: 'Yhteenlasku', sub: 'Vähennyslasku', mul: 'Kertolasku' };
    // Turn the wanted ones on first, so the last one is never turned off.
    for (const turnOn of [true, false]) {
      for (const op of Object.keys(names)) {
        const toggle = button(page, names[op]);
        const pressed = (await toggle.getAttribute('aria-pressed')) === 'true';
        if (pressed !== turnOn && ops.includes(op) === turnOn) await press(toggle, testInfo);
      }
    }
  }
  await press(button(page, start), testInfo);
  await expect(view(page).locator('.mk-play')).toBeVisible();
  await settle(page);
}

export async function typeNumber(page, testInfo, text) {
  for (const d of text) await press(button(page, d), testInfo);
}

async function answerWith(page, testInfo, value) {
  if (await view(page).locator('.mk-pad').isVisible()) {
    await typeNumber(page, testInfo, String(value));
    await press(button(page, 'OK, tarkista vastaus'), testInfo);
  } else {
    await press(view(page).locator(`.mk-option[data-value="${value}"]`), testInfo);
  }
}

export async function answerRight(page, testInfo) {
  const p = await problem(page);
  await answerWith(page, testInfo, p.answer);
  await expect(view(page).locator('.mk-feedback')).not.toBeEmpty();
  return { ...p, given: p.answer };
}

export async function answerWrong(page, testInfo) {
  const p = await problem(page);
  let given = p.answer + 1;
  if (!(await view(page).locator('.mk-pad').isVisible())) {
    const values = await view(page).locator('.mk-option').evaluateAll((els) => els.map((e) => Number(e.dataset.value)));
    given = values.find((v) => v !== p.answer);
  }
  await answerWith(page, testInfo, given);
  await expect(view(page).locator('.mk-feedback')).not.toBeEmpty();
  return { ...p, given };
}

// Seuraava, or Katso tulos on the tenth; the end screen is a screen change, so wait out the guard.
export async function next(page, testInfo) {
  const last = (await view(page).locator('.mk-next-label').textContent()) === 'Katso tulos';
  await press(view(page).locator('.mk-next'), testInfo);
  if (last) {
    await expect(view(page).locator('.mk-end')).toBeVisible();
    await settle(page);
  }
}

// Answers the whole round, `right` of the ten correctly (the first ones), then Katso tulos.
export async function playRound(page, testInfo, right) {
  for (let i = 0; i < 10; i++) {
    if (i < right) await answerRight(page, testInfo);
    else await answerWrong(page, testInfo);
    await next(page, testInfo);
  }
}
