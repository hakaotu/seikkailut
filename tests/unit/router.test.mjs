import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRoute, routeToHash, titleFor } from '../../app/src/router.js';

const ids = ['matikka', 'sanat', 'espanja'];
const games = [
  { id: 'matikka', name: 'Matikka' },
  { id: 'sanat', name: 'Sanat' },
  { id: 'espanja', name: 'Espanja' },
];

test('empty, bare and root hashes are home', () => {
  for (const h of ['', '#', '#/', undefined, null]) {
    assert.deepEqual(parseRoute(h, ids), { view: 'home' }, String(h));
  }
});

test('known game hashes open that game', () => {
  for (const id of ids) {
    assert.deepEqual(parseRoute(`#/${id}`, ids), { view: 'game', id });
  }
});

test('unknown or malformed hashes are home', () => {
  for (const h of ['#/shakki', '#/Matikka', '#/matikka/x', '#matikka', '#/matikka/', '#//matikka', '/matikka']) {
    assert.deepEqual(parseRoute(h, ids), { view: 'home' }, h);
  }
});

test('routeToHash round-trips', () => {
  assert.equal(routeToHash({ view: 'home' }), '#/');
  for (const id of ids) {
    assert.deepEqual(parseRoute(routeToHash({ view: 'game', id }), ids), { view: 'game', id });
  }
});

test('titleFor uses an en dash (U+2013)', () => {
  assert.equal(titleFor({ view: 'home' }, games), 'Seikkailut');
  assert.equal(titleFor({ view: 'game', id: 'espanja' }, games), 'Espanja – Seikkailut');
  assert.equal(titleFor({ view: 'game', id: 'matikka' }, games), 'Matikka – Seikkailut');
});
