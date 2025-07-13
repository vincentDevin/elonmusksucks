-- 1) Add all of the new UserStats columns
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "totalParlays"     Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlaysWon"       Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlaysLost"      Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "totalParlayLegs"  Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlayLegsWon"    Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "parlayLegsLost"   Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "currentStreak"    Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "longestStreak"    Int     DEFAULT 0;
ALTER TABLE "UserStats" ADD COLUMN IF NOT EXISTS "biggestWin"       Int     DEFAULT 0;
-- (other columns like mostCommonBet, profit, roi etc. should already exist)

-- 2) Re-create the leaderboard view with all the expected fields
DROP MATERIALIZED VIEW IF EXISTS leaderboard_view CASCADE;
DROP VIEW IF EXISTS leaderboard_view CASCADE;

CREATE MATERIALIZED VIEW leaderboard_view AS
SELECT
  u.id                              AS user_id,
  u.name                            AS user_name,
  u."avatarUrl"                     AS avatar_url,
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

-- 3) (Re-)create unique index so Prisma sees the PK
CREATE UNIQUE INDEX ON leaderboard_view (user_id);
