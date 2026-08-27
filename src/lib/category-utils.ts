import { CATEGORY_DETAILS, CATEGORIES_INGREDIENTS } from '@/types';
import type { CategorieIngredient } from '@/types';

/**
 * Normalise une chaîne de caractères pour retourner une catégorie d'ingrédient valide.
 * Utilisée côté serveur (API routes) lors de la création/mise à jour des ingrédients.
 */
export function normalizeCategory(category: string): CategorieIngredient {
  const normalized = category.trim().toLowerCase();

  if (normalized.includes('fruit') || normalized.includes('legume') || normalized.includes('légume')) {
    return 'fruits-legumes';
  }
  if (
    normalized.includes('viande') ||
    normalized.includes('poisson') ||
    normalized.includes('boucherie') ||
    normalized.includes('volaille') ||
    normalized.includes('charcuterie') ||
    normalized.includes('jambon') ||
    normalized.includes('saucisson') ||
    normalized.includes('bacon') ||
    normalized.includes('lardon') ||
    normalized.includes('pâté') ||
    (normalized.includes('pate') && (normalized.includes('campagne') || normalized.includes('croûte') || normalized.includes('croute'))) ||
    normalized.includes('rillettes') ||
    normalized.includes('boudin') ||
    normalized.includes('knacki') ||
    normalized.includes('chorizo') ||
    normalized.includes('mortadelle') ||
    normalized.includes('pancetta') ||
    normalized.includes('coppa')
  ) {
    return 'boucherie-poissonnerie';
  }
  if (
    normalized.includes('lait') ||
    normalized.includes('fromage') ||
    normalized.includes('oeuf') ||
    normalized.includes('œuf') ||
    normalized.includes('crème') ||
    normalized.includes('creme') ||
    normalized.includes('yaourt') ||
    normalized.includes('beurre')
  ) {
    return 'produits-laitiers';
  }
  if (
    normalized === 'frais' ||
    normalized.includes('traiteur') ||
    normalized.includes('gnocchi') ||
    normalized.includes('ravioli') ||
    normalized.includes('galette') ||
    normalized.includes('crêpe') ||
    normalized.includes('crepe') ||
    normalized.includes('tofu') ||
    normalized.includes('pâte feuilletée') ||
    normalized.includes('pâte brisée') ||
    normalized.includes('pâte sablée') ||
    normalized.includes('pizza')
  ) {
    return 'frais';
  }
  if (normalized.includes('boulangerie') || normalized.includes('pain') || normalized.includes('patisserie') || normalized.includes('pâtisserie')) {
    return 'boulangerie-patisserie';
  }
  if (normalized.includes('epicerie sucree') || normalized.includes('épicerie sucrée') || normalized.includes('sucre') || normalized.includes('chocolat') || normalized.includes('miel') || normalized.includes('confiture')) {
    return 'epicerie-sucree';
  }
  if (normalized.includes('condiment') || normalized.includes('sauce') || normalized.includes('epicerie') || normalized.includes('épicerie') || normalized.includes('pâte') || normalized.includes('pate') || normalized.includes('riz') || normalized.includes('sel') || normalized.includes('poivre') || normalized.includes('épice')) {
    return 'epicerie-salee';
  }
  if (normalized.includes('boisson') || normalized.includes('eau') || normalized.includes('jus') || normalized.includes('soda') || normalized.includes('vin') || normalized.includes('bière') || normalized.includes('biere')) {
    return 'boissons';
  }
  if (normalized.includes('surgel') || normalized.includes('surgelé') || normalized.includes('congel')) {
    return 'surgeles';
  }

  // Recherche d'une correspondance directe avec les clés ou labels
  for (const key of CATEGORIES_INGREDIENTS) {
    const detail = CATEGORY_DETAILS[key];
    if (normalized === key || normalized === detail.label.toLowerCase()) {
      return key;
    }
  }

  return 'epicerie-salee'; // Fallback par défaut (Épicerie Salée)
}
