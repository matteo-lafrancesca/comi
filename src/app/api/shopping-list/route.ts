import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { resolveWeek } from '@/lib/week-context';
import { groupByCategory, syncShoppingList } from '@/lib/shopping-list';
import type { ShoppingListResponse } from '@/types';

/**
 * GET /api/shopping-list
 * Synchronise la liste de courses de la semaine avec le planning, puis la renvoie.
 * Query params optionnels (ensemble) : week (1-53), year. Sans eux : semaine courante à Paris.
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

    const { items, extras } = await syncShoppingList(sessionUser.id, weekInfo);

    const body: ShoppingListResponse = {
      ...weekInfo,
      categories: groupByCategory(items),
      extras: extras.map((extra) => ({
        id: extra.id,
        ingredientId: extra.ingredientId,
        quantite: extra.quantite,
        unite: extra.unite,
        repasId: extra.repasId,
        ingredient: extra.ingredient
          ? { id: extra.ingredient.id, nom: extra.ingredient.nom, categorie: extra.ingredient.categorie }
          : null,
        repas: extra.repas ? { id: extra.repas.id, titre: extra.repas.titre, photoUrl: extra.repas.photoUrl } : null,
      })),
    };
    return NextResponse.json(body);
  } catch (error) {
    console.error('Erreur lors de la récupération/synchronisation de la liste de courses:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors du traitement de la liste de courses.' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/shopping-list
 * Met à jour en bloc les états cochés de plusieurs articles.
 * Payload : { items: Array<{ id: number, isChecked: boolean }> }
 */
export async function PATCH(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: 'Non autorisé. Veuillez vous connecter.' }, { status: 401 });
    }

    const { items } = await request.json();

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Le paramètre 'items' doit être un tableau." }, { status: 400 });
    }
    for (const item of items) {
      if (typeof item.id !== 'number' || typeof item.isChecked !== 'boolean') {
        return NextResponse.json(
          { error: 'Chaque élément doit comporter un id (nombre) et un champ isChecked (booléen).' },
          { status: 400 }
        );
      }
    }

    await db.$transaction(
      items.map((item: { id: number; isChecked: boolean }) =>
        db.shoppingListItem.updateMany({
          where: { id: item.id, userId: sessionUser.id },
          data: { isChecked: item.isChecked },
        })
      )
    );

    return NextResponse.json({ success: true, count: items.length }, { status: 200 });
  } catch (error) {
    console.error('Erreur lors de la mise à jour groupée de la liste de courses:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors de la mise à jour de la liste.' },
      { status: 500 }
    );
  }
}
