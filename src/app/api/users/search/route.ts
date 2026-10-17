import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, withAuth } from '@/lib/api-handler';
import { isRateLimited } from '@/lib/rate-limit';
import { normalizeSearchText } from '@/lib/string-utils';
import { FRIEND_SUMMARY_SELECT, relationOf, requirePseudo, toFriendSummary } from '@/lib/friends';
import type { UserSearchResult } from '@/types';

/**
 * GET /api/users/search?q=
 * Utilisateurs dont le pseudo commence par `q` (sans casse ni accents, 2 caractères minimum),
 * avec la relation et la demande en cours. 10 résultats au plus, jamais l'e-mail.
 */
export const GET = withAuth(async (request, user) => {
  requirePseudo(user);
  if (isRateLimited(`user-search:${user.id}`, 60, 60_000)) {
    throw new HttpError(429, 'Trop de recherches. Réessayez dans une minute.');
  }

  const q = normalizeSearchText(new URL(request.url).searchParams.get('q')?.trim() ?? '');
  if (q.length < 2) return NextResponse.json([]);

  const users = await db.user.findMany({
    where: { pseudoKey: { startsWith: q }, id: { not: user.id } },
    select: {
      ...FRIEND_SUMMARY_SELECT,
      friendRequestsSent: { where: { addresseeId: user.id } },
      friendRequestsReceived: { where: { requesterId: user.id } },
    },
    orderBy: { pseudoKey: 'asc' },
    take: 10,
  });

  const results: UserSearchResult[] = users.map((u) => {
    const friendship = u.friendRequestsSent[0] ?? u.friendRequestsReceived[0] ?? null;
    return {
      ...toFriendSummary(u),
      relation: relationOf(user.id, friendship),
      requestId: friendship?.status === 'pending' ? friendship.id : null,
    };
  });
  return NextResponse.json(results);
});
