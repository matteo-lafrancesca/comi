import type { Prisma } from '@prisma/client';
import type { FriendSummary, ProgrammationWithRepas, RepasWithIngredients } from '@/types';
import { fromDbDate } from '@/lib/date-utils';

/** Colonnes d'un `FriendSummary` : ce qu'un utilisateur montre aux autres (jamais l'e-mail ni l'id interne). */
export const FRIEND_SUMMARY_SELECT = { publicId: true, pseudo: true, photoUrl: true } as const;

/** Les utilisateurs montrés aux autres ont toujours un pseudo (requis pour les amis). */
export const toFriendSummary = (u: { publicId: string; pseudo: string | null; photoUrl: string | null }): FriendSummary => ({
  id: u.publicId,
  pseudo: u.pseudo ?? '',
  photoUrl: u.photoUrl,
});

/** Include Prisma d'un repas : ingrédients, auteur et nombre de carnets d'amis où il figure. */
export const REPAS_INCLUDE = {
  ingredients: { include: { ingredient: true } },
  user: { select: FRIEND_SUMMARY_SELECT },
  _count: { select: { savedBy: true } },
} satisfies Prisma.RepasInclude;

/** Type Prisma complet pour un repas chargé avec `REPAS_INCLUDE`. */
export type RepasWithIngredientsPayload = Prisma.RepasGetPayload<{ include: typeof REPAS_INCLUDE }>;

/**
 * Formate un repas Prisma vers le format de réponse API `RepasWithIngredients`, vu par `viewerId` :
 * `owner` est null pour ses propres repas, et `savedCount` n'est communiqué qu'à l'auteur.
 */
export function formatRepasResponse(repas: RepasWithIngredientsPayload, viewerId: number): RepasWithIngredients {
  const isMine = repas.userId === viewerId;
  return {
    id: repas.id,
    titre: repas.titre,
    recette: repas.recette,
    photoUrl: repas.photoUrl,
    isPublic: repas.isPublic,
    createdAt: repas.createdAt,
    owner: isMine ? null : toFriendSummary(repas.user),
    savedCount: isMine ? repas._count.savedBy : 0,
    ingredients: repas.ingredients.map((ri) => ({
      id: ri.id,
      nom: ri.ingredient.nom,
      quantite: ri.quantite,
      unite: ri.unite,
      categorie: ri.ingredient.categorie as RepasWithIngredients['ingredients'][number]['categorie'],
    })),
  };
}

/** Include Prisma à utiliser pour obtenir un `ProgrammationPayload`. */
export const PROGRAMMATION_INCLUDE = { repas: { include: REPAS_INCLUDE } } satisfies Prisma.ProgrammationInclude;

/** Programmation Prisma avec son repas complet. */
export type ProgrammationPayload = Prisma.ProgrammationGetPayload<{ include: typeof PROGRAMMATION_INCLUDE }>;

/** Programmation Prisma -> réponse API (date calendaire « AAAA-MM-JJ »), vue par son propriétaire. */
export function formatProgrammationResponse(prog: ProgrammationPayload): ProgrammationWithRepas {
  return {
    id: prog.id,
    repasId: prog.repasId,
    date: fromDbDate(prog.date),
    heure: prog.heure === 1 ? 1 : 0,
    repas: formatRepasResponse(prog.repas, prog.userId),
  };
}
