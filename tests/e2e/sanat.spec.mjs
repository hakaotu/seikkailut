// Sanat (SEI-3, SEI-7, SEI-8), design docs/design/sei-3.md, plan docs/plans/sei-3.md 9.4.
// Every screen change is followed by settle(): the game ignores its own buttons for 500 ms.
import { test, expect } from '@playwright/test';
import { installFakeSpeech, seedRandom, press, speakCalls, settle, recordAudio, audioCalls } from './helpers.mjs';
import { WORDS, HP_WORDS, PRAISE, ALPHABET, syllabify } from '../../app/src/games/sanat-logic.js';
import {
  view, button, openSanat, startRound, currentWord, slotLetters, spell, spellRight, spellWrong, spellRetry,
  skip, next, playRound, wrongSpelling, isAlphabet,
} from './sanat-helpers.mjs';

let seed = 700;
test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await recordAudio(page);
  await seedRandom(page, (seed += 1));
});

const listen = (page) => view(page).locator('.listen');
const feedback = (page) => view(page).locator('.sn-fb');
const entryOf = (word) => [...WORDS, ...HP_WORDS].find((e) => e.word === word);

// Goes through the ten words of a round quickly (skip, Seuraava) and returns the words in order.
async function wordsOfRound(page, testInfo) {
  const words = [];
  for (let i = 0; i < 10; i++) {
    words.push(await currentWord(page));
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  return words;
}

// ---- SEI-3 / 1, 2: the word lists ----

test('SEI-3 / 1: a Normaali round has ten different words from the list, each with its own emoji and hint', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { theme: 'Normaali', level: 'Helppo' });
  const words = [];
  for (let i = 0; i < 10; i++) {
    const word = await currentWord(page);
    const entry = WORDS.find((e) => e.word === word);
    expect(entry, `${word} is in WORDS`).toBeTruthy();
    await expect(view(page).locator('.sn-emoji')).toHaveText(entry.emoji);
    await expect(view(page).locator('.sn-q-text')).toHaveText(entry.hint);
    words.push(word);
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  expect(new Set(words).size).toBe(10);
});

test('SEI-3 / 2: a Harry Potter round has ten different words, all from the Harry Potter list', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { theme: 'Harry Potter', level: 'Helppo' });
  const words = await wordsOfRound(page, testInfo);
  expect(new Set(words).size).toBe(10);
  for (const w of words) expect(HP_WORDS.map((e) => e.word), w).toContain(w);
});

// ---- SEI-3 / 3, 4, 5: the three levels ----

test('SEI-3 / 3: Helppo shows the picture button and the hint; the tiles are the word\'s letters, not in order; the picture reads the word', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await currentWord(page);
  const image = button(page, 'Kuva. Kuuntele sana.');
  await expect(image).toBeVisible();
  await expect(view(page).locator('.sn-q-text')).toHaveText(entryOf(word).hint);
  const tiles = await view(page).locator('.sn-tile').allTextContents();
  expect([...tiles].sort()).toEqual([...word].sort());
  expect(tiles.join('')).not.toBe(word);
  await expect(view(page).locator('.sn-mystery')).toBeHidden();
  const before = (await speakCalls(page)).length;
  await press(image, testInfo);
  const calls = await speakCalls(page);
  expect(calls[before].text).toBe(word.toLowerCase());
  expect(calls[before].rate).toBe(0.78);
  expect(calls[before].inDispatch).toBe(true);
});

test('SEI-3 / 4: Keskitaso hides the picture behind a ? that is not a button; a right word reveals the picture and the hint', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const word = await currentWord(page);
  await expect(view(page).locator('.sn-mystery')).toBeVisible();
  await expect(view(page).locator('.sn-mystery')).toHaveText('?');
  await expect(button(page, 'Kuva. Kuuntele sana.')).toBeHidden();
  await expect(view(page).locator('.sn-q-text')).toHaveText('Kuuntele sana ja rakenna se kirjaimista!');
  await expect(view(page).locator('.sn-tile')).toHaveCount(word.length);
  await spellRight(page, testInfo);
  await expect(button(page, 'Kuva. Kuuntele sana.')).toBeVisible();
  await expect(view(page).locator('.sn-emoji')).toHaveText(entryOf(word).emoji);
  await expect(view(page).locator('.sn-q-text')).toHaveText(entryOf(word).hint);
  await expect(view(page).locator('.sn-mystery')).toBeHidden();
});

