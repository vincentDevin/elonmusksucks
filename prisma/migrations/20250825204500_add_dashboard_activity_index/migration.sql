-- Rollback: DROP INDEX "idx_user_activities_dashboard"
-- AddDashboardActivityIndex
-- This migration adds a composite index to optimize dashboard activity queries

-- Add composite index for dashboard public activity queries (isPersonal + type filter + createdAt ordering)
CREATE INDEX CONCURRENTLY "idx_user_activities_dashboard" ON "UserActivity"("isPersonal", "type", "createdAt" DESC);