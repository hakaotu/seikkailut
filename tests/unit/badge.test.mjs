import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeFor } from '../../app/src/shell.js';

test('no progress, 0 done, or finished: no badge', () => {
  assert.equal(badgeFor(undefined), null);
  assert.equal(badgeFor({ done: 0, total: 10, finished: false }), null);
  assert.equal(badgeFor({ done: 10, total: 10, finished: true }), null);
  assert.equal(badgeFor({ done: 4, total: 10, finished: true }), null);
});

test('1..9 done and not finished: badge with visible and screen reader text', () => {
  assert.deepEqual(badgeFor({ done: 4, total: 10, finished: false }), {
    text: 'Kesken 4/10',
    srText: 'Kesken, 4 tehtävää 10:stä tehty.',
  });
  assert.equal(badgeFor({ done: 1, total: 10, finished: false }).text, 'Kesken 1/10');
  assert.equal(badgeFor({ done: 9, total: 10, finished: false }).text, 'Kesken 9/10');
});