test('SEI-3 / 5: Vaikea has no tiles, 29 letter keys A-Z, Å, Ä, Ö and Poista in that order; the same letter can be used twice', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Vaikea' });
  await expect(view(page).locator('.sn-tile')).toHaveCount(0);
  const names = await view(page).locator('.sn-letters button').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || e.textContent));
  expect(names).toEqual([...ALPHABET, 'Poista viimeisin kirjain']);
  expect(ALPHABET.length).toBe(29);
  await expect(view(page).locator('.sn-mystery')).toBeVisible();
  await expect(view(page).locator('.sn-q-text')).toHaveText('Kuuntele sana ja kirjoita se itse!');
  await spell(page, testInfo, 'XX');
  expect((await slotLetters(page)).slice(0, 2)).toEqual(['X', 'X']);
});

// ---- SEI-3 / 7, 8: tavutus and the readings ----

test('SEI-3 / 7: with tavutus on, hyphens (aria-hidden) sit between the syllables; Kuuntele reads the word, then the syllables at 0.62', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo', tavutus: true });
  const word = await currentWord(page);
  const syllables = syllabify(word);
  await expect(view(page).locator('.sn-dash')).toHaveCount(syllables.length - 1);
  for (const dash of await view(page).locator('.sn-dash').all()) await expect(dash).toHaveAttribute('aria-hidden', 'true');
  expect(await view(page).locator('.sn-syl').count()).toBe(syllables.length);
  // the boxes of each group are as many as the syllable has letters
  const sizes = await view(page).locator('.sn-syl').evaluateAll((groups) => groups.map((g) => g.querySelectorAll('.sn-slot').length));
  expect(sizes).toEqual(syllables.map((s) => s.length));
  const before = (await speakCalls(page)).length;
  await press(listen(page), testInfo);
  await expect.poll(async () => (await speakCalls(page)).length, { timeout: 8000 }).toBe(before + 1 + syllables.length);
  const calls = (await speakCalls(page)).slice(before);
  expect(calls.map((c) => c.text)).toEqual([word.toLowerCase(), ...syllables.map((s) => s.toLowerCase())]);
  expect(calls.map((c) => c.rate)).toEqual([0.78, ...syllables.map(() => 0.62)]);
  expect(calls[0].inDispatch).toBe(true);
});

test('SEI-3 / 8: a new word is read twice, the second slower after a pause; each letter is read at 0.9', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await expect.poll(async () => (await speakCalls(page)).length).toBe(2);
  const [first, second] = await speakCalls(page);
  expect(first.text).toBe(second.text);
  expect([first.rate, second.rate]).toEqual([0.78, 0.52]);
  expect(second.at - first.endedAt).toBeGreaterThanOrEqual(650);
  const word = await currentWord(page);
  await spell(page, testInfo, word.slice(0, 2));
  const calls = (await speakCalls(page)).slice(2);
  expect(calls.map((c) => [c.text, c.rate])).toEqual([[word[0].toLowerCase(), 0.9], [word[1].toLowerCase(), 0.9]]);
});

// ---- SEI-3 / 9, 10 and SEI-7 / 1: right and wrong ----

test('SEI-3 / 9: a right word turns the boxes green, shows a praise and plays the victory clip for 3 s, started in the tap', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await spellRight(page, testInfo);
  expect(await view(page).locator('.sn-slot.is-right').count()).toBe(word.length);
  expect(await slotLetters(page)).toEqual([...word]);
  expect(PRAISE).toContain(await view(page).locator('.sn-fb-praise').textContent());
  await expect(button(page, 'Seuraava sana')).toBeVisible();
  const audio = await audioCalls(page);
  expect(audio.map((a) => a.kind)).toEqual(['play']);
  expect(audio[0].src).toMatch(/\/assets\/vauhti\.mp3$/);
  expect(audio[0].inDispatch).toBe(true);
  await expect.poll(async () => (await audioCalls(page)).length, { timeout: 5000 }).toBe(2);
  const [play, pause] = await audioCalls(page);
  expect(pause.kind).toBe('pause');
  expect(pause.at - play.at).toBeGreaterThanOrEqual(2900);
  expect(pause.at - play.at).toBeLessThanOrEqual(3400);
});

