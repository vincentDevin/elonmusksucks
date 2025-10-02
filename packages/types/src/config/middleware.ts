/**
 * Config Layer - Middleware Configuration
 *
 * Middleware-specific configuration types
 */

// ============================================================================
// Beta Cohort Configuration
// ============================================================================

/**
 * Beta Cohort Configuration
 */
export interface BetaCohortConfig {
  enabled: boolean;
  percentage: number;
  features: string[];
}

/**
 * Beta Cohort Info
 */
export interface BetaCohortInfo {
  isInCohort: boolean;
  percentage: number;
  userId: number;
  features: string[];
}

// ============================================================================
// Payload Size Configuration
// ============================================================================

/**
 * Payload Size Configuration
 */
export interface PayloadSizeConfig {
  softLimitBytes: number;
  hardLimitBytes: number;
  enforceMode: 'warn' | 'strict';
}

/**
 * Payload Size Result
 */
export interface PayloadSizeResult {
  allowed?: boolean;
  size: number;
  limit?: number;
  exceeded?: boolean;
  warning?: boolean;
  exceedsSoft?: boolean;
  exceedsHard?: boolean;
  message?: string;
}
