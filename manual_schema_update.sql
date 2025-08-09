-- Manual schema update to fix dashboard backend integration

-- Step 1: Add missing columns to UserActivity table if they don't exist
DO $$ 
BEGIN
    -- Check and add title column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'title') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "title" TEXT;
    END IF;
    
    -- Check and add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'description') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "description" TEXT;
    END IF;
    
    -- Check and add is_personal column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'is_personal') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "is_personal" BOOLEAN NOT NULL DEFAULT false;
    END IF;
    
    -- Check and add priority column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'priority') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'medium';
    END IF;
    
    -- Check and add related_user_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'related_user_id') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "related_user_id" INTEGER;
    END IF;
    
    -- Check and add prediction_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'prediction_id') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "prediction_id" INTEGER;
    END IF;
    
    -- Check and add bet_id column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'UserActivity' AND column_name = 'bet_id') THEN
        ALTER TABLE "UserActivity" ADD COLUMN "bet_id" INTEGER;
    END IF;
END $$;

-- Step 2: Create Achievement table if it doesn't exist
CREATE TABLE IF NOT EXISTS "Achievement" (
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

-- Step 3: Create UserAchievement table if it doesn't exist
CREATE TABLE IF NOT EXISTS "UserAchievement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "achievementId" INTEGER NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- Step 4: Add unique constraints and indexes if they don't exist
DO $$ 
BEGIN
    -- Achievement name unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Achievement_name_key') THEN
        ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_name_key" UNIQUE ("name");
    END IF;
    
    -- UserAchievement unique constraint
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_userId_achievementId_key') THEN
        ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_achievementId_key" UNIQUE ("userId", "achievementId");
    END IF;
END $$;

-- Step 5: Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS "Achievement_category_sortOrder_idx" ON "Achievement"("category", "sortOrder");
CREATE INDEX IF NOT EXISTS "Achievement_isActive_category_idx" ON "Achievement"("isActive", "category");
CREATE INDEX IF NOT EXISTS "UserAchievement_userId_progress_idx" ON "UserAchievement"("userId", "progress");
CREATE INDEX IF NOT EXISTS "UserAchievement_achievementId_completedAt_idx" ON "UserAchievement"("achievementId", "completedAt");
CREATE INDEX IF NOT EXISTS "idx_user_activities_user_time" ON "UserActivity"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activities_type_priority" ON "UserActivity"("type", "priority", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activities_public" ON "UserActivity"("is_personal", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activities_related_user" ON "UserActivity"("related_user_id", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activities_prediction" ON "UserActivity"("prediction_id", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "idx_user_activities_bet" ON "UserActivity"("bet_id", "createdAt" DESC);

-- Step 6: Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- UserAchievement -> User foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_userId_fkey') THEN
        ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" 
            FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- UserAchievement -> Achievement foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserAchievement_achievementId_fkey') THEN
        ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" 
            FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    -- UserActivity -> User foreign key (related_user_id)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserActivity_related_user_id_fkey') THEN
        ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_related_user_id_fkey" 
            FOREIGN KEY ("related_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- UserActivity -> Prediction foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserActivity_prediction_id_fkey') THEN
        ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_prediction_id_fkey" 
            FOREIGN KEY ("prediction_id") REFERENCES "Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    -- UserActivity -> Bet foreign key
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserActivity_bet_id_fkey') THEN
        ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_bet_id_fkey" 
            FOREIGN KEY ("bet_id") REFERENCES "Bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Step 7: Seed initial achievements
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
('leaderboard_climber', 'Leaderboard Climber', 'Reach top 100 on leaderboard', 'performance', 100, 8)
ON CONFLICT ("name") DO NOTHING;