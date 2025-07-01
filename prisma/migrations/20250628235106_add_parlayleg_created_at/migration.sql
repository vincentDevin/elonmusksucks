-- DropForeignKey
ALTER TABLE "Bet" DROP CONSTRAINT "Bet_optionId_fkey";

-- AlterTable
ALTER TABLE "Bet" ALTER COLUMN "oddsAtPlacement" DROP NOT NULL,
ALTER COLUMN "optionId" DROP NOT NULL,
ALTER COLUMN "potentialPayout" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ParlayLeg" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "PredictionOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
