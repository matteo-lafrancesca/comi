/*
  Warnings:

  - You are about to drop the column `quantite` on the `ingredients` table. All the data in the column will be lost.
  - You are about to drop the column `repas_id` on the `ingredients` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "repas_ingredients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repas_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantite" TEXT,
    CONSTRAINT "repas_ingredients_repas_id_fkey" FOREIGN KEY ("repas_id") REFERENCES "repas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "repas_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ingredients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nom" TEXT NOT NULL,
    "categorie" TEXT NOT NULL
);
INSERT INTO "new_ingredients" ("categorie", "id", "nom") SELECT "categorie", "id", "nom" FROM "ingredients";
DROP TABLE "ingredients";
ALTER TABLE "new_ingredients" RENAME TO "ingredients";
CREATE UNIQUE INDEX "ingredients_nom_key" ON "ingredients"("nom");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
