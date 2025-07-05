/*
  Warnings:

  - You are about to drop the column `outcome` on the `Prediction` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "outcome",
ADD COLUMN     "winningOptionId" INTEGER;

-- DropEnum
DROP TYPE "Outcome";