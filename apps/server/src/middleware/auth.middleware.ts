import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwtHelpers';
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
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing access token' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const { userId } = verifyAccessToken(token);

    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = { id: user.id, role: user.role };
    next();
    return;
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }
};

/**
 * Ensure the authenticated user is an ADMIN.
 */
export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (req.user.role !== 'ADMIN') {
    res.status(403).json({ error: 'Forbidden: Admin only' });
    return;
  }

  next();
  return;
};
