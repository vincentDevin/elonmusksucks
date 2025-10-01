/**
 * User Database Types
 *
 * Types for User, EmailVerification, PasswordReset, RefreshToken models
 */

import type { PrismaUser, PrismaEmailVerification, PrismaPasswordReset, PrismaRefreshToken } from '../prisma';

// ============================================================================
// User Types
// ============================================================================

export type DbUser = PrismaUser;

export type PublicUser = Omit<
  PrismaUser,
  'passwordHash' | 'emailVerifications' | 'passwordResets' | 'refreshTokens'
>;

export type UserWithBanStatus = DbUser & {
  banStatus?: {
    isBanned: boolean;
    banType?: string;
    reason?: string;
    expiresAt?: Date;
  };
  stats?: {
    totalBets: number;
    totalWagered: number;
    totalWon: number;
    winRate: number;
  };
  recentActivity?: {
    lastLogin?: Date;
    lastBet?: Date;
    totalLogins: number;
  };
  badges?: any[];
};

// ============================================================================
// Internal Auth Types
// ============================================================================

export type DbEmailVerification = PrismaEmailVerification;
export type DbPasswordReset = PrismaPasswordReset;
export type DbRefreshToken = PrismaRefreshToken;

// ============================================================================
// User Stats Type (denormalized)
// ============================================================================

export interface DbUserStats {
  id: number;
  userId: number;
  // Single-bet metrics
  totalBets: number;
  betsWon: number;
  betsLost: number;
  // Parlay metrics
  totalParlays: number;
  parlaysWon: number;
  parlaysLost: number;
  totalParlayLegs: number;
  parlayLegsWon: number;
  parlayLegsLost: number;
  // Combined metrics
  totalWagered: bigint;
  totalWon: bigint;
  profit: bigint;
  roi: number;
  // Streak tracking
  currentStreak: number;
  longestStreak: number;
  // Extras
  mostCommonBet: string | null;
  biggestWin: bigint;
  updatedAt: Date;
}
