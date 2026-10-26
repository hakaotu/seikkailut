// Espanja against the acceptance criteria SEI-4 (1-11), SEI-9 (4) and SEI-10 (1-3), plus the pieces of SEI-48
// that are about Espanja's own rules (the wait itself is in auto-advance.spec.mjs). Answers come from the
// question word's accessible name (espanja-helpers.mjs); the random numbers are seeded, so a failure repeats.
// Every test waits (settle) after a screen change, because the game ignores its own buttons for 500 ms then.
//
// A right answer on questions 1-9 starts a 4 s wait (SEI-48). Where a test does not check that, it moves on
// with Seuraava at once (playRound), or answers wrong, so the timer never overtakes it.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import {
  openEspanja, startRound, current, answerRight, answerWrong, skip, next, playRound, optionTexts, settledCount,
  view, button,
} from './espanja-helpers.mjs';
import { WORDS, PRAISE, spoken } from '../../app/src/games/espanja-logic.js';

let seed = 300;

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, (seed += 1));
});

const card = (page) => page.locator('button.game-card[data-game="espanja"]');
const badge = (page) => card(page).locator('.badge');
const home = (page, testInfo) => press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
const label = (page) => view(page).locator('.es-word').getAttribute('aria-label');
const score = (page) => view(page).locator('.es-score');
const stars = (page) => view(page).locator('.status-slot');
const change = (page, testInfo) => press(view(page).locator('.es-change'), testInfo);
const dirCard = (page, dir) => view(page).locator(`.es-dir[data-dir="${dir}"]`);
const confetti = (page) => view(page).locator('.es-piece').count();
const spokenTexts = async (page) => (await speakCalls(page)).map((c) => c.text);
const topicWords = (topic, key) => WORDS.filter((w) => w.topic === topic).map((w) => w[key]);

// ---------- SEI-4 / 1-3: directions, options, the word ----------

test('SEI-4 / 1: Suomi → Espanja asks in Finnish, shows four Spanish options of the word\'s topic, one of them right', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  for (let i = 1; i <= 10; i++) {
    const q = await current(page);
    expect(q.n).toBe(i);
    await expect(view(page).locator('.es-word')).not.toHaveAttribute('lang', /.*/); // Finnish: no lang attribute
    const texts = await optionTexts(page);
    expect(new Set(texts).size).toBe(4);
    for (const t of texts) expect(topicWords(q.pair.topic, 'es'), `${t} beside ${q.pair.fi}`).toContain(t);
    expect(texts.filter((t) => t === q.pair.es)).toHaveLength(1);
    const langs = await view(page).locator('.es-option-text').evaluateAll((els) => els.map((e) => e.lang));
    expect(langs).toEqual(['es', 'es', 'es', 'es']);
    if (i < 10) {
      await skip(page, testInfo);
      await next(page, testInfo);
    }
  }
});

test('SEI-4 / 2: Espanja → Suomi asks in Spanish and answers in Finnish; changing direction in the middle needs Aloita uusi kierros', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  const q = await current(page);
  expect(q.direction).toBe('es2fi');
  await expect(view(page).locator('.es-word')).toHaveAttribute('lang', 'es');
  const texts = await optionTexts(page);
  for (const t of texts) expect(topicWords(q.pair.topic, 'fi')).toContain(t);
  expect(await view(page).locator('.es-option-text').evaluateAll((els) => els.map((e) => e.hasAttribute('lang')))).toEqual([false, false, false, false]);

  await answerWrong(page, testInfo);
  await change(page, testInfo);
  await settle(page);
  await expect(button(page, 'Takaisin kysymykseen')).toBeVisible();
  await press(dirCard(page, 'fi2es'), testInfo);
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
  await expect(view(page).locator('.es-choose-hint')).toHaveText('Toinen suunta alkaa uudella kierroksella.');
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await expect(button(page, 'Aloita')).toBeHidden();
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10/); // the card tap started nothing
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10/);
  await expect(score(page)).toHaveText('Pisteet: 0 / 0');
  await expect(view(page).locator('.es-word')).not.toHaveAttribute('lang', /.*/);
  expect((await current(page)).direction).toBe('fi2es');
});