test('SEI-3 / 10, SEI-7 / 1: a wrong word keeps its letters; tapping the wrong box empties only that one; the right letter makes the word right again', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Vaikea' });
  const word = await currentWord(page);
  const wrong = wrongSpelling(word, true);
  const at = [...word].findIndex((l, i) => l !== wrong[i]);
  const before = (await speakCalls(page)).length;
  await spell(page, testInfo, wrong);
  await expect(feedback(page)).toContainText('Ei ihan.');
  await expect(feedback(page)).toContainText('Napauta kirjainta, jonka haluat vaihtaa.');
  expect(await slotLetters(page)).toEqual([...wrong]);
  // the last letter, Ei ihan. and the word slowly: the two later parts come from the pause timers
  await expect.poll(async () => (await speakCalls(page)).length, { timeout: 5000 }).toBe(before + wrong.length + 2);
  const calls = (await speakCalls(page)).slice(before + wrong.length - 1);
  expect(calls.map((c) => [c.text, c.rate])).toEqual([
    [wrong[wrong.length - 1].toLowerCase(), 0.9],
    ['Ei ihan.', 0.85],
    [word.toLowerCase(), 0.52],
  ]);
  expect(calls[0].inDispatch).toBe(true);
  await press(button(page, `Kirjain ${at + 1}: ${wrong[at]}. Poista.`), testInfo);
  expect(await slotLetters(page)).toEqual([...wrong].map((l, i) => (i === at ? '' : l)));
  await expect(feedback(page)).toContainText('Ei ihan.'); // the message stays until the next check
  await spell(page, testInfo, word[at]);
  await expect(feedback(page)).toHaveAttribute('data-kind', 'right');
  await next(page, testInfo);
  await playRound(page, testInfo, 'FFFFFFFFF');
  await expect(view(page).locator('.sn-rows')).toContainText('1 sana oikein uudella yrityksellä');
});

test('SEI-3 / 10: Aloita alusta empties every box, gives the tiles back and removes the message', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await spellWrong(page, testInfo);
  await expect(view(page).locator('.sn-tile:not(.is-used)')).toHaveCount(0);
  await press(button(page, 'Aloita sana alusta'), testInfo);
  expect((await slotLetters(page)).every((l) => l === '')).toBe(true);
  await expect(view(page).locator('.sn-tile:disabled')).toHaveCount(0);
  await expect(feedback(page)).toBeEmpty();
});

// ---- SEI-7 / 2, 3: Poista and Ohita ----

for (const level of ['Helppo', 'Keskitaso', 'Vaikea']) {
  test(`SEI-7 / 2: ${level}: Poista takes out the last letter; on tiles the same tile is enabled again`, async ({ page }, testInfo) => {
    await openSanat(page, testInfo);
    await startRound(page, testInfo, { level });
    const word = await currentWord(page);
    const n = Math.min(3, word.length - 1); // a three-letter word would be finished by three letters
    await spell(page, testInfo, word.slice(0, n));
    const tiles = view(page).locator('.sn-tile');
    const enabledBefore = level === 'Vaikea' ? [] : await tiles.evaluateAll((els) => els.map((e) => !e.disabled));
    await press(button(page, 'Poista viimeisin kirjain'), testInfo);
    expect(await slotLetters(page)).toEqual([...word].map((l, i) => (i < n - 1 ? l : '')));
    if (level !== 'Vaikea') {
      const enabledAfter = await tiles.evaluateAll((els) => els.map((e) => !e.disabled));
      // exactly one tile came back; it is one that was used and carries the third letter
      const back = enabledAfter.map((on, i) => (on && !enabledBefore[i] ? i : -1)).filter((i) => i >= 0);
      expect(back.length).toBe(1);
      expect(await tiles.nth(back[0]).textContent()).toBe(word[n - 1]);
    }
    await press(button(page, 'Poista viimeisin kirjain'), testInfo);
    await press(button(page, 'Poista viimeisin kirjain'), testInfo);
    await press(button(page, 'Poista viimeisin kirjain'), testInfo); // nothing left: no error
    expect((await slotLetters(page)).every((l) => l === '')).toBe(true);
  });
}

