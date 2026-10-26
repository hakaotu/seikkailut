// Espanja (SEI-4, SEI-9, SEI-10, SEI-48). The words, rules and texts are in espanja-logic.js; this file
// is the screens and the handlers. Design: docs/design/sei-4.md.
//
// Three screens live in the DOM for as long as the page does: choose (Mitä pelataan?), question and
// end. Switching screens only toggles `hidden`, so coming back from the front page shows exactly what
// was left. All state is in memory except the collected stars, which are kept in localStorage.
//
// Every handler that speaks changes its state and the DOM first and calls ctx.speech.say last,
// synchronously: the speech then starts inside the tap (registry.js rule 3). Click listeners use
// addEventListener (tests/e2e/gesture.spec.mjs only sees those).
//
// After a right answer on questions 1-9 the next question comes by itself after 4 s (SEI-48,
// auto-advance.js). In Espanja -> Suomi that reading starts from a timer, so it is the one speech here
// that is not inside a tap; it passes { auto: true } to say. Seuraava and every other control end the wait.

import {
  MAX_QUESTIONS, DIRECTIONS, newRound, promptOf, optionText, hintLine, pairLine, choose, skip, counts,
  listenParts, answerParts, earnsStar, endTexts, chooseHint, questionLive, rightLive, wrongLive,
  skippedLive, endLive, loadStars, saveStars, WORDS,
} from './espanja-logic.js';
import { fillMarkup, createAutoAdvance } from './auto-advance.js';

const GUARD_MS = 500; // design 3.9: a new screen's buttons ignore taps for this long
const MAX_SIDE_BY_SIDE_STARS = 10; // design 3.0: up to this many stars side by side, then one star and × n
const WORD_LINE = `Sanat: tervehdykset ja värit (${WORDS.length} sanaa)`;

const svg = (body, viewBox = '0 0 24 24') => `<svg viewBox="${viewBox}" aria-hidden="true" focusable="false">${body}</svg>`;
const STROKE = 'fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"';
const CHECK = svg(`<path d="M5 12.5l4.5 4.5L19 7.5" ${STROKE} stroke-width="3.2"/>`);
const CROSS = svg(`<path d="M6.5 6.5l11 11M17.5 6.5l-11 11" ${STROKE} stroke-width="3.2"/>`);
const ARROW = svg(`<path d="M5 12h13M13 6l6 6-6 6" ${STROKE} stroke-width="3.2"/>`);
const SKIP = svg(`<path d="M5 6l6 6-6 6M13 6l6 6-6 6" ${STROKE} stroke-width="2.8"/>`);
const UP = svg(`<path d="M12 20V5M5.5 11.5L12 5l6.5 6.5" ${STROKE} stroke-width="3"/>`);
const STAR_PATH = 'M12 2.6l2.85 5.95 6.55.8-4.8 4.5 1.25 6.5L12 17.2l-5.85 3.15 1.25-6.5-4.8-4.5 6.55-.8z';
const STAR = svg(`<path d="${STAR_PATH}" stroke-linejoin="round"/>`);

// The example on each direction card, the same pair both ways; the Spanish word is in the brand colour.
const EXAMPLE = { fi: 'hei', es: 'hola' };
const CONFETTI_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FFB347'];

// localStorage itself throws when storage is blocked, so it is read inside the library's try.
const getStorage = () => window.localStorage;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// A node holding a Spanish word marked lang="es", for the texts that mix both languages.
function esSpan(text, tag = 'span') {
  const node = el(tag, '', text);
  node.lang = 'es';
  return node;
}

function dirButtonHtml(id) {
  const fiHtml = `<span>${EXAMPLE.fi}</span>`;
  const esHtml = `<span class="es-ex-es" lang="es">${EXAMPLE.es}</span>`;
  return (
    `<button type="button" class="es-dir" role="radio" aria-checked="false" data-dir="${id}">` +
    `<span class="es-dir-name">${DIRECTIONS[id].name}</span>` +
    `<span class="es-dir-example">${id === 'fi2es' ? fiHtml : esHtml}<i>→</i>${id === 'fi2es' ? esHtml : fiHtml}</span>` +
    `<span class="es-dir-how">${DIRECTIONS[id].how}</span>` +
    `<span class="es-tick" aria-hidden="true">${CHECK}</span>` +
    '</button>'
  );
}

