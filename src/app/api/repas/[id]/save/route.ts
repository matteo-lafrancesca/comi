import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { HttpError, parseId, withAuth } from '@/lib/api-handler';
import { assertFriends, purgeSharedAccess, requirePseudo } from '@/lib/friends';

type Params = { id: string };
const ID_INVALIDE = "L'identifiant du repas doit être un nombre valide.";

/**
 * POST /api/repas/[id]/save
 * Ajoute la recette publique d'un ami à mon carnet (un lien : elle reste la sienne). Idempotent.
 */
export const POST = withAuth<Params>(async (_request, user, { id }) => {
  requirePseudo(user);
  const repasId = parseId(id, ID_INVALIDE);
  const repas = await db.repas.findUnique({ where: { id: repasId }, select: { userId: true, isPublic: true } });
  if (!repas) throw new HttpError(404, 'Repas non trouvé.');
  if (repas.userId === user.id) throw new HttpError(400, 'Ce repas est déjà le vôtre.');
  if (!repas.isPublic) throw new HttpError(403, "Ce repas n'est pas partagé.");
  await assertFriends(user.id, repas.userId);

  const key = { userId: user.id, repasId };
  await db.repasSaved.upsert({ where: { userId_repasId: key }, create: key, update: {} });
  return NextResponse.json({ message: 'Recette ajoutée à votre carnet.' }, { status: 201 });
});

/**
 * DELETE /api/repas/[id]/save
 * Retire la recette d'un ami de mon carnet, avec mes programmations et extras de courses de ce repas.
 */
export const DELETE = withAuth<Params>(async (_request, user, { id }) => {
  const repasId = parseId(id, ID_INVALIDE);
  const saved = await db.repasSaved.findUnique({ where: { userId_repasId: { userId: user.id, repasId } } });
  if (!saved) throw new HttpError(404, "Ce repas n'est pas dans votre carnet.");

  await db.$transaction((tx) => purgeSharedAccess(tx, { id: repasId }, { equals: user.id }));
  return NextResponse.json({ message: 'Recette retirée de votre carnet.' });
});
