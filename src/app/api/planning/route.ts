import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, assertOwned, parseBody, withAuth } from '@/lib/api-handler';
import { toDbDate } from '@/lib/date-utils';
import { createProgrammationSchema } from '@/lib/schemas';
import { resolveWeek } from '@/lib/week-context';
import { formatProgrammationResponse, PROGRAMMATION_INCLUDE } from '@/lib/api-formatters';
import type { PlanningResponse } from '@/types';

/**
 * GET /api/planning
 * Récupère les programmations d'une semaine, avec les informations de semaine calculées côté serveur.
 * Query params optionnels (ensemble) : week (1-53), year (ex: 2026). Sans eux : semaine courante à Paris.
 */
export const GET = withAuth(async (request, user) => {
  const weekInfo = resolveWeek(new URL(request.url).searchParams, user.weekStartDay ?? 0);
  if (!weekInfo) throw new HttpError(400, 'Paramètres week ou year invalides.');

  const programmations = await db.programmation.findMany({
    where: {
      userId: user.id,
      date: { gte: toDbDate(weekInfo.start), lte: toDbDate(weekInfo.end) },
    },
    include: PROGRAMMATION_INCLUDE,
    orderBy: [{ date: 'asc' }, { heure: 'asc' }],
  });

  const body: PlanningResponse = {
    ...weekInfo,
    programmations: programmations.map(formatProgrammationResponse),
  };
  return NextResponse.json(body);
});

/**
 * POST /api/planning
 * Programme un repas sur un créneau (date + heure) ; remplace le repas déjà présent sur ce créneau.
 * Payload: { repasId: number, date: 'AAAA-MM-JJ', heure: 0 | 1 }
 */
export const POST = withAuth(async (request, user) => {
  const { repasId, date, heure } = await parseBody(request, createProgrammationSchema);

  assertOwned(await db.repas.findUnique({ where: { id: repasId } }), user.id, {
    notFound: 'Le repas spécifié est introuvable.',
    forbidden: "Vous n'êtes pas autorisé à programmer ce repas.",
  });

  // Unicité (userId, date, heure) garantie en base : l'upsert est sûr en cas de requêtes simultanées.
  const where = { userId_date_heure: { userId: user.id, date: toDbDate(date), heure } };
  const existing = await db.programmation.findUnique({ where, select: { id: true } });
  const programmation = await db.programmation.upsert({
    where,
    create: { userId: user.id, repasId, date: toDbDate(date), heure },
    update: { repasId },
    include: PROGRAMMATION_INCLUDE,
  });

  return NextResponse.json(formatProgrammationResponse(programmation), { status: existing ? 200 : 201 });
});
