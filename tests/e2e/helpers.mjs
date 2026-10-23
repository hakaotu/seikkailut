import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import path from 'node:path';

const fixtures = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures');

export const GAME_IDS = ['matikka', 'sanat', 'espanja'];

// Tap on touch projects, click on desktop.
export async function press(locator, testInfo) {
  if (testInfo.project.use.hasTouch) await locator.tap();
  else await locator.click();
}

// Replaces window.speechSynthesis and SpeechSynthesisUtterance before the app loads.
// opts.mode: 'normal' (onstart, then onend) | 'nostart' (speak accepted, nothing fires)
//            | 'noend' (onstart fires, onend never) | 'absent' (no speechSynthesis at all)
// opts.voices: language tags, e.g. ['fi-FI', 'es-ES'].
// Records every speak() call in window.__speak, with whether it ran inside a click listener,
// when it was called (at) and when its onend fired (endedAt, null until then).
export async function installFakeSpeech(page, opts = {}) {
  await page.addInitScript(
    ({ mode, voices }) => {
      const realTimeout = window.setTimeout.bind(window); // page.clock may replace it later
      window.__speak = [];
      // Every trusted click listener runs between __inListener++ and __inListener--, so speak()
      // sees > 0 only while a user's click listener is on the stack. Microtasks queued by the
      // listener run after the decrement, as do timers and hashchange handlers. Listeners
      // attached with `onclick =` are not wrapped.
      window.__inListener = 0;
      const wrappers = new WeakMap(); // original listener -> { capture flag -> wrapper }
      const captureOf = (o) => (typeof o === 'boolean' ? o : !!(o && o.capture));
      const realAdd = EventTarget.prototype.addEventListener;
      const realRemove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type !== 'click' || !listener) return realAdd.call(this, type, listener, options);
        const run = function (e) {
          const counted = e.isTrusted; // el.click() and timers are not user gestures on iPad
          if (counted) window.__inListener++;
          try {
            return typeof listener === 'function' ? listener.call(this, e) : listener.handleEvent(e);
          } finally {
            if (counted) window.__inListener--;
          }
        };
        const byCapture = wrappers.get(listener) || {};
        const cap = captureOf(options);
        if (!byCapture[cap]) byCapture[cap] = run;
        wrappers.set(listener, byCapture);
        return realAdd.call(this, type, byCapture[cap], options);
      };
      EventTarget.prototype.removeEventListener = function (type, listener, options) {
        const wrapper = type === 'click' && listener && (wrappers.get(listener) || {})[captureOf(options)];
        return realRemove.call(this, type, wrapper || listener, options);
      };

      window.SpeechSynthesisUtterance = class {
        constructor(text) {
          this.text = text;
          this.rate = 1;
          this.lang = '';
        }
      };

      if (mode === 'absent') {
        Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
        return;
      }

      let voiceList = voices.map((lang) => ({ lang, name: lang, localService: true }));
      const listeners = [];
      let queue = [];
      let running = null;

      function next() {
        const u = queue.shift();
        if (!u) { running = null; return; }
        running = u;
        realTimeout(() => {
          if (u.__cancelled) return;
          if (u.onstart) u.onstart({});
          if (mode === 'noend') return;
          realTimeout(() => {
            if (u.__cancelled) return;
            if (u.__record) u.__record.endedAt = performance.now();
            if (u.onend) u.onend({});
            next();
          }, 40);
        }, 5);
      }

      const synth = {
        get speaking() { return running !== null; },
        speak(u) {
          const record = {
            text: u.text,
            rate: u.rate,
            lang: u.lang,
            voice: u.voice ? u.voice.lang : null,
            inDispatch: window.__inListener > 0,
            at: performance.now(),
            endedAt: null, // set when the fake fires onend
          };
          u.__record = record;
          window.__speak.push(record);
          if (mode === 'nostart') return;
          queue.push(u);
          if (!running) next();
        },
        cancel() {
          const was = running;
          queue = [];
          running = null;
          if (was) {
            was.__cancelled = true;
            realTimeout(() => was.onerror && was.onerror({ error: 'interrupted' }), 0);
          }
        },
        getVoices() { return voiceList; },
        addEventListener(type, fn) { if (type === 'voiceschanged') listeners.push(fn); },
      };
      window.__setVoices = (list) => {
        voiceList = list.map((lang) => ({ lang, name: lang, localService: true }));
        listeners.forEach((fn) => fn());
      };
      Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
    },
    { mode: opts.mode || 'normal', voices: opts.voices || ['fi-FI', 'es-ES'] },
  );
}

