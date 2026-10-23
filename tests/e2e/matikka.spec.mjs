// Matikka against the acceptance criteria SEI-2 (1-10), SEI-5 (1-2) and SEI-6 (1-2).
// Answers come from the problem's accessible name (matikka-helpers.mjs); the random numbers are
// seeded, so a failure repeats. Every test waits (settle) after a screen change, because the game
// ignores its own buttons for 500 ms then.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import {
  openMatikka, startRound, answerRight, answerWrong, next, playRound, problem, typeNumber, view, button,
} from './matikka-helpers.mjs';

const ALL = ['add', 'sub', 'mul'];
const PRAISE = ['Hienoa! 🌟', 'Oikein! ⭐', 'Mahtavaa! 🎉', 'Tosi hyvä! 🏆', 'Loistavaa! 🌈', 'Upea! 💪', 'Bravo! 🎊', 'Mestari! 🧙'];
const RETRY = /yrit|kokeil|uudelleen|uudestaan/i;
let seed = 100;

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, (seed += 1));
});

const isTouch = (testInfo) => testInfo.project.use.hasTouch;
const badge = (page) => page.locator('button.game-card[data-game="matikka"] .badge');
const card = (page) => page.locator('button.game-card[data-game="matikka"]');
const home = (page, testInfo) => press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
const lastSpeak = async (page) => (await speakCalls(page)).at(-1);
const label = (page) => view(page).locator('.mk-problem').getAttribute('aria-label');
const bg = (locator) => locator.evaluate((e) => getComputedStyle(e).backgroundColor);

// ---------- SEI-2 / 1-4: levels and operations ----------

test('SEI-2 / 1: a Helppo round has four options, one of them right, and Helppo ranges', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo', ops: ALL });
  const seen = new Set();
  for (let i = 0; i < 10; i++) {
    const p = await problem(page);
    seen.add(p.op);
    const values = await view(page).locator('.mk-option').evaluateAll((els) => els.map((e) => Number(e.dataset.value)));
    expect(values, `problem ${p.n}`).toHaveLength(4);
    expect(new Set(values).size).toBe(4);
    expect(values.filter((v) => v === p.answer), `problem ${p.n} options ${values}`).toHaveLength(1);
    if (p.op === 'add') expect(p.a + p.b).toBeLessThanOrEqual(10);
    if (p.op === 'sub') expect(p.a).toBeLessThanOrEqual(10);
    if (p.op === 'mul') expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(5);
    await expect(view(page).locator('.mk-pad')).toBeHidden();
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  expect(seen.size).toBeGreaterThan(1);
});

test('SEI-2 / 2: a Keskitaso round has a keypad, no options, Keskitaso ranges, and typing the answer scores it', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso', ops: ALL });
  for (const name of ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Poista', '0', 'OK, tarkista vastaus']) {
    await expect(button(page, name)).toBeVisible();
  }
  for (let i = 0; i < 10; i++) {
    const p = await problem(page);
    await expect(view(page).locator('.mk-options')).toBeHidden();
    if (p.op === 'add') expect(p.a + p.b).toBeLessThanOrEqual(20);
    if (p.op === 'sub') expect(p.a).toBeLessThanOrEqual(20);
    if (p.op === 'mul') {
      expect(p.a).toBeLessThanOrEqual(5);
      expect(p.b).toBeLessThanOrEqual(10);
    }
    await answerRight(page, testInfo);
    await expect(view(page).locator('.mk-feedback')).toContainText(/!/);
    await expect(view(page).locator('.mk-box')).toHaveText(String(p.answer));
    await next(page, testInfo);
  }
});

