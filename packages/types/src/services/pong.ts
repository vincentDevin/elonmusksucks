/**
 * Services Layer - Pong Service Types
 *
 * Types for Pong game service operations, ELO calculations, and match management
 */

import type { MatchType, MatchStatus, AIDifficulty } from '../shared/enums';

// ============================================================================
// Pong Match Service Types
// ============================================================================

/**
 * Create Match Input
 */
export interface CreateMatchInput {
  userId: number;
  wager: number;
  type: MatchType;
  aiDifficulty?: AIDifficulty;
}

/**
 * Join Match Input
 */
export interface JoinMatchInput {
  userId: number;
  matchId: string;
}

/**
 * Match Result Input
 */
export interface MatchResultInput {
  matchId: string;
  winnerId: number;
  loserId?: number;
  winnerScore: number;
  loserScore: number;
  duration: number; // seconds
  disconnection?: boolean;
  forfeit?: boolean;
}

/**
 * Match Service Result
 */
export interface MatchServiceResult {
  matchId: string;
  player1: MatchPlayerInfo;
  player2?: MatchPlayerInfo;
  wager: number;
  pot: number;
  status: MatchStatus;
  winner?: number; // Player slot (0 or 1)
  scores: [number, number];
  createdAt: Date;
  completedAt?: Date;
  duration?: number;
}

/**
 * Match Player Info
 */
export interface MatchPlayerInfo {
  userId: number;
  name: string;
  avatarUrl: string | null;
  elo: number;
  tier: string;
  isAI: boolean;
  aiDifficulty?: AIDifficulty;
}

// ============================================================================
// ELO Calculation Types
// ============================================================================

/**
 * ELO Calculation Input
 */
export interface EloCalculationInput {
  winnerElo: number;
  loserElo: number;
  scoreDifference: number;
  isRanked: boolean;
  wager: number;
}

/**
 * ELO Calculation Result
 */
export interface EloCalculationResult {
  winnerEloChange: number;
  loserEloChange: number;
  winnerNewElo: number;
  loserNewElo: number;
  kFactor: number;
  expectedWinProbability: number;
  scoreMultiplier: number;
  wagerMultiplier: number;
}

/**
 * ELO Constants
 */
export const ELO_CONSTANTS = {
  /**
   * Starting ELO for new players
   */
  STARTING_ELO: 1000,

  /**
   * Minimum ELO (floor)
   */
  MIN_ELO: 0,

  /**
   * Maximum ELO gain/loss per match
   */
  MAX_ELO_CHANGE: 100,

  /**
   * K-factor for ELO calculation (controls sensitivity)
   */
  K_FACTOR: 32,

  /**
   * K-factor for new players (< 30 games)
   */
  K_FACTOR_PROVISIONAL: 40,

  /**
   * K-factor for masters (> 2400 ELO)
   */
  K_FACTOR_MASTER: 24,

  /**
   * Score difference multiplier
   */
  SCORE_MULTIPLIER: {
    MIN: 0.8,
    MAX: 1.5,
    BLOWOUT_THRESHOLD: 8,
  },

  /**
   * Wager multiplier (higher stakes = more ELO change)
   */
  WAGER_MULTIPLIER: {
    MIN: 1.0,
    MAX: 1.2,
    HIGH_STAKES_THRESHOLD: 1000,
  },
} as const;

/**
 * ELO Tier Thresholds
 */
export const ELO_TIERS = {
  BRONZE: { min: 0, max: 999, name: 'Bronze', color: '#CD7F32' },
  SILVER: { min: 1000, max: 1399, name: 'Silver', color: '#C0C0C0' },
  GOLD: { min: 1400, max: 1799, name: 'Gold', color: '#FFD700' },
  PLATINUM: { min: 1800, max: 2199, name: 'Platinum', color: '#E5E4E2' },
  DIAMOND: { min: 2200, max: 2599, name: 'Diamond', color: '#B9F2FF' },
  MASTER: { min: 2600, max: 2999, name: 'Master', color: '#8B00FF' },
  GRANDMASTER: { min: 3000, max: Infinity, name: 'Grandmaster', color: '#FF4500' },
} as const;

