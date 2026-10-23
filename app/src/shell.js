// The shell: front page, game views, the shared frame, notice and error states.
//
// Everything between a tap and speechSynthesis.speak() is synchronous (no await, no
// timers, no hashchange-driven rendering), so iPad Safari counts the speech as started
// by the tap. Taps navigate with history.pushState and render in the same handler.
// popstate / hashchange (back button, swipe, typed address) render without auto-read.
//
// Attach click listeners with addEventListener, not `onclick =` or inline onclick:
// tests/e2e/gesture.spec.mjs only sees listeners attached that way.

import { parseRoute, routeToHash, titleFor } from './router.js';
import { createListenButton } from './listen-button.js';

const BACK_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ADULT_TEXT = {
  unsupported: 'tämä selain ei osaa lukea ääneen. Kokeile Safaria tai Chromea.',
  fi: 'tästä laitteesta puuttuu suomen puheääni. iPadissa sen voi lisätä: Asetukset › Käyttöapu › Puhuttu sisältö › Äänet › Suomi.',
  es: 'tästä laitteesta puuttuu espanjan puheääni. iPadissa sen voi lisätä: Asetukset › Käyttöapu › Puhuttu sisältö › Äänet › Espanja.',
};

// progress = { done, total, finished } as reported by a game, or undefined.
export function badgeFor(progress) {
  if (!progress || progress.finished || !(progress.done >= 1)) return null;
  return {
    text: `Kesken ${progress.done}/${progress.total}`,
    srText: `Kesken, ${progress.done} tehtävää ${progress.total}:stä tehty.`,
  };
}

