-- Migration: Migrate Badge Data to Achievement System
-- This script safely migrates existing Badge and UserBadge data to the Achievement system
-- Run with: psql $DATABASE_URL -f scripts/migrate-badges-to-achievements.sql

BEGIN;

-- Step 1: Create backup tables for safety
CREATE TABLE IF NOT EXISTS "_BadgeBackup" AS 
SELECT * FROM "Badge";

CREATE TABLE IF NOT EXISTS "_UserBadgeBackup" AS 
SELECT * FROM "UserBadge";

-- Step 2: Migrate badges to achievements (only if not already exists)
-- This converts existing Badge records to Achievement records
INSERT INTO "Achievement" (
  "slug",
  name, 
  title, 
  description, 
  category, 
  rarity,
  "targetValue",
  "autoAward",
  "manualOnly",
  "isShame",
  "isActive",
  "sortOrder",
  "createdAt",
  "updatedAt"
)
SELECT 
  LOWER(REGEXP_REPLACE(b.name, '[^a-zA-Z0-9]+', '-', 'g')) as slug,
  b.name,
  b.name as title,
  COALESCE(b.description, 'Legacy badge migrated from old system') as description,
  'legacy' as category,
  'common' as rarity,
  1 as "targetValue",
  false as "autoAward", -- Legacy badges were manually awarded
  true as "manualOnly",
  false as "isShame",
  true as "isActive",
  1000 as "sortOrder", -- Put legacy achievements at the end
  b."createdAt",
  NOW() as "updatedAt"
FROM "Badge" b
WHERE NOT EXISTS (
  SELECT 1 FROM "Achievement" a 
  WHERE a.slug = LOWER(REGEXP_REPLACE(b.name, '[^a-zA-Z0-9]+', '-', 'g'))
);

-- Step 3: Migrate user badges to user achievements
-- This preserves the award date and links users to their achievements
INSERT INTO "UserAchievement" (
  "userId",
  "achievementId", 
  progress,
  "completedAt",
  "createdAt",
  "updatedAt"
)
SELECT DISTINCT
  ub."userId",
  a.id as "achievementId",
  1 as progress, -- Legacy badges are binary (0 or 1)
  ub."awardedAt" as "completedAt",
  ub."awardedAt" as "createdAt",
  NOW() as "updatedAt"
FROM "UserBadge" ub
JOIN "Badge" b ON b.id = ub."badgeId"
JOIN "Achievement" a ON a.slug = LOWER(REGEXP_REPLACE(b.name, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE NOT EXISTS (
  SELECT 1 FROM "UserAchievement" ua 
  WHERE ua."userId" = ub."userId" 
  AND ua."achievementId" = a.id
);

-- Step 4: Create summary report for verification
CREATE TEMP TABLE migration_summary AS
SELECT 
  'Badges backed up' as operation,
  COUNT(*) as count
FROM "_BadgeBackup"
UNION ALL
SELECT 
  'UserBadges backed up' as operation,
  COUNT(*) as count
FROM "_UserBadgeBackup"
UNION ALL
SELECT 
  'New achievements created' as operation,
  COUNT(*) as count
FROM "Achievement" 
WHERE category = 'legacy'
UNION ALL
SELECT 
  'User achievements migrated' as operation,
  COUNT(*) as count
FROM "UserAchievement" ua
JOIN "Achievement" a ON a.id = ua."achievementId"
WHERE a.category = 'legacy';

-- Display migration summary
\echo 'Migration Summary:'
SELECT * FROM migration_summary ORDER BY operation;

-- Step 5: Verification queries
\echo ''
\echo 'Verification - Sample migrated achievements:'
SELECT slug, name, title, category, "createdAt"
FROM "Achievement" 
WHERE category = 'legacy' 
LIMIT 5;

\echo ''
\echo 'Verification - User achievement counts:'
SELECT 
  u.name as username,
  COUNT(ua.id) as achievement_count,
  STRING_AGG(a.name, ', ') as achievement_names
FROM "User" u
LEFT JOIN "UserAchievement" ua ON u.id = ua."userId"
LEFT JOIN "Achievement" a ON a.id = ua."achievementId" AND a.category = 'legacy'
WHERE ua.id IS NOT NULL
GROUP BY u.id, u.name
ORDER BY achievement_count DESC
LIMIT 10;

COMMIT;

-- Instructions for cleanup (run manually after verification)
\echo ''
\echo '*** MIGRATION COMPLETE ***'
\echo 'Next steps after verification:'
\echo '1. Verify data integrity by checking user profiles'
\echo '2. Test achievement display in the UI'  
\echo '3. When confident, run cleanup script:'
\echo '   DROP TABLE "_BadgeBackup", "_UserBadgeBackup";'
\echo '4. Consider dropping Badge/UserBadge tables after full verification'