test('SEI-4 / 3: ten questions, ten different words, each with its own topic in the hint', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const prompts = [];
  for (let i = 1; i <= 10; i++) {
    const q = await current(page);
    prompts.push(q.pair.es);
    await expect(view(page).locator('.es-hint')).toHaveText(`Aihe: ${q.pair.topic}. Valitse espanjaksi.`);
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  expect(new Set(prompts).size).toBe(10);
});

// ---------- SEI-4 / 4: the answer and the lock ----------

test('SEI-4 / 4: a right answer turns its option green with a tick, dims the others and locks all four', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await answerRight(page, testInfo);
  const options = view(page).locator('.es-option');
  const right = options.filter({ hasText: q.answerText });
  await expect(right).toHaveClass(/is-right/);
  await expect(right.locator('.es-mark svg')).toBeVisible();
  await expect(view(page).locator('.es-option.is-dim')).toHaveCount(3);
  for (let i = 0; i < 4; i++) await expect(options.nth(i)).toBeDisabled();
  // a locked option does not answer again
  const box = await options.nth(0).boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(score(page)).toHaveText('Pisteet: 1 / 1');
});

test('SEI-4 / 4: a wrong answer is struck through in red, the right one is green, the rest are dimmed', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await answerWrong(page, testInfo);
  const options = view(page).locator('.es-option');
  const wrong = options.filter({ hasText: q.wrongText });
  await expect(wrong).toHaveClass(/is-wrong/);
  expect(await wrong.evaluate((e) => getComputedStyle(e).textDecorationLine)).toBe('line-through');
  await expect(wrong.locator('.es-mark svg')).toBeVisible();
  await expect(options.filter({ hasText: q.answerText })).toHaveClass(/is-right/);
  await expect(view(page).locator('.es-option.is-dim')).toHaveCount(2);
  for (let i = 0; i < 4; i++) await expect(options.nth(i)).toBeDisabled();
  await expect(score(page)).toHaveText('Pisteet: 0 / 1');
});

// ---------- SEI-4 / 5: speech ----------

test('SEI-4 / 5: fi2es Kuuntele before the answer reads the four options in order, with a pause that follows each ending', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  expect(await speakCalls(page)).toEqual([]); // a Finnish question is not read
  const texts = (await optionTexts(page)).map(spoken);
  await press(view(page).locator('.listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length, { timeout: 5000 }).toBe(4);
  await settledCount(page);
  const calls = await speakCalls(page);
  expect(calls.map((c) => c.text)).toEqual(texts);
  expect(calls.every((c) => c.lang === 'es-ES' && c.rate === 0.9)).toBe(true);
  expect(calls[0].inDispatch).toBe(true);
  for (let i = 1; i < 4; i++) {
    expect(calls[i - 1].endedAt, `call ${i - 1} ended`).not.toBeNull();
    expect(calls[i].at - calls[i - 1].endedAt, `the pause before call ${i}`).toBeGreaterThanOrEqual(450);
  }
});

test('SEI-4 / 5: es2fi reads the word when the question comes and again from Kuuntele; a right answer reads it a third time', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  const q = await current(page);
  const word = spoken(q.pair.es);
  expect(await settledCount(page, 400)).toBe(1);
  expect(await spokenTexts(page)).toEqual([word]);
  expect((await speakCalls(page))[0].inDispatch).toBe(true);
  await press(view(page).locator('.listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  await answerRight(page, testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(3);
  const calls = await speakCalls(page);
  expect(calls.map((c) => c.text)).toEqual([word, word, word]);
  expect(calls[1].inDispatch).toBe(true);
  expect(calls[2].inDispatch).toBe(true);
});

test('SEI-4 / 5: after an answer fi2es Kuuntele reads the one right word', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await answerWrong(page, testInfo);
  expect(await settledCount(page, 400)).toBe(1); // the answer's own reading
  await press(view(page).locator('.listen'), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  expect(await spokenTexts(page)).toEqual([spoken(q.pair.es), spoken(q.pair.es)]);
});

// ---------- SEI-4 / 6, SEI-10 / 2: Seuraava and Ohita ----------

test('SEI-4 / 6, SEI-10 / 2: Seuraava is not there before an answer; Ohita shows the right one and then Seuraava moves on', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const nextBtn = view(page).locator('.es-next');
  await expect(nextBtn).toBeHidden();
  await expect(nextBtn).toHaveCSS('visibility', 'hidden'); // keeps its place, so the row does not jump
  await expect(button(page, 'Ohita kysymys')).toBeVisible();
  const q = await skip(page, testInfo);
  await expect(nextBtn).toBeVisible();
  await expect(button(page, 'Ohita kysymys')).toBeHidden(); // it is gone once the question is answered
  await expect(view(page).locator('.es-option.is-right')).toContainText(q.answerText);
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10/); // a skip does not move on by itself
  await next(page, testInfo);
  expect(await label(page)).toMatch(/^Kysymys 2 \/ 10/);
});

