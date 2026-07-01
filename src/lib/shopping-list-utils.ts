/**
 * Utilitaires de formatage pour la liste de courses.
 * Gère les pluriels en français et l'élision de la préposition (de/d').
 */

/**
 * Pluralise un mot simple en français en suivant les règles standards.
 */
export function pluralizeWord(word: string): string {
  if (!word) return word;
  const lower = word.toLowerCase();
  
  // Mots invariables ou prépositions communes
  const exempt = [
    'de', 'd', 'du', 'des', 'le', 'la', 'les', 'un', 'une', 
    'et', 'avec', 'sans', 'pour', 'en', 'dans', 'par', 'sur'
  ];
  if (exempt.includes(lower) || /^[0-9]+$/.test(word)) {
    return word;
  }
  
  // Déjà au pluriel
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z')) {
    return word;
  }
  
  // Exception en -al -> -aux
  if (lower.endsWith('al')) {
    const alExceptions = ['bal', 'carnaval', 'chacal', 'festival', 'regal', 'régal'];
    if (alExceptions.includes(lower)) {
      return word + 's';
    }
    return word.substring(0, word.length - 2) + 'aux';
  }
  
  // Exception en -au, -eu, -eau -> -aux, -eux, -eaux
  if (lower.endsWith('au') || lower.endsWith('eu') || lower.endsWith('eau')) {
    const auExceptions = ['landau', 'sarrau', 'bleu', 'pneu', 'emeu', 'émeu'];
    if (auExceptions.includes(lower)) {
      return word + 's';
    }
    return word + 'x';
  }
  
  // Sept substantifs en -ou prenant un x
  const ouExceptions = ['chou', 'caillou', 'genou', 'hibou', 'joujou', 'pou'];
  if (ouExceptions.includes(lower)) {
    return word + 'x';
  }
  
  return word + 's';
}

/**
 * Pluralise un nom d'ingrédient (qui peut être composé).
 * Exemple : "pomme de terre" -> "pommes de terre"
 * Exemple : "gousse d'ail" -> "gousses d'ail"
 * Exemple : "carotte râpée" -> "carottes râpées"
 */
export function pluralizeIngredientName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return trimmed;
  
  const words = trimmed.split(/\s+/);
  // Trouver s'il y a un "de" ou un mot commençant par "d'" (ex: d'ail)
  const deIndex = words.findIndex(
    w => w.toLowerCase() === 'de' || w.toLowerCase().startsWith("d'")
  );

  if (deIndex !== -1) {
    // On ne pluralise que ce qui précède la préposition "de/d'"
    return words
      .map((w, idx) => {
        if (idx < deIndex) {
          if (w.includes("'")) {
            const parts = w.split("'");
            parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]);
            return parts.join("'");
          }
          return pluralizeWord(w);
        }
        return w;
      })
      .join(' ');
  } else {
    // Pas de préposition, on pluralise tous les mots (ex: "carotte râpée" -> "carottes râpées")
    return words
      .map(w => {
        if (w.includes("'")) {
          const parts = w.split("'");
          parts[parts.length - 1] = pluralizeWord(parts[parts.length - 1]);
          return parts.join("'");
        }
        return pluralizeWord(w);
      })
      .join(' ');
  }
}

/**
 * Détermine s'il faut utiliser "d'" ou "de " devant le nom de l'ingrédient.
 */
export function getDeOrD(nom: string): string {
  const lower = nom.trim().toLowerCase();
  
  // H aspirés courants en cuisine
  if (lower.startsWith('haricot') || lower.startsWith('homard')) {
    return 'de ';
  }
  
  // Voyelles françaises ou H (qui sera considéré comme muet sauf exceptions ci-dessus)
  const startsWithVowelOrH = /^[aeiouyàâæéèêëîïôœùûüÿh]/i.test(lower);
  
  return startsWithVowelOrH ? "d'" : "de ";
}

/**
 * Formate un ingrédient en phrase lisible en français.
 */
export function formatIngredient(
  nom: string,
  quantite: number | null,
  unite: string | null
): string {
  const cleanNom = nom.trim();
  
  if (quantite === null || quantite === undefined || quantite === 0) {
    return cleanNom;
  }
  
  // Arrondir au maximum à 2 décimales pour éviter les valeurs flottantes longues
  const formattedQty = Math.round(quantite * 100) / 100;
  
  // Cas sans unité (ex: "3 tomates")
  if (!unite || unite.trim() === '') {
    if (formattedQty > 1) {
      return `${formattedQty} ${pluralizeIngredientName(cleanNom)}`;
    }
    return `${formattedQty} ${cleanNom}`;
  }
  
  const cleanUnite = unite.trim();
  
  // Cas avec unité métrique courte (pas d'espace et pas de pluriel sur l'unité)
  const isMetric = /^(g|kg|ml|cl|l)$/i.test(cleanUnite);
  if (isMetric) {
    const formattedUnit = cleanUnite.toLowerCase();
    return `${formattedQty}${formattedUnit} ${getDeOrD(cleanNom)}${cleanNom}`;
  }
  
  // Cas avec unité textuelle (ex: "gousse", "tranche" -> prend un s et un espace)
  const formattedUnit = formattedQty > 1 ? pluralizeWord(cleanUnite) : cleanUnite;
  return `${formattedQty} ${formattedUnit} ${getDeOrD(cleanNom)}${cleanNom}`;
}
