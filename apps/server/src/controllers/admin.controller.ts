// apps/server/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { payoutService } from '../services/payout.service';
import { adminAchievementService } from '../services/achievements/adminAchievement.service';
import { shameWallService } from '../services/shameWall.service';
import { RuleSimulationService } from '../services/achievements/ruleSimulation.service';

const ruleSimulationService = new RuleSimulationService();
import { serializeBigInt } from '../utils/bigintSerializer';
import {
  toAdminUserView,
  toAdminBetView,
  toAdminTransactionView,
  toAdminUserSearchResponse,
  toAdminFinancialDataResponse,
  toAdminFinancialAnalyticsResponse,
  toAdminBulkPredictionsResponse,
  toAdminAchievementView,
  toAdminBulkOperationResponse,
  toAdminUserAchievementView,
  toAdminAchievementAnalyticsResponse,
  toAdminBanHistoryView,
} from '../view/admin.view';
import { AdminActions } from '@ems/types';
import type { JsonRuleAchievementData } from '@ems/types';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  PublicUserBadge,
  AdminTransactionView,
  AdminUserView,
  AdminBetView,
  AdminUserSearchResponse,
  AdminFinancialDataResponse,
  AdminFinancialAnalyticsResponse,
  AdminBulkPredictionsResponse,
  AdminAchievementView,
  AdminBulkOperationResponse,
  AdminUserAchievementView,
  AdminAchievementAnalyticsResponse,
  AdminBanHistoryView,
} from '@ems/types';
import type { Role } from '@prisma/client';
import type {
  QueryParams,
  UserSearchParams,
  BulkUserOperation,
  PredictionSearchParams,
  BulkPredictionOperation,
} from '../repositories/interfaces/IAdminRepository';

// -- Enhanced User Management --
export async function getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Log permission check for audit trail
    const authReq = req as any;
    console.log(
      `[admin-rbac] ${AdminActions.ManageUsers} requested by user ${authReq.user?.id} (role: ${authReq.user?.role})`,
    );

    // RBAC: Only ADMIN role can manage users
    // This is enforced by requireAdmin middleware, but logged here for audit
    const users: PublicUser[] = await adminService.listUsers();
    const payload = users.map(toAdminUserView) satisfies AdminUserView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params: UserSearchParams = {
      search: req.query.search as string,
      role: req.query.role
        ? ((Array.isArray(req.query.role) ? req.query.role : [req.query.role]) as any)
        : undefined,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      bannedOnly: req.query.bannedOnly === 'true',
      page: parseInt(req.query.page as string) || 0,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await adminService.searchUsers(params);
    const payload = toAdminUserSearchResponse(result) satisfies AdminUserSearchResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getUserDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = parseInt(req.params.userId);
    const user = await adminService.getUserDetails(userId);

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdateUsers(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const operation: BulkUserOperation = req.body;

    // Validate the operation
    if (!operation.userIds || !Array.isArray(operation.userIds) || operation.userIds.length === 0) {
      res.status(400).json({ error: 'userIds array is required and cannot be empty' });
      return;
    }

    if (operation.userIds.length > 100) {
      res.status(400).json({ error: 'Cannot update more than 100 users at once' });
      return;
    }

    const result = await adminService.bulkUpdateUsers(operation);
    const payload = toAdminBulkOperationResponse(result) satisfies AdminBulkOperationResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { role } = req.body as { role: Role };
    const updated: PublicUser = await adminService.changeUserRole(userId, role);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function activateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { active } = req.body as { active: boolean };
    const updated: PublicUser = await adminService.setUserActive(userId, active);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function updateUserBalance(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { amount } = req.body as { amount: number };
    const updated: PublicUser = await adminService.adjustUserBalance(userId, amount);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// -- Enhanced Prediction Management --
export async function getPredictions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.query as unknown as QueryParams;
    const preds: PublicPrediction[] = await adminService.listPredictions(filters);
    res.json(preds);
  } catch (err) {
    next(err);
  }
}

export async function searchPredictions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params: PredictionSearchParams = {
      search: req.query.search as string,
      category: req.query.category
        ? ((Array.isArray(req.query.category)
            ? req.query.category
            : [req.query.category]) as string[])
        : undefined,
      status: req.query.status
        ? ((Array.isArray(req.query.status) ? req.query.status : [req.query.status]) as any)
        : undefined,
      creatorId: req.query.creatorId ? parseInt(req.query.creatorId as string) : undefined,
      dateRange:
        req.query.startDate || req.query.endDate
          ? {
              start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
              end: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
            }
          : undefined,
      bettingVolume:
        req.query.minVolume || req.query.maxVolume
          ? {
              min: req.query.minVolume ? parseFloat(req.query.minVolume as string) : undefined,
              max: req.query.maxVolume ? parseFloat(req.query.maxVolume as string) : undefined,
            }
          : undefined,
      page: parseInt(req.query.page as string) || 0,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const result = await adminService.searchPredictions(params);

    // Use the existing BigInt serialization utility
    const serializedResult = serializeBigInt(result);
    res.json(serializedResult);
  } catch (err) {
    next(err);
  }
}

