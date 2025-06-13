/*
  Warnings:

  - The `outcome` column on the `Prediction` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `option` on the `Bet` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Outcome" AS ENUM ('YES', 'NO', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BetOption" AS ENUM ('YES', 'NO', 'OVER', 'UNDER');

-- AlterTable
ALTER TABLE "Bet" ADD COLUMN     "payout" INTEGER,
DROP COLUMN "option",
ADD COLUMN     "option" "BetOption" NOT NULL;

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "resolvedAt" TIMESTAMP(3),
DROP COLUMN "outcome",
ADD COLUMN     "outcome" "Outcome";

-- CreateIndex
CREATE INDEX "Prediction_expiresAt_resolved_idx" ON "Prediction"("expiresAt", "resolved");
