// Sanat's rules, word lists and texts. Pure: no DOM, nothing read at import, so node:test can run it.
// Every random choice takes an `rng` (a function returning [0, 1)); the default reads Math.random
// when it is called, so a test can seed it either way. Design: docs/design/sei-3.md.
//
// A word's state `ws` is edited in place by the functions below, and each returns it (or, for
// `place` and `check`, what the caller needs to know). The game keeps the states in its round.

export const MAX_WORDS = 10;

// ── Word bank (the first 24 / 20 words: originals/sanaseikkailu.html r. 341-389, verbatim) ──
export const WORDS = [
  { word:'KISSA',   emoji:'🐱', hint:'Sanoo miau!' },
  { word:'KOIRA',   emoji:'🐶', hint:'Haukkuu!' },
  { word:'AUTO',    emoji:'🚗', hint:'Vroom vroom!' },
  { word:'PUU',     emoji:'🌳', hint:'Kasvaa metsässä' },
  { word:'TALO',    emoji:'🏠', hint:'Asutaan siellä' },
  { word:'LINTU',   emoji:'🐦', hint:'Lentää taivaalla' },
  { word:'KALA',    emoji:'🐟', hint:'Ui vedessä' },
  { word:'KUKKA',   emoji:'🌸', hint:'Kaunis kasvi' },
  { word:'PALLO',   emoji:'⚽', hint:'Pallolla pelataan' },
  { word:'MUNA',    emoji:'🥚', hint:'Kana munii' },
  { word:'OMENA',   emoji:'🍎', hint:'Punainen hedelmä' },
  { word:'BANAANI', emoji:'🍌', hint:'Keltainen hedelmä' },
  { word:'JÄÄTELÖ', emoji:'🍦', hint:'Kylmää ja makeaa!' },
  { word:'TÄHTI',   emoji:'⭐', hint:'Loistaa yötaivaalla' },
  { word:'AURINKO', emoji:'☀️', hint:'Paistaa päivällä' },
  { word:'KUU',     emoji:'🌙', hint:'Paistaa yöllä' },
  { word:'KIRJA',   emoji:'📚', hint:'Luetaan!' },
  { word:'HATTU',   emoji:'🎩', hint:'Laitetaan päähän' },
  { word:'SYDÄN',   emoji:'❤️', hint:'Rakkauden merkki' },
  { word:'HIIRI',   emoji:'🐭', hint:'Pieni eläin' },
  { word:'KARHU',   emoji:'🐻', hint:'Iso karvainen eläin' },
  { word:'NORSU',   emoji:'🐘', hint:'Pitkä kärsä' },
  { word:'PISTE',   emoji:'🔴', hint:'Pyöreä merkki' },
  { word:'TULI',    emoji:'🔥', hint:'Kuuma ja punainen' },
  // SEI-50: docs/design/sei-50.md §4.1
  { word:'LEHMÄ', emoji:'🐄', hint:'Sanoo ammuu!' },
  { word:'HEVONEN', emoji:'🐴', hint:'Sillä voi ratsastaa' },
  { word:'SIKA', emoji:'🐷', hint:'Sanoo röh röh!' },
  { word:'LAMMAS', emoji:'🐑', hint:'Sanoo mää!' },
  { word:'KANI', emoji:'🐰', hint:'Pitkät korvat, hyppii' },
  { word:'KETTU', emoji:'🦊', hint:'Oranssi metsän eläin' },
  { word:'APINA', emoji:'🐒', hint:'Kiipeilee puissa' },
  { word:'LEIJONA', emoji:'🦁', hint:'Eläinten kuningas' },
  { word:'KIRAHVI', emoji:'🦒', hint:'Tosi pitkä kaula' },
  { word:'ETANA', emoji:'🐌', hint:'Kantaa kotiaan selässä' },
  { word:'JUNA', emoji:'🚆', hint:'Kulkee kiskoilla' },
  { word:'BUSSI', emoji:'🚌', hint:'Moni pääsee kyytiin' },
  { word:'LAIVA', emoji:'🚢', hint:'Kulkee meren yli' },
  { word:'PYÖRÄ', emoji:'🚲', hint:'Kaksi rengasta ja polkimet' },
  { word:'RAKETTI', emoji:'🚀', hint:'Lentää avaruuteen' },
  { word:'PILVI', emoji:'☁️', hint:'Leijuu taivaalla' },
  { word:'SADE', emoji:'🌧️', hint:'Vettä tulee taivaalta' },
  { word:'LUMI', emoji:'❄️', hint:'Valkoista ja kylmää' },
  { word:'SIENI', emoji:'🍄', hint:'Sillä on lakki ja jalka' },
  { word:'LEHTI', emoji:'🍁', hint:'Putoaa puusta syksyllä' },
  { word:'SALAMA', emoji:'⚡', hint:'Välähtää ukkosella' },
  { word:'LEIPÄ', emoji:'🍞', hint:'Leikataan viipaleiksi' },
  { word:'JUUSTO', emoji:'🧀', hint:'Keltainen ja reikäinen' },
  { word:'MAITO', emoji:'🥛', hint:'Valkoinen juoma' },
  { word:'PÄÄRYNÄ', emoji:'🍐', hint:'Vihreä hedelmä' },
  { word:'KAKKU', emoji:'🎂', hint:'Kynttilät päällä' },
  { word:'KEKSI', emoji:'🍪', hint:'Rapea ja makea' },
  { word:'KELLO', emoji:'⏰', hint:'Tik tak!' },
  { word:'KYNÄ', emoji:'✏️', hint:'Sillä kirjoitetaan' },
  { word:'REPPU', emoji:'🎒', hint:'Koululaisen laukku' },
  { word:'NALLE', emoji:'🧸', hint:'Pehmeä lelu' },
  { word:'RUMPU', emoji:'🥁', hint:'Bum bum bum!' },
  { word:'KRUUNU', emoji:'👑', hint:'Kuninkaan päässä' },
  { word:'KENKÄ', emoji:'👟', hint:'Laitetaan jalkaan' },
  { word:'SUKKA', emoji:'🧦', hint:'Lämmittää varpaita' },
  { word:'PAITA', emoji:'👕', hint:'Puetaan päälle' },
];

