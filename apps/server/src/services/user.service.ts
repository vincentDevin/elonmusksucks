import redisClient from '../lib/redis';
import { CACHE_KEYS, getProfileImageTTL, getTTLUntilMidnight } from '../lib/cacheTTL';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IUserRepository } from '../repositories/interfaces/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';
import type { DbUser, DbUserBadge, DbBadge, DbUserStats, DbUserFeedContent } from '@ems/types';
// TODO: Branded types available: UserId, PredictionId, ISODateString, TimestampMs
import type { UserProfileView, UserStatsView } from '@ems/types';
import { unifiedActivityService } from './unifiedActivity.service';
import { ImageProcessingService, ProcessedImageSizes } from './imageProcessing.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { eventBus } from '../lib/EventBus';

// Define a minimal file interface matching Multer's in-memory buffer
export type UploadedFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

export class UserService {
  private repo: IUserRepository;
  private s3: S3Client;
  private bucket: string;

  constructor(repo: IUserRepository = new UserRepository()) {
    this.repo = repo;
    this.s3 = new S3Client({
      region: 'auto',
      endpoint: process.env.TIGRIS_S3_ENDPOINT,
      forcePathStyle: false,
      credentials: {
        accessKeyId: process.env.TIGRIS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.TIGRIS_SECRET_ACCESS_KEY as string,
      },
    });
    this.bucket = process.env.TIGRIS_S3_BUCKET as string;
  }

  // --- ENHANCED: Upload profile image with processing ---
  async uploadUserProfileImage(
    userId: number, // TODO: Use UserId branded type when call sites are updated
    file: UploadedFile,
  ): Promise<{
    avatarUrl: string;
    sizes: {
      thumbnail: string;
      profile: string;
      full: string;
    };
  }> {
    // Clear cached URLs
    await redisClient.del(CACHE_KEYS.PROFILE_IMAGE_URL(userId));

    // Get current user to check for existing profile picture
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');

    // Validate and process the image
    const isValidImage = await ImageProcessingService.validateImage(file.buffer);
    if (!isValidImage) {
      throw new Error('Invalid image file. Please upload a valid JPEG, PNG, or WebP image.');
    }

    // Process image into multiple sizes
    const processedImages: ProcessedImageSizes = await ImageProcessingService.processProfileImage(
      file.buffer,
      userId,
    );

    // Upload all sizes to storage
    const uploadPromises = [
      this.uploadImageToStorage(processedImages.thumbnail),
      this.uploadImageToStorage(processedImages.profile),
      this.uploadImageToStorage(processedImages.full),
    ];

    await Promise.all(uploadPromises);

    // Clean up old profile images if they exist
    if (user.profilePictureKey) {
      await this.cleanupOldProfileImages(user.profilePictureKey);
    }

    // Update user profile with new primary (profile size) key
    await this.repo.updateProfile(userId, {
      profilePictureKey: processedImages.profile.filename,
    });

    // Generate signed URLs for immediate use (7-day expiry - AWS S3 maximum)
    const urlPromises = [
      this.getSignedAvatarUrl(processedImages.thumbnail.filename, 60 * 60 * 24 * 7),
      this.getSignedAvatarUrl(processedImages.profile.filename, 60 * 60 * 24 * 7),
      this.getSignedAvatarUrl(processedImages.full.filename, 60 * 60 * 24 * 7),
    ];

    const [thumbnailUrl, profileUrl, fullUrl] = await Promise.all(urlPromises);

    return {
      avatarUrl: profileUrl, // Primary avatar URL
      sizes: {
        thumbnail: thumbnailUrl,
        profile: profileUrl,
        full: fullUrl,
      },
    };
  }

