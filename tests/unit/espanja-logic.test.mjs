import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_QUESTIONS, STARS_KEY, WORDS, PRAISE, DIRECTIONS, ALL_TOPICS, TOPICS as TOPIC_TILES, wordsIn, roundLength,
  starThreshold, topicName, topicLine, selectionLine, selectionLabel, changeLabel, shuffle, newRound, promptOf, optionText, spoken, hintLine,
  pairLine, choose, skip, counts, listenParts, answerParts, endTier, earnsStar, endTexts, chooseHint, questionLive,
  rightLive, wrongLive, skippedLive, endLive, parseStars, loadStars, saveStars,
} from '../../app/src/games/espanja-logic.js';
import { PRAISE as MATIKKA_PRAISE } from '../../app/src/games/matikka-logic.js';

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

const word = (es) => WORDS.find((w) => w.es === es);
const TOPICS = [...new Set(WORDS.map((w) => w.topic))];

// ---------- SEI-9: the word list ----------

test('SEI-9 / 1-4: the first 18 pairs are the design\'s table, in order, with the three corrected translations', () => {
  const table = [
    ['hola', 'hei', 'tervehdys'], ['adiós', 'näkemiin', 'tervehdys'], ['buenos días', 'hyvää huomenta', 'tervehdys'],
    ['buenas tardes', 'hyvää iltapäivää', 'tervehdys'], ['buenas noches', 'hyvää yötä', 'tervehdys'],
    ['gracias', 'kiitos', 'tervehdys'], ['por favor', 'ole kiltti', 'tervehdys'], ['¿qué tal?', 'mitä kuuluu?', 'tervehdys'],
    ['rojo', 'punainen', 'väri'], ['amarillo', 'keltainen', 'väri'], ['azul', 'sininen', 'väri'], ['verde', 'vihreä', 'väri'],
    ['blanco', 'valkoinen', 'väri'], ['negro', 'musta', 'väri'], ['naranja', 'oranssi', 'väri'], ['morado', 'violetti', 'väri'],
    ['marrón', 'ruskea', 'väri'], ['gris', 'harmaa', 'väri'],
  ];
  assert.deepEqual(WORDS.slice(0, 18), table.map(([es, fi, topic]) => ({ es, fi, topic })));
  assert.equal(word('adiós').fi, 'näkemiin');
  assert.equal(word('buenas tardes').fi, 'hyvää iltapäivää');
  assert.equal(word('por favor').fi, 'ole kiltti');
  for (const old of ['moi moi / hei hei', 'hyvää iltaa', 'ole hyvä']) {
    assert.ok(!WORDS.some((w) => w.fi === old), old);
  }
  assert.equal(WORDS.filter((w) => w.topic === 'tervehdys').length, 8);
  assert.equal(WORDS.filter((w) => w.topic === 'väri').length, 10);
});