export const HP_WORDS = [
  { word:'JÄSTI',      emoji:'🧑',  hint:'Ei osaa taikuutta' },
  { word:'TAIKASAUVA', emoji:'🪄',  hint:'Loitsujen työkalu' },
  { word:'TYLYPAHKA',  emoji:'🏰',  hint:'Taikurien koulu' },
  { word:'LUUTA',      emoji:'🧹',  hint:'Taikuri lentää sillä' },
  { word:'VIISTOKUJA', emoji:'🏪',  hint:'Taikurien ostoskatu' },
  { word:'LOITSU',     emoji:'✨',  hint:'Taikurin lausuma sana' },
  { word:'PATA',       emoji:'🫕',  hint:'Taikajuomia keitetään' },
  { word:'HAAMU',      emoji:'👻',  hint:'Läpinäkyvä asukas' },
  { word:'TAIKURI',    emoji:'🧙',  hint:'Taikuutta osaava' },
  { word:'NOITA',      emoji:'🧙‍♀️', hint:'Taikuutta osaava nainen' },
  { word:'LOHIKÄÄRME', emoji:'🐉',  hint:'Tulta syytävä otus' },
  { word:'PÖLLÖ',      emoji:'🦉',  hint:'Tuo kirjeet perille' },
  { word:'VIITTA',     emoji:'🧥',  hint:'Tekee näkymättömäksi' },
  { word:'HUISPAUS',   emoji:'🏆',  hint:'Taikurien urheilulaji' },
  { word:'SAMMAKKO',   emoji:'🐸',  hint:'Suklaasammakko!' },
  { word:'PEIKKO',     emoji:'👺',  hint:'Vartioivat pankkia' },
  { word:'KUTKA',      emoji:'🦔',  hint:'Söpö pieni otus' },
  { word:'TAIKA',      emoji:'🌟',  hint:'Taikurin supervoima' },
  { word:'KAMMIO',     emoji:'🚪',  hint:'Salainen huone' },
  { word:'TAIKAJUOMA', emoji:'🧪',  hint:'Ihmeellinen liemi' },
  // SEI-51: docs/design/sei-50.md §4.2
  { word:'ROHKELIKKO', emoji:'🦁', hint:'Leijona on sen merkki' },
  { word:'LUIHUINEN', emoji:'🐍', hint:'Käärme on sen merkki' },
  { word:'PUUSKUPUH', emoji:'🦡', hint:'Mäyrä on sen merkki' },
  { word:'TUPA', emoji:'🏠', hint:'Koulussa niitä on neljä' },
  { word:'TYLYAHO', emoji:'🏘️', hint:'Taikurien oma kylä' },
  { word:'PIKAJUNA', emoji:'🚂', hint:'Vie oppilaat kouluun' },
  { word:'LAITURI', emoji:'🚉', hint:'Yhdeksän ja kolme neljäsosaa' },
  { word:'TÄHTITORNI', emoji:'🔭', hint:'Täältä katsellaan yötaivasta' },
  { word:'KASVIHUONE', emoji:'🪴', hint:'Lasinen talo taimille' },
  { word:'ETSIJÄ', emoji:'🔍', hint:'Nappaa kultaisen pallon' },
  { word:'PITÄJÄ', emoji:'🥅', hint:'Vartioi maalirenkaita' },
  { word:'LYÖJÄ', emoji:'🏏', hint:'Pelaaja, jolla on maila' },
  { word:'KOTIKOLO', emoji:'🏡', hint:'Punatukkaisen perheen talo' },
  { word:'KALJUUNA', emoji:'💰', hint:'Taikurien kultaraha' },
  { word:'ARPI', emoji:'⚡', hint:'Salaman muotoinen otsassa' },
  { word:'KENTAURI', emoji:'🏹', hint:'Puoliksi hevonen' },
  { word:'SULKAKYNÄ', emoji:'🪶', hint:'Kastetaan musteeseen' },
  { word:'FEENIKS', emoji:'🔥', hint:'Tulinen lintu' },
  { word:'ALRUUNA', emoji:'🌱', hint:'Kasvi, joka kiljuu' },
  { word:'PÄIVÄKIRJA', emoji:'📔', hint:'Salaisuudet sivuilla' },
  { word:'KORPINKYNSI', emoji:'🦅', hint:'Kotka on sen merkki' },
];

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÅÄÖ'.split('');

