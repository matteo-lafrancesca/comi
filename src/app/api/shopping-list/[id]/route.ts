import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * PATCH /api/shopping-list/[id]
 * Coche ou décoche un article de la liste de courses.
 * Payload: { isChecked: boolean }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json(
        { error: "L'identifiant de l'article doit être un nombre valide." },
        { status: 400 }
      );
    }

    // 1. Validation de l'utilisateur connecté
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // 2. Validation du corps de la requête
    const body = await request.json();
    const { isChecked } = body;

    if (typeof isChecked !== 'boolean') {
      return NextResponse.json(
        { error: 'Le paramètre isChecked doit être un booléen.' },
        { status: 400 }
      );
    }

    // 3. Récupérer l'élément existant pour valider la possession
    const existingItem = await db.shoppingListItem.findUnique({
      where: { id: itemId },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: "L'article spécifié est introuvable." },
        { status: 404 }
      );
    }

    if (existingItem.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cet article." },
        { status: 403 }
      );
    }

    // 4. Mettre à jour l'élément en base de données
    const updatedItem = await db.shoppingListItem.update({
      where: { id: itemId },
      data: { isChecked },
      include: {
        ingredient: true,
      },
    });

    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la modification de l'article de course:", error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de la mise à jour.' },
      { status: 500 }
    );
  }
}
