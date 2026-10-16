import { NextResponse } from 'next/server';
import { UTApi } from 'uploadthing/server';
import { db } from '@/lib/db';
import { withAuth, parseBody, parseId, assertOwned } from '@/lib/api-handler';
import { repasPatchSchema } from '@/lib/schemas';
import { REPAS_INCLUDE, cleanText, ingredientLinks } from '@/lib/repas-input';
import { formatRepasResponse } from '@/lib/api-formatters';

type Params = { id: string };
const ID_INVALIDE = "L'identifiant du repas doit être un nombre valide.";

/**
 * GET /api/repas/[id]
 * Récupère un repas spécifique de l'utilisateur connecté avec ses ingrédients.
 */
export const GET = withAuth<Params>(async (_request, user, { id }) => {
  const mealId = parseId(id, ID_INVALIDE);
  const repas = assertOwned(await db.repas.findUnique({ where: { id: mealId }, include: REPAS_INCLUDE }), user.id, {
    notFound: 'Repas non trouvé.',
    forbidden: "Vous n'êtes pas autorisé à accéder à ce repas.",
  });
  return NextResponse.json(formatRepasResponse(repas), { status: 200 });
});

/**
 * PATCH /api/repas/[id]
 * Met à jour un repas spécifique de l'utilisateur connecté (titre, recette, photoUrl, ingrédients).
 */
export const PATCH = withAuth<Params>(async (request, user, { id }) => {
  const mealId = parseId(id, ID_INVALIDE);
  assertOwned(await db.repas.findUnique({ where: { id: mealId } }), user.id, {
    notFound: 'Repas non trouvé.',
    forbidden: "Vous n'êtes pas autorisé à modifier ce repas.",
  });

  const { titre, recette, photoUrl, ingredients } = await parseBody(request, repasPatchSchema);

  const repasMisAJour = await db.$transaction(async (tx) => {
    // Si des ingrédients sont fournis, ils remplacent entièrement les anciens liens
    if (ingredients !== undefined) {
      await tx.repasIngredient.deleteMany({ where: { repasId: mealId } });
    }

    return tx.repas.update({
      where: { id: mealId },
      data: {
        ...(titre !== undefined ? { titre } : {}),
        ...(recette !== undefined ? { recette: cleanText(recette) } : {}),
        ...(photoUrl !== undefined ? { photoUrl: cleanText(photoUrl) } : {}),
        ...(ingredients !== undefined ? { ingredients: { create: ingredientLinks(ingredients) } } : {}),
      },
      include: REPAS_INCLUDE,
    });
  });

  return NextResponse.json(formatRepasResponse(repasMisAJour), { status: 200 });
});

/**
 * DELETE /api/repas/[id]
 * Supprime un repas spécifique de l'utilisateur connecté (suppression en cascade).
 */
export const DELETE = withAuth<Params>(async (_request, user, { id }) => {
  const mealId = parseId(id, ID_INVALIDE);
  const repas = assertOwned(await db.repas.findUnique({ where: { id: mealId } }), user.id, {
    notFound: 'Repas non trouvé.',
    forbidden: "Vous n'êtes pas autorisé à supprimer ce repas.",
  });

  // Supprimer la photo sur Uploadthing si elle existe (échec non bloquant)
  const fileKey = repas.photoUrl?.split('/').pop();
  if (fileKey) {
    try {
      await new UTApi().deleteFiles(fileKey);
    } catch (err) {
      console.error("Erreur lors de la suppression de l'image sur Uploadthing:", err);
    }
  }

  await db.repas.delete({ where: { id: mealId } });
  return NextResponse.json({ message: 'Repas supprimé avec succès.' }, { status: 200 });
});