  /**
   * Upload a processed image to S3-compatible storage
   */
  private async uploadImageToStorage(image: {
    buffer: Buffer;
    filename: string;
    contentType: string;
  }): Promise<void> {
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: image.filename,
        Body: image.buffer,
        ContentType: image.contentType,
        CacheControl: 'public, max-age=2592000', // 30 days
        Metadata: {
          'uploaded-at': new Date().toISOString(),
        },
      }),
    );
  }

  /**
   * Clean up old profile images when a new one is uploaded
   */
  private async cleanupOldProfileImages(oldKey: string): Promise<void> {
    try {
      // Extract the pattern to find all related sizes
      // oldKey format: profiles/{userId}/profile-{uuid}.webp
      const keyParts = oldKey.split('/');
      if (keyParts.length >= 3) {
        const userId = keyParts[1];
        const fileName = keyParts[2];
        const uuid = fileName.split('-')[1]?.split('.')[0];

        if (uuid) {
          // Delete all sizes for this image set
          const keysToDelete = [
            `profiles/${userId}/thumbnail-${uuid}.webp`,
            `profiles/${userId}/profile-${uuid}.webp`,
            `profiles/${userId}/full-${uuid}.webp`,
          ];

          const deletePromises = keysToDelete.map((key) =>
            this.s3
              .send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
              .catch((err) => console.warn(`Failed to delete old image ${key}:`, err.message)),
          );

          await Promise.all(deletePromises);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup old profile images:', error);
      // Don't throw - image upload should still succeed even if cleanup fails
    }
  }

  /**
   * Get a short-lived (1 hour) signed URL for a user's avatar/profile picture.
   * Accepts a storage key (from user.profilePictureKey).
   */
  async getSignedAvatarUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    // AWS S3 presigned URLs can't exceed 7 days (604800 seconds)
    const maxExpiry = 60 * 60 * 24 * 7; // 7 days
    const safeExpiry = Math.min(expiresInSeconds, maxExpiry);

    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: safeExpiry,
    });
  }

  /**
   * Returns a signed avatar URL, caching it in Redis until expiry.
   * Use this in leaderboard/chat for fast avatar lookups!
   */
  async getCachedProfileImageUrl(
    userId: number,
    profilePictureKey: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    const redisKey = CACHE_KEYS.PROFILE_IMAGE_URL(userId);

    // Try Redis first
    const cached = await redisClient.get(redisKey);
    if (cached) {
      // Validate the cached URL isn't expired by checking the X-Amz-Date parameter
      try {
        const url = new URL(cached);
        const amzDate = url.searchParams.get('X-Amz-Date');
        const expires = url.searchParams.get('X-Amz-Expires');

        if (amzDate && expires) {
          // Parse the date: format is YYYYMMDDTHHmmssZ
          const year = parseInt(amzDate.substring(0, 4));
          const month = parseInt(amzDate.substring(4, 6)) - 1;
          const day = parseInt(amzDate.substring(6, 8));
          const hour = parseInt(amzDate.substring(9, 11));
          const minute = parseInt(amzDate.substring(11, 13));
          const second = parseInt(amzDate.substring(13, 15));

          const signedDate = new Date(Date.UTC(year, month, day, hour, minute, second));
          const expiryDate = new Date(signedDate.getTime() + parseInt(expires) * 1000);

          // If URL is expired or will expire in the next 5 minutes, regenerate
          if (expiryDate.getTime() > Date.now() + 5 * 60 * 1000) {
            console.log(
              `[user] Using cached avatar for user ${userId}, expires at ${expiryDate.toISOString()}`,
            );
            return cached;
          }

          // Delete expired cache
          console.log(
            `[user] Cached avatar expired for user ${userId}, regenerating (was signed ${amzDate}, expired ${expiryDate.toISOString()})`,
          );
          await redisClient.del(redisKey);
        }
      } catch (error) {
        console.warn(`Failed to validate cached URL for user ${userId}:`, error);
        // If validation fails, delete the cache and regenerate
        await redisClient.del(redisKey);
      }
    }

    // Not cached or expired: generate signed URL
    const url = await this.getSignedAvatarUrl(profilePictureKey, expiresInSeconds);

    // Store in Redis with intelligent TTL based on signature expiry
    const cacheTTL = getProfileImageTTL(expiresInSeconds);
    await redisClient.setex(redisKey, cacheTTL, url);

    return url;
  }

  /**
   * Fetch a basic public user profile with signed avatar URL.
   * Used for socket auth and chat events.
   */
  async getPublicSocketUser(userId: number): Promise<{
    // TODO: Use UserId branded type when call sites are updated
    id: number;
    name: string;
    role: string;
    avatarUrl: string | null;
  } | null> {
    const user = await this.getUserProfile(userId); // uses your existing function!
    if (!user) return null;
    return {
      id: user.id,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : user.role, // fallback if needed
      avatarUrl: user.avatarUrl ?? null,
    };
  }

  // --- PROFILE (with signed URL fallback) ---
  async getUserProfile(userId: number, viewerId?: number): Promise<UserProfileView> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');

    const [followersCount, followingCount, userBadges, userAchievements] = await Promise.all([
      this.repo.getFollowersCount(userId),
      this.repo.getFollowingCount(userId),
      this.repo.findUserBadges(userId),
      this.repo.findUserAchievements(userId),
    ]);

    const rank = await this.repo.getUserRank(userId);
    const isFollowing = viewerId ? await this.repo.existsFollow(viewerId, userId) : false;

    // Generate signed avatar URL if we have a storage key (use cached version)
    const avatarUrl = user.profilePictureKey
      ? await this.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
      : user.avatarUrl;

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      muskBucks: user.muskBucks.toString(),
      profileComplete: user.profileComplete,
      rank,
      bio: user.bio,
      avatarUrl,
      location: user.location,
      timezone: user.timezone,
      notifyOnResolve: user.notifyOnResolve,
      theme: user.theme,
      twoFactorEnabled: user.twoFactorEnabled,
      stats: {
        successRate: user.successRate,
        totalPredictions: user.totalPredictions,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      badges: userBadges.map((ub: DbUserBadge & { badge: DbBadge }) => ({
        id: ub.badge.id,
        name: ub.badge.name,
        description: ub.badge.description,
        iconUrl: ub.badge.iconUrl,
        createdAt:
          typeof ub.badge.createdAt === 'string'
            ? ub.badge.createdAt
            : ub.badge.createdAt.toISOString(),
        awardedAt: typeof ub.awardedAt === 'string' ? ub.awardedAt : ub.awardedAt.toISOString(),
      })),
      achievements: userAchievements.map((ua: any) => ({
        id: ua.achievement.id.toString(),
        title: ua.achievement.title || ua.achievement.name,
        description: ua.achievement.description,
        isUnlocked: ua.completedAt !== null,
      })),
      followersCount,
      followingCount,
      isFollowing,
      createdAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString(),
      updatedAt: typeof user.createdAt === 'string' ? user.createdAt : user.createdAt.toISOString(),
    };
  }
  async followUser(followerId: number, followingId: number): Promise<void> {
    return this.repo.createFollow(followerId, followingId);
  }

  async unfollowUser(followerId: number, followingId: number): Promise<void> {
    return this.repo.deleteFollow(followerId, followingId);
  }

  async updateUserProfile(
    userId: number,
    data: Partial<
      Pick<
        DbUser,
        | 'bio'
        | 'avatarUrl'
        | 'location'
        | 'timezone'
        | 'notifyOnResolve'
        | 'theme'
        | 'twoFactorEnabled'
        | 'profileComplete'
      >
    >,
  ): Promise<UserProfileView> {
    await this.repo.updateProfile(userId, data);
    return this.getUserProfile(userId, userId);
  }

  // --- FEED ---

  /**
   * Enrich a user object with a signed avatar URL.
   * This is the centralized method for transforming user data with proper avatar URLs.
   *
   * @param user - User object with id, name, avatarUrl, and optionally profilePictureKey
   * @returns User object with signed avatar URL if profilePictureKey exists
   */
  async enrichUserWithAvatar<
    T extends { id: number; avatarUrl?: string | null; profilePictureKey?: string | null },
  >(user: T): Promise<T & { avatarUrl: string | null }> {
    if (!user) return user;

    let avatarUrl: string | null = null;

    if (user.profilePictureKey) {
      try {
        avatarUrl = await this.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600);
      } catch (error) {
        console.warn(`Failed to get signed URL for user ${user.id}:`, error);
        avatarUrl = user.avatarUrl || null;
      }
    } else {
      avatarUrl = user.avatarUrl || null;
    }

    return {
      ...user,
      avatarUrl,
    };
  }

  /**
   * Enrich multiple users with signed avatar URLs.
   * Batch processing for performance.
   */
  async enrichUsersWithAvatars<
    T extends { id: number; avatarUrl?: string | null; profilePictureKey?: string | null },
  >(users: T[]): Promise<(T & { avatarUrl: string | null })[]> {
    return Promise.all(users.map((user) => this.enrichUserWithAvatar(user)));
  }

  async getUserFeed(userId: number, viewerId?: number): Promise<DbUserFeedContent[]> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.feedPrivate && user.id !== viewerId) throw new Error('Feed is private');
    const posts: DbUserFeedContent[] = await this.repo.getUserFeed(userId); // no { parentId: null }

    // Enrich posts with author avatar URLs
    const enrichedPosts = await Promise.all(
      posts.map(async (post: any) => {
        let authorAvatar: string | null = null;

        if (post.author) {
          const enrichedAuthor = await this.enrichUserWithAvatar(post.author);
          authorAvatar = enrichedAuthor.avatarUrl;
        }

        return {
          ...post,
          authorAvatar,
        };
      }),
    );

    return enrichedPosts;
  }

  async createUserPost(
    authorId: number,
    content: string,
    parentId?: number | null,
    _profileOwnerId?: number, // Legacy parameter for backward compatibility
  ): Promise<DbUserFeedContent> {
    // Use repository directly to avoid circular dependency
    const post = await this.repo.createUserPost({
      authorId,
      content,
      parentId: parentId || null,
    });

    // Create unified activity event
    const author = await this.getPublicSocketUser(authorId);
    if (author) {
      await unifiedActivityService.createPostActivity(
        {
          id: author.id,
          name: author.name || 'Unknown User',
          avatarUrl: author.avatarUrl || null,
        },
        {
          id: post.id,
          content,
          isComment: !!parentId,
        },
      );
    }

    // Repository already returns DbUserFeedContent with author included
    return post;
  }

  async getUserPostThread(
    postId: number,
  ): Promise<(DbUserFeedContent & { children: DbUserFeedContent[] }) | null> {
    const thread = await this.repo.getUserPostThread(postId);
    if (!thread) return null;

    // Enrich thread and children with author avatars
    const enrichThread = async (post: any): Promise<any> => {
      let authorAvatar: string | null = null;

      if (post.author) {
        const enrichedAuthor = await this.enrichUserWithAvatar(post.author);
        authorAvatar = enrichedAuthor.avatarUrl;
      }

      const enrichedPost = {
        ...post,
        authorAvatar,
      };

      if (post.children && post.children.length > 0) {
        enrichedPost.children = await Promise.all(
          post.children.map((child: any) => enrichThread(child)),
        );
      }

      return enrichedPost;
    };

    const enrichedThread = await enrichThread(thread);

    return enrichedThread;
  }

  // --- ACTIVITY (Legacy methods removed - use unifiedActivityService instead) ---

  // --- STATS ---

  async getUserStats(userId: number): Promise<UserStatsView | null> {
    const stats = await this.repo.getUserStats(userId);
    if (!stats) return null;
    return {
      totalBets: stats.totalBets,
      betsWon: stats.betsWon,
      betsLost: stats.betsLost,
      totalParlays: stats.totalParlays,
      parlaysWon: stats.parlaysWon,
      parlaysLost: stats.parlaysLost,
      totalParlayLegs: stats.totalParlayLegs,
      parlayLegsWon: stats.parlayLegsWon,
      parlayLegsLost: stats.parlayLegsLost,
      totalWagered: stats.totalWagered.toString(),
      totalWon: stats.totalWon.toString(),
      profit: stats.profit.toString(),
      roi: stats.roi,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      mostCommonBet: stats.mostCommonBet ?? null,
      biggestWin: stats.biggestWin.toString(),
      updatedAt: stats.updatedAt instanceof Date ? stats.updatedAt.toISOString() : stats.updatedAt,
    };
  }

  async updateUserStats(
    userId: number,
    data: Partial<Omit<DbUserStats, 'id' | 'userId'>>,
  ): Promise<void> {
    await this.repo.updateUserStats(userId, data);
  }

  /**
   * Increment one or more stats fields atomically.
   *
   * @param userId
   * @param fields   e.g. { totalBets: { increment: 1 }, parlaysStarted: { increment: 1 } }
   */
  async incrementUserStats(
    userId: number,
    fields: Partial<Record<keyof Omit<DbUserStats, 'id' | 'userId'>, { increment: number }>>,
  ): Promise<void> {
    // Delegate directly to the repository, which should call
    // prisma.userStats.update({ data: fields })
    await this.repo.incrementUserStats(userId, fields as any);
  }

  // --- PRIVACY ---

  async setFeedPrivacy(userId: number, feedPrivate: boolean): Promise<void> {
    await this.repo.setFeedPrivacy(userId, feedPrivate);
  }

  // --- USER ACTIVITY DATA FOR DASHBOARD ---

  /**
   * Get user's active bets (pending/open bets only)
   */
  async getUserActiveBets(userId: number) {
    return this.repo.getUserActiveBets(userId);
  }

  /**
   * Get user's active parlays (pending parlays only)
   */
  async getUserActiveParlays(userId: number) {
    return this.repo.getUserActiveParlays(userId);
  }

  /**
   * Get user's created predictions (approved and pending)
   */
  async getUserPredictions(userId: number) {
    return this.repo.getUserPredictions(userId);
  }

  /**
   * Search users by name for mentions
   */
  async searchUsers(query: string): Promise<{ id: number; name: string; avatarUrl?: string }[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    return this.repo.searchUsersByName(query.trim());
  }

  /**
   * Track daily login for achievements and streak management
   * This should be called whenever a user authenticates or accesses the system
   */
  async trackDailyLogin(userId: number): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const loginKey = CACHE_KEYS.DAILY_LOGIN(userId, today);

      // Check if user already logged in today using Redis for fast lookups
      const alreadyLoggedToday = await redisClient.get(loginKey);

      if (!alreadyLoggedToday) {
        // Mark as logged in today (expires at midnight)
        const ttlUntilMidnight = getTTLUntilMidnight();
        await redisClient.setex(loginKey, ttlUntilMidnight, '1');

        // Log activity for time-based tracking
        await eventBus.publish('user:activity:log', {
          userId,
          activityType: 'daily_login',
          metadata: {
            loginDate: today,
            timestamp: new Date().toISOString(),
            isFirstLoginOfDay: true,
          },
          occurredAt: new Date().toISOString(),
          dateKey: today,
          idempotencyKey: `activity:login:${userId}:${today}`,
        });

        // Publish daily login event for achievement system
        await eventBus.publish('user:daily:login', {
          key: 'user:daily:login',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `daily:login:${userId}:${today}`,
          payload: {
            loginDate: today,
            consecutiveDays: await this.calculateConsecutiveLoginDays(userId),
            timestamp: new Date().toISOString(),
          },
        });

        // Check for weekend warrior achievement (login on Saturday/Sunday)
        const dayOfWeek = new Date().getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
          // Sunday = 0, Saturday = 6
          await eventBus.publish('user:weekend:login', {
            key: 'user:weekend:login',
            userId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `weekend:login:${userId}:${today}`,
            payload: {
              loginDate: today,
              dayOfWeek: dayOfWeek === 0 ? 'sunday' : 'saturday',
              timestamp: new Date().toISOString(),
            },
          });
        }

        console.log(`[user] Daily login tracked for user ${userId} on ${today}`);
      }
    } catch (error) {
      console.error(`[user] Error tracking daily login for user ${userId}:`, error);
      // Don't throw - login tracking failure shouldn't block authentication
    }
  }

  /**
   * Calculate consecutive login days for streak achievements
   * This looks back through recent days to count the current streak
   */
  private async calculateConsecutiveLoginDays(userId: number): Promise<number> {
    try {
      let consecutiveDays = 0;
      const today = new Date();

      // Check last 30 days for consecutive logins
      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateKey = checkDate.toISOString().split('T')[0];

        const loginKey = CACHE_KEYS.DAILY_LOGIN(userId, dateKey);
        const loggedIn = await redisClient.get(loginKey);

        if (loggedIn) {
          consecutiveDays++;
        } else {
          // Break on first day without login (except today, which we just set)
          if (i > 0) break;
        }
      }

      return consecutiveDays;
    } catch (error) {
      console.error(`[user] Error calculating consecutive login days for user ${userId}:`, error);
      return 1; // Default to 1 if calculation fails
    }
  }

  /**
   * Get login streak information for a user
   * This can be used for dashboard displays or achievement checking
   */
  async getLoginStreakInfo(userId: number): Promise<{
    currentStreak: number;
    longestStreak: number;
    lastLoginDate: string | null;
    todaysLogin: boolean;
  }> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const loginKey = CACHE_KEYS.DAILY_LOGIN(userId, today);

      const todaysLogin = !!(await redisClient.get(loginKey));
      const currentStreak = await this.calculateConsecutiveLoginDays(userId);

      // For longest streak, we'd need to implement a more sophisticated tracking system
      // For now, return current streak as longest (placeholder)
      const longestStreak = currentStreak; // TODO: Implement proper longest streak tracking

      // Find last login date
      let lastLoginDate: string | null = null;
      const checkDate = new Date();
      for (let i = 0; i < 7; i++) {
        // Check last 7 days
        const dateKey = checkDate.toISOString().split('T')[0];
        const loginKey = CACHE_KEYS.DAILY_LOGIN(userId, dateKey);
        const loggedIn = await redisClient.get(loginKey);

        if (loggedIn) {
          lastLoginDate = dateKey;
          break;
        }

        checkDate.setDate(checkDate.getDate() - 1);
      }

      return {
        currentStreak,
        longestStreak,
        lastLoginDate,
        todaysLogin,
      };
    } catch (error) {
      console.error(`[user] Error getting login streak info for user ${userId}:`, error);
      return {
        currentStreak: 0,
        longestStreak: 0,
        lastLoginDate: null,
        todaysLogin: false,
      };
    }
  }

  // ===============================================
  // Social Features Methods
  // ===============================================

  async getUserFollowers(
    userId: number,
    params: {
      limit: number;
      cursor?: string;
    },
  ) {
    return this.repo.getUserFollowers(userId, params);
  }

  async getUserFollowing(
    userId: number,
    params: {
      limit: number;
      cursor?: string;
    },
  ) {
    return this.repo.getUserFollowing(userId, params);
  }
}