test('SEI-7 / 3: Ohita shows the word in grey, says it, counts it, and waits for Seuraava; no victory clip', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Keskitaso' });
  const before = (await speakCalls(page)).length;
  const word = await skip(page, testInfo);
  expect(await view(page).locator('.sn-slot.is-shown').count()).toBe(word.length);
  expect(await slotLetters(page)).toEqual([...word]);
  await expect(feedback(page)).toContainText('Ohitettu.');
  await expect(feedback(page)).toContainText(`Sana on ${word}.`);
  const calls = (await speakCalls(page)).slice(before);
  expect(calls.map((c) => [c.text, c.rate])).toEqual([[`Sana on ${word.toLowerCase()}.`, 0.8]]);
  expect(calls[0].inDispatch).toBe(true);
  expect(await audioCalls(page)).toEqual([]);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 1');
  expect(await view(page).locator('.sn-bar i.is-full').count()).toBe(1);
  // Keskitaso shows the picture and the hint of a skipped word
  await expect(button(page, 'Kuva. Kuuntele sana.')).toBeVisible();
  // the same word stays until Seuraava (Q27)
  await page.waitForTimeout(300);
  expect(await slotLetters(page)).toEqual([...word]);
  await next(page, testInfo);
  await expect(view(page).locator('.sn-slot.is-empty')).not.toHaveCount(0);
});

// ---- SEI-8: the result ----

test('SEI-8 / 1: nine right first time and one after two wrong tries is 9 / 10, not 10 / 10', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await spellWrong(page, testInfo);
  await press(button(page, 'Aloita sana alusta'), testInfo);
  await spellWrong(page, testInfo);
  await press(button(page, 'Aloita sana alusta'), testInfo);
  await spellRight(page, testInfo);
  await next(page, testInfo);
  await playRound(page, testInfo, 'FFFFFFFFF');
  await expect(view(page).locator('.sn-result-score')).toHaveText('9 / 10');
  await expect(view(page).locator('.sn-rows')).toContainText('9 sanaa heti oikein');
  await expect(view(page).locator('.sn-rows')).toContainText('1 sana oikein uudella yrityksellä');
  await expect(view(page).locator('.sn-rows')).not.toContainText('ohitettu');
  await expect(view(page).locator('.sn-q-end')).toHaveText('Hienoa!');
  await expect(view(page).locator('.sn-result')).toHaveAttribute('data-tier', 'good');
});

test('SEI-8 / 2: skipped words have a row of their own', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 'FFFFFFFSSS');
  await expect(view(page).locator('.sn-result-score')).toHaveText('7 / 10');
  await expect(view(page).locator('.sn-rows')).toContainText('7 sanaa heti oikein');
  await expect(view(page).locator('.sn-rows')).toContainText('3 sanaa ohitettu');
});

test('SEI-8 / 3: all right first time is a perfect 10 / 10 with its own look and a lot of confetti', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 'FFFFFFFFFF');
  await expect(view(page).locator('.sn-result-score')).toHaveText('10 / 10');
  await expect(view(page).locator('.sn-q-end')).toHaveText('Täydellinen tulos!');
  await expect(view(page).locator('.sn-result')).toHaveAttribute('data-tier', 'perfect');
  await expect(view(page).locator('.sn-result-line')).toHaveText('Olet tosi hyvä lukija!');
  await expect(view(page).locator('.sn-confetti .sn-piece')).toHaveCount(100);
  expect(await view(page).locator('.sn-end-stars svg.is-on').count()).toBe(5);
  const gold = await view(page).locator('.sn-result').evaluate((e) => getComputedStyle(e).backgroundColor);
  // and the 9 / 10 result differs
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await settle(page);
  await playRound(page, testInfo, 'RFFFFFFFFF');
  await expect(view(page).locator('.sn-q-end')).toHaveText('Hienoa!');
  expect(await view(page).locator('.sn-result').evaluate((e) => getComputedStyle(e).backgroundColor)).not.toBe(gold);
  await expect(view(page).locator('.sn-confetti .sn-piece')).toHaveCount(40);
});

