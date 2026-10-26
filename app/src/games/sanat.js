// Sanat (SEI-3, SEI-7, SEI-8). The rules and texts are in sanat-logic.js; this file is the screens
// and the handlers. Design: docs/design/sei-3.md.
//
// Three screens live in the DOM for as long as the page does: choose (Mitä pelataan?), word and
// end. Switching screens only toggles `hidden`, so coming back from the front page shows exactly
// what was left, and the state below is all in memory. Nothing is stored.
//
// Every handler that speaks changes its state and the DOM first and calls ctx.speech.say last,
// synchronously: the speech then starts inside the tap (registry.js rule 3). The victory clip
// starts after the say, in the same tap. Click listeners use addEventListener
// (tests/e2e/gesture.spec.mjs only sees those).

import {
  MAX_WORDS, THEMES, LEVELS, pickPraise, newDeck, newWordState, startWord, place, removeAt, removeLast,
  clearAll, isFull, check, skip, starsFor, endTexts, syllabify, wordSpeech, letterSpeech, wrongSpeech,
  skipSpeech, chooseSpeech, selectionLine, selectionLabel, changeLabel, chooseHint, backToWord as planBackToWord,
  ALPHABET,
} from './sanat-logic.js';

const GUARD_MS = 500; // design 3.9: a new screen's buttons ignore taps for this long
const VICTORY_MS = 3000; // old r. 725-728: the clip is stopped after 3 s
const VICTORY_URL = new URL('../../assets/vauhti.mp3', import.meta.url).href;

