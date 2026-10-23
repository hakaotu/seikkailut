import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import {
  MAX_QUESTIONS, LEVELS, OPS, generateProblem, makeChoices, newRound, pickLevel, toggleOp,
  typeDigit, deleteDigit, starsFor, endTier, endTexts, problemSpeech, problemLabel, wrongTexts,
  settingsLine, settingsLabel,
} from '../../app/src/games/matikka-logic.js';

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

const N = 5000;
const ALL = { add: true, sub: true, mul: true };
const only = (op) => ({ add: op === 'add', sub: op === 'sub', mul: op === 'mul' });
const RESULT = { add: (a, b) => a + b, sub: (a, b) => a - b, mul: (a, b) => a * b };

function problems(level, op, seed) {
  const rng = seeded(seed);
  return Array.from({ length: N }, () => generateProblem(level, only(op), rng));
}

test('every answer equals the operation result, and only the chosen op appears', () => {
  for (const level of Object.keys(LEVELS)) {
    for (const op of Object.keys(OPS)) {
      for (const p of problems(level, op, 1)) {
        assert.equal(p.op, op, `${level} ${op}`);
        assert.equal(p.answer, RESULT[op](p.a, p.b), `${level} ${op}: ${p.a} ${p.b}`);
      }
    }
  }
});

test('Helppo ranges', () => {
  for (const p of problems('easy', 'add', 2)) assert.ok(p.a >= 0 && p.b >= 0 && p.a + p.b <= 10, `easy add: ${p.a} + ${p.b}`);
  for (const p of problems('easy', 'sub', 3)) assert.ok(p.a <= 10 && p.b >= 0 && p.a - p.b >= 0 && p.a - p.b <= 10, `easy sub: ${p.a} - ${p.b}`);
  for (const p of problems('easy', 'mul', 4)) assert.ok(p.a >= 1 && p.a <= 5 && p.b >= 1 && p.b <= 5, `easy mul: ${p.a} x ${p.b}`);
});

test('Keskitaso ranges', () => {
  for (const p of problems('medium', 'add', 5)) assert.ok(p.a <= 20 && p.b <= 20 && p.a + p.b <= 20, `medium add: ${p.a} + ${p.b}`);
  for (const p of problems('medium', 'sub', 6)) assert.ok(p.a <= 20 && p.b <= 20 && p.a - p.b >= 0, `medium sub: ${p.a} - ${p.b}`);
  for (const p of problems('medium', 'mul', 7)) assert.ok(p.a >= 1 && p.a <= 5 && p.b >= 1 && p.b <= 10, `medium mul: ${p.a} x ${p.b}`);
});

test('Vaikea ranges', () => {
  for (const p of problems('hard', 'add', 8)) assert.ok(p.a + p.b <= 100, `hard add: ${p.a} + ${p.b}`);
  for (const p of problems('hard', 'sub', 9)) assert.ok(p.a >= 10 && p.a <= 100 && p.b <= p.a && p.a - p.b >= 0, `hard sub: ${p.a} - ${p.b}`);
  for (const p of problems('hard', 'mul', 10)) assert.ok(p.a >= 2 && p.a <= 10 && p.b >= 2 && p.b <= 10, `hard mul: ${p.a} x ${p.b}`);
});

test('with only multiplication on, every problem is a multiplication', () => {
  const rng = seeded(11);
  for (let i = 0; i < N; i++) assert.equal(generateProblem('medium', { add: false, sub: false, mul: true }, rng).op, 'mul');
});

test('with several ops on, all of them appear', () => {
  const rng = seeded(12);
  const seen = new Set();
  for (let i = 0; i < 200; i++) seen.add(generateProblem('easy', ALL, rng).op);
  assert.deepEqual([...seen].sort(), ['add', 'mul', 'sub']);
});

