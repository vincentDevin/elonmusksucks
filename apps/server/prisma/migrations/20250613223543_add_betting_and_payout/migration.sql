/*
  Warnings:

  - You are about to drop the column `option` on the `Bet` table. All the data in the column will be lost.
  - Added the required column `oddsAtPlacement` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optionId` to the `Bet` table without a default value. This is not possible if the table is not empty.
  - Added the required column `potentialPayout` to the `Bet` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING', 'WON', 'LOST', 'REFUNDED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEBIT', 'CREDIT');

-- AlterTable
ALTER TABLE "Bet" DROP COLUMN "option",
ADD COLUMN     "oddsAtPlacement" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "optionId" INTEGER NOT NULL,
ADD COLUMN     "potentialPayout" INTEGER NOT NULL,
ADD COLUMN     "status" "BetStatus" NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "PredictionOption" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "odds" DOUBLE PRECISION NOT NULL,
    "predictionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PredictionOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parlay" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "amount" INTEGER NOT NULL,
    "combinedOdds" DOUBLE PRECISION NOT NULL,
    "potentialPayout" INTEGER NOT NULL,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Parlay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParlayLeg" (
    "id" SERIAL NOT NULL,
    "parlayId" INTEGER NOT NULL,
    "optionId" INTEGER NOT NULL,
    "oddsAtPlacement" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ParlayLeg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "relatedBetId" INTEGER,
    "relatedParlayId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PredictionOption" ADD CONSTRAINT "PredictionOption_predictionId_fkey" FOREIGN KEY ("predictionId") REFERENCES "Prediction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PredictionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parlay" ADD CONSTRAINT "Parlay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParlayLeg" ADD CONSTRAINT "ParlayLeg_parlayId_fkey" FOREIGN KEY ("parlayId") REFERENCES "Parlay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParlayLeg" ADD CONSTRAINT "ParlayLeg_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PredictionOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
