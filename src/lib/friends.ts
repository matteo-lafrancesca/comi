import type { Prisma } from '@prisma/client';
import { db } from './db';
import { HttpError } from './api-handler';
import type { SessionUser } from './auth';
import type { FriendRelation } from '@/types';

export { FRIEND_SUMMARY_SELECT, toFriendSummary } from './api-formatters';

/** Les fonctions « amis » exigent un pseudo : c'est sous ce nom qu'on apparaît chez les autres. */
export function requirePseudo(user: SessionUser) {
  if (!user.pseudo) throw new HttpError(403, 'Choisissez un pseudo pour utiliser les amis.');
}

/**
 * Lien entre deux utilisateurs, dans un sens ou dans l'autre (une seule ligne par paire).
 * ponytail: l'unicité n'est garantie en base que dans un sens ; deux demandes croisées envoyées à la
 * même milliseconde créeraient deux lignes. Passer à une paire canonique (minId, maxId) unique si ça arrive.
 */
export function findFriendship(a: number, b: number) {
  return db.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

/** Relation vue par `me` (ex. `sent` = j'ai envoyé une demande en attente). */
export function relationOf(
  me: number,
  friendship: { requesterId: number; status: string } | null
): FriendRelation {
  if (!friendship) return 'none';
  if (friendship.status === 'accepted') return 'friend';
  return friendship.requesterId === me ? 'sent' : 'received';
}

/**
 * Garantit qu'un utilisateur peut utiliser un repas (programmer, ajouter aux courses) : le sien, ou
 * celui d'un ami qu'il a ajouté à son carnet. L'accès se perd avec le carnet (`purgeSharedAccess`),
 * inutile donc de revérifier l'amitié ou le caractère public.
 */
export async function assertUsableRepas(repasId: number, userId: number, messages: { notFound: string; forbidden: string }) {
  const repas = await db.repas.findUnique({
    where: { id: repasId },
    select: { userId: true, savedBy: { where: { userId }, select: { id: true } } },
  });
  if (!repas) throw new HttpError(404, messages.notFound);
  if (repas.userId !== userId && repas.savedBy.length === 0) throw new HttpError(403, messages.forbidden);
}

/** Id interne d'un utilisateur à partir de son identifiant public (celui des URL et de l'API) ; 404 s'il n'existe pas. */
export async function userIdFromPublicId(publicId: string) {
  const user = await db.user.findUnique({ where: { publicId }, select: { id: true } });
  if (!user) throw new HttpError(404, 'Utilisateur introuvable.');
  return user.id;
}

/** Garantit que deux utilisateurs sont amis (403 sinon). */
export async function assertFriends(a: number, b: number) {
  const friendship = await findFriendship(a, b);
  if (friendship?.status !== 'accepted') throw new HttpError(403, "Vous n'êtes pas amis avec cet utilisateur.");
}

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
