import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { normalizeCategory } from '@/types';
import { normalizeSearchText } from '@/lib/string-utils';

// Interface pour valider la requête de création de repas
interface IngredientInput {
  nom: string;
  quantite?: number | string | null;
  unite?: string | null;
  categorie: string;
}

interface CreateRepasInput {
  titre: string;
  recette?: string;
  photoUrl?: string;
  ingredients?: IngredientInput[];
  userId?: number;
}

/**
 * POST /api/repas
 * Crée un nouveau repas pour l'utilisateur connecté avec ses ingrédients associés.
 */
export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const body: CreateRepasInput = await request.json();
    const { titre, recette, photoUrl, ingredients, userId } = body;

    // 1. Validation basique des données du repas
    if (!titre || typeof titre !== 'string' || titre.trim() === '') {
      return NextResponse.json(
        { error: 'Le titre du repas est obligatoire.' },
        { status: 400 }
      );
    }

    // 2. Validation de l'utilisateur et de la session
    const targetUserId = userId || sessionUser.id;
    if (targetUserId !== sessionUser.id) {
      return NextResponse.json(
        { error: "Vous n'êtes pas autorisé à créer un repas pour un autre utilisateur." },
        { status: 403 }
      );
    }

    // 3. Validation des ingrédients
    if (ingredients) {
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

    // 4. Insertion dans la base de données de manière transactionnelle
    const nouveauRepas = await db.repas.create({
      data: {
        titre: titre.trim(),
        recette: recette?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        userId: targetUserId,
        ingredients: {
          create: ingredients?.map((ing) => {
            let parsedQuantite: number | null = null;
            if (ing.quantite !== undefined && ing.quantite !== null) {
              const q = typeof ing.quantite === 'string' ? parseFloat(ing.quantite) : ing.quantite;
              if (!isNaN(q)) {
                parsedQuantite = q;
              }
            }
            return {
              quantite: parsedQuantite,
              unite: ing.unite?.trim() || null,
              ingredient: {
                connectOrCreate: {
                  where: { nom: ing.nom.trim() },
                  create: {
                    nom: ing.nom.trim(),
                    categorie: normalizeCategory(ing.categorie),
                  },
                },
              },
            };
          }) || [],
        },
      },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    const responseRepas = {
      id: nouveauRepas.id,
      userId: nouveauRepas.userId,
      titre: nouveauRepas.titre,
      recette: nouveauRepas.recette,
      photoUrl: nouveauRepas.photoUrl,
      createdAt: nouveauRepas.createdAt,
      ingredients: nouveauRepas.ingredients.map((ri) => ({
        id: ri.id,
        nom: ri.ingredient.nom,
        quantite: ri.quantite,
        unite: ri.unite,
        categorie: ri.ingredient.categorie,
      })),
    };

    return NextResponse.json(responseRepas, { status: 201 });
  } catch (error) {
    console.error("Erreur lors de la création du repas:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de l'enregistrement du repas." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/repas
 * Récupère la liste des repas de l'utilisateur connecté avec filtres et tris.
 */
export async function GET(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const sort = searchParams.get('sort') || 'date_creation';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Construction des filtres
    const where: Prisma.RepasWhereInput = {
      userId: sessionUser.id,
    };

    // Gestion de l'ordre de tri pour Prisma (hors rareté qui est gérée en mémoire)
    let orderBy: Prisma.RepasOrderByWithRelationInput | undefined = undefined;
    if (sort === 'alphabetique') {
      const finalOrder = (searchParams.get('order') === 'desc' ? 'desc' : 'asc') as Prisma.SortOrder;
      orderBy = { titre: finalOrder };
    } else if (sort === 'date_creation') {
      orderBy = { createdAt: order as Prisma.SortOrder };
    }

    const meals = await db.repas.findMany({
      where,
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        // On ne charge la programmation que pour le tri par rareté
        programmation: sort === 'rarete' ? {
          orderBy: { date: 'desc' },
          take: 1,
        } : undefined,
      },
      orderBy,
    });

    type MealWithRelations = Prisma.RepasGetPayload<{
      include: {
        ingredients: {
          include: {
            ingredient: true;
          };
        };
        programmation: true;
      };
    }>;

    let filteredMeals = meals as MealWithRelations[];

    // Filtrage par titre en mémoire pour supporter l'accentuation et les ligatures (œ -> oe, etc.)
    if (search) {
      const cleanSearch = normalizeSearchText(search);
      filteredMeals = filteredMeals.filter((meal) =>
        normalizeSearchText(meal.titre).includes(cleanSearch)
      );
    }

    // Tri par rareté en mémoire (les moins récemment programmés ou jamais programmés en premier)
    if (sort === 'rarete') {
      filteredMeals.sort((a, b) => {
        const dateA = a.programmation?.[0]?.date ? new Date(a.programmation[0].date).getTime() : 0;
        const dateB = b.programmation?.[0]?.date ? new Date(b.programmation[0].date).getTime() : 0;

        if (dateA !== dateB) {
          return dateA - dateB;
        }
        // Tri secondaire alphabétique si la rareté est identique (ex: jamais programmé)
        return a.titre.localeCompare(b.titre);
      });
    }

    // Aplatir et nettoyer la relation pour renvoyer le type exact attendu
    const responseMeals = filteredMeals.map((meal) => {
      return {
        id: meal.id,
        userId: meal.userId,
        titre: meal.titre,
        recette: meal.recette,
        photoUrl: meal.photoUrl,
        createdAt: meal.createdAt,
        ingredients: meal.ingredients.map((ri) => ({
          id: ri.id,
          nom: ri.ingredient.nom,
          quantite: ri.quantite,
          unite: ri.unite,
          categorie: ri.ingredient.categorie,
        })),
      };
    });

    return NextResponse.json(responseMeals, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des repas:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de l'accumulation des repas." },
      { status: 500 }
    );
  }
}
