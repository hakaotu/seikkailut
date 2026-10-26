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
