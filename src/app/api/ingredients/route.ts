import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { withAuth, parseBody } from '@/lib/api-handler';
import { createIngredientSchema } from '@/lib/schemas';
import { normalizeSearchText } from '@/lib/string-utils';
import { normalizeCategory } from '@/lib/category-utils';

/**
 * GET /api/ingredients?search=...
 * Recherche des ingrédients enregistrés en base.
 */
export const GET = withAuth(async (request) => {
  const search = new URL(request.url).searchParams.get('search')?.trim() || '';

  const allIngredients = await db.ingredient.findMany({ orderBy: { nom: 'asc' } });

  const cleanSearch = normalizeSearchText(search);
  const filtered = search
    ? allIngredients.filter((ing) => normalizeSearchText(ing.nom).includes(cleanSearch))
    : allIngredients;

  return NextResponse.json(filtered.slice(0, 10));
});

/**
 * POST /api/ingredients
 * Crée un nouvel ingrédient en base si celui-ci n'existe pas déjà.
 */
export const POST = withAuth(async (request) => {
  const { nom, categorie } = await parseBody(request, createIngredientSchema);

  const existing = await db.ingredient.findUnique({ where: { nom } });
  if (existing) return NextResponse.json(existing, { status: 200 });

  const created = await db.ingredient.create({ data: { nom, categorie: normalizeCategory(categorie) } });
  return NextResponse.json(created, { status: 201 });
});