test('SEI-52 to 56 / 1: the 61 new pairs are the design\'s tables, after the old 18, in order', () => {
  const table = [
    ['uno', 'yksi', 'numero'],
    ['dos', 'kaksi', 'numero'],
    ['tres', 'kolme', 'numero'],
    ['cuatro', 'neljä', 'numero'],
    ['cinco', 'viisi', 'numero'],
    ['seis', 'kuusi', 'numero'],
    ['siete', 'seitsemän', 'numero'],
    ['ocho', 'kahdeksan', 'numero'],
    ['nueve', 'yhdeksän', 'numero'],
    ['diez', 'kymmenen', 'numero'],
    ['once', 'yksitoista', 'numero'],
    ['doce', 'kaksitoista', 'numero'],
    ['perro', 'koira', 'eläin'],
    ['gato', 'kissa', 'eläin'],
    ['caballo', 'hevonen', 'eläin'],
    ['vaca', 'lehmä', 'eläin'],
    ['cerdo', 'sika', 'eläin'],
    ['oveja', 'lammas', 'eläin'],
    ['pájaro', 'lintu', 'eläin'],
    ['pez', 'kala', 'eläin'],
    ['ratón', 'hiiri', 'eläin'],
    ['conejo', 'kani', 'eläin'],
    ['pato', 'ankka', 'eläin'],
    ['gallina', 'kana', 'eläin'],
    ['león', 'leijona', 'eläin'],
    ['elefante', 'norsu', 'eläin'],
    ['mono', 'apina', 'eläin'],
    ['oso', 'karhu', 'eläin'],
    ['pan', 'leipä', 'ruoka'],
    ['leche', 'maito', 'ruoka'],
    ['agua', 'vesi', 'ruoka'],
    ['zumo', 'mehu', 'ruoka'],
    ['manzana', 'omena', 'ruoka'],
    ['plátano', 'banaani', 'ruoka'],
    ['fresa', 'mansikka', 'ruoka'],
    ['pera', 'päärynä', 'ruoka'],
    ['queso', 'juusto', 'ruoka'],
    ['huevo', 'muna', 'ruoka'],
    ['arroz', 'riisi', 'ruoka'],
    ['sopa', 'keitto', 'ruoka'],
    ['helado', 'jäätelö', 'ruoka'],
    ['galleta', 'keksi', 'ruoka'],
    ['patata', 'peruna', 'ruoka'],
    ['zanahoria', 'porkkana', 'ruoka'],
    ['lunes', 'maanantai', 'viikonpäivä'],
    ['martes', 'tiistai', 'viikonpäivä'],
    ['miércoles', 'keskiviikko', 'viikonpäivä'],
    ['jueves', 'torstai', 'viikonpäivä'],
    ['viernes', 'perjantai', 'viikonpäivä'],
    ['sábado', 'lauantai', 'viikonpäivä'],
    ['domingo', 'sunnuntai', 'viikonpäivä'],
    ['madre', 'äiti', 'perhe'],
    ['padre', 'isä', 'perhe'],
    ['hermano', 'veli', 'perhe'],
    ['hermana', 'sisko', 'perhe'],
    ['abuelo', 'isoisä', 'perhe'],
    ['abuela', 'isoäiti', 'perhe'],
    ['hijo', 'poika', 'perhe'],
    ['hija', 'tytär', 'perhe'],
    ['bebé', 'vauva', 'perhe'],
    ['tía', 'täti', 'perhe'],
  ];
  assert.equal(WORDS.length, 79);
  assert.deepEqual(WORDS.slice(18), table.map(([es, fi, topic]) => ({ es, fi, topic })));
});

test('SEI-52 to 56 / 1, SEI-55 / 8: seven topics in order with 8, 10, 12, 16, 16, 7 and 10 pairs; the weekdays Monday to Sunday', () => {
  assert.deepEqual(TOPICS, ['tervehdys', 'väri', 'numero', 'eläin', 'ruoka', 'viikonpäivä', 'perhe']);
  assert.deepEqual(TOPICS.map((t) => WORDS.filter((w) => w.topic === t).length), [8, 10, 12, 16, 16, 7, 10]);
  const days = WORDS.filter((w) => w.topic === 'viikonpäivä');
  assert.deepEqual(days.map((w) => w.es), ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo']);
  assert.deepEqual(days.map((w) => w.fi), ['maanantai', 'tiistai', 'keskiviikko', 'torstai', 'perjantai', 'lauantai', 'sunnuntai']);
});

test('SEI-52 / 6: a Spanish text is at most two words', () => {
  for (const w of WORDS) assert.ok(w.es.split(' ').length <= 2, w.es);
});

test('design 5: within a topic every Finnish and every Spanish text is unique, and across the list too', () => {
  for (const key of ['fi', 'es']) {
    assert.equal(new Set(WORDS.map((w) => w[key])).size, WORDS.length, key);
    for (const topic of TOPICS) {
      const texts = WORDS.filter((w) => w.topic === topic).map((w) => w[key]);
      assert.equal(new Set(texts).size, texts.length, `${topic} ${key}`);
    }
  }
});

// ---------- rounds ----------

test('SEI-4 / 3: shuffle returns a new array with the same items', () => {
  const list = [1, 2, 3, 4, 5];
  const out = shuffle(list, seeded(1));
  assert.notEqual(out, list);
  assert.deepEqual([...out].sort(), list);
  assert.deepEqual(list, [1, 2, 3, 4, 5]);
});

test('SEI-4 / 3: a round has 10 distinct words from the list', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const round = newRound('fi2es', 'kaikki', seeded(seed));
    assert.equal(round.questions.length, MAX_QUESTIONS);
    const pairs = round.questions.map((q) => q.pair);
    assert.equal(new Set(pairs).size, MAX_QUESTIONS, `seed ${seed}`);
    for (const p of pairs) assert.ok(WORDS.includes(p), `seed ${seed}`);
    assert.equal(round.index, 0);
    assert.equal(round.endShown, false);
    assert.equal(round.starGiven, false);
    assert.equal(round.direction, 'fi2es');
  }
});

