import { test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_ADVANCE_MS, fillMarkup, createAutoAdvance } from '../../app/src/games/auto-advance.js';

function fakeButton() {
  const classes = new Set();
  const props = {};
  return {
    classes,
    props,
    widthReads: 0,
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    style: { setProperty: (name, value) => { props[name] = value; } },
    get offsetWidth() {
      this.widthReads += 1;
      return 240;
    },
  };
}

function fakeDoc() {
  const doc = {
    visibilityState: 'visible',
    listeners: new Map(), // type -> Set of listeners
    addEventListener(type, fn) {
      if (!this.listeners.has(type)) this.listeners.set(type, new Set());
      this.listeners.get(type).add(fn);
    },
    removeEventListener(type, fn) {
      this.listeners.get(type)?.delete(fn);
    },
    count() {
      let n = 0;
      for (const set of this.listeners.values()) n += set.size;
      return n;
    },
    fire(type, event = {}) {
      for (const fn of [...(this.listeners.get(type) || [])]) fn(event);
    },
  };
  return doc;
}

function setup(extra = {}) {
  const button = fakeButton();
  const doc = fakeDoc();
  const calls = [];
  const aa = createAutoAdvance({ button, doc, onAdvance: () => calls.push('advance'), ...extra });
  return { button, doc, calls, aa };
}

beforeEach(() => mock.timers.enable({ apis: ['setTimeout'] }));
afterEach(() => mock.timers.reset());

test('AUTO_ADVANCE_MS is 4000', () => {
  assert.equal(AUTO_ADVANCE_MS, 4000);
});

test('fires once, at 4000 ms and not before', () => {
  const { aa, calls, button } = setup();
  aa.start();
  assert.equal(button.props['--aa-ms'], '4000ms');
  assert.equal(button.classes.has('aa-counting'), true);
  mock.timers.tick(3999);
  assert.equal(calls.length, 0);
  assert.equal(aa.running(), true);
  mock.timers.tick(1);
  assert.equal(calls.length, 1);
  mock.timers.tick(10000);
  assert.equal(calls.length, 1);
  assert.equal(button.classes.has('aa-counting'), false);
});

test('start restarts the animation by reading the width between removing and adding the class', () => {
  const { aa, button } = setup();
  aa.start();
  assert.equal(button.widthReads, 1);
  aa.start();
  assert.equal(button.widthReads, 2);
});

test('cancel: nothing happens at 4000 ms, the class and both listeners are gone', () => {
  const { aa, calls, button, doc } = setup();
  aa.start();
  mock.timers.tick(2000);
  aa.cancel();
  assert.equal(button.classes.has('aa-counting'), false);
  assert.equal(doc.count(), 0);
  assert.equal(aa.running(), false);
  mock.timers.tick(5000);
  assert.equal(calls.length, 0);
});

test('cancel is idempotent and safe before start', () => {
  const { aa, doc } = setup();
  aa.cancel();
  aa.cancel();
  assert.equal(doc.count(), 0);
});

test('start twice, one second apart: one advance, at 5000 ms', () => {
  const { aa, calls } = setup();
  aa.start();
  mock.timers.tick(1000);
  aa.start();
  mock.timers.tick(3999);
  assert.equal(calls.length, 0);
  mock.timers.tick(1);
  assert.equal(calls.length, 1);
});

test('focusin: the button itself keeps the wait, any other target ends it', () => {
  const { aa, calls, button, doc } = setup();
  aa.start();
  doc.fire('focusin', { target: button });
  assert.equal(aa.running(), true);
  mock.timers.tick(4000);
  assert.equal(calls.length, 1);

  aa.start();
  doc.fire('focusin', { target: {} });
  assert.equal(aa.running(), false);
  assert.equal(button.classes.has('aa-counting'), false);
  mock.timers.tick(5000);
  assert.equal(calls.length, 1);
});

test('visibilitychange: visible keeps the wait, hidden ends it', () => {
  const { aa, calls, doc } = setup();
  aa.start();
  doc.visibilityState = 'visible';
  doc.fire('visibilitychange');
  assert.equal(aa.running(), true);
  doc.visibilityState = 'hidden';
  doc.fire('visibilitychange');
  assert.equal(aa.running(), false);
  mock.timers.tick(5000);
  assert.equal(calls.length, 0);
});

test('document listeners exist only while a wait runs', () => {
  const { aa, doc } = setup();
  assert.equal(doc.count(), 0);
  aa.start();
  assert.equal(doc.count(), 2);
  aa.cancel();
  assert.equal(doc.count(), 0);
  aa.start();
  assert.equal(doc.count(), 2);
  mock.timers.tick(4000);
  assert.equal(doc.count(), 0);
});

test('fire order: inside onAdvance the wait is already over and the listeners are gone', () => {
  const button = fakeButton();
  const doc = fakeDoc();
  const seen = [];
  const aa = createAutoAdvance({
    button,
    doc,
    onAdvance: () => seen.push({ running: aa.running(), listeners: doc.count(), counting: button.classes.has('aa-counting') }),
  });
  aa.start();
  mock.timers.tick(4000);
  assert.deepEqual(seen, [{ running: false, listeners: 0, counting: false }]);
});

test('a focus change during onAdvance does not cancel again or start a wait', () => {
  const button = fakeButton();
  const doc = fakeDoc();
  let advanced = 0;
  const aa = createAutoAdvance({
    button,
    doc,
    onAdvance: () => {
      advanced += 1;
      doc.fire('focusin', { target: {} }); // the game moves focus to the new item
    },
  });
  aa.start();
  mock.timers.tick(4000);
  assert.equal(advanced, 1);
  assert.equal(aa.running(), false);
  assert.equal(doc.count(), 0);
});

test('delayMs can be given', () => {
  const { aa, calls, button } = setup({ delayMs: 1000 });
  aa.start();
  assert.equal(button.props['--aa-ms'], '1000ms');
  mock.timers.tick(1000);
  assert.equal(calls.length, 1);
});

test('fillMarkup: aria-hidden layers, the label as an attribute and no text node', () => {
  const html = fillMarkup('Seuraava', '<svg></svg>');
  assert.match(html, /class="aa-fill" aria-hidden="true" data-label="Seuraava"><svg><\/svg><\/span>/);
  assert.match(html, /class="aa-ticks" aria-hidden="true"><i><\/i><i><\/i><i><\/i><\/span>/);
  assert.equal(html.replace(/<[^>]*>/g, ''), '');
  assert.match(fillMarkup('a"b', ''), /data-label="a&quot;b"/);
});

test('the module imports in Node with no document', async () => {
  assert.equal(typeof globalThis.document, 'undefined');
  const mod = await import('../../app/src/games/auto-advance.js?again');
  assert.equal(typeof mod.createAutoAdvance, 'function');
});
