import './env';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, loginAs, json, clearCookies } from './helpers';
import * as repas from '../src/app/api/repas/route';
import * as planning from '../src/app/api/planning/route';
import * as shopping from '../src/app/api/shopping-list/route';
import * as register from '../src/app/api/auth/register/route';
import * as login from '../src/app/api/auth/login/route';
import * as refresh from '../src/app/api/auth/refresh/route';
import * as logout from '../src/app/api/auth/logout/route';
import { setCookie } from './env';

beforeEach(() => clearCookies());

test('planning : 401 sans session', async () => {
  assert.equal((await planning.GET(json('/api/planning', 'GET'))).status, 401);
});

test('planning : paramètres invalides -> 400', async () => {
  await loginAs();
  assert.equal((await planning.GET(json('/api/planning?week=99&year=2025', 'GET'))).status, 400);
});

test('planning : programmer un repas, le relire, remplacer le créneau', async () => {
  const u = await loginAs();
  const a = await db.repas.create({ data: { userId: u.id, titre: 'A' } });
  const b = await db.repas.create({ data: { userId: u.id, titre: 'B' } });
  const body = { date: '2025-03-05', heure: 0 };

  assert.equal((await planning.POST(json('/api/planning', 'POST', { repasId: a.id, ...body }))).status, 201);
  await planning.POST(json('/api/planning', 'POST', { repasId: b.id, ...body }));

  const res = await planning.GET(json('/api/planning?week=10&year=2025', 'GET'));
  const data = await res.json();
  assert.equal(data.programmations.length, 1); // doublon de créneau => remplacement
  assert.equal(data.programmations[0].repas.titre, 'B');
});

test('planning : refuse le repas d\'un autre utilisateur (403) et inconnu (404)', async () => {
  const other = await loginAs();
  const foreign = await db.repas.create({ data: { userId: other.id, titre: 'X' } });
  await loginAs();
  const post = (repasId: number) => planning.POST(json('/api/planning', 'POST', { repasId, date: '2025-03-05', heure: 1 }));
  assert.equal((await post(foreign.id)).status, 403);
  assert.equal((await post(999999)).status, 404);
});

test('liste de courses : agrège les ingrédients de la semaine', async () => {
  const u = await loginAs();
  const oeuf = await db.ingredient.create({ data: { nom: `oeuf${Date.now()}`, categorie: 'cremerie' } });
  const mk = (titre: string, q: number) =>
    db.repas.create({ data: { userId: u.id, titre, ingredients: { create: { ingredientId: oeuf.id, quantite: q, unite: null } } } });
  const [r1, r2] = [await mk('R1', 2), await mk('R2', 4)];
  for (const [r, heure] of [[r1, 0], [r2, 1]] as const) {
    await planning.POST(json('/api/planning', 'POST', { repasId: r.id, date: '2025-03-05', heure }));
  }
  const data = await (await shopping.GET(json('/api/shopping-list?week=10&year=2025', 'GET'))).json();
  const items = data.categories.flatMap((c: { items: { ingredientId: number; quantite: number }[] }) => c.items);
  const it = items.find((i: { ingredientId: number }) => i.ingredientId === oeuf.id);
  assert.equal(it.quantite, 6);
});

test('auth : inscription, login, refresh, logout (refresh token haché)', async () => {
  const email = `a${Date.now()}@t.fr`;
  const h = { 'x-forwarded-for': `1.1.1.${Date.now() % 250}` };
  const reg = await register.POST(json('/api/auth/register', 'POST', { email, password: 'secret1' }, h));
  assert.equal(reg.status, 201);
  assert.equal((await register.POST(json('/api/auth/register', 'POST', { email, password: 'secret1' }, h))).status, 400);
  assert.equal((await login.POST(json('/api/auth/login', 'POST', { email, password: 'mauvais' }, h))).status, 401);
  assert.equal((await login.POST(json('/api/auth/login', 'POST', { email: 'no@t.fr', password: 'x' }, h))).status, 401);

  const ok = await login.POST(json('/api/auth/login', 'POST', { email, password: 'secret1' }, h));
  assert.equal(ok.status, 200);
  const raw = ok.cookies.get('refresh_token')!.value;
  assert.equal(await db.refreshToken.count({ where: { token: raw } }), 0); // pas de clair en base
  setCookie('refresh_token', raw);
  assert.equal((await refresh.POST()).status, 200);
  await logout.POST();
  assert.equal((await refresh.POST()).status, 401);
});

test('auth : limitation de débit -> 429', async () => {
  const h = { 'x-forwarded-for': '9.9.9.9' };
  let last = 0;
  for (let i = 0; i < 12; i++) last = (await login.POST(json('/api/auth/login', 'POST', { email: 'z@t.fr', password: 'x' }, h))).status;
  assert.equal(last, 429);
});

test('repas : ingrédient nouveau en double ou créé en parallèle -> 201 (pas de 500)', async () => {
  await loginAs();
  const nom = `basilic${Date.now()}`;
  const ing = { nom, categorie: 'fruits-legumes' };
  const post = (ingredients: object[]) => repas.POST(json('/api/repas', 'POST', { titre: 'T', ingredients }));

  assert.equal((await post([{ ...ing, quantite: 1 }, { ...ing, quantite: 2 }])).status, 201);
  const nom2 = `thym${Date.now()}`;
  const res = await Promise.all(Array.from({ length: 6 }, () => post([{ nom: nom2, categorie: 'epicerie-salee' }])));
  assert.deepEqual(res.map((r) => r.status), Array(6).fill(201));
  assert.equal(await db.ingredient.count({ where: { nom: nom2 } }), 1);
});