// Serves tests/e2e/fixtures/registry.js in place of app/src/games/registry.js.
export async function useFakeRegistry(page) {
  await page.route('**/src/games/registry.js', (route) =>
    route.fulfill({ path: path.join(fixtures, 'registry.js'), contentType: 'text/javascript' }),
  );
  await page.route('**/src/games/fake-game.js', (route) =>
    route.fulfill({ path: path.join(fixtures, 'fake-game.js'), contentType: 'text/javascript' }),
  );
}

export function speakCalls(page) {
  return page.evaluate(() => window.__speak);
}

// Rectangles of every visible button.
export function buttonRects(page, selector = 'button') {
  return page.evaluate((sel) => {
    return Array.from(document.querySelectorAll(sel))
      .filter((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.visibility !== 'hidden';
      })
      .map((el) => {
        const r = el.getBoundingClientRect();
        return {
          name: el.className || el.textContent.trim(),
          left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height,
        };
      });
  }, selector);
}

// The frame's own buttons (SEI-1): at least 56 px and 12 px apart. Matikka's game buttons are not in it.
const FRAME = '.game-card, .back-btn, .listen, .ok-btn, .accent-btn';

// Every visible button is at least 44 x 44 and has touch-action: manipulation; frame buttons are
// at least 56 x 56 and 12 px apart.
export async function checkSizes(page, what) {
  for (const r of await buttonRects(page, 'button')) {
    expect(r.width, `${what}: ${r.name} width`).toBeGreaterThanOrEqual(44);
    expect(r.height, `${what}: ${r.name} height`).toBeGreaterThanOrEqual(44);
  }
  const frame = await buttonRects(page, FRAME);
  for (const r of frame) {
    expect(r.width, `${what}: frame ${r.name} width`).toBeGreaterThanOrEqual(56);
    expect(r.height, `${what}: frame ${r.name} height`).toBeGreaterThanOrEqual(56);
  }
  for (let i = 0; i < frame.length; i++) {
    for (let j = i + 1; j < frame.length; j++) {
      const a = frame[i];
      const b = frame[j];
      const dx = Math.max(a.left - b.right, b.left - a.right, 0);
      const dy = Math.max(a.top - b.bottom, b.top - a.bottom, 0);
      expect(Math.hypot(dx, dy), `${what}: gap between ${a.name} and ${b.name}`).toBeGreaterThanOrEqual(12);
    }
  }
  const noManipulation = await page.evaluate(() =>
    Array.from(document.querySelectorAll('button'))
      .filter((b) => b.getBoundingClientRect().width > 0)
      .filter((b) => getComputedStyle(b).touchAction !== 'manipulation')
      .map((b) => b.className),
  );
  expect(noManipulation, `${what}: buttons without touch-action: manipulation`).toEqual([]);
}

export async function noSidewaysOverflow(page, what) {
  const m = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(m.scrollWidth, `${what}: scrollWidth ${m.scrollWidth} vs innerWidth ${m.innerWidth}`).toBeLessThanOrEqual(m.innerWidth);
  const vw = m.innerWidth;
  for (const r of await buttonRects(page)) {
    expect(r.left, `${what}: button ${r.name} left`).toBeGreaterThanOrEqual(0);
    expect(r.right, `${what}: button ${r.name} right`).toBeLessThanOrEqual(vw);
  }
}

// Replaces Math.random with a seeded generator (mulberry32) before the app loads, so a round is
// the same every run. The game reads Math.random when it needs a number, so this is enough.
export async function seedRandom(page, seed) {
  await page.addInitScript((s) => {
    let a = s;
    Math.random = () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }, seed);
}

// Matikka ignores its own buttons for 500 ms after a screen change (design 3.8). Real time, not
// page.clock: a paused clock also freezes performance.now(), which the guard reads.
export function settle(page) {
  return page.waitForTimeout(550);
}
