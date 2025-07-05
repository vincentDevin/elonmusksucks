// apps/server/src/controllers/admin.controller.ts
import { Request, Response, NextFunction } from 'express';
import * as adminService from '../services/admin.service';
import type {
  PublicUser,
  PublicPrediction,
  PublicBet,
  PublicTransaction,
  PublicBadge,
  PublicUserBadge,
  UserStatsDTO,
  PublicAITweet,
  AdminBet,
  AdminTransaction,
} from '@ems/types';
import { PredictionType } from '@ems/types';
import type { Role, Outcome } from '@prisma/client';
import type { QueryParams } from '../repositories/IAdminRepository';

// -- User Management --
export async function getUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users: PublicUser[] = await adminService.listUsers();
    res.json(users);
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

// -- Prediction Management --
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
    const { outcome } = req.body as { outcome: Outcome };
    const updated: PublicPrediction = await adminService.resolvePrediction(id, outcome);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// -- Bet & Transaction Oversight --
export async function getBets(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = req.query as unknown as QueryParams;

    // Fetch bets according to whatever filters (e.g. by user, by status)
    const bets: PublicBet[] = await adminService.listBets(filters);

    // As an admin, we want *all* predictions (no implicit approval filter)
    const preds: PublicPrediction[] = await adminService.listPredictions(filters);

    // And all users for enrichment
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
            outcome: null,
            resolvedAt: null,
            // new fields from PublicPrediction
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

    // fetch related users
    const users: PublicUser[] = await adminService.listUsers();

    // enrich each transaction with userName
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
    const raw = await adminService.getUserStats(userId);
    const stats: UserStatsDTO | null = raw
      ? {
          ...raw,
          updatedAt: raw.updatedAt.toISOString(),
        }
      : null;
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