export async function getPredictionDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const predictionId = parseInt(req.params.predictionId);
    const prediction = await adminService.getPredictionDetails(predictionId);

    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }

    res.json(serializeBigInt(prediction));
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdatePredictions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const operation: BulkPredictionOperation = req.body;

    // Validate the operation
    if (
      !operation.predictionIds ||
      !Array.isArray(operation.predictionIds) ||
      operation.predictionIds.length === 0
    ) {
      res.status(400).json({ error: 'predictionIds array is required and cannot be empty' });
      return;
    }

    if (operation.predictionIds.length > 100) {
      res.status(400).json({ error: 'Cannot update more than 100 predictions at once' });
      return;
    }

    const result = await adminService.bulkUpdatePredictions(operation);
    const payload = toAdminBulkPredictionsResponse(result) satisfies AdminBulkPredictionsResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function approvePrediction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const updated: PublicPrediction = await adminService.setPredictionStatus(id, 'approved');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function rejectPrediction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const id = Number(req.params.id);
    const updated: PublicPrediction = await adminService.setPredictionStatus(id, 'rejected');
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function resolvePrediction(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    console.log(
      `[admin-rbac] ${AdminActions.ManagePredictions} requested by user ${(req as any).user?.id} (role: ${(req as any).user?.role})`,
    );

    const id = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    // enqueue the payout job (no return value)
    await payoutService.resolvePrediction(id, winningOptionId);
    // 202 Accepted indicates "we got it, working in background"
    res.status(202).json({ message: 'Payout job enqueued' });
  } catch (err) {
    next(err);
  }
}

// -- Bet & Transaction Oversight --
export async function getBets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    console.log(
      `[admin-rbac] ${AdminActions.ManageBets} requested by user ${(req as any).user?.id} (role: ${(req as any).user?.role})`,
    );

    const filters = req.query as unknown as QueryParams;
    const bets = await adminService.listBets(filters);
    const payload = bets.map(toAdminBetView) satisfies AdminBetView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function refundBet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    const updated: PublicBet = await adminService.refundBet(id);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

export async function getTransactions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = req.query as unknown as QueryParams;
    const txns: PublicTransaction[] = await adminService.listTransactions(filters);
    const users: PublicUser[] = await adminService.listUsers();

    const payload = txns.map((t) =>
      toAdminTransactionView({
        ...t,
        userName: users.find((u) => u.id === t.userId)?.name ?? 'Unknown',
      }),
    ) satisfies AdminTransactionView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

