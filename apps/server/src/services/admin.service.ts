// apps/server/src/services/admin.service.ts
import type { Role } from '@prisma/client';
import type { IAdminRepository } from '../repositories/IAdminRepository';
import type {
  QueryParams,
  UserSearchParams,
  PaginatedUsers,
  DetailedUser,
  PredictionSearchParams,
} from '@ems/types';
import type {
  BulkUserOperation,
  BulkOperationResult,
  PaginatedPredictions,
  DetailedPrediction,
  BulkPredictionOperation,
  BulkPredictionResult,
} from '../repositories/IAdminRepository';
import { PrismaAdminRepository } from '../repositories/AdminRepository';
import type { UserStatsDTO } from '@ems/types';
import redisClient from '../lib/redis';
import { EventBus } from '../lib/EventBus';

const repo: IAdminRepository = new PrismaAdminRepository();
const eventBus = new EventBus();

// -- Enhanced User Management --
export const listUsers = async () => {
  // Legacy method - kept for backward compatibility
  return repo.findAllUsers();
};

export const searchUsers = async (params: UserSearchParams): Promise<PaginatedUsers> => {
  return repo.searchUsers(params);
};

export const getUserDetails = async (userId: number): Promise<DetailedUser | null> => {
  return repo.getUserWithDetails(userId);
};

export const bulkUpdateUsers = async (
  operation: BulkUserOperation,
): Promise<BulkOperationResult> => {
  return repo.bulkUpdateUsers(operation);
};

export const changeUserRole = async (userId: number, role: Role) => {
  return repo.updateUserRole(userId, role);
};

export const setUserActive = async (userId: number, active: boolean) => {
  return repo.updateUserActive(userId, active);
};

export const adjustUserBalance = async (userId: number, amount: number) => {
  return repo.updateUserBalance(userId, amount);
};

// -- Enhanced Prediction Management --
export const listPredictions = async (filters?: QueryParams) => {
  return repo.findPredictions(filters);
};

export const searchPredictions = async (
  params: PredictionSearchParams,
): Promise<PaginatedPredictions> => {
  return repo.searchPredictions(params);
};

export const getPredictionDetails = async (
  predictionId: number,
): Promise<DetailedPrediction | null> => {
  return repo.getPredictionWithDetails(predictionId);
};

export const bulkUpdatePredictions = async (
  operation: BulkPredictionOperation,
): Promise<BulkPredictionResult> => {
  const result = await repo.bulkUpdatePredictions(operation);

  // Broadcast events for successful operations
  if (result.successCount > 0) {
    const redisClient = require('../lib/redis').default;

    for (const prediction of result.updatedPredictions) {
      if (operation.operation === 'approve') {
        await redisClient.publish(
          'prediction:approved',
          JSON.stringify({
            id: prediction.id,
            title: prediction.title,
            category: prediction.category,
            timestamp: new Date().toISOString(),
          }),
        );

        // Publish JSON rule achievement event for bulk prediction approval
        try {
          await eventBus.publish('prediction:approved', {
            key: 'prediction:approved',
            userId: prediction.creatorId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `prediction:${prediction.id}:approved:bulk`,
            payload: {
              predictionId: prediction.id,
              title: prediction.title,
              category: prediction.category,
              bulkOperation: true,
            },
          });
        } catch (achievementError) {
          console.error(
            '[admin] Error publishing bulk prediction approval achievement event:',
            achievementError,
          );
        }
      } else if (operation.operation === 'resolve') {
        await redisClient.publish(
          'prediction:resolved',
          JSON.stringify({
            id: prediction.id,
            title: prediction.title,
            winningOptionId: prediction.resolutionData?.winningOptionId,
            timestamp: new Date().toISOString(),
          }),
        );

        // Publish JSON rule achievement event for prediction resolution
        try {
          await eventBus.publish('prediction:resolved', {
            key: 'prediction:resolved',
            userId: prediction.creatorId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `prediction:${prediction.id}:resolved:bulk`,
            payload: {
              predictionId: prediction.id,
              title: prediction.title,
              category: prediction.category,
              winningOptionId: prediction.resolutionData?.winningOptionId,
              bulkOperation: true,
            },
          });
        } catch (achievementError) {
          console.error(
            '[admin] Error publishing prediction resolution achievement event:',
            achievementError,
          );
        }
      }
    }
  }

  return result;
};

export const setPredictionStatus = async (
  predictionId: number,
  status: 'approved' | 'rejected',
) => {
  const updated = await repo.updatePredictionStatus(predictionId, status);

  // 🎊 Broadcast prediction approval/rejection event
  if (status === 'approved') {
    const redisClient = require('../lib/redis').default;
    await redisClient.publish(
      'prediction:approved',
      JSON.stringify({
        id: updated.id,
        title: updated.title,
        description: updated.description,
        category: updated.category,
        type: updated.type,
        approved: true,
        timestamp: new Date().toISOString(),
      }),
    );

    // Publish JSON rule achievement event for prediction approval
    try {
      await eventBus.publish('prediction:approved', {
        key: 'prediction:approved',
        userId: updated.creatorId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `prediction:${updated.id}:approved`,
        payload: {
          predictionId: updated.id,
          title: updated.title,
          category: updated.category,
          description: updated.description,
          type: updated.type,
        },
      });
    } catch (achievementError) {
      console.error(
        '[admin] Error publishing prediction approval achievement event:',
        achievementError,
      );
      // Don't fail the approval if achievement event fails
    }
  }

  return updated;
};

// -- Bet & Transaction Oversight --
export const listBets = async (filters?: QueryParams) => {
  return repo.findBets(filters);
};

