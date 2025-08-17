-- Add performance indexes for critical queries

-- Add winRate column to UserStats if it doesn't exist
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "winRate" DOUBLE PRECISION DEFAULT 0;

-- Indexes for Bet table
CREATE INDEX IF NOT EXISTS "idx_bets_user_created" ON "Bet" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_bets_prediction" ON "Bet" ("predictionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_bets_status" ON "Bet" ("status", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_bets_user_status" ON "Bet" ("userId", "status");
CREATE INDEX IF NOT EXISTS "idx_bets_amount" ON "Bet" ("amount" DESC);

-- Indexes for Transaction table
CREATE INDEX IF NOT EXISTS "idx_transactions_user_created" ON "Transaction" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_transactions_type" ON "Transaction" ("type", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_transactions_related_bet" ON "Transaction" ("relatedBetId") WHERE "relatedBetId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_transactions_related_parlay" ON "Transaction" ("relatedParlayId") WHERE "relatedParlayId" IS NOT NULL;

-- Indexes for Prediction table
CREATE INDEX IF NOT EXISTS "idx_predictions_creator" ON "Prediction" ("creatorId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_predictions_category" ON "Prediction" ("category", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_predictions_approved_resolved" ON "Prediction" ("approved", "resolved", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_predictions_expires" ON "Prediction" ("expiresAt", "resolved") WHERE "resolved" = false;

-- Indexes for User table (for leaderboard queries)
CREATE INDEX IF NOT EXISTS "idx_users_muskbucks" ON "User" ("muskBucks" DESC) WHERE "active" = true;
CREATE INDEX IF NOT EXISTS "idx_users_created" ON "User" ("createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_users_active" ON "User" ("active", "role");

-- Indexes for UserStats table
CREATE INDEX IF NOT EXISTS "idx_user_stats_total_won" ON "UserStats" ("totalWon" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_stats_win_rate" ON "UserStats" ("winRate" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_stats_total_wagered" ON "UserStats" ("totalWagered" DESC);

-- Indexes for Parlay table
CREATE INDEX IF NOT EXISTS "idx_parlays_user" ON "Parlay" ("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_parlays_status" ON "Parlay" ("status", "createdAt" DESC);

-- Composite indexes for common join queries
CREATE INDEX IF NOT EXISTS "idx_bets_user_prediction" ON "Bet" ("userId", "predictionId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_predictions_category_approved" ON "Prediction" ("category", "approved") WHERE "approved" = true;

-- Index for achievement evaluation
CREATE INDEX IF NOT EXISTS "idx_user_achievement_progress" ON "UserAchievement" ("userId", "progress", "completedAt");