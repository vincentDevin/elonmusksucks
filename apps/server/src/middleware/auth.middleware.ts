import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwtHelpers';
import { getUserById } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

// In-memory user cache to prevent redundant DB hits
// Cache structure: Map<userId, { user: { id, role }, timestamp: number }>
const userCache = new Map<number, { user: { id: number; role: string }; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [userId, entry] of userCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      userCache.delete(userId);
    }
  }
}, 60 * 1000); // Run cleanup every minute

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

    // Check cache first
    const cached = userCache.get(userId);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      req.user = cached.user;
      next();
      return;
    }

    // Cache miss or expired - fetch from DB
    const user = await getUserById(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Update cache
    const userData = { id: user.id, role: user.role };
    userCache.set(userId, { user: userData, timestamp: now });

    req.user = userData;
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
