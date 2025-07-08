// apps/server/src/repositories/IAdminRepository.ts

import type {
  Role,
  User,
  Prediction,
  Bet,
  Transaction,
  Badge,
  UserBadge,
  UserStats,
  AITweet,
  UserPost,
} from '@prisma/client';

/** Simple key/value map for query filters from req.query */
export type QueryParams = Record<string, any>;

export interface IAdminRepository {
  // -- User Management --
  findAllUsers(): Promise<User[]>;
  updateUserRole(userId: number, role: Role): Promise<User>;
  updateUserActive(userId: number, active: boolean): Promise<User>;
  updateUserBalance(userId: number, amount: number): Promise<User>;

  // -- Prediction Management --
  findPredictions(filters?: QueryParams): Promise<Prediction[]>;
  updatePredictionStatus(
    predictionId: number,
    status: 'approved' | 'rejected',
  ): Promise<Prediction>;

  // -- Bet & Transaction Oversight --
  findBets(filters?: QueryParams): Promise<Bet[]>;
  refundBet(betId: number): Promise<Bet>;
  findTransactions(filters?: QueryParams): Promise<Transaction[]>;

  // -- Badge & Content Moderation --
  findPosts(filters?: QueryParams): Promise<UserPost[]>;
  deletePost(postId: number): Promise<void>;
  findAllBadges(): Promise<Badge[]>;
  insertBadge(data: { name: string; description?: string; iconUrl?: string }): Promise<Badge>;
  addBadgeToUser(userId: number, badgeId: number): Promise<UserBadge>;
  removeBadgeFromUser(userId: number, badgeId: number): Promise<void>;

  // -- Leaderboard & Stats --
  recalculateLeaderboard(): Promise<void>;
  findUserStats(userId: number): Promise<UserStats | null>;

  // -- Miscellaneous --
  triggerAITweet(): Promise<AITweet>;
}
