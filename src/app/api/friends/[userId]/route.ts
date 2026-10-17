import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseId, withAuth } from '@/lib/api-handler';
import { REPAS_INCLUDE } from '@/lib/repas-input';
import { formatRepasResponse } from '@/lib/api-formatters';
import { FRIEND_SUMMARY_SELECT, assertFriends, findFriendship, purgeSharedAccess, toFriendSummary } from '@/lib/friends';
import type { FriendProfile } from '@/types';

type Params = { userId: string };
const ID_INVALIDE = "L'identifiant de l'utilisateur doit être un nombre valide.";

/**
 * GET /api/friends/[userId]
 * Profil d'un ami et toutes ses recettes publiques (`savedByMe` : déjà dans mon carnet).
 */
export const GET = withAuth<Params>(async (_request, user, { userId }) => {
  const friendId = parseId(userId, ID_INVALIDE);
  await assertFriends(user.id, friendId);

  const friend = await db.user.findUniqueOrThrow({
    where: { id: friendId },
    select: {
      ...FRIEND_SUMMARY_SELECT,
      repas: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        include: { ...REPAS_INCLUDE, savedBy: { where: { userId: user.id }, select: { id: true } } },
      },
    },
  });

  const body: FriendProfile = {
    ...toFriendSummary(friend),
    repas: friend.repas.map((r) => ({ ...formatRepasResponse(r), savedByMe: r.savedBy.length > 0 })),
  };
  return NextResponse.json(body);
});

/**
 * DELETE /api/friends/[userId]
 * Retire un ami : ses recettes quittent mon carnet (et mon planning), les miennes quittent le sien.
 */
export const DELETE = withAuth<Params>(async (_request, user, { userId }) => {
  const friendId = parseId(userId, ID_INVALIDE);
  const friendship = await findFriendship(user.id, friendId);
  if (friendship?.status !== 'accepted') throw new HttpError(404, 'Cet utilisateur ne fait pas partie de vos amis.');

  await db.$transaction(async (tx) => {
    await tx.friendship.delete({ where: { id: friendship.id } });
    await purgeSharedAccess(tx, { userId: friendId }, { equals: user.id });
    await purgeSharedAccess(tx, { userId: user.id }, { equals: friendId });
  });
  return NextResponse.json({ message: 'Ami retiré.' });
});