test('SEI-2 / 3: tapping Vaikea turns Kertolasku on, and a Vaikea round has Vaikea ranges and a keypad', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await expect(button(page, 'Kertolasku')).toHaveAttribute('aria-pressed', 'false');
  await press(view(page).getByRole('radio', { name: /^Vaikea/ }), testInfo);
  await expect(button(page, 'Kertolasku')).toHaveAttribute('aria-pressed', 'true');
  // it can be turned off again
  await press(button(page, 'Kertolasku'), testInfo);
  await expect(button(page, 'Kertolasku')).toHaveAttribute('aria-pressed', 'false');
  await press(button(page, 'Kertolasku'), testInfo);
  await startRound(page, testInfo, { level: 'Vaikea' });
  await expect(view(page).locator('.mk-pad')).toBeVisible();
  for (let i = 0; i < 10; i++) {
    const p = await problem(page);
    if (p.op === 'add') expect(p.a + p.b).toBeLessThanOrEqual(100);
    if (p.op === 'sub') {
      expect(p.a).toBeGreaterThanOrEqual(10);
      expect(p.a).toBeLessThanOrEqual(100);
      expect(p.b).toBeLessThanOrEqual(p.a);
    }
    if (p.op === 'mul') {
      expect(Math.min(p.a, p.b)).toBeGreaterThanOrEqual(2);
      expect(Math.max(p.a, p.b)).toBeLessThanOrEqual(10);
    }
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
});

test('SEI-2 / 4: the chosen operations are the ones used', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo', ops: ['add', 'mul'] });
  for (let i = 0; i < 10; i++) {
    expect(['plus', 'kertaa']).toContain((await problem(page)).word);
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
});

test('SEI-2 / 4: the last operation cannot be turned off, the hint says why, and a tap does not start a round', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await press(button(page, 'Vähennyslasku'), testInfo);
  await expect(button(page, 'Vähennyslasku')).toHaveAttribute('aria-pressed', 'false');
  await press(button(page, 'Yhteenlasku'), testInfo);
  await expect(button(page, 'Yhteenlasku')).toHaveAttribute('aria-pressed', 'true');
  await expect(view(page).locator('.mk-hint')).toHaveText('Ainakin yksi laskutapa pitää olla valittuna.');
  await press(view(page).getByRole('radio', { name: /^Keskitaso/ }), testInfo);
  await expect(view(page).locator('.mk-hint')).toHaveText('');
  // no round started by any of that: still the choose screen, no badge
  await expect(view(page).locator('.mk-choose')).toBeVisible();
  await expect(view(page).locator('.mk-play')).toBeHidden();
  await home(page, testInfo);
  await expect(badge(page)).toBeHidden();
  expect(await speakCalls(page)).toEqual([]);
});

// ---------- SEI-2 / 5: typing ----------

test('SEI-2 / 5: the keypad types at most four digits, deletes, and OK on an empty box does nothing', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const box = view(page).locator('.mk-box');
  const calls = (await speakCalls(page)).length;
  await expect(box).toHaveText('?');
  await typeNumber(page, testInfo, '12345');
  await expect(box).toHaveText('1234');
  await press(button(page, 'Poista'), testInfo);
  await expect(box).toHaveText('123');
  for (let i = 0; i < 3; i++) await press(button(page, 'Poista'), testInfo);
  await expect(box).toHaveText('?');
  await press(button(page, 'Poista'), testInfo); // delete on empty
  await expect(box).toHaveText('?');
  await press(button(page, 'OK, tarkista vastaus'), testInfo);
  await expect(box).toHaveText('?');
  await expect(view(page).locator('.mk-feedback')).toBeEmpty();
  expect((await speakCalls(page)).length).toBe(calls);
  await typeNumber(page, testInfo, '07');
  await expect(box).toHaveText('7');
});

