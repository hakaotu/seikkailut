// Matikka (SEI-2, SEI-5, SEI-6). The rules and texts are in matikka-logic.js; this file is the
// screens and the handlers. Design: docs/design/sei-2.md.
//
// Three screens live in the DOM for as long as the page does: choose (Mitä lasketaan?), question
// and end. Switching screens only toggles `hidden`, so coming back from the front page shows
// exactly what was left, and the state below is all in memory. Nothing is stored.
//
// Every handler that speaks changes its state and the DOM first and calls ctx.speech.say last,
// synchronously, with no pauseMs: the speech then starts inside the tap (registry.js rule 3).
// Click listeners use addEventListener (tests/e2e/gesture.spec.mjs only sees those).

import {
  MAX_QUESTIONS, LEVELS, OPS, CHOOSE_SPEECH, newRound, pickPraise, pickLevel, toggleOp, typeDigit,
  deleteDigit, starsFor, endTexts, endTier, problemSpeech, problemLabel, wrongTexts, settingsLine,
  settingsLabel,
} from './matikka-logic.js';

const GUARD_MS = 500; // design 3.8: new screen's buttons ignore taps for this long
const HINT = 'Ainakin yksi laskutapa pitää olla valittuna.';

const svg = (body, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${STROKE} stroke-width="3.2"/>`);
const CROSS = svg(`<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${STROKE} stroke-width="3.2"/>`);
const ARROW = svg(`<path d="M5 12h13M13 6l6 6-6 6" ${STROKE} stroke-width="3.2"/>`);
const BACKSPACE = svg(
  `<path d="M9 5h11a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 20 19H9l-6.5-7z" ${STROKE} stroke-width="2"/>` +
    `<path d="M11.5 9.5l5 5M16.5 9.5l-5 5" ${STROKE} stroke-width="2"/>`,
);
const UP = svg(`<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" ${STROKE} stroke-width="3"/>`);
const STAR_PATH = 'M12 2.6l2.85 5.95 6.55.8-4.8 4.5 1.25 6.5L12 17.2l-5.85 3.15 1.25-6.5-4.8-4.5 6.55-.8z';
const STAR = svg(`<path d="${STAR_PATH}" stroke-linejoin="round"/>`);

const LEVEL_UI = {
  easy: { pips: 1, example: '3 + 4', how: 'Valitse vastaus' },
  medium: { pips: 2, example: '12 + 7', how: 'Kirjoita vastaus' },
  hard: { pips: 3, example: '45 + 38', how: 'Kirjoita vastaus' },
};
const OP_NAMES = { add: 'Yhteenlasku', sub: 'Vähennyslasku', mul: 'Kertolasku' };
const PAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'delete', '0', 'ok'];
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347'];

const copySettings = (s) => ({ level: s.level, ops: { ...s.ops } });

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function levelButtonHtml(id) {
  const ui = LEVEL_UI[id];
  const pips = [0, 1, 2].map((i) => `<i${i < ui.pips ? ' class="is-full"' : ''}></i>`).join('');
  return (
    `<button type="button" class="mk-level" role="radio" aria-checked="false" data-level="${id}">` +
    `<span class="mk-level-head"><span class="mk-pips" aria-hidden="true">${pips}</span>` +
    `<span class="mk-level-name">${LEVELS[id].name}</span></span>` +
    `<span class="mk-level-example">${ui.example}</span>` +
    `<span class="mk-level-how">${ui.how}</span>` +
    `<span class="mk-tick" aria-hidden="true">${CHECK}</span>` +
    '</button>'
  );
}

function toggleButtonHtml(id) {
  return (
    `<button type="button" class="mk-toggle" aria-pressed="false" data-op="${id}">` +
    `<span class="mk-cb" aria-hidden="true">${CHECK}</span>` +
    `<span class="mk-sym" aria-hidden="true">${OPS[id].symbol}</span>` +
    `<span class="mk-toggle-name">${OP_NAMES[id]}</span>` +
    '</button>'
  );
}

