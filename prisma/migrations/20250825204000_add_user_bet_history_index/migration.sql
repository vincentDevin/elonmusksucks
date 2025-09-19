-- Rollback: DROP INDEX "Bet_userId_status_createdAt_idx"
-- AddUserBetHistoryIndex
-- This migration adds a composite index to optimize user bet history queries

-- Add composite index for user bet history queries (userId + status filter + createdAt ordering)
CREATE INDEX CONCURRENTLY "Bet_userId_status_createdAt_idx" ON "Bet"("userId", "status", "createdAt" DESC);