# Directives de design — « Carnet de cuisine »

Tailwind CSS v4, tokens déclarés dans `@theme` (`src/app/globals.css`). Clair et sombre sont obligatoires pour chaque élément.

## 1. Parti pris

L'interface ressemble à un carnet de recettes imprimé, pas à un tableau de bord SaaS :

- **Papier, encre, jaune d'œuf.** Fond crème, texte brun très sombre, jaune `brand` réservé au bouton principal et à de rares repères (soulignement de l'onglet actif, trait du jour courant) — pas de surlignage derrière les titres — jamais comme couleur d'ambiance partout.
- **Serif pour ce qui se lit** (titres, noms de repas, numéros) : `font-display` (Fraunces). **Sans** pour ce qui se manipule (labels, boutons, formulaires) : DM Sans.
- **Filets, pas de cartes.** On sépare par des traits (`border-neutral-200`, `divide-dashed`) plutôt que d'empiler des cartes arrondies à ombre. Une carte n'existe que si l'objet est une photo.
- **Rien d'inutile.** Pas de texte de remplissage, pas d'info qui n'aide pas à agir (ex. e-mail dans la nav, titres d'étape décoratifs, sous-titres qui répètent le titre).

## 2. Ce qu'il ne faut pas faire (signes d'une UI « générée »)

- Pastilles d'icônes colorées en rond devant chaque titre ou état vide.
- Tout en `rounded-full`/pilule, dégradés, `backdrop-blur`, halos `shadow-brand/20`.
- `hover:scale-*` sur les cartes, `active:scale-95` partout.
- Cartes identiques empilées avec icône + titre + phrase d'aide.
- Barres de progression et badges pour des informations évidentes.
- Un nouvel écran copié-collé d'un autre : si un bloc se répète, c'est un composant (voir `AGENTS.md` §5).

Quand on crée un composant, chercher d'abord une forme propre au contenu (une liste numérotée en serif pour des étapes, une ligne pointillée pour des quantités…) plutôt que le bloc générique « carte + icône ».

## 3. Tokens

| Usage | Clair | Sombre |
| :--- | :--- | :--- |
| Fond de page | `bg-bg-light` | `dark:bg-bg-dark` |
| Surface (drawer, barre d'onglets) | `bg-card-light` | `dark:bg-card-dark` |
| Texte | `text-text-light-main` | `dark:text-text-dark-main` |
| Texte secondaire | `text-text-light-muted` | `dark:text-text-dark-muted` |
| Accent | `bg-brand` + `text-ink` (jamais `text-white` sur jaune) | idem |
| Filets | `border-neutral-200` / `-300` | `dark:border-neutral-800` / `-700` |
| Erreur | `red-700` (texte `red-800` / `dark:red-300`) | |

- Les `neutral-*` sont **remappés en teintes chaudes** dans le thème : on peut les utiliser. Pas d'autres couleurs Tailwind par défaut (hors `red-*` pour les erreurs/suppressions).
- Jamais de noir ou blanc pur en fond.
- Rayons : `rounded-card` (14px) pour photos, drawers et grands conteneurs ; `rounded-input` (10px) pour boutons, champs, puces. Pas de pilule.
- Ombres : `shadow-lg` uniquement pour ce qui flotte (drawer, menus, élément glissé).

## 4. Utilitaires de signature (`globals.css`)

- `eyebrow` — petites capitales espacées pour les labels de section et métadonnées (`Midi`, `Ingrédients`…).
- `font-display` — serif. `italic` + `font-display` pour les numéros (étapes, jours, initiales).

## 5. Composants de base à réutiliser

| Besoin | Composant |
| :--- | :--- |
| Bouton | `ui/Button` (`primary` = tampon jaune à bordure encre, `secondary`, `danger`, `ghost`) ou `buttonStyles()` sur un `<Link>` |
| Bouton icône | `ui/IconButton` (libellé obligatoire) |
| Champ texte | `ui/TextInput` (souligné, label en `eyebrow`) |
| Message d'erreur / info | `ui/Alert` |
| Titre de page + action | `PageHeader` |
| Page secondaire (retour + titre) | `BackHeader` |
| Photo à téléverser | `ImageDropzone` |
| Panneau coulissant | `Drawer` |

## 6. Motifs

- **Liste de lignes** : `divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700`, titre de section en `eyebrow` avec filet plein dessous (`border-b border-text-light-main dark:border-text-dark-main`).
- **Vignette de repas** : photo 4/5, titre en serif dessous, rien d'autre. Sans photo : initiale en serif italique sur papier ligné.
- **Interactions** : changement de couleur/fond au survol ; le bouton `primary` s'« écrase » (déplacement d'1px) au clic. Pas de rebond ni de zoom.
- **Mobile** : navigation en barre d'onglets fixe en bas (`pb-28` sur le contenu), `h-dvh`, safe areas. Desktop : colonne de navigation à gauche, titres de section en serif numérotés.

## 7. Exemple — champ et section

```tsx
<TextInput label="Nom du repas" placeholder="Tarte tatin…" className="font-display text-2xl" />

<section>
  <h2 className="eyebrow pb-2 border-b border-text-light-main dark:border-text-dark-main">Ingrédients</h2>
  <ul className="divide-y divide-dashed divide-neutral-300 dark:divide-neutral-700">
    <li className="py-2.5 text-sm">2 oignons</li>
  </ul>
</section>
```
