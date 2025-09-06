-- Add rule complexity tracking fields to Achievement table
ALTER TABLE "Achievement" ADD COLUMN "ruleComplexity" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "Achievement" ADD COLUMN "rulePerformanceScore" INTEGER DEFAULT 0 NOT NULL;
ALTER TABLE "Achievement" ADD COLUMN "lastRuleValidation" TIMESTAMP(3);

-- Add indexes for performance
CREATE INDEX "Achievement_ruleComplexity_idx" ON "Achievement" ("ruleComplexity");
CREATE INDEX "Achievement_rulePerformanceScore_idx" ON "Achievement" ("rulePerformanceScore");
CREATE INDEX "Achievement_lastRuleValidation_idx" ON "Achievement" ("lastRuleValidation");

-- Add composite index for admin queries
CREATE INDEX "Achievement_complexity_performance_idx" ON "Achievement" ("ruleComplexity", "rulePerformanceScore");