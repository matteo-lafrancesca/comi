import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseId, withAuth } from '@/lib/api-handler';

type Params = { id: string };

/**
 * DELETE /api/friends/requests/[id]
 * Refuse (destinataire) ou annule (expéditeur) une demande en attente.
 */
export const DELETE = withAuth<Params>(async (_request, user, { id }) => {
  const requestId = parseId(id, "L'identifiant de la demande doit être un nombre valide.");
  const friendship = await db.friendship.findUnique({ where: { id: requestId } });
  if (!friendship || friendship.status !== 'pending') throw new HttpError(404, 'Demande introuvable.');
  if (friendship.requesterId !== user.id && friendship.addresseeId !== user.id) {
    throw new HttpError(403, "Cette demande ne vous concerne pas.");
  }

  await db.friendship.delete({ where: { id: requestId } });
  return NextResponse.json({ message: 'Demande supprimée.' });
});
