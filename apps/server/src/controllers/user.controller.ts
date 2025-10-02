import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { EnhancedUserStatsService } from '../services/enhancedUserStats.service';
import { UserRepository } from '../repositories/UserRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import { StatsRepository } from '../repositories/StatsRepository';
import { PrismaClient } from '@prisma/client';
import { unifiedActivityService } from '../services/unifiedActivity.service';
import { adminAchievementService } from '../services/achievements/adminAchievement.service';
import type {
  PublicUserProfile,
  UserFeedPost,
  UserStatsView,
  UserProfileView,
  UpdateProfilePayload,
  CreateUserPostPayload,
  UserBetView,
  UserParlayView,
  UserEnhancedStatsView,
  UserAchievementProgressView,
  UnifiedActivityEvent,
} from '@ems/types';
import {
  toUserProfileView,
  toUserEnhancedStatsView,
  toUserAchievementProgressView,
} from '../view/user.view';
import { toUserBetView, toUserParlayView } from '../view/betting.view';

// Define MulterFile type explicitly to avoid mismatched declarations
export type MulterFile = {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
};

// Extend Request to include authenticated user and optionally an uploaded file
export type ReqWithUser = Request & {
  user?: { id: number; role?: string };
  file?: MulterFile;
};

// Instantiate the services (uses Prisma-backed repository by default)
const userService = new UserService();
const userRepository = new UserRepository();
const bettingRepository = new BettingRepository();
const prisma = new PrismaClient();
const statsRepository = new StatsRepository(prisma);
const enhancedUserStatsService = new EnhancedUserStatsService(
  userRepository,
  bettingRepository,
  statsRepository,
);

/**
 * GET /api/users/profile/:userId
 * Fetch a user's profile
 */
