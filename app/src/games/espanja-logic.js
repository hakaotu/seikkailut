// Espanja's words, rules and texts. Pure: no DOM, nothing read at import, so node:test can run it.
// Every random choice takes an `rng` (a function returning [0, 1)); the default reads Math.random
// when it is called, so a test can seed it either way. Design: docs/design/sei-4.md.

export const MAX_QUESTIONS = 10;
export const STARS_KEY = 'espanja.stars'; // registry.js rule 6: the game id first. The old key was es_stars.

// The old game's 18 pairs in the old order (originals/espanjavalmentaja.html r. 193-213), with the three
// translations fixed in SEI-9 (Q32): adiós, buenas tardes, por favor.
export const WORDS = [
  { es: 'hola', fi: 'hei', topic: 'tervehdys' },
  { es: 'adiós', fi: 'näkemiin', topic: 'tervehdys' },
  { es: 'buenos días', fi: 'hyvää huomenta', topic: 'tervehdys' },
  { es: 'buenas tardes', fi: 'hyvää iltapäivää', topic: 'tervehdys' },
  { es: 'buenas noches', fi: 'hyvää yötä', topic: 'tervehdys' },
  { es: 'gracias', fi: 'kiitos', topic: 'tervehdys' },
  { es: 'por favor', fi: 'ole kiltti', topic: 'tervehdys' },
  { es: '¿qué tal?', fi: 'mitä kuuluu?', topic: 'tervehdys' },
  { es: 'rojo', fi: 'punainen', topic: 'väri' },
  { es: 'amarillo', fi: 'keltainen', topic: 'väri' },
  { es: 'azul', fi: 'sininen', topic: 'väri' },
  { es: 'verde', fi: 'vihreä', topic: 'väri' },
  { es: 'blanco', fi: 'valkoinen', topic: 'väri' },
  { es: 'negro', fi: 'musta', topic: 'väri' },
  { es: 'naranja', fi: 'oranssi', topic: 'väri' },
  { es: 'morado', fi: 'violetti', topic: 'väri' },
  { es: 'marrón', fi: 'ruskea', topic: 'väri' },
  { es: 'gris', fi: 'harmaa', topic: 'väri' },
];

// The same praise as Matikka (design 1, "Kehut"). A copy on purpose; a unit test keeps them equal.
export const PRAISE = ['Hienoa! 🌟', 'Oikein! ⭐', 'Mahtavaa! 🎉', 'Tosi hyvä! 🏆', 'Loistavaa! 🌈', 'Upea! 💪', 'Bravo! 🎊', 'Mestari! 🧙'];

export const DIRECTIONS = {
  fi2es: { name: 'Suomi → Espanja', how: 'Valitse espanjaksi' },
  es2fi: { name: 'Espanja → Suomi', how: 'Valitse suomeksi' },
};

const RATE = 0.9; // old r. 234
const OPTION_PAUSE_MS = 500; // design 3.8: silence before options 2-4 when Kuuntele reads all four

const defaultRng = () => Math.random();

// ---------- rounds ----------

