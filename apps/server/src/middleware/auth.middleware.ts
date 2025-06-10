import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getUserById } from '../services/auth.service';

export interface AuthRequest extends Request {
  user?: { id: number; role: string };
}

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
    // attach authenticated user to request
    req.user = { id: payload.userId, role: user.role };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired access token' });
  }
};

export const requireAdmin = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  // ensure authenticated
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
    res.status(403).json({ error: 'Forbidden: admin only' });
    return;
  }
  next();
};
