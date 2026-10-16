import './env';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, loginAs, json, clearCookies, routes } from './helpers';
import * as repasMod from '../src/app/api/repas/route';
import * as planningMod from '../src/app/api/planning/route';
import * as shoppingMod from '../src/app/api/shopping-list/route';
import * as repasId from '../src/app/api/repas/[id]/route';
import * as register from '../src/app/api/auth/register/route';
import * as login from '../src/app/api/auth/login/route';
import * as refresh from '../src/app/api/auth/refresh/route';
import * as logout from '../src/app/api/auth/logout/route';
import { setCookie } from './env';

const repas = routes(repasMod);
const planning = routes(planningMod);
const shopping = routes(shoppingMod);

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

test('planning : GET renvoie la semaine calculée par le serveur (jours, précédente, suivante)', async () => {
  await loginAs(2); // semaine démarrant mercredi
  const data = await (await planning.GET(json('/api/planning?week=10&year=2025', 'GET'))).json();
  assert.equal(data.weekStartDay, 2);
  assert.equal(data.start, '2025-02-26');
  assert.equal(data.end, '2025-03-04');
  assert.equal(data.days.length, 7);
  assert.deepEqual(data.prev, { week: 9, year: 2025 });
  assert.deepEqual(data.next, { week: 11, year: 2025 });
});

test('planning : semaine ou année seule, semaine 53 inexistante, date mal formée -> 400', async () => {
  const u = await loginAs();
  assert.equal((await planning.GET(json('/api/planning?week=10', 'GET'))).status, 400);
  assert.equal((await planning.GET(json('/api/planning?week=53&year=2025', 'GET'))).status, 400);
  const r = await db.repas.create({ data: { userId: u.id, titre: 'D' } });
  for (const date of ['2025-3-5', '2025-03-05T10:00:00Z', '2025-02-30']) {
    assert.equal((await planning.POST(json('/api/planning', 'POST', { repasId: r.id, date, heure: 0 }))).status, 400, date);
  }
});

test('planning : créneau écrit en parallèle -> une seule programmation', async () => {
  const u = await loginAs();
  const repasList = await Promise.all(['A', 'B', 'C', 'D'].map((titre) => db.repas.create({ data: { userId: u.id, titre } })));
  const res = await Promise.all(
    repasList.map((r) => planning.POST(json('/api/planning', 'POST', { repasId: r.id, date: '2025-03-06', heure: 1 })))
  );
  assert.ok(res.every((r) => r.status === 200 || r.status === 201));
  assert.equal(await db.programmation.count({ where: { userId: u.id } }), 1);
});

test('liste de courses : synchronisations simultanées -> aucun doublon, case cochée conservée', async () => {
  const u = await loginAs();
  const sel = await db.ingredient.create({ data: { nom: `sel${Date.now()}`, categorie: 'epicerie-salee' } });
  const r = await db.repas.create({
    data: { userId: u.id, titre: 'S', ingredients: { create: { ingredientId: sel.id, quantite: null, unite: null } } },
  });
  await planning.POST(json('/api/planning', 'POST', { repasId: r.id, date: '2025-03-05', heure: 0 }));

  const get = () => shopping.GET(json('/api/shopping-list?week=10&year=2025', 'GET'));
  const results = await Promise.all(Array.from({ length: 6 }, get));
  assert.ok(results.every((x) => x.status === 200));
  assert.equal(await db.shoppingListItem.count({ where: { userId: u.id } }), 1);

  const item = await db.shoppingListItem.findFirstOrThrow({ where: { userId: u.id } });
  await shopping.PATCH(json('/api/shopping-list', 'PATCH', { items: [{ id: item.id, isChecked: true }] }));
  await get();
  assert.equal((await db.shoppingListItem.findUniqueOrThrow({ where: { id: item.id } })).isChecked, true);
});

test('liste de courses : repas déprogrammé -> article retiré', async () => {
  const u = await loginAs();
  const ing = await db.ingredient.create({ data: { nom: `poivre${Date.now()}`, categorie: 'epicerie-salee' } });
  const r = await db.repas.create({
    data: { userId: u.id, titre: 'P', ingredients: { create: { ingredientId: ing.id, quantite: 1, unite: 'g' } } },
  });
  const created = await planning.POST(json('/api/planning', 'POST', { repasId: r.id, date: '2025-03-05', heure: 0 }));
  const { id } = await created.json();
  await shopping.GET(json('/api/shopping-list?week=10&year=2025', 'GET'));
  assert.equal(await db.shoppingListItem.count({ where: { userId: u.id } }), 1);

  await db.programmation.delete({ where: { id } });
  await shopping.GET(json('/api/shopping-list?week=10&year=2025', 'GET'));
  assert.equal(await db.shoppingListItem.count({ where: { userId: u.id } }), 0);
});

