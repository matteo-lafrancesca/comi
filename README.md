# 🍳 Menu Manage

**Menu Manage** est une Progressive Web App (PWA) moderne conçue pour simplifier la planification des repas hebdomadaires et générer automatiquement la liste de courses associée.

L'application est conçue avec une approche **Mobile-First** (optimisée pour être installée sur l'écran d'accueil d'un iPhone) tout en restant pleinement fonctionnelle sur ordinateur, et propose un **Mode Sombre** harmonieux.

---

## 🚀 Fonctionnalités principales

*   **Planification Hebdomadaire** : Planifiez vos repas du Midi et du Soir pour chaque jour de la semaine.
*   **Liste de Courses Intelligente** : Agrégation et formatage automatique des ingrédients nécessaires pour la semaine, classés par rayon/catégorie (fruits & légumes, épicerie, surgelés, etc.).
*   **Gestion des Hors-Plannings** : Ajoutez facilement des repas ou articles supplémentaires directement à votre liste de courses.
*   **Fiches Recettes** : Associez des ingrédients, des descriptions et des photos à vos repas.
*   **Intégration PWA** : Raccourci sur l'écran d'accueil, affichage en plein écran sans barre d'URL de navigateur (Standalone), et excellente réactivité sur iOS.

---

## 🛠️ Stack Technique

*   **Framework** : [Next.js 16](https://nextjs.org/) (App Router) & [React 19](https://react.dev/)
*   **Styles** : [Tailwind CSS v4](https://tailwindcss.com/) (avec design system personnalisé dans `globals.css`)
*   **Base de Données** : SQLite avec [Prisma ORM](https://www.prisma.io/)
*   **Authentification** : JWT (avec cookies sécurisés et `jose`) & Hashage `bcryptjs`
*   **Stockage Image** : [Uploadthing](https://uploadthing.com/)
*   **Icônes** : [Lucide React](https://lucide.dev/)

---

## 📦 Installation et Initialisation

Suivez les étapes ci-dessous pour installer et lancer le projet sur votre machine locale.

### 1. Prérequis

Assurez-vous d'avoir installé sur votre machine :
*   [Node.js](https://nodejs.org/) (version **18.x** ou supérieure recommandée)
*   **npm** (ou yarn / pnpm / bun)

### 2. Cloner le projet

```bash
git clone https://github.com/matteo-lafrancesca/ManageMenu.git
cd ManageMenu
```

### 3. Installer les dépendances

Installez l'ensemble des dépendances du projet :

```bash
npm install
```

### 4. Configurer les variables d'environnement

Copiez le fichier d'exemple `.env.example` pour créer votre fichier `.env` local :

```bash
cp .env.example .env
```

Ouvrez le fichier `.env` créé et configurez les variables suivantes :

*   `DATABASE_URL` : L'adresse de votre base de données. Par défaut, elle est configurée sur SQLite local (`file:./dev.db`).
*   `JWT_SECRET` : Une clé secrète forte et unique servant à signer les jetons d'authentification utilisateur.
*   `UPLOADTHING_TOKEN` : Clé API Uploadthing pour l'hébergement et l'envoi des photos de plats (obtenez-la gratuitement sur [Uploadthing](https://uploadthing.com/)).

> [!TIP]
> Pour générer un `JWT_SECRET` sécurisé rapidement en ligne de commande :
> ```bash
> node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
> ```

### 5. Configurer la base de données (Prisma & SQLite)

Initialisez la base de données SQLite locale, appliquez les migrations existantes et générer le client Prisma :

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations de base de données
npx prisma migrate dev --name init
```

Ensuite, remplissez la base de données avec la liste d'ingrédients de base (seeding) :

```bash
npx prisma db seed
```

> [!NOTE]
> Le script de seeding peuple la base de données avec plus de 400 ingrédients prédéfinis classés par catégories (Fruits & Légumes, Boucherie, Épicerie, Surgelés...) pour faciliter l'ajout de recettes lors de la première utilisation.

### 6. Lancer le serveur de développement

Démarrez le serveur Next.js en mode développement :

```bash
npm run dev
```

L'application est maintenant accessible à l'adresse : **[http://localhost:3000](http://localhost:3000)**.

---

## 📱 Utilisation en tant que PWA (iOS / Android)

Pour tester ou utiliser l'application comme une application native sur votre smartphone :

1.  Assurez-vous que votre smartphone et votre ordinateur sont sur le même réseau Wi-Fi.
2.  Démarrez le serveur avec `npm run dev` et repérez l'adresse IP locale de votre machine (ex: `http://192.168.1.50:3000`).
3.  Sur votre smartphone :
    *   **Sur iOS (Safari)** : Ouvrez l'adresse IP locale dans Safari, appuyez sur le bouton **Partager** (icône de flèche vers le haut), puis sélectionnez **Sur l'écran d'accueil**.
    *   **Sur Android (Chrome)** : Ouvrez l'adresse dans Chrome, cliquez sur les trois petits points et sélectionnez **Installer l'application** ou **Ajouter à l'écran d'accueil**.
4.  Lancez l'application depuis votre écran d'accueil pour profiter de l'expérience plein écran (sans les barres de navigation du navigateur).

---

## 📁 Structure du Projet

```text
ManageMenu/
├── prisma/                  # Schéma de base de données SQLite & scripts de migration/seeding
│   ├── schema.prisma        # Schéma Prisma
│   └── seed.ts              # Script de seeding des ingrédients
├── public/                  # Assets statiques (icônes PWA, manifeste public, service worker)
│   ├── manifest.json        # Configuration PWA
│   └── sw.js                # Configuration Service Worker (Mise en cache)
├── src/
│   ├── app/                 # Routes Next.js App Router (Pages & API Routes)
│   │   ├── (auth)/          # Pages de Connexion / Inscription
│   │   ├── (main)/          # Contenu principal (Planning, Repas, Courses)
│   │   ├── api/             # Routes API (CRUD repas, ingrédients, planning)
│   │   ├── layout.tsx       # Layout global de l'application
│   │   └── globals.css      # Fichier CSS global avec directives Tailwind CSS v4
│   ├── components/          # Composants React partagés (Drawers, Modales, Cartes, etc.)
│   └── lib/                 # Utilitaires (Prisma client, Helpers de formatage, middleware auth)
├── DESIGN_GUIDELINES.md     # Ligne directrice pour le respect de la charte graphique
└── AGENTS.md                # Directives de développement et d'architecture pour l'IA
```
