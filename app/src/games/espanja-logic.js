// Espanja's words, rules and texts. Pure: no DOM, nothing read at import, so node:test can run it.
// Every random choice takes an `rng` (a function returning [0, 1)); the default reads Math.random
// when it is called, so a test can seed it either way. Design: docs/design/sei-4.md.

export const MAX_QUESTIONS = 10; // the longest round; a topic with fewer words gives a shorter one (SEI-57)
export const STARS_KEY = 'espanja.stars'; // registry.js rule 6: the game id first. The old key was es_stars.

// The first 18 pairs are the old game's, in the old order (originals/espanjavalmentaja.html r. 193-213), with the three
// translations fixed in SEI-9 (Q32): adiós, buenas tardes, por favor. The rest: docs/design/sei-50.md §4.4.
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
  // SEI-52: numero
  { es: 'uno', fi: 'yksi', topic: 'numero' },
  { es: 'dos', fi: 'kaksi', topic: 'numero' },
  { es: 'tres', fi: 'kolme', topic: 'numero' },
  { es: 'cuatro', fi: 'neljä', topic: 'numero' },
  { es: 'cinco', fi: 'viisi', topic: 'numero' },
  { es: 'seis', fi: 'kuusi', topic: 'numero' },
  { es: 'siete', fi: 'seitsemän', topic: 'numero' },
  { es: 'ocho', fi: 'kahdeksan', topic: 'numero' },
  { es: 'nueve', fi: 'yhdeksän', topic: 'numero' },
  { es: 'diez', fi: 'kymmenen', topic: 'numero' },
  { es: 'once', fi: 'yksitoista', topic: 'numero' },
  { es: 'doce', fi: 'kaksitoista', topic: 'numero' },
  // SEI-53: eläin
  { es: 'perro', fi: 'koira', topic: 'eläin' },
  { es: 'gato', fi: 'kissa', topic: 'eläin' },
  { es: 'caballo', fi: 'hevonen', topic: 'eläin' },
  { es: 'vaca', fi: 'lehmä', topic: 'eläin' },
  { es: 'cerdo', fi: 'sika', topic: 'eläin' },
  { es: 'oveja', fi: 'lammas', topic: 'eläin' },
  { es: 'pájaro', fi: 'lintu', topic: 'eläin' },
  { es: 'pez', fi: 'kala', topic: 'eläin' },
  { es: 'ratón', fi: 'hiiri', topic: 'eläin' },
  { es: 'conejo', fi: 'kani', topic: 'eläin' },
  { es: 'pato', fi: 'ankka', topic: 'eläin' },
  { es: 'gallina', fi: 'kana', topic: 'eläin' },
  { es: 'león', fi: 'leijona', topic: 'eläin' },
  { es: 'elefante', fi: 'norsu', topic: 'eläin' },
  { es: 'mono', fi: 'apina', topic: 'eläin' },
  { es: 'oso', fi: 'karhu', topic: 'eläin' },
  // SEI-54: ruoka
  { es: 'pan', fi: 'leipä', topic: 'ruoka' },
  { es: 'leche', fi: 'maito', topic: 'ruoka' },
  { es: 'agua', fi: 'vesi', topic: 'ruoka' },
  { es: 'zumo', fi: 'mehu', topic: 'ruoka' },
  { es: 'manzana', fi: 'omena', topic: 'ruoka' },
  { es: 'plátano', fi: 'banaani', topic: 'ruoka' },
  { es: 'fresa', fi: 'mansikka', topic: 'ruoka' },
  { es: 'pera', fi: 'päärynä', topic: 'ruoka' },
  { es: 'queso', fi: 'juusto', topic: 'ruoka' },
  { es: 'huevo', fi: 'muna', topic: 'ruoka' },
  { es: 'arroz', fi: 'riisi', topic: 'ruoka' },
  { es: 'sopa', fi: 'keitto', topic: 'ruoka' },
  { es: 'helado', fi: 'jäätelö', topic: 'ruoka' },
  { es: 'galleta', fi: 'keksi', topic: 'ruoka' },
  { es: 'patata', fi: 'peruna', topic: 'ruoka' },
  { es: 'zanahoria', fi: 'porkkana', topic: 'ruoka' },
  // SEI-55: viikonpäivä
  { es: 'lunes', fi: 'maanantai', topic: 'viikonpäivä' },
  { es: 'martes', fi: 'tiistai', topic: 'viikonpäivä' },
  { es: 'miércoles', fi: 'keskiviikko', topic: 'viikonpäivä' },
  { es: 'jueves', fi: 'torstai', topic: 'viikonpäivä' },
  { es: 'viernes', fi: 'perjantai', topic: 'viikonpäivä' },
  { es: 'sábado', fi: 'lauantai', topic: 'viikonpäivä' },
  { es: 'domingo', fi: 'sunnuntai', topic: 'viikonpäivä' },
  // SEI-56: perhe
  { es: 'madre', fi: 'äiti', topic: 'perhe' },
  { es: 'padre', fi: 'isä', topic: 'perhe' },
  { es: 'hermano', fi: 'veli', topic: 'perhe' },
  { es: 'hermana', fi: 'sisko', topic: 'perhe' },
  { es: 'abuelo', fi: 'isoisä', topic: 'perhe' },
  { es: 'abuela', fi: 'isoäiti', topic: 'perhe' },
  { es: 'hijo', fi: 'poika', topic: 'perhe' },
  { es: 'hija', fi: 'tytär', topic: 'perhe' },
  { es: 'bebé', fi: 'vauva', topic: 'perhe' },
  { es: 'tía', fi: 'täti', topic: 'perhe' },
];

