import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

interface NewMeal {
  titre: string;
  recette: string;
  photoUrl: string;
  ingredients: {
    nom: string;
    categorie: string;
    quantite?: number;
    unite?: string;
  }[];
}

const NEW_MEALS: NewMeal[] = [
  {
    titre: 'Ramen au porc chashu',
    recette: '1. Faire frémir le bouillon avec ail, gingembre et sauce soja.\n2. Cuire les nouilles ramen 3 minutes dans l\'eau bouillante.\n3. Couper la poitrine de porc en tranches dorées à la poêle.\n4. Dresser les bols : verser le bouillon chaud sur les nouilles, ajouter le porc, l\'œuf mariné coupé en deux, les pousses de bambou et la ciboule émincée.',
    photoUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Nouilles ramen', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Échine de porc', categorie: 'boucherie-poissonnerie', quantite: 300, unite: 'g' },
      { nom: 'Œuf', categorie: 'produits-laitiers', quantite: 2, unite: 'pièces' },
      { nom: 'Sauce soja salée', categorie: 'epicerie-salee', quantite: 3, unite: 'c. à soupe' },
      { nom: 'Gingembre', categorie: 'fruits-legumes', quantite: 15, unite: 'g' },
      { nom: 'Ail', categorie: 'fruits-legumes', quantite: 2, unite: 'gousses' },
    ],
  },
  {
    titre: 'Saumon grillé et légumes de saison',
    recette: '1. Préchauffer le four à 200°C.\n2. Couper courgettes et carottes en bâtonnets, les arroser d\'huile d\'olive, saler et poivrer.\n3. Enfourner les légumes 20 minutes.\n4. Poêler les pavés de saumon côté peau 4 minutes, puis retourner 2 minutes.\n5. Servir arrosé d\'un filet de jus de citron frais.',
    photoUrl: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pavé de saumon', categorie: 'boucherie-poissonnerie', quantite: 2, unite: 'pièces' },
      { nom: 'Courgette', categorie: 'fruits-legumes', quantite: 2, unite: 'pièces' },
      { nom: 'Carotte', categorie: 'fruits-legumes', quantite: 2, unite: 'pièces' },
      { nom: 'Citron', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Huile d\'olive', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Poke Bowl au saumon et avocat',
    recette: '1. Cuire le riz à sushi et le laisser tiédir avec un trait de vinaigre de riz.\n2. Couper le saumon frais et l\'avocat en dés réguliers.\n3. Émincer le concombre en fines rondelles.\n4. Disposer le riz dans les bols, puis disposer harmonieusement le saumon, l\'avocat, le concombre et les fèves d\'edamame.\n5. Parsemer de graines de sésame et assaisonner de sauce soja.',
    photoUrl: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Riz basmati', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
      { nom: 'Pavé de saumon', categorie: 'boucherie-poissonnerie', quantite: 250, unite: 'g' },
      { nom: 'Avocat', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Concombre', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Graine de sésame', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à soupe' },
      { nom: 'Sauce soja salée', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Burger gourmet au cheddar affiné',
    recette: '1. Toaster les pains burger dorés au beurre.\n2. Cuire les steaks hachés selon la cuisson désirée et déposer une tranche de cheddar dessus pour faire fondre.\n3. Émincer l\'oignon rouge et la tomate en rondelles.\n4. Tartiner la base de sauce burger, déposer la feuille de salade, la tomate, le steak au fromage fondant et les oignons.\n5. Refermer et déguster immédiatement.',
    photoUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pain burger', categorie: 'boulangerie-patisserie', quantite: 2, unite: 'pièces' },
      { nom: 'Steak haché', categorie: 'boucherie-poissonnerie', quantite: 2, unite: 'pièces' },
      { nom: 'Cheddar en tranches', categorie: 'produits-laitiers', quantite: 2, unite: 'tranches' },
      { nom: 'Tomate', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Oignon rouge', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Laitue', categorie: 'fruits-legumes', quantite: 2, unite: 'feuilles' },
    ],
  },
  {
    titre: 'Pizza Margherita artisanale',
    recette: '1. Préchauffer le four au maximum (240°C ou plus).\n2. Étaler la pâte à pizza sur une plaque huilée.\n3. Napper généreusement de sauce tomate et parsemer d\'origan.\n4. Déchirer la mozzarella fraîche et la répartir sur la pizza.\n5. Enfourner 10 à 12 minutes jusqu\'à ce que la croûte soit bien dorée.\n6. Ajouter les feuilles de basilic frais à la sortie du four.',
    photoUrl: 'https://images.unsplash.com/photo-1604382354936-07c5d9983bd3?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pâte à pizza', categorie: 'frais', quantite: 1, unite: 'rouleau' },
      { nom: 'Coulis de tomate', categorie: 'epicerie-salee', quantite: 150, unite: 'ml' },
      { nom: 'Mozzarella', categorie: 'produits-laitiers', quantite: 125, unite: 'g' },
      { nom: 'Basilic frais', categorie: 'fruits-legumes', quantite: 6, unite: 'feuilles' },
      { nom: 'Huile d\'olive', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Tacos au bœuf épicé et guacamole',
    recette: '1. Écraser l\'avocat avec du jus de citron vert, sel et piment pour obtenir un guacamole onctueux.\n2. Faire revenir la viande hachée avec l\'oignon émincé, le cumin et le paprika.\n3. Chauffer les tortillas à la poêle.\n4. Garnir les galettes de viande épicée, de guacamole frais, de dés de tomates et de coriandre.',
    photoUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Tortillas de maïs', categorie: 'epicerie-salee', quantite: 4, unite: 'pièces' },
      { nom: 'Bœuf haché', categorie: 'boucherie-poissonnerie', quantite: 250, unite: 'g' },
      { nom: 'Avocat', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Citron vert', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Tomate', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Cumin', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à café' },
    ],
  },
  {
    titre: 'Risotto crémeux aux champignons sauvages',
    recette: '1. Préparer un bouillon de légumes bien chaud.\n2. Faire revenir l\'échalote et les champignons émincés dans un peu de beurre.\n3. Ajouter le riz arborio et le nacrer 2 minutes.\n4. Verser une louche de bouillon et remuer jusqu\'à absorption complète. Répéter l\'opération pendant 18 minutes.\n5. Hors du feu, incorporer le parmesan râpé et une noix de beurre.',
    photoUrl: 'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Riz arborio', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
      { nom: 'Champignon de Paris', categorie: 'fruits-legumes', quantite: 250, unite: 'g' },
      { nom: 'Parmesan', categorie: 'produits-laitiers', quantite: 50, unite: 'g' },
      { nom: 'Échalote', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Beurre', categorie: 'produits-laitiers', quantite: 30, unite: 'g' },
    ],
  },
  {
    titre: 'Pad Thaï aux crevettes',
    recette: '1. Réhydrater les nouilles de riz dans de l\'eau tiède.\n2. Saisir les crevettes avec l\'ail et l\'oignon nouveau dans un wok très chaud.\n3. Pousser les crevettes sur le côté et brouiller un œuf dans le wok.\n4. Ajouter les nouilles égouttées, la sauce soja, un trait de jus de citron vert et une cuillère de sucre.\n5. Mélanger vivement 3 minutes et parsemer de cacahuètes concassées.',
    photoUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Nouilles de riz', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
      { nom: 'Crevettes', categorie: 'boucherie-poissonnerie', quantite: 200, unite: 'g' },
      { nom: 'Œuf', categorie: 'produits-laitiers', quantite: 1, unite: 'pièce' },
      { nom: 'Cacahuètes', categorie: 'epicerie-salee', quantite: 30, unite: 'g' },
      { nom: 'Citron vert', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Sauce soja salée', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Poulet Tikka Masala',
    recette: '1. Faire mariner les morceaux de poulet dans du yaourt et les épices tikka.\n2. Faire dorer les morceaux de poulet à feu vif, puis réserver.\n3. Dans la même sauteuse, faire revenir oignon, ail et gingembre, puis ajouter la pulpe de tomate et la crème.\n4. Laisser mijoter la sauce 10 minutes, réintégrer le poulet et cuire encore 5 minutes.\n5. Servir avec du riz basmati chaud.',
    photoUrl: 'https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Filet de poulet', categorie: 'boucherie-poissonnerie', quantite: 400, unite: 'g' },
      { nom: 'Coulis de tomate', categorie: 'epicerie-salee', quantite: 200, unite: 'ml' },
      { nom: 'Crème fraîche', categorie: 'produits-laitiers', quantite: 15, unite: 'cl' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Curcuma', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à café' },
      { nom: 'Riz basmati', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
    ],
  },
  {
    titre: 'Salade César au poulet croustillant',
    recette: '1. Couper le poulet en aiguillettes, les paner dans la chapelure et les dorer à la poêle.\n2. Laver et essorer la salade romaine.\n3. Préparer les croûtons dorés à la poêle avec un filet d\'huile d\'olive et de l\'ail.\n4. Mélanger la salade avec la sauce césar, disposer le poulet chaud, les croûtons et les copeaux de parmesan.',
    photoUrl: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Escalope de poulet', categorie: 'boucherie-poissonnerie', quantite: 2, unite: 'pièces' },
      { nom: 'Laitue', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Parmesan', categorie: 'produits-laitiers', quantite: 40, unite: 'g' },
      { nom: 'Pain de mie', categorie: 'boulangerie-patisserie', quantite: 2, unite: 'tranches' },
      { nom: 'Mayonnaise', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Shakshuka aux œufs pochés',
    recette: '1. Faire revenir l\'oignon, l\'ail et les poivrons émincés dans l\'huile d\'olive.\n2. Ajouter les tomates concassées, le cumin, le paprika, saler et poivrer. Laisser compoter 15 minutes.\n3. Former des petits creux dans la sauce et y casser délicatement les œufs.\n4. Couvrir et laisser cuire à feu doux 5 minutes jusqu\'à ce que le blanc soit pris.\n5. Parsemer de féta émiettée et de persil.',
    photoUrl: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Œuf', categorie: 'produits-laitiers', quantite: 4, unite: 'pièces' },
      { nom: 'Poivron rouge', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Tomate', categorie: 'fruits-legumes', quantite: 3, unite: 'pièces' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Ail', categorie: 'fruits-legumes', quantite: 2, unite: 'gousses' },
      { nom: 'Féta', categorie: 'produits-laitiers', quantite: 50, unite: 'g' },
    ],
  },
  {
    titre: 'Lasagnes traditionnelles à la bolognaise',
    recette: '1. Faire revenir le bœuf haché avec carotte et oignon hachés, ajouter la tomate et laisser mijoter 30 minutes.\n2. Préparer une béchamel légère au beurre, farine et lait avec une pointe de muscade.\n3. Dans un plat à gratin, alterner couches de pâtes à lasagne, bolognaise et béchamel.\n4. Terminer par une couche de béchamel et de fromage râpé.\n5. Cuire au four à 180°C pendant 35 minutes.',
    photoUrl: 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Feuilles de lasagne', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Steak haché', categorie: 'boucherie-poissonnerie', quantite: 350, unite: 'g' },
      { nom: 'Coulis de tomate', categorie: 'epicerie-salee', quantite: 400, unite: 'ml' },
      { nom: 'Lait demi-écrémé', categorie: 'produits-laitiers', quantite: 50, unite: 'cl' },
      { nom: 'Emmental râpé', categorie: 'produits-laitiers', quantite: 100, unite: 'g' },
      { nom: 'Carotte', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
    ],
  },
  {
    titre: 'Curry vert thaï au poulet et lait de coco',
    recette: '1. Chauffer la pâte de curry vert dans une sauteuse jusqu\'à ce qu\'elle libère ses arômes.\n2. Verser le lait de coco et porter à frémissement.\n3. Ajouter les morceaux de poulet, les courgettes en demi-lunes et les poivrons.\n4. Laisser mijoter 15 minutes à feu moyen.\n5. Ajouter un trait de sauce soja et des feuilles de basilic frais.',
    photoUrl: 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Filet de poulet', categorie: 'boucherie-poissonnerie', quantite: 350, unite: 'g' },
      { nom: 'Lait de coco', categorie: 'epicerie-salee', quantite: 400, unite: 'ml' },
      { nom: 'Courgette', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Poivron vert', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Riz basmati', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
    ],
  },
  {
    titre: 'Steak frites sauce au poivre',
    recette: '1. Tailler les pommes de terre en frites et les cuire en deux bains d\'huile chaude pour un croustillant parfait.\n2. Saisir la bavette ou l\'entrecôte à la poêle à feu très vif avec une noisette de beurre (2 min par face).\n3. Déglacer la poêle avec un peu de crème fraîche et du poivre noir concassé.\n4. Dresser la viande nappée de sauce avec les frites bien croustillantes.',
    photoUrl: 'https://images.unsplash.com/photo-1558030006-450675393462?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Bavette', categorie: 'boucherie-poissonnerie', quantite: 2, unite: 'pièces' },
      { nom: 'Pomme de terre', categorie: 'fruits-legumes', quantite: 600, unite: 'g' },
      { nom: 'Crème fraîche', categorie: 'produits-laitiers', quantite: 10, unite: 'cl' },
      { nom: 'Poivre noir', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à soupe' },
      { nom: 'Beurre', categorie: 'produits-laitiers', quantite: 20, unite: 'g' },
    ],
  },
  {
    titre: 'Falafels maison et sauce tahini',
    recette: '1. Mixer les pois chiches égouttés avec l\'ail, l\'oignon, le persil, le cumin et la coriandre.\n2. Façonner des petites boules compactes avec les mains.\n3. Faire frire les falafels dans l\'huile chaude 4 à 5 minutes jusqu\'à ce qu\'ils soient bien dorés.\n4. Préparer la sauce en mélangeant tahini, jus de citron et un peu d\'eau.\n5. Déguster chaud avec des pains pita.',
    photoUrl: 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb7?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pois chiches en boîte', categorie: 'epicerie-salee', quantite: 400, unite: 'g' },
      { nom: 'Ail', categorie: 'fruits-legumes', quantite: 2, unite: 'gousses' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Cumin', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à café' },
      { nom: 'Citron', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Pain pita', categorie: 'boulangerie-patisserie', quantite: 4, unite: 'pièces' },
    ],
  },
  {
    titre: 'Chili con Carne aux haricots rouges',
    recette: '1. Faire suer l\'oignon et l\'ail hachés avec le poivron coupé en dés.\n2. Ajouter la viande de bœuf hachée et cuire en l\'émiettant.\n3. Incorporer les tomates concassées, le concentré de tomate et les épices à chili.\n4. Laisser mijoter à feu doux 25 minutes.\n5. Ajouter les haricots rouges égouttés et prolonger la cuisson 10 minutes.',
    photoUrl: 'https://images.unsplash.com/photo-1541832676-9b763b0239ab?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Steak haché', categorie: 'boucherie-poissonnerie', quantite: 350, unite: 'g' },
      { nom: 'Haricots rouges en boîte', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Coulis de tomate', categorie: 'epicerie-salee', quantite: 300, unite: 'ml' },
      { nom: 'Poivron rouge', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Riz basmati', categorie: 'epicerie-salee', quantite: 150, unite: 'g' },
    ],
  },
  {
    titre: 'Tartine avocat œuf mollet',
    recette: '1. Toaster deux belles tranches de pain de campagne au levain.\n2. Cuire les œufs mollets exactement 6 minutes dans l\'eau bouillante, puis les refroidir dans l\'eau glacée et les écaler.\n3. Écraser l\'avocat avec du jus de citron, sel, poivre et un filet d\'huile d\'olive.\n4. Tartiner le pain, déposer l\'œuf délicatement ouvert, parsemer de graines et de piment doux.',
    photoUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pain de campagne', categorie: 'boulangerie-patisserie', quantite: 2, unite: 'tranches' },
      { nom: 'Avocat', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Œuf', categorie: 'produits-laitiers', quantite: 2, unite: 'pièces' },
      { nom: 'Citron', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Graine de sésame', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à café' },
    ],
  },
  {
    titre: 'Paëlla royale aux fruits de mer',
    recette: '1. Dans une grande poêle, faire dorer les morceaux de poulet et les rondelles de chorizo.\n2. Ajouter les poivrons émincés, l\'oignon et l\'ail.\n3. Verser le riz rond, ajouter le safran et recouvrir de bouillon fumant.\n4. Disposer les crevettes et les moules sur le dessus sans remuer.\n5. Cuire 20 minutes à feu moyen jusqu\'à absorption complète du liquide.',
    photoUrl: 'https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Riz rond', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Crevettes', categorie: 'boucherie-poissonnerie', quantite: 200, unite: 'g' },
      { nom: 'Chorizo', categorie: 'boucherie-poissonnerie', quantite: 80, unite: 'g' },
      { nom: 'Poivron rouge', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Petit pois', categorie: 'fruits-legumes', quantite: 80, unite: 'g' },
    ],
  },
  {
    titre: 'Gnocchis crémeux au gorgonzola et noix',
    recette: '1. Faire chauffer la crème fraîche liquide et le gorgonzola coupé en morceaux dans une poêle à feu doux.\n2. Cuire les gnocchis dans l\'eau bouillante salée jusqu\'à ce qu\'ils remontent à la surface.\n3. Égoutter les gnocchis et les verser directement dans la sauce au fromage fondu.\n4. Concasser les cerneaux de noix et les torréfier 2 minutes à sec.\n5. Servir bien chaud parsemé de noix croquantes et de poivre noir.',
    photoUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Gnocchis frais', categorie: 'frais', quantite: 400, unite: 'g' },
      { nom: 'Gorgonzola', categorie: 'produits-laitiers', quantite: 120, unite: 'g' },
      { nom: 'Crème fraîche', categorie: 'produits-laitiers', quantite: 15, unite: 'cl' },
      { nom: 'Cerneaux de noix', categorie: 'epicerie-salee', quantite: 40, unite: 'g' },
      { nom: 'Poivre noir', categorie: 'epicerie-salee', quantite: 1, unite: 'pincée' },
    ],
  },
  {
    titre: 'Bobun vietnamien au bœuf',
    recette: '1. Cuire les vermicelles de riz et les rincer à l\'eau froide.\n2. Couper le bœuf en fines lamelles et le faire mariner avec ail, citronnelle et sauce soja.\n3. Saisir le bœuf à feu vif 2 minutes au wok.\n4. Dans des grands bols, disposer les vermicelles, la salade croquante, les carottes râpées, les concombres et les nems chauds.\n5. Ajouter le bœuf sauté, parsemer de menthe fraîche et de cacahuètes pilées, arroser de sauce nuoc-mâm.',
    photoUrl: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Vermicelles de riz', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
      { nom: 'Bavette', categorie: 'boucherie-poissonnerie', quantite: 250, unite: 'g' },
      { nom: 'Carotte', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Concombre', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Cacahuètes', categorie: 'epicerie-salee', quantite: 30, unite: 'g' },
      { nom: 'Laitue', categorie: 'fruits-legumes', quantite: 3, unite: 'feuilles' },
    ],
  },
  {
    titre: 'Tartiflette au Reblochon fermier',
    recette: '1. Éplucher les pommes de terre et les cuire à l\'eau 15 minutes (elles doivent rester fermes).\n2. Faire revenir les oignons et les lardons dans une poêle sans matière grasse jusqu\'à légère coloration.\n3. Couper les pommes de terre en rondelles et les mélanger aux lardons et oignons.\n4. Disposer le tout dans un plat à gratin, poivrer et verser un trait de vin blanc.\n5. Couper le Reblochon en deux dans l\'épaisseur et le déposer croûte vers le haut.\n6. Enfourner à 200°C pendant 20 minutes jusqu\'à ce que le fromage soit bien gratiné.',
    photoUrl: 'https://images.unsplash.com/photo-1608897013039-887f21d8c804?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pomme de terre', categorie: 'fruits-legumes', quantite: 800, unite: 'g' },
      { nom: 'Reblochon', categorie: 'produits-laitiers', quantite: 1, unite: 'pièce' },
      { nom: 'Lardons fumés', categorie: 'boucherie-poissonnerie', quantite: 200, unite: 'g' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 2, unite: 'pièces' },
      { nom: 'Vin blanc de cuisine', categorie: 'boissons', quantite: 5, unite: 'cl' },
    ],
  },
  {
    titre: 'Ceviche de daurade et mangue fraîche',
    recette: '1. Couper le filet de daurade en dés réguliers d\'environ 1 cm.\n2. Couper la mangue en petits dés et émincer très finement l\'oignon rouge.\n3. Dans un bol en verre, mélanger le poisson, la mangue, l\'oignon rouge et la coriandre ciselée.\n4. Arroser avec le jus de 3 citrons verts et un filet d\'huile d\'olive.\n5. Laisser mariner au réfrigérateur pendant 15 minutes, assaisonner de fleur de sel et servir très frais.',
    photoUrl: 'https://images.unsplash.com/photo-1535400255456-984241443b29?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Filet de poisson blanc', categorie: 'boucherie-poissonnerie', quantite: 300, unite: 'g' },
      { nom: 'Mangue', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Citron vert', categorie: 'fruits-legumes', quantite: 3, unite: 'pièces' },
      { nom: 'Oignon rouge', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Huile d\'olive', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Tagliatelles au saumon fumé et aneth',
    recette: '1. Cuire les tagliatelles fraîches al dente dans une grande casserole d\'eau bouillante salée.\n2. Dans une sauteuse, faire chauffer la crème fraîche avec un filet de jus de citron et l\'aneth ciselée.\n3. Tailler le saumon fumé en fines lanières.\n4. Égoutter les pâtes en gardant un fond d\'eau de cuisson.\n5. Verser les pâtes dans la sauteuse, ajouter le saumon fumé hors du feu et mélanger délicatement.',
    photoUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Tagliatelles fraîches', categorie: 'frais', quantite: 300, unite: 'g' },
      { nom: 'Saumon fumé', categorie: 'boucherie-poissonnerie', quantite: 150, unite: 'g' },
      { nom: 'Crème fraîche', categorie: 'produits-laitiers', quantite: 20, unite: 'cl' },
      { nom: 'Citron', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Aneth fraîche', categorie: 'fruits-legumes', quantite: 1, unite: 'botte' },
    ],
  },
  {
    titre: 'Quiche lorraine traditionnelle',
    recette: '1. Préchauffer le four à 180°C.\n2. Étaler la pâte brisée dans un moule à tarte et piquer le fond avec une fourchette.\n3. Faire dorer les lardons à la poêle et les éponger sur du papier absorbant.\n4. Dans un saladier, fouetter les œufs avec la crème, le lait, du sel, du poivre et de la muscade râpée.\n5. Répartir les lardons sur le fond de tarte et verser l\'appareil.\n6. Enfourner pendant 35 à 40 minutes jusqu\'à ce que la surface soit dorée et gonflée.',
    photoUrl: 'https://images.unsplash.com/photo-1608039829572-78524f79c4c7?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pâte brisée', categorie: 'frais', quantite: 1, unite: 'rouleau' },
      { nom: 'Lardons fumés', categorie: 'boucherie-poissonnerie', quantite: 200, unite: 'g' },
      { nom: 'Œuf', categorie: 'produits-laitiers', quantite: 3, unite: 'pièces' },
      { nom: 'Crème fraîche', categorie: 'produits-laitiers', quantite: 20, unite: 'cl' },
      { nom: 'Lait demi-écrémé', categorie: 'produits-laitiers', quantite: 10, unite: 'cl' },
    ],
  },
  {
    titre: 'Couscous aux légumes et poulet',
    recette: '1. Faire dorer les pilons de poulet avec les oignons émincés dans un grand faitout.\n2. Ajouter les carottes, navets, courgettes taillés en gros tronçons et les épices à couscous.\n3. Couvrir d\'eau et laisser mijoter 35 minutes.\n4. Ajouter les pois chiches en boîte 10 minutes avant la fin de la cuisson.\n5. Égrener la semoule cuite à la vapeur avec une noisette de beurre et servir arrosé du bouillon parfumé.',
    photoUrl: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Semoule de blé', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Cuisse de poulet', categorie: 'boucherie-poissonnerie', quantite: 2, unite: 'pièces' },
      { nom: 'Carotte', categorie: 'fruits-legumes', quantite: 2, unite: 'pièces' },
      { nom: 'Courgette', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Navet', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Pois chiches en boîte', categorie: 'epicerie-salee', quantite: 150, unite: 'g' },
    ],
  },
  {
    titre: 'Burrata crémeuse, tomates anciennes et pesto',
    recette: '1. Couper les tomates multicolores en tranches généreuses.\n2. Les disposer en rosace dans un grand plat de service.\n3. Poser la boule de burrata au centre et l\'ouvrir délicatement avec une cuillère.\n4. Arroser d\'un généreux filet d\'huile d\'olive vierge extra et de cuillerées de pesto au basilic.\n5. Assaisonner de fleur de sel, de poivre du moulin et de quelques feuilles de basilic frais.',
    photoUrl: 'https://images.unsplash.com/photo-1592417817098-8f3d69102656?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Burrata', categorie: 'produits-laitiers', quantite: 1, unite: 'pièce' },
      { nom: 'Tomate', categorie: 'fruits-legumes', quantite: 3, unite: 'pièces' },
      { nom: 'Pesto', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
      { nom: 'Huile d\'olive', categorie: 'epicerie-salee', quantite: 2, unite: 'c. à soupe' },
      { nom: 'Basilic frais', categorie: 'fruits-legumes', quantite: 5, unite: 'feuilles' },
    ],
  },
  {
    titre: 'Gyros grec au poulet et tzatziki',
    recette: '1. Râper le concombre, l\'égoutter et le mélanger au yaourt grec avec l\'ail écrasé et la menthe.\n2. Faire mariner les lamelles de poulet dans l\'origan et l\'huile d\'olive, puis les saisir à la poêle.\n3. Réchauffer les pains pita à la poêle sèche.\n4. Garnir chaque pain de sauce tzatziki, de poulet chaud, de lamelles d\'oignon rouge et de dés de tomate.\n5. Rouler fermement et savourer.',
    photoUrl: 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Pain pita', categorie: 'boulangerie-patisserie', quantite: 2, unite: 'pièces' },
      { nom: 'Filet de poulet', categorie: 'boucherie-poissonnerie', quantite: 250, unite: 'g' },
      { nom: 'Yaourt grec', categorie: 'produits-laitiers', quantite: 150, unite: 'g' },
      { nom: 'Concombre', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
      { nom: 'Tomate', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Oignon rouge', categorie: 'fruits-legumes', quantite: 0.5, unite: 'pièce' },
    ],
  },
  {
    titre: 'Soupe à l\'oignon gratinée',
    recette: '1. Émincer finement les oignons et les faire confire lentement dans du beurre pendant 20 minutes.\n2. Saupoudrer d\'une cuillère de farine, bien mélanger et déglacer avec le bouillon de bœuf chaud.\n3. Laisser mijoter doucement 20 minutes supplémentaires.\n4. Verser la soupe dans des bols allant au four, déposer des tranches de baguette toastées.\n5. Couvrir généreusement d\'emmental râpé et faire gratiner 8 minutes sous le grill du four.',
    photoUrl: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 4, unite: 'pièces' },
      { nom: 'Beurre', categorie: 'produits-laitiers', quantite: 30, unite: 'g' },
      { nom: 'Baguette', categorie: 'boulangerie-patisserie', quantite: 0.5, unite: 'pièce' },
      { nom: 'Emmental râpé', categorie: 'produits-laitiers', quantite: 80, unite: 'g' },
      { nom: 'Farine de blé', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Wok de nouilles sautées aux légumes croquants',
    recette: '1. Cuire les nouilles aux œufs 3 minutes et les rincer.\n2. Tailler poivrons, carottes, brocolis et oignons en fines lanières régulières.\n3. Dans un wok très chaud avec de l\'huile de sésame, faire sauter les légumes 5 minutes pour qu\'ils restent bien croquants.\n4. Ajouter les nouilles égouttées, la sauce soja et un trait de sauce huître ou sucrée.\n5. Sauter vivement pendant 2 minutes et parsemer de ciboule fraîche.',
    photoUrl: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Nouilles aux œufs', categorie: 'epicerie-salee', quantite: 250, unite: 'g' },
      { nom: 'Brocoli', categorie: 'fruits-legumes', quantite: 150, unite: 'g' },
      { nom: 'Carotte', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Poivron rouge', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Sauce soja salée', categorie: 'epicerie-salee', quantite: 3, unite: 'c. à soupe' },
    ],
  },
  {
    titre: 'Dhal de lentilles corail au lait de coco',
    recette: '1. Rincer abondamment les lentilles corail à l\'eau claire.\n2. Faire revenir l\'oignon, l\'ail, le gingembre frais et le curcuma dans une casserole avec de l\'huile.\n3. Ajouter les lentilles corail, les tomates concassées et l\'eau.\n4. Laisser mijoter à feu doux 15 minutes jusqu\'à ce que les lentilles s\'écrasent en purée onctueuse.\n5. Incorporer le lait de coco, réchauffer 3 minutes et servir avec des feuilles de coriandre fraîche.',
    photoUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&auto=format&fit=crop&q=80',
    ingredients: [
      { nom: 'Lentilles corail', categorie: 'epicerie-salee', quantite: 200, unite: 'g' },
      { nom: 'Lait de coco', categorie: 'epicerie-salee', quantite: 200, unite: 'ml' },
      { nom: 'Coulis de tomate', categorie: 'epicerie-salee', quantite: 150, unite: 'ml' },
      { nom: 'Oignon', categorie: 'fruits-legumes', quantite: 1, unite: 'pièce' },
      { nom: 'Gingembre', categorie: 'fruits-legumes', quantite: 10, unite: 'g' },
      { nom: 'Curcuma', categorie: 'epicerie-salee', quantite: 1, unite: 'c. à café' },
    ],
  },
];

