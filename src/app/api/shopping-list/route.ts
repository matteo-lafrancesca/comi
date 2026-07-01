import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import {
  getParisDate,
  getISOWeekAndYear,
  getDatesForISOWeek,
} from '@/lib/date-utils';
import { CATEGORY_DETAILS, CategorieIngredient } from '@/types';
import { formatIngredient } from '@/lib/shopping-list-utils';

// Fonction utilitaire pour normaliser l'unité
function normalizeUniteKey(unite: string | null | undefined): string {
  return unite ? unite.trim().toLowerCase() : '';
}

/**
 * GET /api/shopping-list
 * Récupère, synchronise et renvoie la liste de courses de la semaine.
 * Query params optionnels : week (1-53), year (ex: 2026)
 */
export async function GET(request: Request) {
  try {
    // 1. Validation de l'utilisateur connecté
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // 2. Récupération des paramètres de semaine et d'année
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
      // Semaine actuelle selon l'heure de Paris
      const nowParis = getParisDate();
      const isoInfo = getISOWeekAndYear(nowParis);
      week = isoInfo.week;
      year = isoInfo.year;
    }

    const { start, end } = getDatesForISOWeek(week, year);

    // 3. Récupérer les programmations de repas de la semaine
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
    });

    // 4. Agréger les ingrédients requis par le planning
    // Clé d'agrégation : `${ingredientId}_${normalizedUnite}`
    const plannedMap = new Map<string, {
      ingredientId: number;
      unite: string | null;
      quantite: number | null;
    }>();

    for (const prog of programmations) {
      for (const ri of prog.repas.ingredients) {
        const key = `${ri.ingredientId}_${normalizeUniteKey(ri.unite)}`;
        const existing = plannedMap.get(key);

        let newQuantite: number | null = null;
        if (existing) {
          if (existing.quantite !== null && ri.quantite !== null) {
            newQuantite = existing.quantite + ri.quantite;
          } else if (existing.quantite !== null) {
            newQuantite = existing.quantite;
          } else if (ri.quantite !== null) {
            newQuantite = ri.quantite;
          }
          
          plannedMap.set(key, {
            ingredientId: ri.ingredientId,
            unite: ri.unite,
            quantite: newQuantite,
          });
        } else {
          plannedMap.set(key, {
            ingredientId: ri.ingredientId,
            unite: ri.unite,
            quantite: ri.quantite,
          });
        }
      }
    }

    // 5. Récupérer la liste de courses existante en base de données pour cette semaine
    const existingItems = await db.shoppingListItem.findMany({
      where: {
        userId: sessionUser.id,
        week,
        year,
      },
    });

    const existingMap = new Map<string, typeof existingItems[0]>();
    for (const item of existingItems) {
      const key = `${item.ingredientId}_${normalizeUniteKey(item.unite)}`;
      existingMap.set(key, item);
    }

    // 6. Identifier les modifications de synchronisation (Vérification et Nettoyage robuste)
    const itemsToCreate: Array<{
      userId: number;
      ingredientId: number;
      quantite: number | null;
      unite: string | null;
      week: number;
      year: number;
      isChecked: boolean;
    }> = [];
    const itemsToUpdate: Array<{ id: number; quantite: number | null }> = [];
    const itemIdsToDelete: number[] = [];

    // Identifier les créations et mises à jour de quantité
    for (const [key, planned] of plannedMap.entries()) {
      const existing = existingMap.get(key);
      if (!existing) {
        itemsToCreate.push({
          userId: sessionUser.id,
          ingredientId: planned.ingredientId,
          quantite: planned.quantite,
          unite: planned.unite,
          week,
          year,
          isChecked: false,
        });
      } else {
        // Si la quantité a changé, on la met à jour mais on GARDE isChecked intact !
        if (existing.quantite !== planned.quantite) {
          itemsToUpdate.push({
            id: existing.id,
            quantite: planned.quantite,
          });
        }
      }
    }

    // Identifier les suppressions (les items en DB qui ne sont plus dans le planning)
    for (const [key, existing] of existingMap.entries()) {
      if (!plannedMap.has(key)) {
        itemIdsToDelete.push(existing.id);
      }
    }

    // 7. Appliquer les modifications en base de données via une transaction
    if (itemsToCreate.length > 0 || itemsToUpdate.length > 0 || itemIdsToDelete.length > 0) {
      await db.$transaction(async (tx) => {
        // Supprimer les ingrédients obsolètes
        if (itemIdsToDelete.length > 0) {
          await tx.shoppingListItem.deleteMany({
            where: {
              id: { in: itemIdsToDelete },
            },
          });
        }

        // Mettre à jour les quantités des ingrédients modifiés
        for (const update of itemsToUpdate) {
          await tx.shoppingListItem.update({
            where: { id: update.id },
            data: { quantite: update.quantite },
          });
        }

        // Créer les nouveaux ingrédients
        for (const createData of itemsToCreate) {
          await tx.shoppingListItem.create({
            data: createData,
          });
        }
      });
    }

    // 8. Récupérer la liste synchronisée finale et ses relations
    const finalItems = await db.shoppingListItem.findMany({
      where: {
        userId: sessionUser.id,
        week,
        year,
      },
      include: {
        ingredient: true,
      },
    });

    // 9. Formater les ingrédients en phrases et grouper par catégorie triée
    // On initialise une structure contenant toutes les catégories existantes
    const categoriesMap = new Map<CategorieIngredient, {
      categorie: CategorieIngredient;
      label: string;
      order: number;
      items: Array<{
        id: number;
        ingredientId: number;
        nom: string;
        quantite: number | null;
        unite: string | null;
        phrase: string;
        isChecked: boolean;
      }>;
    }>();

    for (const item of finalItems) {
      const categoryKey = item.ingredient.categorie as CategorieIngredient;
      const categoryDetail = CATEGORY_DETAILS[categoryKey] || { label: 'Épicerie Salée', order: 6 };

      if (!categoriesMap.has(categoryKey)) {
        categoriesMap.set(categoryKey, {
          categorie: categoryKey,
          label: categoryDetail.label,
          order: categoryDetail.order,
          items: [],
        });
      }

      // Formatage en phrase via notre helper français robuste
      const phrase = formatIngredient(item.ingredient.nom, item.quantite, item.unite);

      categoriesMap.get(categoryKey)!.items.push({
        id: item.id,
        ingredientId: item.ingredientId,
        nom: item.ingredient.nom,
        quantite: item.quantite,
        unite: item.unite,
        phrase,
        isChecked: item.isChecked,
      });
    }

    // Convertir la map en tableau et trier :
    // 1. Par l'ordre de parcours des catégories en magasin (order)
    // 2. Alphabétiquement par le nom de l'ingrédient au sein de chaque catégorie
    const sortedCategories = Array.from(categoriesMap.values())
      .sort((a, b) => a.order - b.order)
      .map((cat) => {
        cat.items.sort((a, b) => a.nom.localeCompare(b.nom, 'fr', { sensitivity: 'base' }));
        return cat;
      });

    return NextResponse.json({
      week,
      year,
      categories: sortedCategories,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération/synchronisation de la liste de courses:', error);
    return NextResponse.json(
      { error: 'Une erreur interne est survenue lors du traitement de la liste de courses.' },
      { status: 500 }
    );
  }
}