test('SEI-4 / 3: every word is equally likely as question 1 (Fisher-Yates, not the old biased sort)', () => {
  const N = 79000; // 1000 per word: about 4.8 standard deviations inside the 15 % band (docs/plans/sei-50.md 6.2)
  const first = new Map();
  for (let seed = 1; seed <= N; seed++) {
    const p = newRound('fi2es', 'kaikki', seeded(seed)).questions[0].pair;
    first.set(p, (first.get(p) || 0) + 1);
  }
  const expected = N / WORDS.length;
  for (const w of WORDS) {
    const n = first.get(w) || 0;
    assert.ok(Math.abs(n - expected) <= expected * 0.15, `${w.es} came first ${n} times, expected about ${Math.round(expected)}`);
  }
});

test('SEI-4 / 1, 2: four options, exactly one right, three others distinct and from the same topic, in both directions; every topic is asked', () => {
  for (const direction of ['fi2es', 'es2fi']) {
    const asked = new Set();
    for (let seed = 1; seed <= 1000; seed++) {
      for (const q of newRound(direction, 'kaikki', seeded(seed)).questions) {
        asked.add(q.pair.topic);
        assert.equal(q.options.length, 4, `${direction} seed ${seed}`);
        assert.equal(q.options.filter((o) => o === q.pair).length, 1, `${direction} seed ${seed}`);
        assert.equal(new Set(q.options).size, 4, `${direction} seed ${seed}`);
        for (const o of q.options) assert.equal(o.topic, q.pair.topic, `${direction} seed ${seed}: ${o.es} beside ${q.pair.es}`);
        assert.equal(new Set(q.options.map((o) => o.fi)).size, 4);
        assert.equal(new Set(q.options.map((o) => o.es)).size, 4);
        assert.equal(q.result, 'open');
        assert.equal(q.chosen, null);
      }
    }
    assert.deepEqual([...asked].sort(), [...TOPICS].sort(), `${direction}: every topic was asked`);
  }
});

test('SEI-4 / 1, 2: fi2es asks Finnish and answers in Spanish, es2fi the other way', () => {
  const rojo = word('rojo');
  assert.equal(promptOf(rojo, 'fi2es'), 'punainen');
  assert.equal(optionText(rojo, 'fi2es'), 'rojo');
  assert.equal(promptOf(rojo, 'es2fi'), 'rojo');
  assert.equal(optionText(rojo, 'es2fi'), 'punainen');
  assert.equal(DIRECTIONS.fi2es.name, 'Suomi → Espanja');
  assert.equal(DIRECTIONS.es2fi.how, 'Valitse suomeksi');
});

test('SEI-4 / 3: the hint line names the word\'s topic and the way to answer', () => {
  assert.equal(hintLine(word('rojo'), 'fi2es'), 'Aihe: väri. Valitse espanjaksi.');
  assert.equal(hintLine(word('hola'), 'es2fi'), 'Aihe: tervehdys. Valitse suomeksi.');
});

test('the pair line has Spanish first in both directions', () => {
  assert.equal(pairLine(word('rojo')), 'rojo = punainen');
  assert.equal(pairLine(word('¿qué tal?')), '¿qué tal? = mitä kuuluu?');
});

// ---------- answering ----------

function oneRound(seed = 7) {
  return newRound('fi2es', 'kaikki', seeded(seed));
}
const wrongOption = (q) => q.options.find((o) => o !== q.pair);