// The old PRAISE_OK (r. 393). The old PRAISE_ERR is gone: "Melkein!" claimed a closeness nobody checks (design E6).
export const PRAISE = ['Hienoa! 🌟', 'Oikein! ⭐', 'Mahtavaa! 🎉', 'Tosi hyvä! 🏆', 'Loistavaa! 🌈', 'Upea! 💪', 'Bravo! 🎊'];

const defaultRng = () => Math.random();
const rand = (rng, min, max) => Math.floor(rng() * (max - min + 1)) + min;

export const pickPraise = (rng = defaultRng) => PRAISE[rand(rng, 0, PRAISE.length - 1)];

// ── Finnish syllabifier (originals/sanaseikkailu.html r. 410-446, verbatim) ─
const VOWELS      = new Set('AEIOUÄÖY');
const DIPHTHONGS  = new Set(['AI','EI','OI','UI','YI','ÄI','ÖI','AU','EU','IU','OU','ÄY','ÖY','IE','UO','YÖ']);
const isV = c => VOWELS.has(c);
const isC = c => c !== undefined && !VOWELS.has(c);

export function syllabify(word) {
  const w = word.toUpperCase();
  if (w.length <= 2) return [w];

  const breaks = new Set();

  for (let i = 1; i < w.length; i++) {
    const p2 = w[i - 2], p1 = w[i - 1], c0 = w[i], c1 = w[i + 1];

    if (isV(p1) && isV(c0)) {
      // Two adjacent vowels: split unless long vowel or diphthong
      const pair = p1 + c0;
      if (p1 !== c0 && !DIPHTHONGS.has(pair)) breaks.add(i);
    } else if (isC(p1) && isV(c0) && i >= 2) {
      // Consonant followed by vowel → potential break before consonant
      if (isV(p2)) {
        // V-CV pattern: break before consonant
        breaks.add(i - 1);
      } else if (isC(p2) && i >= 3 && isV(w[i - 3])) {
        // VCC-V pattern: break between consonants
        breaks.add(i - 1);
      }
    }
  }

  const sorted = [...breaks].sort((a, b) => a - b);
  const result = [];
  let start = 0;
  for (const b of sorted) { result.push(w.slice(start, b)); start = b; }
  result.push(w.slice(start));
  return result.filter(s => s.length > 0);
}

