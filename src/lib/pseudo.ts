import { db } from './db';
import { normalizeSearchText } from './string-utils';

export const PSEUDO_PRIS = 'Ce pseudo est déjà utilisé.';

/** Colonnes à écrire pour un pseudo : affichage tel que saisi + clé normalisée (unicité, recherche). */
export const pseudoFields = (pseudo: string) => ({ pseudo, pseudoKey: normalizeSearchText(pseudo) });

/**
 * Pseudo déjà pris par un autre utilisateur, sans tenir compte de la casse ni des accents.
 * L'index unique sur `pseudoKey` reste le garde-fou en cas d'écritures simultanées.
 */
export async function isPseudoTaken(pseudo: string, exceptUserId?: number): Promise<boolean> {
  const owner = await db.user.findUnique({ where: { pseudoKey: normalizeSearchText(pseudo) }, select: { id: true } });
  return owner !== null && owner.id !== exceptUserId;
}