test('SEI-4 / 4, SEI-10 / 2: an answer counts once; a skip or a second answer after it changes nothing', () => {
  const round = oneRound();
  const [q1, q2, q3] = round.questions;
  choose(q1, q1.pair, seeded(1));
  assert.equal(q1.result, 'right');
  assert.ok(PRAISE.includes(q1.praise));
  assert.equal(q1.chosen, q1.pair);
  choose(q1, wrongOption(q1), seeded(1));
  skip(q1);
  assert.equal(q1.result, 'right');
  assert.equal(q1.chosen, q1.pair);

  choose(q2, wrongOption(q2));
  assert.equal(q2.result, 'wrong');
  assert.equal(q2.praise, null);
  choose(q2, q2.pair);
  assert.equal(q2.result, 'wrong');

  skip(q3);
  assert.equal(q3.result, 'skipped');
  assert.equal(q3.chosen, null);
  choose(q3, q3.pair);
  assert.equal(q3.result, 'skipped');
});

test('SEI-4 / 4: the answer is compared by identity, not by text', () => {
  const q = oneRound().questions[0];
  const twin = { ...q.pair }; // the same words, another object
  choose(q, twin);
  assert.equal(q.result, 'wrong');
});

test('SEI-4 / 7, SEI-10 / 2: counts after right, wrong, skipped, right', () => {
  const round = oneRound();
  const [q1, q2, q3, q4] = round.questions;
  assert.deepEqual(counts(round), { a: 0, b: 0, c: 0, done: 0 });
  choose(q1, q1.pair);
  choose(q2, wrongOption(q2));
  skip(q3);
  choose(q4, q4.pair);
  assert.deepEqual(counts(round), { a: 2, b: 1, c: 1, done: 4 });
});

// ---------- speech ----------

test('SEI-4 / 5: Kuuntele on the choose screen says hola', () => {
  assert.deepEqual(listenParts('choose', null), [{ text: 'hola', rate: 0.9 }]);
});

test('SEI-4 / 5: fi2es Kuuntele before the answer reads the four options in display order, with pauses', () => {
  const round = oneRound();
  const q = round.questions[0];
  const parts = listenParts('question', round);
  assert.equal(parts.length, 4);
  assert.deepEqual(parts.map((p) => p.text), q.options.map((o) => spoken(o.es)));
  assert.ok(parts.every((p) => p.rate === 0.9));
  assert.equal(parts[0].pauseMs, undefined);
  assert.deepEqual(parts.slice(1).map((p) => p.pauseMs), [500, 500, 500]);
});

test('SEI-4 / 5: after an answer or a skip, and in es2fi, Kuuntele reads the one Spanish word', () => {
  const round = oneRound();
  const q = round.questions[0];
  choose(q, wrongOption(q));
  assert.deepEqual(listenParts('question', round), [{ text: spoken(q.pair.es), rate: 0.9 }]);
  assert.deepEqual(answerParts(q), [{ text: spoken(q.pair.es), rate: 0.9 }]);

  const back = newRound('es2fi', 'kaikki', seeded(3));
  const q2 = back.questions[0];
  assert.deepEqual(listenParts('question', back), [{ text: spoken(q2.pair.es), rate: 0.9 }]);
  skip(q2);
  assert.deepEqual(listenParts('question', back), [{ text: spoken(q2.pair.es), rate: 0.9 }]);
});

test('SEI-4 / 5: ¡ ! ¿ ? are not sent to speech', () => {
  assert.equal(spoken('¿qué tal?'), 'qué tal');
  assert.equal(spoken('¡Perfecto!'), 'Perfecto');
  assert.equal(spoken('rojo'), 'rojo');
});

test('SEI-4 / 8: Kuuntele on the end screen says the Spanish phrase', () => {
  const round = oneRound();
  round.questions.forEach((q) => choose(q, q.pair));
  assert.deepEqual(listenParts('end', round), [{ text: 'Perfecto', rate: 0.9 }]);
});

// ---------- the end screen ----------

