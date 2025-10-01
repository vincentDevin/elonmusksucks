/**
 * Domain Layer - Achievement System Types
 *
 * Achievement definitions, rules, progress tracking, and unlocking logic
 */

// ============================================================================
// Achievement Definitions
// ============================================================================

/**
 * Achievement Definition
 */
export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon?: string;
  rule: AchievementRule;
  rewards?: AchievementReward[];
  hidden?: boolean; // Hidden until unlocked
  repeatable?: boolean;
  order?: number; // Display order
}

/**
 * Achievement Categories
 */
export const AchievementCategory = {
  BETTING: 'betting',
  PREDICTION: 'prediction',
  PONG: 'pong',
  SOCIAL: 'social',
  FINANCIAL: 'financial',
  STREAK: 'streak',
  MILESTONE: 'milestone',
  SPECIAL: 'special',
} as const;

export type AchievementCategory =
  (typeof AchievementCategory)[keyof typeof AchievementCategory];

/**
 * Achievement Rarity Levels
 */
export const AchievementRarity = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary',
} as const;

export type AchievementRarity =
  (typeof AchievementRarity)[keyof typeof AchievementRarity];

// ============================================================================
// Achievement Rules
// ============================================================================

/**
 * Achievement Rule (conditions for unlocking)
 */
export interface AchievementRule {
  type: AchievementRuleType;
  conditions: AchievementCondition[];
  operator?: 'AND' | 'OR'; // Default: AND
}

/**
 * Achievement Rule Types
 */
export const AchievementRuleType = {
  COUNTER: 'counter', // Count reaches threshold
  STREAK: 'streak', // Consecutive actions
  COMPARISON: 'comparison', // Compare values
  TIME_BASED: 'time_based', // Time-based conditions
  COMPOSITE: 'composite', // Multiple conditions
} as const;

export type AchievementRuleType =
  (typeof AchievementRuleType)[keyof typeof AchievementRuleType];

/**
 * Achievement Condition
 */
export interface AchievementCondition {
  metric: AchievementMetric;
  operator: ComparisonOperator;
  threshold: number | string;
  timeWindow?: TimeWindow; // Optional time constraint
}

/**
 * Achievement Metrics
 */
export const AchievementMetric = {
  // Betting metrics
  TOTAL_BETS: 'total_bets',
  BETS_WON: 'bets_won',
  WIN_RATE: 'win_rate',
  TOTAL_WAGERED: 'total_wagered',
  TOTAL_WON: 'total_won',
  PROFIT: 'profit',
  ROI: 'roi',
  WIN_STREAK: 'win_streak',

  // Prediction metrics
  PREDICTIONS_CREATED: 'predictions_created',
  PREDICTIONS_APPROVED: 'predictions_approved',
  PREDICTION_ACCURACY: 'prediction_accuracy',

  // Pong metrics
  PONG_MATCHES_WON: 'pong_matches_won',
  PONG_WIN_RATE: 'pong_win_rate',
  PONG_ELO: 'pong_elo',
  PONG_STREAK: 'pong_streak',
  PONG_COMEBACK_WINS: 'pong_comeback_wins',

  // Financial metrics
  BALANCE: 'balance',
  PEAK_BALANCE: 'peak_balance',

  // Social metrics
  FOLLOWERS: 'followers',
  COMMENTS_POSTED: 'comments_posted',
  REACTIONS_GIVEN: 'reactions_given',

  // Streak metrics
  LOGIN_STREAK: 'login_streak',
  BETTING_STREAK: 'betting_streak',

  // Special metrics
  ACCOUNT_AGE: 'account_age',
  RANK: 'rank',
} as const;

export type AchievementMetric =
  (typeof AchievementMetric)[keyof typeof AchievementMetric];

/**
 * Comparison Operators
 */
export const ComparisonOperator = {
  EQUALS: '=',
  NOT_EQUALS: '!=',
  GREATER_THAN: '>',
  GREATER_THAN_OR_EQUAL: '>=',
  LESS_THAN: '<',
  LESS_THAN_OR_EQUAL: '<=',
} as const;

