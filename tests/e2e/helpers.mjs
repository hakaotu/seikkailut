import { fileURLToPath } from 'node:url';
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