export function createShell({ games, document, window, speech }) {
  const home = document.getElementById('home');
  const viewsRoot = document.getElementById('game-views');
  const live = document.getElementById('live');
  const ids = games.map((g) => g.id);
  const views = new Map(); // game id -> view, kept until reload
  const noticedLangs = new Set(); // languages whose notice was shown automatically
  let current = null; // the visible game view, or null on the front page
  let shownRoute = null; // idempotence: rendering the same route again does nothing

  // ---------- notice ----------

  function adultLine(view, reason) {
    if (reason === 'unsupported') return ADULT_TEXT.unsupported;
    return view.game.lang.toLowerCase().startsWith('es') ? ADULT_TEXT.es : ADULT_TEXT.fi;
  }

  function showNotice(view, reason) {
    view.noticeAdult.textContent = adultLine(view, reason);
    view.notice.hidden = false;
    noticedLangs.add(view.game.lang);
    if (view === current) {
      live.textContent = '';
      live.textContent = `Ääni ei toimi nyt. Voit pelata ilman ääntä. Aikuiselle: ${view.noticeAdult.textContent}`;
    }
  }

  function hideNotice(view) {
    view.notice.hidden = true;
    live.textContent = '';
  }

  // ---------- speech state of one game's button ----------

  function onSpeechState(view, state, reason, fromTap) {
    if (state === 'playing') {
      view.button.setState('playing');
    } else if (state === 'idle') {
      if (view.button.element.dataset.state === 'playing') view.button.setState('ready');
    } else if (state === 'failed') {
      view.button.setState('novoice');
      view.noVoiceReason = reason;
      if (fromTap || !noticedLangs.has(view.game.lang)) showNotice(view, reason);
    }
  }

  function checkAvailabilityOnOpen(view) {
    const a = speech.availability(view.game.lang);
    if (a === 'unsupported' || a === 'missing') {
      view.button.setState('novoice');
      view.noVoiceReason = a;
      if (!noticedLangs.has(view.game.lang)) showNotice(view, a);
    }
  }

  speech.onVoicesChanged(() => {
    for (const view of views.values()) {
      const a = speech.availability(view.game.lang);
      const state = view.button.element.dataset.state;
      const langReason = view.noVoiceReason === 'unsupported' || view.noVoiceReason === 'missing';
      if (state === 'novoice' && langReason && a === 'available') {
        view.button.setState('ready');
        view.noVoiceReason = null;
        hideNotice(view);
      } else if (state === 'ready' && (a === 'missing' || a === 'unsupported')) {
        view.button.setState('novoice');
        view.noVoiceReason = a;
        if (view === current && !noticedLangs.has(view.game.lang)) showNotice(view, a);
      }
    }
  });

  // ---------- building a game view ----------

  function buildView(game) {
    const el = document.createElement('section');
    el.className = 'game-view';
    el.dataset.game = game.id;
    el.hidden = true;
    el.innerHTML =
      '<header class="game-bar">' +
      `<button type="button" class="back-btn">${BACK_ICON}<span class="back-text">Etusivu</span></button>` +
      '<h1 class="game-title" tabindex="-1"></h1>' +
      '<div class="status-slot"></div>' +
      '</header>' +
      '<main class="game-body">' +
      '<div class="notice" hidden>' +
      '<div class="notice-text">' +
      '<p class="n1">Ääni ei toimi nyt.</p>' +
      '<p class="n2">Voit pelata ilman ääntä.</p>' +
      '<p class="n3"><b>Aikuiselle:</b> <span class="n3-text"></span></p>' +
      '</div>' +
      '<button type="button" class="ok-btn">Selvä</button>' +
      '</div>' +
      '<div class="game-panel">' +
      '<div class="q-row"><div class="q-slot"></div></div>' +
      '<div class="game-area"></div>' +
      '</div>' +
      '</main>';

    const view = {
      game,
      el,
      instance: null,
      progress: null,
      failed: false,
      noVoiceReason: null,
      originTap: false,
      title: el.querySelector('.game-title'),
      notice: el.querySelector('.notice'),
      noticeAdult: el.querySelector('.n3-text'),
      card: el.querySelector('.game-panel'),
      button: null,
    };
    view.title.textContent = game.name;

    view.button = createListenButton({
      label: game.listenLabel,
      onTap() {
        view.originTap = true;
        try {
          if (view.instance) view.instance.listen();
        } catch (err) {
          console.error(err);
        } finally {
          view.originTap = false;
        }
      },
    });
    el.querySelector('.q-row').append(view.button.element);

    el.querySelector('.back-btn').addEventListener('click', goBack);
    el.querySelector('.ok-btn').addEventListener('click', () => {
      hideNotice(view);
      view.button.element.focus();
    });

    viewsRoot.append(el);
    views.set(game.id, view);

    try {
      view.instance = game.module.create({
        root: el.querySelector('.game-area'),
        question: el.querySelector('.q-slot'),
        status: el.querySelector('.status-slot'),
        speech: {
          say(parts) {
            const fromTap = view.originTap;
            speech.say(game.lang, parts, (state, reason) => onSpeechState(view, state, reason, fromTap));
          },
          stop() {
            speech.stop();
          },
        },
        reportProgress({ done, total, finished }) {
          view.progress = { done, total, finished };
        },
      });
    } catch (err) {
      console.error(err);
      showError(view);
    }
    return view;
  }

  function showError(view) {
    view.failed = true;
    hideNotice(view);
    view.card.replaceChildren();
    const box = document.createElement('div');
    box.className = 'game-error';
    box.innerHTML =
      '<h2 class="err-title" tabindex="-1">Peli ei auennut.</h2>' +
      '<p class="err-text">Palaa etusivulle ja kokeile uudelleen.</p>' +
      '<button type="button" class="accent-btn">Etusivulle</button>';
    box.querySelector('.accent-btn').addEventListener('click', goBack);
    view.card.append(box);
    view.errorTitle = box.querySelector('.err-title');
  }

  // ---------- rendering ----------

  function updateBadges() {
    for (const card of home.querySelectorAll('.game-card')) {
      const badge = card.querySelector('.badge');
      const info = badgeFor(views.get(card.dataset.game)?.progress);
      badge.hidden = !info;
      if (info) {
        badge.querySelector('.badge-text').textContent = info.text;
        badge.querySelector('.sr-only').textContent = info.srText;
      }
    }
  }

  function scrollTop() {
    window.scrollTo(0, 0);
  }

  function showHome() {
    speech.stop();
    const left = current;
    if (left) {
      try {
        if (left.instance) left.instance.hide();
      } catch (err) {
        console.error(err);
      }
      left.el.hidden = true;
      live.textContent = '';
      current = null;
    }
    home.hidden = false;
    updateBadges();
    document.title = titleFor({ view: 'home' }, games);
    scrollTop();
    if (left) home.querySelector(`.game-card[data-game="${left.game.id}"]`)?.focus();
  }

  function openGame(id, byTap) {
    const game = games.find((g) => g.id === id);
    speech.stop();
    if (current) {
      try {
        if (current.instance) current.instance.hide();
      } catch (err) {
        console.error(err);
      }
      current.el.hidden = true;
      current = null;
    }
    home.hidden = true;

    let view = views.get(id);
    if (view && view.failed) {
      view.el.remove();
      views.delete(id);
      view = null;
    }
    const resuming = !!view && badgeFor(view.progress) !== null;
    if (!view) view = buildView(game);

    view.el.hidden = false;
    current = view;
    document.title = titleFor({ view: 'game', id }, games);
    scrollTop();

    if (!view.failed) {
      view.title.focus({ preventScroll: true });
      checkAvailabilityOnOpen(view);
      try {
        view.instance.show({ autoRead: byTap && !resuming });
      } catch (err) {
        console.error(err);
        showError(view);
      }
    }
    if (view.failed) view.errorTitle.focus({ preventScroll: true });
  }

  function render(route, { byTap = false } = {}) {
    const key = routeToHash(route);
    if (key === shownRoute) return;
    shownRoute = key;
    if (route.view === 'game') openGame(route.id, byTap);
    else showHome();
  }

  function renderFromLocation() {
    render(parseRoute(window.location.hash, ids));
  }

  // ---------- navigation ----------

  function goBack() {
    // Stop speech now; the same tap handler renders the front page.
    speech.stop();
    const state = window.history.state;
    if (state && state.fromHome) window.history.back();
    else window.history.pushState({}, '', routeToHash({ view: 'home' }));
    render({ view: 'home' });
  }

  function openFromCard(id) {
    const route = { view: 'game', id };
    window.history.pushState({ fromHome: true }, '', routeToHash(route));
    render(route, { byTap: true });
  }

  function start() {
    for (const card of home.querySelectorAll('.game-card')) {
      card.addEventListener('click', () => openFromCard(card.dataset.game));
    }
    window.addEventListener('popstate', renderFromLocation);
    window.addEventListener('hashchange', renderFromLocation);
    renderFromLocation();
  }

  return { start };
}
