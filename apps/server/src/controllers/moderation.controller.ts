// apps/server/src/controllers/moderation.controller.ts
import { Request, Response, NextFunction } from 'express';
import { moderationService } from '../services/moderation.service';
import type { BanType } from '@ems/types';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    role: string;
  };
}

// Helper to extract IP and User-Agent
function getRequestMetadata(req: Request) {
  return {
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
  };
}

export async function banUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, banType, reason, duration } = req.body as {
      userId: number;
      banType: BanType;
      reason: string;
      duration?: number;
    };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    const ban = await moderationService.banUser({
      userId,
      moderatorId: req.user.id,
      banType,
      reason,
      duration,
      ipAddress,
      userAgent,
    });

    res.status(201).json(ban);
  } catch (err) {
    next(err);
  }
}

export async function unbanUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    await moderationService.unbanUser(userId, req.user.id, ipAddress, userAgent);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function muteUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, duration, reason } = req.body as {
      userId: number;
      duration: number;
      reason: string;
    };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    const ban = await moderationService.muteUser(
      userId,
      req.user.id,
      duration,
      reason,
      ipAddress,
      userAgent,
    );

    res.status(201).json(ban);
  } catch (err) {
    next(err);
  }
}

export async function kickUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { userId, reason } = req.body as {
      userId: number;
      reason: string;
    };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    await moderationService.kickUser(userId, req.user.id, reason, ipAddress, userAgent);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function deleteMessage(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const messageId = Number(req.params.messageId);
    const { reason } = req.body as { reason: string };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    await moderationService.deleteMessage(messageId, req.user.id, reason, ipAddress, userAgent);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function deletePost(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const postId = Number(req.params.postId);
    const { reason } = req.body as { reason: string };

    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { ipAddress, userAgent } = getRequestMetadata(req);

    await moderationService.deletePost(postId, req.user.id, reason, ipAddress, userAgent);

    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getActiveBans(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const bans = await moderationService.getActiveBans();
    res.json(bans);
  } catch (err) {
    next(err);
  }
}

export async function getUserBanStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const ban = await moderationService.getUserBanStatus(userId);
    res.json(ban);
  } catch (err) {
    next(err);
  }
}

export async function getModerationHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = req.query.targetUserId ? Number(req.query.targetUserId) : undefined;
    const moderatorId = req.query.moderatorId ? Number(req.query.moderatorId) : undefined;

    const history = await moderationService.getModerationHistory(targetUserId, moderatorId);
    res.json(history);
  } catch (err) {
    next(err);
  }
}

export async function getRecentModerationActions(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const actions = await moderationService.getRecentModerationActions(limit);
    res.json(actions);
  } catch (err) {
    next(err);
  }
}
