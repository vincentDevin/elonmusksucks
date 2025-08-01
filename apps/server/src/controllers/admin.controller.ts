// apps/server/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import { payoutService } from '../services/payout.service';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  PublicUserBadge,
  PublicAITweet,
  AdminBet,
  AdminTransaction,
} from '@ems/types';
import { PredictionType } from '@ems/types';
import type { Role } from '@prisma/client';
import type { 
  QueryParams,
  UserSearchParams, 
  BulkUserOperation,
  PredictionSearchParams,
  BulkPredictionOperation
} from '../repositories/IAdminRepository';

// -- Enhanced User Management --
export async function getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Legacy endpoint - kept for backward compatibility
    const users: PublicUser[] = await adminService.listUsers();
    res.json(users);
  } catch (err) {
    next(err);
  }
}

export async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params: UserSearchParams = {
      search: req.query.search as string,
      role: req.query.role ? (Array.isArray(req.query.role) ? req.query.role : [req.query.role]) as any : undefined,
      active: req.query.active !== undefined ? req.query.active === 'true' : undefined,
      bannedOnly: req.query.bannedOnly === 'true',
      page: parseInt(req.query.page as string) || 0,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc'
    };

    const result = await adminService.searchUsers(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
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

export async function bulkUpdateUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
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
    res.json(result);
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

export async function searchPredictions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params: PredictionSearchParams = {
      search: req.query.search as string,
      category: req.query.category ? (Array.isArray(req.query.category) ? req.query.category : [req.query.category]) as string[] : undefined,
      status: req.query.status ? (Array.isArray(req.query.status) ? req.query.status : [req.query.status]) as any : undefined,
      creatorId: req.query.creatorId ? parseInt(req.query.creatorId as string) : undefined,
      dateRange: req.query.startDate || req.query.endDate ? {
        start: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        end: req.query.endDate ? new Date(req.query.endDate as string) : undefined
      } : undefined,
      bettingVolume: req.query.minVolume || req.query.maxVolume ? {
        min: req.query.minVolume ? parseFloat(req.query.minVolume as string) : undefined,
        max: req.query.maxVolume ? parseFloat(req.query.maxVolume as string) : undefined
      } : undefined,
      page: parseInt(req.query.page as string) || 0,
      limit: parseInt(req.query.limit as string) || 25,
      sortBy: (req.query.sortBy as any) || 'createdAt',
      sortOrder: (req.query.sortOrder as any) || 'desc'
    };

    const result = await adminService.searchPredictions(params);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getPredictionDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const predictionId = parseInt(req.params.predictionId);
    const prediction = await adminService.getPredictionDetails(predictionId);
    
    if (!prediction) {
      res.status(404).json({ error: 'Prediction not found' });
      return;
    }
    
    res.json(prediction);
  } catch (err) {
    next(err);
  }
}

export async function bulkUpdatePredictions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const operation: BulkPredictionOperation = req.body;
    
    // Validate the operation
    if (!operation.predictionIds || !Array.isArray(operation.predictionIds) || operation.predictionIds.length === 0) {
      res.status(400).json({ error: 'predictionIds array is required and cannot be empty' });
      return;
    }
    
    if (operation.predictionIds.length > 100) {
      res.status(400).json({ error: 'Cannot update more than 100 predictions at once' });
      return;
    }
    
    const result = await adminService.bulkUpdatePredictions(operation);
    res.json(result);
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
    const id = Number(req.params.id);
    const { winningOptionId } = req.body as { winningOptionId: number };
    // enqueue the payout job (no return value)
    await payoutService.resolvePrediction(id, winningOptionId);
    // 202 Accepted indicates “we got it, working in background”
    res.status(202).json({ message: 'Payout job enqueued' });
  } catch (err) {
    next(err);
  }
}