// ── /api/repas/[id] et validation partagée ──────────────────────────────────

const byId = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });

test('repas : validation (400), userId du body ignoré, PATCH partiel conserve les champs omis', async () => {
  const u = await loginAs();
  const other = await loginAs();
  const { signJWT } = await import('../src/lib/auth');
  setCookie('token', await signJWT({ userId: u.id, email: u.email }));

  assert.equal((await repas.POST(json('/api/repas', 'POST', { titre: '  ' }))).status, 400);
  assert.equal((await repas.POST(json('/api/repas', 'POST', { titre: 'T', ingredients: 'x' }))).status, 400);
  assert.equal((await repas.POST(json('/api/repas', 'POST', { titre: 'T', ingredients: [{ nom: 'a' }] }))).status, 400);

  const created = await repas.POST(
    json('/api/repas', 'POST', { titre: ' Gratin ', recette: 'étape 1', photoUrl: 'https://x/y.jpg', userId: other.id })
  );
  assert.equal(created.status, 201);
  const meal = await created.json();
  assert.equal(meal.userId, u.id);
  assert.equal(meal.titre, 'Gratin');

  const patched = await repasId.PATCH(json(`/api/repas/${meal.id}`, 'PATCH', { titre: 'Gratin 2' }), byId(meal.id));
  assert.equal(patched.status, 200);
  const row = await db.repas.findUniqueOrThrow({ where: { id: meal.id } });
  assert.deepEqual([row.titre, row.recette, row.photoUrl], ['Gratin 2', 'étape 1', 'https://x/y.jpg']);

  await repasId.PATCH(json(`/api/repas/${meal.id}`, 'PATCH', { photoUrl: null }), byId(meal.id));
  assert.equal((await db.repas.findUniqueOrThrow({ where: { id: meal.id } })).photoUrl, null);
});

test('repas/[id] : 400 id invalide, 404, 403 autre utilisateur, suppression', async () => {
  const owner = await loginAs();
  const mine = await db.repas.create({ data: { userId: owner.id, titre: 'M' } });
  await loginAs(); // autre utilisateur connecté

  assert.equal((await repasId.GET(json('/api/repas/abc', 'GET'), { params: Promise.resolve({ id: 'abc' }) })).status, 400);
  assert.equal((await repasId.GET(json('/api/repas/999999', 'GET'), byId(999999))).status, 404);
  assert.equal((await repasId.GET(json(`/api/repas/${mine.id}`, 'GET'), byId(mine.id))).status, 403);
  assert.equal((await repasId.DELETE(json(`/api/repas/${mine.id}`, 'DELETE'), byId(mine.id))).status, 403);

  const { signJWT } = await import('../src/lib/auth');
  setCookie('token', await signJWT({ userId: owner.id, email: owner.email }));
  assert.equal((await repasId.DELETE(json(`/api/repas/${mine.id}`, 'DELETE'), byId(mine.id))).status, 200);
  assert.equal(await db.repas.count({ where: { id: mine.id } }), 0);
});

test('resolveSession : access token valide, sinon refresh token (cookies renvoyés), sinon null', async () => {
  const { resolveSession, signJWT, createRefreshToken } = await import('../src/lib/auth');
  const u = await loginAs();
  const access = await signJWT({ userId: u.id, email: u.email });
  const refreshToken = await createRefreshToken(u.id);

  const direct = await resolveSession(access, undefined);
  assert.equal(direct?.user.id, u.id);
  assert.equal(direct?.renewed, null);

  const viaRefresh = await resolveSession('jwt.invalide.ici', refreshToken);
  assert.equal(viaRefresh?.user.id, u.id);
  assert.ok(viaRefresh?.renewed?.accessToken);

  assert.equal(await resolveSession(undefined, 'inconnu'), null);
  assert.equal(await resolveSession(undefined, undefined), null);
});
