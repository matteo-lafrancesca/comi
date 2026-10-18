/**
 * Crée un compte de test et une dizaine de repas d'exemple (avec ingrédients et étapes).
 *
 * Idempotent : le compte est créé s'il n'existe pas (son mot de passe est alors fixé), les repas déjà
 * présents (même titre) ne sont pas recréés. Les ingrédients existants sont réutilisés (nom, casse ignorée).
 * Le mot de passe n'est jamais versionné : il se passe par variable d'environnement.
 *
 *   TEST_EMAIL=test@comi.app TEST_PASSWORD='…' npm run seed:test
 */
import bcryptjs from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { normalizeSearchText } from '../src/lib/string-utils';

const EMAIL = process.env.TEST_EMAIL ?? 'test@comi.app';
const PASSWORD = process.env.TEST_PASSWORD;
const PSEUDO = process.env.TEST_PSEUDO ?? 'Compte test';

type Ing = [nom: string, categorie: string, quantite: number | null, unite: string | null];

const REPAS: { titre: string; isPublic: boolean; ingredients: Ing[]; etapes: string[] }[] = [
  {
    titre: 'Pâtes carbonara',
    isPublic: true,
    ingredients: [
      ['Spaghetti', 'epicerie-salee', 400, 'g'],
      ['Lardons', 'boucherie-poissonnerie', 200, 'g'],
      ['Œufs', 'produits-laitiers', 4, null],
      ['Parmesan', 'produits-laitiers', 80, 'g'],
      ['Poivre', 'epicerie-salee', null, null],
    ],
    etapes: [
      'Cuire les pâtes dans une grande casserole d’eau salée.',
      'Faire dorer les lardons à sec dans une poêle.',
      'Battre les œufs avec le parmesan râpé et beaucoup de poivre.',
      'Hors du feu, mélanger les pâtes égouttées, les lardons puis les œufs. Servir aussitôt.',
    ],
  },
  {
    titre: 'Poulet rôti et pommes de terre',
    isPublic: true,
    ingredients: [
      ['Poulet entier', 'boucherie-poissonnerie', 1, null],
      ['Pommes de terre', 'fruits-legumes', 1, 'kg'],
      ['Ail', 'fruits-legumes', 4, 'gousses'],
      ['Thym', 'fruits-legumes', null, null],
      ['Huile d’olive', 'epicerie-salee', 3, 'c. à soupe'],
    ],
    etapes: [
      'Préchauffer le four à 200 °C.',
      'Couper les pommes de terre en quartiers et les mélanger avec l’huile, l’ail et le thym.',
      'Poser le poulet sur les pommes de terre, saler, poivrer.',
      'Rôtir 1 h 15 en arrosant de temps en temps.',
    ],
  },
  {
    titre: 'Soupe de légumes',
    isPublic: false,
    ingredients: [
      ['Carottes', 'fruits-legumes', 4, null],
      ['Poireau', 'fruits-legumes', 1, null],
      ['Pommes de terre', 'fruits-legumes', 3, null],
      ['Oignon', 'fruits-legumes', 1, null],
      ['Bouillon de légumes', 'epicerie-salee', 1, 'L'],
    ],
    etapes: [
      'Éplucher et couper tous les légumes en morceaux.',
      'Faire revenir l’oignon, ajouter les légumes et le bouillon.',
      'Laisser cuire 30 minutes puis mixer.',
    ],
  },
  {
    titre: 'Chili con carne',
    isPublic: true,
    ingredients: [
      ['Bœuf haché', 'boucherie-poissonnerie', 500, 'g'],
      ['Haricots rouges', 'epicerie-salee', 400, 'g'],
      ['Tomates concassées', 'epicerie-salee', 400, 'g'],
      ['Oignon', 'fruits-legumes', 2, null],
      ['Riz', 'epicerie-salee', 300, 'g'],
      ['Cumin', 'epicerie-salee', 1, 'c. à café'],
    ],
    etapes: [
      'Faire revenir les oignons émincés puis la viande.',
      'Ajouter le cumin, les tomates et les haricots égouttés.',
      'Mijoter 45 minutes à feu doux.',
      'Servir avec le riz cuit.',
    ],
  },
  {
    titre: 'Quiche lorraine',
    isPublic: false,
    ingredients: [
      ['Pâte brisée', 'frais', 1, null],
      ['Lardons', 'boucherie-poissonnerie', 200, 'g'],
      ['Œufs', 'produits-laitiers', 3, null],
      ['Crème fraîche', 'produits-laitiers', 20, 'cl'],
      ['Lait', 'produits-laitiers', 20, 'cl'],
    ],
    etapes: [
      'Préchauffer le four à 180 °C et foncer un moule avec la pâte.',
      'Répartir les lardons dorés sur la pâte.',
      'Battre les œufs, la crème et le lait, verser sur les lardons.',
      'Cuire 35 minutes.',
    ],
  },
  {
    titre: 'Salade niçoise',
    isPublic: true,
    ingredients: [
      ['Thon', 'epicerie-salee', 2, 'boîtes'],
      ['Tomates', 'fruits-legumes', 4, null],
      ['Œufs', 'produits-laitiers', 4, null],
      ['Haricots verts', 'fruits-legumes', 200, 'g'],
      ['Olives noires', 'epicerie-salee', 100, 'g'],
    ],
    etapes: [
      'Cuire les œufs 10 minutes et les haricots verts 8 minutes.',
      'Couper les tomates et les œufs en quartiers.',
      'Disposer tous les ingrédients et assaisonner d’une vinaigrette.',
    ],
  },
  {
    titre: 'Risotto aux champignons',
    isPublic: false,
    ingredients: [
      ['Riz arborio', 'epicerie-salee', 300, 'g'],
      ['Champignons de Paris', 'fruits-legumes', 400, 'g'],
      ['Bouillon de légumes', 'epicerie-salee', 1, 'L'],
      ['Parmesan', 'produits-laitiers', 60, 'g'],
      ['Échalote', 'fruits-legumes', 2, null],
    ],
    etapes: [
      'Faire suer les échalotes, ajouter le riz et le nacrer 2 minutes.',
      'Verser le bouillon chaud louche par louche en remuant, pendant 18 minutes.',
      'Ajouter les champignons poêlés et le parmesan. Servir crémeux.',
    ],
  },
  {
    titre: 'Saumon, riz et brocolis',
    isPublic: true,
    ingredients: [
      ['Pavé de saumon', 'boucherie-poissonnerie', 2, null],
      ['Riz', 'epicerie-salee', 150, 'g'],
      ['Brocoli', 'fruits-legumes', 1, null],
      ['Citron', 'fruits-legumes', 1, null],
    ],
    etapes: [
      'Cuire le riz et faire cuire le brocoli à la vapeur.',
      'Poêler le saumon 4 minutes de chaque côté.',
      'Servir avec un filet de citron.',
    ],
  },
  {
    titre: 'Crêpes',
    isPublic: true,
    ingredients: [
      ['Farine', 'epicerie-sucree', 250, 'g'],
      ['Œufs', 'produits-laitiers', 4, null],
      ['Lait', 'produits-laitiers', 50, 'cl'],
      ['Beurre', 'produits-laitiers', 50, 'g'],
      ['Sucre', 'epicerie-sucree', 1, 'c. à soupe'],
    ],
    etapes: [
      'Mélanger la farine, le sucre et les œufs.',
      'Ajouter le lait petit à petit puis le beurre fondu.',
      'Laisser reposer 1 heure et cuire dans une poêle chaude.',
    ],
  },
  {
    titre: 'Curry de pois chiches',
    isPublic: false,
    ingredients: [
      ['Pois chiches', 'epicerie-salee', 400, 'g'],
      ['Lait de coco', 'epicerie-salee', 40, 'cl'],
      ['Épinards', 'fruits-legumes', 200, 'g'],
      ['Pâte de curry', 'epicerie-salee', 2, 'c. à soupe'],
      ['Oignon', 'fruits-legumes', 1, null],
    ],
    etapes: [
      'Faire revenir l’oignon avec la pâte de curry.',
      'Ajouter les pois chiches égouttés et le lait de coco, mijoter 15 minutes.',
      'Incorporer les épinards en fin de cuisson.',
    ],
  },
];

