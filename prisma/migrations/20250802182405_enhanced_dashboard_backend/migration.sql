-- DropIndex
DROP INDEX "idx_bets_user_id_created";

-- DropIndex
DROP INDEX "idx_transactions_user_id_created";

-- DropIndex
DROP INDEX "idx_users_active";

-- DropIndex
DROP INDEX "idx_users_active_created";

-- DropIndex
DROP INDEX "idx_users_created_at";

-- DropIndex
DROP INDEX "idx_users_email";

-- DropIndex
DROP INDEX "idx_users_musk_bucks";

-- DropIndex
DROP INDEX "idx_users_musk_bucks_desc";

-- DropIndex
DROP INDEX "idx_users_name";

-- DropIndex
DROP INDEX "idx_users_role";

-- DropIndex
DROP INDEX "idx_users_role_active";

-- DropIndex
DROP INDEX "idx_users_role_created";

-- DropIndex
DROP INDEX "idx_user_stats_user_id";

-- AlterTable
ALTER TABLE "UserActivity" ADD COLUMN     "bet_id" INTEGER,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "is_personal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "prediction_id" INTEGER,
ADD COLUMN     "priority" TEXT NOT NULL DEFAULT 'medium',
ADD COLUMN     "related_user_id" INTEGER,
ADD COLUMN     "title" TEXT;

-- CreateTable (Drop materialized view if exists first)
DROP MATERIALIZED VIEW IF EXISTS "leaderboard_view";
CREATE TABLE "leaderboard_view" (
    "user_id" INTEGER NOT NULL,
    "user_name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "balance" INTEGER NOT NULL,
    "total_bets" INTEGER NOT NULL,
    "win_rate" DOUBLE PRECISION NOT NULL,
    "profit_all" INTEGER NOT NULL,
    "profit_period" INTEGER NOT NULL,
    "roi" DOUBLE PRECISION NOT NULL,
    "longest_streak" INTEGER NOT NULL,
    "current_streak" INTEGER NOT NULL,
    "parlays_started" INTEGER NOT NULL,
    "parlays_won" INTEGER NOT NULL,
    "total_parlay_legs" INTEGER NOT NULL,
    "parlay_legs_won" INTEGER NOT NULL,
    "rank_change" INTEGER,

    CONSTRAINT "leaderboard_view_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
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

-- CreateTable
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

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_name_key" ON "Achievement"("name");

-- CreateIndex
CREATE INDEX "Achievement_category_sortOrder_idx" ON "Achievement"("category", "sortOrder");

-- CreateIndex
CREATE INDEX "Achievement_isActive_category_idx" ON "Achievement"("isActive", "category");

-- CreateIndex
CREATE INDEX "UserAchievement_userId_progress_idx" ON "UserAchievement"("userId", "progress");

-- CreateIndex
CREATE INDEX "UserAchievement_achievementId_completedAt_idx" ON "UserAchievement"("achievementId", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_achievementId_key" ON "UserAchievement"("userId", "achievementId");

-- CreateIndex
CREATE INDEX "idx_user_activities_user_time" ON "UserActivity"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activities_type_priority" ON "UserActivity"("type", "priority", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activities_public" ON "UserActivity"("is_personal", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activities_related_user" ON "UserActivity"("related_user_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activities_prediction" ON "UserActivity"("prediction_id", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_user_activities_bet" ON "UserActivity"("bet_id", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "Achievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_related_user_id_fkey" FOREIGN KEY ("related_user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_prediction_id_fkey" FOREIGN KEY ("prediction_id") REFERENCES "Prediction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_bet_id_fkey" FOREIGN KEY ("bet_id") REFERENCES "Bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
