-- Rollback: DROP CONSTRAINT IF EXISTS and recreate without ON DELETE
-- AddBetOptionFKConstraint
-- This migration adds ON DELETE SET NULL to the Bet.optionId foreign key
-- to prevent orphaned option references when PredictionOptions are cascade deleted.

-- First, drop the existing foreign key constraint if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%Bet_optionId_fkey%'
        AND table_name = 'Bet'
    ) THEN
        ALTER TABLE "Bet" DROP CONSTRAINT "Bet_optionId_fkey";
    END IF;
END $$;

-- Add the foreign key constraint with ON DELETE SET NULL
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_optionId_fkey" 
    FOREIGN KEY ("optionId") REFERENCES "PredictionOption"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;