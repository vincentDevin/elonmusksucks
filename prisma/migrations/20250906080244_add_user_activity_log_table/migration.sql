-- Rollback: DROP TABLE "UserActivityLog"
-- AddUserActivityLogTable
-- This migration adds UserActivityLog table for time-based achievement tracking
-- Enables achievements that require "X actions in Y time period" queries

-- Create UserActivityLog table for time-series activity tracking
CREATE TABLE "UserActivityLog" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "activityType" VARCHAR(50) NOT NULL,
  "metadata" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dateKey" VARCHAR(10) NOT NULL,
  
  CONSTRAINT "UserActivityLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraint to User table
ALTER TABLE "UserActivityLog" ADD CONSTRAINT "UserActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create optimized index for time-based queries (primary use case)
CREATE INDEX "UserActivityLog_userId_dateKey_activityType_idx" ON "UserActivityLog"("userId", "dateKey", "activityType");

-- Create index for activity type queries across users
CREATE INDEX "UserActivityLog_activityType_occurredAt_idx" ON "UserActivityLog"("activityType", "occurredAt" DESC);

-- Create index for date-based aggregations
CREATE INDEX "UserActivityLog_dateKey_activityType_idx" ON "UserActivityLog"("dateKey", "activityType");

-- Create covering index for user activity patterns (includes metadata for some queries)
CREATE INDEX "UserActivityLog_userId_occurredAt_idx" ON "UserActivityLog"("userId", "occurredAt" DESC);