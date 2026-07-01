import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

// Interface pour valider la requête de création de repas
interface IngredientInput {
  nom: string;
  quantite?: string;
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

    // 4. Insertion dans la base de données
    const nouveauRepas = await db.repas.create({
      data: {
        titre: titre.trim(),
        recette: recette?.trim() || null,
        photoUrl: photoUrl?.trim() || null,
        userId: targetUserId,
        ingredients: {
          create: ingredients?.map((ing) => ({
            nom: ing.nom.trim(),
            quantite: ing.quantite?.trim() || null,
            categorie: ing.categorie.trim(),
          })) || [],
        },
      },
      include: {
        ingredients: true,
      },
    });

    return NextResponse.json(nouveauRepas, { status: 201 });
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

    if (search) {
      where.titre = {
        contains: search,
      };
    }

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
        ingredients: true,
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
        ingredients: true;
        programmation: true;
      };
    }>;

    // Tri par rareté en mémoire (les moins récemment programmés ou jamais programmés en premier)
    if (sort === 'rarete') {
      (meals as MealWithRelations[]).sort((a, b) => {
        const dateA = a.programmation?.[0]?.date ? new Date(a.programmation[0].date).getTime() : 0;
        const dateB = b.programmation?.[0]?.date ? new Date(b.programmation[0].date).getTime() : 0;

        if (dateA !== dateB) {
          return dateA - dateB;
        }
        // Tri secondaire alphabétique si la rareté est identique (ex: jamais programmé)
        return a.titre.localeCompare(b.titre);
      });
    }

    // Nettoyage de la relation programmation pour renvoyer le type exact attendu
    const responseMeals = (meals as MealWithRelations[]).map((meal) => {
      const mealCopy = { ...meal } as Partial<MealWithRelations>;
      delete mealCopy.programmation;
      return mealCopy;
    });

    return NextResponse.json(responseMeals, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des repas:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de la récupération des repas." },
      { status: 500 }
    );
  }
}