// ---------- SEI-4 / 7: score, bar, end, new round ----------

test('SEI-4 / 7: the score is right / done, the bar fills with each answer or skip, and Pelaa uudelleen starts a new round', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  await answerRight(page, testInfo);
  await next(page, testInfo);
  await answerWrong(page, testInfo);
  await next(page, testInfo);
  await skip(page, testInfo);
  await expect(score(page)).toHaveText('Pisteet: 1 / 3');
  await expect(view(page).locator('.es-bar i.is-full')).toHaveCount(3);
  await expect(view(page).locator('.es-bar')).toHaveAccessibleName('3 kysymystä 10:stä tehty');
  await next(page, testInfo);
  await expect(score(page)).toHaveText('Pisteet: 1 / 3'); // Seuraava changes nothing
  for (let i = 4; i <= 10; i++) {
    await answerWrong(page, testInfo);
    await next(page, testInfo);
  }
  await expect(view(page).locator('.es-q-end')).toHaveText('Kierros valmis!');
  await expect(view(page).locator('.es-result-score')).toHaveText('1 / 10 oikein');
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10/);
  await expect(score(page)).toHaveText('Pisteet: 0 / 0');
  await expect(view(page).locator('.es-bar i.is-full')).toHaveCount(0);
  expect((await current(page)).direction).toBe('es2fi'); // the same direction
});

// ---------- SEI-4 / 8, 9, 11: the end screen and the stars ----------

test('SEI-4 / 8: 8 right gives Hienoa!, 40 pieces of confetti and a star', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrww');
  await expect(view(page).locator('.es-q-end')).toHaveText('Hienoa!');
  await expect(view(page).locator('.es-result-score')).toHaveText('8 / 10 oikein');
  expect(await confetti(page)).toBe(40);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  await expect(view(page).locator('.es-reward')).toHaveText('Sait tähden!');
});

test('SEI-4 / 8: 7 right gives no star and no confetti', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrwww');
  await expect(view(page).locator('.es-q-end')).toHaveText('Kierros valmis!');
  expect(await confetti(page)).toBe(0);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await expect(view(page).locator('.es-reward')).toHaveText('Tähti tulee, kun saat 8 oikein.');
});

test('SEI-4 / 8: 10 right gives Täydellinen tulos!, 100 pieces of confetti and a star; reduced motion has none', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(view(page).locator('.es-q-end')).toHaveText('Täydellinen tulos!');
  await expect(view(page).locator('.es-rows')).toHaveText('10 oikein');
  expect(await confetti(page)).toBe(100);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
});

test('SEI-4 / 8: under reduced motion there is no confetti (and the star is still given)', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(view(page).locator('.es-q-end')).toHaveText('Täydellinen tulos!');
  expect(await confetti(page)).toBe(0);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
});

