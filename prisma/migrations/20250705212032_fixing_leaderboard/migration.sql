/*
  Warnings:
  - You are about to drop the column `maxStreak` on the `UserStats` table. All the data in the column will be lost.
  - You are about to drop the column `parlaysStarted` on the `UserStats` table. All the data in the column will be lost.
  - You are about to drop the column `streak` on the `UserStats` table. All the data in the column will be lost.
  - Made the column `totalParlays` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlaysLost` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `totalParlayLegs` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlayLegsWon` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `parlayLegsLost` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `currentStreak` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
  - Made the column `longestStreak` on table `UserStats` required. This step will fail if there are existing NULL values in that column.
*/

-- 1) Add all new UserStats columns if they don't exist (backward-safe)
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "totalParlays"     INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlaysWon"       INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlaysLost"      INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "totalParlayLegs"  INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlayLegsWon"    INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlayLegsLost"   INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "currentStreak"    INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "longestStreak"    INTEGER DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "biggestWin"       INTEGER DEFAULT 0;

-- 2) Remove legacy columns if they exist
ALTER TABLE "UserStats" DROP COLUMN IF EXISTS "maxStreak";
ALTER TABLE "UserStats" DROP COLUMN IF EXISTS "parlaysStarted";
ALTER TABLE "UserStats" DROP COLUMN IF EXISTS "streak";

-- 3) Make columns NOT NULL (after setting defaults)
ALTER TABLE "UserStats"
  ALTER COLUMN "totalParlays" SET NOT NULL,
  ALTER COLUMN "parlaysLost" SET NOT NULL,
  ALTER COLUMN "totalParlayLegs" SET NOT NULL,
  ALTER COLUMN "parlayLegsWon" SET NOT NULL,
  ALTER COLUMN "parlayLegsLost" SET NOT NULL,
  ALTER COLUMN "currentStreak" SET NOT NULL,
  ALTER COLUMN "longestStreak" SET NOT NULL;

-- 4) Add profilePictureKey to User if not exists
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "profilePictureKey" TEXT;

-- 5) Drop and recreate the leaderboard view with avatar_key included
DROP MATERIALIZED VIEW IF EXISTS leaderboard_view CASCADE;
DROP VIEW IF EXISTS leaderboard_view CASCADE;

CREATE MATERIALIZED VIEW leaderboard_view AS
SELECT
  u.id                              AS user_id,
  u.name                            AS user_name,
  u."avatarUrl"                     AS avatar_url,
  u."profilePictureKey"             AS avatar_key,
  u."muskBucks"                     AS balance,

  -- unified metrics
  COALESCE(us."totalBets" + us."totalParlays", 0)  AS total_bets,
  CASE
    WHEN (us."totalBets" + us."totalParlays") > 0 THEN
      (us."betsWon" + us."parlaysWon")::float 
      / (us."totalBets" + us."totalParlays")
    ELSE 0
  END                                               AS win_rate,

  COALESCE(us.profit, 0)                            AS profit_all,
  COALESCE(bp.profit_period, 0)                     AS profit_period,
  COALESCE(us.roi, 0)                               AS roi,

  -- streaks
  COALESCE(us."longestStreak", 0)                   AS longest_streak,
  COALESCE(us."currentStreak", 0)                   AS current_streak,

  -- parlays
  COALESCE(us."totalParlays", 0)                    AS parlays_started,
  COALESCE(us."parlaysWon", 0)                      AS parlays_won,

  -- parlay-leg stats
  COALESCE(us."totalParlayLegs", 0)                 AS total_parlay_legs,
  COALESCE(us."parlayLegsWon", 0)                   AS parlay_legs_won,

  0                                                 AS rank_change
FROM "User" u
LEFT JOIN "UserStats" us
  ON us."userId" = u.id
LEFT JOIN (
  SELECT
    b."userId",
    SUM(COALESCE(b.payout, 0) - b.amount) AS profit_period
  FROM "Bet" b
  WHERE b."createdAt" >= now() - INTERVAL '1 day'
    AND b.status IN ('WON','LOST')
  GROUP BY b."userId"
) bp ON bp."userId" = u.id
WITH DATA;

-- 6) (Re-)create unique index so Prisma sees the PK
CREATE UNIQUE INDEX ON leaderboard_view (user_id);