// -- Enhanced Financial Operations Dashboard --
export async function searchFinancialData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Map query parameters to typed FinancialSearchParams
    const params = {
      search: req.query.search as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      predictionId: req.query.predictionId ? parseInt(req.query.predictionId as string) : undefined,
      betType: req.query.betType
        ? ((Array.isArray(req.query.betType) ? req.query.betType : [req.query.betType]) as any)
        : undefined,
      status: req.query.status
        ? ((Array.isArray(req.query.status) ? req.query.status : [req.query.status]) as any)
        : undefined,
      transactionType: req.query.transactionType
        ? ((Array.isArray(req.query.transactionType)
            ? req.query.transactionType
            : [req.query.transactionType]) as any)
        : undefined,
      transactionSubtype: req.query.transactionSubtype
        ? ((Array.isArray(req.query.transactionSubtype)
            ? req.query.transactionSubtype
            : [req.query.transactionSubtype]) as any)
        : undefined,
      includePongTransactions: req.query.includePongTransactions === 'true',
      includeMetadata: req.query.includeMetadata === 'true',
      minAmount: req.query.minAmount ? parseFloat(req.query.minAmount as string) : undefined,
      maxAmount: req.query.maxAmount ? parseFloat(req.query.maxAmount as string) : undefined,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      suspiciousOnly: req.query.suspiciousOnly === 'true',
      page: parseInt(req.query.page as string) || 0,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc',
    };

    const data = await adminService.searchFinancialData(params);
    const payload = toAdminFinancialDataResponse(data) satisfies AdminFinancialDataResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getFinancialAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = req.query as unknown as any;
    const analytics = await adminService.getFinancialAnalytics(params);
    const payload = toAdminFinancialAnalyticsResponse(
      analytics,
    ) satisfies AdminFinancialAnalyticsResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

// NEW: Unified Analytics endpoint for cross-transaction insights
export async function getUnifiedAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { startDate, endDate, includeHourlyTrends, includeRiskMetrics, topUsersLimit } =
      req.query;

    const params = {
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      includeHourlyTrends: includeHourlyTrends === 'true',
      includeRiskMetrics: includeRiskMetrics === 'true',
      topUsersLimit: topUsersLimit ? parseInt(topUsersLimit as string) : 10,
    };

    const analytics = await adminService.getUnifiedAnalytics(params);
    res.json(analytics); // Return directly as the repository already formats it correctly
  } catch (err) {
    next(err);
  }
}

export async function bulkFinancialOperation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const operation = req.body;
    const result = await adminService.bulkFinancialOperation(operation);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportFinancialData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = req.query as unknown as any;
    const result = await adminService.exportFinancialData(params);

    // Set appropriate headers for file download
    const format = params.format || 'csv';
    const dataType = params.dataType || 'bets';
    const filename = `financial_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`;

    res.setHeader(
      'Content-Type',
      format === 'csv'
        ? 'text/csv'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(result);
  } catch (err) {
    next(err);
  }
}

// -- Enhanced Badge & Achievement System --
export async function searchBadges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as any;
    const badges = await adminService.searchBadges(params);
    res.json(badges);
  } catch (err) {
    next(err);
  }
}

export async function getBadgeDetails(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const badgeId = Number(req.params.badgeId);
    const badge = await adminService.getBadgeWithDetails(badgeId);
    if (!badge) {
      res.status(404).json({ error: 'Badge not found' });
      return;
    }
    res.json(badge);
  } catch (err) {
    next(err);
  }
}

export async function createBadgeWithCategories(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body;
    const badge = await adminService.createBadgeWithCategories(data);
    res.status(201).json(badge);
  } catch (err) {
    next(err);
  }
}

export async function updateBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const badgeId = Number(req.params.badgeId);
    const data = req.body;
    const badge = await adminService.updateBadge(badgeId, data);
    res.json(badge);
  } catch (err) {
    next(err);
  }
}

