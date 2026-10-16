import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { assertOwned, parseId, withAuth } from '@/lib/api-handler';

/**
 * DELETE /api/shopping-list/extras/[id]
 * Supprime un repas ou un ingrédient hors-planning de la liste de courses.
 */
export const DELETE = withAuth<{ id: string }>(async (_request, user, { id }) => {
  const extraId = parseId(id, "L'identifiant de l'article doit être un nombre valide.");
  assertOwned(await db.shoppingListExtra.findUnique({ where: { id: extraId } }), user.id, {
    notFound: "L'article spécifié est introuvable.",
    forbidden: "Vous n'êtes pas autorisé à supprimer cet article.",
  });

  await db.shoppingListExtra.delete({ where: { id: extraId } });
  return NextResponse.json({ message: 'Article supprimé avec succès.' }, { status: 200 });
});
