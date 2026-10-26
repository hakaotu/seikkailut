import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_WORDS, WORDS, HP_WORDS, ALPHABET, PRAISE, syllabify, newDeck, newWordState, shuffleTiles, startWord,
  place, removeAt, removeLast, clearAll, isFull, check, skip, starsFor, endTier, endTexts, chooseHint,
  backToWord, wordSpeech, letterSpeech, wrongSpeech, skipSpeech, chooseSpeech, selectionLine, selectionLabel,
  changeLabel,
} from '../../app/src/games/sanat-logic.js';

// mulberry32: a small seeded generator, so a failure repeats.
function seeded(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const entry = (word) => [...WORDS, ...HP_WORDS].find((e) => e.word === word);
const started = (word, level, seed = 1) => startWord(newWordState(entry(word)), level, seeded(seed));
const tileFor = (ws, letter) => ws.tiles.find((t) => t.letter === letter && !t.used);
// Places the letters one by one, from tiles when the word has them.
function type(ws, letters) {
  for (const l of letters) place(ws, l, ws.tiles ? tileFor(ws, l).id : null);
  return ws;
}
const spelled = (ws) => ws.slots.map((s) => (s ? s.letter : '_')).join('');

// ---------- SEI-3 / 1, 2: the word lists ----------

test('the word lists are the old ones: 24 and 20 entries with emoji and hint, letters in the alphabet, no duplicates', () => {
  assert.equal(WORDS.length, 24);
  assert.equal(WORDS[0].word, 'KISSA');
  assert.equal(WORDS[WORDS.length - 1].word, 'TULI');
  assert.equal(HP_WORDS.length, 20);
  assert.equal(HP_WORDS[0].word, 'JÄSTI');
  assert.equal(HP_WORDS[HP_WORDS.length - 1].word, 'TAIKAJUOMA');
  for (const list of [WORDS, HP_WORDS]) {
    assert.equal(new Set(list.map((e) => e.word)).size, list.length);
    for (const e of list) {
      assert.ok(e.emoji && e.hint, e.word);
      for (const l of e.word) assert.ok(ALPHABET.includes(l), `${e.word}: ${l}`);
    }
  }
  assert.equal(ALPHABET.length, 29);
  assert.equal(ALPHABET.join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ');
});

test('newDeck gives MAX_WORDS distinct entries, all from the chosen list, over 500 seeds', () => {
  assert.equal(MAX_WORDS, 10);
  for (const [theme, list] of [['normal', WORDS], ['hp', HP_WORDS]]) {
    for (let seed = 1; seed <= 500; seed++) {
      const deck = newDeck(theme, seeded(seed));
      assert.equal(deck.length, 10);
      assert.equal(new Set(deck.map((e) => e.word)).size, 10, `${theme} seed ${seed}`);
      for (const e of deck) assert.ok(list.includes(e), `${theme} seed ${seed}: ${e.word}`);
    }
  }
});

// ---------- SEI-3 / 7: syllables ----------

test('syllabify: the examples of the design', () => {
  assert.deepEqual(syllabify('KISSA'), ['KIS', 'SA']);
  assert.deepEqual(syllabify('AUTO'), ['AU', 'TO']);
  assert.deepEqual(syllabify('TAIKASAUVA'), ['TAI', 'KA', 'SAU', 'VA']);
  assert.deepEqual(syllabify('LOHIKÄÄRME'), ['LO', 'HI', 'KÄÄR', 'ME']);
  assert.deepEqual(syllabify('PUU'), ['PUU']);
  assert.deepEqual(syllabify('KAMMIO'), ['KAM', 'MI', 'O']);
});

// ---------- SEI-3 / 8, SEI-45: reading the word ----------

test('wordSpeech: twice with a pause, or syllable by syllable; the first part is never delayed', () => {
  assert.deepEqual(wordSpeech('KISSA', false), [
    { text: 'kissa', rate: 0.78 },
    { text: 'kissa', rate: 0.52, pauseMs: 700 },
  ]);
  assert.deepEqual(wordSpeech('KISSA', true), [
    { text: 'kissa', rate: 0.78 },
    { text: 'kis', rate: 0.62, pauseMs: 700 },
    { text: 'sa', rate: 0.62, pauseMs: 400 },
  ]);
  assert.deepEqual(wordSpeech('PUU', true), [
    { text: 'puu', rate: 0.78 },
    { text: 'puu', rate: 0.62, pauseMs: 700 },
  ]);
  for (const e of [...WORDS, ...HP_WORDS]) {
    for (const tavutus of [false, true]) assert.equal(wordSpeech(e.word, tavutus)[0].pauseMs, undefined, e.word);
  }
});

test('the other readings', () => {
  assert.deepEqual(letterSpeech('K'), [{ text: 'k', rate: 0.9 }]);
  assert.deepEqual(wrongSpeech('T', 'KISSA'), [
    { text: 't', rate: 0.9 },
    { text: 'Ei ihan.', rate: 0.85, pauseMs: 300 },
    { text: 'kissa', rate: 0.52, pauseMs: 700 },
  ]);
  assert.deepEqual(skipSpeech('KISSA'), [{ text: 'Sana on kissa.', rate: 0.8 }]);
  assert.match(chooseSpeech(false)[0].text, /Paina sitten Aloita\.$/);
  assert.match(chooseSpeech(true)[0].text, /Paina sitten Takaisin sanaan\.$/);
});

// ---------- E13: the tiles ----------

test('shuffleTiles never spells the word, for every word of both lists and for PUU over 2000 seeds', () => {
  for (let seed = 1; seed <= 2000; seed++) {
    const tiles = shuffleTiles('PUU', seeded(seed));
    assert.notEqual(tiles.map((t) => t.letter).join(''), 'PUU', `seed ${seed}`);
  }
  for (const e of [...WORDS, ...HP_WORDS]) {
    for (let seed = 1; seed <= 200; seed++) {
      const tiles = shuffleTiles(e.word, seeded(seed));
      assert.notEqual(tiles.map((t) => t.letter).join(''), e.word, `${e.word} seed ${seed}`);
      assert.deepEqual(tiles.map((t) => t.id).sort((a, b) => a - b), [...e.word].map((_, i) => i));
      assert.deepEqual(tiles.map((t) => t.letter).sort(), [...e.word].sort());
      assert.ok(tiles.every((t) => t.used === false));
    }
  }
});

// ---------- SEI-7: the edits ----------

test('SEI-7 / 1: a wrong KISTA keeps its letters; the T is replaced and the word is right on retry', () => {
  const ws = started('KISSA', 'hard');
  assert.equal(ws.tiles, null);
  for (const l of 'KISTA') place(ws, l);
  assert.equal(isFull(ws), true);
  assert.equal(check(ws), 'wrong');
  assert.equal(ws.wrong, 1);
  assert.equal(ws.showWrong, true);
  assert.equal(spelled(ws), 'KISTA');
  assert.equal(ws.result, 'open');
  removeAt(ws, 3);
  assert.equal(spelled(ws), 'KIS_A');
  assert.equal(ws.showWrong, true); // the message stays until the next check
  assert.equal(place(ws, 'S'), 3);
  assert.equal(check(ws), 'right');
  assert.equal(ws.result, 'retry');
  assert.equal(ws.showWrong, false);
});

test('a first-time right word is "first"; a full row takes no more letters', () => {
  const ws = started('PUU', 'hard');
  for (const l of 'PUU') place(ws, l);
  assert.equal(place(ws, 'X'), -1);
  assert.equal(check(ws), 'right');
  assert.equal(ws.result, 'first');
  assert.equal(ws.wrong, 0);
});

test('SEI-7 / 2: Poista undoes the picks in reverse order and gives each tile back, on every level', () => {
  for (const level of ['easy', 'medium']) {
    const ws = started('KISSA', level);
    type(ws, 'KIS');
    const third = ws.slots[2].tileId;
    removeLast(ws);
    assert.equal(spelled(ws), 'KI___');
    assert.equal(ws.tiles.find((t) => t.id === third).used, false);
    removeLast(ws);
    removeLast(ws);
    assert.equal(spelled(ws), '_____');
    assert.ok(ws.tiles.every((t) => !t.used));
    removeLast(ws); // nothing left: no error
    assert.equal(spelled(ws), '_____');
  }
  const hard = started('KISSA', 'hard');
  for (const l of 'KIS') place(hard, l);
  removeLast(hard);
  assert.equal(spelled(hard), 'KI___');
});

test('SEI-7 / 2: after a removal in the middle, Poista removes the latest pick, not the rightmost letter', () => {
  const ws = started('KISSA', 'hard');
  for (const l of 'KISTA') place(ws, l); // picks 0 1 2 3 4
  removeAt(ws, 1); // K_STA
  place(ws, 'I'); // goes back to slot 1: the latest pick
  removeAt(ws, 4);
  place(ws, 'A'); // slot 4 again; the latest pick
  removeAt(ws, 2);
  place(ws, 'S'); // slot 2; the latest pick, while the rightmost letter is A in slot 4
  removeLast(ws);
  assert.equal(spelled(ws), 'KI_TA');
});

test('removing from the middle gives back that exact tile; the other letters stay', () => {
  const ws = started('KISSA', 'easy');
  type(ws, 'KISSA');
  const first = ws.slots[2];
  const second = ws.slots[3];
  assert.notEqual(first.tileId, second.tileId);
  removeAt(ws, 3);
  assert.equal(ws.tiles.find((t) => t.id === second.tileId).used, false);
  assert.equal(ws.tiles.find((t) => t.id === first.tileId).used, true);
  assert.equal(spelled(ws), 'KIS_A');
  assert.deepEqual(ws.picks, [0, 1, 2, 4]);
  removeAt(ws, 3); // already empty: nothing
  assert.deepEqual(ws.picks, [0, 1, 2, 4]);
});

test('clearAll empties the slots and gives every tile back, but keeps the order of the tiles and the attempt count', () => {
  const ws = started('KISSA', 'easy');
  type(ws, 'KISSA');
  check(ws);
  const order = ws.tiles.map((t) => t.id);
  ws.wrong = 2;
  clearAll(ws);
  assert.equal(spelled(ws), '_____');
  assert.deepEqual(ws.tiles.map((t) => t.id), order);
  assert.ok(ws.tiles.every((t) => !t.used));
  assert.equal(ws.showWrong, false);
  assert.equal(ws.wrong, 2);
});

test('SEI-7 / 3: skip counts as skipped, shows the word, gives all tiles back', () => {
  const ws = started('KISSA', 'easy');
  type(ws, 'KI');
  ws.wrong = 1;
  skip(ws);
  assert.equal(ws.result, 'skipped');
  assert.equal(spelled(ws), 'KISSA');
  assert.ok(ws.tiles.every((t) => !t.used));
  assert.deepEqual(ws.picks, []);
});

test('startWord keeps the attempt count and the result, and gives hard no tiles', () => {
  const ws = started('KISSA', 'easy');
  type(ws, 'KISSA');
  ws.wrong = 2;
  startWord(ws, 'hard', seeded(5));
  assert.equal(ws.level, 'hard');
  assert.equal(ws.tiles, null);
  assert.equal(spelled(ws), '_____');
  assert.equal(ws.wrong, 2);
  startWord(ws, 'medium', seeded(5));
  assert.equal(ws.tiles.length, 5);
});

// ---------- SEI-8: the result ----------

test('SEI-8 / 1: nine right first time and one after a retry is not 10 / 10', () => {
  const t = endTexts(9, 1, 0);
  assert.equal(t.tier, 'good');
  assert.equal(t.title, 'Hienoa!');
  assert.deepEqual(t.rows.map((r) => r.text), ['9 sanaa heti oikein', '1 sana oikein uudella yrityksellä']);
  assert.equal(t.speech, 'Hienoa! Heti oikein 9. Uudella yrityksellä 1. Hyvää työtä!');
});

test('SEI-8 / 2: skipped words have a row of their own', () => {
  const t = endTexts(7, 0, 3);
  assert.deepEqual(t.rows.map((r) => r.text), ['7 sanaa heti oikein', '3 sanaa ohitettu']);
  assert.equal(endTexts(8, 1, 1).speech, 'Hienoa! Heti oikein 8. Uudella yrityksellä 1. Ohitettu 1. Hyvää työtä!');
  assert.equal(endTexts(8, 1, 1).rows[2].text, '1 sana ohitettu');
});

test('SEI-8 / 3: all right first time is the perfect tier; nothing else says "hyvä lukija"', () => {
  const t = endTexts(10, 0, 0);
  assert.equal(t.tier, 'perfect');
  assert.equal(t.title, 'Täydellinen tulos!');
  assert.equal(t.speech, 'Täydellinen tulos! Kaikki 10 sanaa heti oikein. Olet tosi hyvä lukija!');
  assert.deepEqual(t.rows.map((r) => r.text), ['10 sanaa heti oikein']);
  for (let a = 0; a <= 9; a++) {
    const u = endTexts(a, 10 - a, 0);
    assert.doesNotMatch(JSON.stringify(u), /hyvä lukija/, `a = ${a}`);
    assert.notEqual(u.tier, 'perfect');
  }
  assert.equal(endTier(6), 'done');
  assert.equal(endTier(7), 'good');
});

test('the edges: all skipped, all corrected, singular and plural', () => {
  const skipped = endTexts(0, 0, 10);
  assert.equal(skipped.speech, 'Kierros valmis. Ohitettu 10. Harjoittelemalla oppii!');
  assert.deepEqual(skipped.rows.map((r) => r.text), ['0 sanaa heti oikein', '10 sanaa ohitettu']);
  assert.deepEqual(endTexts(0, 10, 0).rows.map((r) => r.text), ['0 sanaa heti oikein', '10 sanaa oikein uudella yrityksellä']);
  assert.equal(endTexts(1, 9, 0).rows[0].text, '1 sana heti oikein');
  assert.equal(endTexts(4, 3, 3).speech, 'Kierros valmis. Heti oikein 4. Uudella yrityksellä 3. Ohitettu 3. Harjoittelemalla oppii!');
});

test('stars: none before any word is done, then round(a * 5 / done); at the end round(a / 2)', () => {
  assert.equal(starsFor(0, 0), 0);
  assert.deepEqual(Array.from({ length: 11 }, (_, a) => starsFor(a, 10)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test('PRAISE is the old list of seven', () => {
  assert.equal(PRAISE.length, 7);
  assert.ok(PRAISE.every((p) => !/Melkein|Mestari/.test(p)));
});

// ---------- B6: Vaihda and Takaisin sanaan ----------

const same = { theme: 'normal', level: 'easy', tavutus: false };

test('backToWord: the five rows of the design', () => {
  const settings = same;
  const go = (draft, wordOpen) => backToWord({ settings, draft, wordOpen });
  // level changed, word open: restart and read
  assert.deepEqual(go({ ...same, level: 'hard' }, true), { restart: true, read: true });
  assert.deepEqual(go({ ...same, level: 'hard', tavutus: true }, true), { restart: true, read: true });
  // level changed, word finished: nothing now, the next word uses the new level
  assert.deepEqual(go({ ...same, level: 'hard' }, false), { restart: false, read: false });
  // only tavutus changed: the letters stay, an open word is read
  assert.deepEqual(go({ ...same, tavutus: true }, true), { restart: false, read: true });
  assert.deepEqual(go({ ...same, tavutus: true }, false), { restart: false, read: false });
  // nothing changed
  assert.deepEqual(go({ ...same }, true), { restart: false, read: false });
  assert.deepEqual(go({ ...same }, false), { restart: false, read: false });
});

test('chooseHint: list before level before nothing; no hint without a round', () => {
  const round = { theme: 'normal', level: 'easy' };
  assert.equal(chooseHint({ ...same, theme: 'hp', level: 'hard' }, round, true), 'Toiset sanat alkavat uudella kierroksella.');
  assert.equal(chooseHint({ ...same, level: 'hard' }, round, true), 'Sama sana alkaa alusta uudella tasolla.');
  assert.equal(chooseHint({ ...same, level: 'hard' }, round, false), '');
  assert.equal(chooseHint({ ...same, tavutus: true }, round, true), '');
  assert.equal(chooseHint({ ...same, theme: 'hp' }, null, true), '');
});

test('the selections as text', () => {
  assert.equal(selectionLine(same), 'Normaali · Helppo');
  assert.equal(selectionLine({ theme: 'hp', level: 'hard', tavutus: true }), 'Harry Potter · Vaikea · Tavutus');
  assert.equal(selectionLabel({ theme: 'normal', level: 'easy', tavutus: true }), 'Sanat Normaali. Taso Helppo. Tavutus päällä.');
  assert.equal(changeLabel(same), 'Vaihda sanoja, tasoa ja tavutusta. Nyt Normaali, Helppo, tavutus pois.');
});
