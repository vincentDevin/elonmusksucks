-- Rollback: DROP the unique constraints and columns
-- AddIdempotencyKeys
-- This migration adds optional idempotencyKey fields to Bet, Parlay, and Transaction models
-- to prevent duplicate financial operations via client-provided unique keys.

-- Add idempotencyKey column to Bet table
ALTER TABLE "Bet" ADD COLUMN "idempotencyKey" TEXT;

-- Add unique constraint on Bet.idempotencyKey (only when not null)
CREATE UNIQUE INDEX CONCURRENTLY "Bet_idempotencyKey_key" ON "Bet"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Add idempotencyKey column to Parlay table  
ALTER TABLE "Parlay" ADD COLUMN "idempotencyKey" TEXT;

-- Add unique constraint on Parlay.idempotencyKey (only when not null)
CREATE UNIQUE INDEX CONCURRENTLY "Parlay_idempotencyKey_key" ON "Parlay"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;

-- Add idempotencyKey column to Transaction table
ALTER TABLE "Transaction" ADD COLUMN "idempotencyKey" TEXT;

-- Add unique constraint on Transaction.idempotencyKey (only when not null) 
CREATE UNIQUE INDEX CONCURRENTLY "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;