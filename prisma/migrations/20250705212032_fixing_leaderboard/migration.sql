-- 1) Drop any existing artifact named leaderboard_view
DROP MATERIALIZED VIEW IF EXISTS leaderboard_view CASCADE;
DROP VIEW IF EXISTS leaderboard_view CASCADE;
DROP TABLE IF EXISTS leaderboard_view CASCADE;

-- 2) Create the MATERIALIZED VIEW with all columns Prisma expects
CREATE MATERIALIZED VIEW leaderboard_view AS
SELECT
  u.id                                AS user_id,
  u.name                              AS user_name,
  u."avatarUrl"                       AS avatar_url,
  u."muskBucks"                       AS balance,
  COALESCE(us."totalBets", 0)         AS total_bets,
  CASE
    WHEN us."totalBets" > 0 THEN us."betsWon"::float / us."totalBets"
    ELSE 0
  END                                  AS win_rate,
  COALESCE(us.profit, 0)             AS profit_all,
  COALESCE(bp.profit_period, 0)      AS profit_period,
  COALESCE(us.roi, 0)                AS roi,
  COALESCE(us."maxStreak", 0)        AS longest_streak,
  COALESCE(us."parlaysStarted", 0)   AS parlays_started,
  COALESCE(us."parlaysWon", 0)       AS parlays_won,
  0                                    AS rank_change
FROM "User" u
LEFT JOIN "UserStats" us
  ON us."userId" = u.id
LEFT JOIN (
  SELECT
    b."userId",
    SUM(COALESCE(b.payout,0) - b.amount) AS profit_period
  FROM "Bet" b
  WHERE b."createdAt" >= now() - INTERVAL '1 day'
    AND b.status IN ('WON','LOST')
  GROUP BY b."userId"
) bp ON bp."userId" = u.id
WITH DATA;

-- 3) Give it a unique index so Prisma sees its “primary key”
CREATE UNIQUE INDEX ON leaderboard_view (user_id);