test('SEI-8 / 3: no confetti under reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 'FFFFFFFFFF');
  await expect(view(page).locator('.sn-q-end')).toHaveText('Täydellinen tulos!');
  await expect(view(page).locator('.sn-confetti')).toHaveCount(0);
});

test('SEI-3 / 11: Pisteet and the bar follow each finished word, stars follow the result, Katso tulos comes on word 10, Pelaa uudelleen reads word 1', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 0');
  await expect(page.locator('.game-view[data-game="sanat"] .status-slot')).toHaveAttribute('aria-label', 'Tähdet: 0 / 5');
  await spellRight(page, testInfo);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 1 / 1');
  await expect(page.locator('.game-view[data-game="sanat"] .status-slot')).toHaveAttribute('aria-label', 'Tähdet: 5 / 5');
  expect(await view(page).locator('.sn-bar i.is-full').count()).toBe(1);
  await next(page, testInfo);
  expect(await view(page).locator('.sn-bar i.is-full').count()).toBe(1); // the bar fills on finishing, not on Seuraava
  await skip(page, testInfo);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 1 / 2');
  await expect(page.locator('.game-view[data-game="sanat"] .status-slot')).toHaveAttribute('aria-label', 'Tähdet: 3 / 5');
  expect(await view(page).locator('.sn-bar i.is-full').count()).toBe(2);
  await next(page, testInfo);
  await playRound(page, testInfo, 'FFFFFFF');
  await spellRight(page, testInfo);
  await expect(button(page, 'Katso tulos')).toBeVisible();
  await next(page, testInfo);
  await expect(view(page).locator('.sn-end')).toBeVisible();
  const before = (await speakCalls(page)).length;
  await press(button(page, 'Pelaa uudelleen'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  const calls = (await speakCalls(page)).slice(before);
  expect(calls[0].rate).toBe(0.78);
  expect(calls[0].inDispatch).toBe(true);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 0');
});

// ---- accessibility (design 7) ----

test('names, groups and the focus after right, skip and wrong', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await expect(view(page).getByRole('radiogroup', { name: 'Sanat' })).toBeVisible();
  await expect(view(page).getByRole('radiogroup', { name: 'Taso' })).toBeVisible();
  await expect(button(page, 'Tavutus')).toHaveAttribute('aria-pressed', 'false');
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await currentWord(page);
  await expect(view(page).getByRole('group', { name: `Sanasi, ${word.length} kirjainta` })).toBeVisible();
  await expect(view(page).locator('.sn-live')).toHaveText(`Sana 1 / 10. ${word.length} kirjainta. Vihje: ${entryOf(word).hint}`);
  await expect(button(page, 'Poista viimeisin kirjain')).toBeVisible();
  await expect(button(page, 'Aloita sana alusta')).toBeVisible();
  await expect(button(page, 'Ohita sana')).toBeVisible();
  await expect(view(page).locator('.sn-bar')).toHaveAttribute('aria-label', '0 sanaa 10:stä tehty');
  // wrong: focus on the first filled box (keyboard), its name says it can be removed
  const { wrong } = await spellWrong(page, testInfo);
  await expect(view(page).locator('.sn-live')).toHaveText(`Ei ihan. Sinun sanasi ${[...wrong].join(' ')}. Napauta kirjainta, jonka haluat vaihtaa.`);
  await expect(button(page, `Kirjain 1: ${wrong[0]}. Poista.`)).toBeFocused();
  await press(button(page, 'Aloita sana alusta'), testInfo);
  // used tile name
  await spell(page, testInfo, word[0]);
  await expect(view(page).getByRole('button', { name: `${word[0]}, käytetty` })).toBeDisabled();
  await press(button(page, 'Aloita sana alusta'), testInfo);
  // right: focus on Seuraava
  await spellRight(page, testInfo);
  await expect(button(page, 'Seuraava sana')).toBeFocused();
  await expect(view(page).locator('.sn-live')).toHaveText(new RegExp(`^Oikein! ${word}\\. Pisteet 0 / 1\\. Seuraava sana tulee itsestään\\.$`));
  await expect(button(page, `Kirjain 1: ${word[0]}, oikein`)).toHaveCount(0); // not a button
  await expect(view(page).getByRole('img', { name: `Kirjain 1: ${word[0]}, oikein` })).toBeVisible();
  await next(page, testInfo);
  // skip: focus on Seuraava
  const skipped = await skip(page, testInfo);
  await expect(button(page, 'Seuraava sana')).toBeFocused();
  await expect(view(page).locator('.sn-live')).toHaveText(`Ohitettu. Sana on ${skipped}. Pisteet 0 / 2.`);
});

