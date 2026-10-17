import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, assertOwned, parseBody, parseId, withAuth } from '@/lib/api-handler';
import { toDbDate } from '@/lib/date-utils';
import { updateProgrammationSchema } from '@/lib/schemas';
import { formatProgrammationResponse, PROGRAMMATION_INCLUDE } from '@/lib/api-formatters';
import { assertUsableRepas } from '@/lib/friends';

type Params = { id: string };
const ID_INVALIDE = "L'identifiant de la programmation doit être un nombre valide.";

/**
 * PUT /api/planning/[id]
 * Modifie une programmation de repas existante.
 * Payload: { repasId?: number, date?: 'AAAA-MM-JJ', heure?: 0 | 1 }
 */
export const PUT = withAuth<Params>(async (request, user, { id }) => {
  const progId = parseId(id, ID_INVALIDE);
  const existing = assertOwned(await db.programmation.findUnique({ where: { id: progId } }), user.id, {
    notFound: 'Programmation non trouvée.',
    forbidden: "Vous n'êtes pas autorisé à modifier cette programmation.",
  });

  const { repasId, date, heure } = await parseBody(request, updateProgrammationSchema);

  if (repasId !== undefined) {
    await assertUsableRepas(repasId, user.id, {
      notFound: 'Le repas spécifié est introuvable.',
      forbidden: "Vous n'êtes pas autorisé à programmer ce repas.",
    });
  }

  const targetDate = date !== undefined ? toDbDate(date) : existing.date;
  const targetHeure = heure ?? existing.heure;

  // Si la date ou l'heure changent, le créneau visé ne doit pas déjà être pris
  if (date !== undefined || heure !== undefined) {
    const conflict = await db.programmation.findFirst({
      where: { userId: user.id, date: targetDate, heure: targetHeure, id: { not: progId } },
    });
    if (conflict) throw new HttpError(400, 'Ce créneau est déjà programmé pour un autre repas.');
  }

  const updated = await db.programmation.update({
    where: { id: progId },
    data: {
      ...(repasId !== undefined && { repasId }),
      ...(date !== undefined && { date: targetDate }),
      ...(heure !== undefined && { heure }),
    },
    include: PROGRAMMATION_INCLUDE,
  });
  return NextResponse.json(formatProgrammationResponse(updated), { status: 200 });
});

/**
 * DELETE /api/planning/[id]
 * Supprime une programmation existante (déprogrammation).
 */
export const DELETE = withAuth<Params>(async (_request, user, { id }) => {
  const progId = parseId(id, ID_INVALIDE);
  assertOwned(await db.programmation.findUnique({ where: { id: progId } }), user.id, {
    notFound: 'Programmation non trouvée.',
    forbidden: "Vous n'êtes pas autorisé à supprimer cette programmation.",
  });

  await db.programmation.delete({ where: { id: progId } });
  return NextResponse.json({ message: 'Programmation supprimée avec succès.' }, { status: 200 });
});
