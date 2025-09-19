-- AddDashboardActivityIndex
-- This migration adds a composite index to optimize dashboard activity queries
-- Note: isPersonal field doesn't exist, using type and createdAt only

-- Add composite index for dashboard activity queries (type filter + createdAt ordering)
CREATE INDEX IF NOT EXISTS "idx_user_activities_dashboard" ON "UserActivity"("type", "createdAt" DESC);