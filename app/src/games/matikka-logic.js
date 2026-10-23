// Matikka's rules, ranges and texts. Pure: no DOM, nothing read at import, so node:test can run it.
// Every random choice takes an `rng` (a function returning [0, 1)); the default reads Math.random
// when it is called, so a test can seed it either way.

export const MAX_QUESTIONS = 10;

export const LEVELS = {
  easy: { name: 'Helppo', typed: false },
  medium: { name: 'Keskitaso', typed: true },
  hard: { name: 'Vaikea', typed: true },
};

// Order matters: it is the order of the symbols in the settings line and of the toggles.
export const OPS = {
  add: { symbol: '+', word: 'plus', label: 'yhteenlasku' },
  sub: { symbol: '−', word: 'miinus', label: 'vähennyslasku' },
  mul: { symbol: '×', word: 'kertaa', label: 'kertolasku' },
};

export const PRAISE = ['Hienoa! 🌟', 'Oikein! ⭐', 'Mahtavaa! 🎉', 'Tosi hyvä! 🏆', 'Loistavaa! 🌈', 'Upea! 💪', 'Bravo! 🎊', 'Mestari! 🧙'];

export const CHOOSE_SPEECH = 'Mitä lasketaan? Valitse taso ja laskut. Paina sitten Aloita.';

const defaultRng = () => Math.random();
const rand = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

// ---------- problems ----------

// ops = { add, sub, mul } booleans. Ranges are the old game's (originals/matikkaseikkailu.html
// r. 361-406); subtraction never goes below zero.
export function generateProblem(level, ops, rng = defaultRng) {
  const active = Object.keys(OPS).filter((k) => ops[k]);
  if (active.length === 0) return { a: 1, b: 1, op: 'add', answer: 2 };
  const op = active[rand(rng, 0, active.length - 1)];
  let a;
  let b;
  if (level === 'easy') {
    if (op === 'add') {
      a = rand(rng, 0, 10);
      b = rand(rng, 0, 10 - a);
    } else if (op === 'sub') {
      a = rand(rng, 1, 10);
      b = rand(rng, 0, a);
    } else {
      a = rand(rng, 1, 5);
      b = rand(rng, 1, 5);
    }
  } else if (level === 'medium') {
    if (op === 'add') {
      a = rand(rng, 1, 15);
      b = rand(rng, 1, 20 - a);
    } else if (op === 'sub') {
      a = rand(rng, 2, 20);
      b = rand(rng, 1, a);
    } else {
      a = rand(rng, 1, 5);
      b = rand(rng, 1, 10);
    }
  } else if (op === 'add') {
    a = rand(rng, 5, 80);
    b = rand(rng, 5, 100 - a);
  } else if (op === 'sub') {
    a = rand(rng, 10, 100);
    b = rand(rng, 1, a);
  } else {
    a = rand(rng, 2, 10);
    b = rand(rng, 2, 10);
  }
  const answer = op === 'add' ? a + b : op === 'sub' ? a - b : a * b;
  return { a, b, op, answer };
}

const CHOICE_RANGE = { easy: 5, medium: 8, hard: 15 };

