-- Backfill existing PongMatch records with canonical fields
UPDATE "PongMatch" SET 
  "hostUserId" = "playerOneId",
  "joinerUserId" = CASE 
    WHEN "playerTwoId" > 0 THEN "playerTwoId" 
    ELSE NULL 
  END,
  "aiUserId" = CASE 
    WHEN "playerTwoId" IS NULL OR "playerTwoId" < 0 OR "aiDifficulty" IS NOT NULL 
    THEN -1 
    ELSE NULL 
  END,
  "mode" = CASE 
    WHEN "aiDifficulty" IS NOT NULL OR "playerTwoId" IS NULL OR "playerTwoId" < 0
    THEN 'PVE_AI' 
    ELSE 'PVP' 
  END,
  "rated" = ("wagerAmount" > 0)
WHERE "hostUserId" IS NULL;

-- Verify the backfill
SELECT 
  COUNT(*) as total_matches,
  COUNT("hostUserId") as has_host,
  COUNT(CASE WHEN "mode" = 'PVP' THEN 1 END) as pvp_matches,
  COUNT(CASE WHEN "mode" = 'PVE_AI' THEN 1 END) as ai_matches,
  COUNT(CASE WHEN "rated" = true THEN 1 END) as rated_matches
FROM "PongMatch";