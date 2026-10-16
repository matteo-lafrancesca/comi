import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { isValidYmd, toDbDate } from '@/lib/date-utils';
import { resolveWeek } from '@/lib/week-context';
import { formatProgrammationResponse, PROGRAMMATION_INCLUDE } from '@/lib/api-formatters';
import type { PlanningResponse } from '@/types';

/**
 * GET /api/planning
 * Récupère les programmations d'une semaine, avec les informations de semaine calculées côté serveur.
 * Query params optionnels (ensemble) : week (1-53), year (ex: 2026). Sans eux : semaine courante à Paris.
 */
export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
    }

    const weekInfo = resolveWeek(new URL(request.url).searchParams, sessionUser.weekStartDay ?? 0);
    if (!weekInfo) {
      return NextResponse.json({ error: 'Paramètres week ou year invalides.' }, { status: 400 });
    }

    const programmations = await db.programmation.findMany({
      where: {
        userId: sessionUser.id,
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
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de la récupération du planning.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/planning
 * Programme un repas sur un créneau (date + heure) ; remplace le repas déjà présent sur ce créneau.
 * Payload: { repasId: number, date: 'AAAA-MM-JJ', heure: 0 | 1 }
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
    }

    const { repasId, date, heure } = await request.json();

    if (typeof repasId !== 'number' || !date || typeof heure !== 'number') {
      return NextResponse.json({ error: 'Paramètres manquants ou invalides (repasId, date, heure).' }, { status: 400 });
    }
    if (heure !== 0 && heure !== 1) {
      return NextResponse.json({ error: "L'heure doit être 0 (midi) ou 1 (soir)." }, { status: 400 });
    }
    if (!isValidYmd(date)) {
      return NextResponse.json({ error: 'Format de date invalide (AAAA-MM-JJ attendu).' }, { status: 400 });
    }

    const repas = await db.repas.findUnique({ where: { id: repasId } });
    if (!repas) {
      return NextResponse.json({ error: 'Le repas spécifié est introuvable.' }, { status: 404 });
    }
    if (repas.userId !== sessionUser.id) {
      return NextResponse.json({ error: "Vous n'êtes pas autorisé à programmer ce repas." }, { status: 403 });
    }

    // Unicité (userId, date, heure) garantie en base : l'upsert est sûr en cas de requêtes simultanées.
    const dbDate = toDbDate(date);
    const existing = await db.programmation.findUnique({
      where: { userId_date_heure: { userId: sessionUser.id, date: dbDate, heure } },
      select: { id: true },
    });
    const programmation = await db.programmation.upsert({
      where: { userId_date_heure: { userId: sessionUser.id, date: dbDate, heure } },
      create: { userId: sessionUser.id, repasId, date: dbDate, heure },
      update: { repasId },
      include: PROGRAMMATION_INCLUDE,
    });

    return NextResponse.json(formatProgrammationResponse(programmation), { status: existing ? 200 : 201 });
  } catch (error) {
    console.error('Erreur lors de la création/mise à jour de la programmation:', error);
    return NextResponse.json({ error: 'Une erreur interne est survenue.' }, { status: 500 });
  }
}