// ── The round ──────────────────────────────────────────────────────────────

const LISTS = { normal: WORDS, hp: HP_WORDS };

export const THEMES = { normal: 'Normaali', hp: 'Harry Potter' };
export const LEVELS = { easy: 'Helppo', medium: 'Keskitaso', hard: 'Vaikea' };

const MAX_RESHUFFLES = 20; // design 3.3, E13

// MAX_WORDS distinct entries of the chosen list, in a random order.
export function newDeck(theme, rng = defaultRng) {
  const list = [...LISTS[theme]];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, MAX_WORDS);
}

// A fresh word state from a word-list entry. startWord gives it its level, slots and tiles.
export function newWordState(entry) {
  return {
    word: entry.word,
    emoji: entry.emoji,
    hint: entry.hint,
    level: null, // 'easy' | 'medium' | 'hard', set when the word becomes current or restarts
    tiles: null, // easy and medium: [{ id, letter, used }]
    slots: [], // one per letter: null or { letter, tileId } (tileId null on hard)
    picks: [], // slot indexes in the order they were filled, for Poista
    wrong: 0, // failed full checks; survives a level restart
    result: 'open', // 'open' | 'first' | 'retry' | 'skipped'
    praise: null,
    showWrong: false, // the "Ei ihan." line is visible
  };
}

// The letters in a random order, as tiles; the id is the letter's position in the word. A shuffle
// that spells the word is thrown away and done again, at most MAX_RESHUFFLES times (E13).
export function shuffleTiles(word, rng = defaultRng) {
  const letters = [...word];
  let tiles;
  for (let tries = 0; tries <= MAX_RESHUFFLES; tries++) {
    tiles = letters.map((letter, id) => ({ id, letter, used: false }));
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
    }
    if (tiles.map((t) => t.letter).join('') !== word) break;
  }
  return tiles;
}

// The word becomes current, or restarts on another level. `wrong` and `result` are kept.
export function startWord(ws, level, rng = defaultRng) {
  ws.level = level;
  ws.slots = Array.from({ length: ws.word.length }, () => null);
  ws.picks = [];
  ws.showWrong = false;
  ws.tiles = level === 'hard' ? null : shuffleTiles(ws.word, rng);
  return ws;
}

// ── Editing a word ─────────────────────────────────────────────────────────

const tileOf = (ws, id) => ws.tiles.find((t) => t.id === id);

// The letter goes into the first empty slot. Returns that slot's index, or -1 when all are full.
export function place(ws, letter, tileId = null) {
  const i = ws.slots.indexOf(null);
  if (i === -1) return -1;
  ws.slots[i] = { letter, tileId };
  ws.picks.push(i);
  if (tileId !== null) tileOf(ws, tileId).used = true;
  return i;
}