export type ComparisonOperator =
  (typeof ComparisonOperator)[keyof typeof ComparisonOperator];

/**
 * Time Window
 */
export interface TimeWindow {
  duration: number; // milliseconds
  type: 'rolling' | 'fixed';
}

// ============================================================================
// Achievement Rewards
// ============================================================================

/**
 * Achievement Reward
 */
export interface AchievementReward {
  type: RewardType;
  value: number | string;
  description?: string;
}

/**
 * Reward Types
 */
export const RewardType = {
  MUSK_BUCKS: 'musk_bucks',
  BADGE: 'badge',
  TITLE: 'title',
  EXPERIENCE: 'experience',
  MULTIPLIER: 'multiplier',
} as const;

export type RewardType = (typeof RewardType)[keyof typeof RewardType];

// ============================================================================
// Achievement Progress
// ============================================================================

/**
 * Achievement Progress
 */
export interface AchievementProgress {
  achievementId: string;
  userId: number;
  current: number;
  target: number;
  percentage: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
  lastUpdated: Date;
}

/**
 * Achievement Progress Update
 */
export interface AchievementProgressUpdate {
  achievementId: string;
  userId: number;
  incrementBy?: number;
  setValue?: number;
  context?: Record<string, unknown>;
}

/**
 * Achievement Unlock Event
 */
export interface AchievementUnlockEvent {
  achievementId: string;
  userId: number;
  achievement: AchievementDefinition;
  progress: AchievementProgress;
  rewards: AchievementReward[];
  timestamp: Date;
}

// ============================================================================
// Predefined Achievements
// ============================================================================

/**
 * Sample Achievement Definitions
 *
 * Full achievement registry would be defined in the application
 */
export const SampleAchievements: AchievementDefinition[] = [
  {
    id: 'first_bet',
    title: 'First Bet',
    description: 'Place your first bet',
    category: AchievementCategory.BETTING,
    rarity: AchievementRarity.COMMON,
    rule: {
      type: AchievementRuleType.COUNTER,
      conditions: [
        {
          metric: AchievementMetric.TOTAL_BETS,
          operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
          threshold: 1,
        },
      ],
    },
    rewards: [
      {
        type: RewardType.MUSK_BUCKS,
        value: 100,
        description: '100 MuskBucks bonus',
      },
    ],
  },
  {
    id: 'win_streak_10',
    title: 'Hot Streak',
    description: 'Win 10 bets in a row',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.RARE,
    rule: {
      type: AchievementRuleType.STREAK,
      conditions: [
        {
          metric: AchievementMetric.WIN_STREAK,
          operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
          threshold: 10,
        },
      ],
    },
    rewards: [
      {
        type: RewardType.MUSK_BUCKS,
        value: 1000,
      },
      {
        type: RewardType.BADGE,
        value: 'hot_streak',
      },
    ],
  },
  {
    id: 'pong_master',
    title: 'Pong Master',
    description: 'Reach 2600 ELO in Pong',
    category: AchievementCategory.PONG,
    rarity: AchievementRarity.EPIC,
    rule: {
      type: AchievementRuleType.COMPARISON,
      conditions: [
        {
          metric: AchievementMetric.PONG_ELO,
          operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
          threshold: 2600,
        },
      ],
    },
    rewards: [
      {
        type: RewardType.TITLE,
        value: 'Pong Master',
      },
      {
        type: RewardType.MUSK_BUCKS,
        value: 5000,
      },
    ],
  },
  {
    id: 'millionaire',
    title: 'Millionaire',
    description: 'Reach 1,000,000 MuskBucks',
    category: AchievementCategory.FINANCIAL,
    rarity: AchievementRarity.LEGENDARY,
    rule: {
      type: AchievementRuleType.COMPARISON,
      conditions: [
        {
          metric: AchievementMetric.BALANCE,
          operator: ComparisonOperator.GREATER_THAN_OR_EQUAL,
          threshold: '1000000',
        },
      ],
    },
    rewards: [
      {
        type: RewardType.BADGE,
        value: 'millionaire',
      },
      {
        type: RewardType.TITLE,
        value: 'Millionaire',
      },
    ],
  },
];
