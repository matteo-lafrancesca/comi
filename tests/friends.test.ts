import './env';
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { db, loginAs, actAs, json, clearCookies, routes } from './helpers';
import * as searchMod from '../src/app/api/users/search/route';
import * as requestsMod from '../src/app/api/friends/requests/route';
import * as friendsMod from '../src/app/api/friends/route';
import * as requestId from '../src/app/api/friends/requests/[id]/route';
import * as acceptMod from '../src/app/api/friends/requests/[id]/accept/route';
import * as friendId from '../src/app/api/friends/[userId]/route';
import type { FriendCard, FriendProfile, FriendRequestsResponse, UserSearchResult } from '../src/types';

const search = routes(searchMod);
const requests = routes(requestsMod);
const friends = routes(friendsMod);
const byId = (id: number) => ({ params: Promise.resolve({ id: String(id) }) });
const byUser = (id: number) => ({ params: Promise.resolve({ userId: String(id) }) });

beforeEach(() => clearCookies());

type U = Awaited<ReturnType<typeof loginAs>>;
const sendRequest = (to: U) => requests.POST(json('/api/friends/requests', 'POST', { userId: to.id }));
const acceptRequest = (id: number) => acceptMod.POST(json(`/api/friends/requests/${id}/accept`, 'POST'), byId(id));
const listRequests = async (): Promise<FriendRequestsResponse> =>
  (await requests.GET(json('/api/friends/requests', 'GET'))).json();
const searchFor = async (q: string): Promise<UserSearchResult[]> =>
  (await search.GET(json(`/api/users/search?q=${encodeURIComponent(q)}`, 'GET'))).json();

/** a et b deviennent amis ; la session finit sur a. */
async function makeFriends(a: U, b: U) {
  await actAs(a);
  await sendRequest(b);
  await actAs(b);
  await sendRequest(a); // demande croisée : acceptée directement
  await actAs(a);
}

test('amis : pseudo obligatoire (403)', async () => {
  const u = await loginAs();
  await db.user.update({ where: { id: u.id }, data: { pseudo: null, pseudoKey: null } });
  assert.equal((await search.GET(json('/api/users/search?q=ab', 'GET'))).status, 403);
  assert.equal((await requests.POST(json('/api/friends/requests', 'POST', { userId: 1 }))).status, 403);
});

test('recherche : préfixe sans casse ni accents, sans soi-même ni e-mail, 2 caractères minimum', async () => {
  const tag = `ze${Date.now()}`;
  const me = await loginAs();
  await db.user.update({ where: { id: me.id }, data: { pseudo: `${tag} Moi`, pseudoKey: `${tag} moi` } });
  const other = await db.user.create({
    data: { email: `o${Date.now()}@t.fr`, passwordHash: 'x', pseudo: `${tag} Léa`, pseudoKey: `${tag} lea` },
  });

  assert.deepEqual(await searchFor(`${tag.toUpperCase()} LÉ`), [
    { id: other.id, pseudo: `${tag} Léa`, photoUrl: null, relation: 'none', requestId: null },
  ]);
  assert.deepEqual((await searchFor(tag)).map((u) => u.id), [other.id]); // pas soi-même
  assert.deepEqual(await searchFor('z'), []);
});

test('demandes : envoyer, doublon, soi-même, inconnu, voir, accepter, liste avec vitrine publique', async () => {
  const a = await loginAs();
  const b = await loginAs();
  for (let i = 1; i <= 4; i++) {
    await db.repas.create({ data: { userId: b.id, titre: `Public ${i}`, isPublic: true, createdAt: new Date(2025, 0, i) } });
  }
  await db.repas.create({ data: { userId: b.id, titre: 'Privé' } });

  await actAs(a);
  const sent = await sendRequest(b);
  assert.equal(sent.status, 201);
  assert.deepEqual(await sent.json(), { relation: 'sent' });
  assert.equal((await sendRequest(b)).status, 409);
  assert.equal((await sendRequest(a)).status, 400);
  assert.equal((await requests.POST(json('/api/friends/requests', 'POST', { userId: 99999999 }))).status, 404);

  const mine = await listRequests();
  assert.deepEqual(mine.sent.map((r) => r.user.id), [b.id]);
  const reqId = mine.sent[0].id;
  assert.equal((await acceptRequest(reqId)).status, 403); // l'expéditeur ne peut pas accepter

  await actAs(b);
  assert.deepEqual((await listRequests()).received.map((r) => r.user.id), [a.id]);
  assert.equal((await acceptRequest(reqId)).status, 200);
  assert.equal((await acceptRequest(reqId)).status, 404); // plus en attente

  await actAs(a);
  const list: FriendCard[] = await (await friends.GET(json('/api/friends', 'GET'))).json();
  assert.deepEqual(list.map((f) => f.id), [b.id]);
  assert.deepEqual(list[0].vitrine.map((r) => r.titre), ['Public 4', 'Public 3', 'Public 2']);
  assert.equal((await sendRequest(b)).status, 409); // déjà amis
  assert.equal((await searchFor(b.pseudo!))[0].relation, 'friend');
});

