import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import {
  getParisDate,
  getISOWeekAndYear,
  getDatesForISOWeek,
  normalizeToUTCDate,
} from '@/lib/date-utils';

/**
 * GET /api/planning
 * Récupère les programmations pour une semaine donnée.
 * Query params optionnels : week (1-53), year (ex: 2026)
 */
export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const weekParam = searchParams.get('week');
    const yearParam = searchParams.get('year');

    let week: number;
    let year: number;

    if (weekParam && yearParam) {
      week = parseInt(weekParam, 10);
      year = parseInt(yearParam, 10);

      if (isNaN(week) || isNaN(year) || week < 1 || week > 53) {
        return NextResponse.json(
          { error: 'Paramètres week ou year invalides.' },
          { status: 400 }
        );
      }
    } else {
      // Si aucun paramètre, on calcule la semaine en cours par rapport à l'heure de Paris
      const nowParis = getParisDate();
      const isoInfo = getISOWeekAndYear(nowParis);
      week = isoInfo.week;
      year = isoInfo.year;
    }

    const { start, end } = getDatesForISOWeek(week, year);

    const programmations = await db.programmation.findMany({
      where: {
        userId: sessionUser.id,
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        repas: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
      orderBy: [
        { date: 'asc' },
        { heure: 'asc' },
      ],
    });

    const responseProgrammations = programmations.map((p) => ({
      ...p,
      repas: {
        id: p.repas.id,
        userId: p.repas.userId,
        titre: p.repas.titre,
        recette: p.repas.recette,
        photoUrl: p.repas.photoUrl,
        createdAt: p.repas.createdAt,
        ingredients: p.repas.ingredients.map((ri) => ({
          id: ri.id,
          nom: ri.ingredient.nom,
          quantite: ri.quantite,
          unite: ri.unite,
          categorie: ri.ingredient.categorie,
        })),
      },
    }));

    return NextResponse.json({
      week,
      year,
      start: start.toISOString(),
      end: end.toISOString(),
      programmations: responseProgrammations,
    });
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
 * Ajoute ou met à jour une programmation de repas pour un créneau (date + heure).
 * Payload: { repasId: number, date: string, heure: number }
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { repasId, date, heure } = body;

    // Validation des types de base
    if (typeof repasId !== 'number' || !date || typeof heure !== 'number') {
      return NextResponse.json(
        { error: 'Paramètres manquants ou invalides (repasId, date, heure).' },
        { status: 400 }
      );
    }

    if (heure !== 0 && heure !== 1) {
      return NextResponse.json(
        { error: "L'heure doit être 0 (midi) ou 1 (soir)." },
        { status: 400 }
      );
    }

    // Validation de la date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Format de date invalide.' },
        { status: 400 }
      );
    }

    const normalizedDate = normalizeToUTCDate(getParisDate(parsedDate));

    // Validation de l'existence du repas et de sa possession
    const repas = await db.repas.findUnique({
      where: { id: repasId },
    });

    if (!repas) {
      return NextResponse.json(
        { error: 'Le repas spécifié est introuvable.' },
        { status: 404 }
      );
    }

    if (repas.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à programmer ce repas." },
        { status: 403 }
      );
    }

    // Prévention des doublons : check s'il existe déjà une programmation sur ce créneau pour cet utilisateur
    const existing = await db.programmation.findFirst({
      where: {
        userId: sessionUser.id,
        date: normalizedDate,
        heure,
      },
    });

    if (existing) {
      const updated = await db.programmation.update({
        where: { id: existing.id },
        data: { repasId },
        include: {
          repas: {
            include: {
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      });

      const responseProg = {
        ...updated,
        repas: {
          id: updated.repas.id,
          userId: updated.repas.userId,
          titre: updated.repas.titre,
          recette: updated.repas.recette,
          photoUrl: updated.repas.photoUrl,
          createdAt: updated.repas.createdAt,
          ingredients: updated.repas.ingredients.map((ri) => ({
            id: ri.id,
            nom: ri.ingredient.nom,
            quantite: ri.quantite,
            unite: ri.unite,
            categorie: ri.ingredient.categorie,
          })),
        },
      };

      return NextResponse.json(responseProg, { status: 200 });
    }

    const created = await db.programmation.create({
      data: {
        userId: sessionUser.id,
        repasId,
        date: normalizedDate,
        heure,
      },
      include: {
        repas: {
          include: {
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        },
      },
    });

    const responseProg = {
      ...created,
      repas: {
        id: created.repas.id,
        userId: created.repas.userId,
        titre: created.repas.titre,
        recette: created.repas.recette,
        photoUrl: created.repas.photoUrl,
        createdAt: created.repas.createdAt,
        ingredients: created.repas.ingredients.map((ri) => ({
          id: ri.id,
          nom: ri.ingredient.nom,
          quantite: ri.quantite,
          unite: ri.unite,
          categorie: ri.ingredient.categorie,
        })),
      },
    };

    return NextResponse.json(responseProg, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création/mise à jour de la programmation:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
