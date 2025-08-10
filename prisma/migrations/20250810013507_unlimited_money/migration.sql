/*
  Warnings:

  - Made the column `winRate` on table `UserStats` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "idx_bets_amount";

-- DropIndex
DROP INDEX "idx_users_active";

-- DropIndex
DROP INDEX "idx_users_created";

-- DropIndex
DROP INDEX "idx_user_achievement_progress";

-- AlterTable
ALTER TABLE "Bet" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "payout" SET DATA TYPE BIGINT,
ALTER COLUMN "potentialPayout" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Parlay" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "potentialPayout" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "Transaction" ALTER COLUMN "amount" SET DATA TYPE BIGINT,
ALTER COLUMN "balanceAfter" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "muskBucks" SET DATA TYPE BIGINT;

-- AlterTable
ALTER TABLE "UserStats" ALTER COLUMN "totalWagered" SET DATA TYPE BIGINT,
ALTER COLUMN "totalWon" SET DATA TYPE BIGINT,
ALTER COLUMN "profit" SET DATA TYPE BIGINT,
ALTER COLUMN "biggestWin" SET DATA TYPE BIGINT,
ALTER COLUMN "winRate" SET NOT NULL;

-- AlterTable
ALTER TABLE "leaderboard_view" ALTER COLUMN "balance" SET DATA TYPE BIGINT,
ALTER COLUMN "profit_all" SET DATA TYPE BIGINT,
ALTER COLUMN "profit_period" SET DATA TYPE BIGINT;

-- CreateIndex
CREATE INDEX "Prediction_category_approved_idx" ON "Prediction"("category", "approved");

-- CreateIndex
CREATE INDEX "Transaction_relatedBetId_idx" ON "Transaction"("relatedBetId");

-- CreateIndex
CREATE INDEX "Transaction_relatedParlayId_idx" ON "Transaction"("relatedParlayId");

-- RenameIndex
ALTER INDEX "idx_bets_prediction" RENAME TO "Bet_predictionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_bets_status" RENAME TO "Bet_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_bets_user_created" RENAME TO "Bet_userId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_bets_user_prediction" RENAME TO "Bet_userId_predictionId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_bets_user_status" RENAME TO "Bet_userId_status_idx";

-- RenameIndex
ALTER INDEX "idx_parlays_status" RENAME TO "Parlay_status_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_parlays_user" RENAME TO "Parlay_userId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_predictions_approved_resolved" RENAME TO "Prediction_approved_resolved_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_predictions_category" RENAME TO "Prediction_category_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_predictions_creator" RENAME TO "Prediction_creatorId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_transactions_type" RENAME TO "Transaction_type_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_transactions_user_created" RENAME TO "Transaction_userId_createdAt_idx";

-- RenameIndex
ALTER INDEX "idx_user_stats_total_wagered" RENAME TO "UserStats_totalWagered_idx";

-- RenameIndex
ALTER INDEX "idx_user_stats_total_won" RENAME TO "UserStats_totalWon_idx";

-- RenameIndex
ALTER INDEX "idx_user_stats_win_rate" RENAME TO "UserStats_winRate_idx";