// Fisher-Yates. Returns a new array.
export function shuffle(list, rng = defaultRng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Ten distinct words. Each question keeps its four options, drawn now, so a return shows the same
// ones in the same order. Wrong options come from the question's own topic (old r. 287-290).
export function newRound(direction, rng = defaultRng) {
  const questions = shuffle(WORDS, rng)
    .slice(0, MAX_QUESTIONS)
    .map((pair) => {
      const others = WORDS.filter((w) => w !== pair && w.topic === pair.topic);
      const options = shuffle([pair, ...shuffle(others, rng).slice(0, 3)], rng);
      return { pair, options, result: 'open', chosen: null, praise: null };
    });
  return { direction, questions, index: 0, endShown: false, starGiven: false };
}

export function pickPraise(rng = defaultRng) {
  return PRAISE[Math.floor(rng() * PRAISE.length)];
}

// ---------- a question ----------

// The word that is asked and the text of an option: fi2es asks Finnish and answers in Spanish.
export const promptOf = (pair, dir) => (dir === 'fi2es' ? pair.fi : pair.es);
export const optionText = (pair, dir) => (dir === 'fi2es' ? pair.es : pair.fi);

// What is sent to the Spanish voice: ¡ ! ¿ ? removed (old r. 331).
export const spoken = (text) => text.replace(/[¡!¿?]/g, '').trim();

// `Aihe: väri. Valitse espanjaksi.`
export const hintLine = (pair, dir) => `Aihe: ${pair.topic}. ${DIRECTIONS[dir].how}.`;

// The pair, Spanish first in both directions: `rojo = punainen`.
export const pairLine = (pair) => `${pair.es} = ${pair.fi}`;

// `option` is one of q.options (compared by identity). Does nothing once answered or skipped.
export function choose(q, option, rng = defaultRng) {
  if (q.result !== 'open') return;
  q.chosen = option;
  q.result = option === q.pair ? 'right' : 'wrong';
  if (q.result === 'right') q.praise = pickPraise(rng);
}

export function skip(q) {
  if (q.result !== 'open') return;
  q.result = 'skipped';
}

// a = right, b = wrong, c = skipped, done = all three
export function counts(round) {
  const n = (r) => round.questions.filter((q) => q.result === r).length;
  const a = n('right');
  const b = n('wrong');
  const c = n('skipped');
  return { a, b, c, done: a + b + c };
}

// ---------- speech ----------

// What Kuuntele reads (design 3.8). `screen` is 'choose' | 'question' | 'end'.
export function listenParts(screen, round) {
  if (screen === 'choose') return [{ text: 'hola', rate: RATE }];
  const { a, b, c } = counts(round);
  if (screen === 'end') return [{ text: endTexts(a, b, c).speech, rate: RATE }];
  const q = round.questions[round.index];
  if (round.direction === 'fi2es' && q.result === 'open') {
    // The four options in the order they are shown, each after a pause (the old 600 ms timers cut words off).
    return q.options.map((o, i) => ({
      text: spoken(o.es),
      rate: RATE,
      ...(i > 0 ? { pauseMs: OPTION_PAUSE_MS } : {}),
    }));
  }
  return [{ text: spoken(q.pair.es), rate: RATE }];
}

// The reading after an answer or a skip: the Spanish word, whichever way the game is played.
export const answerParts = (q) => [{ text: spoken(q.pair.es), rate: RATE }];

// ---------- the end screen ----------

export function endTier(a) {
  if (a >= MAX_QUESTIONS) return 'perfect';
  if (a >= 8) return 'good';
  return 'done';
}

export const earnsStar = (a) => a >= 8;

const PHRASES = {
  perfect: { title: 'Täydellinen tulos!', es: '¡Perfecto!', fi: 'Täydellistä!' },
  good: { title: 'Hienoa!', es: '¡Muy bien!', fi: 'Tosi hyvä!' },
  done: { title: 'Kierros valmis!', es: '¡Sigue practicando!', fi: 'Jatka harjoittelua!' },
};

// Rows: right always, wrong and skipped only when there are some (design 3.7).
export function endTexts(a, b, c) {
  const tier = endTier(a);
  const p = PHRASES[tier];
  const rows = [{ kind: 'a', text: `${a} oikein` }];
  if (b >= 1) rows.push({ kind: 'b', text: `${b} väärin` });
  if (c >= 1) rows.push({ kind: 'c', text: `${c} ohitettu` });
  return {
    tier,
    title: p.title,
    score: `${a} / ${MAX_QUESTIONS} oikein`,
    rows,
    starLine: earnsStar(a) ? 'Sait tähden!' : 'Tähti tulee, kun saat 8 oikein.',
    phraseEs: p.es,
    phraseFi: p.fi,
    speech: spoken(p.es),
  };
}

// ---------- the choose screen ----------

// A round is open and the card is the other direction: only a new round can follow.
export function chooseHint(draftDir, round) {
  return round && !round.endShown && round.direction !== draftDir ? 'Toinen suunta alkaa uudella kierroksella.' : '';
}

// ---------- texts for the game's own live region (design 8) ----------

const current = (round) => round.questions[round.index];
const pointsLine = (round) => {
  const { a, done } = counts(round);
  return `Pisteet ${a} / ${done}.`;
};

export function questionLive(round) {
  const q = current(round);
  const dir = round.direction;
  return `Kysymys ${round.index + 1} / ${MAX_QUESTIONS}: ${promptOf(q.pair, dir)}. Aihe ${q.pair.topic}. ${DIRECTIONS[dir].how}.`;
}

// The sentence about the wait is added only when the game starts one (items 1-9).
export function rightLive(round, autoNext) {
  const q = current(round);
  return `Oikein! ${q.pair.es} on ${q.pair.fi}. ${pointsLine(round)}${autoNext ? ' Seuraava kysymys tulee itsestään.' : ''}`;
}

export function wrongLive(round) {
  const q = current(round);
  const dir = round.direction;
  return `Ei ihan. Oikea vastaus on ${optionText(q.pair, dir)}. Sinä valitsit ${optionText(q.chosen, dir)}. ${pointsLine(round)}`;
}

export function skippedLive(round) {
  const q = current(round);
  return `Ohitettu. Oikea vastaus on ${optionText(q.pair, round.direction)}. ${pointsLine(round)}`;
}

export function endLive(round, starGot, total) {
  const { a, b, c } = counts(round);
  const t = endTexts(a, b, c);
  const skipped = c >= 1 ? ` ${c} ohitettu.` : '';
  const star = starGot ? ` Sait tähden! Tähtiä nyt ${total}.` : ' Tähti tulee, kun saat 8 oikein.';
  return `${t.title} ${a} / ${MAX_QUESTIONS} oikein.${skipped}${star}`;
}

// ---------- collected stars (design 5) ----------

// A missing, non-numeric, non-finite or negative value is 0; a fraction is rounded down.
export function parseStars(raw) {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// `getStorage` is called inside the try: reading window.localStorage itself throws when storage is
// blocked. null means "keep what is in memory".
export function loadStars(getStorage) {
  try {
    return parseStars(getStorage().getItem(STARS_KEY));
  } catch {
    return null;
  }
}

export function saveStars(getStorage, n) {
  try {
    getStorage().setItem(STARS_KEY, String(n));
    return true;
  } catch {
    return false;
  }
}