// ---- B6: Vaihda, Takaisin sanaan, resume, guard ----

const hint = (page) => view(page).locator('.sn-hint');
const change = (page) => view(page).locator('.sn-change');
const radio = (page, name) => view(page).getByRole('radio', { name: new RegExp(`^${name}`) });
const badge = (page) => page.locator('.badge:visible');

async function openChoose(page, testInfo) {
  await press(change(page), testInfo);
  await settle(page);
}

test('hint and buttons: the choose screen in the middle of a round; the list hint wins over the level hint', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await openChoose(page, testInfo);
  await expect(button(page, 'Takaisin sanaan')).toBeVisible();
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await expect(button(page, 'Aloita')).toBeHidden();
  await expect(hint(page)).toHaveText('');
  await press(radio(page, 'Vaikea'), testInfo);
  await expect(hint(page)).toHaveText('Sama sana alkaa alusta uudella tasolla.');
  await expect(button(page, 'Takaisin sanaan')).toBeVisible();
  await press(radio(page, 'Harry Potter'), testInfo);
  await expect(hint(page)).toHaveText('Toiset sanat alkavat uudella kierroksella.');
  await expect(button(page, 'Takaisin sanaan')).toBeHidden();
  await expect(button(page, 'Aloita uusi kierros')).toBeVisible();
  await press(radio(page, 'Normaali'), testInfo);
  await expect(hint(page)).toHaveText('Sama sana alkaa alusta uudella tasolla.');
  await expect(button(page, 'Takaisin sanaan')).toBeVisible();
  await press(radio(page, 'Helppo'), testInfo);
  await expect(hint(page)).toHaveText('');
});

test('hint and buttons: a level change on a finished word has no hint; the end screen\'s Vaihda valintoja gives the Aloita form', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await skip(page, testInfo);
  await openChoose(page, testInfo);
  await press(radio(page, 'Vaikea'), testInfo);
  await expect(hint(page)).toHaveText('');
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await settle(page);
  await next(page, testInfo); // the next word
  await playRound(page, testInfo, 'FFFFFFFFF');
  await press(button(page, 'Vaihda valintoja'), testInfo);
  await settle(page);
  await expect(button(page, 'Aloita')).toBeVisible();
  await expect(button(page, 'Takaisin sanaan')).toBeHidden();
  await expect(button(page, 'Aloita uusi kierros')).toBeHidden();
  await expect(radio(page, 'Vaikea')).toHaveAttribute('aria-checked', 'true');
});

test('SEI-3 / 2: a new list needs Aloita uusi kierros; the new round has ten Harry Potter words and no points', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await skip(page, testInfo);
  await openChoose(page, testInfo);
  await press(radio(page, 'Harry Potter'), testInfo);
  await press(button(page, 'Aloita uusi kierros'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  await settle(page);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 0');
  const words = await wordsOfRound(page, testInfo);
  expect(new Set(words).size).toBe(10);
  for (const w of words) expect(HP_WORDS.map((e) => e.word), w).toContain(w);
});

test('SEI-3 / 6: a level change on an open word restarts it on the new level, keeps the points, and reads it in the tap', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await skip(page, testInfo);
  await next(page, testInfo);
  const word = await currentWord(page);
  await spell(page, testInfo, word.slice(0, 2));
  await openChoose(page, testInfo);
  await press(radio(page, 'Vaikea'), testInfo);
  const before = (await speakCalls(page)).length;
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  expect(await currentWord(page)).toBe(word);
  expect((await slotLetters(page)).every((l) => l === '')).toBe(true);
  await expect(view(page).locator('.sn-letters.is-alphabet')).toBeVisible();
  await expect(view(page).locator('.sn-tile')).toHaveCount(0);
  await expect(view(page).locator('.sn-mystery')).toBeVisible();
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 1');
  await expect.poll(async () => (await speakCalls(page)).length).toBe(before + 2);
  const calls = (await speakCalls(page)).slice(before);
  expect(calls.map((c) => [c.text, c.rate])).toEqual([[word.toLowerCase(), 0.78], [word.toLowerCase(), 0.52]]);
  expect(calls[0].inDispatch).toBe(true);
  await expect(view(page).locator('.sn-live')).toContainText('Sana 2 / 10.');
});