const svg = (body, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${STROKE} stroke-width="3.2"/>`);
const CROSS = svg(`<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${STROKE} stroke-width="3.2"/>`);
const ARROW = svg(`<path d="M5 12h13M13 6l6 6-6 6" ${STROKE} stroke-width="3.2"/>`);
const BACKSPACE = svg(
  `<path d="M9 5h11a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H9l-6.5-7z" ${STROKE} stroke-width="2"/>` +
    `<path d="M11.5 9.5l5 5M16.5 9.5l-5 5" ${STROKE} stroke-width="2"/>`,
);
const SKIP = svg(`<path d="M5 6l6 6-6 6M12 6l6 6-6 6" ${STROKE} stroke-width="3"/>`);
const REPEAT = svg(`<path d="M19 12a7 7 0 1 1-2.1-5M19 4.5V8h-3.5" ${STROKE} stroke-width="2.6"/>`);
const UP = svg(`<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" ${STROKE} stroke-width="3"/>`);
const STAR_PATH = 'M12 2.6l2.85 5.95 6.55.8-4.8 4.5 1.25 6.5L12 17.2l-5.85 3.15 1.25-6.5-4.8-4.5 6.55-.8z';
const STAR = svg(`<path d="${STAR_PATH}" stroke-linejoin="round"/>`);

const THEME_UI = {
  normal: { pictures: '🐱 🚗 🌳' },
  hp: { pictures: '🪄 🦉 🧹' },
};
const LEVEL_UI = {
  easy: { pips: 1, how: 'Kuva + kirjaimet', example: '<span class="sn-mp">🐱</span><span class="sn-mt">S</span><span class="sn-mt">I</span><span class="sn-mt">K</span>' },
  medium: { pips: 2, how: 'Ääni + kirjaimet', example: '<span class="sn-mq">?</span><span class="sn-mt">S</span><span class="sn-mt">I</span><span class="sn-mt">K</span>' },
  hard: { pips: 3, how: 'Ääni + aakkoset', example: '<span class="sn-mq">?</span><span class="sn-ab">A B C</span>' },
};
const INSTRUCTION = {
  medium: 'Kuuntele sana ja rakenna se kirjaimista!',
  hard: 'Kuuntele sana ja kirjoita se itse!',
};
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347'];

const copySettings = (s) => ({ theme: s.theme, level: s.level, tavutus: s.tavutus });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function themeButtonHtml(id) {
  return (
    `<button type="button" class="sn-theme" role="radio" aria-checked="false" data-theme="${id}">` +
    `<span class="sn-theme-pictures" aria-hidden="true">${THEME_UI[id].pictures}</span>` +
    `<span class="sn-theme-name">${THEMES[id]}</span>` +
    `<span class="sn-tick" aria-hidden="true">${CHECK}</span>` +
    '</button>'
  );
}

function levelButtonHtml(id) {
  const ui = LEVEL_UI[id];
  const pips = [0, 1, 2].map((i) => `<i${i < ui.pips ? ' class="is-full"' : ''}></i>`).join('');
  return (
    `<button type="button" class="sn-level" role="radio" aria-checked="false" data-level="${id}">` +
    `<span class="sn-level-head"><span class="sn-pips" aria-hidden="true">${pips}</span>` +
    `<span class="sn-level-name">${LEVELS[id]}</span></span>` +
    `<span class="sn-level-example" aria-hidden="true">${ui.example}</span>` +
    `<span class="sn-level-how">${ui.how}</span>` +
    `<span class="sn-tick" aria-hidden="true">${CHECK}</span>` +
    '</button>'
  );
}

export default {
  create(ctx) {
    const { root, question, status } = ctx;

    // ---------- state (design 5; plan 6.1) ----------

    let settings = { theme: 'normal', level: 'easy', tavutus: false }; // committed
    let draft = copySettings(settings); // the choose screen's working copy
    let screen = 'choose';
    let round = null; // { theme, words: [wordState x MAX_WORDS], index, endShown }
    let screenChangedAt = -Infinity; // performance.now() of the last in-game screen change
    let confettiLayer = null;
    let confettiTimer = null;
    let victoryTimer = null;
    const victory = new Audio(VICTORY_URL);
    victory.preload = 'auto';
    let tileEls = new Map(); // tile id -> button (easy and medium)
    let keyEls = []; // alphabet keys (hard)

    const roundOpen = () => round !== null && !round.endShown;
    const cur = () => round.words[round.index];

    // ---------- DOM ----------

    question.innerHTML =
      '<h2 class="sn-heading sn-q-choose" tabindex="-1">Mitä pelataan?</h2>' +
      '<div class="sn-q-play" hidden>' +
      '<button type="button" class="sn-image" aria-label="Kuva. Kuuntele sana." hidden><span class="sn-emoji" aria-hidden="true"></span></button>' +
      '<div class="sn-mystery" aria-hidden="true">?</div>' +
      '<p class="sn-q-text" tabindex="-1"></p>' +
      '</div>' +
      '<h2 class="sn-heading sn-q-end" tabindex="-1" hidden></h2>';

    root.innerHTML =
      '<section class="sn-screen sn-choose">' +
      '<div class="sn-row">' +
      '<div class="sn-group"><div class="sn-group-label">Sanat</div>' +
      `<div class="sn-themes" role="radiogroup" aria-label="Sanat">${Object.keys(THEMES).map(themeButtonHtml).join('')}</div></div>` +
      '<div class="sn-group"><div class="sn-group-label">Tavutus</div>' +
      '<button type="button" class="sn-toggle" aria-pressed="false" aria-label="Tavutus">' +
      `<span class="sn-cb" aria-hidden="true">${CHECK}</span>` +
      '<span class="sn-kis" aria-hidden="true">KIS<i>-</i>SA</span>' +
      '<span class="sn-toggle-state" aria-hidden="true"></span></button></div>' +
      '</div>' +
      '<div class="sn-group-label">Taso</div>' +
      `<div class="sn-levels" role="radiogroup" aria-label="Taso">${Object.keys(LEVELS).map(levelButtonHtml).join('')}</div>` +
      '<div class="sn-hint" role="status"></div>' +
      '<div class="sn-actions">' +
      '<button type="button" class="sn-secondary sn-big sn-back-to-word" hidden>Takaisin sanaan</button>' +
      '<button type="button" class="sn-primary sn-big sn-start">Aloita</button>' +
      '<button type="button" class="sn-primary sn-big sn-restart" hidden>Aloita uusi kierros</button>' +
      '</div>' +
      '</section>' +
      '<section class="sn-screen sn-play" hidden>' +
      '<div class="sn-info"><span class="sn-score"></span><span class="sn-bar" role="img">' +
      `${'<i></i>'.repeat(MAX_WORDS)}</span></div>` +
      '<div class="sn-slots" role="group"></div>' +
      '<div class="sn-feedback"><div class="sn-fb"></div>' +
      '<button type="button" class="sn-primary sn-big sn-next"><span class="sn-next-label"></span>' +
      `${ARROW}</button></div>` +
      '<div class="sn-letters"></div>' +
      '<div class="sn-foot"><div class="sn-foot-left">' +
      `<button type="button" class="sn-secondary sn-clear" aria-label="Aloita sana alusta">${REPEAT}Aloita alusta</button>` +
      `<button type="button" class="sn-secondary sn-skip" aria-label="Ohita sana">${SKIP}Ohita</button>` +
      '</div>' +
      '<button type="button" class="sn-secondary sn-change">Vaihda</button></div>' +
      '</section>' +
      '<section class="sn-screen sn-end" hidden>' +
      '<div class="sn-result" data-tier="done"><span class="sn-medal" aria-hidden="true"></span>' +
      '<span class="sn-result-score"></span><div class="sn-rows"></div><span class="sn-end-stars" role="img"></span>' +
      '<span class="sn-result-line"></span></div>' +
      '<div class="sn-actions">' +
      '<button type="button" class="sn-primary sn-big sn-again">Pelaa uudelleen</button>' +
      '<button type="button" class="sn-secondary sn-big sn-new-settings">Vaihda valintoja</button>' +
      '</div>' +
      '<span class="sn-selection-end"><span class="sn-selection-text" aria-hidden="true"></span>' +
      '<span class="sr-only sn-selection-sr"></span></span>' +
      '</section>' +
      '<div class="sr-only sn-live" role="status"></div>';

    const $ = (sel) => root.querySelector(sel);
    const $q = (sel) => question.querySelector(sel);

    const screens = { choose: $('.sn-choose'), word: $('.sn-play'), end: $('.sn-end') };
    const questions = { choose: $q('.sn-q-choose'), word: $q('.sn-q-play'), end: $q('.sn-q-end') };
    const themeButtons = [...root.querySelectorAll('.sn-theme')];
    const levelButtons = [...root.querySelectorAll('.sn-level')];
    const tavutusBtn = $('.sn-toggle');
    const tavutusState = $('.sn-toggle-state');
    const hintEl = $('.sn-hint');
    const startBtn = $('.sn-start');
    const restartBtn = $('.sn-restart');
    const backBtn = $('.sn-back-to-word');
    const changeBtn = $('.sn-change');
    const scoreEl = $('.sn-score');
    const barEl = $('.sn-bar');
    const barBlocks = [...barEl.children];
    const slotsEl = $('.sn-slots');
    const feedbackEl = $('.sn-fb');
    const nextBtn = $('.sn-next');
    const nextLabel = $('.sn-next-label');
    const lettersEl = $('.sn-letters');
    const footLeft = $('.sn-foot-left');
    const clearBtn = $('.sn-clear');
    const skipBtn = $('.sn-skip');
    const resultEl = $('.sn-result');
    const medalEl = $('.sn-medal');
    const resultScore = $('.sn-result-score');
    const rowsEl = $('.sn-rows');
    const endStarsEl = $('.sn-end-stars');
    const resultLine = $('.sn-result-line');
    const againBtn = $('.sn-again');
    const newSettingsBtn = $('.sn-new-settings');
    const selectionText = $('.sn-selection-text');
    const selectionSr = $('.sn-selection-sr');
    const live = $('.sn-live');

    const imageBtn = $q('.sn-image');
    const emojiEl = $q('.sn-emoji');
    const mysteryEl = $q('.sn-mystery');
    const qText = $q('.sn-q-text');

    // The five stars in the top bar (design 3.0).
    status.setAttribute('role', 'img');
    status.innerHTML = Array.from({ length: 5 }, () => STAR).join('');

    // ---------- small helpers ----------

    const say = (parts, opts) => ctx.speech.say(parts, opts);
    const announce = (msg) => {
      live.textContent = msg;
    };
    const focusEl = (node) => node.focus({ preventScroll: true });
    const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const blocked = () => performance.now() - screenChangedAt < GUARD_MS;
    const guarded = (fn) => (...args) => {
      if (blocked()) return;
      fn(...args);
    };

    // Adds a class that plays a one-off animation and removes it when it ends, so un-hiding the
    // screen later does not replay it.
    function playOnce(node, cls) {
      node.classList.remove(cls);
      void node.offsetWidth; // a second animation in a row must start again
      node.classList.add(cls);
      node.addEventListener('animationend', function done(e) {
        if (e.target !== node) return;
        node.classList.remove(cls);
        node.removeEventListener('animationend', done);
      });
    }

    // a = right first time, b = right after a retry, c = skipped; done = a + b + c.
    function tally() {
      const t = { a: 0, b: 0, c: 0 };
      if (round) {
        for (const w of round.words) {
          if (w.result === 'first') t.a += 1;
          else if (w.result === 'retry') t.b += 1;
          else if (w.result === 'skipped') t.c += 1;
        }
      }
      t.done = t.a + t.b + t.c;
      return t;
    }

    const reportDone = () => ctx.reportProgress({ done: tally().done, total: MAX_WORDS, finished: false });

    // ---------- the victory clip (design 3.6; old r. 718-729) ----------

    function stopVictory() {
      if (victoryTimer === null) return;
      clearTimeout(victoryTimer);
      victoryTimer = null;
      victory.pause();
      victory.currentTime = 0;
    }

    function playVictory() {
      clearTimeout(victoryTimer);
      victory.currentTime = 0;
      victory.volume = 0.8;
      const started = victory.play();
      if (started && started.catch) started.catch(() => {});
      victoryTimer = setTimeout(stopVictory, VICTORY_MS);
    }

    // ---------- rendering ----------

    function renderChoose() {
      for (const b of themeButtons) {
        const on = b.dataset.theme === draft.theme;
        b.setAttribute('aria-checked', String(on));
        b.classList.toggle('is-selected', on);
      }
      for (const b of levelButtons) {
        const on = b.dataset.level === draft.level;
        b.setAttribute('aria-checked', String(on));
        b.classList.toggle('is-selected', on);
      }
      tavutusBtn.setAttribute('aria-pressed', String(draft.tavutus));
      tavutusBtn.classList.toggle('is-on', draft.tavutus);
      tavutusState.textContent = draft.tavutus ? 'päällä' : 'pois';
      const open = roundOpen();
      const wordOpen = open && cur().result === 'open';
      hintEl.textContent = chooseHint(draft, open ? { theme: round.theme, level: settings.level } : null, wordOpen);
      // Takaisin sanaan is for the same list only; a new list needs a new round (design 3.1).
      backBtn.hidden = !open || draft.theme !== round.theme;
      restartBtn.hidden = !open;
      startBtn.hidden = open;
    }

    // Vaihda's name tells a screen reader what is chosen now.
    function renderSettings() {
      changeBtn.setAttribute('aria-label', changeLabel(settings));
    }

    function renderStars(node, stars, label) {
      [...node.children].forEach((s, i) => s.classList.toggle('is-on', i < stars));
      node.setAttribute('aria-label', label);
    }

    function renderHud() {
      const t = tally();
      scoreEl.textContent = `Pisteet: ${t.a} / ${t.done}`;
      barBlocks.forEach((b, i) => b.classList.toggle('is-full', i < t.done));
      barEl.setAttribute('aria-label', `${t.done} sanaa ${MAX_WORDS}:stä tehty`);
      const stars = starsFor(t.a, t.done);
      renderStars(status, stars, `Tähdet: ${stars} / 5`);
    }

    // The picture, or the dashed `?`, and the text beside it (design 3.2).
    function renderQuestion() {
      const ws = cur();
      const showImage = ws.level === 'easy' || ws.result !== 'open';
      imageBtn.hidden = !showImage;
      mysteryEl.hidden = showImage;
      emojiEl.textContent = ws.emoji;
      qText.textContent = showImage ? ws.hint : INSTRUCTION[ws.level];
      qText.classList.toggle('is-instruction', !showImage);
    }

    // One box per letter. With tavutus on, each syllable is one group that does not wrap in the middle,
    // and the hyphen after it belongs to the group.
    function renderSlots() {
      const ws = cur();
      const next = ws.result === 'open' ? ws.slots.indexOf(null) : -1;
      const nodes = ws.slots.map((slot, i) => {
        if (!slot) return el('span', `sn-slot is-empty${i === next ? ' is-next' : ''}`);
        if (ws.result === 'open') {
          const b = el('button', 'sn-slot sn-slot-fill', slot.letter);
          b.type = 'button';
          b.setAttribute('aria-label', `Kirjain ${i + 1}: ${slot.letter}. Poista.`);
          b.addEventListener('click', guarded(() => removeSlot(i)));
          return b;
        }
        const right = ws.result !== 'skipped';
        const n = el('span', `sn-slot ${right ? 'is-right' : 'is-shown'}`, slot.letter);
        n.setAttribute('role', 'img');
        n.setAttribute('aria-label', `Kirjain ${i + 1}: ${slot.letter}, ${right ? 'oikein' : 'ohitettu'}`);
        return n;
      });
      if (!settings.tavutus) {
        slotsEl.replaceChildren(...nodes);
      } else {
        const groups = [];
        let from = 0;
        const syllables = syllabify(ws.word);
        syllables.forEach((s, k) => {
          const g = el('span', 'sn-syl');
          g.append(...nodes.slice(from, from + s.length));
          if (k < syllables.length - 1) {
            const dash = el('span', 'sn-dash', '-');
            dash.setAttribute('aria-hidden', 'true');
            g.append(dash);
          }
          from += s.length;
          groups.push(g);
        });
        slotsEl.replaceChildren(...groups);
      }
      slotsEl.setAttribute('aria-label', `Sanasi, ${ws.word.length} kirjainta`);
    }

    function renderFeedback() {
      const ws = cur();
      feedbackEl.replaceChildren();
      feedbackEl.dataset.kind = '';
      if (ws.result === 'first' || ws.result === 'retry') {
        feedbackEl.dataset.kind = 'right';
        feedbackEl.append(feedbackIcon(CHECK), el('span', 'sn-fb-praise', ws.praise));
      } else if (ws.result === 'skipped') {
        feedbackEl.dataset.kind = 'skipped';
        const box = el('span', 'sn-fb-text');
        box.append(el('span', 'sn-fb-title', 'Ohitettu.'), el('span', 'sn-fb-line', `Sana on ${ws.word}.`));
        feedbackEl.append(feedbackIcon(SKIP), box);
      } else if (ws.showWrong) {
        feedbackEl.dataset.kind = 'wrong';
        const box = el('span', 'sn-fb-text');
        box.append(el('span', 'sn-fb-title', 'Ei ihan.'), el('span', 'sn-fb-line', 'Napauta kirjainta, jonka haluat vaihtaa.'));
        feedbackEl.append(feedbackIcon(CROSS), box);
      }
    }

    function feedbackIcon(markup) {
      const icon = el('span', 'sn-fb-icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = markup;
      return icon;
    }

    // Tiles (easy, medium) or the alphabet (hard), built when a word starts; Poista is the last one.
    function buildLetters() {
      const ws = cur();
      lettersEl.replaceChildren();
      lettersEl.className = `sn-letters ${ws.level === 'hard' ? 'is-alphabet' : 'is-tiles'}`;
      tileEls = new Map();
      keyEls = [];
      if (ws.level === 'hard') {
        for (const letter of ALPHABET) {
          const b = el('button', 'sn-key', letter);
          b.type = 'button';
          b.addEventListener('click', guarded(() => pick(letter, null, null)));
          lettersEl.append(b);
          keyEls.push(b);
        }
      } else {
        for (const tile of ws.tiles) {
          const b = el('button', 'sn-tile', tile.letter);
          b.type = 'button';
          b.addEventListener('click', guarded(() => pick(tile.letter, tile.id, tile)));
          lettersEl.append(b);
          tileEls.set(tile.id, b);
        }
      }
      const del = el('button', 'sn-key sn-key-delete');
      del.type = 'button';
      del.setAttribute('aria-label', 'Poista viimeisin kirjain');
      del.innerHTML = BACKSPACE;
      del.addEventListener('click', guarded(deleteLast));
      lettersEl.append(del);
      keyEls.push(del);
    }

    function renderLetters() {
      const ws = cur();
      const locked = ws.result !== 'open';
      if (ws.tiles) {
        for (const tile of ws.tiles) {
          const b = tileEls.get(tile.id);
          b.disabled = tile.used || locked;
          b.classList.toggle('is-used', tile.used);
          b.classList.toggle('is-locked', locked && !tile.used);
          if (tile.used) b.setAttribute('aria-label', `${tile.letter}, käytetty`);
          else b.removeAttribute('aria-label');
        }
      }
      for (const b of keyEls) {
        b.disabled = locked;
        b.classList.toggle('is-locked', locked);
      }
    }

    // Everything that depends on the current word's state.
    function renderWord() {
      const ws = cur();
      const last = round.index === MAX_WORDS - 1;
      renderQuestion();
      renderSlots();
      renderFeedback();
      renderLetters();
      renderHud();
      nextBtn.classList.toggle('is-waiting', ws.result === 'open');
      nextLabel.textContent = last ? 'Katso tulos' : 'Seuraava';
      nextBtn.setAttribute('aria-label', last ? 'Katso tulos' : 'Seuraava sana');
      footLeft.classList.toggle('is-hidden', ws.result !== 'open');
    }

    // A word has just become current: new letters, then the usual rendering.
    function showWord() {
      buildLetters();
      renderWord();
    }

    function renderEnd() {
      const t = tally();
      const texts = endTexts(t.a, t.b, t.c);
      resultEl.dataset.tier = texts.tier;
      questions.end.textContent = texts.title;
      medalEl.innerHTML = texts.tier === 'perfect' ? STAR : texts.tier === 'good' ? CHECK : UP;
      resultScore.textContent = `${t.a} / ${MAX_WORDS}`;
      rowsEl.replaceChildren(
        ...texts.rows.map((r) => {
          const row = el('div', `sn-row-${r.kind}`);
          const icon = el('span', 'sn-bi');
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = r.kind === 'a' ? CHECK : r.kind === 'b' ? REPEAT : SKIP;
          row.append(icon, el('span', 'sn-row-text', r.text));
          return row;
        }),
      );
      const stars = starsFor(t.a, MAX_WORDS);
      endStarsEl.innerHTML = Array.from({ length: 5 }, () => STAR).join('');
      renderStars(endStarsEl, stars, `Tähdet: ${stars} / 5`);
      resultLine.textContent = texts.line;
      selectionText.textContent = selectionLine(settings);
      selectionSr.textContent = selectionLabel(settings);
      return texts;
    }

    function goTo(next) {
      screen = next;
      for (const name of Object.keys(screens)) {
        screens[name].hidden = name !== next;
        questions[name].hidden = name !== next;
      }
      screenChangedAt = performance.now();
      if (next !== 'end') clearConfetti();
    }

    // ---------- confetti (design 3.7) ----------

    function clearConfetti() {
      clearTimeout(confettiTimer);
      confettiTimer = null;
      if (confettiLayer) confettiLayer.remove();
      confettiLayer = null;
    }

    function showConfetti(tier) {
      if (tier === 'done' || reducedMotion()) return;
      const count = tier === 'perfect' ? 100 : 40;
      const ms = tier === 'perfect' ? 3500 : 3000;
      const layer = el('div', 'sn-confetti');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.setProperty('--fall', `${root.clientHeight + 30}px`);
      for (let i = 0; i < count; i++) {
        const piece = el('div', 'sn-piece');
        piece.style.cssText =
          `left:${(Math.random() * 100).toFixed(1)}%;` +
          `background:${CONFETTI_COLORS[i % CONFETTI_COLORS.length]};` +
          `border-radius:${Math.random() > 0.5 ? '50%' : '3px'};` +
          `animation-duration:${(1.3 + Math.random() * 0.7).toFixed(2)}s;` +
          `animation-delay:${(Math.random() * (ms / 1000 - 2)).toFixed(2)}s;`;
        layer.append(piece);
      }
      root.append(layer);
      confettiLayer = layer;
      confettiTimer = setTimeout(clearConfetti, ms);
    }

    // ---------- actions ----------

    const announceWord = (ws) =>
      announce(`Sana ${round.index + 1} / ${MAX_WORDS}. ${ws.word.length} kirjainta.${ws.level === 'easy' ? ` Vihje: ${ws.hint}` : ''}`);

    // The question's focus target: the picture when it is a button, else the text.
    const focusQuestion = () => focusEl(imageBtn.hidden ? qText : imageBtn);

    // Aloita, Aloita uusi kierros, Pelaa uudelleen.
    function beginRound() {
      round = { theme: settings.theme, words: newDeck(settings.theme).map(newWordState), index: 0, endShown: false };
      startWord(cur(), settings.level);
      goTo('word');
      showWord();
      ctx.reportProgress({ done: 0, total: MAX_WORDS, finished: false });
      focusQuestion();
      announceWord(cur());
      say(wordSpeech(cur().word, settings.tavutus));
    }

    // After a letter is placed from a tile, keyboard focus goes to the next free tile to the right,
    // else the first free one, else the first filled box (design 7).
    function focusAfterTile(tile) {
      const ws = cur();
      const at = ws.tiles.indexOf(tile);
      const free = (t) => !t.used;
      const target = ws.tiles.slice(at + 1).find(free) || ws.tiles.find(free);
      if (target) focusEl(tileEls.get(target.id));
      else focusFirstFilled();
    }

    function focusFirstFilled() {
      const first = slotsEl.querySelector('.sn-slot-fill');
      if (first) focusEl(first);
    }

    // A tile or an alphabet key: the letter goes to the first empty box; the last one checks the word.
    function pick(letter, tileId, tile) {
      const ws = cur();
      if (ws.result !== 'open') return;
      if (place(ws, letter, tileId) === -1) {
        playOnce(slotsEl, 'is-shaking'); // every box is full (hard): nothing is added
        return;
      }
      const filled = ws.slots.filter(Boolean).length;
      if (!isFull(ws)) {
        renderSlots();
        renderLetters();
        if (tile) focusAfterTile(tile);
        announce(`${letter}. ${filled} / ${ws.word.length}.`);
        say(letterSpeech(letter));
        return;
      }
      if (check(ws) === 'right') {
        ws.praise = pickPraise();
        reportDone();
        renderWord();
        playOnce(slotsEl, 'is-popping');
        if (ws.level !== 'easy') playOnce(imageBtn, 'is-appearing');
        focusEl(nextBtn);
        const t = tally();
        announce(`Oikein! ${ws.word}. Pisteet ${t.a} / ${t.done}.`);
        say(letterSpeech(letter));
        playVictory();
      } else {
        renderWord();
        playOnce(slotsEl, 'is-shaking');
        focusFirstFilled();
        announce(`Ei ihan. Sinun sanasi ${ws.slots.map((slot) => slot.letter).join(' ')}. Napauta kirjainta, jonka haluat vaihtaa.`);
        say(wrongSpeech(letter, ws.word));
      }
    }

    // After a letter was taken out: its tile is back (easy, medium) or the first key is focused (hard).
    function afterRemoval(letter) {
      const ws = cur();
      renderSlots();
      renderLetters();
      renderFeedback();
      announce(`${letter} poistettu. ${ws.slots.filter(Boolean).length} / ${ws.word.length}.`);
    }

    // A tap on a filled box takes that letter out; nothing is said (design 3.4).
    function removeSlot(i) {
      const ws = cur();
      if (ws.result !== 'open' || !ws.slots[i]) return;
      const { letter, tileId } = ws.slots[i];
      removeAt(ws, i);
      afterRemoval(letter);
      focusEl(tileId !== null ? tileEls.get(tileId) : keyEls[0]);
    }

    // Poista: the letter picked last.
    function deleteLast() {
      const ws = cur();
      if (ws.result !== 'open' || ws.picks.length === 0) return;
      const { letter } = ws.slots[ws.picks[ws.picks.length - 1]];
      removeLast(ws);
      afterRemoval(letter);
    }

    // Aloita alusta: all boxes empty, all tiles back. Nothing to do on an untouched word.
    function clearWord() {
      const ws = cur();
      if (ws.result !== 'open' || (ws.picks.length === 0 && !ws.showWrong)) return;
      clearAll(ws);
      renderSlots();
      renderLetters();
      renderFeedback();
      announce(`Sana alkoi alusta. 0 / ${ws.word.length}.`);
    }

    // Ohita: counted as skipped; the word is shown and read, then Seuraava (design 3.5, Q27).
    function skipWord() {
      const ws = cur();
      if (ws.result !== 'open') return;
      skip(ws);
      reportDone();
      renderWord();
      if (ws.level !== 'easy') playOnce(imageBtn, 'is-appearing');
      focusEl(nextBtn);
      const t = tally();
      announce(`Ohitettu. Sana on ${ws.word}. Pisteet ${t.a} / ${t.done}.`);
      say(skipSpeech(ws.word));
    }

    function readWord() {
      const ws = cur();
      say(wordSpeech(ws.word, settings.tavutus));
    }

    function next() {
      if (cur().result === 'open') return;
      if (round.index === MAX_WORDS - 1) {
        showEnd();
        return;
      }
      round.index += 1;
      startWord(cur(), settings.level);
      showWord();
      focusQuestion();
      announceWord(cur());
      say(wordSpeech(cur().word, settings.tavutus));
    }

    function showEnd() {
      round.endShown = true;
      ctx.reportProgress({ done: MAX_WORDS, total: MAX_WORDS, finished: true });
      const texts = renderEnd();
      goTo('end');
      showConfetti(texts.tier);
      focusEl(questions.end);
      const t = tally();
      announce(
        `${texts.title} ${t.a} / ${MAX_WORDS} heti oikein.` +
          (t.b >= 1 ? ` ${t.b} uudella yrityksellä.` : '') +
          (t.c >= 1 ? ` ${t.c} ohitettu.` : '') +
          ` ${texts.line}`,
      );
      say([{ text: texts.speech, rate: 0.85 }]);
    }

    function openChoose() {
      draft = copySettings(settings);
      renderChoose();
      goTo('choose');
      focusEl(questions.choose);
    }

    // Aloita, Aloita uusi kierros: everything in the draft is committed and a new round starts.
    function startFromDraft() {
      settings = copySettings(draft);
      renderSettings();
      beginRound();
    }

    // Takaisin sanaan (design 3.1): the level and tavutus of the draft are taken into use. What happens
    // to the word is decided by backToWord in sanat-logic.js: an open word starts again on a new
    // level, a tavutus change only changes the hyphens, and either reads an open word in this tap.
    function backToWord() {
      const ws = cur();
      const plan = planBackToWord({ settings, draft, wordOpen: ws.result === 'open' });
      settings = { ...settings, level: draft.level, tavutus: draft.tavutus };
      renderSettings();
      if (plan.restart) {
        startWord(ws, settings.level);
        buildLetters();
      }
      goTo('word');
      renderWord();
      focusQuestion();
      if (plan.read) {
        announceWord(ws);
        readWord();
      }
    }

    // ---------- listeners ----------

    for (const b of themeButtons) {
      b.addEventListener('click', guarded(() => {
        draft = { ...draft, theme: b.dataset.theme };
        renderChoose();
      }));
    }
    for (const b of levelButtons) {
      b.addEventListener('click', guarded(() => {
        draft = { ...draft, level: b.dataset.level };
        renderChoose();
      }));
    }
    tavutusBtn.addEventListener('click', guarded(() => {
      draft = { ...draft, tavutus: !draft.tavutus };
      renderChoose();
    }));
    startBtn.addEventListener('click', guarded(startFromDraft));
    restartBtn.addEventListener('click', guarded(startFromDraft));
    backBtn.addEventListener('click', guarded(backToWord));
    changeBtn.addEventListener('click', guarded(openChoose));
    nextBtn.addEventListener('click', guarded(() => next()));
    clearBtn.addEventListener('click', guarded(clearWord));
    skipBtn.addEventListener('click', guarded(skipWord));
    imageBtn.addEventListener('click', guarded(readWord));
    againBtn.addEventListener('click', guarded(beginRound));
    newSettingsBtn.addEventListener('click', guarded(openChoose));

    // ---------- the game instance ----------

    renderChoose();
    renderSettings();
    renderHud();

    return {
      show({ autoRead }) {
        if (autoRead && screen === 'word' && cur().result === 'open') readWord();
      },
      hide() {
        stopVictory();
        clearConfetti();
      },
      listen() {
        if (screen === 'choose') say(chooseSpeech(roundOpen()));
        else if (screen === 'word') readWord();
        else {
          const t = tally();
          say([{ text: endTexts(t.a, t.b, t.c).speech, rate: 0.85 }]);
        }
      },
    };
  },
};