test('SEI-4 / 8: the collected stars are shown side by side up to 10 on a wide window, otherwise one star and × n', async ({ page }, testInfo) => {
  const wide = testInfo.project.use.viewport.width >= 600;
  await page.addInitScript((n) => window.localStorage.setItem('espanja.stars', n), wide ? '10' : '3');
  await openEspanja(page, testInfo);
  const n = wide ? 10 : 3;
  await expect(stars(page)).toHaveAttribute('aria-label', `Tähtiä: ${n}`);
  if (wide) {
    await expect(stars(page).locator('.es-stars-many svg')).toHaveCount(10);
    await expect(stars(page).locator('.es-stars-many')).toBeVisible();
    await expect(stars(page).locator('.es-stars-few')).toBeHidden();
  } else {
    await expect(stars(page).locator('.es-stars-many')).toBeHidden();
    await expect(stars(page).locator('.es-n')).toHaveText('× 3');
  }
});

test('SEI-4 / 8: 11 stars are shown as one star and × 11, on any width', async ({ page }, testInfo) => {
  await page.addInitScript(() => window.localStorage.setItem('espanja.stars', '11'));
  await openEspanja(page, testInfo);
  await expect(stars(page).locator('.es-n')).toHaveText('× 11');
  await expect(stars(page).locator('.es-stars-many')).toBeHidden();
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 11');
});

test('SEI-4 / 9: a collected star stays after a reload and in a new tab, and is kept under espanja.stars', async ({ page, context }, testInfo) => {
  await openEspanja(page, testInfo);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  expect(await page.evaluate(() => window.localStorage.getItem('espanja.stars'))).toBe('1');
  await page.reload();
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  const page2 = await context.newPage();
  await installFakeSpeech(page2);
  await openEspanja(page2, testInfo);
  await expect(stars(page2)).toHaveAttribute('aria-label', 'Tähtiä: 1');
});

test('SEI-4 / 9: a round that is not finished gives no star, even with 10 right (no Katso tulos)', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  for (let i = 0; i < 9; i++) {
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  await answerRight(page, testInfo); // the tenth is answered, Katso tulos is not pressed
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await page.reload();
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  expect(await page.evaluate(() => window.localStorage.getItem('espanja.stars'))).toBeNull();
});

test('SEI-4 / 11: the old es_stars is neither read nor written', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.setItem('es_stars', '7'));
  await page.reload();
  await press(card(page), testInfo);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await expect(stars(page).locator('.es-stars-few')).toBeVisible();
  await expect(stars(page).locator('.es-stars-few')).toHaveClass(/is-empty/);
  await expect(stars(page).locator('.es-n')).toHaveText('0');
  expect(await page.evaluate(() => window.localStorage.getItem('es_stars'))).toBe('7');
  expect(await page.evaluate(() => window.localStorage.getItem('espanja.stars'))).toBeNull();
});

for (const [raw, shown] of [['-4', 0], ['abc', 0], ['0.5', 0], ['2.7', 2], ['12', 12]]) {
  test(`D3: a stored value of "${raw}" is shown as ${shown} stars`, async ({ page }, testInfo) => {
    await page.addInitScript((v) => window.localStorage.setItem('espanja.stars', v), raw);
    await openEspanja(page, testInfo);
    await expect(stars(page)).toHaveAttribute('aria-label', `Tähtiä: ${shown}`);
  });
}

test('D3: with storage blocked the star still shows for the session and nothing is said', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); }, configurable: true });
  });
  await openEspanja(page, testInfo);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  await expect(view(page).locator('.notice')).toBeHidden();
});

// ---------- SEI-4 / 10: announcements and names ----------

