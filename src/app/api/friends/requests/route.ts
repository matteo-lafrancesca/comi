import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseBody, withAuth } from '@/lib/api-handler';
import { friendRequestSchema } from '@/lib/schemas';
import { FRIEND_SUMMARY_SELECT, findFriendship, relationOf, requirePseudo, toFriendSummary } from '@/lib/friends';
import type { FriendRelation, FriendRequestsResponse } from '@/types';

/**
 * GET /api/friends/requests
 * Demandes en attente : reçues (à accepter / refuser) et envoyées (à annuler).
 */
export const GET = withAuth(async (_request, user) => {
  const [received, sent] = await Promise.all([
    db.friendship.findMany({
      where: { addresseeId: user.id, status: 'pending' },
      include: { requester: { select: FRIEND_SUMMARY_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
    db.friendship.findMany({
      where: { requesterId: user.id, status: 'pending' },
      include: { addressee: { select: FRIEND_SUMMARY_SELECT } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const body: FriendRequestsResponse = {
    received: received.map((f) => ({ id: f.id, user: toFriendSummary(f.requester), createdAt: f.createdAt })),
    sent: sent.map((f) => ({ id: f.id, user: toFriendSummary(f.addressee), createdAt: f.createdAt })),
  };
  return NextResponse.json(body);
});

/**
 * POST /api/friends/requests
 * Envoie une demande d'ami. Si l'autre m'en avait déjà envoyé une, elle est acceptée directement.
 * Payload: { userId: string } (identifiant public) — Réponse : { relation: 'sent' | 'friend' }
 */
export const POST = withAuth(async (request, user) => {
  requirePseudo(user);
  const { userId: publicId } = await parseBody(request, friendRequestSchema);
  const target = await db.user.findUnique({ where: { publicId }, select: { id: true, pseudo: true } });
  if (!target?.pseudo) throw new HttpError(404, 'Utilisateur introuvable.');
  const userId = target.id;
  if (userId === user.id) throw new HttpError(400, 'Vous ne pouvez pas vous ajouter vous-même.');

  const existing = await findFriendship(user.id, userId);
  const relation = relationOf(user.id, existing);
  if (relation === 'friend') throw new HttpError(409, 'Vous êtes déjà amis.');
  if (relation === 'sent') throw new HttpError(409, 'Demande déjà envoyée.');

  if (existing && relation === 'received') {
    await db.friendship.update({ where: { id: existing.id }, data: { status: 'accepted' } });
    return NextResponse.json({ relation: 'friend' satisfies FriendRelation });
  }

  await db.friendship.create({ data: { requesterId: user.id, addresseeId: userId } });
  return NextResponse.json({ relation: 'sent' satisfies FriendRelation }, { status: 201 });
});
