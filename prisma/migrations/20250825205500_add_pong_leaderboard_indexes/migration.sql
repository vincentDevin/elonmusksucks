-- Rollback: DROP INDEX "PongStats_totalWagered_idx", DROP INDEX "PongStats_perfectGames_idx"
-- AddPongLeaderboardIndexes
-- This migration adds the missing indexes to optimize all Pong leaderboard queries

-- Add index for wager leaderboard (totalWagered DESC)
CREATE INDEX CONCURRENTLY "PongStats_totalWagered_idx" ON "PongStats"("totalWagered" DESC);

-- Add index for perfect games leaderboard (perfectGames DESC)
CREATE INDEX CONCURRENTLY "PongStats_perfectGames_idx" ON "PongStats"("perfectGames" DESC);