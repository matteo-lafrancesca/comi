import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SignJWT } from 'jose';
import { signJWT, verifyJWT } from '../src/lib/auth';

test('JWT : aller-retour', async () => {
  const p = await verifyJWT(await signJWT({ userId: 7, email: 'a@b.c' }));
  assert.deepEqual(p, { userId: 7, email: 'a@b.c' });
});

test('JWT : refuse un token falsifié, expiré ou mal signé', async () => {
  assert.equal(await verifyJWT('n.importe.quoi'), null);
  const bad = await new SignJWT({ userId: 1, email: 'x' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('1h')
    .sign(new TextEncoder().encode('autre-secret-autre-secret-autre-secret'));
  assert.equal(await verifyJWT(bad), null);
  const old = await new SignJWT({ userId: 1, email: 'x' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) - 10)
    .sign(new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key-at-least-32-chars-long'));
  assert.equal(await verifyJWT(old), null);
});
