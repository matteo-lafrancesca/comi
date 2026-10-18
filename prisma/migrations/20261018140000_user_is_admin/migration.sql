-- Rôle administrateur (interface Base de données dans les réglages).
ALTER TABLE "users" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;