test('makeChoices gives four distinct, non-negative values with exactly one right answer', () => {
  const rng = seeded(13);
  for (const level of Object.keys(LEVELS)) {
    for (let i = 0; i < N; i++) {
      const { answer } = generateProblem(level, ALL, rng);
      const choices = makeChoices(answer, level, rng);
      assert.equal(choices.length, 4, `${level} answer ${answer}`);
      assert.equal(new Set(choices).size, 4, `${level} answer ${answer}: ${choices}`);
      assert.ok(choices.every((c) => Number.isInteger(c) && c >= 0), `${level} answer ${answer}: ${choices}`);
      assert.equal(choices.filter((c) => c === answer).length, 1, `${level} answer ${answer}: ${choices}`);
    }
  }
});

// A loop that never ends is synchronous, so node:test's own `timeout` could not interrupt it and
// the run would hang. The call therefore runs in a worker thread that is cut off after 1000 ms.
function choicesWithinOneSecond(answer, level, value) {
  const code = `
    const { workerData, parentPort } = require('node:worker_threads');
    import(workerData.url).then((m) => parentPort.postMessage(m.makeChoices(workerData.answer, workerData.level, () => workerData.value)));
  `;
  const url = new URL('../../app/src/games/matikka-logic.js', import.meta.url).href;
  return new Promise((resolve, reject) => {
    const worker = new Worker(code, { eval: true, workerData: { url, answer, level, value } });
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error(`makeChoices(${answer}, '${level}') did not return within 1000 ms`));
    }, 1000);
    worker.once('message', (m) => { clearTimeout(timer); resolve(m); });
    worker.once('error', (e) => { clearTimeout(timer); reject(e); });
  });
}

// With rng fixed at 0.65 every random try is answer + 2 (range 5: floor(0.65 * 11) - 5), so the
// random phase finds one wrong value and the old fill (`answer + choices.size`) added 7 for ever.
test('the fill of makeChoices ends', async () => {
  const choices = await choicesWithinOneSecond(5, 'easy', 0.65);
  assert.equal(new Set(choices).size, 4);
  assert.ok(choices.includes(5));
});

test('the fill of makeChoices ends when the answer is 0 and every try is the answer', async () => {
  const choices = await choicesWithinOneSecond(0, 'easy', 0);
  assert.equal(new Set(choices).size, 4);
  assert.ok(choices.every((c) => c >= 0));
  assert.ok(choices.includes(0));
});

test('newRound: ten problems, options only on Helppo, nothing answered', () => {
  const easy = newRound({ level: 'easy', ops: ALL }, seeded(14));
  assert.equal(easy.problems.length, MAX_QUESTIONS);
  assert.ok(easy.problems.every((p) => p.choices.length === 4 && p.choices.includes(p.answer) && p.given === null));
  const medium = newRound({ level: 'medium', ops: ALL }, seeded(15));
  assert.ok(medium.problems.every((p) => p.choices === null));
  assert.deepEqual([easy.index, easy.score, easy.answered, easy.streak, easy.typed, easy.endShown], [0, 0, 0, 0, '', false]);
});

test('pickLevel: Vaikea turns multiplication on, the other levels leave the ops alone', () => {
  const off = { level: 'easy', ops: { add: true, sub: true, mul: false } };
  assert.deepEqual(pickLevel(off, 'hard'), { level: 'hard', ops: { add: true, sub: true, mul: true } });
  assert.deepEqual(pickLevel(off, 'medium'), { level: 'medium', ops: { add: true, sub: true, mul: false } });
  assert.deepEqual(pickLevel(off, 'easy'), { level: 'easy', ops: { add: true, sub: true, mul: false } });
  const on = { level: 'hard', ops: { add: false, sub: false, mul: true } };
  assert.deepEqual(pickLevel(on, 'hard').ops, { add: false, sub: false, mul: true });
  assert.deepEqual(off.ops, { add: true, sub: true, mul: false }, 'the draft is not changed');
});