// Takes the letter out of slot i and gives its tile back. An empty slot is left alone.
export function removeAt(ws, i) {
  const slot = ws.slots[i];
  if (!slot) return ws;
  if (slot.tileId !== null) tileOf(ws, slot.tileId).used = false;
  ws.slots[i] = null;
  ws.picks = ws.picks.filter((p) => p !== i);
  return ws;
}

// Poista: the latest pick, not the rightmost letter.
export function removeLast(ws) {
  if (ws.picks.length > 0) removeAt(ws, ws.picks[ws.picks.length - 1]);
  return ws;
}

// Aloita alusta: the same tiles, in the same order, all back.
export function clearAll(ws) {
  ws.slots = ws.slots.map(() => null);
  ws.picks = [];
  ws.showWrong = false;
  if (ws.tiles) for (const t of ws.tiles) t.used = false;
  return ws;
}

export const isFull = (ws) => ws.slots.every((s) => s !== null);

// Only called when every slot is full. Wrong keeps the letters (SEI-7) and counts the attempt.
export function check(ws) {
  const spelled = ws.slots.map((s) => s.letter).join('');
  if (spelled === ws.word) {
    ws.result = ws.wrong === 0 ? 'first' : 'retry';
    ws.showWrong = false;
    return 'right';
  }
  ws.wrong += 1;
  ws.showWrong = true;
  return 'wrong';
}

// Ohita: counted as skipped even after attempts. The slots show the word; every tile is back.
export function skip(ws) {
  ws.result = 'skipped';
  ws.slots = [...ws.word].map((letter) => ({ letter, tileId: null }));
  ws.picks = [];
  ws.showWrong = false;
  if (ws.tiles) for (const t of ws.tiles) t.used = false;
  return ws;
}

// ── Scoring and texts ──────────────────────────────────────────────────────

// a = right first time, done = a + right after retry + skipped. The old game showed five full stars
// before any word was done; this gives none (design 3.0).
export function starsFor(a, done) {
  return done === 0 ? 0 : Math.round((a * 5) / done);
}

export function endTier(a) {
  if (a >= MAX_WORDS) return 'perfect';
  if (a >= 7) return 'good';
  return 'done';
}

const sanaa = (n) => (n === 1 ? 'sana' : 'sanaa');

// a = right first time, b = right after a retry, c = skipped; a + b + c = MAX_WORDS at the end.
// `rows` are in the design's order: a always, b and c only when 1 or more.
export function endTexts(a, b, c) {
  const tier = endTier(a);
  const rows = [{ kind: 'a', text: `${a} ${sanaa(a)} heti oikein` }];
  if (b >= 1) rows.push({ kind: 'b', text: b === 1 ? 'Vain 1 sana meni ensin väärin' : `${b} sanaa meni ensin väärin` });
  if (c >= 1) rows.push({ kind: 'c', text: `${c} ${sanaa(c)} ohitettu` });
  if (tier === 'perfect') {
    return {
      tier,
      title: 'Täydellinen tulos!',
      rows,
      line: 'Olet tosi hyvä lukija!',
      speech: `Täydellinen tulos! Kaikki ${MAX_WORDS} sanaa heti oikein. Olet tosi hyvä lukija!`,
    };
  }
  const title = tier === 'good' ? 'Hienoa!' : 'Kierros valmis!';
  const line = tier === 'good' ? 'Hyvää työtä!' : 'Harjoittelemalla oppii!';
  // The voice reads the rows shown on screen, in the same order, each as a sentence of its own.
  // Numbers as digits, not inflected: "9 sanaa" is right Finnish and the voice reads it as is.
  const spokenTitle = tier === 'good' ? title : 'Kierros valmis.';
  // With 0 words right first time the voice skips that row ("0 sanaa heti oikein" is not said).
  const counts = rows.filter((r) => r.kind !== 'a' || a >= 1).map((r) => `${r.text}.`).join(' ');
  return { tier, title, rows, line, speech: `${spokenTitle} ${counts} ${line}` };
}

