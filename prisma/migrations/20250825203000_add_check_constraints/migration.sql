-- Rollback: DROP CONSTRAINT commands for each added constraint
-- AddCheckConstraints
-- This migration adds CHECK constraints for critical field validation

-- Add CHECK constraint for User.muskBucks (prevent negative balances)
ALTER TABLE "User" ADD CONSTRAINT "User_muskBucks_check" CHECK ("muskBucks" >= 0);

-- Add CHECK constraint for Bet.oddsAtPlacement (prevent invalid odds when not null)
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_oddsAtPlacement_check" CHECK ("oddsAtPlacement" IS NULL OR "oddsAtPlacement" > 0);

-- Add CHECK constraint for PongMatch.wagerAmount (prevent negative wagers)
ALTER TABLE "PongMatch" ADD CONSTRAINT "PongMatch_wagerAmount_check" CHECK ("wagerAmount" >= 0);