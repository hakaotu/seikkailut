// SEI-57 (criteria 1-5, 8, 9; plan docs/plans/sei-57.md 6.2): the topic picker on Espanja's choose screen.
// Every test reads the question from the label, so no test depends on which words a seed gives.
// A right answer on every question but the last starts a 4 s wait (SEI-48); playRound moves on with Seuraava at once.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle } from './helpers.mjs';
import {
  openEspanja, startRound, current, answerRight, answerWrong, skip, next, playRound, optionTexts, view, button,
} from './espanja-helpers.mjs';
import { WORDS } from '../../app/src/games/espanja-logic.js';

let seed = 570;

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await seedRandom(page, (seed += 1));
});

const card = (page) => page.locator('button.game-card[data-game="espanja"]');
const badge = (page) => card(page).locator('.badge');
const home = (page, testInfo) => press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
const label = (page) => view(page).locator('.es-word').getAttribute('aria-label');
const stars = (page) => view(page).locator('.status-slot');
const change = (page, testInfo) => press(view(page).locator('.es-change'), testInfo);
const tile = (page, id) => view(page).locator(`.es-topic[data-topic="${id}"]`);
const dirCard = (page, dir) => view(page).locator(`.es-dir[data-dir="${dir}"]`);
const radio = (page, name) => view(page).getByRole('radio', { name, exact: true });
const hint = (page) => view(page).locator('.es-choose-hint');
const confetti = (page) => view(page).locator('.es-piece').count();
const topicWords = (topic, key) => WORDS.filter((w) => w.topic === topic).map((w) => w[key]);

const NAMES = ['Kaikki aiheet', 'Tervehdykset', 'Värit', 'Numerot', 'Eläimet', 'Ruoka', 'Viikonpäivät', 'Perhe'];

test('SEI-57 / 5: eight topic radios in order, only Kaikki aiheet checked, pictures hidden, all before the directions', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  const group = view(page).getByRole('radiogroup', { name: 'Aihe' });
  const radios = group.getByRole('radio');
  await expect(radios).toHaveCount(8);
  for (const [i, name] of NAMES.entries()) {
    await expect(radios.nth(i)).toHaveAccessibleName(name);
    await expect(radios.nth(i)).toHaveAttribute('aria-checked', i === 0 ? 'true' : 'false');
  }
  for (const emoji of await view(page).locator('.es-topic-emoji').all()) await expect(emoji).toHaveAttribute('aria-hidden', 'true');
  const order = await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="espanja"]');
    const firstDir = v.querySelector('.es-dir');
    return [...v.querySelectorAll('.es-topic')].every((t) => t.compareDocumentPosition(firstDir) & Node.DOCUMENT_POSITION_FOLLOWING);
  });
  expect(order).toBe(true);
});

test('SEI-57 / 1, 2: one press on Aloita gives today\'s round of 10 from all topics; 8 of 10 still gives a star', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await settle(page);
  await press(button(page, 'Aloita'), testInfo);
  await expect(view(page).locator('.es-play')).toBeVisible();
  await settle(page);
  expect(await label(page)).toMatch(/^Kysymys 1 \/ 10: /);
  await playRound(page, testInfo, 'rrrrrrrrww');
  await expect(view(page).locator('.es-q-end')).toHaveText('Hienoa!');
  await expect(view(page).locator('.es-result-score')).toContainText('8 / 10 oikein');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
});

test('SEI-57 / 3: Viikonpäivät asks the seven weekdays once each, with weekdays as options; Eläimet es2fi asks 10 animals', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es', topic: 'viikonpäivä' });
  const asked = [];
  for (let i = 1; i <= 7; i++) {
    const q = await current(page);
    expect(q.total).toBe(7);
    expect(q.n).toBe(i);
    asked.push(q.pair.fi);
    for (const t of await optionTexts(page)) expect(topicWords('viikonpäivä', 'es'), `option ${t}`).toContain(t);
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  expect(new Set(asked).size).toBe(7);
  expect([...asked].sort()).toEqual(topicWords('viikonpäivä', 'fi').sort());

  await settle(page);
  await press(button(page, 'Vaihda valintoja'), testInfo);
  await settle(page);
  await press(tile(page, 'eläin'), testInfo);
  await press(dirCard(page, 'es2fi'), testInfo);
  await press(button(page, 'Aloita'), testInfo);
  await settle(page);
  for (let i = 1; i <= 10; i++) {
    const q = await current(page);
    expect(q.total).toBe(10);
    expect(topicWords('eläin', 'es'), `prompt ${q.pair.es}`).toContain(q.pair.es);
    for (const t of await optionTexts(page)) expect(topicWords('eläin', 'fi'), `option ${t}`).toContain(t);
    await skip(page, testInfo);
    await next(page, testInfo);
  }
});