test('SEI-4 / 8, SEI-10 / 3: 8 gives a star and 7 does not; the tiers', () => {
  assert.equal(earnsStar(7, 10), false);
  assert.equal(earnsStar(8, 10), true);
  assert.deepEqual([10, 9, 8, 7].map((a) => endTier(a, 10)), ['perfect', 'good', 'good', 'done']);
});

test('SEI-10 / 3: 6 right and 4 skipped has no wrong row and no star', () => {
  const t = endTexts(6, 0, 4, 10);
  assert.equal(t.tier, 'done');
  assert.equal(t.title, 'Kierros valmis!');
  assert.equal(t.score, '6 / 10 oikein');
  assert.deepEqual(t.rows, [{ kind: 'a', text: '6 oikein' }, { kind: 'c', text: '4 ohitettu' }]);
  assert.equal(t.starLine, 'Tähti tulee, kun saat 8 oikein.');
  assert.equal(t.phraseEs, '¡Sigue practicando!');
  assert.equal(t.speech, 'Sigue practicando');
});

test('the end texts of the other tiers; the right row is always there, the others only from 1', () => {
  assert.deepEqual(endTexts(0, 10, 0, 10).rows, [{ kind: 'a', text: '0 oikein' }, { kind: 'b', text: '10 väärin' }]);
  assert.deepEqual(endTexts(0, 0, 10, 10).rows, [{ kind: 'a', text: '0 oikein' }, { kind: 'c', text: '10 ohitettu' }]);
  const perfect = endTexts(10, 0, 0, 10);
  assert.equal(perfect.title, 'Täydellinen tulos!');
  assert.deepEqual(perfect.rows, [{ kind: 'a', text: '10 oikein' }]);
  assert.equal(perfect.starLine, 'Sait tähden!');
  assert.equal(perfect.speech, 'Perfecto');
  const good = endTexts(8, 1, 1, 10);
  assert.equal(good.title, 'Hienoa!');
  assert.equal(good.phraseFi, 'Tosi hyvä!');
  assert.equal(good.speech, 'Muy bien');
  assert.equal(good.starLine, 'Sait tähden!');
});

// ---------- the choose screen ----------

test('SEI-4 / 2: the hint appears only when a round is open and the card is the other direction', () => {
  const round = oneRound();
  assert.equal(chooseHint('fi2es', 'kaikki', null), '');
  assert.equal(chooseHint('fi2es', 'kaikki', round), '');
  assert.equal(chooseHint('es2fi', 'kaikki', round), 'Toinen suunta alkaa uudella kierroksella.');
  round.endShown = true;
  assert.equal(chooseHint('es2fi', 'kaikki', round), '');
});

// ---------- live region texts ----------

test('SEI-4 / 10: the live texts follow the design', () => {
  const round = newRound('fi2es', 'kaikki', seeded(5));
  const q = round.questions[0];
  assert.equal(questionLive(round), `Kysymys 1 / 10: ${q.pair.fi}. Aihe ${q.pair.topic}. Valitse espanjaksi.`);
  choose(q, q.pair);
  assert.equal(rightLive(round, true), `Oikein! ${q.pair.es} on ${q.pair.fi}. Pisteet 1 / 1. Seuraava kysymys tulee itsestään.`);
  const q2 = round.questions[1];
  round.index = 1;
  choose(q2, wrongOption(q2));
  assert.equal(
    wrongLive(round),
    `Ei ihan. Oikea vastaus on ${q2.pair.es}. Sinä valitsit ${wrongOption(q2).es}. Pisteet 1 / 2.`,
  );
  const q3 = round.questions[2];
  round.index = 2;
  skip(q3);
  assert.equal(skippedLive(round), `Ohitettu. Oikea vastaus on ${q3.pair.es}. Pisteet 1 / 3.`);
});

test('SEI-48 / 13: the sentence about the wait is added on items 1-9 only', () => {
  const round = oneRound();
  choose(round.questions[0], round.questions[0].pair);
  assert.ok(rightLive(round, true).endsWith('Seuraava kysymys tulee itsestään.'));
  assert.ok(!rightLive(round, false).includes('itsestään'));
});

