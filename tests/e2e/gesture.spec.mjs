import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import { openMatikka, startRound, answerRight, answerWrong, next, view, button } from './matikka-helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

// The fake records, per speak(), whether it ran inside a click listener (addEventListener is
// wrapped to count click listeners on the stack). Speech started after an await, from a timer,
// a hashchange or an awaited import() would record false.

// Matikka has its own tests below: its choose screen reads nothing.
for (const id of ['sanat', 'espanja']) {
  test(`tapping the ${id} card speaks inside the tap`, async ({ page }, testInfo) => {
    await page.goto('/');
    await press(page.locator(`button.game-card[data-game="${id}"]`), testInfo);
    await expect.poll(async () => (await speakCalls(page)).length).toBeGreaterThan(0);
    const calls = await speakCalls(page);
    expect(calls[0].inDispatch).toBe(true);
    // Only Sanat's second reading is spoken later, from a timer after the first one ends.
    if (id !== 'sanat') expect(calls.every((c) => c.inDispatch)).toBe(true);
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

test('Sanat speaks kissa inside the tap, then slower after a pause that follows the first ending', async ({ page }, testInfo) => {
  await page.goto('/');
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  const calls = await speakCalls(page);
  expect(calls.map((c) => c.text)).toEqual(['kissa', 'kissa']);
  expect(calls.map((c) => c.rate)).toEqual([0.78, 0.52]);
  expect(calls.every((c) => c.lang === 'fi-FI' && c.voice === 'fi-FI')).toBe(true);
  expect(calls[0].inDispatch).toBe(true);
  expect(calls[1].inDispatch).toBe(false);
  // 700 ms after the first reading ended, less slack for the timer
  expect(calls[1].at - calls[0].endedAt).toBeGreaterThanOrEqual(650);
});

// ---- Matikka (SEI-2): every reading starts inside the tap or key press that causes it ----

test('Matikka: the card tap reads nothing, the choose screen is silent', async ({ page }, testInfo) => {
  await seedRandom(page, 1);
  await openMatikka(page, testInfo);
  await page.waitForTimeout(300);
  expect(await speakCalls(page)).toEqual([]);
});

test('Matikka: every spoken event is inside its tap', async ({ page }, testInfo) => {
  await seedRandom(page, 2);
  await openMatikka(page, testInfo);
  await press(view(page).locator('.listen'), testInfo); // Kuuntele on the choose screen
  await startRound(page, testInfo, { level: 'Helppo' }); // Aloita
  await answerRight(page, testInfo);
  await next(page, testInfo); // Seuraava
  await answerWrong(page, testInfo);
  await press(view(page).locator('.listen'), testInfo); // Kuuntele on a problem
  for (let i = 0; i < 8; i++) {
    await next(page, testInfo);
    await answerRight(page, testInfo);
  }
  await next(page, testInfo); // Katso tulos
  await press(view(page).locator('.listen'), testInfo); // Kuuntele on the end screen
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  await press(view(page).locator('.mk-change'), testInfo); // Vaihda
  await settle(page);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  const calls = await speakCalls(page);
  // 1 choose + 1 Aloita + 2 answers + 1 Seuraava + 1 Kuuntele + 8 x (Seuraava + answer) + Katso tulos
  // + Kuuntele + Pelaa uudelleen + Aloita uusi kierros
  expect(calls.length).toBe(1 + 1 + 2 + 1 + 1 + 16 + 1 + 1 + 1 + 1);
  expect(calls.every((c) => c.inDispatch)).toBe(true);
});

test('Matikka: a typed round, with the keyboard on desktop, speaks inside the tap or key press', async ({ page }, testInfo) => {
  await seedRandom(page, 3);
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  await answerWrong(page, testInfo);
  await next(page, testInfo);
  if (!testInfo.project.use.hasTouch) {
    // keys only: digits then Enter, then Enter again for Seuraava
    await page.keyboard.press('1');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
  }
  const calls = await speakCalls(page);
  // Aloita + the wrong answer + Seuraava; on desktop also the answer and the next problem by key
  expect(calls.length).toBe(testInfo.project.use.hasTouch ? 3 : 5);
  expect(calls.every((c) => c.inDispatch)).toBe(true);
});

test('Matikka: a round started with 0 answered, Etusivu, the card tap reads problem 1 inside the tap', async ({ page }, testInfo) => {
  await seedRandom(page, 4);
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const before = (await speakCalls(page)).length;
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect(page.locator('#home')).toBeVisible();
  await press(page.locator('button.game-card[data-game="matikka"]'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(before + 1);
  const calls = await speakCalls(page);
  expect(calls[before].inDispatch).toBe(true);
  expect(calls[before].text).toBe(calls[0].text);
});

// ---- SEI-46: the automatic advance is the one reading that does not start inside a tap ----

test('Matikka: the auto-advance reading starts from a timer (not inDispatch); every other call is inside its tap', async ({ page }, testInfo) => {
  await seedRandom(page, 5);
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' }); // Aloita
  await answerRight(page, testInfo); // the answer, then 4 s of waiting with no tap
  await expect.poll(async () => (await speakCalls(page)).length, { timeout: 6000 }).toBe(3);
  const calls = await speakCalls(page);
  expect(calls.map((c) => c.inDispatch)).toEqual([true, true, false]);
  // the third call is problem 2, read by the timer
  await expect(view(page).locator('.mk-problem')).toHaveAttribute('aria-label', /^Lasku 2 \/ 10/);
});