test('SEI-4 / 10: the live region announces each new question; the group and the options are named', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const live = view(page).locator('.es-live');
  const q1 = await current(page);
  await expect(live).toHaveText(`Kysymys 1 / 10: ${q1.pair.fi}. Aihe ${q1.pair.topic}. Valitse espanjaksi.`);
  const group = view(page).getByRole('group', { name: 'Vastausvaihtoehdot' });
  await expect(group).toBeVisible();
  const names = await group.getByRole('button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  expect(names).toHaveLength(4);
  for (const name of names) expect(name).toMatch(/^Vastaus /);
  await skip(page, testInfo);
  await next(page, testInfo);
  const q2 = await current(page);
  await expect(live).toHaveText(`Kysymys 2 / 10: ${q2.pair.fi}. Aihe ${q2.pair.topic}. Valitse espanjaksi.`);
});

test('SEI-4 / 10: after the answer the options are named right, mine and wrong', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await answerWrong(page, testInfo);
  await expect(button(page, `Vastaus ${q.answerText}, oikea vastaus`)).toBeVisible();
  await expect(button(page, `Vastaus ${q.wrongText}, sinun vastauksesi, väärin`)).toBeVisible();
  await expect(view(page).locator('.es-live')).toHaveText(
    `Ei ihan. Oikea vastaus on ${q.answerText}. Sinä valitsit ${q.wrongText}. Pisteet 0 / 1.`,
  );
});

test('names and focus: Ohita kysymys, Seuraava kysymys, Katso tulos, Vaihda suuntaa, the group Suunta, the stars; focus moves with the game', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await expect(view(page).getByRole('radiogroup', { name: 'Suunta' })).toBeVisible();
  await expect(view(page).getByRole('radio', { name: /^Suomi → Espanja/ })).toHaveAttribute('aria-checked', 'true');
  await expect(view(page).getByRole('radio', { name: /^Espanja → Suomi/ })).toHaveAttribute('aria-checked', 'false');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await expect(stars(page)).toHaveAttribute('role', 'img');
  await startRound(page, testInfo, { direction: 'fi2es' });
  await expect(view(page).locator('.es-word')).toBeFocused();
  await expect(button(page, 'Ohita kysymys')).toBeVisible();
  await expect(button(page, 'Vaihda suuntaa. Nyt Suomi → Espanja.')).toBeVisible();
  await answerWrong(page, testInfo);
  await expect(button(page, 'Seuraava kysymys')).toBeFocused();
  await next(page, testInfo);
  await expect(view(page).locator('.es-word')).toBeFocused();
  for (let i = 2; i <= 9; i++) {
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  await skip(page, testInfo);
  await expect(button(page, 'Katso tulos')).toBeFocused();
  await next(page, testInfo);
  await expect(view(page).locator('.es-q-end')).toBeFocused();
});

// ---------- SEI-9 / 4: the corrected words ----------

test('SEI-9 / 4: adiós, buenas tardes and por favor show the corrected Finnish, and no old form shows, in both directions', async ({ page }, testInfo) => {
  // Seed 26 asks gris, adiós, por favor, buenas tardes, ... in the first round after a load (found with newRound
  // and the same generator). The page is loaded again for each direction, which starts the seed again.
  await seedRandom(page, 26);
  const seen = new Set();
  const asked = new Set();
  for (const direction of ['fi2es', 'es2fi']) {
    await openEspanja(page, testInfo);
    await startRound(page, testInfo, { direction });
    for (let i = 1; i <= 10; i++) {
      const q = await current(page);
      asked.add(q.pair.es);
      seen.add(q.direction === 'fi2es' ? q.pair.fi : q.pair.es);
      for (const t of await optionTexts(page)) seen.add(t);
      if (i < 10) {
        await skip(page, testInfo);
        await next(page, testInfo);
      }
    }
    for (const w of ['adiós', 'buenas tardes', 'por favor']) expect(asked, `${w} was asked in ${direction}`).toContain(w);
    for (const t of ['näkemiin', 'hyvää iltapäivää', 'ole kiltti']) expect(seen, `${t} was shown in ${direction}`).toContain(t);
    for (const t of seen) {
      for (const old of ['moi moi', 'hei hei', 'hyvää iltaa', 'ole hyvä']) expect(t, `${t} is an old form`).not.toContain(old);
    }
  }
});

// ---------- SEI-10: wrong, skipped, counted apart ----------

