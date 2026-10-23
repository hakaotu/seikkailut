import { test } from 'node:test';
import assert from 'node:assert/strict';

// No DOM exists here: importing the registry must not touch `document`.
test('registry has the three games in order, with languages and labels', async () => {
  const { GAMES } = await import('../../app/src/games/registry.js');
  assert.deepEqual(GAMES.map((g) => g.id), ['matikka', 'sanat', 'espanja']);
  assert.deepEqual(GAMES.map((g) => g.lang), ['fi-FI', 'fi-FI', 'es-ES']);
  assert.deepEqual(GAMES.map((g) => g.name), ['Matikka', 'Sanat', 'Espanja']);
  assert.deepEqual(GAMES.map((g) => g.listenLabel), ['Kuuntele lasku', 'Kuuntele sana', 'Kuuntele']);
  for (const g of GAMES) assert.equal(typeof g.module.create, 'function', g.id);
});

// The game modules touch `document` only inside create, so give it a stub just for this test
// and read the sample back through the say() call that listen() makes.
test('Sanat says kissa at 0.78, then kissa at 0.52 after a pause; the first part is never delayed', async () => {
  const { GAMES } = await import('../../app/src/games/registry.js');
  const sanat = GAMES.find((g) => g.id === 'sanat');
  const stubEl = () => ({ append() {}, set className(v) {}, set textContent(v) {} });
  const realDocument = globalThis.document;
  globalThis.document = { createElement: stubEl };
  let parts;
  try {
    const slot = { append() {} };
    const instance = sanat.module.create({
      root: slot,
      question: slot,
      status: slot,
      speech: { say: (p) => { parts = p; }, stop() {} },
      reportProgress() {},
    });
    instance.listen();
  } finally {
    globalThis.document = realDocument;
  }
  assert.equal(parts.length, 2);
  assert.deepEqual([parts[0].text, parts[0].rate], ['kissa', 0.78]);
  assert.equal(parts[0].pauseMs, undefined);
  assert.deepEqual([parts[1].text, parts[1].rate], ['kissa', 0.52]);
  assert.ok(parts[1].pauseMs >= 500, `pauseMs was ${parts[1].pauseMs}`);
});