export const refundBet = async (betId: number) => {
  const bet = await repo.refundBet(betId);
  return {
    ...bet,
    amount: bet.amount.toString(),
    potentialPayout: bet.potentialPayout?.toString() || null,
    payout: bet.payout?.toString() || null,
  };
};

export const listTransactions = async (filters?: QueryParams) => {
  const transactions = await repo.findTransactions(filters);
  return transactions.map((tx) => ({
    ...tx,
    amount: tx.amount.toString(),
    balanceAfter: tx.balanceAfter.toString(),
  }));
};

// -- Enhanced Financial Operations Dashboard --
export const searchFinancialData = async (params: any) => {
  return repo.searchFinancialData(params);
};

export const getFinancialAnalytics = async (params: any) => {
  return repo.getFinancialAnalytics(params);
};

export const bulkFinancialOperation = async (operation: any) => {
  return repo.bulkFinancialOperation(operation);
};

export const exportFinancialData = async (params: any) => {
  return repo.exportFinancialData(params);
};

// -- Enhanced Badge & Achievement System --
export const searchBadges = async (params: any) => {
  return repo.searchBadges(params);
};

export const getBadgeWithDetails = async (badgeId: number) => {
  return repo.getBadgeWithDetails(badgeId);
};

export const createBadgeWithCategories = async (data: any) => {
  return repo.createBadgeWithCategories(data);
};

export const updateBadge = async (badgeId: number, data: any) => {
  return repo.updateBadge(badgeId, data);
};

export const deleteBadge = async (badgeId: number) => {
  return repo.deleteBadge(badgeId);
};

export const getBadgeAnalytics = async (badgeId?: number) => {
  return repo.getBadgeAnalytics(badgeId);
};

export const bulkBadgeOperation = async (operation: any) => {
  return repo.bulkBadgeOperation(operation);
};

export const getBadgeCategories = async () => {
  return repo.getBadgeCategories();
};

export const createBadgeCategory = async (data: any) => {
  return repo.createBadgeCategory(data);
};

// -- Legacy Badge & Content Moderation (deprecated) --
export const listPosts = async (filters?: QueryParams) => {
  return repo.findPosts(filters);
};

export const removePost = async (postId: number) => {
  return repo.deletePost(postId);
};

export const listBadges = async () => {
  return repo.findAllBadges();
};

export const createBadge = async (data: {
  name: string;
  description?: string;
  iconUrl?: string;
}) => {
  return repo.insertBadge(data);
};

export const assignBadge = async (userId: number, badgeId: number) => {
  return repo.addBadgeToUser(userId, badgeId);
};

export const revokeBadge = async (userId: number, badgeId: number) => {
  return repo.removeBadgeFromUser(userId, badgeId);
};

// -- Leaderboard & Stats --
export const refreshLeaderboard = async () => {
  return repo.recalculateLeaderboard();
};

/**
 * Fetches raw stats, then maps Date→ISO and returns the DTO.
 */
export const getUserStats = async (userId: number): Promise<UserStatsDTO | null> => {
  const raw = await repo.findUserStats(userId);
  if (!raw) return null;

  return {
    totalBets: raw.totalBets,
    betsWon: raw.betsWon,
    betsLost: raw.betsLost,
    totalParlays: raw.totalParlays,
    parlaysWon: raw.parlaysWon,
    parlaysLost: raw.parlaysLost,
    totalParlayLegs: raw.totalParlayLegs,
    parlayLegsWon: raw.parlayLegsWon,
    parlayLegsLost: raw.parlayLegsLost,
    totalWagered: raw.totalWagered.toString(),
    totalWon: raw.totalWon.toString(),
    profit: raw.profit.toString(),
    roi: raw.roi,
    currentStreak: raw.currentStreak,
    longestStreak: raw.longestStreak,
    mostCommonBet: raw.mostCommonBet,
    biggestWin: raw.biggestWin.toString(),
    updatedAt: raw.updatedAt.toISOString(),
  };
};

// -- Advanced Analytics & Reporting --
export const getExecutiveDashboard = async (params: any) => {
  return repo.getExecutiveDashboard(params);
};

export const getUserBehaviorAnalytics = async (params: any) => {
  return repo.getUserBehaviorAnalytics(params);
};

export const getPredictiveAnalytics = async (params: any) => {
  return repo.getPredictiveAnalytics(params);
};

export const generateCustomReport = async (reportType: string, params: Record<string, any>) => {
  return repo.generateCustomReport(reportType, params);
};

export const getRealtimeMetrics = async () => {
  return repo.getRealtimeMetrics();
};

export const exportAnalyticsData = async (params: {
  reportType: string;
  format: 'csv' | 'excel' | 'pdf';
  filters?: Record<string, any>;
}) => {
  return repo.exportAnalyticsData(params);
};

// -- Miscellaneous --
export const generateAITweet = async () => {
  return repo.triggerAITweet();
};

// -- Real-time Metrics Broadcasting --
/**
 * Broadcast real-time metrics update to admin dashboard
 * Call this whenever significant events occur (bet placed, user registered, etc.)
 */
export const broadcastRealtimeMetrics = async () => {
  try {
    // Get current real-time metrics
    const metrics = await repo.getRealtimeMetrics();

    // Publish to Redis for Socket.IO broadcasting
    await redisClient.publish(
      'admin:metrics:update',
      JSON.stringify({
        metrics,
        timestamp: new Date().toISOString(),
        type: 'realtime_update',
      }),
    );

    console.log('[admin-service] Broadcast real-time metrics update');
  } catch (error) {
    console.error('[admin-service] Error broadcasting metrics:', error);
  }
};
