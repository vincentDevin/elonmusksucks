-- CreateEnum
CREATE TYPE "PredictionType" AS ENUM ('MULTIPLE', 'BINARY', 'OVER_UNDER');

-- AlterTable
ALTER TABLE "Prediction" ADD COLUMN     "threshold" DOUBLE PRECISION,
ADD COLUMN     "type" "PredictionType" NOT NULL DEFAULT 'MULTIPLE';