// Four distinct choices, none negative, exactly one equal to `answer`.
export function makeChoices(answer, level, rng = defaultRng) {
  const range = CHOICE_RANGE[level];
  const choices = new Set([answer]);
  for (let tries = 0; choices.size < 4 && tries < 50; tries++) {
    let wrong = answer + rand(rng, -range, range);
    if (wrong < 0) wrong = rand(rng, 0, range);
    if (wrong !== answer) choices.add(wrong);
  }
  // The old fill (`answer + choices.size`) could add the same number for ever. Walking outwards
  // from the answer adds a new candidate each step, so it ends by k = 3.
  for (let k = 1; choices.size < 4; k++) {
    choices.add(answer + k);
    if (choices.size < 4 && answer - k >= 0) choices.add(answer - k);
  }
  const list = [...choices];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

export function newRound(settings, rng = defaultRng) {
  const typed = LEVELS[settings.level].typed;
  const problems = [];
  for (let i = 0; i < MAX_QUESTIONS; i++) {
    const p = generateProblem(settings.level, settings.ops, rng);
    problems.push({
      ...p,
      choices: typed ? null : makeChoices(p.answer, settings.level, rng),
      given: null,
      correct: null,
      praise: null,
    });
  }
  return { problems, index: 0, score: 0, answered: 0, streak: 0, typed: '', endShown: false };
}

export function pickPraise(rng = defaultRng) {
  return PRAISE[rand(rng, 0, PRAISE.length - 1)];
}

// ---------- the choose screen ----------

// draft = { level, ops }. Vaikea turns multiplication on (old r. 430-433); the other levels
// leave the toggles alone.
export function pickLevel(draft, level) {
  const ops = { ...draft.ops };
  if (level === 'hard') ops.mul = true;
  return { level, ops };
}

// The last remaining toggle cannot be turned off: `refused` says so.
export function toggleOp(ops, op) {
  const count = Object.keys(OPS).filter((k) => ops[k]).length;
  if (ops[op] && count <= 1) return { ops: { ...ops }, refused: true };
  return { ops: { ...ops, [op]: !ops[op] }, refused: false };
}

// ---------- typing ----------

export function typeDigit(value, d) {
  if (value.length >= 4) return value;
  if (value === '0') return d;
  return value + d;
}

export function deleteDigit(value) {
  return value.slice(0, -1);
}

// ---------- scoring and texts ----------

// The old formula (r. 647-648) with the multiplication first, so a half is computed from integers.
export function starsFor(score, answered) {
  return answered === 0 ? 0 : Math.round((score * 5) / answered);
}

export function endTier(score) {
  if (score >= MAX_QUESTIONS) return 'perfect';
  if (score >= 7) return 'good';
  return 'done';
}

export function endTexts(score) {
  const tier = endTier(score);
  if (tier === 'perfect') {
    return {
      title: 'Täydellinen tulos!',
      line: 'Olet matikkamestari!',
      speech: `Täydellinen tulos! Sait ${score} oikein. Olet matikkamestari!`,
    };
  }
  if (tier === 'good') {
    return {
      title: 'Hienoa!',
      line: 'Hyvin laskettu!',
      speech: `Hienoa! Sait ${score} oikein. Hyvin laskettu!`,
    };
  }
  return {
    title: 'Kierros valmis!',
    line: 'Harjoittelemalla oppii!',
    speech: score > 0
      ? `Kierros valmis. Sait ${score} oikein. Harjoittelemalla oppii!`
      : 'Kierros valmis. Harjoittelemalla oppii!',
  };
}

export function problemSpeech(p) {
  return `${p.a} ${OPS[p.op].word} ${p.b}`;
}

// n is 1-based.
export function problemLabel(p, n) {
  return `Lasku ${n} / ${MAX_QUESTIONS}: ${problemSpeech(p)}`;
}

export function wrongTexts(answer) {
  return {
    title: 'Ei ihan.',
    line: `Oikea vastaus on ${answer}.`,
    speech: `Ei ihan. Oikea vastaus on ${answer}.`,
  };
}

// `Helppo · + −`
export function settingsLine(settings) {
  const symbols = Object.keys(OPS).filter((k) => settings.ops[k]).map((k) => OPS[k].symbol);
  return `${LEVELS[settings.level].name} · ${symbols.join(' ')}`;
}

// The same for a screen reader: `Taso Helppo. Laskut: yhteenlasku, vähennyslasku.`
export function settingsLabel(settings) {
  const labels = Object.keys(OPS).filter((k) => settings.ops[k]).map((k) => OPS[k].label);
  return `Taso ${LEVELS[settings.level].name}. Laskut: ${labels.join(', ')}.`;
}
