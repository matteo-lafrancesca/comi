import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, parseBody, HttpError } from '@/lib/api-handler';
import { settingsSchema } from '@/lib/schemas';
import { cleanText } from '@/lib/repas-input';
import { PSEUDO_PRIS, isPseudoTaken, pseudoFields } from '@/lib/pseudo';

/**
 * GET /api/settings
 * Retourne les préférences de l'utilisateur connecté.
 */
export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ weekStartDay: user.weekStartDay });
});

/**
 * PATCH /api/settings
 * Met à jour les préférences et le profil de l'utilisateur connecté.
 * Payload: { weekStartDay?: number, pseudo?: string, photoUrl?: string | null }
 */
export const PATCH = withAuth(async (request, user) => {
  const { weekStartDay, pseudo, photoUrl } = await parseBody(request, settingsSchema);

  if (pseudo !== undefined && (await isPseudoTaken(pseudo, user.id))) throw new HttpError(409, PSEUDO_PRIS);

  const updated = await db.user.update({
    where: { id: user.id },
    data: {
      ...(weekStartDay !== undefined && { weekStartDay }),
      ...(pseudo !== undefined && pseudoFields(pseudo)),
      ...(photoUrl !== undefined && { photoUrl: cleanText(photoUrl) }),
    },
    select: { weekStartDay: true, pseudo: true, photoUrl: true },
  });
  return NextResponse.json(updated);
});
