import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAdmin, parseId, HttpError } from '@/lib/api-handler';
import { REPAS_INCLUDE, formatRepasResponse } from '@/lib/api-formatters';

/**
 * GET /api/admin/fiche-repas/[id]
 * Repas de n'importe quel utilisateur, au format de la fiche (`RepasDetailModal`).
 */
export const GET = withAdmin<{ id: string }>(async (_request, user, { id }) => {
  const repas = await db.repas.findUnique({ where: { id: parseId(id, 'Identifiant invalide.') }, include: REPAS_INCLUDE });
  if (!repas) throw new HttpError(404, 'Repas non trouvé.');
  return NextResponse.json(formatRepasResponse(repas, user.id));
});