test('the end announcement names the score, the skipped count and the star', () => {
  const round = oneRound();
  round.questions.slice(0, 6).forEach((q) => choose(q, q.pair));
  round.questions.slice(6).forEach(skip);
  assert.equal(endLive(round, false, 3), 'Kierros valmis! 6 / 10 oikein. 4 ohitettu. Tähti tulee, kun saat 8 oikein.');
  round.questions.slice(6, 8).forEach((q) => { q.result = 'right'; });
  assert.equal(endLive(round, true, 5), 'Hienoa! 8 / 10 oikein. 2 ohitettu. Sait tähden! Tähtiä nyt 5.');
});

// ---------- SEI-57: topics ----------

test('SEI-57 / 5: every topic of WORDS has a tile, in WORDS order after Kaikki aiheet, with the design\'s names and emoji', () => {
  assert.deepEqual(TOPIC_TILES.map((t) => t.id), [ALL_TOPICS, ...TOPICS]);
  assert.equal(ALL_TOPICS, 'kaikki');
  assert.deepEqual(TOPIC_TILES.map((t) => t.name), ['Kaikki aiheet', 'Tervehdykset', 'Värit', 'Numerot', 'Eläimet', 'Ruoka', 'Viikonpäivät', 'Perhe']);
  assert.deepEqual(TOPIC_TILES.map((t) => t.label.replaceAll('­', '')), ['Kaikki', 'Tervehdykset', 'Värit', 'Numerot', 'Eläimet', 'Ruoka', 'Viikonpäivät', 'Perhe']);
  assert.deepEqual(TOPIC_TILES.map((t) => [...t.emoji].map((c) => c.codePointAt(0).toString(16))), [
    ['1f3b2'], ['1f44b'], ['1f3a8'], ['1f522'], ['1f436'], ['1f34e'], ['1f4c5'], ['1f46a'],
  ]);
  for (const t of TOPICS) assert.ok(TOPIC_TILES.some((tile) => tile.id === t), `${t} has no tile`);
  for (const t of TOPICS) assert.ok(wordsIn(t).length >= 4, `${t} has fewer than 4 words`);
});

test('SEI-57 / 4: the round length is 10, or the topic\'s size when smaller', () => {
  assert.deepEqual(TOPIC_TILES.map((t) => roundLength(t.id)), [10, 8, 10, 10, 10, 10, 7, 10]);
  assert.equal(wordsIn('kaikki'), WORDS);
});

test('SEI-57 / 3, 4: a topic round has only that topic\'s words and options, the right length, no repeats, in both directions', () => {
  for (const topic of TOPICS) {
    for (const direction of ['fi2es', 'es2fi']) {
      for (let seed = 1; seed <= 200; seed++) {
        const at = `${direction} ${topic} seed ${seed}`;
        const round = newRound(direction, topic, seeded(seed));
        assert.equal(round.topic, topic, at);
        assert.equal(round.direction, direction, at);
        assert.equal(round.questions.length, roundLength(topic), at);
        const pairs = round.questions.map((q) => q.pair);
        assert.equal(new Set(pairs).size, pairs.length, `${at}: a pair twice`);
        for (const q of round.questions) {
          assert.equal(q.pair.topic, topic, at);
          assert.equal(q.options.length, 4, at);
          assert.equal(new Set(q.options).size, 4, at);
          assert.equal(q.options.filter((o) => o === q.pair).length, 1, at);
          assert.equal(new Set(q.options.map((o) => o.fi)).size, 4, at);
          assert.equal(new Set(q.options.map((o) => o.es)).size, 4, at);
          for (const o of q.options) assert.equal(o.topic, topic, `${at}: '${o.es}' beside '${q.pair.es}'`);
        }
        if (wordsIn(topic).length <= MAX_QUESTIONS) {
          assert.deepEqual(new Set(pairs), new Set(wordsIn(topic)), `${at}: not every word once`);
        }
      }
    }
  }
});

