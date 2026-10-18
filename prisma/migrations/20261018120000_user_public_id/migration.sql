-- Identifiant public des utilisateurs (URL, API) : les comptes existants reçoivent 10 caractères hexadécimaux aléatoires.
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "public_id" TEXT NOT NULL,
    "pseudo" TEXT,
    "pseudo_key" TEXT,
    "photo_url" TEXT,
    "password_hash" TEXT NOT NULL,
    "week_start_day" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_users" ("created_at", "email", "id", "public_id", "password_hash", "photo_url", "pseudo", "pseudo_key", "week_start_day") SELECT "created_at", "email", "id", lower(hex(randomblob(5))), "password_hash", "photo_url", "pseudo", "pseudo_key", "week_start_day" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_public_id_key" ON "users"("public_id");
CREATE UNIQUE INDEX "users_pseudo_key_key" ON "users"("pseudo_key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