test('SEI-10 / 1: a wrong answer says Ei ihan, names the right word, shows a cross, and reads the Spanish word', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  const q = await answerWrong(page, testInfo);
  const fb = view(page).locator('.es-fb');
  await expect(fb.locator('.es-fb-title')).toHaveText('Ei ihan.');
  await expect(fb.locator('.es-fb-line')).toHaveText(`Oikea vastaus on ${q.answerText}.`);
  await expect(fb.locator('.es-fb-icon svg')).toBeVisible();
  await expect(fb).toHaveAttribute('data-kind', 'wrong');
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2); // the question, then the answer
  const calls = await speakCalls(page);
  expect(calls[1].text).toBe(spoken(q.pair.es));
  expect(calls[1].inDispatch).toBe(true);
});

test('SEI-10 / 1: a right answer shows a praise and the pair, Spanish first', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await answerRight(page, testInfo);
  const fb = view(page).locator('.es-fb');
  expect(PRAISE).toContain(await fb.locator('.es-fb-title').textContent());
  await expect(fb.locator('.es-fb-line')).toHaveText(`${q.pair.es} = ${q.pair.fi}`);
  await expect(fb).toHaveAttribute('data-kind', 'right');
});

test('SEI-10 / 2, 3: 6 right and 4 skipped is 6 / 10, with the skips counted apart, no star and no confetti', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrssss');
  await expect(view(page).locator('.es-q-end')).toHaveText('Kierros valmis!');
  await expect(view(page).locator('.es-result-score')).toHaveText('6 / 10 oikein');
  await expect(view(page).locator('.es-rows > div')).toHaveText(['6 oikein', '4 ohitettu']);
  await expect(view(page).locator('.es-row-b')).toHaveCount(0);
  await expect(view(page).locator('.es-reward')).toHaveText('Tähti tulee, kun saat 8 oikein.');
  expect(await confetti(page)).toBe(0);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await expect(view(page).locator('.es-live')).toHaveText('Kierros valmis! 6 / 10 oikein. 4 ohitettu. Tähti tulee, kun saat 8 oikein.');
});

test('SEI-10 / 2: each Ohita adds one to done, to the score\'s divisor and to the badge, and not to the right count', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await answerRight(page, testInfo);
  await next(page, testInfo);
  await skip(page, testInfo);
  await expect(score(page)).toHaveText('Pisteet: 1 / 2');
  await home(page, testInfo);
  await expect(badge(page)).toHaveText(/Kesken 2\/10/);
  await press(card(page), testInfo);
  await settle(page);
  await next(page, testInfo);
  await skip(page, testInfo);
  await expect(score(page)).toHaveText('Pisteet: 1 / 3');
  await home(page, testInfo);
  await expect(badge(page)).toHaveText(/Kesken 3\/10/);
});

// ---------- the choose screen in the middle of a round, return, resume ----------

