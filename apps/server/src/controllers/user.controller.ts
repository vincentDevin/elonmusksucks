import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import type { UserProfileDTO } from '../services/user.service';

type ReqWithUser = Request & { user?: { id: number } };

// Instantiate the service (uses Prisma-backed repository by default)
const userService = new UserService();

/**
 * GET /api/users/:userId
 * Fetch a user's profile
 */
export async function getProfile(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const profileDTO: UserProfileDTO = await userService.getUserProfile(targetUserId, viewerId);
    res.json(profileDTO);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:userId/follow
 * Authenticated user follows another user
 */
export async function followUserHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const followerId = req.user?.id;
    const followingId = Number(req.params.userId);
    if (!followerId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await userService.followUser(followerId, followingId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:userId/follow
 * Authenticated user unfollows another user
 */
export async function unfollowUserHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const followerId = req.user?.id;
    const followingId = Number(req.params.userId);
    if (!followerId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    await userService.unfollowUser(followerId, followingId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/users/:userId
 * Update profile for the authenticated user
 */
export async function updateProfileHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const authUserId = req.user?.id;

    if (authUserId !== targetUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    const updated: UserProfileDTO = await userService.updateUserProfile(targetUserId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}
