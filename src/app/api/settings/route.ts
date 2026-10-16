import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, parseBody } from '@/lib/api-handler';
import { settingsSchema } from '@/lib/schemas';

/**
 * GET /api/settings
 * Retourne les préférences de l'utilisateur connecté.
 */
export const GET = withAuth(async (_request, user) => {
  return NextResponse.json({ weekStartDay: user.weekStartDay });
});

/**
 * PATCH /api/settings
 * Met à jour les préférences de l'utilisateur connecté.
 * Payload: { weekStartDay?: number }
 */
export const PATCH = withAuth(async (request, user) => {
  const { weekStartDay } = await parseBody(request, settingsSchema);

  const updated = await db.user.update({
    where: { id: user.id },
    data: { ...(weekStartDay !== undefined && { weekStartDay }) },
    select: { weekStartDay: true },
  });
  return NextResponse.json(updated);
});