test('toggleOp: the last remaining op is refused, anything else flips', () => {
  assert.deepEqual(toggleOp({ add: true, sub: false, mul: false }, 'add'), { ops: { add: true, sub: false, mul: false }, refused: true });
  assert.deepEqual(toggleOp({ add: true, sub: true, mul: false }, 'sub'), { ops: { add: true, sub: false, mul: false }, refused: false });
  assert.deepEqual(toggleOp({ add: true, sub: false, mul: false }, 'mul'), { ops: { add: true, sub: false, mul: true }, refused: false });
  assert.deepEqual(toggleOp({ add: true, sub: false, mul: false }, 'sub').ops.sub, true);
});

test('typing: at most four digits, a lone 0 is replaced, delete on empty does nothing', () => {
  assert.equal(typeDigit('123', '4'), '1234');
  assert.equal(typeDigit('1234', '5'), '1234');
  assert.equal(typeDigit('0', '7'), '7');
  assert.equal(typeDigit('', '0'), '0');
  assert.equal(typeDigit('0', '0'), '0');
  assert.equal(typeDigit('', '7'), '7');
  assert.equal(deleteDigit(''), '');
  assert.equal(deleteDigit('12'), '1');
});

test('stars: nothing answered gives none, and the table for ten answers', () => {
  assert.equal(starsFor(0, 0), 0);
  assert.equal(starsFor(0, 1), 0);
  assert.equal(starsFor(1, 2), 3);
  assert.deepEqual(Array.from({ length: 11 }, (_, n) => starsFor(n, 10)), [0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
});

test('speech and labels use plus, miinus and kertaa', () => {
  assert.equal(problemSpeech({ a: 7, b: 5, op: 'add' }), '7 plus 5');
  assert.equal(problemSpeech({ a: 9, b: 3, op: 'sub' }), '9 miinus 3');
  assert.equal(problemSpeech({ a: 4, b: 6, op: 'mul' }), '4 kertaa 6');
  assert.equal(problemLabel({ a: 7, b: 5, op: 'add' }, 5), 'Lasku 5 / 10: 7 plus 5');
});

test('the wrong-answer text promises no retry', () => {
  assert.deepEqual(wrongTexts(12), {
    title: 'Ei ihan.',
    line: 'Oikea vastaus on 12.',
    speech: 'Ei ihan. Oikea vastaus on 12.',
  });
  const all = Object.values(wrongTexts(12)).join(' ');
  assert.doesNotMatch(all, /yrit|kokeil|uudelleen|uudestaan/i);
});

test('end screen: three tiers, and only 10 / 10 is a matikkamestari', () => {
  assert.equal(endTier(10), 'perfect');
  for (const n of [7, 8, 9]) assert.equal(endTier(n), 'good');
  for (const n of [0, 1, 6]) assert.equal(endTier(n), 'done');
  assert.equal(endTexts(2).speech, 'Kierros valmis. Sait 2 oikein. Harjoittelemalla oppii!');
  assert.equal(endTexts(0).speech, 'Kierros valmis. Harjoittelemalla oppii!');
  assert.equal(endTexts(8).title, 'Hienoa!');
  assert.equal(endTexts(8).speech, 'Hienoa! Sait 8 oikein. Hyvin laskettu!');
  assert.deepEqual(
    [endTexts(10).title, endTexts(10).line, endTexts(10).speech],
    ['Täydellinen tulos!', 'Olet matikkamestari!', 'Täydellinen tulos! Sait 10 oikein. Olet matikkamestari!'],
  );
  for (let n = 0; n <= 9; n++) {
    const t = endTexts(n);
    assert.doesNotMatch(`${t.title} ${t.line} ${t.speech}`, /mestari|mahtavaa/i, `score ${n}`);
  }
});

test('the settings line lists the level and the symbols in the fixed order', () => {
  assert.equal(settingsLine({ level: 'easy', ops: { add: true, sub: true, mul: false } }), 'Helppo · + −');
  assert.equal(settingsLine({ level: 'hard', ops: { add: true, sub: false, mul: true } }), 'Vaikea · + ×');
  assert.equal(
    settingsLabel({ level: 'easy', ops: { add: true, sub: true, mul: false } }),
    'Taso Helppo. Laskut: yhteenlasku, vähennyslasku.',
  );
});
