// apps/server/src/middleware/betaCohort.ts
// -----------------------------------------------------------------------------
// Beta Cohort Middleware - Sticky User-Based Feature Rollout
// -----------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';
import type { BetaCohortConfig, BetaCohortInfo } from '@ems/types';
import crypto from 'crypto';

// Default beta cohort configuration
const defaultBetaCohortConfig: BetaCohortConfig = {
  enabled: process.env.BETA_COHORT_ENABLED === 'true',
  percentage: parseInt(process.env.BETA_COHORT_PERCENTAGE || '2', 10), // 2% default
  features: ['pong_beta', 'enhanced_chat'], // features requiring beta cohort
};

/**
 * Determine if user is in beta cohort using consistent hash
 * Hash userId to get sticky assignment (same user always gets same result)
 */
function isUserInBetaCohort(userId: number, percentage: number): boolean {
  const hash = crypto.createHash('sha256');
  hash.update(`beta-cohort-${userId}`);
  const hashHex = hash.digest('hex');

  // Take first 8 characters and convert to integer
  const hashValue = parseInt(hashHex.substring(0, 8), 16);
  const bucket = hashValue % 100; // 0-99

  return bucket < percentage;
}

/**
 * Beta cohort middleware - adds cohort info to request
 */
export function betaCohortMiddleware(config: BetaCohortConfig = defaultBetaCohortConfig) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const userId = (req as any).user?.id;
    const inBetaCohort =
      config.enabled && userId ? isUserInBetaCohort(userId, config.percentage) : false;

    (req as any).betaCohort = {
      inBetaCohort,
      cohortPercentage: config.percentage,
    } as BetaCohortInfo;

    if (inBetaCohort) {
      console.log(`[beta-cohort] User ${userId} assigned to beta cohort (${config.percentage}%)`);
    }

    next();
  };
}