test('demandes : refuser, annuler, tiers interdit, relation vue dans la recherche', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const c = await loginAs();

  await actAs(a);
  await sendRequest(b);
  const reqId = (await listRequests()).sent[0].id;
  const del = (id: number) => requestId.DELETE(json(`/api/friends/requests/${id}`, 'DELETE'), byId(id));

  await actAs(b);
  const [seen] = await searchFor(a.pseudo!);
  assert.deepEqual([seen.relation, seen.requestId], ['received', reqId]);

  await actAs(c);
  assert.equal((await del(reqId)).status, 403);
  await actAs(b);
  assert.equal((await del(reqId)).status, 200); // refus
  assert.equal(await db.friendship.count({ where: { id: reqId } }), 0);

  await actAs(a);
  assert.equal((await sendRequest(b)).status, 201); // on peut redemander après un refus
  const id2 = (await listRequests()).sent[0].id;
  assert.equal((await del(id2)).status, 200); // annulation
});

test('profil : réservé aux amis, recettes publiques seulement, savedByMe', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const pub = await db.repas.create({ data: { userId: b.id, titre: 'Pub', isPublic: true, createdAt: new Date(2025, 0, 1) } });
  const pub2 = await db.repas.create({ data: { userId: b.id, titre: 'Pub 2', isPublic: true, createdAt: new Date(2025, 0, 2) } });
  await db.repas.create({ data: { userId: b.id, titre: 'Privé' } });
  const get = () => friendId.GET(json(`/api/friends/${b.id}`, 'GET'), byUser(b.id));

  await actAs(a);
  assert.equal((await get()).status, 403);

  await makeFriends(a, b);
  await db.repasSaved.create({ data: { userId: a.id, repasId: pub.id } });
  const profile: FriendProfile = await (await get()).json();
  assert.equal(profile.pseudo, b.pseudo);
  assert.equal('email' in profile, false);
  assert.deepEqual(
    profile.repas.map((r) => [r.id, r.savedByMe]),
    [
      [pub2.id, false],
      [pub.id, true],
    ]
  );
});

test('retirer un ami : recettes retirées des deux côtés, données personnelles conservées', async () => {
  const a = await loginAs();
  const b = await loginAs();
  const ofA = await db.repas.create({ data: { userId: a.id, titre: 'De A', isPublic: true } });
  const ofB = await db.repas.create({ data: { userId: b.id, titre: 'De B', isPublic: true } });
  await makeFriends(a, b);

  const date = new Date('2025-06-02T00:00:00Z');
  await db.repasSaved.createMany({
    data: [
      { userId: a.id, repasId: ofB.id },
      { userId: b.id, repasId: ofA.id },
    ],
  });
  await db.programmation.createMany({
    data: [
      { userId: a.id, repasId: ofB.id, date, heure: 0 },
      { userId: a.id, repasId: ofA.id, date, heure: 1 }, // son propre repas : conservé
      { userId: b.id, repasId: ofA.id, date, heure: 0 },
    ],
  });
  await db.shoppingListExtra.create({ data: { userId: a.id, repasId: ofB.id, week: 23, year: 2025 } });

  const remove = () => friendId.DELETE(json(`/api/friends/${b.id}`, 'DELETE'), byUser(b.id));
  assert.equal((await remove()).status, 200);
  assert.equal(await db.friendship.count({ where: { OR: [{ requesterId: a.id }, { addresseeId: a.id }] } }), 0);
  assert.equal(await db.repasSaved.count({ where: { userId: { in: [a.id, b.id] } } }), 0);
  assert.deepEqual(
    (await db.programmation.findMany({ where: { userId: { in: [a.id, b.id] } } })).map((p) => [p.userId, p.repasId]),
    [[a.id, ofA.id]]
  );
  assert.equal(await db.shoppingListExtra.count({ where: { userId: a.id } }), 0);
  assert.equal((await remove()).status, 404);
});
