-- Programmation : un seul repas par utilisateur, jour et créneau.
-- Dédoublonnage préalable : on garde la ligne la plus récente de chaque créneau.
DELETE FROM "programmation"
WHERE "id" NOT IN (
    SELECT MAX("id") FROM "programmation" GROUP BY "user_id", "date", "heure"
);

CREATE UNIQUE INDEX "programmation_user_id_date_heure_key" ON "programmation"("user_id", "date", "heure");

-- ShoppingListItem : clé d'unité normalisée (l'index unique précédent ignorait les unités NULL).
ALTER TABLE "shopping_list_items" ADD COLUMN "unite_key" TEXT NOT NULL DEFAULT '';

UPDATE "shopping_list_items" SET "unite_key" = lower(trim(coalesce("unite", '')));

-- Doublons : la ligne conservée est cochée si l'une des lignes du groupe l'était.
UPDATE "shopping_list_items" SET "is_checked" = 1
WHERE "id" IN (
    SELECT MAX("id") FROM "shopping_list_items"
    GROUP BY "user_id", "week", "year", "ingredient_id", "unite_key"
    HAVING SUM("is_checked") > 0
);

DELETE FROM "shopping_list_items"
WHERE "id" NOT IN (
    SELECT MAX("id") FROM "shopping_list_items"
    GROUP BY "user_id", "week", "year", "ingredient_id", "unite_key"
);

DROP INDEX "shopping_list_items_user_id_week_year_ingredient_id_unite_key";

CREATE UNIQUE INDEX "shopping_list_items_user_id_week_year_ingredient_id_unite_key_key" ON "shopping_list_items"("user_id", "week", "year", "ingredient_id", "unite_key");