test('SEI-2 / 5: on a computer the digit keys, Backspace and Enter work; Ctrl does not type', async ({ page }, testInfo) => {
  test.skip(isTouch(testInfo), 'keyboard: desktop project only');
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const box = view(page).locator('.mk-box');
  await page.keyboard.press('1');
  await page.keyboard.press('2');
  await expect(box).toHaveText('12');
  await page.keyboard.press('Backspace');
  await expect(box).toHaveText('1');
  await page.keyboard.press('Control+5');
  await expect(box).toHaveText('1');
  await page.keyboard.press('Backspace');
  await page.keyboard.press('Enter'); // OK on empty
  await expect(view(page).locator('.mk-feedback')).toBeEmpty();

  // Enter after clicking a key with the mouse is OK, not "press this key again": no 77
  const p = await problem(page);
  const digits = String(p.answer).split('');
  for (const d of digits.slice(0, -1)) await button(page, d).click();
  await button(page, digits.at(-1)).click(); // the last click leaves focus on this key
  await page.keyboard.press('Enter');
  await expect(view(page).locator('.mk-feedback')).toContainText(/!/);
  await expect(box).toHaveText(String(p.answer));
  await expect(view(page).locator('.mk-yours')).toBeHidden();

  // Enter with focus on Seuraava advances exactly one problem
  await expect(view(page).locator('.mk-next')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await label(page)).toMatch(/^Lasku 2 \/ 10/);
  await page.waitForTimeout(100);
  expect(await label(page)).toMatch(/^Lasku 2 \/ 10/);

  // Enter on another button belongs to that button: Vaihda opens the choose screen and
  // the problem does not move on
  const q2 = await problem(page);
  await answerRight(page, testInfo);
  await view(page).locator('.mk-change').focus();
  await page.keyboard.press('Enter');
  await expect(view(page).locator('.mk-choose')).toBeVisible();
  await settle(page);
  await press(button(page, 'Takaisin laskuun'), testInfo);
  expect((await problem(page)).n).toBe(q2.n);
});

// ---------- SEI-2 / 6-8: answers, speech ----------

test('SEI-2 / 6: a right answer gets praise, the box fills in, and the answer is read at 0.9', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const p = await answerRight(page, testInfo);
  const text = (await view(page).locator('.mk-feedback').textContent()).trim();
  expect(PRAISE).toContain(text);
  await expect(view(page).locator('.mk-box')).toHaveText(String(p.answer));
  const call = await lastSpeak(page);
  expect({ text: call.text, rate: call.rate, inDispatch: call.inDispatch }).toEqual({ text: String(p.answer), rate: 0.9, inDispatch: true });
});

test('SEI-2 / 7: a wrong answer shows the right one; Helppo marks both options', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const p = await answerWrong(page, testInfo);
  await expect(view(page).getByRole('button', { name: `${p.answer}, oikea vastaus` })).toBeVisible();
  await expect(view(page).getByRole('button', { name: `${p.given}, sinun vastauksesi, väärin` })).toBeVisible();
  await expect(view(page).locator('.mk-box')).toHaveText(String(p.answer));
});

test('SEI-2 / 7: a wrong typed answer shows the right number and the child\'s own number at once', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const p = await answerWrong(page, testInfo);
  await expect(view(page).locator('.mk-box')).toHaveText(String(p.answer));
  await expect(view(page).locator('.mk-box')).toBeVisible();
  await expect(view(page).locator('.mk-yours')).toHaveText(String(p.given));
  await expect(view(page).locator('.mk-yours')).toBeVisible();
});

