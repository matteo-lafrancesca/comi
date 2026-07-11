import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

/**
 * POST /api/repas/analyser
 * Analyse une image de plat via l'API Gemini 2.5 Flash pour générer une recette.
 * Réutilise les ingrédients existants en base s'ils correspondent sémantiquement.
 */
export async function POST(request: Request) {
  try {
    // 1. Authentification de l'utilisateur connecté
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json(
        { error: 'Non autorisé. Veuillez vous connecter.' },
        { status: 401 }
      );
    }

    // 2. Vérification de la clé API Gemini
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: 'Clé API Gemini non configurée dans le fichier .env.' },
        { status: 500 }
      );
    }

    // 3. Récupération des ingrédients existants en base de données pour déduplication
    const allIngredients = await db.ingredient.findMany({
      select: {
        nom: true,
        categorie: true,
      },
      orderBy: {
        nom: 'asc',
      },
    });

    const existingIngredientsList = allIngredients
      .map((ing) => `- ${ing.nom} (catégorie: ${ing.categorie})`)
      .join('\n');

    // 4. Extraction du fichier image et de l'aide facultative de titre depuis FormData
    const formData = await request.formData();
    const file = formData.get('image') as File | null;
    const titreAide = formData.get('titre') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Aucun fichier d'image fourni." },
        { status: 400 }
      );
    }

    // Conversion de l'image en base64 pour transmission en inlineData
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type;

    // 5. Instruction Système et Prompt adaptatif pour Gemini
    let systemInstruction = `Tu es un chef cuisinier expert et un nutritionniste.
Analyse cette image de repas. Identifie le plat de manière précise et suggère une recette.
Tu dois renvoyer les données structurées en français.

Règles impératives de détection :
1. Valide d'abord si l'image représente de la nourriture humaine comestible, un ingrédient ou un plat cuisiné.
2. Si ce n'est pas le cas (ex : animaux, objets, vêtements, personnes, paysages, etc.), tu DOIS impérativement positionner "isMeal" à false et donner une explication dans "raisonRefus". Dans ce cas, les champs "titre", "ingredients" et "recette" peuvent être laissés vides (chaîne vide pour le titre, tableaux vides).

Règles impératives concernant les ingrédients (uniquement si isMeal est true) :
Tu DOIS uniquement utiliser des ingrédients présents dans la liste ci-dessous.
Pour chaque ingrédient de ta recette :
1. Recherche s'il existe un ingrédient similaire dans la liste des ingrédients existants ci-dessous (sensibilité à la casse, singulier/pluriel, synonyme proche, ex : "tomates" vs "Tomate", "crème" vs "Crème fraîche").
2. Si un ingrédient similaire existe, tu DOIS réutiliser EXACTEMENT le nom et la catégorie de cet ingrédient existant dans la réponse JSON.
3. Consigne absolue : Si aucun ingrédient correspondant n'est présent dans la liste ci-dessous, tu ne dois PAS l'ajouter à ta réponse. Interdiction absolue d'inventer ou de proposer un ingrédient absent de cette liste. L'utilisateur ajoutera lui-même à la main les ingrédients manquants si nécessaire.

Liste des ingrédients existants en base de données :
${existingIngredientsList || "Aucun ingrédient pour le moment."}`;

    // Si l'utilisateur a fourni une aide au titre
    if (titreAide && titreAide.trim() !== '') {
      systemInstruction += `\n\nIndication de l'utilisateur : L'utilisateur a précisé que ce plat est ou contient : "${titreAide.trim()}". Utilise cette information pour guider et affiner ton analysis, de manière à proposer les ingrédients et étapes correspondants de la manière la plus précise possible.`;
    }

    // Endpoint API Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;

    // Payload conforme au format d'API Gemini (Vision + Structured JSON Output)
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: systemInstruction },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            isMeal: {
              type: "boolean",
              description: "True si l'image représente bien de la nourriture, un ingrédient ou un plat cuisiné destiné aux humains. False si l'image montre autre chose (animaux, vêtements, objets, paysages, etc.).",
            },
            raisonRefus: {
              type: "string",
              description: "Si isMeal est false, explique poliment en français pourquoi l'image a été rejetée (ex: 'L'image montre un chat et non un repas humain.'). Si isMeal est true, laisse ce champ vide.",
            },
            titre: {
              type: "string",
              description: "Nom du repas deviné, de manière concise (ex : Spaghetti bolognaise, Quiche lorraine, Tarte tatin)",
            },
            ingredients: {
              type: "array",
              description: "Liste des ingrédients requis pour préparer ce repas (pour 2 à 4 personnes environ)",
              items: {
                type: "object",
                properties: {
                  nom: {
                    type: "string",
                    description: "Nom de l'ingrédient (singulier, ex : Tomate, Lardon, Farine de blé, Œuf)",
                  },
                  quantite: {
                    type: "number",
                    description: "La quantité requise sous forme de nombre (par exemple 4, 150, 0.5) ou null si non quantifiable",
                  },
                  unite: {
                    type: "string",
                    description: "L'unité de mesure abrégée si applicable (ex : g, kg, cl, ml, c.à.s., c.à.c., sachet, pincée, tranche, boîte) ou null/chaîne vide si pas d'unité",
                  },
                  categorie: {
                    type: "string",
                    enum: [
                      "fruits-legumes",
                      "boucherie-poissonnerie",
                      "frais",
                      "produits-laitiers",
                      "boulangerie-patisserie",
                      "epicerie-salee",
                      "epicerie-sucree",
                      "boissons",
                      "surgeles",
                    ],
                    description: "La catégorie de courses de l'ingrédient",
                  },
                },
                required: ["nom", "categorie"],
              },
            },
            recette: {
              type: "array",
              description: "Les étapes de préparation détaillées, ordonnées et claires",
              items: {
                type: "string",
              },
            },
          },
          required: ["isMeal", "raisonRefus", "titre", "ingredients", "recette"],
        },
      },
    };

    // 6. Envoi de la requête à l'API Gemini
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(geminiPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erreur API Gemini:", errorText);
      return NextResponse.json(
        { error: "Erreur lors de l'appel à l'API de vision de Gemini." },
        { status: 502 }
      );
    }

    const result = await response.json();
    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!responseText) {
      console.error("Format de réponse Gemini inattendu:", JSON.stringify(result));
      return NextResponse.json(
        { error: "La réponse de l'IA est vide ou mal formatée." },
        { status: 502 }
      );
    }

    // Le contenu retourné est garanti d'être du JSON conforme au schéma spécifié
    const parsedData = JSON.parse(responseText);

    // Si ce n'est pas un repas, on rejette avec l'explication fournie par l'IA
    if (parsedData.isMeal === false) {
      const raison = parsedData.raisonRefus || "L'image ne semble pas représenter un repas ou un aliment.";
      return NextResponse.json(
        { error: raison },
        { status: 400 }
      );
    }

    // Filtrer pour ne garder UNIQUEMENT que les ingrédients existants en base de données
    if (parsedData.ingredients && Array.isArray(parsedData.ingredients)) {
      const filteredIngredients = [];
      for (const ing of parsedData.ingredients) {
        if (!ing.nom) continue;
        const trimmedNom = ing.nom.trim().toLowerCase();
        
        // Recherche d'une correspondance exacte (insensible à la casse) dans allIngredients
        const match = allIngredients.find(
          (existing) => existing.nom.trim().toLowerCase() === trimmedNom
        );
        
        if (match) {
          filteredIngredients.push({
            nom: match.nom, // Conserver l'orthographe exacte de la BDD
            quantite: typeof ing.quantite === 'number' ? ing.quantite : null,
            unite: ing.unite ? String(ing.unite).trim() : null,
            categorie: match.categorie, // Conserver la catégorie exacte de la BDD
          });
        } else {
          console.log(`[IA Analyser] Ingrédient rejeté car absent de la BDD : "${ing.nom}"`);
        }
      }
      parsedData.ingredients = filteredIngredients;
    }

    return NextResponse.json(parsedData);
  } catch (error: any) {
    console.error("Erreur dans /api/repas/analyser:", error);
    return NextResponse.json(
      { error: error.message || "Une erreur interne est survenue lors de l'analyse." },
      { status: 500 }
    );
  }
}
