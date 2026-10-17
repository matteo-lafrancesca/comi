/**
 * Ajoute les produits d'hygiène et d'entretien (catégorie `hygiene`) à la base.
 *
 * Idempotent et non destructif : seuls les ingrédients absents sont créés, ceux qui existent
 * déjà (même nom, casse ignorée) ne sont jamais modifiés. Peut être relancé sans risque.
 *
 *   npm run seed:hygiene
 */
import { PrismaClient } from '@prisma/client';

const CATEGORIE = 'hygiene';

const NOMS = [
  // Dents & bouche
  'Dentifrice',
  'Brosse à dents',
  'Brossettes interdentaires',
  'Fil dentaire',
  'Bain de bouche',

  // Douche, bain & mains
  'Gel douche',
  'Savon pour les mains',
  'Savon de Marseille',
  'Gel hydroalcoolique',
  'Bain moussant',

  // Cheveux
  'Shampoing',
  'Après-shampoing',
  'Masque capillaire',
  'Gel coiffant',
  'Laque',

  // Soins du corps & du visage
  'Déodorant',
  'Crème hydratante visage',
  'Crème pour les mains',
  'Lait corporel',
  'Gommage',
  'Masque visage',
  'Baume à lèvres',
  'Crème solaire',
  'Après-soleil',
  'Démaquillant',
  'Eau micellaire',
  'Cotons démaquillants',
  'Coton-tiges',
  'Dissolvant',

  // Rasage & épilation
  'Rasoirs jetables',
  'Lames de rasoir',
  'Mousse à raser',
  'Gel à raser',
  'Après-rasage',
  'Bandes de cire',

  // Hygiène intime
  'Papier toilette',
  'Lingettes intimes',
  'Serviettes hygiéniques',
  'Tampons',
  'Protège-slips',
  'Préservatifs',

  // Mouchoirs & papier
  'Mouchoirs en papier',
  'Boîte de mouchoirs',

  // Bébé
  'Couches',
  'Lingettes bébé',
  'Liniment',

  // Petite pharmacie du quotidien
  'Pansements',
  'Compresses',
  'Sparadrap',
  'Désinfectant',
  'Sérum physiologique',

  // Vaisselle
  'Liquide vaisselle',
  'Pastilles lave-vaisselle',
  'Sel régénérant lave-vaisselle',
  'Liquide de rinçage lave-vaisselle',
  'Nettoyant lave-vaisselle',
  'Éponges',
  'Éponges grattantes',
  'Lavettes',
  'Torchons',
  'Brosse à vaisselle',

  // Linge
  'Lessive',
  'Lessive en capsules',
  'Adoucissant',
  'Détachant',
  'Anti-calcaire lave-linge',
  'Lingettes anti-décoloration',

  // Surfaces & sols
  'Nettoyant multi-usages',
  'Nettoyant sol',
  'Nettoyant vitres',
  'Nettoyant salle de bain',
  'Nettoyant cuisine dégraissant',
  'Produit pour le four',
  'Anticalcaire',
  'Détartrant',
  'Eau de Javel',
  'Vinaigre blanc',
  'Bicarbonate de soude',
  'Cristaux de soude',
  'Savon noir',
  'Lingettes nettoyantes',
  'Lingettes désinfectantes',
  'Lingettes sol',
  'Microfibres',
  'Serpillière',
  'Gants de ménage',
  'Essuie-tout',
  'Eau déminéralisée',

  // WC
  'Nettoyant WC',
  'Bloc WC',
  'Gel WC',
  'Déboucheur',

  // Air & nuisibles
  'Désodorisant',
  'Insecticide',

  // Sacs & emballages
  'Sacs poubelle 30 L',
  'Sacs poubelle 50 L',
  'Sacs poubelle 100 L',
  'Sacs biodégradables compost',
  'Sacs de congélation',
  'Film alimentaire',
  'Papier aluminium',
  'Papier cuisson',
  'Filtres à café',
  'Filtres à eau',
];

const prisma = new PrismaClient();

async function main() {
  const cle = (nom: string) => nom.trim().toLowerCase();

  const vus = new Set<string>();
  for (const nom of NOMS) {
    if (vus.has(cle(nom))) throw new Error(`Doublon dans la liste : ${nom}`);
    vus.add(cle(nom));
  }

  const existants = new Set((await prisma.ingredient.findMany({ select: { nom: true } })).map((i) => cle(i.nom)));
  const aCreer = NOMS.filter((nom) => !existants.has(cle(nom)));

  if (aCreer.length > 0) {
    await prisma.ingredient.createMany({ data: aCreer.map((nom) => ({ nom, categorie: CATEGORIE })) });
  }

  console.log(`Hygiène : ${aCreer.length} ingrédient(s) créé(s), ${NOMS.length - aCreer.length} déjà présent(s).`);
}

main()
  .catch((e) => {
    console.error('Erreur lors du seeding hygiène:', e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
