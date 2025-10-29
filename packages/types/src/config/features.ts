/**
 * Config Layer - Feature Flags Configuration
 *
 * Feature toggles, A/B testing, and beta cohorts
 */

// ============================================================================
// Feature Flags
// ============================================================================

/**
 * Feature Flag
 */
export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  rollout: FeatureRollout;
  overrides?: FeatureOverride[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Feature Rollout Strategy
 */
export interface FeatureRollout {
  strategy: RolloutStrategy;
  percentage?: number; // For percentage rollout
  userIds?: number[]; // For user whitelist
  cohorts?: string[]; // For cohort-based rollout
  rules?: RolloutRule[];
}

/**
 * Rollout Strategies
 */
export const RolloutStrategy = {
  ALL: 'all', // Enabled for everyone
  NONE: 'none', // Disabled for everyone
  PERCENTAGE: 'percentage', // Gradual percentage rollout
  USER_LIST: 'user_list', // Specific user IDs
  COHORT: 'cohort', // Specific user cohorts
  RULE_BASED: 'rule_based', // Custom rules
} as const;

export type RolloutStrategy = (typeof RolloutStrategy)[keyof typeof RolloutStrategy];

/**
 * Rollout Rule
 */
export interface RolloutRule {
  attribute: string; // e.g., 'role', 'accountAge', 'totalBets'
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[] | number[];
}

/**
 * Feature Override
 */
export interface FeatureOverride {
  type: 'user' | 'cohort' | 'rule';
  target: string | number;
  enabled: boolean;
  reason?: string;
}

// ============================================================================
// Feature Flag Evaluation
// ============================================================================

/**
 * Feature Evaluation Context
 */
export interface FeatureEvaluationContext {
  userId?: number;
  attributes?: Record<string, unknown>;
  cohorts?: string[];
}

/**
 * Feature Evaluation Result
 */
export interface FeatureEvaluationResult {
  flagId: string;
  enabled: boolean;
  reason: string;
  variant?: string; // For A/B testing
  metadata?: Record<string, unknown>;
}

// ============================================================================
// A/B Testing
// ============================================================================

/**
 * A/B Test
 */
export interface ABTest {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  variants: ABVariant[];
  allocation: VariantAllocation;
  metrics: ABMetric[];
  startDate: Date;
  endDate?: Date;
  status: ABTestStatus;
}

/**
 * A/B Test Variant
 */
export interface ABVariant {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage (0-100)
  config?: Record<string, unknown>;
}

/**
 * Variant Allocation Strategy
 */
export interface VariantAllocation {
  strategy: 'random' | 'sticky' | 'weighted';
  seed?: string; // For deterministic randomization
  overrides?: Array<{
    userId: number;
    variantId: string;
  }>;
}

/**
 * A/B Test Metric
 */
export interface ABMetric {
  id: string;
  name: string;
  type: 'conversion' | 'revenue' | 'engagement' | 'retention';
  goal: 'maximize' | 'minimize';
  baseline?: number;
}

/**
 * A/B Test Status
 */
export const ABTestStatus = {
  DRAFT: 'draft',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;

export type ABTestStatus = (typeof ABTestStatus)[keyof typeof ABTestStatus];

/**
 * A/B Test Assignment
 */
export interface ABTestAssignment {
  testId: string;
  userId: number;
  variantId: string;
  assignedAt: Date;
  exposureCount: number;
  conversions: number;
}

// ============================================================================
// User Cohorts
// ============================================================================

/**
 * User Cohort
 */
export interface UserCohort {
  id: string;
  name: string;
  description: string;
  rules: CohortRule[];
  userCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Cohort Rule
 */
export interface CohortRule {
  attribute: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'in' | 'contains';
  value: string | number | string[] | number[];
  operator_between_rules?: 'AND' | 'OR';
}

/**
 * Predefined Cohorts
 */
export const PredefinedCohorts = {
  BETA_TESTERS: 'beta_testers',
  EARLY_ADOPTERS: 'early_adopters',
  POWER_USERS: 'power_users',
  NEW_USERS: 'new_users',
  INACTIVE_USERS: 'inactive_users',
  HIGH_ROLLERS: 'high_rollers',
  ADMINS: 'admins',
  MODERATORS: 'moderators',
} as const;

export type PredefinedCohort = (typeof PredefinedCohorts)[keyof typeof PredefinedCohorts];

// ============================================================================
// Feature Categories
// ============================================================================

/**
 * Feature Categories
 */
export const FeatureCategory = {
  BETTING: 'betting',
  PREDICTIONS: 'predictions',
  PONG: 'pong',
  SOCIAL: 'social',
  CHAT: 'chat',
  TIMELINE: 'timeline',
  ACHIEVEMENTS: 'achievements',
  LEADERBOARD: 'leaderboard',
  ADMIN: 'admin',
  EXPERIMENTAL: 'experimental',
  UI: 'ui',
  PERFORMANCE: 'performance',
} as const;

export type FeatureCategory = (typeof FeatureCategory)[keyof typeof FeatureCategory];

/**
 * Feature with Category
 */
export interface CategorizedFeature extends FeatureFlag {
  category: FeatureCategory;
  dependencies?: string[]; // Other feature IDs this depends on
  conflicts?: string[]; // Features that conflict with this one
}

// ============================================================================
// Feature Flag Registry
// ============================================================================

/**
 * Feature Flag Registry
 */
export interface FeatureFlagRegistry {
  flags: Map<string, FeatureFlag>;
  tests: Map<string, ABTest>;
  cohorts: Map<string, UserCohort>;
}

/**
 * Feature Flag Update
 */
export interface FeatureFlagUpdate {
  flagId: string;
  enabled?: boolean;
  rollout?: Partial<FeatureRollout>;
  overrides?: FeatureOverride[];
  metadata?: Record<string, unknown>;
  updatedBy: number; // userId
}

// ============================================================================
// Common Feature Flags
// ============================================================================

/**
 * Sample Feature Flags
 */
export const CommonFeatureFlags = {
  // Betting features
  PARLAYS_ENABLED: 'parlays_enabled',
  LIVE_BETTING: 'live_betting',
  BETTING_LIMITS_DYNAMIC: 'betting_limits_dynamic',

  // Pong features
  PONG_TOURNAMENTS: 'pong_tournaments',
  PONG_SPECTATOR_MODE: 'pong_spectator_mode',
  PONG_AI_DIFFICULTY_IMPOSSIBLE: 'pong_ai_difficulty_impossible',

  // Social features
  USER_PROFILES_ENHANCED: 'user_profiles_enhanced',
  CHAT_ROOMS: 'chat_rooms',
  DIRECT_MESSAGES: 'direct_messages',
  USER_BADGES: 'user_badges',

  // Timeline features
  TIMELINE_PERSONALIZATION: 'timeline_personalization',
  TIMELINE_FILTERS_ADVANCED: 'timeline_filters_advanced',

  // Achievement features
  ACHIEVEMENTS_V2: 'achievements_v2',
  ACHIEVEMENT_CHALLENGES: 'achievement_challenges',

  // Admin features
  ADMIN_ANALYTICS_ADVANCED: 'admin_analytics_advanced',
  ADMIN_BULK_OPERATIONS: 'admin_bulk_operations',

  // UI features
  DARK_MODE: 'dark_mode',
  DASHBOARD_CUSTOMIZATION: 'dashboard_customization',
  MOBILE_APP_BANNER: 'mobile_app_banner',

  // Performance features
  VIRTUAL_SCROLLING: 'virtual_scrolling',
  LAZY_LOADING_IMAGES: 'lazy_loading_images',
  SERVICE_WORKER: 'service_worker',
} as const;

export type CommonFeatureFlag = (typeof CommonFeatureFlags)[keyof typeof CommonFeatureFlags];

// ============================================================================
// Feature Flag Configuration
// ============================================================================

/**
 * Feature Flag Configuration (for lib/flags.ts usage)
 */
export interface FeatureFlagConfig {
  pong_beta?: boolean;
  enhanced_chat?: boolean;
  advanced_analytics?: boolean;
  experimental_ui?: boolean;
  [key: string]: boolean | undefined;
}

/**
 * Feature Flag Key (string union type for indexing)
 */
export type FeatureFlagKey = keyof FeatureFlagConfig;
