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

// -- Badge & Content Moderation --
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