async function main() {
  const db = new PrismaClient();
  try {
    let user = await db.user.findUnique({ where: { email: EMAIL } });
    if (!user) {
      if (!PASSWORD) throw new Error('TEST_PASSWORD est requis pour créer le compte.');
      user = await db.user.create({
        data: {
          email: EMAIL,
          passwordHash: await bcryptjs.hash(PASSWORD, 10),
          pseudo: PSEUDO,
          pseudoKey: normalizeSearchText(PSEUDO),
        },
      });
      console.log(`Compte créé : ${EMAIL} (pseudo « ${PSEUDO} »)`);
    } else {
      console.log(`Compte déjà présent : ${EMAIL} (mot de passe inchangé)`);
    }

    // Ingrédients existants par nom, casse ignorée (l'index unique sur `nom` y est sensible).
    const existing = new Map((await db.ingredient.findMany()).map((i) => [i.nom.toLowerCase(), i.id]));
    const ingredientId = async (nom: string, categorie: string) => {
      const id = existing.get(nom.toLowerCase()) ?? (await db.ingredient.create({ data: { nom, categorie } })).id;
      existing.set(nom.toLowerCase(), id);
      return id;
    };

    const titres = new Set((await db.repas.findMany({ where: { userId: user.id }, select: { titre: true } })).map((r) => r.titre));
    let created = 0;
    for (const repas of REPAS) {
      if (titres.has(repas.titre)) continue;
      const lignes = [];
      for (const [nom, categorie, quantite, unite] of repas.ingredients) {
        lignes.push({ ingredientId: await ingredientId(nom, categorie), quantite, unite });
      }
      await db.repas.create({
        data: {
          userId: user.id,
          titre: repas.titre,
          isPublic: repas.isPublic,
          recette: repas.etapes.join('\n'),
          ingredients: { create: lignes },
        },
      });
      created++;
    }
    console.log(`${created} repas créé(s), ${REPAS.length - created} déjà présent(s).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
