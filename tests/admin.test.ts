import './env';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, loginAs, json, clearCookies } from './helpers';
import * as adminMod from '../src/app/api/admin/route';
import * as tableMod from '../src/app/api/admin/[model]/route';
import * as rowMod from '../src/app/api/admin/[model]/[id]/route';

beforeEach(() => clearCookies());

const ctx = <P>(params: P) => ({ params: Promise.resolve(params) });
const loginAdmin = async () => {
  const u = await loginAs();
  await db.user.update({ where: { id: u.id }, data: { isAdmin: true } });
  return u;
};

test('admin : 401 sans session, 403 pour un utilisateur non admin', async () => {
  assert.equal((await adminMod.GET(json('/api/admin', 'GET'), ctx({}))).status, 401);
  await loginAs();
  assert.equal((await adminMod.GET(json('/api/admin', 'GET'), ctx({}))).status, 403);
  const res = await tableMod.GET(json('/api/admin/User', 'GET'), ctx({ model: 'User' }));
  assert.equal(res.status, 403);
});

test('admin : tables listées, mot de passe jamais renvoyé', async () => {
  await loginAdmin();
  const { models } = await (await adminMod.GET(json('/api/admin', 'GET'), ctx({}))).json();
  assert.ok(models.some((m: { name: string }) => m.name === 'Ingredient'));
  const { rows } = await (await tableMod.GET(json('/api/admin/User', 'GET'), ctx({ model: 'User' }))).json();
  assert.ok(rows.length > 0);
  assert.ok(!('passwordHash' in rows[0]));
  assert.equal((await tableMod.GET(json('/api/admin/Nope', 'GET'), ctx({ model: 'Nope' }))).status, 404);
});

test('admin : créer, modifier, supprimer une ligne ; erreurs lisibles', async () => {
  await loginAdmin();
  const nom = `admin${Date.now()}`;
  const post = (body: unknown) => tableMod.POST(json('/api/admin/Ingredient', 'POST', body), ctx({ model: 'Ingredient' }));

  const created = await post({ nom, categorie: 'frais' });
  assert.equal(created.status, 201);
  const { id } = await created.json();
  assert.equal((await post({ nom, categorie: 'frais' })).status, 409); // unicité
  assert.equal((await post({ inconnu: 'x' })).status, 400);

  const params = ctx({ model: 'Ingredient', id: String(id) });
  const patch = await rowMod.PATCH(json(`/api/admin/Ingredient/${id}`, 'PATCH', { categorie: 'epicerie-salee' }), params);
  assert.equal((await patch.json()).categorie, 'epicerie-salee');
  assert.equal((await rowMod.PATCH(json('/x', 'PATCH', { nom: '' }), params)).status, 400); // obligatoire

  assert.equal((await rowMod.DELETE(json('/x', 'DELETE'), params)).status, 200);
  assert.equal((await rowMod.DELETE(json('/x', 'DELETE'), params)).status, 404);
});

test('admin : types convertis, pseudo et mot de passe dérivés', async () => {
  const admin = await loginAdmin();
  const params = ctx({ model: 'User', id: String(admin.id) });
  const n = Date.now();
  const res = await rowMod.PATCH(json('/x', 'PATCH', { pseudo: `Élodie ${n}`, weekStartDay: '3', passwordHash: 'secret' }), params);
  assert.equal(res.status, 200);
  const user = await db.user.findUniqueOrThrow({ where: { id: admin.id } });
  assert.equal(user.weekStartDay, 3);
  assert.equal(user.pseudoKey, `elodie ${n}`);
  assert.notEqual(user.passwordHash, 'secret');
  assert.equal((await rowMod.PATCH(json('/x', 'PATCH', { weekStartDay: 'abc' }), params)).status, 400);
});
