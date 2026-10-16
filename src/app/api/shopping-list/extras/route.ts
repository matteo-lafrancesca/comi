import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { normalizeCategory } from '@/types';
import { isValidWeekRef } from '@/lib/date-utils';

/**
 * POST /api/shopping-list/extras
 * Ajoute un repas ou un ingrédient hors-planning dans la liste de courses.
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
    const { week, year, repasId, ingredientName, categorie, quantite, unite } = body;

    // Validation des paramètres de date de la semaine
    if (typeof week !== 'number' || typeof year !== 'number' || !isValidWeekRef({ week, year })) {
      return NextResponse.json(
        { error: 'Les paramètres week et year sont obligatoires et doivent désigner une semaine valide.' },
        { status: 400 }
      );
    }

    // Cas 1 : Ajout d'un repas hors-planning
    if (repasId !== undefined) {
      const parsedRepasId = parseInt(repasId, 10);
      if (isNaN(parsedRepasId)) {
        return NextResponse.json({ error: 'Identifiant de repas invalide.' }, { status: 400 });
      }

      // Vérifier l'existence et l'appartenance du repas
      const repas = await db.repas.findUnique({
        where: { id: parsedRepasId },
      });

      if (!repas) {
        return NextResponse.json({ error: 'Le repas sélectionné est introuvable.' }, { status: 404 });
      }

      if (repas.userId !== sessionUser.id) {
        return NextResponse.json({ error: 'Vous n\'êtes pas autorisé à ajouter ce repas.' }, { status: 403 });
      }

      const extra = await db.shoppingListExtra.create({
        data: {
          userId: sessionUser.id,
          repasId: parsedRepasId,
          week,
          year,
        },
      });

      return NextResponse.json(extra, { status: 201 });
    }

    // Cas 2 : Ajout d'un ingrédient individuel hors-planning
    if (ingredientName !== undefined) {
      const cleanName = ingredientName.trim();
      if (cleanName === '') {
        return NextResponse.json({ error: 'Le nom de l\'article ne peut pas être vide.' }, { status: 400 });
      }

      const cleanCategory = (categorie || 'epicerie-salee').trim();

      // Trouver ou créer l'ingrédient
      let ingredient = await db.ingredient.findUnique({
        where: { nom: cleanName },
      });

      if (!ingredient) {
        ingredient = await db.ingredient.create({
          data: {
            nom: cleanName,
            categorie: normalizeCategory(cleanCategory),
          },
        });
      }

      let parsedQuantite: number | null = null;
      if (quantite !== undefined && quantite !== null && quantite !== '') {
        const q = typeof quantite === 'string' ? parseFloat(quantite) : quantite;
        if (!isNaN(q)) {
          parsedQuantite = q;
        }
      }

      const extra = await db.shoppingListExtra.create({
        data: {
          userId: sessionUser.id,
          ingredientId: ingredient.id,
          quantite: parsedQuantite,
          unite: unite?.trim() || null,
          week,
          year,
        },
      });

      return NextResponse.json(extra, { status: 201 });
    }

    return NextResponse.json(
      { error: 'Veuillez spécifier soit un repas (repasId), soit un ingrédient (ingredientName).' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Erreur lors de l\'ajout d\'un extra de course:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de l\'enregistrement de l\'article.' },
      { status: 500 }
    );
  }
}