test('SEI-2 / 8: the problem is read with plus, miinus or kertaa at 0.75, and Kuuntele reads it again', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo', ops: ALL });
  const p = await problem(page);
  const first = (await speakCalls(page))[0];
  expect({ text: first.text, rate: first.rate, inDispatch: first.inDispatch }).toEqual({
    text: `${p.a} ${p.word} ${p.b}`, rate: 0.75, inDispatch: true,
  });
  await press(view(page).locator('.listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  expect((await lastSpeak(page)).text).toBe(first.text);
  await answerRight(page, testInfo);
  await press(view(page).locator('.listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(4);
  expect((await lastSpeak(page)).text).toBe(first.text);
});

// ---------- SEI-2 / 9: the scoreboard ----------

test('SEI-2 / 9: score, stars and the progress bar follow the answers', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const stars = view(page).locator('.status-slot');
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 0 / 0');
  await expect(stars).toHaveAttribute('aria-label', 'Tähdet: 0 / 5');
  await expect(view(page).locator('.mk-bar i.is-full')).toHaveCount(0);
  await answerWrong(page, testInfo);
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 0 / 1');
  await expect(stars).toHaveAttribute('aria-label', 'Tähdet: 0 / 5');
  await next(page, testInfo);
  await answerRight(page, testInfo);
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 1 / 2');
  await expect(stars).toHaveAttribute('aria-label', 'Tähdet: 3 / 5');
  await expect(stars.locator('svg.is-on')).toHaveCount(3);
  await expect(view(page).locator('.mk-bar')).toHaveAttribute('aria-label', '2 laskua 10:stä tehty');
  await expect(view(page).locator('.mk-bar i.is-full')).toHaveCount(2);
});

test('SEI-2 / 9: three right answers in a row show the streak, it stays on the next problem and a wrong answer clears it', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const streak = view(page).locator('.mk-streak');
  await answerRight(page, testInfo);
  await next(page, testInfo);
  await answerRight(page, testInfo);
  await expect(streak).toHaveText('');
  await next(page, testInfo);
  await answerRight(page, testInfo);
  await expect(streak).toHaveText('🔥 3 peräkkäin oikein!');
  await next(page, testInfo);
  await expect(streak).toHaveText('🔥 3 peräkkäin oikein!'); // still there, nothing answered yet
  await answerWrong(page, testInfo);
  await expect(streak).toHaveText('');
});

// ---------- SEI-2 / 10: next, the end, play again ----------

test('SEI-2 / 10: Seuraava goes on, the tenth problem says Katso tulos, the end screen does not come by itself, Pelaa uudelleen starts over', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await expect(view(page).locator('.mk-next')).toBeHidden(); // not before an answer
  await answerRight(page, testInfo);
  await expect(view(page).locator('.mk-next')).toBeVisible();
  const calls = (await speakCalls(page)).length;
  await next(page, testInfo);
  expect(await label(page)).toMatch(/^Lasku 2 \/ 10/);
  expect((await speakCalls(page)).length).toBe(calls + 1);
  for (let i = 2; i <= 10; i++) {
    await answerRight(page, testInfo);
    if (i < 10) await next(page, testInfo);
  }
  await expect(view(page).locator('.mk-next')).toHaveText('Katso tulos');
  await page.waitForTimeout(2000); // the old game moved on by itself after 1.5 s
  await expect(view(page).locator('.mk-end')).toBeHidden();
  await next(page, testInfo);
  await expect(view(page).locator('.mk-end')).toBeVisible();
  expect(await view(page).locator('.mk-piece').count()).toBeGreaterThan(0);
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  expect(await label(page)).toMatch(/^Lasku 1 \/ 10/);
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 0 / 0');
  const again = await problem(page);
  const call = await lastSpeak(page);
  expect(call.text).toBe(`${again.a} ${again.word} ${again.b}`);
  expect(call.inDispatch).toBe(true);
});

test('SEI-2 / 10: on a computer Enter goes to the next problem when the problem has focus', async ({ page }, testInfo) => {
  test.skip(isTouch(testInfo), 'keyboard: desktop project only');
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  await expect(view(page).locator('.mk-problem')).toBeFocused();
  await answerRight(page, testInfo);
  await view(page).locator('.mk-problem').focus();
  await page.keyboard.press('Enter');
  expect(await label(page)).toMatch(/^Lasku 2 \/ 10/);
});

// ---------- SEI-5: the wrong-answer text ----------

test('SEI-5 / 1: Helppo says what happened, promises no retry, and the options stay locked', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const p = await answerWrong(page, testInfo);
  const fb = view(page).locator('.mk-feedback');
  await expect(fb.locator('.mk-fb-title')).toHaveText('Ei ihan.');
  await expect(fb.locator('.mk-fb-line')).toHaveText(`Oikea vastaus on ${p.answer}.`);
  expect(await fb.textContent()).not.toMatch(RETRY);
  for (const o of await view(page).locator('.mk-option').all()) await expect(o).toBeDisabled();
  await expect(view(page).locator('.mk-next')).toBeVisible();
  const call = await lastSpeak(page);
  expect(call.text).toBe(`Ei ihan. Oikea vastaus on ${p.answer}.`);
  expect(call.rate).toBe(0.85);
});

test('SEI-5 / 2: a typed wrong answer says the same, and the keypad stays locked', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const p = await answerWrong(page, testInfo);
  const fb = view(page).locator('.mk-feedback');
  await expect(fb.locator('.mk-fb-line')).toHaveText(`Oikea vastaus on ${p.answer}.`);
  expect(await fb.textContent()).not.toMatch(RETRY);
  const keys = await view(page).locator('.mk-key').all();
  expect(keys).toHaveLength(12);
  for (const k of keys) await expect(k).toBeDisabled();
  expect((await lastSpeak(page)).text).toBe(`Ei ihan. Oikea vastaus on ${p.answer}.`);
  if (!isTouch(testInfo)) {
    await page.keyboard.press('9');
    await page.keyboard.press('Backspace');
    await expect(view(page).locator('.mk-box')).toHaveText(String(p.answer));
    await expect(view(page).locator('.mk-yours')).toHaveText(String(p.given));
  }
});