export default {
  create(ctx) {
    const { root, question, status } = ctx;

    // ---------- state (design 5) ----------

    let direction = 'fi2es'; // committed: the direction of the current or the next round
    let draft = direction; // the choose screen's working copy
    let screen = 'choose';
    let round = null;
    let stars = loadStars(getStorage) ?? 0; // null (storage blocked) keeps the count in memory, from 0
    let screenChangedAt = -Infinity; // performance.now() of the last in-game screen change
    let confettiLayer = null;
    let confettiTimer = null;

    const roundOpen = () => round !== null && !round.endShown;
    const cur = () => round.questions[round.index];

    // ---------- DOM ----------

    question.innerHTML =
      '<h2 class="es-heading es-q-choose" tabindex="-1">Mitä pelataan?</h2>' +
      '<div class="es-q-play" hidden><div class="es-word" role="group" tabindex="-1"></div><div class="es-hint"></div></div>' +
      '<h2 class="es-heading es-q-end" tabindex="-1" hidden></h2>';

    root.innerHTML =
      '<section class="es-screen es-choose">' +
      '<div class="es-group-label">Suunta</div>' +
      `<div class="es-dirs" role="radiogroup" aria-label="Suunta">${Object.keys(DIRECTIONS).map(dirButtonHtml).join('')}</div>` +
      `<div class="es-words">${WORD_LINE}</div>` +
      '<div class="es-choose-hint" role="status"></div>' +
      '<div class="es-actions">' +
      '<button type="button" class="es-secondary es-big es-back-to-round" hidden>Takaisin kysymykseen</button>' +
      '<button type="button" class="es-primary es-big es-start">Aloita</button>' +
      '<button type="button" class="es-primary es-big es-restart" hidden>Aloita uusi kierros</button>' +
      '</div>' +
      '</section>' +
      '<section class="es-screen es-play" hidden>' +
      '<div class="es-info"><span class="es-score"></span><span class="es-bar" role="img">' +
      `${'<i></i>'.repeat(MAX_QUESTIONS)}</span></div>` +
      '<div class="es-options" role="group" aria-label="Vastausvaihtoehdot"></div>' +
      '<div class="es-feedback"><div class="es-fb"></div>' +
      '<button type="button" class="es-primary es-big es-next aa-btn"><span class="es-next-label"></span>' +
      `${ARROW}${fillMarkup('Seuraava', ARROW)}</button></div>` +
      '<div class="es-foot">' +
      `<button type="button" class="es-secondary es-skip" aria-label="Ohita kysymys">Ohita${SKIP}</button>` +
      '<button type="button" class="es-secondary es-change">Vaihda</button></div>' +
      '</section>' +
      '<section class="es-screen es-end" hidden>' +
      '<div class="es-result" data-tier="done"><span class="es-medal" aria-hidden="true"></span>' +
      '<span class="es-result-score"></span><span class="es-rows"></span>' +
      '<span class="es-reward"></span>' +
      '<span class="es-phrase"><b class="es-phrase-es" lang="es"></b><span class="es-phrase-fi"></span></span></div>' +
      '<div class="es-actions">' +
      '<button type="button" class="es-primary es-big es-again">Pelaa uudelleen</button>' +
      '<button type="button" class="es-secondary es-big es-new-dir">Vaihda suuntaa</button>' +
      '</div>' +
      '<span class="es-dir-end"></span>' +
      '</section>' +
      '<div class="sr-only es-live" role="status"></div>';

    const $ = (sel) => root.querySelector(sel);
    const $q = (sel) => question.querySelector(sel);

    const screens = { choose: $('.es-choose'), question: $('.es-play'), end: $('.es-end') };
    const questions = { choose: $q('.es-q-choose'), question: $q('.es-q-play'), end: $q('.es-q-end') };
    const dirButtons = [...root.querySelectorAll('.es-dir')];
    const chooseHintEl = $('.es-choose-hint');
    const startBtn = $('.es-start');
    const restartBtn = $('.es-restart');
    const backBtn = $('.es-back-to-round');
    const scoreEl = $('.es-score');
    const barEl = $('.es-bar');
    const barBlocks = [...barEl.children];
    const optionsEl = $('.es-options');
    const feedbackEl = $('.es-fb');
    const nextBtn = $('.es-next');
    const nextLabel = $('.es-next-label');
    const skipBtn = $('.es-skip');
    const changeBtn = $('.es-change');
    const resultEl = $('.es-result');
    const medalEl = $('.es-medal');
    const resultScore = $('.es-result-score');
    const rowsEl = $('.es-rows');
    const rewardEl = $('.es-reward');
    const phraseEs = $('.es-phrase-es');
    const phraseFi = $('.es-phrase-fi');
    const againBtn = $('.es-again');
    const newDirBtn = $('.es-new-dir');
    const dirEnd = $('.es-dir-end');
    const live = $('.es-live');

    const wordEl = $q('.es-word');
    const hintEl = $q('.es-hint');

    // The collected stars in the top bar (design 3.0): n stars side by side from a wide window, or one
    // star and × n. CSS picks the form; nothing listens for a resize.
    status.setAttribute('role', 'img');
    status.innerHTML = '<span class="es-stars-many"></span><span class="es-stars-few"></span>';
    const starsMany = status.querySelector('.es-stars-many');
    const starsFew = status.querySelector('.es-stars-few');

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
    const auto = createAutoAdvance({ button: nextBtn, onAdvance: () => next({ auto: true }) });

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

    // `pop`: the star that was just collected grows for 0.5 s.
    function renderStatus(pop = false) {
      status.setAttribute('aria-label', `Tähtiä: ${stars}`);
      starsMany.innerHTML = stars >= 1 && stars <= MAX_SIDE_BY_SIDE_STARS ? Array.from({ length: stars }, () => STAR).join('') : '';
      starsFew.innerHTML = `${STAR}<span class="es-n">${stars === 0 ? '0' : `× ${stars}`}</span>`;
      starsFew.classList.toggle('is-empty', stars === 0);
      if (pop && !reducedMotion()) {
        if (starsMany.lastElementChild) playOnce(starsMany.lastElementChild, 'is-popping');
        playOnce(starsFew.firstElementChild, 'is-popping');
      }
    }

    function renderChoose() {
      for (const b of dirButtons) {
        const on = b.dataset.dir === draft;
        b.setAttribute('aria-checked', String(on));
        b.classList.toggle('is-selected', on);
      }
      chooseHintEl.textContent = chooseHint(draft, round);
      const open = roundOpen();
      backBtn.hidden = !(open && round.direction === draft);
      restartBtn.hidden = !open;
      startBtn.hidden = open;
    }

    function renderHud() {
      const { a, done } = round ? counts(round) : { a: 0, done: 0 };
      scoreEl.textContent = `Pisteet: ${a} / ${done}`;
      barBlocks.forEach((b, i) => b.classList.toggle('is-full', i < done));
      barEl.setAttribute('aria-label', `${done} kysymystä ${MAX_QUESTIONS}:stä tehty`);
    }

    function buildOptions(q) {
      const dir = round.direction;
      optionsEl.replaceChildren();
      for (const o of q.options) {
        const b = el('button', 'es-option');
        b.type = 'button';
        const text = el('span', 'es-option-text', optionText(o, dir));
        if (dir === 'fi2es') text.lang = 'es';
        const mark = el('span', 'es-mark');
        mark.setAttribute('aria-hidden', 'true');
        mark.hidden = true;
        b.append(text, mark);
        b.addEventListener('click', guarded(() => answer(o)));
        optionsEl.append(b);
      }
    }

    function renderOptions(q) {
      const dir = round.direction;
      const done = q.result !== 'open';
      [...optionsEl.children].forEach((b, i) => {
        const o = q.options[i];
        const isAnswer = o === q.pair;
        const isMine = q.result === 'wrong' && o === q.chosen;
        const mark = b.querySelector('.es-mark');
        const text = optionText(o, dir);
        b.disabled = done;
        b.classList.toggle('is-right', done && isAnswer);
        b.classList.toggle('is-wrong', isMine);
        b.classList.toggle('is-dim', done && !isAnswer && !isMine);
        mark.hidden = !(done && (isAnswer || isMine));
        mark.classList.toggle('is-wrong', !isAnswer);
        mark.innerHTML = isAnswer ? CHECK : CROSS;
        if (done && isAnswer) b.setAttribute('aria-label', `Vastaus ${text}, oikea vastaus`);
        else if (isMine) b.setAttribute('aria-label', `Vastaus ${text}, sinun vastauksesi, väärin`);
        else b.setAttribute('aria-label', `Vastaus ${text}`);
      });
    }

    // The answer in the language of the answer options: Spanish gets lang="es" and bold (design 3.4).
    function answerNode(q) {
      const text = optionText(q.pair, round.direction);
      if (round.direction !== 'fi2es') return document.createTextNode(text);
      return esSpan(text, 'b');
    }

    function renderFeedback(q) {
      feedbackEl.replaceChildren();
      feedbackEl.dataset.kind = q.result === 'open' ? '' : q.result;
      if (q.result === 'open') return;
      const icon = el('span', 'es-fb-icon');
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = q.result === 'right' ? CHECK : q.result === 'wrong' ? CROSS : SKIP;
      const box = el('span', 'es-fb-text');
      const line1 = el('span', 'es-fb-title', q.result === 'right' ? q.praise : q.result === 'wrong' ? 'Ei ihan.' : 'Ohitettu.');
      const line2 = el('span', 'es-fb-line');
      if (q.result === 'right') {
        line2.append(esSpan(q.pair.es, 'b'), document.createTextNode(` = ${q.pair.fi}`));
      } else {
        line2.append(document.createTextNode('Oikea vastaus on '), answerNode(q), document.createTextNode('.'));
      }
      box.append(line1, line2);
      feedbackEl.append(icon, box);
    }

    // Everything that depends on the current question being open, answered or skipped.
    function renderAnswerState() {
      const q = cur();
      renderOptions(q);
      renderFeedback(q);
      const last = round.index === MAX_QUESTIONS - 1;
      nextBtn.classList.toggle('is-waiting', q.result === 'open');
      nextLabel.textContent = last ? 'Katso tulos' : 'Seuraava';
      nextBtn.setAttribute('aria-label', last ? 'Katso tulos' : 'Seuraava kysymys');
      skipBtn.classList.toggle('is-gone', q.result !== 'open');
    }

    // A new question on the question screen.
    function renderQuestion() {
      const q = cur();
      const dir = round.direction;
      wordEl.setAttribute('aria-label', `Kysymys ${round.index + 1} / ${MAX_QUESTIONS}: ${promptOf(q.pair, dir)}`);
      wordEl.textContent = promptOf(q.pair, dir);
      if (dir === 'es2fi') wordEl.lang = 'es';
      else wordEl.removeAttribute('lang');
      hintEl.textContent = hintLine(q.pair, dir);
      buildOptions(q);
      renderAnswerState();
      renderHud();
      changeBtn.setAttribute('aria-label', `Vaihda suuntaa. Nyt ${DIRECTIONS[dir].name}.`);
      playOnce(wordEl.parentElement, 'is-appearing');
    }

    function renderEnd() {
      const { a, b, c } = counts(round);
      const t = endTexts(a, b, c);
      resultEl.dataset.tier = t.tier;
      questions.end.textContent = t.title;
      medalEl.innerHTML = t.tier === 'perfect' ? STAR : t.tier === 'good' ? CHECK : UP;
      resultScore.textContent = `${t.scoreNumber} `;
      resultScore.append(el('small', '', t.scoreWord));
      rowsEl.replaceChildren(
        ...t.rows.map((r) => {
          const row = el('div', `es-row-${r.kind}`);
          const icon = el('span', 'es-bi');
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = r.kind === 'a' ? CHECK : r.kind === 'b' ? CROSS : SKIP;
          row.append(icon, el('span', '', r.text));
          return row;
        }),
      );
      const earned = earnsStar(a);
      rewardEl.classList.toggle('is-none', !earned);
      rewardEl.innerHTML = `${STAR}<span></span>`;
      rewardEl.lastElementChild.textContent = t.starLine;
      phraseEs.textContent = t.phraseEs;
      phraseFi.textContent = t.phraseFi;
      dirEnd.textContent = DIRECTIONS[round.direction].name;
      dirEnd.setAttribute('aria-label', `Suunta ${DIRECTIONS[round.direction].name}.`);
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
      const layer = el('div', 'es-confetti');
      layer.setAttribute('aria-hidden', 'true');
      layer.style.setProperty('--fall', `${root.clientHeight + 30}px`);
      for (let i = 0; i < count; i++) {
        const piece = el('div', 'es-piece');
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

    // Aloita, Aloita uusi kierros, Pelaa uudelleen. A fresh question 1: in Espanja -> Suomi it is read.
    function beginRound() {
      auto.cancel();
      round = newRound(direction);
      goTo('question');
      renderQuestion();
      ctx.reportProgress({ done: 0, total: MAX_QUESTIONS, finished: false });
      focusEl(wordEl);
      announce(questionLive(round));
      if (round.direction === 'es2fi') say(listenParts('question', round));
    }

    function answer(option) {
      const q = cur();
      if (q.result !== 'open') return;
      choose(q, option);
      ctx.reportProgress({ done: counts(round).done, total: MAX_QUESTIONS, finished: false });
      renderAnswerState();
      renderHud();
      focusEl(nextBtn);
      const chosenButton = optionsEl.children[q.options.indexOf(option)];
      if (q.result === 'right') {
        playOnce(chosenButton, 'is-popping');
        // Questions 1-9: the next one comes by itself; the same sentence is announced (design 8).
        const waits = round.index < MAX_QUESTIONS - 1;
        if (waits) auto.start();
        announce(rightLive(round, waits));
      } else {
        playOnce(chosenButton, 'is-shaking');
        announce(wrongLive(round));
      }
      say(answerParts(q));
    }

    function skipQuestion() {
      const q = cur();
      if (q.result !== 'open') return;
      skip(q);
      ctx.reportProgress({ done: counts(round).done, total: MAX_QUESTIONS, finished: false });
      renderAnswerState();
      renderHud();
      focusEl(nextBtn);
      announce(skippedLive(round));
      say(answerParts(q));
    }

    // `auto` is true only when the wait's timer calls this: the new word is then read from a timer.
    function next({ auto: byTimer = false } = {}) {
      // backstop: moving focus already cancels the wait, so no test can observe this call
      auto.cancel();
      if (cur().result === 'open') return;
      if (round.index === MAX_QUESTIONS - 1) {
        showEnd();
        return;
      }
      round.index += 1;
      renderQuestion();
      focusEl(wordEl);
      announce(questionLive(round));
      if (round.direction === 'es2fi') say(listenParts('question', round), { auto: byTimer });
    }

    // The first time the end screen shows for a round, a round with 8 or more right gives one star, kept
    // at once. starGiven keeps a second call from giving another.
    function showEnd() {
      round.endShown = true;
      const { a, b, c } = counts(round);
      let starGot = false;
      if (earnsStar(a) && !round.starGiven) {
        round.starGiven = true;
        stars += 1;
        saveStars(getStorage, stars);
        starGot = true;
        renderStatus(true);
      }
      ctx.reportProgress({ done: MAX_QUESTIONS, total: MAX_QUESTIONS, finished: true });
      renderEnd();
      goTo('end');
      const t = endTexts(a, b, c);
      showConfetti(t.tier);
      focusEl(questions.end);
      announce(endLive(round, starGot, stars));
      say([{ text: t.speech, rate: 0.9 }]);
    }

    function openChoose() {
      auto.cancel();
      draft = direction;
      renderChoose();
      goTo('choose');
      focusEl(questions.choose);
    }

    function startFromDraft() {
      direction = draft;
      beginRound();
    }

    function backToRound() {
      goTo('question');
      focusEl(wordEl);
    }

    // ---------- listeners ----------

    for (const b of dirButtons) {
      b.addEventListener('click', guarded(() => {
        draft = b.dataset.dir;
        renderChoose();
      }));
    }
    startBtn.addEventListener('click', guarded(startFromDraft));
    restartBtn.addEventListener('click', guarded(startFromDraft));
    backBtn.addEventListener('click', guarded(backToRound));
    changeBtn.addEventListener('click', guarded(openChoose));
    skipBtn.addEventListener('click', guarded(skipQuestion));
    nextBtn.addEventListener('click', guarded(() => next()));
    againBtn.addEventListener('click', guarded(beginRound));
    newDirBtn.addEventListener('click', guarded(openChoose));

    // ---------- the game instance ----------

    renderChoose();
    renderStatus();
    renderHud();

    return {
      show({ autoRead }) {
        if (autoRead && screen === 'question' && cur().result === 'open' && round.direction === 'es2fi') {
          say(listenParts('question', round));
        }
      },
      hide() {
        clearConfetti();
        auto.cancel();
      },
      listen() {
        auto.cancel();
        say(listenParts(screen, round));
      },
    };
  },
};
