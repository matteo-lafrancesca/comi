import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth } from '@/lib/api-handler';
import { FRIEND_SUMMARY_SELECT, toFriendSummary } from '@/lib/friends';
import type { FriendCard } from '@/types';

/** Ami + ses 3 dernières recettes publiques (vitrine) et leur nombre total. */
const CARD_SELECT = {
  ...FRIEND_SUMMARY_SELECT,
  repas: {
    where: { isPublic: true },
    orderBy: { createdAt: 'desc' },
    take: 3,
    select: { id: true, titre: true, photoUrl: true },
  },
  _count: { select: { repas: { where: { isPublic: true } } } },
} as const;

/**
 * GET /api/friends
 * Mes amis (demandes acceptées), triés par pseudo, avec leur vitrine.
 */
export const GET = withAuth(async (_request, user) => {
  const friendships = await db.friendship.findMany({
    where: { status: 'accepted', OR: [{ requesterId: user.id }, { addresseeId: user.id }] },
    include: { requester: { select: CARD_SELECT }, addressee: { select: CARD_SELECT } },
  });

  const friends: FriendCard[] = friendships
    .map((f) => (f.requesterId === user.id ? f.addressee : f.requester))
    .map((friend) => ({ ...toFriendSummary(friend), vitrine: friend.repas, recipeCount: friend._count.repas }))
    .sort((a, b) => a.pseudo.localeCompare(b.pseudo, 'fr', { sensitivity: 'base' }));
  return NextResponse.json(friends);
});