export const SELECTION_HINTS = {
  list: 'Toiset sanat alkavat uudella kierroksella.',
  level: 'Sama sana alkaa alusta uudella tasolla.',
};

// The hint line under the choose screen cards (design 3.1). `round` is the running round's
// { theme, level } or null; the first case that fits wins.
export function chooseHint(draft, round, wordOpen) {
  if (!round) return '';
  if (draft.theme !== round.theme) return SELECTION_HINTS.list;
  if (draft.level !== round.level && wordOpen) return SELECTION_HINTS.level;
  return '';
}

// What Takaisin sanaan does (design 3.1): `restart` = the open word starts again on the new level
// (slots cleared, tiles reshuffled, `wrong` kept); `read` = the word is read in the same tap. A
// level change on a finished word waits for the next word, and a change of tavutus alone only
// changes the hyphens and the reading, never the letters in the slots.
export function backToWord({ settings, draft, wordOpen }) {
  const levelChanged = draft.level !== settings.level;
  const tavutusChanged = draft.tavutus !== settings.tavutus;
  return {
    restart: levelChanged && wordOpen,
    read: wordOpen && (levelChanged || tavutusChanged),
  };
}

// ── Speech (design 3.8) ────────────────────────────────────────────────────

// The word at 0.78, then slowly after a pause, or syllable by syllable when tavutus is on. The first
// part is never delayed; a pause is `pauseMs` on the part after it.
export function wordSpeech(word, tavutus) {
  const text = word.toLowerCase();
  const parts = [{ text, rate: 0.78 }];
  if (!tavutus) {
    parts.push({ text, rate: 0.52, pauseMs: 700 });
  } else {
    syllabify(word).forEach((s, i) => parts.push({ text: s.toLowerCase(), rate: 0.62, pauseMs: i === 0 ? 700 : 400 }));
  }
  return parts;
}

export const letterSpeech = (letter) => [{ text: letter.toLowerCase(), rate: 0.9 }];

// The last letter, then Ei ihan., then the word slowly.
export function wrongSpeech(lastLetter, word) {
  return [
    { text: lastLetter.toLowerCase(), rate: 0.9 },
    { text: 'Ei ihan.', rate: 0.85, pauseMs: 300 },
    { text: word.toLowerCase(), rate: 0.52, pauseMs: 700 },
  ];
}

export const skipSpeech = (word) => [{ text: `Sana on ${word.toLowerCase()}.`, rate: 0.8 }];

export function chooseSpeech(roundOpen) {
  return [{
    text: `Mitä pelataan? Valitse sanat ja taso. Paina sitten ${roundOpen ? 'Takaisin sanaan' : 'Aloita'}.`,
    rate: 0.85,
  }];
}

// ── Selections as text ─────────────────────────────────────────────────────

// `Normaali · Helppo` or `Harry Potter · Vaikea · Tavutus` (the end screen's line).
export function selectionLine(settings) {
  return `${THEMES[settings.theme]} · ${LEVELS[settings.level]}${settings.tavutus ? ' · Tavutus' : ''}`;
}

// The same for a screen reader.
export function selectionLabel(settings) {
  return `Sanat ${THEMES[settings.theme]}. Taso ${LEVELS[settings.level]}. Tavutus ${settings.tavutus ? 'päällä' : 'pois'}.`;
}

// Vaihda's accessible name: what the button does and what is chosen now.
export function changeLabel(settings) {
  return `Vaihda sanoja, tasoa ja tavutusta. Nyt ${THEMES[settings.theme]}, ${LEVELS[settings.level]}, tavutus ${settings.tavutus ? 'päällä' : 'pois'}.`;
}
