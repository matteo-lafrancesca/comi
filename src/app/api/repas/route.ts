import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { withAuth, parseBody } from '@/lib/api-handler';
import { repasInputSchema } from '@/lib/schemas';
import { cleanText, ingredientLinks } from '@/lib/repas-input';
import { normalizeSearchText } from '@/lib/string-utils';
import { REPAS_INCLUDE, formatRepasResponse } from '@/lib/api-formatters';

/**
 * POST /api/repas
 * Crée un nouveau repas pour l'utilisateur connecté avec ses ingrédients associés.
 */
export const POST = withAuth(async (request, user) => {
  const { titre, recette, photoUrl, isPublic, ingredients } = await parseBody(request, repasInputSchema);

  const nouveauRepas = await db.repas.create({
    data: {
      titre,
      recette: cleanText(recette),
      photoUrl: cleanText(photoUrl),
      isPublic,
      userId: user.id,
      ingredients: { create: ingredientLinks(ingredients ?? []) },
    },
    include: REPAS_INCLUDE,
  });

  return NextResponse.json(formatRepasResponse(nouveauRepas, user.id), { status: 201 });
});

/**
 * GET /api/repas
 * Récupère le carnet de l'utilisateur connecté (ses repas + les recettes d'amis ajoutées) avec filtres et tris.
 */
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search')?.trim();
  const sort = searchParams.get('sort') || 'date_creation';
  const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';
  const limit = parseInt(searchParams.get('limit') || '12', 10);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const skip = (page - 1) * limit;

  // Gestion de l'ordre de tri pour Prisma (hors rareté qui est gérée en mémoire)
  let orderBy: Prisma.RepasOrderByWithRelationInput | undefined = undefined;
  if (sort === 'alphabetique') {
    const finalOrder = (searchParams.get('order') === 'desc' ? 'desc' : 'asc') as Prisma.SortOrder;
    orderBy = { titre: finalOrder };
  } else if (sort === 'date_creation') {
    orderBy = { createdAt: order as Prisma.SortOrder };
  }

  // Si pas de recherche ni de tri en mémoire, on pagine directement au niveau SQLite
  const meals = await db.repas.findMany({
    where: { OR: [{ userId: user.id }, { savedBy: { some: { userId: user.id } } }] },
    include: {
      ...REPAS_INCLUDE,
      // On ne charge la programmation que pour le tri par rareté (la sienne : une recette d'ami est aussi programmée par d'autres)
      programmation: sort === 'rarete' ? { where: { userId: user.id }, orderBy: { date: 'desc' }, take: 1 } : undefined,
    },
    orderBy,
    ...(!search && sort !== 'rarete' ? { skip, take: limit + 1 } : {}),
  });

  type MealWithRelations = Prisma.RepasGetPayload<{ include: typeof REPAS_INCLUDE & { programmation: true } }>;
  let filteredMeals = meals as MealWithRelations[];

  // Filtrage par titre en mémoire pour supporter l'accentuation et les ligatures (œ -> oe, etc.)
  if (search) {
    const cleanSearch = normalizeSearchText(search);
    filteredMeals = filteredMeals.filter((meal) => normalizeSearchText(meal.titre).includes(cleanSearch));
  }

  // Tri par rareté en mémoire (les moins récemment programmés ou jamais programmés en premier)
  if (sort === 'rarete') {
    filteredMeals.sort((a, b) => {
      const dateA = a.programmation?.[0]?.date ? new Date(a.programmation[0].date).getTime() : 0;
      const dateB = b.programmation?.[0]?.date ? new Date(b.programmation[0].date).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      // Tri secondaire alphabétique si la rareté est identique (ex: jamais programmé)
      return a.titre.localeCompare(b.titre);
    });
  }

  let hasMore: boolean;
  if (search || sort === 'rarete') {
    // Pagination en mémoire
    filteredMeals = filteredMeals.slice(skip, skip + limit + 1);
    hasMore = filteredMeals.length > limit;
    filteredMeals = filteredMeals.slice(0, limit);
  } else {
    // Déjà paginé par SQL
    hasMore = meals.length > limit;
    filteredMeals = filteredMeals.slice(0, limit);
  }

  return NextResponse.json({ repas: filteredMeals.map((meal) => formatRepasResponse(meal, user.id)), hasMore }, { status: 200 });
});