// ---------- SEI-6: the end screen ----------

test('SEI-6 / 1: 2 / 10 is not a matikkamestari', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 2);
  await expect(view(page).locator('.mk-q-end')).toHaveText('Kierros valmis!');
  await expect(view(page).locator('.mk-result-score')).toHaveText('2 / 10 oikein');
  await expect(view(page).locator('.mk-result-line')).toHaveText('Harjoittelemalla oppii!');
  await expect(view(page).locator('.mk-end-stars')).toHaveAttribute('aria-label', 'Tähdet: 1 / 5');
  await expect(view(page).locator('.mk-piece')).toHaveCount(0);
  const call = await lastSpeak(page);
  expect(call.text).toBe('Kierros valmis. Sait 2 oikein. Harjoittelemalla oppii!');
  expect(call.rate).toBe(0.85);
  expect(call.inDispatch).toBe(true);
  const screen = (await view(page).locator('.mk-end').innerText()) + (await view(page).locator('.mk-q-end').innerText());
  expect(screen + call.text).not.toMatch(/mestari|mahtavaa/i);
});

test('SEI-6 / 2: 10 / 10 and 2 / 10 differ in heading, tier and background; confetti only for the best', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 10);
  const result = view(page).locator('.mk-result');
  await expect(view(page).locator('.mk-q-end')).toHaveText('Täydellinen tulos!');
  await expect(view(page).locator('.mk-result-score')).toHaveText('10 / 10 oikein');
  await expect(view(page).locator('.mk-result-line')).toHaveText('Olet matikkamestari!');
  await expect(result).toHaveAttribute('data-tier', 'perfect');
  expect(await bg(result)).toBe('rgb(255, 244, 214)');
  await expect(view(page).locator('.mk-piece')).toHaveCount(100);
  expect((await lastSpeak(page)).text).toBe('Täydellinen tulos! Sait 10 oikein. Olet matikkamestari!');
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  await playRound(page, testInfo, 2);
  await expect(result).toHaveAttribute('data-tier', 'done');
  expect(await bg(result)).toBe('rgb(255, 255, 255)');
  await expect(view(page).locator('.mk-q-end')).toHaveText('Kierros valmis!');
});

test('SEI-6 / 2: with reduced motion there is no confetti, and the versions still differ', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 10);
  await expect(view(page).locator('.mk-q-end')).toHaveText('Täydellinen tulos!');
  expect(await bg(view(page).locator('.mk-result'))).toBe('rgb(255, 244, 214)');
  await expect(view(page).locator('.mk-piece')).toHaveCount(0);
});

test('SEI-6: 8 / 10 gets Hienoa!, a green background and a little confetti', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 8);
  await expect(view(page).locator('.mk-q-end')).toHaveText('Hienoa!');
  await expect(view(page).locator('.mk-result-line')).toHaveText('Hyvin laskettu!');
  expect(await bg(view(page).locator('.mk-result'))).toBe('rgb(227, 247, 234)');
  await expect(view(page).locator('.mk-piece')).toHaveCount(40);
  expect((await lastSpeak(page)).text).toBe('Hienoa! Sait 8 oikein. Hyvin laskettu!');
});

// ---------- leaving and coming back (design 2, 6) ----------

test('resume: Etusivu after four answers shows Kesken 4/10 and the same screen again, silently', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  for (let i = 0; i < 3; i++) {
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  await answerWrong(page, testInfo);
  const before = { label: await label(page), score: await view(page).locator('.mk-score').textContent(), fb: await view(page).locator('.mk-feedback').textContent() };
  const calls = (await speakCalls(page)).length;
  await home(page, testInfo);
  await expect(badge(page)).toContainText('Kesken 4/10');
  await press(card(page), testInfo);
  await expect(view(page).locator('.mk-play')).toBeVisible();
  expect({ label: await label(page), score: await view(page).locator('.mk-score').textContent(), fb: await view(page).locator('.mk-feedback').textContent() }).toEqual(before);
  await page.waitForTimeout(200);
  expect((await speakCalls(page)).length).toBe(calls);
});

