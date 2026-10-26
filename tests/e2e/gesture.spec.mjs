import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle, recordAudio, audioCalls } from './helpers.mjs';
import * as sn from './sanat-helpers.mjs';
import { openMatikka, startRound, answerRight, answerWrong, next, view, button } from './matikka-helpers.mjs';

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
});

// The fake records, per speak(), whether it ran inside a click listener (addEventListener is
// wrapped to count click listeners on the stack). Speech started after an await, from a timer,
// a hashchange or an awaited import() would record false.

// Matikka and Sanat have their own tests below: their choose screens read nothing.
for (const id of ['espanja']) {
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

// ---- Sanat (SEI-3): the card tap reads nothing; every reading starts inside its tap ----

test('Sanat: the card tap reads nothing, the choose screen is silent', async ({ page }, testInfo) => {
  await seedRandom(page, 11);
  await sn.openSanat(page, testInfo);
  await page.waitForTimeout(300);
  expect(await speakCalls(page)).toEqual([]);
});

test('Sanat: Aloita reads the word inside the tap, then slowly from a timer after a pause that follows the first ending', async ({ page }, testInfo) => {
  await seedRandom(page, 12);
  await sn.openSanat(page, testInfo);
  await sn.startRound(page, testInfo, { level: 'Helppo' });
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  const calls = await speakCalls(page);
  expect(calls[0].text).toBe(calls[1].text);
  expect(calls.map((c) => c.rate)).toEqual([0.78, 0.52]);
  expect(calls.every((c) => c.lang === 'fi-FI' && c.voice === 'fi-FI')).toBe(true);
  expect(calls[0].inDispatch).toBe(true);
  expect(calls[1].inDispatch).toBe(false);
  // 700 ms after the first reading ended, less slack for the timer
  expect(calls[1].at - calls[0].endedAt).toBeGreaterThanOrEqual(650);
});

test('Sanat: every spoken event starts inside its tap; only the parts after a pause start from a timer', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  await recordAudio(page);
  await seedRandom(page, 13);
  await sn.openSanat(page, testInfo);
  const radio = (name) => sn.view(page).getByRole('radio', { name: new RegExp(`^${name}`) });
  // Runs `act` and checks that the first speak it causes started inside the tap.
  async function event(name, act) {
    await page.waitForTimeout(1000); // the later part of an earlier reading has been spoken by now
    const before = (await speakCalls(page)).length;
    await act();
    await expect.poll(async () => (await speakCalls(page)).length, { message: `${name} speaks` }).toBeGreaterThan(before);
    expect((await speakCalls(page))[before].inDispatch, `${name}: the first speak is inside the tap`).toBe(true);
  }
  await event('Kuuntele on the choose screen', () => press(sn.view(page).locator('.listen'), testInfo));
  await press(radio('Helppo'), testInfo);
  await event('Aloita', () => press(sn.button(page, 'Aloita'), testInfo));
  await settle(page);
  let word = await sn.currentWord(page);
  await event('a letter', () => sn.spell(page, testInfo, word[0]));
  await event('Kuuntele on the word screen', () => press(sn.view(page).locator('.listen'), testInfo));
  await event('the picture', () => press(sn.button(page, 'Kuva. Kuuntele sana.'), testInfo));
  await sn.spell(page, testInfo, word.slice(1, -1));
  await event('the last letter, right', () => sn.spell(page, testInfo, word.slice(-1)));
  const play = (await audioCalls(page)).filter((a) => a.kind === 'play');
  expect(play.length).toBe(1);
  expect(play[0].inDispatch).toBe(true);
  await event('Seuraava', () => sn.next(page, testInfo));
  word = await sn.currentWord(page);
  const wrong = sn.wrongSpelling(word, false);
  await sn.spell(page, testInfo, wrong.slice(0, -1));
  await event('the last letter, wrong', () => sn.spell(page, testInfo, wrong.slice(-1)));
  await event('Ohita', () => press(sn.button(page, 'Ohita sana'), testInfo));
  await sn.next(page, testInfo);
  // a level change on an open word
  await press(sn.view(page).locator('.sn-change'), testInfo);
  await settle(page);
  await event('Kuuntele on the choose screen in the middle of a round', () => press(sn.view(page).locator('.listen'), testInfo));
  await press(radio('Vaikea'), testInfo);
  await event('Takaisin sanaan after a level change', () => press(sn.button(page, 'Takaisin sanaan'), testInfo));
  await settle(page);
  for (let i = 3; i <= 10; i++) {
    await sn.skip(page, testInfo);
    if (i === 10) break;
    await sn.next(page, testInfo);
  }
  await event('Katso tulos', () => press(sn.button(page, 'Katso tulos'), testInfo));
  await settle(page);
  await event('Kuuntele on the end screen', () => press(sn.view(page).locator('.listen'), testInfo));
  await event('Pelaa uudelleen', () => press(sn.button(page, 'Pelaa uudelleen'), testInfo));
  await settle(page);
  await press(sn.view(page).locator('.sn-change'), testInfo);
  await settle(page);
  await event('Aloita uusi kierros', () => press(sn.button(page, 'Aloita uusi kierros'), testInfo));
  await settle(page);
  await page.waitForTimeout(1500); // the last reading's later part
  const calls = await speakCalls(page);
  calls.forEach((c, i) => {
    if (c.inDispatch) return;
    // from a timer: it must be a part after a pause, which starts at least 250 ms after the one before ended
    expect(calls[i - 1], `call ${i} (${c.text}) has a call before it`).toBeTruthy();
    expect(calls[i - 1].endedAt, `call ${i} (${c.text}): the one before it ended`).not.toBeNull();
    expect(c.at - calls[i - 1].endedAt, `call ${i} (${c.text}) waited for a pause`).toBeGreaterThanOrEqual(250);
  });
});

test('Sanat: nothing done yet, Etusivu, the card tap reads the current word inside the tap', async ({ page }, testInfo) => {
  await seedRandom(page, 14);
  await sn.openSanat(page, testInfo);
  await sn.startRound(page, testInfo, { level: 'Keskitaso' });
  const word = await sn.currentWord(page);
  const before = (await speakCalls(page)).length;
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBeGreaterThan(before);
  const calls = await speakCalls(page);
  expect(calls[before].inDispatch).toBe(true);
  expect(calls[before].text).toBe(word.toLowerCase());
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
