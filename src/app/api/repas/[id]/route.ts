import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

interface IngredientInput {
  nom: string;
  quantite?: string;
  categorie: string;
}

interface UpdateRepasInput {
  titre?: string;
  recette?: string;
  photoUrl?: string;
  ingredients?: IngredientInput[];
}

/**
 * GET /api/repas/[id]
 * Récupère un repas spécifique de l'utilisateur connecté avec ses ingrédients.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);
    if (isNaN(mealId)) {
      return NextResponse.json(
        { error: "L'identifiant du repas doit être un nombre valide." },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const repas = await db.repas.findUnique({
      where: { id: mealId },
      include: { ingredients: true },
    });

    if (!repas) {
      return NextResponse.json(
        { error: 'Repas non trouvé.' },
        { status: 404 }
      );
    }

    if (repas.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à accéder à ce repas." },
        { status: 403 }
      );
    }

    return NextResponse.json(repas, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la récupération du repas:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/repas/[id]
 * Met à jour un repas spécifique de l'utilisateur connecté (titre, recette, photoUrl, ingrédients).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);
    if (isNaN(mealId)) {
      return NextResponse.json(
        { error: "L'identifiant du repas doit être un nombre valide." },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // Récupérer le repas existant pour valider la possession
    const repasExistant = await db.repas.findUnique({
      where: { id: mealId },
    });

    if (!repasExistant) {
      return NextResponse.json(
        { error: 'Repas non trouvé.' },
        { status: 404 }
      );
    }

    if (repasExistant.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier ce repas." },
        { status: 403 }
      );
    }

    const body: UpdateRepasInput = await request.json();
    const { titre, recette, photoUrl, ingredients } = body;

    // Validation du titre si fourni
    if (titre !== undefined && (typeof titre !== 'string' || titre.trim() === '')) {
      return NextResponse.json(
        { error: 'Le titre du repas ne peut pas être vide.' },
        { status: 400 }
      );
    }

    // Validation des ingrédients si fournis
    if (ingredients !== undefined) {
      if (!Array.isArray(ingredients)) {
        return NextResponse.json(
          { error: "Les ingrédients doivent être fournis sous forme de tableau." },
          { status: 400 }
        );
      }
      for (const ing of ingredients) {
        if (!ing.nom || typeof ing.nom !== 'string' || ing.nom.trim() === '') {
          return NextResponse.json(
            { error: "Chaque ingrédient doit comporter un nom valide." },
            { status: 400 }
          );
        }
        if (!ing.categorie || typeof ing.categorie !== 'string' || ing.categorie.trim() === '') {
          return NextResponse.json(
            { error: "Chaque ingrédient doit comporter une catégorie valide." },
            { status: 400 }
          );
        }
      }
    }

    // Exécuter la mise à jour de manière transactionnelle
    const repasMisAJour = await db.$transaction(async (tx) => {
      // Si des ingrédients sont fournis, on supprime les anciens et recrée les nouveaux
      if (ingredients !== undefined) {
        await tx.ingredient.deleteMany({
          where: { repasId: mealId },
        });
      }

      return await tx.repas.update({
        where: { id: mealId },
        data: {
          ...(titre !== undefined ? { titre: titre.trim() } : {}),
          ...(recette !== undefined ? { recette: recette?.trim() || null } : {}),
          ...(photoUrl !== undefined ? { photoUrl: photoUrl?.trim() || null } : {}),
          ...(ingredients !== undefined ? {
            ingredients: {
              create: ingredients.map((ing) => ({
                nom: ing.nom.trim(),
                quantite: ing.quantite?.trim() || null,
                categorie: ing.categorie.trim(),
              })),
            },
          } : {}),
        },
        include: {
          ingredients: true,
        },
      });
    });

    return NextResponse.json(repasMisAJour, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du repas:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/repas/[id]
 * Supprime un repas spécifique de l'utilisateur connecté (suppression en cascade).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const mealId = parseInt(id, 10);
    if (isNaN(mealId)) {
      return NextResponse.json(
        { error: "L'identifiant du repas doit être un nombre valide." },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // Récupérer le repas existant pour valider la possession
    const repasExistant = await db.repas.findUnique({
      where: { id: mealId },
    });

    if (!repasExistant) {
      return NextResponse.json(
        { error: 'Repas non trouvé.' },
        { status: 404 }
      );
    }

    if (repasExistant.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer ce repas." },
        { status: 403 }
      );
    }

    // Supprimer le repas (cascade gérée au niveau de Prisma/DB)
    await db.repas.delete({
      where: { id: mealId },
    });

    return NextResponse.json(
      { message: 'Repas supprimé avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression du repas:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