test('resume: a round with nothing answered shows no badge, and the card tap reads problem 1', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await home(page, testInfo);
  await expect(badge(page)).toBeHidden();
  await press(card(page), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  const calls = await speakCalls(page);
  expect(calls[1].inDispatch).toBe(true);
  expect(calls[1].text).toBe(calls[0].text);
});

test('resume: after the tenth answer the badge says Kesken 10/10 and the feedback and Katso tulos are still there', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  for (let i = 0; i < 9; i++) {
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  await answerRight(page, testInfo);
  await home(page, testInfo);
  await expect(badge(page)).toContainText('Kesken 10/10');
  await press(card(page), testInfo);
  await expect(view(page).locator('.mk-next')).toHaveText('Katso tulos');
  await expect(view(page).locator('.mk-feedback')).not.toBeEmpty();
  await expect(view(page).locator('.mk-end')).toBeHidden();
});

test('resume: after Katso tulos there is no badge, the same end screen comes back with no confetti and no speech', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 10);
  await expect(view(page).locator('.mk-piece')).toHaveCount(100);
  const calls = (await speakCalls(page)).length;
  await home(page, testInfo);
  await expect(view(page).locator('.mk-piece')).toHaveCount(0); // leaving takes the confetti away at once
  await expect(badge(page)).toBeHidden();
  await press(card(page), testInfo);
  await expect(view(page).locator('.mk-q-end')).toHaveText('Täydellinen tulos!');
  await expect(view(page).locator('.mk-end')).toBeVisible();
  await expect(view(page).locator('.mk-piece')).toHaveCount(0);
  await page.waitForTimeout(200);
  expect((await speakCalls(page)).length).toBe(calls);
});

test('resume: a typed but unanswered value survives Etusivu', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  await answerRight(page, testInfo);
  await next(page, testInfo);
  await typeNumber(page, testInfo, '12');
  await home(page, testInfo);
  await press(card(page), testInfo);
  await expect(view(page).locator('.mk-box')).toHaveText('12');
});

// ---------- Vaihda ----------

test('Vaihda mid-round: Takaisin laskuun drops the draft and returns to the same problem; Aloita uusi kierros starts over', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await answerWrong(page, testInfo);
  const fb = await view(page).locator('.mk-feedback').textContent();
  const lbl = await label(page);
  const calls = (await speakCalls(page)).length;
  await press(view(page).locator('.mk-change'), testInfo);
  await expect(view(page).locator('.mk-choose')).toBeVisible();
  await settle(page);
  await expect(button(page, 'Takaisin laskuun')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await expect(button(page, 'Aloita')).toBeHidden();
  await press(view(page).getByRole('radio', { name: /^Vaikea/ }), testInfo);
  await press(button(page, 'Takaisin laskuun'), testInfo);
  await settle(page);
  expect(await label(page)).toBe(lbl);
  expect(await view(page).locator('.mk-feedback').textContent()).toBe(fb);
  await expect(view(page).locator('.mk-settings-text')).toHaveText('Helppo · + −');
  expect((await speakCalls(page)).length).toBe(calls);
  // the draft is gone: the choose screen shows the committed settings again
  await press(view(page).locator('.mk-change'), testInfo);
  await settle(page);
  await expect(view(page).getByRole('radio', { name: /^Helppo/ })).toHaveAttribute('aria-checked', 'true');
  await press(view(page).getByRole('radio', { name: /^Keskitaso/ }), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  expect(await label(page)).toMatch(/^Lasku 1 \/ 10/);
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 0 / 0');
  await expect(view(page).locator('.mk-settings-text')).toHaveText('Keskitaso · + −');
  await expect(view(page).locator('.mk-pad')).toBeVisible();
});

test('Vaihda mid-round keeps a typed value, and Vaihda laskuja from the end screen offers only Aloita', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  await typeNumber(page, testInfo, '12');
  await press(view(page).locator('.mk-change'), testInfo);
  await settle(page);
  await press(button(page, 'Takaisin laskuun'), testInfo);
  await expect(view(page).locator('.mk-box')).toHaveText('12');
  await settle(page);
  await press(button(page, 'Poista'), testInfo);
  await press(button(page, 'Poista'), testInfo);
  for (let i = 0; i < 10; i++) {
    if (i > 0) await next(page, testInfo);
    await answerRight(page, testInfo);
  }
  await next(page, testInfo);
  await press(button(page, 'Vaihda laskuja'), testInfo);
  await settle(page);
  await expect(button(page, 'Aloita')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeHidden();
  await expect(button(page, 'Takaisin laskuun')).toBeHidden();
});

// ---------- the tap guard (design 3.8) ----------

test('tap guard: a second tap right after a screen change is ignored, and works after 500 ms', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  for (let i = 0; i < 9; i++) {
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  await answerRight(page, testInfo);
  // Katso tulos, then Pelaa uudelleen in the same moment: the second one lands on the new screen
  await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="matikka"]');
    v.querySelector('.mk-next').click();
    v.querySelector('.mk-again').click();
  });
  await expect(view(page).locator('.mk-end')).toBeVisible();
  await settle(page);
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  expect(await label(page)).toMatch(/^Lasku 1 \/ 10/);
});