async function main() {
  console.log('--- Début de la génération des 30 nouveaux repas avec photos ---');

  const targetEmails = ['admin@comi.app', 'test@comi.app'];

  // Assurer la présence des comptes
  const testPassword = 'Password123!';
  const passwordHash = await bcryptjs.hash(testPassword, 10);

  // Préparer le cache des ingrédients existants ou les créer
  const getOrCreateIngredient = async (nom: string, categorie: string) => {
    let ing = await prisma.ingredient.findFirst({
      where: {
        nom: {
          equals: nom.trim(),
        },
      },
    });

    if (!ing) {
      ing = await prisma.ingredient.create({
        data: {
          nom: nom.trim(),
          categorie: categorie.trim(),
        },
      });
    }
    return ing;
  };

  for (const email of targetEmails) {
    const user = await prisma.user.upsert({
      where: { email },
      update: { passwordHash },
      create: {
        email,
        passwordHash,
        weekStartDay: 0,
      },
    });

    console.log(`Traitement du compte : ${user.email} (ID: ${user.id})`);

    // Supprimer les programmations et repas existants UNIQUEMENT pour ce compte test/admin
    await prisma.programmation.deleteMany({
      where: { userId: user.id },
    });

    await prisma.repas.deleteMany({
      where: { userId: user.id },
    });

    console.log(`Anciens plats purgés pour ${user.email}. Création de 30 nouveaux plats...`);

    // Créer les 30 repas
    for (const mealData of NEW_MEALS) {
      // Résoudre les ingrédients
      const mealIngredients = [];
      for (const item of mealData.ingredients) {
        const ing = await getOrCreateIngredient(item.nom, item.categorie);
        mealIngredients.push({
          ingredientId: ing.id,
          quantite: item.quantite ?? null,
          unite: item.unite ?? null,
        });
      }

      await prisma.repas.create({
        data: {
          userId: user.id,
          titre: mealData.titre,
          recette: mealData.recette,
          photoUrl: mealData.photoUrl,
          ingredients: {
            create: mealIngredients,
          },
        },
      });
    }

    console.log(`30 nouveaux plats créés avec succès pour ${user.email} !`);

    // Planifier quelques repas sur les prochains jours pour un planning vivant
    const createdMeals = await prisma.repas.findMany({
      where: { userId: user.id },
      take: 8,
    });

    const now = new Date();
    for (let i = 0; i < createdMeals.length; i++) {
      const progDate = new Date(now);
      progDate.setDate(now.getDate() + Math.floor(i / 2));
      progDate.setHours(0, 0, 0, 0);

      await prisma.programmation.create({
        data: {
          userId: user.id,
          repasId: createdMeals[i].id,
          date: progDate,
          heure: i % 2, // 0 = midi, 1 = soir
        },
      });
    }

    console.log(`Planning d'exemple planifié pour ${user.email}.`);
  }

  // Nettoyage de l'ancien script temporaire s'il existe
  console.log('--- Terminé avec succès ! ---');
}

main()
  .catch((e) => {
    console.error('Erreur :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