// The function as it was before SEI-57, pasted: Kaikki aiheet must draw exactly the same.
function newRoundBefore(direction, rng) {
  const questions = shuffle(WORDS, rng)
    .slice(0, MAX_QUESTIONS)
    .map((pair) => {
      const others = WORDS.filter((w) => w !== pair && w.topic === pair.topic);
      const options = shuffle([pair, ...shuffle(others, rng).slice(0, 3)], rng);
      return { pair, options, result: 'open', chosen: null, praise: null };
    });
  return { direction, questions, index: 0, endShown: false, starGiven: false };
}

test('SEI-57 / 1, 2: Kaikki aiheet is the draw from before topics, for the same random numbers', () => {
  for (const direction of ['fi2es', 'es2fi']) {
    for (let seed = 1; seed <= 200; seed++) {
      const { topic, ...round } = newRound(direction, 'kaikki', seeded(seed));
      assert.equal(topic, 'kaikki');
      assert.deepEqual(round, newRoundBefore(direction, seeded(seed)), `${direction} seed ${seed}`);
    }
  }
});

test('SEI-57 / 4: the star threshold is 80 % rounded up: 10 -> 8, 8 -> 7, 7 -> 6; tiers and star at the edges', () => {
  assert.deepEqual([10, 8, 7].map(starThreshold), [8, 7, 6]);
  assert.deepEqual(
    [[8, 10], [7, 10], [7, 8], [6, 8], [6, 7], [5, 7]].map(([a, n]) => earnsStar(a, n)),
    [true, false, true, false, true, false],
  );
  assert.deepEqual([[7, 7], [6, 7], [5, 7], [8, 8], [7, 8], [6, 8]].map(([a, n]) => endTier(a, n)), ['perfect', 'good', 'done', 'perfect', 'good', 'done']);
  assert.deepEqual([[10, 10], [9, 10], [8, 10], [7, 10]].map(([a, n]) => endTier(a, n)), ['perfect', 'good', 'good', 'done']);
});

test('SEI-57 / 4, 8: the end texts of a 7-question round use 7 and the threshold 6', () => {
  const t = endTexts(5, 2, 0, 7);
  assert.equal(t.score, '5 / 7 oikein');
  assert.equal(t.scoreNumber, '5 / 7');
  assert.equal(t.starLine, 'Tähti tulee, kun saat 6 oikein.');
  assert.deepEqual(endTexts(0, 7, 0, 7).rows, [{ kind: 'a', text: '0 oikein' }, { kind: 'b', text: '7 väärin' }]);
  assert.equal(endTexts(6, 0, 1, 7).title, 'Hienoa!');
  assert.equal(endTexts(6, 0, 1, 7).starLine, 'Sait tähden!');
  assert.equal(endTexts(5, 3, 0, 8).starLine, 'Tähti tulee, kun saat 7 oikein.');
});

test('SEI-57 / 4, 9: the live texts of a 7-question round', () => {
  const round = newRound('fi2es', 'viikonpäivä', seeded(5));
  assert.equal(round.questions.length, 7);
  assert.equal(
    questionLive(round),
    `Kysymys 1 / 7: ${round.questions[0].pair.fi}. Aihe viikonpäivä. Valitse espanjaksi.`,
  );
  round.questions.slice(0, 6).forEach((q) => choose(q, q.pair));
  skip(round.questions[6]);
  assert.equal(endLive(round, true, 5), 'Hienoa! 6 / 7 oikein. 1 ohitettu. Sait tähden! Tähtiä nyt 5.');
  const short = newRound('fi2es', 'viikonpäivä', seeded(5));
  short.questions.slice(0, 5).forEach((q) => choose(q, q.pair));
  short.questions.slice(5).forEach((q) => choose(q, wrongOption(q)));
  assert.equal(endLive(short, false, 0), 'Kierros valmis! 5 / 7 oikein. Tähti tulee, kun saat 6 oikein.');
});

test('SEI-57: Kuuntele on the end screen of a short round reads the phrase of its own tier', () => {
  const round = newRound('fi2es', 'viikonpäivä', seeded(5));
  round.questions.slice(0, 6).forEach((q) => choose(q, q.pair));
  skip(round.questions[6]);
  assert.deepEqual(listenParts('end', round), [{ text: 'Muy bien', rate: 0.9 }]);
});