test('tap guard: an option tapped at once after Aloita is not answered, and Kuuntele still speaks', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="matikka"]');
    v.querySelector('.mk-start').click();
    v.querySelector('.mk-option').click();
    v.querySelector('.listen').click();
  });
  await expect(view(page).locator('.mk-play')).toBeVisible();
  await expect(view(page).locator('.mk-feedback')).toBeEmpty();
  await expect(view(page).locator('.mk-score')).toHaveText('Pisteet: 0 / 0');
  expect((await speakCalls(page)).length).toBe(2); // Aloita and Kuuntele
});

// ---------- accessibility (design 7) ----------

test('names and roles: radiogroup, pressed toggles, keypad and Seuraava reachable by name, focus moves with the game', async ({ page }, testInfo) => {
  await openMatikka(page, testInfo);
  const group = view(page).getByRole('radiogroup', { name: 'Taso' });
  await expect(group.getByRole('radio')).toHaveCount(3);
  await expect(group.getByRole('radio', { name: /^Helppo/ })).toHaveAttribute('aria-checked', 'true');
  await expect(group.getByRole('radio', { name: /^Keskitaso/ })).toHaveAttribute('aria-checked', 'false');
  await expect(view(page).getByRole('group', { name: 'Laskut' }).getByRole('button')).toHaveCount(3);
  await expect(button(page, 'Yhteenlasku')).toHaveAttribute('aria-pressed', 'true');
  await expect(button(page, 'Kertolasku')).toHaveAttribute('aria-pressed', 'false');

  await startRound(page, testInfo, { level: 'Keskitaso' });
  await expect(view(page).locator('.mk-problem')).toBeFocused();
  await expect(button(page, 'Poista')).toBeVisible();
  await expect(button(page, 'OK, tarkista vastaus')).toBeVisible();
  await expect(button(page, 'Vaihda tasoa ja laskuja')).toBeVisible();
  const p = await problem(page);
  await expect(view(page).getByRole('group', { name: `Lasku 1 / 10: ${p.a} ${p.word} ${p.b}` })).toBeVisible();
  await expect(view(page).locator('.mk-live')).toHaveText(`Lasku 1 / 10: ${p.a} ${p.word} ${p.b}.`);
  await answerRight(page, testInfo);
  await expect(button(page, 'Seuraava lasku')).toBeFocused();
  await expect(view(page).locator('.mk-live')).toContainText(`Oikein! ${p.a} ${p.word} ${p.b} on ${p.answer}. Pisteet 1 / 1.`);
  await next(page, testInfo);
  await expect(view(page).locator('.mk-problem')).toBeFocused();
  await press(button(page, 'Vaihda tasoa ja laskuja'), testInfo);
  await expect(view(page).getByRole('heading', { name: 'Mitä lasketaan?' })).toBeFocused();
});
