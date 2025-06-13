import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service';
type ReqWithUser = Request & { user?: { id: number } };

export async function getProfile(req: ReqWithUser, res: Response, next: NextFunction) {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const profileDTO = await userService.getUserProfile(targetUserId, viewerId);
    res.json(profileDTO);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:userId/follow
 */
export async function followUserHandler(req: ReqWithUser, res: Response, next: NextFunction) {
  try {
    const followerId = req.user?.id;
    const followingId = Number(req.params.userId);
    if (!followerId) throw new Error('Not authenticated');
    await userService.followUser(followerId, followingId);
    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/users/:userId/follow
 */
export async function unfollowUserHandler(req: ReqWithUser, res: Response, next: NextFunction) {
  try {
    const followerId = req.user?.id;
    const followingId = Number(req.params.userId);
    if (!followerId) throw new Error('Not authenticated');
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
export async function updateProfileHandler(req: ReqWithUser, res: Response, next: NextFunction) {
  try {
    const targetUserId = Number(req.params.userId);
    console.log(
      'Updating profile for userId param:',
      targetUserId,
      'authenticated userId:',
      req.user?.id,
    );
    if (req.user?.id !== targetUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    const updated = await userService.updateUserProfile(targetUserId, req.body);
    res.json(updated);
    return;
  } catch (err) {
    next(err);
  }
}
