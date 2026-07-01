import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getParisDate, normalizeToUTCDate } from '@/lib/date-utils';

/**
 * PUT /api/planning/[id]
 * Modifie une programmation de repas existante.
 * Payload: { repasId?: number, date?: string, heure?: number }
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const progId = parseInt(id, 10);
    if (isNaN(progId)) {
      return NextResponse.json(
        { error: "L'identifiant de la programmation doit être un nombre valide." },
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

    // Récupérer la programmation existante pour valider la possession
    const existingProg = await db.programmation.findUnique({
      where: { id: progId },
    });

    if (!existingProg) {
      return NextResponse.json(
        { error: 'Programmation non trouvée.' },
        { status: 404 }
      );
    }

    if (existingProg.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à modifier cette programmation." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { repasId, date, heure } = body;

    const updateData: { repasId?: number; date?: Date; heure?: number } = {};

    // 1. Validation du repasId si fourni
    if (repasId !== undefined) {
      if (typeof repasId !== 'number') {
        return NextResponse.json(
          { error: 'repasId doit être un nombre.' },
          { status: 400 }
        );
      }

      // Vérification que le repas existe et appartient à l'utilisateur
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

      updateData.repasId = repasId;
    }

    // 2. Validation de l'heure si fournie
    if (heure !== undefined) {
      if (typeof heure !== 'number' || (heure !== 0 && heure !== 1)) {
        return NextResponse.json(
          { error: "L'heure doit être 0 (midi) ou 1 (soir)." },
          { status: 400 }
        );
      }
      updateData.heure = heure;
    }

    // 3. Validation de la date si fournie
    if (date !== undefined) {
      if (!date) {
        return NextResponse.json(
          { error: 'La date ne peut pas être vide.' },
          { status: 400 }
        );
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: 'Format de date invalide.' },
          { status: 400 }
        );
      }

      updateData.date = normalizeToUTCDate(getParisDate(parsedDate));
    }

    // 4. Si la date ou l'heure changent, vérifier qu'il n'y a pas de conflit avec un autre repas
    const targetDate = updateData.date || existingProg.date;
    const targetHeure = updateData.heure !== undefined ? updateData.heure : existingProg.heure;

    if (updateData.date !== undefined || updateData.heure !== undefined) {
      const conflict = await db.programmation.findFirst({
        where: {
          userId: sessionUser.id,
          date: targetDate,
          heure: targetHeure,
          id: { not: progId },
        },
      });

      if (conflict) {
        return NextResponse.json(
          { error: 'Ce créneau est déjà programmé pour un autre repas.' },
          { status: 400 }
        );
      }
    }

    // Effectuer la mise à jour
    const updatedProg = await db.programmation.update({
      where: { id: progId },
      data: updateData,
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
      ...updatedProg,
      repas: {
        id: updatedProg.repas.id,
        userId: updatedProg.repas.userId,
        titre: updatedProg.repas.titre,
        recette: updatedProg.repas.recette,
        photoUrl: updatedProg.repas.photoUrl,
        createdAt: updatedProg.repas.createdAt,
        ingredients: updatedProg.repas.ingredients.map((ri) => ({
          id: ri.id,
          nom: ri.ingredient.nom,
          quantite: ri.quantite,
          categorie: ri.ingredient.categorie,
        })),
      },
    };

    return NextResponse.json(responseProg, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la programmation:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/planning/[id]
 * Supprime une programmation existante (déprogrammation).
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const progId = parseInt(id, 10);
    if (isNaN(progId)) {
      return NextResponse.json(
        { error: "L'identifiant de la programmation doit être un nombre valide." },
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

    // Récupérer la programmation existante pour valider la possession
    const existingProg = await db.programmation.findUnique({
      where: { id: progId },
    });

    if (!existingProg) {
      return NextResponse.json(
        { error: 'Programmation non trouvée.' },
        { status: 404 }
      );
    }

    if (existingProg.userId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à supprimer cette programmation." },
        { status: 403 }
      );
    }

    // Supprimer la programmation de la base de données
    await db.programmation.delete({
      where: { id: progId },
    });

    return NextResponse.json(
      { message: 'Programmation supprimée avec succès.' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur lors de la suppression de la programmation:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue.' },
      { status: 500 }
    );
  }
}
