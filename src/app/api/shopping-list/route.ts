import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseBody, withAuth } from '@/lib/api-handler';
import { checkItemsSchema } from '@/lib/schemas';
import { resolveWeek } from '@/lib/week-context';
import { groupByCategory, syncShoppingList } from '@/lib/shopping-list';
import type { ShoppingListResponse } from '@/types';

/**
 * GET /api/shopping-list
 * Synchronise la liste de courses de la semaine avec le planning, puis la renvoie.
 * Query params optionnels (ensemble) : week (1-53), year. Sans eux : semaine courante à Paris.
 */
export const GET = withAuth(async (request, user) => {
  const weekInfo = resolveWeek(new URL(request.url).searchParams, user.weekStartDay ?? 0);
  if (!weekInfo) throw new HttpError(400, 'Paramètres week ou year invalides.');

  const { items, extras } = await syncShoppingList(user.id, weekInfo);

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
});

/**
 * PATCH /api/shopping-list
 * Met à jour en bloc les états cochés de plusieurs articles.
 * Payload : { items: Array<{ id: number, isChecked: boolean }> }
 */
export const PATCH = withAuth(async (request, user) => {
  const { items } = await parseBody(request, checkItemsSchema);

  await db.$transaction(
    items.map((item) =>
      db.shoppingListItem.updateMany({
        where: { id: item.id, userId: user.id },
        data: { isChecked: item.isChecked },
      })
    )
  );

  return NextResponse.json({ success: true, count: items.length }, { status: 200 });
});
