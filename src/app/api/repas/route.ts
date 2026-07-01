import { NextResponse } from 'next/server';
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
  } catch (error: any) {
    console.error("Erreur lors de la création du repas:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de l'enregistrement du repas." },
      { status: 500 }
    );
  }
}

/**
 * GET /api/repas
 * Récupère la liste des repas de l'utilisateur connecté.
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

    const meals = await db.repas.findMany({
      where: { userId: sessionUser.id },
      include: { ingredients: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(meals, { status: 200 });
  } catch (error) {
    console.error("Erreur lors de la récupération des repas:", error);
    return NextResponse.json(
      { error: "Une erreur interne est survenue lors de la récupération des repas." },
      { status: 500 }
    );
  }
}

