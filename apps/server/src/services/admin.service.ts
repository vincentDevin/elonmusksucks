// apps/server/src/services/admin.service.ts
import type { Role } from '@prisma/client';
import type { IAdminRepository } from '../repositories/interfaces/IAdminRepository';
import type {
  QueryParams,
  UserSearchParams,
  PaginatedUsers,
  DetailedUser,
  PredictionSearchParams,
} from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import type {
  BulkUserOperation,
  BulkOperationResult,
  PaginatedPredictions,
  DetailedPrediction,
  BulkPredictionOperation,
  BulkPredictionResult,
} from '../repositories/interfaces/IAdminRepository';
import { PrismaAdminRepository } from '../repositories/AdminRepository';
import type { UserStatsDTO } from '@ems/types';
import { eventBus } from '../lib/EventBus';

const repo: IAdminRepository = new PrismaAdminRepository();

// -- Enhanced User Management --
export const listUsers = async () => {
  // Legacy method - kept for backward compatibility
  return repo.findAllUsers();
};

export const searchUsers = async (params: UserSearchParams): Promise<PaginatedUsers> => {
  return repo.searchUsers(params);
};

export const getUserDetails = async (userId: number): Promise<DetailedUser | null> => {
  const user = await repo.getUserWithDetails(userId);

  if (!user) return null;

  // Transform stats to match UserStatsDTO format if stats exist
  if (user.stats) {
    // Calculate winRate properly (same logic as getUserStats)
    const totalBets = user.stats.totalBets;
    const betsWon = user.stats.betsWon;
    const winRate = totalBets > 0 ? (betsWon / totalBets) * 100 : 0;

    // Calculate ROI properly
    const totalWagered = user.stats.totalWagered || BigInt(0);
    const profit = user.stats.profit || BigInt(0);
    const roi = totalWagered > BigInt(0) ? (Number(profit) / Number(totalWagered)) * 100 : 0;

    const transformedStats = {
      totalBets: user.stats.totalBets,
      betsWon: user.stats.betsWon,
      betsLost: user.stats.betsLost,
      totalParlays: user.stats.totalParlays,
      parlaysWon: user.stats.parlaysWon,
      parlaysLost: user.stats.parlaysLost,
      totalParlayLegs: user.stats.totalParlayLegs,
      parlayLegsWon: user.stats.parlayLegsWon,
      parlayLegsLost: user.stats.parlayLegsLost,
      totalWagered: user.stats.totalWagered.toString(),
      totalWinnings: user.stats.totalWon.toString(),
      totalLosses: (user.stats.totalWagered - user.stats.totalWon).toString(),
      netProfit: user.stats.profit.toString(),
      currentStreak: user.stats.currentStreak,
      longestWinStreak: user.stats.longestStreak || 0,
      longestLoseStreak: user.stats.longestLoseStreak || 0,
      averageBetSize: (user.stats.totalBets > 0
        ? user.stats.totalWagered / BigInt(user.stats.totalBets)
        : BigInt(0)
      ).toString(),
      averageOdds: user.stats.averageOdds || 0,
      biggestWin: user.stats.biggestWin?.toString() || '0',
      biggestLoss: user.stats.biggestLoss?.toString() || '0',
      winRate: winRate, // Calculated percentage (0-100)
      roi: roi, // Calculated percentage
    };

    return {
      ...user,
      stats: transformedStats as any,
    };
  }

  return user;
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
    for (const prediction of result.updatedPredictions) {
      if (operation.operation === 'approve') {
        await eventBus.publish(REDIS_CHANNELS.PREDICTION_APPROVED, {
          id: prediction.id,
          title: prediction.title,
          categoryId: prediction.categoryId,
          timestamp: new Date().toISOString(),
        });

        // Publish JSON rule achievement event for bulk prediction approval
        try {
          await eventBus.publish(REDIS_CHANNELS.PREDICTION_APPROVED, {
            key: 'prediction:approved',
            userId: prediction.creatorId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `prediction:${prediction.id}:approved:bulk`,
            payload: {
              predictionId: prediction.id,
              title: prediction.title,
              categoryId: prediction.categoryId,
              bulkOperation: true,
            },
          });
        } catch (achievementError) {
          console.error(
            '[admin] Error publishing bulk prediction approval achievement event:',
            achievementError,
          );
        }
      } else if (operation.operation === 'reject') {
        await eventBus.publish(REDIS_CHANNELS.PREDICTION_REJECTED, {
          id: prediction.id,
          title: prediction.title,
          categoryId: prediction.categoryId,
          reason: operation.params?.reason ?? null,
          timestamp: new Date().toISOString(),
        });
      } else if (operation.operation === 'resolve') {
        await eventBus.publish(REDIS_CHANNELS.PREDICTION_RESOLVE, {
          id: prediction.id,
          title: prediction.title,
          winningOptionId: prediction.resolutionData?.winningOptionId,
          timestamp: new Date().toISOString(),
        });

        // Publish JSON rule achievement event for prediction resolution
        try {
          await eventBus.publish(REDIS_CHANNELS.PREDICTION_RESOLVE, {
            key: 'prediction:resolved',
            userId: prediction.creatorId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `prediction:${prediction.id}:resolved:bulk`,
            payload: {
              predictionId: prediction.id,
              title: prediction.title,
              categoryId: prediction.categoryId,
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
    await eventBus.publish(REDIS_CHANNELS.PREDICTION_APPROVED, {
      id: updated.id,
      title: updated.title,
      description: updated.description,
      categoryId: updated.categoryId,
      type: updated.type,
      approved: true,
      timestamp: new Date().toISOString(),
    });

    // Publish JSON rule achievement event for prediction approval
    try {
      await eventBus.publish(REDIS_CHANNELS.PREDICTION_APPROVED, {
        key: 'prediction:approved',
        userId: updated.creatorId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `prediction:${updated.id}:approved`,
        payload: {
          predictionId: updated.id,
          title: updated.title,
          categoryId: updated.categoryId,
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

// NEW: Unified Analytics endpoint
export const getUnifiedAnalytics = async (params: any) => {
  return repo.getUnifiedAnalytics(params);
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

/**
 * Fetches raw stats, then maps Date→ISO and returns the DTO.
 */
export const getUserStats = async (userId: number): Promise<UserStatsDTO | null> => {
  const raw = await repo.findUserStats(userId);
  if (!raw) return null;

  // Calculate derived fields
  const totalWinnings = raw.totalWon || BigInt(0);
  const totalWagered = raw.totalWagered || BigInt(0);
  const netProfit = raw.profit || BigInt(0);
  const totalLosses = totalWagered - totalWinnings; // wagered - winnings = losses
  const averageBetSize = raw.totalBets > 0 ? totalWagered / BigInt(raw.totalBets) : BigInt(0);
  const winRate = raw.totalBets > 0 ? (raw.betsWon / raw.totalBets) * 100 : 0;

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
    totalWagered: totalWagered.toString(),
    totalWinnings: totalWinnings.toString(),
    totalLosses: totalLosses.toString(),
    netProfit: netProfit.toString(),
    currentStreak: raw.currentStreak,
    longestWinStreak: raw.longestStreak || 0,
    longestLoseStreak: raw.longestLoseStreak || 0,
    averageBetSize: averageBetSize.toString(),
    averageOdds: raw.averageOdds || 0,
    biggestWin: raw.biggestWin?.toString() || '0',
    biggestLoss: raw.biggestLoss?.toString() || '0',
    winRate: winRate,
    roi: raw.roi,
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
    await eventBus.publish(REDIS_CHANNELS.ADMIN_METRICS_UPDATE, {
      metrics,
      timestamp: new Date().toISOString(),
      type: 'realtime_update',
    });

    console.log('[admin-service] Broadcast real-time metrics update');
  } catch (error) {
    console.error('[admin-service] Error broadcasting metrics:', error);
  }
};