export const ALL_TOPICS = 'kaikki';
// design sei-57 §3.1: order = WORDS order; `label` is the tile text (soft hyphens for < 420 px), `name` the accessible name
export const TOPICS = [
  { id: 'kaikki', emoji: '🎲', label: 'Kaikki', name: 'Kaikki aiheet' },
  { id: 'tervehdys', emoji: '👋', label: 'Terveh­dykset', name: 'Tervehdykset' },
  { id: 'väri', emoji: '🎨', label: 'Värit', name: 'Värit' },
  { id: 'numero', emoji: '🔢', label: 'Numerot', name: 'Numerot' },
  { id: 'eläin', emoji: '🐶', label: 'Eläimet', name: 'Eläimet' },
  { id: 'ruoka', emoji: '🍎', label: 'Ruoka', name: 'Ruoka' },
  { id: 'viikonpäivä', emoji: '📅', label: 'Viikon­päivät', name: 'Viikonpäivät' },
  { id: 'perhe', emoji: '👪', label: 'Perhe', name: 'Perhe' },
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

// The words of a topic; `kaikki` is WORDS itself, so the default round draws exactly as it did before topics.
export const wordsIn = (topic) => (topic === ALL_TOPICS ? WORDS : WORDS.filter((w) => w.topic === topic));

// Ten words, or all of a smaller topic.
export const roundLength = (topic) => Math.min(MAX_QUESTIONS, wordsIn(topic).length);

// 80 % of the round, rounded up (Q57): 10 -> 8, 8 -> 7, 7 -> 6. Integer arithmetic: 0.8 * n is a float product.
export const starThreshold = (n) => Math.ceil((4 * n) / 5);

// Distinct words of the topic. Each question keeps its four options, drawn now, so a return shows the same
// ones in the same order. Wrong options come from the question's own topic (old r. 287-290).
export function newRound(direction, topic, rng = defaultRng) {
  const questions = shuffle(wordsIn(topic), rng)
    .slice(0, roundLength(topic))
    .map((pair) => {
      const others = WORDS.filter((w) => w !== pair && w.topic === pair.topic);
      const options = shuffle([pair, ...shuffle(others, rng).slice(0, 3)], rng);
      return { pair, options, result: 'open', chosen: null, praise: null };
    });
  return { direction, topic, questions, index: 0, endShown: false, starGiven: false };
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
  if (screen === 'end') return [{ text: endTexts(a, b, c, round.questions.length).speech, rate: RATE }];
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

export function endTier(a, n) {
  if (a >= n) return 'perfect';
  if (a >= starThreshold(n)) return 'good';
  return 'done';
}

export const earnsStar = (a, n) => a >= starThreshold(n);

const PHRASES = {
  perfect: { title: 'Täydellinen tulos!', es: '¡Perfecto!', fi: 'Täydellistä!' },
  good: { title: 'Hienoa!', es: '¡Muy bien!', fi: 'Tosi hyvä!' },
  done: { title: 'Kierros valmis!', es: '¡Sigue practicando!', fi: 'Jatka harjoittelua!' },
};

// Rows: right always, wrong and skipped only when there are some (design 3.7).
export function endTexts(a, b, c, n) {
  const tier = endTier(a, n);
  const p = PHRASES[tier];
  const rows = [{ kind: 'a', text: `${a} oikein` }];
  if (b >= 1) rows.push({ kind: 'b', text: `${b} väärin` });
  if (c >= 1) rows.push({ kind: 'c', text: `${c} ohitettu` });
  return {
    tier,
    title: p.title,
    scoreNumber: `${a} / ${n}`, // shown big, with scoreWord small after it
    scoreWord: 'oikein',
    score: `${a} / ${n} oikein`,
    rows,
    starLine: earnsStar(a, n) ? 'Sait tähden!' : `Tähti tulee, kun saat ${starThreshold(n)} oikein.`,
    phraseEs: p.es,
    phraseFi: p.fi,
    speech: spoken(p.es),
  };
}

// ---------- the choose screen ----------

// A round is open and the draft differs from it: only a new round can follow.
export function chooseHint(draftDir, draftTopic, round) {
  if (!round || round.endShown) return '';
  const otherTopic = round.topic !== draftTopic;
  const otherDir = round.direction !== draftDir;
  if (otherTopic && otherDir) return 'Toinen aihe ja suunta alkavat uudella kierroksella.';
  if (otherTopic) return 'Toinen aihe alkaa uudella kierroksella.';
  if (otherDir) return 'Toinen suunta alkaa uudella kierroksella.';
  return '';
}

export const topicName = (topic) => TOPICS.find((t) => t.id === topic).name;
const lower = (text) => text.toLocaleLowerCase('fi');

// The line beside `Aihe`: `Kaikki aiheet: 79 sanaa`, `Viikonpäivät: 7 sanaa, kierroksessa 7 kysymystä` (design sei-57 3.2).
export function topicLine(topic) {
  const s = wordsIn(topic).length;
  return `${topicName(topic)}: ${s} sanaa${s < MAX_QUESTIONS ? `, kierroksessa ${s} kysymystä` : ''}`;
}

// The grey line on the end screen, its accessible name, and the name of `Vaihda` (design sei-57 3.4, 8).
export const selectionLine = (topic, dir) => `${topicName(topic)} · ${DIRECTIONS[dir].name}`;
export const selectionLabel = (topic, dir) => `Aihe ${lower(topicName(topic))}. Suunta ${DIRECTIONS[dir].name}.`;
export const changeLabel = (topic, dir) => `Vaihda aihetta tai suuntaa. Nyt ${lower(topicName(topic))}, ${DIRECTIONS[dir].name}.`;

// ---------- texts for the game's own live region (design 8) ----------

const current = (round) => round.questions[round.index];
const pointsLine = (round) => {
  const { a, done } = counts(round);
  return `Pisteet ${a} / ${done}.`;
};

export function questionLive(round) {
  const q = current(round);
  const dir = round.direction;
  return `Kysymys ${round.index + 1} / ${round.questions.length}: ${promptOf(q.pair, dir)}. Aihe ${q.pair.topic}. ${DIRECTIONS[dir].how}.`;
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
  const n = round.questions.length;
  const t = endTexts(a, b, c, n);
  const skipped = c >= 1 ? ` ${c} ohitettu.` : '';
  const star = starGot ? ` Sait tähden! Tähtiä nyt ${total}.` : ` Tähti tulee, kun saat ${starThreshold(n)} oikein.`;
  return `${t.title} ${a} / ${n} oikein.${skipped}${star}`;
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
