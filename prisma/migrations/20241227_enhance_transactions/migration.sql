-- Add new columns to Transaction table
ALTER TABLE "Transaction" ADD COLUMN "subtype" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "description" TEXT;
ALTER TABLE "Transaction" ADD COLUMN "metadata" JSONB;
ALTER TABLE "Transaction" ADD COLUMN "relatedPongMatchId" TEXT;

-- Create indexes for new fields
CREATE INDEX "Transaction_subtype_idx" ON "Transaction"("subtype");
CREATE INDEX "Transaction_relatedPongMatchId_idx" ON "Transaction"("relatedPongMatchId");

-- Populate subtypes for existing records
UPDATE "Transaction" SET
  "subtype" = CASE
    WHEN "relatedBetId" IS NOT NULL AND "type" = 'DEBIT' THEN 'BET_WAGER'
    WHEN "relatedBetId" IS NOT NULL AND "type" = 'CREDIT' THEN 'BET_PAYOUT'
    WHEN "relatedParlayId" IS NOT NULL AND "type" = 'DEBIT' THEN 'PARLAY_WAGER'
    WHEN "relatedParlayId" IS NOT NULL AND "type" = 'CREDIT' THEN 'PARLAY_PAYOUT'
    ELSE 'UNKNOWN'
  END;

-- Link pong transactions - escrow (wagers)
UPDATE "Transaction" SET
  "relatedPongMatchId" = pm."id",
  "subtype" = 'PONG_WAGER',
  "description" = 'Pong match wager for match ' || pm."id"
FROM "PongMatch" pm
WHERE "Transaction"."id" = pm."escrowTxId";

-- Link pong transactions - payouts
UPDATE "Transaction" SET
  "relatedPongMatchId" = pm."id",
  "subtype" = 'PONG_PAYOUT',
  "description" = 'Pong match payout for match ' || pm."id"
FROM "PongMatch" pm
WHERE "Transaction"."id" = pm."payoutTxId";

-- Add descriptions for bet transactions
UPDATE "Transaction" SET
  "description" = 'Bet wager for prediction ' || b."predictionId"
FROM "Bet" b
WHERE "Transaction"."relatedBetId" = b."id" AND "Transaction"."subtype" = 'BET_WAGER';

UPDATE "Transaction" SET
  "description" = 'Bet payout for prediction ' || b."predictionId"
FROM "Bet" b
WHERE "Transaction"."relatedBetId" = b."id" AND "Transaction"."subtype" = 'BET_PAYOUT';

-- Add descriptions for parlay transactions
UPDATE "Transaction" SET
  "description" = 'Parlay wager with ' || (
    SELECT COUNT(*) FROM "ParlayLeg" pl WHERE pl."parlayId" = p."id"
  ) || ' legs'
FROM "Parlay" p
WHERE "Transaction"."relatedParlayId" = p."id" AND "Transaction"."subtype" = 'PARLAY_WAGER';

UPDATE "Transaction" SET
  "description" = 'Parlay payout with ' || (
    SELECT COUNT(*) FROM "ParlayLeg" pl WHERE pl."parlayId" = p."id"
  ) || ' legs'
FROM "Parlay" p
WHERE "Transaction"."relatedParlayId" = p."id" AND "Transaction"."subtype" = 'PARLAY_PAYOUT';