test('SEI-3 / 6: the attempt count survives a level change, so the word cannot be right first time any more', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await spellWrong(page, testInfo);
  await openChoose(page, testInfo);
  await press(radio(page, 'Keskitaso'), testInfo);
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await settle(page);
  await expect(feedback(page)).toBeEmpty(); // the word starts again: no message
  await spellRight(page, testInfo);
  await next(page, testInfo);
  await playRound(page, testInfo, 'FFFFFFFFF');
  await expect(view(page).locator('.sn-result-score')).toHaveText('9 / 10');
  await expect(view(page).locator('.sn-rows')).toContainText('1 sana oikein uudella yrityksellä');
});

test('SEI-3 / 6: a level change on a finished word shows the same finished word, reads nothing, and applies from the next word', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await spellRight(page, testInfo);
  await openChoose(page, testInfo);
  await press(radio(page, 'Vaikea'), testInfo);
  const before = (await speakCalls(page)).length;
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  expect(await slotLetters(page)).toEqual([...word]);
  await expect(feedback(page)).toHaveAttribute('data-kind', 'right');
  await expect(view(page).locator('.sn-tile')).toHaveCount(word.length); // still the old level's tiles
  await page.waitForTimeout(400);
  expect((await speakCalls(page)).length).toBe(before);
  await settle(page);
  await next(page, testInfo);
  await expect(view(page).locator('.sn-letters.is-alphabet')).toBeVisible();
  await expect(view(page).locator('.sn-tile')).toHaveCount(0);
});

test('SEI-3 / 7: tavutus changed in the middle of a word keeps the letters, adds the hyphens and reads the word; Takaisin sanaan with nothing changed reads nothing', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await currentWord(page);
  await spell(page, testInfo, word.slice(0, 2));
  const placed = await slotLetters(page);
  // nothing changed: the same state, no reading
  await openChoose(page, testInfo);
  let before = (await speakCalls(page)).length;
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await settle(page);
  expect(await slotLetters(page)).toEqual(placed);
  expect((await speakCalls(page)).length).toBe(before);
  // tavutus on
  await openChoose(page, testInfo);
  await press(button(page, 'Tavutus'), testInfo);
  await expect(hint(page)).toHaveText(''); // no hint for tavutus
  before = (await speakCalls(page)).length;
  await press(button(page, 'Takaisin sanaan'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  expect(await slotLetters(page)).toEqual(placed); // the letters stayed (design E2)
  await expect(view(page).locator('.sn-dash')).toHaveCount(syllabify(word).length - 1);
  await expect.poll(async () => (await speakCalls(page)).length, { timeout: 6000 }).toBe(before + 1 + syllabify(word).length);
  const calls = (await speakCalls(page)).slice(before);
  expect(calls[0].inDispatch).toBe(true);
  expect(calls.map((c) => c.rate)).toEqual([0.78, ...syllabify(word).map(() => 0.62)]);
  // the tiles that were used are still used
  await expect(view(page).locator('.sn-tile.is-used')).toHaveCount(2);
  // and the word can still be finished from where it was
  await spell(page, testInfo, word.slice(2));
  await expect(feedback(page)).toHaveAttribute('data-kind', 'right');
});

test('Resume: nothing done yet with letters placed, Etusivu, the card tap reads the word and keeps the letters; no badge', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  const word = await currentWord(page);
  await spell(page, testInfo, word.slice(0, 2));
  const placed = await slotLetters(page);
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect(page.locator('#home')).toBeVisible();
  await expect(badge(page)).toHaveCount(0);
  const before = (await speakCalls(page)).length;
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  expect(await slotLetters(page)).toEqual(placed);
  await expect.poll(async () => (await speakCalls(page)).length).toBe(before + 2);
  const calls = (await speakCalls(page)).slice(before);
  expect(calls[0].text).toBe(word.toLowerCase());
  expect(calls[0].inDispatch).toBe(true);
});

