// apps/server/src/middleware/auth.middleware.ts
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

/**
 * Protect any route that requires a valid access token.
 */
export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  try {
    const token = auth.split(' ')[1];
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as { userId: number };

    const user = await getUserById(payload.userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = { id: payload.userId, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

/**
 * Ensure the authenticated user is an ADMIN.
 */
export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // first, make sure they passed requireAuth
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const user = await getUserById(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  if (user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Admin only' });
    return;
  }

  next();
};
