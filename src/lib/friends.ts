import type { Prisma } from '@prisma/client';
import { db } from './db';
import { HttpError } from './api-handler';
import type { SessionUser } from './auth';
import type { FriendRelation, FriendSummary } from '@/types';

/** Colonnes d'un `FriendSummary` (jamais l'e-mail). */
export const FRIEND_SUMMARY_SELECT = { id: true, pseudo: true, photoUrl: true } as const;

/** Les utilisateurs listés ont toujours un pseudo (requis pour envoyer ou accepter une demande). */
export const toFriendSummary = (u: { id: number; pseudo: string | null; photoUrl: string | null }): FriendSummary => ({
  id: u.id,
  pseudo: u.pseudo ?? '',
  photoUrl: u.photoUrl,
});

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
