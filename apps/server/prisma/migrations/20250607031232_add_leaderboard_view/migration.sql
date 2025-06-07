-- Up migration: create the leaderboard view
CREATE VIEW leaderboard_view AS
  SELECT
    id,
    name,
    "muskBucks"
  FROM "User"
  ORDER BY "muskBucks" DESC;

-- Down migration: drop the view if you roll back
DROP VIEW IF EXISTS leaderboard_view;