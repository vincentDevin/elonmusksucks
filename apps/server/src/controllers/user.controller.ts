import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import type { PublicUserProfile, UserFeedPost, UserActivity, UserStatsDTO } from '@ems/types';

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
  user?: { id: number };
  file?: MulterFile;
};

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

    // Record activity
    await userService.createUserActivity(followerId, 'USER_FOLLOWED', { followingId });

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

    // Record activity
    await userService.createUserActivity(followerId, 'USER_UNFOLLOWED', { followingId });

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
    res.json(bets);
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
    res.json(parlays);
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

    // Get basic stats and enhance them
    const basicStats = await userService.getUserStats(targetUserId);

    // Calculate enhanced metrics
    const winRate = basicStats ? basicStats.betsWon / Math.max(basicStats.totalBets, 1) : 0;
    const netProfit = basicStats?.profit || 0;

    // Mock category accuracy data (in production, this would come from bet history analysis)
    const categoryAccuracy = [
      { category: 'Sports', accuracy: 0.65, totalBets: 15, wins: 10 },
      { category: 'Politics', accuracy: 0.58, totalBets: 8, wins: 5 },
      { category: 'Technology', accuracy: 0.72, totalBets: 12, wins: 9 },
      { category: 'Entertainment', accuracy: 0.45, totalBets: 6, wins: 3 },
    ];

    const bestCategory = categoryAccuracy.reduce((best, current) =>
      current.accuracy > best.accuracy ? current : best,
    ).category;

    const enhancedStats = {
      // Performance metrics
      totalBets: basicStats?.totalBets || 0,
      winRate,
      profitLoss: netProfit,
      categoryAccuracy,
      currentStreak: {
        type: winRate > 0.5 ? 'win' : 'lose',
        count: basicStats?.currentStreak || 0,
        isActive: (basicStats?.currentStreak || 0) > 0,
      },
      bestCategory,
      totalWagered: basicStats?.totalWagered || 0,
      avgBetSize: basicStats ? basicStats.totalWagered / Math.max(basicStats.totalBets, 1) : 0,

      // Achievement progress (mock data)
      achievementProgress: [
        {
          id: 'streak_master',
          title: 'Streak Master',
          description: 'Win 10 bets in a row',
          progress: Math.min(9, basicStats?.currentStreak || 0),
          target: 10,
          isCompleted: false,
        },
        {
          id: 'high_roller',
          title: 'High Roller',
          description: 'Place a 1000🪙 bet',
          progress: Math.min(800, basicStats?.totalWagered || 0),
          target: 1000,
          isCompleted: false,
        },
      ],
      achievementCompletionRate: 0.3,

      // Trend data (mock)
      weeklyVolume: generateTrendData(basicStats?.totalWagered || 0, 7),
      monthlyProfitLoss: generateTrendData(netProfit, 30),
      categoryStats: categoryAccuracy.map((cat) => ({
        category: cat.category,
        betCount: cat.totalBets,
        winRate: cat.accuracy,
        profitLoss: cat.totalBets * 50 * (cat.accuracy - 0.5),
        avgBetSize: 50,
      })),
    };

    res.json(enhancedStats);
  } catch (err) {
    next(err);
  }
}

// Helper function to generate trend data
function generateTrendData(baseValue: number, points: number) {
  const data = [];
  for (let i = points - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const variation = (Math.random() - 0.5) * 0.4;
    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.max(0, (baseValue * (1 + variation)) / points),
    });
  }
  return data;
}
