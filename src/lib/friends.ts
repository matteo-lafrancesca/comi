import type { Prisma } from '@prisma/client';

/**
 * Retire des repas partagés de chez les utilisateurs qui n'y ont plus accès : carnets (`RepasSaved`),
 * programmations et extras de courses. Même effet qu'une suppression du repas, mais limité à ces
 * utilisateurs. Point unique appelé dès qu'un accès se perd (repas repassé en privé, ami retiré…).
 *
 * @param repas repas concernés (ex. `{ id }`, ou `{ userId: auteur }`)
 * @param users utilisateurs qui perdent l'accès (ex. `{ not: auteur }`)
 */
export async function purgeSharedAccess(
  tx: Prisma.TransactionClient,
  repas: Prisma.RepasWhereInput,
  users: Prisma.IntFilter
) {
  const where = { repas, userId: users };
  await tx.repasSaved.deleteMany({ where });
  await tx.programmation.deleteMany({ where });
  await tx.shoppingListExtra.deleteMany({ where });
}
