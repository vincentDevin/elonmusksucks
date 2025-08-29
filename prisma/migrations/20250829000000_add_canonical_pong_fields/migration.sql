-- Add canonical fields to PongMatch for proper participant tracking
ALTER TABLE "PongMatch" 
ADD COLUMN IF NOT EXISTS "mode" VARCHAR DEFAULT 'PVP',
ADD COLUMN IF NOT EXISTS "rated" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "hostUserId" INTEGER,
ADD COLUMN IF NOT EXISTS "joinerUserId" INTEGER,
ADD COLUMN IF NOT EXISTS "aiUserId" INTEGER,
ADD COLUMN IF NOT EXISTS "hostDisplayName" VARCHAR,
ADD COLUMN IF NOT EXISTS "joinerDisplayName" VARCHAR,
ADD COLUMN IF NOT EXISTS "aiDisplayName" VARCHAR DEFAULT 'Elon AI';

-- Backfill existing data with canonical fields
UPDATE "PongMatch" SET 
  "hostUserId" = "playerOneId",
  "joinerUserId" = CASE WHEN "playerTwoId" > 0 THEN "playerTwoId" ELSE NULL END,
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

-- Add NOT NULL constraint after backfill
ALTER TABLE "PongMatch" 
ALTER COLUMN "hostUserId" SET NOT NULL;

-- Add check constraints for data integrity
ALTER TABLE "PongMatch" 
ADD CONSTRAINT "host_not_joiner" CHECK ("hostUserId" != "joinerUserId"),
ADD CONSTRAINT "valid_mode" CHECK (
  ("mode" = 'PVP' AND "joinerUserId" IS NOT NULL AND "aiUserId" IS NULL) OR
  ("mode" = 'PVE_AI' AND "joinerUserId" IS NULL AND "aiUserId" IS NOT NULL)
);

-- Add indexes for the new fields
CREATE INDEX IF NOT EXISTS "idx_pong_match_host" ON "PongMatch" ("hostUserId");
CREATE INDEX IF NOT EXISTS "idx_pong_match_joiner" ON "PongMatch" ("joinerUserId");
CREATE INDEX IF NOT EXISTS "idx_pong_match_mode_rated" ON "PongMatch" ("mode", "rated");