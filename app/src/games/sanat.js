// Sanat (SEI-3, SEI-7, SEI-8). The rules and texts are in sanat-logic.js; this file is the screens
// and the handlers. Design: docs/design/sei-3.md.
//
// Three screens live in the DOM for as long as the page does: choose (Mitä pelataan?), word and
// end. Switching screens only toggles `hidden`, so coming back from the front page shows exactly
// what was left, and the state below is all in memory. Nothing is stored.
//
// Every handler that speaks changes its state and the DOM first and calls ctx.speech.say last,
// synchronously: the speech then starts inside the tap (registry.js rule 3). Click listeners use
// addEventListener (tests/e2e/gesture.spec.mjs only sees those).

import {
  MAX_WORDS, THEMES, LEVELS, newDeck, newWordState, startWord, wordSpeech, chooseSpeech,
} from './sanat-logic.js';

const svg = (body, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${STROKE} stroke-width="3.2"/>`);
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

    const cur = () => round.words[round.index];

    // ---------- DOM ----------

    question.innerHTML =
      '<h2 class="sn-heading sn-q-choose" tabindex="-1">Mitä pelataan?</h2>' +
      '<div class="sn-q-play" hidden>' +
      '<div class="sn-mystery" aria-hidden="true">?</div>' +
      '<p class="sn-q-text" tabindex="-1"></p>' +
      '</div>';

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
      '<button type="button" class="sn-primary sn-big sn-start">Aloita</button>' +
      '</div>' +
      '</section>' +
      '<section class="sn-screen sn-play" hidden>' +
      '<div class="sn-slots" role="group"></div>' +
      '</section>' +
      '<div class="sr-only sn-live" role="status"></div>';

    const $ = (sel) => root.querySelector(sel);
    const $q = (sel) => question.querySelector(sel);

    const screens = { choose: $('.sn-choose'), word: $('.sn-play') };
    const questions = { choose: $q('.sn-q-choose'), word: $q('.sn-q-play') };
    const themeButtons = [...root.querySelectorAll('.sn-theme')];
    const levelButtons = [...root.querySelectorAll('.sn-level')];
    const tavutusBtn = $('.sn-toggle');
    const tavutusState = $('.sn-toggle-state');
    const hintEl = $('.sn-hint');
    const startBtn = $('.sn-start');
    const slotsEl = $('.sn-slots');
    const qText = $q('.sn-q-text');
    const live = $('.sn-live');

    // ---------- small helpers ----------

    const say = (parts, opts) => ctx.speech.say(parts, opts);
    const announce = (msg) => {
      live.textContent = msg;
    };
    const focusEl = (node) => node.focus({ preventScroll: true });

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
      hintEl.textContent = '';
    }

    function renderWord() {
      const ws = cur();
      qText.textContent = ws.level === 'easy' ? ws.hint : INSTRUCTION[ws.level];
      slotsEl.replaceChildren(...ws.slots.map(() => el('span', 'sn-slot')));
      slotsEl.setAttribute('aria-label', `Sanasi, ${ws.word.length} kirjainta`);
    }

    function goTo(next) {
      screen = next;
      for (const name of Object.keys(screens)) {
        screens[name].hidden = name !== next;
        questions[name].hidden = name !== next;
      }
    }

    // ---------- actions ----------

    // Aloita
    function beginRound() {
      round = { theme: settings.theme, words: newDeck(settings.theme).map(newWordState), index: 0, endShown: false };
      startWord(cur(), settings.level);
      goTo('word');
      renderWord();
      ctx.reportProgress({ done: 0, total: MAX_WORDS, finished: false });
      focusEl(qText);
      announce(`Sana 1 / ${MAX_WORDS}. ${cur().word.length} kirjainta.`);
      say(wordSpeech(cur().word, settings.tavutus));
    }

    function startFromDraft() {
      settings = copySettings(draft);
      beginRound();
    }

    // ---------- listeners ----------

    for (const b of themeButtons) {
      b.addEventListener('click', () => {
        draft = { ...draft, theme: b.dataset.theme };
        renderChoose();
      });
    }
    for (const b of levelButtons) {
      b.addEventListener('click', () => {
        draft = { ...draft, level: b.dataset.level };
        renderChoose();
      });
    }
    tavutusBtn.addEventListener('click', () => {
      draft = { ...draft, tavutus: !draft.tavutus };
      renderChoose();
    });
    startBtn.addEventListener('click', startFromDraft);

    // ---------- the game instance ----------

    renderChoose();

    return {
      show({ autoRead }) {
        if (autoRead && screen === 'word' && cur().result === 'open') say(wordSpeech(cur().word, settings.tavutus));
      },
      hide() {},
      listen() {
        if (screen === 'choose') say(chooseSpeech(false));
        else if (screen === 'word') say(wordSpeech(cur().word, settings.tavutus));
      },
    };
  },
};
