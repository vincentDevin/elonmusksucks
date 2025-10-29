// apps/server/src/lib/flags.ts
// -----------------------------------------------------------------------------
// Feature Flag Management - Server-side Configuration
// -----------------------------------------------------------------------------

import type { FeatureFlagConfig } from '@ems/types';

// Default feature flag configuration from environment variables
const defaultFlags: FeatureFlagConfig = {
  pong_beta: process.env.FEATURE_PONG_BETA === 'true',
  enhanced_chat: process.env.FEATURE_ENHANCED_CHAT === 'true',
  advanced_analytics: process.env.FEATURE_ADVANCED_ANALYTICS === 'true',
  experimental_ui: process.env.FEATURE_EXPERIMENTAL_UI === 'true',
};

// Runtime flag overrides (for kill switches)
let runtimeFlags: Partial<FeatureFlagConfig> = {};

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: string): boolean {
  // Runtime overrides take precedence (for kill switches)
  if (runtimeFlags[flag] !== undefined) {
    return runtimeFlags[flag]!;
  }

  // Fall back to default configuration
  return defaultFlags[flag] || false;
}

/**
 * Get all current feature flag values
 */
export function getAllFeatureFlags(): FeatureFlagConfig {
  const result: FeatureFlagConfig = { ...defaultFlags };

  // Apply runtime overrides
  Object.keys(runtimeFlags).forEach((flag) => {
    if (runtimeFlags[flag] !== undefined) {
      result[flag] = runtimeFlags[flag]!;
    }
  });

  return result;
}

/**
 * Emergency kill switch - disable a feature at runtime
 */
export function disableFeature(flag: string): void {
  runtimeFlags[flag] = false;
  console.warn(`[feature-flags] Emergency kill switch activated for ${flag}`);
}
