-- Enhanced activity tracking migration
-- This migration enhances the existing UserActivity table with better structure and indexes

-- First, let's add the new columns to the existing UserActivity table
ALTER TABLE "UserActivity" ADD COLUMN "title" VARCHAR(200);
ALTER TABLE "UserActivity" ADD COLUMN "description" TEXT;
ALTER TABLE "UserActivity" ADD COLUMN "is_personal" BOOLEAN DEFAULT false;
ALTER TABLE "UserActivity" ADD COLUMN "priority" VARCHAR(20) DEFAULT 'medium';
ALTER TABLE "UserActivity" ADD COLUMN "related_user_id" INTEGER;
ALTER TABLE "UserActivity" ADD COLUMN "prediction_id" INTEGER;
ALTER TABLE "UserActivity" ADD COLUMN "bet_id" INTEGER;

-- Add foreign key constraints for the new relations
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_related_user_id_fkey" 
    FOREIGN KEY ("related_user_id") REFERENCES "User"("id") ON DELETE SET NULL;
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_prediction_id_fkey" 
    FOREIGN KEY ("prediction_id") REFERENCES "Prediction"("id") ON DELETE SET NULL;
ALTER TABLE "UserActivity" ADD CONSTRAINT "UserActivity_bet_id_fkey" 
    FOREIGN KEY ("bet_id") REFERENCES "Bet"("id") ON DELETE SET NULL;

-- Create optimized indexes for activity queries
CREATE INDEX "idx_user_activities_user_time" ON "UserActivity"("userId", "createdAt" DESC);
CREATE INDEX "idx_user_activities_type_priority" ON "UserActivity"("type", "priority", "createdAt" DESC);
CREATE INDEX "idx_user_activities_public" ON "UserActivity"("is_personal", "createdAt" DESC) WHERE "is_personal" = false;
CREATE INDEX "idx_user_activities_related_user" ON "UserActivity"("related_user_id", "createdAt" DESC) WHERE "related_user_id" IS NOT NULL;
CREATE INDEX "idx_user_activities_prediction" ON "UserActivity"("prediction_id", "createdAt" DESC) WHERE "prediction_id" IS NOT NULL;
CREATE INDEX "idx_user_activities_bet" ON "UserActivity"("bet_id", "createdAt" DESC) WHERE "bet_id" IS NOT NULL;