export async function deleteBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const badgeId = Number(req.params.badgeId);
    await adminService.deleteBadge(badgeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getBadgeAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const badgeId = req.query.badgeId ? Number(req.query.badgeId) : undefined;
    const analytics = await adminService.getBadgeAnalytics(badgeId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function bulkBadgeOperation(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const operation = req.body;
    const result = await adminService.bulkBadgeOperation(operation);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBadgeCategories(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const categories = await adminService.getBadgeCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

export async function createBadgeCategory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body;
    const category = await adminService.createBadgeCategory(data);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

// -- Advanced Analytics & Reporting --
export async function getExecutiveDashboard(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month',
    };

    const dashboard = await adminService.getExecutiveDashboard(params);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getUserBehaviorAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month',
    };

    const analytics = await adminService.getUserBehaviorAnalytics(params);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function getPredictiveAnalytics(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month',
    };

    const analytics = await adminService.getPredictiveAnalytics(params);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function generateCustomReport(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { reportType } = req.params;
    const params = req.query as Record<string, any>;

    const report = await adminService.generateCustomReport(reportType, params);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function getRealtimeMetrics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const metrics = await adminService.getRealtimeMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function exportAnalyticsData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { reportType, format } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : {};

    const data = await adminService.exportAnalyticsData({
      reportType: reportType as string,
      format: format as 'csv' | 'excel' | 'pdf',
      filters,
    });

    // Set appropriate headers for file download
    const filename = `analytics_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType =
      format === 'csv'
        ? 'text/csv'
        : format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(data);
  } catch (err) {
    next(err);
  }
}

// -- Legacy Badge & Content Moderation (deprecated) --
export async function getPosts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = req.query as unknown as QueryParams;
    const posts = await adminService.listPosts(filters);
    res.json(posts);
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = Number(req.params.id);
    await adminService.removePost(id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getBadges(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const raw = await adminService.listBadges();
    const badges: PublicBadge[] = raw.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      iconUrl: b.iconUrl,
      createdAt: b.createdAt.toISOString(),
    }));
    res.json(badges);
  } catch (err) {
    next(err);
  }
}

export async function createBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body as { name: string; description?: string; iconUrl?: string };
    const b = await adminService.createBadge(data);
    const badge: PublicBadge = {
      id: b.id,
      name: b.name,
      description: b.description,
      iconUrl: b.iconUrl,
      createdAt: b.createdAt.toISOString(),
    };
    res.status(201).json(badge);
  } catch (err) {
    next(err);
  }
}

export async function assignBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const { badgeId } = req.body as { badgeId: number };
    const rawUB = await adminService.assignBadge(userId, badgeId);
    const allBadges = await adminService.listBadges();
    const b = allBadges.find((x) => x.id === badgeId)!;

    const ub: PublicUserBadge = {
      id: rawUB.id,
      name: b.name,
      description: b.description,
      iconUrl: b.iconUrl,
      createdAt: b.createdAt.toISOString(),
      awardedAt: rawUB.awardedAt.toISOString(),
    };
    res.json(ub);
  } catch (err) {
    next(err);
  }
}

export async function revokeBadge(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.id);
    const badgeId = Number(req.params.badgeId);
    await adminService.revokeBadge(userId, badgeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    // Call the service, not the controller itself
    const stats = await adminService.getUserStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// -- Miscellaneous --

// -- Achievement Management System --

export async function getAllAchievements(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievements = await adminAchievementService.getAllAchievements();
    const payload = achievements.map(toAdminAchievementView) satisfies AdminAchievementView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getAchievementById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);

    if (isNaN(achievementId)) {
      res.status(400).json({ error: 'Invalid achievement ID' });
      return;
    }

    const achievement = await adminAchievementService.getAchievementById(achievementId);

    if (!achievement) {
      res.status(404).json({ error: 'Achievement not found' });
      return;
    }

    const payload = toAdminAchievementView(achievement) satisfies AdminAchievementView;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function createAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = req.body;
    const achievement = await adminAchievementService.createAchievement(data);
    const payload = toAdminAchievementView(achievement) satisfies AdminAchievementView;
    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
}

export async function updateAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    const data = req.body;
    const achievement = await adminAchievementService.updateAchievement(achievementId, data);
    const payload = toAdminAchievementView(achievement) satisfies AdminAchievementView;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function deleteAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    await adminAchievementService.deleteAchievement(achievementId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function grantAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await adminAchievementService.grantAchievement(achievementId, userId);
    res.status(200).json({ message: 'Achievement granted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function revokeAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    await adminAchievementService.revokeAchievement(achievementId, userId);
    res.status(200).json({ message: 'Achievement revoked successfully' });
  } catch (err) {
    next(err);
  }
}

export async function bulkGrantAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    const { userIds } = req.body;

    if (!Array.isArray(userIds)) {
      res.status(400).json({ error: 'userIds must be an array' });
      return;
    }

    const result = await adminAchievementService.bulkGrantAchievement(achievementId, userIds);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUsersWithAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const achievementId = parseInt(req.params.id);
    const users = await adminAchievementService.getUsersWithAchievement(achievementId);
    const payload = users.map(toAdminUserAchievementView) satisfies AdminUserAchievementView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getAchievementAnalytics(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const analytics = await adminAchievementService.getAchievementAnalytics();
    const payload = toAdminAchievementAnalyticsResponse(
      analytics,
    ) satisfies AdminAchievementAnalyticsResponse;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

// -- Shame Wall Management System --

export async function issueBan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { userId, reason, durationDays } = req.body;
    const moderatorId = (req as any).user?.id; // From auth middleware

    if (!moderatorId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!userId || !reason) {
      res.status(400).json({ error: 'userId and reason are required' });
      return;
    }

    const banHistory = await shameWallService.issueBan({
      userId: parseInt(userId),
      reason,
      durationDays: durationDays ? parseInt(durationDays) : undefined,
      moderatorId,
    });

    const payload = toAdminBanHistoryView(banHistory) satisfies AdminBanHistoryView;
    res.status(201).json(payload);
  } catch (err) {
    next(err);
  }
}

export async function liftBan(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banId = parseInt(req.params.banId);
    const moderatorId = (req as any).user?.id;
    const { reason } = req.body;

    if (!moderatorId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await shameWallService.liftBan(banId, moderatorId, reason);
    res.status(200).json({ message: 'Ban lifted successfully' });
  } catch (err) {
    next(err);
  }
}

export async function getBanHistory(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const history = await shameWallService.getBanHistory();
    const payload = history.map(toAdminBanHistoryView) satisfies AdminBanHistoryView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function awardShameAchievement(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, slug, reason } = req.body;
    const moderatorId = (req as any).user?.id;

    if (!moderatorId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    await shameWallService.awardShameAchievement(parseInt(userId), slug, moderatorId, reason);

    res.status(200).json({ message: 'Shame achievement awarded' });
  } catch (err) {
    next(err);
  }
}

export const simulateRule = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rule, events, scenario, eventCount } = req.body;

    if (!rule) {
      res.status(400).json({ error: 'Rule is required' });
      return;
    }

    let simulationEvents = events;

    if (!simulationEvents) {
      simulationEvents = await ruleSimulationService.generateTestEvents(
        rule as JsonRuleAchievementData,
        scenario || 'mixed',
        eventCount || 50,
      );
    }

    const result = await ruleSimulationService.simulateRule(
      rule as JsonRuleAchievementData,
      simulationEvents,
    );

    res.json({
      success: true,
      simulation: result,
      generatedEvents: !events,
    });
  } catch (err) {
    console.error('Rule simulation failed:', err);
    next(err);
  }
};

export const generateTestEvents = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rule, scenario, eventCount } = req.body;

    if (!rule) {
      res.status(400).json({ error: 'Rule is required' });
      return;
    }

    const events = await ruleSimulationService.generateTestEvents(
      rule as JsonRuleAchievementData,
      scenario || 'mixed',
      eventCount || 50,
    );

    res.json({
      success: true,
      events,
      scenario: scenario || 'mixed',
      count: events.length,
    });
  } catch (err) {
    console.error('Test event generation failed:', err);
    next(err);
  }
};

export const quickSimulate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const { rule } = req.body;

    if (!rule) {
      res.status(400).json({ error: 'Rule is required' });
      return;
    }

    const scenarios = ['success', 'failure', 'mixed'] as const;
    const results: Record<string, any> = {};

    for (const scenario of scenarios) {
      const events = await ruleSimulationService.generateTestEvents(
        rule as JsonRuleAchievementData,
        scenario,
        30,
      );
      const result = await ruleSimulationService.simulateRule(
        rule as JsonRuleAchievementData,
        events,
      );

      results[scenario] = {
        ...result,
        eventCount: events.length,
      };
    }

    res.json({
      success: true,
      scenarios: results,
      rule: {
        eventKeys: rule.eventKeys,
        progressType: rule.progress.kind,
        complexity: results.mixed.complexity,
      },
    });
  } catch (err) {
    console.error('Quick simulation failed:', err);
    next(err);
  }
};

// ——————————————————————————————————————————————————————————————————————————————
// Unified Content Management Endpoints (Deprecated - service removed)
// ——————————————————————————————————————————————————————————————————————————————