// -- Bet & Transaction Oversight --
export async function getBets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = req.query as unknown as QueryParams;
    const bets: PublicBet[] = await adminService.listBets(filters);
    const preds: PublicPrediction[] = await adminService.listPredictions(filters);
    const users: PublicUser[] = await adminService.listUsers();

    const detailed: AdminBet[] = bets.map((b) => {
      const matching = preds.find((p) => p.id === b.predictionId);
      return {
        ...b,
        userName: users.find((u) => u.id === b.userId)?.name ?? 'Unknown',
        prediction:
          matching ??
          ({
            id: b.predictionId,
            title: 'Unknown prediction',
            description: '',
            category: '',
            expiresAt: new Date(),
            approved: false,
            resolved: false,
            type: PredictionType.MULTIPLE,
            threshold: null,
            creatorId: 0,
          } as PublicPrediction),
      };
    });

    res.json(detailed);
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

    const detailedTxns: AdminTransaction[] = txns.map((t) => ({
      ...t,
      userName: users.find((u) => u.id === t.userId)?.name ?? 'Unknown',
    }));

    res.json(detailedTxns);
  } catch (err) {
    next(err);
  }
}

// -- Enhanced Financial Operations Dashboard --
export async function searchFinancialData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as any; // Will be typed properly in service
    const data = await adminService.searchFinancialData(params);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getFinancialAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as any;
    const analytics = await adminService.getFinancialAnalytics(params);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function bulkFinancialOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const operation = req.body;
    const result = await adminService.bulkFinancialOperation(operation);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function exportFinancialData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = req.query as unknown as any;
    const result = await adminService.exportFinancialData(params);
    
    // Set appropriate headers for file download
    const format = params.format || 'csv';
    const dataType = params.dataType || 'bets';
    const filename = `financial_${dataType}_${new Date().toISOString().split('T')[0]}.${format}`;
    
    res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
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

export async function getBadgeDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
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

export async function createBadgeWithCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
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

export async function getBadgeAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const badgeId = req.query.badgeId ? Number(req.query.badgeId) : undefined;
    const analytics = await adminService.getBadgeAnalytics(badgeId);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function bulkBadgeOperation(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const operation = req.body;
    const result = await adminService.bulkBadgeOperation(operation);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBadgeCategories(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const categories = await adminService.getBadgeCategories();
    res.json(categories);
  } catch (err) {
    next(err);
  }
}

export async function createBadgeCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = req.body;
    const category = await adminService.createBadgeCategory(data);
    res.status(201).json(category);
  } catch (err) {
    next(err);
  }
}

// -- Advanced Analytics & Reporting --
export async function getExecutiveDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month'
    };
    
    const dashboard = await adminService.getExecutiveDashboard(params);
    res.json(dashboard);
  } catch (err) {
    next(err);
  }
}

export async function getUserBehaviorAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month'
    };
    
    const analytics = await adminService.getUserBehaviorAnalytics(params);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function getPredictiveAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const params = {
      startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
      endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      category: req.query.category as string,
      userId: req.query.userId ? parseInt(req.query.userId as string) : undefined,
      granularity: req.query.granularity as 'day' | 'week' | 'month'
    };
    
    const analytics = await adminService.getPredictiveAnalytics(params);
    res.json(analytics);
  } catch (err) {
    next(err);
  }
}

export async function generateCustomReport(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reportType } = req.params;
    const params = req.query as Record<string, any>;
    
    const report = await adminService.generateCustomReport(reportType, params);
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function getRealtimeMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const metrics = await adminService.getRealtimeMetrics();
    res.json(metrics);
  } catch (err) {
    next(err);
  }
}

export async function exportAnalyticsData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { reportType, format } = req.query;
    const filters = req.query.filters ? JSON.parse(req.query.filters as string) : {};
    
    const data = await adminService.exportAnalyticsData({
      reportType: reportType as string,
      format: format as 'csv' | 'excel' | 'pdf',
      filters
    });
    
    // Set appropriate headers for file download
    const filename = `analytics_${reportType}_${new Date().toISOString().split('T')[0]}.${format}`;
    const contentType = format === 'csv' ? 'text/csv' : 
                       format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                       'application/pdf';
    
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

// -- Leaderboard & Stats --
export async function refreshLeaderboard(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminService.refreshLeaderboard();
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
export async function triggerAITweet(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tweet: PublicAITweet = await adminService.generateAITweet();
    res.status(201).json(tweet);
  } catch (err) {
    next(err);
  }
}