test('SEI-57 / 4: a 7-question round has 7 bar blocks, Kesken 3/7, no wait on question 7, and 6 of 7 gives a star', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { topic: 'viikonpäivä' });
  await expect(view(page).locator('.es-bar i:visible')).toHaveCount(7);
  await expect(view(page).locator('.es-bar')).toHaveAttribute('aria-label', '0 kysymystä 7:stä tehty');
  for (let i = 0; i < 3; i++) {
    await answerWrong(page, testInfo);
    await next(page, testInfo);
  }
  await home(page, testInfo);
  await expect(badge(page)).toHaveText(/Kesken 3\/7/);
  await press(card(page), testInfo);
  await settle(page);
  for (let i = 0; i < 3; i++) {
    await expect(view(page).locator('.es-next-label')).toHaveText('Seuraava');
    await answerRight(page, testInfo);
    await next(page, testInfo);
  }
  // question 7: the button reads Katso tulos, and a right answer does not start the wait
  expect((await current(page)).n).toBe(7);
  await expect(view(page).locator('.es-next-label')).toHaveText('Katso tulos');
  await answerRight(page, testInfo);
  expect(await view(page).locator('.es-next').evaluate((e) => e.classList.contains('aa-counting'))).toBe(false);
  await next(page, testInfo);
  // 3 wrong + 4 right: below the threshold of 6, so no star
  await expect(view(page).locator('.es-result-score')).toContainText('4 / 7 oikein');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
});

test('SEI-57 / 4: Viikonpäivät rrrrrrw gives Hienoa!, 6 / 7, a star and 40 confetti pieces', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { topic: 'viikonpäivä' });
  await playRound(page, testInfo, 'rrrrrrw');
  await expect(view(page).locator('.es-q-end')).toHaveText('Hienoa!');
  await expect(view(page).locator('.es-result-score')).toContainText('6 / 7 oikein');
  await expect(view(page).locator('.es-reward')).toHaveText('Sait tähden!');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');
  expect(await confetti(page)).toBe(40);
});

test('SEI-57 / 4: Viikonpäivät rrrrrww gives no star and says 6 is needed', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { topic: 'viikonpäivä' });
  await playRound(page, testInfo, 'rrrrrww');
  await expect(view(page).locator('.es-q-end')).toHaveText('Kierros valmis!');
  await expect(view(page).locator('.es-result-score')).toContainText('5 / 7 oikein');
  await expect(view(page).locator('.es-reward')).toHaveText('Tähti tulee, kun saat 6 oikein.');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 0');
  await expect(view(page).locator('.es-live')).toHaveText('Kierros valmis! 5 / 7 oikein. Tähti tulee, kun saat 6 oikein.');
});

test('SEI-57 / 4: Tervehdykset is 8 questions; 7 right gives a star, 6 right does not', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { topic: 'tervehdys' });
  await playRound(page, testInfo, 'rrrrrrrw');
  await expect(view(page).locator('.es-result-score')).toContainText('7 / 8 oikein');
  await expect(stars(page)).toHaveAttribute('aria-label', 'Tähtiä: 1');

  await openEspanja(page, testInfo); // a fresh load of the page: the topic is Kaikki aiheet again
  await startRound(page, testInfo, { topic: 'tervehdys' });
  await playRound(page, testInfo, 'rrrrrrww');
  await expect(view(page).locator('.es-result-score')).toContainText('6 / 8 oikein');
  await expect(view(page).locator('.es-reward')).toHaveText('Tähti tulee, kun saat 7 oikein.');
});

test('SEI-57 / 8: Pelaa uudelleen keeps topic and direction; Vaihda valintoja shows them selected, with only Aloita', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'es2fi', topic: 'viikonpäivä' });
  await playRound(page, testInfo, 'wwwwwww');
  await expect(view(page).locator('.es-dir-end')).toHaveText('Viikonpäivät · Espanja → Suomi');
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  const q = await current(page);
  expect(q.total).toBe(7);
  expect(q.n).toBe(1);
  expect(topicWords('viikonpäivä', 'es')).toContain(q.pair.es); // es2fi: the Spanish word is asked
  await playRound(page, testInfo, 'wwwwwww');
  await press(button(page, 'Vaihda valintoja'), testInfo);
  await settle(page);
  await expect(radio(page, 'Viikonpäivät')).toHaveAttribute('aria-checked', 'true');
  await expect(radio(page, 'Kaikki aiheet')).toHaveAttribute('aria-checked', 'false');
  await expect(dirCard(page, 'es2fi')).toHaveAttribute('aria-checked', 'true');
  await expect(button(page, 'Aloita')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeHidden();
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
});