test('Resume: three words done show Kesken 3/10 and a return changes nothing and says nothing; after word 10 it reads Kesken 10/10; after Katso tulos there is no badge and the same end screen comes back quietly', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  for (let i = 0; i < 3; i++) {
    await skip(page, testInfo);
    await next(page, testInfo);
  }
  const word = await currentWord(page);
  await spell(page, testInfo, word.slice(0, 1));
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect(badge(page)).toHaveText(/Kesken 3\/10/);
  const before = (await speakCalls(page)).length;
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(view(page).locator('.sn-play')).toBeVisible();
  expect((await slotLetters(page))[0]).toBe(word[0]);
  await expect(view(page).locator('.sn-score')).toHaveText('Pisteet: 0 / 3');
  await page.waitForTimeout(400);
  expect((await speakCalls(page)).length).toBe(before);
  // up to the tenth word
  await press(button(page, 'Aloita sana alusta'), testInfo);
  await skip(page, testInfo);
  await next(page, testInfo);
  await playRound(page, testInfo, 'SSSSS');
  await skip(page, testInfo);
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect(badge(page)).toHaveText(/Kesken 10\/10/);
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(button(page, 'Katso tulos')).toBeVisible();
  await settle(page);
  await next(page, testInfo);
  await expect(view(page).locator('.sn-end')).toBeVisible();
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect(badge(page)).toHaveCount(0);
  const spoken = (await speakCalls(page)).length;
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(view(page).locator('.sn-end')).toBeVisible();
  await expect(view(page).locator('.sn-confetti')).toHaveCount(0);
  await page.waitForTimeout(400);
  expect((await speakCalls(page)).length).toBe(spoken);
});

test('Resume: Etusivu while the victory clip plays pauses it at once', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await spellRight(page, testInfo);
  await expect.poll(async () => (await audioCalls(page)).length).toBe(1);
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await expect.poll(async () => (await audioCalls(page)).length, { timeout: 1000 }).toBe(2);
  const [play, pause] = await audioCalls(page);
  expect(pause.kind).toBe('pause');
  expect(pause.at - play.at).toBeLessThan(1500);
  await page.waitForTimeout(3300);
  expect((await audioCalls(page)).length).toBe(2); // the 3 s timer was cleared, no second pause
});

test('Resume: leaving during the confetti removes it', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await startRound(page, testInfo, { level: 'Helppo' });
  await playRound(page, testInfo, 'FFFFFFFFFF');
  await expect(view(page).locator('.sn-confetti')).toHaveCount(1);
  await press(page.getByRole('button', { name: 'Etusivu' }), testInfo);
  await press(page.locator('button.game-card[data-game="sanat"]'), testInfo);
  await expect(view(page).locator('.sn-confetti')).toHaveCount(0);
});

test('Guard: a tap on the new screen\'s buttons within 500 ms of a screen change is ignored; after settle() it works', async ({ page }, testInfo) => {
  await openSanat(page, testInfo);
  await press(radio(page, 'Helppo'), testInfo);
  await settle(page);
  // in one task: Aloita, then at once a tile
  await page.evaluate(() => {
    const v = document.querySelector('.game-view[data-game="sanat"]');
    [...v.querySelectorAll('button')].find((b) => b.textContent === 'Aloita').click();
    v.querySelector('.sn-tile').click();
  });
  expect((await slotLetters(page)).every((l) => l === '')).toBe(true);
  await settle(page);
  const word = await currentWord(page);
  await spell(page, testInfo, word[0]);
  expect((await slotLetters(page))[0]).toBe(word[0]);
});
