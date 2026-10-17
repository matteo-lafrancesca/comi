-- DropIndex
DROP INDEX "users_pseudo_key";

-- AlterTable
ALTER TABLE "users" ADD COLUMN "pseudo_key" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_pseudo_key_key" ON "users"("pseudo_key");