test('SEI-57 / design 3.1: mid-round, a tile or card changes only the draft; Takaisin kysymykseen and the hint follow', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es', topic: 'perhe' });
  await answerWrong(page, testInfo);
  await next(page, testInfo);
  const before = await label(page);
  await change(page, testInfo);
  await settle(page);
  await expect(button(page, 'Takaisin kysymykseen')).toBeVisible();
  await expect(hint(page)).toHaveText('');
  const spoken = (await speakCalls(page)).length;

  await press(tile(page, 'väri'), testInfo);
  await expect(button(page, 'Takaisin kysymykseen')).toBeHidden();
  await expect(hint(page)).toHaveText('Toinen aihe alkaa uudella kierroksella.');
  await expect(view(page).locator('.es-choose')).toBeVisible();
  await press(dirCard(page, 'es2fi'), testInfo);
  await expect(hint(page)).toHaveText('Toinen aihe ja suunta alkavat uudella kierroksella.');
  await press(tile(page, 'perhe'), testInfo);
  await expect(hint(page)).toHaveText('Toinen suunta alkaa uudella kierroksella.');
  await press(dirCard(page, 'fi2es'), testInfo);
  await expect(hint(page)).toHaveText('');
  await expect(button(page, 'Takaisin kysymykseen')).toBeVisible();
  expect((await speakCalls(page)).length, 'a tile or a card speaks nothing').toBe(spoken);

  await press(button(page, 'Takaisin kysymykseen'), testInfo);
  await settle(page);
  expect(await label(page)).toBe(before);

  await change(page, testInfo);
  await settle(page);
  await press(tile(page, 'väri'), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await settle(page);
  const q = await current(page);
  expect(q.n).toBe(1);
  expect(q.total).toBe(10);
  expect(topicWords('väri', 'fi')).toContain(q.pair.fi);
});

test('SEI-57 / design 3.1: a tile tapped at once after Vaihda is ignored, then works', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await startRound(page, testInfo, { direction: 'fi2es' });
  await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="espanja"]');
    v.querySelector('.es-change').click();
    v.querySelector('.es-topic[data-topic="perhe"]').click();
  });
  await expect(radio(page, 'Kaikki aiheet')).toHaveAttribute('aria-checked', 'true');
  await settle(page);
  await press(tile(page, 'perhe'), testInfo);
  await expect(radio(page, 'Perhe')).toHaveAttribute('aria-checked', 'true');
});

test('SEI-57 / design 3.1: the topic is kept while the page lives (also through Etusivu), gone after a reload, and not stored', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await press(tile(page, 'ruoka'), testInfo);
  await startRound(page, testInfo, { topic: 'ruoka' });
  await home(page, testInfo);
  await press(card(page), testInfo);
  await settle(page);
  await change(page, testInfo);
  await settle(page);
  await expect(radio(page, 'Ruoka')).toHaveAttribute('aria-checked', 'true');
  expect((await page.evaluate(() => Object.keys(window.localStorage))).filter((k) => k !== 'espanja.stars')).toEqual([]);
  await openEspanja(page, testInfo); // a new load of the page
  await expect(radio(page, 'Kaikki aiheet')).toHaveAttribute('aria-checked', 'true');
  expect((await page.evaluate(() => Object.keys(window.localStorage))).filter((k) => k !== 'espanja.stars')).toEqual([]);
});

test('SEI-57 / 9, design 8: each tile is described by the topic line; the labels name topic and direction; a tile speaks nothing', async ({ page }, testInfo) => {
  await openEspanja(page, testInfo);
  await settle(page);
  await expect(radio(page, 'Kaikki aiheet')).toHaveAccessibleDescription('Kaikki aiheet: 79 sanaa');
  await expect(view(page).getByRole('radiogroup', { name: 'Aihe' })).toHaveAccessibleDescription('');
  await press(tile(page, 'viikonpäivä'), testInfo);
  await expect(radio(page, 'Viikonpäivät')).toHaveAccessibleDescription('Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä');
  await expect(radio(page, 'Perhe')).toHaveAccessibleDescription('Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä');
  expect(await speakCalls(page)).toHaveLength(0);
  await press(button(page, 'Aloita'), testInfo);
  await settle(page);
  await expect(button(page, 'Vaihda aihetta tai suuntaa. Nyt viikonpäivät, Suomi → Espanja.')).toBeVisible();
  await playRound(page, testInfo, 'rrrrrrr');
  await expect(view(page).locator('.es-dir-end')).toHaveAttribute('aria-label', 'Aihe viikonpäivät. Suunta Suomi → Espanja.');
  await expect(view(page).locator('.es-dir-end')).toHaveText('Viikonpäivät · Suomi → Espanja');
  await expect(view(page).locator('.es-live')).toHaveText('Täydellinen tulos! 7 / 7 oikein. Sait tähden! Tähtiä nyt 1.');
});
