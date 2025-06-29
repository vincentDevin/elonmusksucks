import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import type { PublicUserProfile, UserFeedPost, UserActivity, UserStatsDTO } from '@ems/types';

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
    const profileDTO: PublicUserProfile = await userService.getUserProfile(targetUserId, viewerId);
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

    const updated: PublicUserProfile = await userService.updateUserProfile(targetUserId, req.body);
    res.json(updated);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/feed
 * Get the user's public profile feed
 */
export async function getUserFeedHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const feed: UserFeedPost[] = await userService.getUserFeed(userId, viewerId);
    res.json(feed);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:userId/feed
 * Post to user's own feed (or comment if parentId is set)
 */
export async function createUserPostHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profileUserId = Number(req.params.userId); // whose profile
    const authUserId = req.user?.id; // who is posting
    const { content, parentId } = req.body;
    if (!authUserId) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }
    // Only allow top-level post to own profile, but allow comments anywhere
    if (!parentId && authUserId !== profileUserId) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    // Create post/comment (pass ownerId=profileUserId, authorId=authUserId)
    const post: UserFeedPost = await userService.createUserPost(
      authUserId,
      content,
      parentId ?? null,
      profileUserId,
    );
    res.status(201).json(post);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/activity
 * Get the user's activity log
 */
export async function getUserActivityHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const activity: UserActivity[] = await userService.getUserActivity(userId, viewerId);
    res.json(activity);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/stats
 * Get the user's stats
 */
export async function getUserStatsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const stats: UserStatsDTO | null = await userService.getUserStats(userId);
    if (!stats) {
      res.status(404).json({ error: 'Stats not found' });
      return;
    }
    res.json(stats);
  } catch (err) {
    next(err);
  }
}
