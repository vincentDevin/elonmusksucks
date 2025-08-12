-- Achievement system migration
-- Creates Achievement and UserAchievement tables and seeds initial achievements

-- Create Achievement table
CREATE TABLE "Achievement" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "iconUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- Create UserAchievement table
CREATE TABLE "UserAchievement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes and constraints
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- Create indexes for performance
CREATE INDEX "Achievement_category_sortOrder_idx" ON "Achievement"("category", "sortOrder");
CREATE INDEX "Achievement_isActive_category_idx" ON "Achievement"("isActive", "category");
CREATE INDEX "UserAchievement_userId_progress_idx" ON "UserAchievement"("userId", "progress");
CREATE INDEX "UserAchievement_achievementId_completedAt_idx" ON "UserAchievement"("achievementId", "completedAt");

-- Add foreign key constraints
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed initial achievements
INSERT INTO "Achievement" ("name", "title", "description", "category", "targetValue", "sortOrder") VALUES
-- Getting Started achievements
('first_bet', 'First Bet', 'Place your first bet', 'getting_started', 1, 1),
('first_win', 'First Win', 'Win your first bet', 'getting_started', 1, 2),
('early_adopter', 'Early Adopter', 'Join the platform', 'getting_started', 1, 3),

-- Performance achievements
('streak_starter', 'Streak Starter', 'Win 3 bets in a row', 'performance', 3, 1),
('streak_master', 'Streak Master', 'Win 10 bets in a row', 'performance', 10, 2),
('streak_legend', 'Streak Legend', 'Win 25 bets in a row', 'performance', 25, 3),
('accuracy_expert', 'Accuracy Expert', 'Achieve 75% win rate with at least 20 bets', 'performance', 75, 4),
('accuracy_master', 'Accuracy Master', 'Achieve 85% win rate with at least 50 bets', 'performance', 85, 5),

-- Volume achievements
('small_spender', 'Small Spender', 'Wager 1,000🪙 total', 'volume', 1000, 1),
('big_spender', 'Big Spender', 'Wager 10,000🪙 total', 'volume', 10000, 2),
('high_roller', 'High Roller', 'Wager 50,000🪙 total', 'volume', 50000, 3),
('whale', 'Whale', 'Place a single bet of 5,000🪙 or more', 'volume', 5000, 4),
('consistent_trader', 'Consistent Trader', 'Place 100 bets', 'volume', 100, 5),
('betting_machine', 'Betting Machine', 'Place 500 bets', 'volume', 500, 6),

-- Category expertise achievements
('sports_expert', 'Sports Expert', 'Win 20 sports predictions', 'accuracy', 20, 1),
('politics_expert', 'Politics Expert', 'Win 20 politics predictions', 'accuracy', 20, 2),
('tech_expert', 'Tech Expert', 'Win 20 technology predictions', 'accuracy', 20, 3),
('entertainment_expert', 'Entertainment Expert', 'Win 20 entertainment predictions', 'accuracy', 20, 4),

-- Social achievements
('social_butterfly', 'Social Butterfly', 'Follow 10 other users', 'social', 10, 1),
('popular_predictor', 'Popular Predictor', 'Have 25 followers', 'social', 25, 2),
('community_leader', 'Community Leader', 'Create 50 predictions', 'social', 50, 3),

-- Special achievements
('parlay_starter', 'Parlay Starter', 'Complete your first parlay', 'getting_started', 1, 4),
('parlay_master', 'Parlay Master', 'Win 10 parlays', 'performance', 10, 6),
('lucky_seven', 'Lucky Seven', 'Win a 7-leg parlay', 'performance', 7, 7),
('profit_maker', 'Profit Maker', 'Achieve 10,000🪙 profit', 'volume', 10000, 7),
('leaderboard_climber', 'Leaderboard Climber', 'Reach top 100 on leaderboard', 'performance', 100, 8);