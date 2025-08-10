-- Populate the leaderboard_view table with user statistics
INSERT INTO leaderboard_view (
  user_id,
  user_name,
  avatar_url,
  balance,
  total_bets,
  win_rate,
  profit_all,
  profit_period,
  roi,
  longest_streak,
  current_streak,
  parlays_started,
  parlays_won,
  total_parlay_legs,
  parlay_legs_won,
  rank_change
)
SELECT
  u.id AS user_id,
  u.name AS user_name,
  u."avatarUrl" AS avatar_url,
  u."muskBucks" AS balance,
  COALESCE(COUNT(DISTINCT b.id), 0) AS total_bets,
  CASE 
    WHEN COUNT(b.id) > 0 
    THEN CAST(COUNT(CASE WHEN b.won = true THEN 1 END) AS FLOAT) / COUNT(b.id)
    ELSE 0 
  END AS win_rate,
  COALESCE(SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END), 0) AS profit_all,
  COALESCE(SUM(
    CASE 
      WHEN b."createdAt" >= CURRENT_DATE - INTERVAL '30 days' 
      THEN CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END
      ELSE 0
    END
  ), 0) AS profit_period,
  CASE 
    WHEN SUM(b.amount) > 0 
    THEN CAST(SUM(CASE WHEN b.won = true THEN b.payout - b.amount ELSE -b.amount END) AS FLOAT) / SUM(b.amount)
    ELSE 0 
  END AS roi,
  COALESCE(u."longestStreak", 0) AS longest_streak,
  COALESCE(u."currentStreak", 0) AS current_streak,
  COALESCE(COUNT(DISTINCT p.id), 0) AS parlays_started,
  COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'WON' THEN p.id END), 0) AS parlays_won,
  COALESCE(COUNT(DISTINCT pl.id), 0) AS total_parlay_legs,
  COALESCE(COUNT(DISTINCT CASE WHEN p.status = 'WON' THEN pl.id END), 0) AS parlay_legs_won,
  0 AS rank_change
FROM "User" u
LEFT JOIN "Bet" b ON u.id = b."userId"
LEFT JOIN "Parlay" p ON u.id = p."userId"
LEFT JOIN "ParlayLeg" pl ON p.id = pl."parlayId"
WHERE u.role IN ('USER', 'ADMIN')
GROUP BY u.id, u.name, u."avatarUrl", u."muskBucks", u."longestStreak", u."currentStreak"
ON CONFLICT (user_id) DO UPDATE SET
  user_name = EXCLUDED.user_name,
  avatar_url = EXCLUDED.avatar_url,
  balance = EXCLUDED.balance,
  total_bets = EXCLUDED.total_bets,
  win_rate = EXCLUDED.win_rate,
  profit_all = EXCLUDED.profit_all,
  profit_period = EXCLUDED.profit_period,
  roi = EXCLUDED.roi,
  longest_streak = EXCLUDED.longest_streak,
  current_streak = EXCLUDED.current_streak,
  parlays_started = EXCLUDED.parlays_started,
  parlays_won = EXCLUDED.parlays_won,
  total_parlay_legs = EXCLUDED.total_parlay_legs,
  parlay_legs_won = EXCLUDED.parlay_legs_won,
  rank_change = EXCLUDED.rank_change;