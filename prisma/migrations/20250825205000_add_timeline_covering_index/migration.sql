-- Rollback: DROP INDEX "idx_articles_timeline_covering"
-- AddTimelineCoveringIndex
-- This migration adds a covering index to accelerate timeline loads

-- Add covering index for timeline queries (status + feedId for JOIN + publishedAt ordering)
CREATE INDEX CONCURRENTLY "idx_articles_timeline_covering" ON "Article"("status", "feedId", "publishedAt" DESC);