export async function getProfile(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);

    if (isNaN(targetUserId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const viewerId = req.user?.id;
    const profileData: PublicUserProfile = await userService.getUserProfile(targetUserId, viewerId);

    // Map to standardized DTO with BigInt → string conversion
    const payload = toUserProfileView(profileData) satisfies UserProfileView;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/users/:userId/profile-picture
 * Upload & store a new profile image, return a signed URL
 */
export async function uploadProfileImageHandler(
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

    const file = req.file;
    if (!file) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    const result = await userService.uploadUserProfileImage(targetUserId, file);
    res.json(result);
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

    // Publish follow activity through unified system
    const followedUser = await userService.getUserProfile(followingId);
    const followerUser = await userService.getUserProfile(followerId);

    if (followedUser && followerUser) {
      await unifiedActivityService.publishActivity({
        type: 'user_followed',
        userId: followerId,
        userName: followerUser.name,
        title: `${followerUser.name} followed ${followedUser.name}`,
        description: `New connection in the prediction community`,
        icon: '👥',
        color: 'text-blue-400',
        priority: 'low',
        isPersonal: false, // User follows are public social activities
        isHighValue: false, // Low priority social activity
        meta: {
          followedUserId: followingId,
          followedUserName: followedUser.name,
        },
      });
    }

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

    const updateData = req.body as UpdateProfilePayload;
    const updated: PublicUserProfile = await userService.updateUserProfile(
      targetUserId,
      updateData,
    );

    const payload = toUserProfileView(updated) satisfies UserProfileView;
    res.json(payload);
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
    const { content, parentId } = req.body as CreateUserPostPayload;
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
    // Create post/comment
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

    // Check user privacy settings
    const user = await userService.getUserProfile(userId);
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // For now, return all public activities - in future this could be filtered by userId
    // when the unified activity service adds user-specific query support
    const activities: UnifiedActivityEvent[] = await unifiedActivityService.getPublicActivities(50);

    // Filter activities for this specific user (temporary solution)
    const userActivities = activities.filter((activity) => activity.userId === userId);

    res.json(userActivities);
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

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const stats: UserStatsView | null = await userService.getUserStats(userId);
    if (!stats) {
      res.status(404).json({ error: 'Stats not found' });
      return;
    }

    // Service already returns UserStatsView, no need to transform
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/bets
 * Fetch user's active bets (only for own profile)
 */
export async function getUserBetsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;

    // Only allow users to view their own bets
    if (targetUserId !== viewerId) {
      res.status(403).json({ error: "Cannot view other users' bets" });
      return;
    }

    const bets = await userService.getUserActiveBets(targetUserId);
    const payload = bets.map(toUserBetView) satisfies UserBetView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/parlays
 * Fetch user's active parlays (only for own profile)
 */
export async function getUserParlaysHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;

    // Only allow users to view their own parlays
    if (targetUserId !== viewerId) {
      res.status(403).json({ error: "Cannot view other users' parlays" });
      return;
    }

    const parlays = await userService.getUserActiveParlays(targetUserId);
    const payload = parlays.map(toUserParlayView) satisfies UserParlayView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/predictions
 * Fetch user's created predictions
 */
export async function getUserPredictionsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;

    // Only allow users to view their own predictions
    if (targetUserId !== viewerId) {
      res.status(403).json({ error: "Cannot view other users' predictions" });
      return;
    }

    const predictions = await userService.getUserPredictions(targetUserId);
    res.json(predictions);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/enhanced-stats
 * Get enhanced user statistics for dashboard
 */
export async function getEnhancedUserStatsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;

    // Only allow users to view their own enhanced stats
    if (targetUserId !== viewerId) {
      res.status(403).json({ error: "Cannot view other users' enhanced stats" });
      return;
    }

    // Get enhanced stats using the new service with real data calculations
    const enhancedStats = await enhancedUserStatsService.getEnhancedStats(targetUserId);

    const payload = toUserEnhancedStatsView(enhancedStats) satisfies UserEnhancedStatsView;
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/users/:userId/achievements
 * Get user's achievement progress
 */
export async function getUserAchievementsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;

    // Only allow users to view their own achievements
    if (targetUserId !== viewerId) {
      res.status(403).json({ error: "Cannot view other users' achievements" });
      return;
    }

    // Get user achievement progress using the modern system
    const achievements = await adminAchievementService.getUserAchievementProgress(targetUserId);

    const payload = achievements.map(
      toUserAchievementProgressView,
    ) satisfies UserAchievementProgressView[];
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

export async function getRecentAchievementsHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const targetUserId = Number(req.params.userId);
    const viewerId = req.user?.id;
    const limit = parseInt(req.query.limit as string) || 5;

    // Only allow users to view their own recent achievements
    if (targetUserId !== viewerId) {
      res.status(403).json({ message: 'Unauthorized' });
      return;
    }

    const recentAchievements = await adminAchievementService.getRecentAchievements(
      targetUserId,
      limit,
    );
    res.json(recentAchievements);
  } catch (err) {
    next(err);
  }
}

export async function getAllAchievementsHandler(
  _req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Get all available achievements (public endpoint)
    const achievements = await adminAchievementService.getAllAchievements();
    res.json(achievements);
  } catch (err) {
    next(err);
  }
}

/**
 * Search users by name/username
 * GET /api/users/search?q=searchterm
 */
export async function searchUsersHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = req.query.q as string;

    if (!query || query.trim().length === 0) {
      res.json([]);
      return;
    }

    if (query.length < 2) {
      res.status(400).json({ error: 'Search query must be at least 2 characters' });
      return;
    }

    const users = await userService.searchUsers(query.trim());
    res.json(users);
  } catch (err) {
    next(err);
  }
}

/**
 * Get user's followers list
 * GET /api/users/:userId/followers
 */
export async function getUserFollowersHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const { limit = '20', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 20, 100);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const followers = await userService.getUserFollowers(userId, {
      limit: pageLimit,
      cursor: cursor as string,
    });

    res.json(followers);
  } catch (err) {
    next(err);
  }
}

/**
 * Get users that this user is following
 * GET /api/users/:userId/following
 */
export async function getUserFollowingHandler(
  req: ReqWithUser,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = Number(req.params.userId);
    const { limit = '20', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 20, 100);

    if (isNaN(userId)) {
      res.status(400).json({ error: 'Invalid user ID' });
      return;
    }

    const following = await userService.getUserFollowing(userId, {
      limit: pageLimit,
      cursor: cursor as string,
    });

    res.json(following);
  } catch (err) {
    next(err);
  }
}
