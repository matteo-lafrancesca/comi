import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseId, withAuth } from '@/lib/api-handler';
import { requirePseudo } from '@/lib/friends';

type Params = { id: string };

/**
 * POST /api/friends/requests/[id]/accept
 * Accepte une demande reçue (seul son destinataire le peut).
 */
export const POST = withAuth<Params>(async (_request, user, { id }) => {
  requirePseudo(user);
  const requestId = parseId(id, "L'identifiant de la demande doit être un nombre valide.");
  const friendship = await db.friendship.findUnique({ where: { id: requestId } });
  if (!friendship || friendship.status !== 'pending') throw new HttpError(404, 'Demande introuvable.');
  if (friendship.addresseeId !== user.id) throw new HttpError(403, 'Seul le destinataire peut accepter cette demande.');

  await db.friendship.update({ where: { id: requestId }, data: { status: 'accepted' } });
  return NextResponse.json({ message: 'Demande acceptée.' });
});
