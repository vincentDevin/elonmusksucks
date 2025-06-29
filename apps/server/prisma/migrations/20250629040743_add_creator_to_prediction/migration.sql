/*
  Warnings:

  - Added the required column `creatorId` to the `Prediction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN "creatorId" INTEGER;

-- Update all existing predictions to have a creator (e.g., user id 1)
UPDATE "Prediction" SET "creatorId" = 1 WHERE "creatorId" IS NULL;

ALTER TABLE "Prediction" ALTER COLUMN "creatorId" SET NOT NULL;

ALTER TABLE "Prediction" ADD CONSTRAINT "Prediction_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
