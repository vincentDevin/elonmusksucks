// apps/server/src/middleware/activity.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';

const userService = new UserService();

/**
 * Usage:
 *   router.post('/foo', requireAuth, handler, trackUserActivity('FOO_CREATED'))
 *   or
 *   router.post('/bar', requireAuth, handler, trackUserActivity((req, res) => ...))
 */
export function trackUserActivity(
  typeOrFn: string | ((req: Request, res: Response) => { type: string; details?: any }),
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) return next();
      let type: string, details: any;

      if (typeof typeOrFn === 'function') {
        const result = typeOrFn(req, res);
        type = result.type;
        details = result.details;
      } else {
        type = typeOrFn;
        details = res.locals.activityDetails || undefined; // You can set res.locals.activityDetails in controller if needed
      }

      await userService.createUserActivity(userId, type, details);
      next();
    } catch (err) {
      // Activity is not mission-critical—don’t block main action
      next();
    }
  };
}