test('mid-round choose: three forms of buttons, and a card changes only the draft', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await expect(button(page, 'Aloita')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeHidden();
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
  await startRound(page, testInfo, { direction: 'fi2es' });
  const q = await current(page);
  const before = (await speakCalls(page)).length;
  await change(page, testInfo);
  await settle(page);
  await expect(button(page, 'Takaisin kysymykseen')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await expect(button(page, 'Aloita')).toBeHidden();
  await expect(view(page).locator('.es-choose-hint')).toHaveText('');
  await press(dirCard(page, 'es2fi'), testInfo);
  await expect(dirCard(page, 'es2fi')).toHaveAttribute('aria-checked', 'true');
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await expect(view(page).locator('.es-choose-hint')).toHaveText('Toinen suunta alkaa uudella kierroksella.');
  await expect(view(page).locator('.es-choose')).toBeVisible(); // nothing was started
  await press(dirCard(page, 'fi2es'), testInfo);
  await expect(button(page, 'Takaisin kysymykseen')).toBeVisible();
  await press(button(page, 'Takaisin kysymykseen'), testInfo);
  await settle(page);
  expect((await current(page)).pair).toBe(q.pair);
  expect((await speakCalls(page)).length).toBe(before); // coming back reads nothing
});

test('return: a round with three answers shows Kesken 3/10; coming back by the card or by Vaihda shows the same question, options and feedback, and reads nothing', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  for (let i = 0; i < 2; i++) {
    await answerWrong(page, testInfo);
    await next(page, testInfo);
  }
  const q = await answerWrong(page, testInfo);
  const options = await optionTexts(page);
  const feedback = await view(page).locator('.es-fb').innerText();
  await home(page, testInfo);
  await expect(badge(page)).toHaveText(/Kesken 3\/10/);
  const before = await settledCount(page, 400);
  await press(card(page), testInfo);
  await expect(view(page).locator('.es-play')).toBeVisible();
  expect((await current(page)).pair).toBe(q.pair);
  expect(await optionTexts(page)).toEqual(options);
  expect(await view(page).locator('.es-fb').innerText()).toBe(feedback);
  await expect(view(page).locator('.es-next')).toBeVisible();
  await settle(page);
  expect((await speakCalls(page)).length).toBe(before);
  // through Vaihda and Takaisin kysymykseen
  await change(page, testInfo);
  await settle(page);
  await press(button(page, 'Takaisin kysymykseen'), testInfo);
  expect(await optionTexts(page)).toEqual(options);
  expect(await view(page).locator('.es-fb').innerText()).toBe(feedback);
  expect((await speakCalls(page)).length).toBe(before);
});

test('resume, nothing done yet: no badge; the card tap reads the word in Espanja → Suomi and nothing in Suomi → Espanja', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  const q = await current(page);
  const before = await settledCount(page, 400);
  await home(page, testInfo);
  await expect(badge(page)).toBeHidden();
  await press(card(page), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(before + 1);
  const calls = await speakCalls(page);
  expect(calls[before].text).toBe(spoken(q.pair.es));
  expect(calls[before].inDispatch).toBe(true);

  // fi2es: a new round from the choose screen, then away and back
  await change(page, testInfo);
  await settle(page);
  await press(dirCard(page, 'fi2es'), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  const again = await settledCount(page, 400);
  await home(page, testInfo);
  await press(card(page), testInfo);
  await settle(page);
  expect(await settledCount(page, 400)).toBe(again);
});

test('resume, end screen: no badge, the same end screen without confetti or speech, and no second star', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  const before = await settledCount(page, 600);
  await home(page, testInfo);
  await expect(badge(page)).toBeHidden();
  await press(card(page), testInfo);
  await expect(view(page).locator('.es-end')).toBeVisible();
  await expect(view(page).locator('.es-q-end')).toHaveText('Täydellinen tulos!');
  expect(await confetti(page)).toBe(0);
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  await settle(page);
  expect((await speakCalls(page)).length).toBe(before);
  expect(await page.evaluate(() => window.localStorage.getItem('espanja.stars'))).toBe('1');
});

test('resume: leaving during the confetti removes it', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  expect(await confetti(page)).toBe(100);
  await home(page, testInfo);
  await press(card(page), testInfo);
  expect(await confetti(page)).toBe(0);
});

test('end screen: Vaihda suuntaa gives the choose screen with Aloita, and the star count does not change', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await playRound(page, testInfo, 'rrrrrrrrrr');
  await press(button(page, 'Vaihda suuntaa'), testInfo);
  await settle(page);
  await expect(view(page).locator('.es-choose')).toBeVisible();
  await expect(button(page, 'Aloita')).toBeVisible();
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
  await press(dirCard(page, 'es2fi'), testInfo);
  await press(button(page, 'Aloita'), testInfo);
  await settle(page);
  expect((await current(page)).direction).toBe('es2fi');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
});

test('end screen: the direction line names the direction', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi' });
  await playRound(page, testInfo, 'wwwwwwwwww');
  await expect(view(page).locator('.es-dir-end')).toHaveText('Espanja → Suomi');
  await expect(view(page).locator('.es-rows > div')).toHaveText(['0 oikein', '10 väärin']);
});

