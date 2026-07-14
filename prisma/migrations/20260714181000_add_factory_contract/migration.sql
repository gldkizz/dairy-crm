-- AlterTable
ALTER TABLE "factories" ADD COLUMN IF NOT EXISTS "hasContract" BOOLEAN NOT NULL DEFAULT false;