export default {
  create(ctx) {
    const { root, question, status } = ctx;

    // ---------- state (design 5; plan 4.1) ----------

    let settings = { level: 'easy', ops: { add: true, sub: true, mul: false } }; // committed
    let draft = copySettings(settings); // the choose screen's working copy
    let hint = false;
    let screen = 'choose';
    let round = null;
    let screenChangedAt = -Infinity; // performance.now() of the last in-game screen change
    let confettiLayer = null;
    let confettiTimer = null;

    const roundOpen = () => round !== null && !round.endShown;
    const cur = () => round.problems[round.index];
    const isTyped = () => LEVELS[settings.level].typed;

    // ---------- DOM ----------

    question.innerHTML =
      '<h2 class="mk-heading mk-q-choose" tabindex="-1">Mitä lasketaan?</h2>' +
      '<div class="mk-q-play" hidden><div class="mk-problem" role="group" tabindex="-1">' +
      '<span class="mk-part mk-a" aria-hidden="true"></span>' +
      '<span class="mk-part mk-op-symbol" aria-hidden="true"></span>' +
      '<span class="mk-part mk-b" aria-hidden="true"></span>' +
      '<span class="mk-part mk-equals" aria-hidden="true">=</span>' +
      '<span class="mk-box" role="img"><span class="mk-box-text"></span><span class="mk-mark" hidden></span></span>' +
      '<span class="mk-yours" role="img" hidden><span class="mk-yours-text"></span><span class="mk-mark is-wrong"></span></span>' +
      '</div></div>' +
      '<h2 class="mk-heading mk-q-end" tabindex="-1" hidden></h2>';

    root.innerHTML =
      '<section class="mk-screen mk-choose">' +
      '<div class="mk-group-label">Taso</div>' +
      `<div class="mk-levels" role="radiogroup" aria-label="Taso">${Object.keys(LEVELS).map(levelButtonHtml).join('')}</div>` +
      '<div class="mk-group-label">Laskut</div>' +
      `<div class="mk-toggles" role="group" aria-label="Laskut">${Object.keys(OPS).map(toggleButtonHtml).join('')}</div>` +
      '<div class="mk-hint" role="status"></div>' +
      '<div class="mk-actions">' +
      '<button type="button" class="mk-secondary mk-big mk-back-to-round" hidden>Takaisin laskuun</button>' +
      '<button type="button" class="mk-primary mk-big mk-start">Aloita</button>' +
      '<button type="button" class="mk-primary mk-big mk-restart" hidden>Aloita uusi kierros</button>' +
      '</div>' +
      '</section>' +
      '<section class="mk-screen mk-play" hidden>' +
      '<div class="mk-info"><span class="mk-score"></span><span class="mk-bar" role="img">' +
      `${'<i></i>'.repeat(MAX_QUESTIONS)}</span></div>` +
      '<div class="mk-streak" aria-hidden="true"></div>' +
      '<div class="mk-answer"><div class="mk-options"></div><div class="mk-pad" hidden></div></div>' +
      '<div class="mk-feedback"></div>' +
      '<div class="mk-next-wrap"><button type="button" class="mk-primary mk-big mk-next"><span class="mk-next-label"></span>' +
      `${ARROW}</button></div>` +
      '<div class="mk-foot"><span class="mk-settings"><span class="mk-settings-text" aria-hidden="true"></span>' +
      '<span class="sr-only mk-settings-sr"></span></span>' +
      '<button type="button" class="mk-secondary mk-change" aria-label="Vaihda tasoa ja laskuja">Vaihda</button></div>' +
      '</section>' +
      '<section class="mk-screen mk-end" hidden>' +
      '<div class="mk-result" data-tier="done"><span class="mk-medal" aria-hidden="true"></span>' +
      '<span class="mk-result-score"></span><span class="mk-end-stars" role="img"></span>' +
      '<span class="mk-result-line"></span></div>' +
      '<div class="mk-actions">' +
      '<button type="button" class="mk-primary mk-big mk-again">Pelaa uudelleen</button>' +
      '<button type="button" class="mk-secondary mk-big mk-new-settings">Vaihda laskuja</button>' +
      '</div>' +
      '<span class="mk-settings-end"></span>' +
      '</section>' +
      '<div class="sr-only mk-live" role="status"></div>';

    const $ = (sel) => root.querySelector(sel);
    const $q = (sel) => question.querySelector(sel);

    const screens = { choose: $('.mk-choose'), question: $('.mk-play'), end: $('.mk-end') };
    const questions = { choose: $q('.mk-q-choose'), question: $q('.mk-q-play'), end: $q('.mk-q-end') };
    const levelButtons = [...root.querySelectorAll('.mk-level')];
    const toggleButtons = [...root.querySelectorAll('.mk-toggle')];
    const hintEl = $('.mk-hint');
    const startBtn = $('.mk-start');
    const restartBtn = $('.mk-restart');
    const backBtn = $('.mk-back-to-round');
    const scoreEl = $('.mk-score');
    const barEl = $('.mk-bar');
    const barBlocks = [...barEl.children];
    const streakEl = $('.mk-streak');
    const optionsEl = $('.mk-options');
    const padEl = $('.mk-pad');
    const feedbackEl = $('.mk-feedback');
    const nextBtn = $('.mk-next');
    const nextLabel = $('.mk-next-label');
    const settingsText = $('.mk-settings-text');
    const settingsSr = $('.mk-settings-sr');
    const changeBtn = $('.mk-change');
    const resultEl = $('.mk-result');
    const medalEl = $('.mk-medal');
    const resultScore = $('.mk-result-score');
    const endStarsEl = $('.mk-end-stars');
    const resultLine = $('.mk-result-line');
    const againBtn = $('.mk-again');
    const newSettingsBtn = $('.mk-new-settings');
    const settingsEnd = $('.mk-settings-end');
    const live = $('.mk-live');

    const problemEl = $q('.mk-problem');
    const partA = $q('.mk-a');
    const partOp = $q('.mk-op-symbol');
    const partB = $q('.mk-b');
    const boxEl = $q('.mk-box');
    const boxText = $q('.mk-box-text');
    const boxMark = boxEl.querySelector('.mk-mark');
    const yoursEl = $q('.mk-yours');
    const yoursText = $q('.mk-yours-text');
    const yoursMark = yoursEl.querySelector('.mk-mark');
    yoursMark.innerHTML = CROSS;
    boxMark.innerHTML = CHECK;

    const padKeys = PAD_KEYS.map((k) => {
      const b = el('button');
      b.type = 'button';
      b.dataset.key = k;
      if (k === 'delete') {
        b.className = 'mk-key mk-key-delete';
        b.setAttribute('aria-label', 'Poista');
        b.innerHTML = BACKSPACE;
      } else if (k === 'ok') {
        b.className = 'mk-key mk-key-ok';
        b.setAttribute('aria-label', 'OK, tarkista vastaus');
        b.innerHTML = `<span aria-hidden="true">OK</span>${CHECK}`;
      } else {
        b.className = 'mk-key';
        b.textContent = k;
      }
      padEl.append(b);
      return b;
    });

    // The five stars in the top bar (design 3.0).
    status.setAttribute('role', 'img');
    status.innerHTML = Array.from({ length: 5 }, () => STAR).join('');
    const statusStars = [...status.children];

    // ---------- small helpers ----------

    const say = (text, rate) => ctx.speech.say([{ text, rate }]);
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
      node.classList.add(cls);
      node.addEventListener('animationend', function done(e) {
        if (e.target !== node) return;
        node.classList.remove(cls);
        node.removeEventListener('animationend', done);
      });
    }

    // ---------- rendering ----------

    function renderChoose() {
      for (const b of levelButtons) {
        const on = b.dataset.level === draft.level;
        b.setAttribute('aria-checked', String(on));
        b.classList.toggle('is-selected', on);
      }
      for (const b of toggleButtons) {
        const on = draft.ops[b.dataset.op];
        b.setAttribute('aria-pressed', String(on));
        b.classList.toggle('is-on', on);
      }
      hintEl.textContent = hint ? HINT : '';
      const open = roundOpen();
      backBtn.hidden = !open;
      restartBtn.hidden = !open;
      startBtn.hidden = open;
    }

    function renderStars(node, stars, label) {
      [...node.children].forEach((s, i) => s.classList.toggle('is-on', i < stars));
      node.setAttribute('aria-label', label);
    }

    function renderHud() {
      const score = round ? round.score : 0;
      const answered = round ? round.answered : 0;
      scoreEl.textContent = `Pisteet: ${score} / ${answered}`;
      barBlocks.forEach((b, i) => b.classList.toggle('is-full', i < answered));
      barEl.setAttribute('aria-label', `${answered} laskua ${MAX_QUESTIONS}:stä tehty`);
      streakEl.textContent = round && round.streak >= 3 ? `🔥 ${round.streak} peräkkäin oikein!` : '';
      const stars = starsFor(score, answered);
      renderStars(status, stars, `Tähdet: ${stars} / 5`);
      settingsText.textContent = settingsLine(settings);
      settingsSr.textContent = settingsLabel(settings);
    }

    // Shrinks the problem row in 4 px steps until it fits beside Kuuntele (design 3.2). Reads
    // layout synchronously; it is not an await, so the tap rule holds. Hidden, it measures 0.
    // The wrong-answer chip (.mk-yours) is part of the row, so it is measured too. If the row still
    // does not fit at the floor on a narrow window, the chip drops under the box (is-wrapped).
    function fitProblem() {
      const wide = window.matchMedia('(min-width: 420px)').matches;
      const min = wide ? 36 : 28;
      let size = wide ? 56 : 40;
      problemEl.classList.remove('is-wrapped');
      problemEl.style.fontSize = `${size}px`;
      while (size > min && problemEl.scrollWidth > problemEl.clientWidth) {
        size = Math.max(min, size - 4);
        problemEl.style.fontSize = `${size}px`;
      }
      if (!wide && problemEl.scrollWidth > problemEl.clientWidth) problemEl.classList.add('is-wrapped');
    }

    function renderBox() {
      const p = cur();
      const typedLevel = isTyped();
      boxEl.classList.remove('is-empty', 'is-typing', 'is-ok');
      if (p.given === null) {
        boxText.textContent = round.typed || '?';
        boxEl.classList.add(round.typed ? 'is-typing' : 'is-empty');
        boxMark.hidden = true;
        yoursEl.hidden = true;
        boxEl.setAttribute('aria-label', `Vastauksesi: ${round.typed || 'tyhjä'}`);
      } else {
        boxText.textContent = String(p.answer);
        boxEl.classList.add('is-ok');
        boxMark.hidden = false;
        boxEl.setAttribute('aria-label', p.correct ? `Vastauksesi: ${p.answer}, oikein` : `Oikea vastaus: ${p.answer}`);
        yoursEl.hidden = !(typedLevel && !p.correct);
        if (!yoursEl.hidden) {
          yoursText.textContent = String(p.given);
          yoursEl.setAttribute('aria-label', `Vastauksesi: ${p.given}, väärin`);
        }
      }
      fitProblem();
    }

    function buildOptions(p) {
      optionsEl.replaceChildren();
      for (const n of p.choices) {
        const b = el('button', 'mk-option');
        b.type = 'button';
        b.dataset.value = String(n);
        b.append(el('span', 'mk-option-num', String(n)));
        const mark = el('span', 'mk-mark');
        mark.setAttribute('aria-hidden', 'true');
        mark.hidden = true;
        b.append(mark);
        b.addEventListener('click', guarded(() => answer(n)));
        optionsEl.append(b);
      }
    }

    function renderOptions(p) {
      for (const b of optionsEl.children) {
        const n = Number(b.dataset.value);
        const mark = b.querySelector('.mk-mark');
        const done = p.given !== null;
        b.disabled = done;
        b.classList.toggle('is-right', done && n === p.answer);
        b.classList.toggle('is-wrong', done && n === p.given && !p.correct);
        b.classList.toggle('is-dim', done && n !== p.answer && n !== p.given);
        mark.hidden = !(done && (n === p.answer || (n === p.given && !p.correct)));
        mark.classList.toggle('is-wrong', n !== p.answer);
        mark.innerHTML = n === p.answer ? CHECK : CROSS;
        if (done && n === p.answer) b.setAttribute('aria-label', `${n}, oikea vastaus`);
        else if (done && n === p.given) b.setAttribute('aria-label', `${n}, sinun vastauksesi, väärin`);
        else b.removeAttribute('aria-label');
      }
    }

    function renderFeedback(p) {
      feedbackEl.replaceChildren();
      feedbackEl.dataset.kind = '';
      if (p.given === null) return;
      const icon = el('span', 'mk-fb-icon');
      icon.setAttribute('aria-hidden', 'true');
      if (p.correct) {
        feedbackEl.dataset.kind = 'right';
        icon.innerHTML = CHECK;
        feedbackEl.append(icon, el('span', 'mk-fb-praise', p.praise));
      } else {
        feedbackEl.dataset.kind = 'wrong';
        icon.innerHTML = CROSS;
        const t = wrongTexts(p.answer);
        const box = el('span', 'mk-fb-text');
        box.append(el('span', 'mk-fb-title', t.title), el('span', 'mk-fb-line', t.line));
        feedbackEl.append(icon, box);
      }
    }

    // Everything that depends on the current problem's answered / unanswered state.
    function renderAnswerState() {
      const p = cur();
      renderBox();
      if (isTyped()) {
        for (const k of padKeys) k.disabled = p.given !== null;
      } else {
        renderOptions(p);
      }
      renderFeedback(p);
      const last = round.index === MAX_QUESTIONS - 1;
      nextBtn.classList.toggle('is-waiting', p.given === null);
      nextLabel.textContent = last ? 'Katso tulos' : 'Seuraava';
      nextBtn.setAttribute('aria-label', last ? 'Katso tulos' : 'Seuraava lasku');
    }

    // A new problem on the question screen.
    function renderProblem() {
      const p = cur();
      const typed = isTyped();
      problemEl.setAttribute('aria-label', problemLabel(p, round.index + 1));
      partA.textContent = String(p.a);
      partOp.textContent = OPS[p.op].symbol;
      partB.textContent = String(p.b);
      optionsEl.hidden = typed;
      padEl.hidden = !typed;
      if (!typed) buildOptions(p);
      renderAnswerState();
      renderHud();
      playOnce(problemEl, 'is-appearing');
    }

    function renderEnd() {
      const score = round.score;
      const tier = endTier(score);
      const texts = endTexts(score);
      resultEl.dataset.tier = tier;
      questions.end.textContent = texts.title;
      medalEl.innerHTML = tier === 'perfect' ? STAR : tier === 'good' ? CHECK : UP;
      resultScore.textContent = `${score} / ${MAX_QUESTIONS} oikein`;
      const stars = starsFor(score, MAX_QUESTIONS);
      endStarsEl.innerHTML = Array.from({ length: 5 }, () => STAR).join('');
      renderStars(endStarsEl, stars, `Tähdet: ${stars} / 5`);
      resultLine.textContent = texts.line;
      settingsEnd.textContent = settingsLine(settings);
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

    // ---------- confetti (design 3.6) ----------

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
      const layer = el('div', 'mk-confetti');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.setProperty('--fall', `${root.clientHeight + 30}px`);
      for (let i = 0; i < count; i++) {
        const piece = el('div', 'mk-piece');
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

    // Aloita, Aloita uusi kierros, Pelaa uudelleen.
    function beginRound() {
      round = newRound(settings);
      hint = false;
      goTo('question');
      renderProblem();
      ctx.reportProgress({ done: 0, total: MAX_QUESTIONS, finished: false });
      focusEl(problemEl);
      announce(`${problemLabel(cur(), 1)}.`);
      say(problemSpeech(cur()), 0.75);
    }

    function answer(value) {
      const p = cur();
      if (p.given !== null) return;
      p.given = value;
      p.correct = value === p.answer;
      round.answered += 1;
      if (p.correct) {
        round.score += 1;
        round.streak += 1;
        p.praise = pickPraise();
      } else {
        round.streak = 0;
      }
      ctx.reportProgress({ done: round.answered, total: MAX_QUESTIONS, finished: false });
      renderAnswerState();
      renderHud();
      focusEl(nextBtn);
      const pointsLine = `Pisteet ${round.score} / ${round.answered}.`;
      if (p.correct) {
        playOnce(isTyped() ? boxEl : optionsEl.querySelector('.is-right'), 'is-popping');
        const streakLine = round.streak >= 3 ? ` ${round.streak} peräkkäin oikein.` : '';
        announce(`Oikein! ${problemSpeech(p)} on ${p.answer}. ${pointsLine}${streakLine}`);
        say(String(p.answer), 0.9);
      } else {
        if (!isTyped()) playOnce(optionsEl.querySelector('.is-wrong'), 'is-shaking');
        const t = wrongTexts(p.answer);
        announce(`${t.title} ${t.line} Sinä vastasit ${value}. ${pointsLine}`);
        say(t.speech, 0.85);
      }
    }

    function submit() {
      if (cur().given !== null || round.typed === '') return;
      answer(Number(round.typed));
    }

    function typeKey(d) {
      if (cur().given !== null) return;
      round.typed = typeDigit(round.typed, d);
      renderBox();
    }

    function deleteKey() {
      if (cur().given !== null) return;
      round.typed = deleteDigit(round.typed);
      renderBox();
    }

    function next() {
      if (cur().given === null) return;
      if (round.index === MAX_QUESTIONS - 1) {
        showEnd();
        return;
      }
      round.index += 1;
      round.typed = '';
      renderProblem();
      focusEl(problemEl);
      announce(`${problemLabel(cur(), round.index + 1)}.`);
      say(problemSpeech(cur()), 0.75);
    }

    function showEnd() {
      round.endShown = true;
      ctx.reportProgress({ done: MAX_QUESTIONS, total: MAX_QUESTIONS, finished: true });
      renderEnd();
      goTo('end');
      const texts = endTexts(round.score);
      showConfetti(endTier(round.score));
      focusEl(questions.end);
      announce(`${texts.title} ${round.score} / ${MAX_QUESTIONS} oikein. ${texts.line}`);
      say(texts.speech, 0.85);
    }

    function openChoose() {
      draft = copySettings(settings);
      hint = false;
      renderChoose();
      goTo('choose');
      focusEl(questions.choose);
    }

    function startFromDraft() {
      settings = copySettings(draft);
      beginRound();
    }

    function backToRound() {
      goTo('question');
      focusEl(problemEl);
    }

    // ---------- listeners ----------

    for (const b of levelButtons) {
      b.addEventListener('click', guarded(() => {
        draft = pickLevel(draft, b.dataset.level);
        hint = false;
        renderChoose();
      }));
    }
    for (const b of toggleButtons) {
      b.addEventListener('click', guarded(() => {
        const r = toggleOp(draft.ops, b.dataset.op);
        draft = { level: draft.level, ops: r.ops };
        hint = r.refused;
        renderChoose();
      }));
    }
    startBtn.addEventListener('click', guarded(startFromDraft));
    restartBtn.addEventListener('click', guarded(startFromDraft));
    backBtn.addEventListener('click', guarded(backToRound));
    changeBtn.addEventListener('click', guarded(openChoose));
    nextBtn.addEventListener('click', guarded(next));
    againBtn.addEventListener('click', guarded(beginRound));
    newSettingsBtn.addEventListener('click', guarded(openChoose));
    for (const k of padKeys) {
      const key = k.dataset.key;
      k.addEventListener('click', guarded(() => {
        if (key === 'ok') submit();
        else if (key === 'delete') deleteKey();
        else typeKey(key);
      }));
    }

    // Computer keyboard on the typed levels (design 3.4).
    function onKey(e) {
      if (screen !== 'question' || !isTyped()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9]$/.test(e.key)) {
        typeKey(e.key);
      } else if (e.key === 'Backspace') {
        if (cur().given === null) {
          e.preventDefault();
          deleteKey();
        }
      } else if (e.key === 'Enter') {
        const button = e.target instanceof Element ? e.target.closest('button') : null;
        // A focused button handles its own Enter, or Seuraava would run twice and skip a problem.
        // A keypad key is the exception: Enter there means OK, not "press this key again".
        if (button && !padEl.contains(button)) return;
        e.preventDefault();
        if (blocked()) return;
        if (cur().given === null) submit();
        else next();
      }
    }

    // ---------- the game instance ----------

    renderChoose();
    renderHud();

    return {
      show({ autoRead }) {
        document.addEventListener('keydown', onKey);
        window.addEventListener('resize', fitProblem);
        if (round) fitProblem();
        if (autoRead && screen === 'question' && cur().given === null) say(problemSpeech(cur()), 0.75);
      },
      hide() {
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('resize', fitProblem);
        clearConfetti();
      },
      listen() {
        if (screen === 'choose') say(CHOOSE_SPEECH, 0.85);
        else if (screen === 'question') say(problemSpeech(cur()), 0.75);
        else say(endTexts(round.score).speech, 0.85);
      },
    };
  },
};
