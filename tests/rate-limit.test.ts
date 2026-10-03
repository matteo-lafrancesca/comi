import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isRateLimited } from '../src/lib/rate-limit';

test('limiteur : bloque au-delà du max puis se réinitialise', () => {
  const t = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(isRateLimited('k', 3, 1000, t), false);
  assert.equal(isRateLimited('k', 3, 1000, t), true);
  assert.equal(isRateLimited('autre', 3, 1000, t), false);
  assert.equal(isRateLimited('k', 3, 1000, t + 1001), false);
});
