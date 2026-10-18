/**
 * Normalise une chaîne de caractères pour faciliter la recherche.
 * Retire les accents, passe en minuscules, et convertit les ligatures (œ -> oe, æ -> ae).
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae');
}

/** « Aucune recette partagée », « 1 recette partagée », « 3 recettes partagées ». */
export const sharedRecipesLabel = (n: number) =>
  n === 0 ? 'Aucune recette partagée' : n === 1 ? '1 recette partagée' : `${n} recettes partagées`;
