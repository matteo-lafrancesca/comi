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