test('SEI-57: the hint names what differs from the open round, topic first; nothing without a round or on the end screen', () => {
  const round = newRound('fi2es', 'perhe', seeded(1));
  assert.equal(chooseHint('fi2es', 'perhe', round), '');
  assert.equal(chooseHint('fi2es', 'väri', round), 'Toinen aihe alkaa uudella kierroksella.');
  assert.equal(chooseHint('es2fi', 'perhe', round), 'Toinen suunta alkaa uudella kierroksella.');
  assert.equal(chooseHint('es2fi', 'väri', round), 'Toinen aihe ja suunta alkavat uudella kierroksella.');
  assert.equal(chooseHint('es2fi', 'väri', null), '');
  round.endShown = true;
  assert.equal(chooseHint('es2fi', 'väri', round), '');
});

test('SEI-57 / 9: the topic line, the selection line and the labels read as in the design', () => {
  assert.equal(topicName('kaikki'), 'Kaikki aiheet');
  assert.equal(topicLine('kaikki'), 'Kaikki aiheet: 79 sanaa');
  assert.equal(topicLine('eläin'), 'Eläimet: 16 sanaa');
  assert.equal(topicLine('väri'), 'Värit: 10 sanaa');
  assert.equal(topicLine('tervehdys'), 'Tervehdykset: 8 sanaa, kierroksessa 8 kysymystä');
  assert.equal(topicLine('viikonpäivä'), 'Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä');
  assert.equal(selectionLine('viikonpäivä', 'fi2es'), 'Viikonpäivät · Suomi → Espanja');
  assert.equal(selectionLine('kaikki', 'es2fi'), 'Kaikki aiheet · Espanja → Suomi');
  assert.equal(selectionLabel('viikonpäivä', 'fi2es'), 'Aihe viikonpäivät. Suunta Suomi → Espanja.');
  assert.equal(changeLabel('viikonpäivä', 'fi2es'), 'Vaihda aihetta tai suuntaa. Nyt viikonpäivät, Suomi → Espanja.');
  assert.equal(changeLabel('kaikki', 'fi2es'), 'Vaihda aihetta tai suuntaa. Nyt kaikki aiheet, Suomi → Espanja.');
});

// ---------- collected stars ----------

test('D3: parseStars gives 0 for missing, non-numeric, negative or infinite values and rounds a fraction down', () => {
  for (const raw of [null, undefined, '', 'abc', '-3', 'Infinity', '0.5', 'NaN']) assert.equal(parseStars(raw), 0, String(raw));
  assert.equal(parseStars('2.7'), 2);
  assert.equal(parseStars('12'), 12);
  assert.equal(parseStars('0'), 0);
  assert.equal(parseStars('1000'), 1000);
});

test('SEI-4 / 9, 11: loadStars and saveStars use espanja.stars, never es_stars, and survive a throwing storage', () => {
  const reads = [];
  const store = new Map([['es_stars', '7'], [STARS_KEY, '3']]);
  const storage = {
    getItem: (k) => { reads.push(k); return store.has(k) ? store.get(k) : null; },
    setItem: (k, v) => store.set(k, v),
  };
  assert.equal(loadStars(() => storage), 3);
  assert.deepEqual(reads, [STARS_KEY]);
  store.delete(STARS_KEY);
  assert.equal(loadStars(() => storage), 0); // the old key is not read
  assert.equal(saveStars(() => storage, 5), true);
  assert.equal(store.get(STARS_KEY), '5');
  assert.equal(store.get('es_stars'), '7');

  const throwing = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } };
  assert.equal(loadStars(() => throwing), null);
  assert.equal(saveStars(() => throwing, 1), false);
  assert.equal(loadStars(() => { throw new Error('no storage'); }), null);
  assert.equal(saveStars(() => { throw new Error('no storage'); }, 1), false);
});

// ---------- D7 and import ----------

test('D7: the praise list equals Matikka\'s', () => {
  assert.deepEqual(PRAISE, MATIKKA_PRAISE);
});

test('importing the logic and the game touches no document', async () => {
  assert.equal(typeof document, 'undefined');
  const game = await import('../../app/src/games/espanja.js');
  assert.equal(typeof game.default.create, 'function');
});