export type EloTierName = keyof typeof ELO_TIERS;

/**
 * ELO Tier Info
 */
export interface EloTierInfo {
  tier: EloTierName;
  name: string;
  color: string;
  min: number;
  max: number;
  progress: number; // Percentage through current tier
}

// ============================================================================
// Pong Stats Update Types
// ============================================================================

/**
 * Pong Stats Update Input
 */
export interface PongStatsUpdateInput {
  userId: number;
  matchResult: MatchResultInput;
  eloChange: number;
  newElo: number;
  isWin: boolean;
}

/**
 * Pong Stats Update Result
 */
export interface PongStatsUpdateResult {
  userId: number;
  stats: {
    totalMatches: number;
    matchesWon: number;
    matchesLost: number;
    winRate: number;
    currentElo: number;
    peakElo: number;
    tier: string;
    currentStreak: number;
    longestWinStreak: number;
  };
  changes: {
    eloChange: number;
    tierChange?: {
      from: string;
      to: string;
    };
    streakChange: number;
    newPeakElo?: boolean;
  };
  achievements?: Array<{
    id: string;
    title: string;
    description: string;
  }>;
}

// ============================================================================
// Pong Matchmaking Types
// ============================================================================

/**
 * Matchmaking Criteria
 */
export interface MatchmakingCriteria {
  userId: number;
  userElo: number;
  wagerRange: {
    min: number;
    max: number;
  };
  eloDifference: number; // Maximum ELO difference
  excludeUserIds?: number[];
}

/**
 * Matchmaking Result
 */
export interface MatchmakingResult {
  found: boolean;
  matchId?: string;
  opponent?: {
    userId: number;
    name: string;
    elo: number;
    tier: string;
  };
  estimatedWaitTime?: number; // seconds
  queuePosition?: number;
}

/**
 * Matchmaking Pool Entry
 */
export interface MatchmakingPoolEntry {
  userId: number;
  elo: number;
  wager: number;
  joinedAt: Date;
  criteria: MatchmakingCriteria;
}

// ============================================================================
// Pong Game State Types
// ============================================================================

/**
 * Game State Snapshot
 */
export interface GameStateSnapshot {
  matchId: string;
  tick: number;
  timestamp: number;
  ball: {
    x: number;
    y: number;
    velocityX: number;
    velocityY: number;
  };
  player1PaddleY: number;
  player2PaddleY: number;
  scores: [number, number];
  wager: number;
  pot: number;
}

// PlayerInput is exported from database/pong.ts - import it when needed

/**
 * Game Physics Constants
 */
export const GAME_PHYSICS = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 600,
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 5,
  BALL_RADIUS: 5,
  BALL_INITIAL_SPEED: 5,
  BALL_MAX_SPEED: 15,
  BALL_ACCELERATION: 1.05,
  WINNING_SCORE: 11,
  TICK_RATE: 60, // Updates per second
} as const;

// ============================================================================
// Pong Payout Types
// ============================================================================

/**
 * Pong Payout Calculation Input
 */
export interface PongPayoutInput {
  matchId: string;
  winnerId: number;
  loserId?: number;
  wager: number;
  vsAI: boolean;
}

/**
 * Pong Payout Result
 */
export interface PongPayoutResult {
  matchId: string;
  winnerId: number;
  payout: string; // BigInt as string
  houseRake: string; // BigInt as string
  netPayout: string; // BigInt as string
  loserLoss?: string; // BigInt as string
  vsAI: boolean;
  timestamp: Date;
}

/**
 * Pong Payout Constants
 */
export const PONG_PAYOUT_CONSTANTS = {
  /**
   * House rake percentage (0.05 = 5%)
   */
  HOUSE_RAKE: 0.05,

  /**
   * Minimum wager
   */
  MIN_WAGER: 10,

  /**
   * Maximum wager
   */
  MAX_WAGER: 10000,

  /**
   * AI match payout multiplier (less than PvP)
   */
  AI_PAYOUT_MULTIPLIER: {
    EASY: 0.5,
    MEDIUM: 0.75,
    HARD: 1.0,
    IMPOSSIBLE: 1.25,
  },
} as const;