// ---------- the tap guard (design 3.9) ----------

test('tap guard: an option tapped at once after Aloita is not answered, and Kuuntele still speaks', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="espanja"]');
    v.querySelector('.es-start').click();
    v.querySelector('.es-option').click();
    v.querySelector('.listen').click();
  });
  await expect(view(page).locator('.es-play')).toBeVisible();
  await expect(view(page).locator('.es-fb')).toBeEmpty();
  await expect(score(page)).toHaveText('Pisteet: 0 / 0');
  await expect.poll(async () => (await speakCalls(page)).length).toBe(4); // Kuuntele reads the four options
  await settle(page);
  await press(view(page).locator('.es-option').first(), testInfo); // and after the guard the option answers
  await expect(score(page)).toHaveText(/^Pisteet: [01] \/ 1$/);
});

// Each call clicks two buttons in one evaluate, so the second one lands on the new screen inside the 500 ms
// guard; without the guard on that button the second click would act.
const clickBoth = (page, first, second) => page.evaluate(([a, b]) => {
  const v = document.querySelector('.game-view[data-game="espanja"]');
  v.querySelector(a).click();
  v.querySelector(b).click();
}, [first, second]);

test('tap guard: Vaihda then Aloita uusi kierros at once does not restart the round', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await answerWrong(page, testInfo);
  await next(page, testInfo);
  await clickBoth(page, '.es-change', '.es-restart');
  await expect(view(page).locator('.es-choose')).toBeVisible();
  await expect(view(page).locator('.es-play')).toBeHidden();
  await settle(page);
  await press(button(page, 'Takaisin kysymykseen'), testInfo);
  expect(await label(page)).toMatch(/^Kysymys 2 \/ 10/);
  await expect(score(page)).toHaveText('Pisteet: 0 / 1');
});

test('tap guard: Katso tulos then Pelaa uudelleen at once stays on the end screen', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  for (let i = 0; i < 9; i++) {
    await answerWrong(page, testInfo);
    await next(page, testInfo);
  }
  await answerWrong(page, testInfo);
  await clickBoth(page, '.es-next', '.es-again');
  await expect(view(page).locator('.es-end')).toBeVisible();
  await settle(page);
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10/);
});

test('tap guard: a card tap on the choose screen at once after opening is ignored, then works', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await clickBoth(page, '.es-change', '.es-dir[data-dir="es2fi"]');
  await expect(dirCard(page, 'fi2es')).toHaveAttribute('aria-checked', 'true');
  await settle(page);
  await press(dirCard(page, 'es2fi'), testInfo);
  await expect(dirCard(page, 'es2fi')).toHaveAttribute('aria-checked', 'true');
});

// ---------- Espanja's own rules about the wait (SEI-48), the parts that are not about timing ----------

test('SEI-48: the wait is only on a right answer; answers and skips on question 10 leave Katso tulos full', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  const counting = () => view(page).locator('.es-next').evaluate((e) => e.classList.contains('aa-counting'));
  await answerWrong(page, testInfo);
  expect(await counting()).toBe(false);
  await next(page, testInfo);
  await skip(page, testInfo);
  expect(await counting()).toBe(false);
  await next(page, testInfo);
  await answerRight(page, testInfo);
  expect(await counting()).toBe(true);
  await next(page, testInfo);
  expect(await counting()).toBe(false);
});

test('SEI-48 / 11: the badge and the score do not change when the question changes (only an answer or a skip changes them)', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await answerRight(page, testInfo);
  await expect(score(page)).toHaveText('Pisteet: 1 / 1');
  await expect.poll(() => label(page), { timeout: 6000 }).toMatch(/^Kysymys 2 \/ 10/); // the timer moved on
  await expect(score(page)).toHaveText('Pisteet: 1 / 1');
  await home(page, testInfo);
  await expect(badge(page)).toHaveText(/Kesken 1\/10/);
});
