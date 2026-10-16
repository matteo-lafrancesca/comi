import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { toDbDate } from '@/lib/date-utils';
import { formatIngredient } from '@/lib/shopping-list-utils';
import { CATEGORY_DETAILS, type CategoryGroup, type CategorieIngredient, type WeekInfo } from '@/types';

/** Besoin brut en un ingrédient (une ligne de recette ou d'article ajouté à la main). */
export interface NeedLine {
  ingredientId: number;
  unite: string | null;
  quantite: number | null;
}

export interface AggregatedNeed extends NeedLine {
  /** Unité normalisée : fait partie de la clé d'unicité en base. */
  uniteKey: string;
}

/** Unité normalisée (minuscules, sans espaces) ; chaîne vide si absente. */
export const uniteKeyOf = (unite: string | null | undefined): string => (unite ?? '').trim().toLowerCase();

/**
 * Additionne les besoins par (ingrédient, unité). Une quantité absente (« un peu de… ») ne
 * compte pas dans la somme ; le résultat est `null` seulement si toutes les quantités le sont.
 */
export function aggregateNeeds(lines: NeedLine[]): AggregatedNeed[] {
  const needs = new Map<string, AggregatedNeed>();
  for (const line of lines) {
    const uniteKey = uniteKeyOf(line.unite);
    const key = `${line.ingredientId}_${uniteKey}`;
    const current = needs.get(key);
    if (!current) {
      needs.set(key, { ...line, uniteKey });
    } else if (line.quantite !== null) {
      current.quantite = (current.quantite ?? 0) + line.quantite;
    }
  }
  return [...needs.values()];
}

const RETRYABLE_CODES = new Set(['P2002', 'P2034', 'P1008']);

/**
 * Synchronise la liste de courses de la semaine avec le planning et les articles ajoutés, puis la renvoie.
 *
 * Tout se passe dans une seule transaction ; en cas de requêtes simultanées (contrainte d'unicité
 * ou conflit d'écriture), la synchronisation est rejouée : le résultat est le même, donc idempotent.
 */
export async function syncShoppingList(userId: number, weekInfo: WeekInfo) {
  const { week, year } = weekInfo;

  const run = () =>
    db.$transaction(async (tx) => {
      const programmations = await tx.programmation.findMany({
        where: { userId, date: { gte: toDbDate(weekInfo.start), lte: toDbDate(weekInfo.end) } },
        include: { repas: { include: { ingredients: true } } },
      });
      const extras = await tx.shoppingListExtra.findMany({
        where: { userId, week, year },
        include: { ingredient: true, repas: { include: { ingredients: true } } },
      });

      const toLine = ({ ingredientId, unite, quantite }: NeedLine): NeedLine => ({ ingredientId, unite, quantite });
      const needs = aggregateNeeds([
        ...programmations.flatMap((p) => p.repas.ingredients.map(toLine)),
        ...extras.flatMap((extra) =>
          extra.ingredientId
            ? [toLine({ ingredientId: extra.ingredientId, unite: extra.unite, quantite: extra.quantite })]
            : (extra.repas?.ingredients ?? []).map(toLine)
        ),
      ]);

      const existing = await tx.shoppingListItem.findMany({ where: { userId, week, year } });
      const existingByKey = new Map(existing.map((item) => [`${item.ingredientId}_${item.uniteKey}`, item]));
      const neededKeys = new Set(needs.map((need) => `${need.ingredientId}_${need.uniteKey}`));

      const toDelete = existing.filter((item) => !neededKeys.has(`${item.ingredientId}_${item.uniteKey}`));
      if (toDelete.length > 0) {
        await tx.shoppingListItem.deleteMany({ where: { id: { in: toDelete.map((item) => item.id) } } });
      }

      const toCreate: Prisma.ShoppingListItemCreateManyInput[] = [];
      for (const need of needs) {
        const item = existingByKey.get(`${need.ingredientId}_${need.uniteKey}`);
        if (!item) {
          toCreate.push({ userId, week, year, isChecked: false, ...need });
        } else if (item.quantite !== need.quantite) {
          // La quantité change, la case cochée est conservée.
          await tx.shoppingListItem.update({ where: { id: item.id }, data: { quantite: need.quantite } });
        }
      }
      if (toCreate.length > 0) {
        await tx.shoppingListItem.createMany({ data: toCreate });
      }

      const items = await tx.shoppingListItem.findMany({ where: { userId, week, year }, include: { ingredient: true } });
      return { items, extras };
    });

  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      const retryable = error instanceof Prisma.PrismaClientKnownRequestError && RETRYABLE_CODES.has(error.code);
      if (!retryable || attempt >= 2) throw error;
    }
  }
}

type ItemWithIngredient = Awaited<ReturnType<typeof syncShoppingList>>['items'][number];

/** Regroupe les articles par rayon (dans l'ordre du parcours en magasin), triés par nom. */
export function groupByCategory(items: ItemWithIngredient[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  for (const item of items) {
    const categorie = item.ingredient.categorie as CategorieIngredient;
    const detail = CATEGORY_DETAILS[categorie] ?? { label: 'Épicerie Salée', order: 6 };
    let group = groups.get(categorie);
    if (!group) {
      group = { categorie, label: detail.label, order: detail.order, items: [] };
      groups.set(categorie, group);
    }
    group.items.push({
      id: item.id,
      ingredientId: item.ingredientId,
      nom: item.ingredient.nom,
      quantite: item.quantite,
      unite: item.unite,
      phrase: formatIngredient(item.ingredient.nom, item.quantite, item.unite),
      isChecked: item.isChecked,
    });
  }

  return [...groups.values()]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' })),
    }));
}
