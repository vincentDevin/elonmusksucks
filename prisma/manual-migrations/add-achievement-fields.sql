-- Migration: Add missing fields to Achievement model for comprehensive catalog
-- Run: npx prisma migrate dev --name add-achievement-fields

-- Add new fields to Achievement table
ALTER TABLE "Achievement" ADD COLUMN "slug" VARCHAR(255);
ALTER TABLE "Achievement" ADD COLUMN "rarity" VARCHAR(50) DEFAULT 'common';
ALTER TABLE "Achievement" ADD COLUMN "autoAward" BOOLEAN DEFAULT true;
ALTER TABLE "Achievement" ADD COLUMN "manualOnly" BOOLEAN DEFAULT false;
ALTER TABLE "Achievement" ADD COLUMN "isShame" BOOLEAN DEFAULT false;

-- Create unique index for slug (will be populated by seeds)
-- CREATE UNIQUE INDEX CONCURRENTLY "Achievement_slug_key" ON "Achievement"("slug");

-- Add indexes for efficient querying
CREATE INDEX "Achievement_rarity_idx" ON "Achievement"("rarity");
CREATE INDEX "Achievement_autoAward_idx" ON "Achievement"("autoAward");
CREATE INDEX "Achievement_isShame_idx" ON "Achievement"("isShame");
CREATE INDEX "Achievement_category_rarity_idx" ON "Achievement"("category", "rarity");