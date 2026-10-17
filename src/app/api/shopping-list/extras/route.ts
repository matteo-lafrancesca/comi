import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseBody, withAuth } from '@/lib/api-handler';
import { assertUsableRepas } from '@/lib/friends';
import { normalizeCategory } from '@/lib/category-utils';
import { cleanText, toQuantite } from '@/lib/repas-input';
import { createExtraSchema } from '@/lib/schemas';

/**
 * POST /api/shopping-list/extras
 * Ajoute un repas ou un ingrédient hors-planning dans la liste de courses.
 */
export const POST = withAuth(async (request, user) => {
  const { week, year, repasId, ingredientName, categorie, quantite, unite } = await parseBody(request, createExtraSchema);

  // Cas 1 : Ajout d'un repas hors-planning
  if (repasId !== undefined) {
    const parsedRepasId = typeof repasId === 'number' ? repasId : Number.parseInt(repasId, 10);
    if (Number.isNaN(parsedRepasId)) throw new HttpError(400, 'Identifiant de repas invalide.');

    await assertUsableRepas(parsedRepasId, user.id, {
      notFound: 'Le repas sélectionné est introuvable.',
      forbidden: "Vous n'êtes pas autorisé à ajouter ce repas.",
    });

    const extra = await db.shoppingListExtra.create({
      data: { userId: user.id, repasId: parsedRepasId, week, year },
    });
    return NextResponse.json(extra, { status: 201 });
  }

  // Cas 2 : Ajout d'un ingrédient individuel hors-planning
  if (ingredientName !== undefined) {
    const nom = ingredientName.trim();
    if (nom === '') throw new HttpError(400, "Le nom de l'article ne peut pas être vide.");

    const ingredient =
      (await db.ingredient.findUnique({ where: { nom } })) ??
      (await db.ingredient.create({ data: { nom, categorie: normalizeCategory(categorie || 'epicerie-salee') } }));

    const extra = await db.shoppingListExtra.create({
      data: {
        userId: user.id,
        ingredientId: ingredient.id,
        quantite: toQuantite(quantite),
        unite: cleanText(unite),
        week,
        year,
      },
    });
    return NextResponse.json(extra, { status: 201 });
  }

  throw new HttpError(400, 'Veuillez spécifier soit un repas (repasId), soit un ingrédient (ingredientName).');
});
