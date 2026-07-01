/*
  Warnings:

  - You are about to alter the column `quantite` on the `repas_ingredients` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_repas_ingredients" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "repas_id" INTEGER NOT NULL,
    "ingredient_id" INTEGER NOT NULL,
    "quantite" REAL,
    "unite" TEXT,
    CONSTRAINT "repas_ingredients_repas_id_fkey" FOREIGN KEY ("repas_id") REFERENCES "repas" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "repas_ingredients_ingredient_id_fkey" FOREIGN KEY ("ingredient_id") REFERENCES "ingredients" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_repas_ingredients" ("id", "ingredient_id", "quantite", "repas_id") SELECT "id", "ingredient_id", "quantite", "repas_id" FROM "repas_ingredients";
DROP TABLE "repas_ingredients";
ALTER TABLE "new_repas_ingredients" RENAME TO "repas_ingredients";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
