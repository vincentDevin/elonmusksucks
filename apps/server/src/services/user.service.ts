import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IUserRepository } from '../repositories/IUserRepository';
import { UserRepository } from '../repositories/UserRepository';
import type {
  DbUser,
  DbUserBadge,
  DbBadge,
  DbUserStats,
  DbUserPost,
  DbUserActivity,
} from '@ems/types';
import type { PublicUserProfile, UserFeedPost, UserActivity, UserStatsDTO } from '@ems/types';
import { normalizedActivityService } from './normalizedActivity.service';
import { ImageProcessingService, ProcessedImageSizes } from './imageProcessing.service';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';

// Define a minimal file interface matching Multer's in-memory buffer
export type UploadedFile = {
  originalname: string;
  buffer: Buffer;
  mimetype: string;
};

const prisma = new PrismaClient();

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
    userId: number,
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
    await redisClient.del(`profileImageUrl:userId:${userId}`);

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

    // Generate signed URLs for immediate use (30-day expiry for better caching)
    const urlPromises = [
      this.getSignedAvatarUrl(processedImages.thumbnail.filename, 60 * 60 * 24 * 30),
      this.getSignedAvatarUrl(processedImages.profile.filename, 60 * 60 * 24 * 30),
      this.getSignedAvatarUrl(processedImages.full.filename, 60 * 60 * 24 * 30),
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
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
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
    const redisKey = `profileImageUrl:userId:${userId}`;
    // Try Redis first
    const cached = await redisClient.get(redisKey);
    if (cached) return cached;

    // Not cached: generate signed URL
    const url = await this.getSignedAvatarUrl(profilePictureKey, expiresInSeconds);

    // Store in Redis, TTL matches URL expiry
    await redisClient.set(redisKey, url, 'EX', expiresInSeconds);

    return url;
  }

  /**
   * Fetch a basic public user profile with signed avatar URL.
   * Used for socket auth and chat events.
   */
  async getPublicSocketUser(userId: number): Promise<{
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
  async getUserProfile(userId: number, viewerId?: number): Promise<PublicUserProfile> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');

    const [followersCount, followingCount, userBadges] = await Promise.all([
      this.repo.getFollowersCount(userId),
      this.repo.getFollowingCount(userId),
      this.repo.findUserBadges(userId),
    ]);

    const rawRank = (await prisma.$queryRawUnsafe(
      `SELECT rank FROM (
         SELECT id, RANK() OVER (ORDER BY "muskBucks" DESC) AS rank
         FROM "User"
       ) u WHERE u.id = $1;`,
      userId,
    )) as { rank: bigint }[];
    const rank = Array.isArray(rawRank) && rawRank.length > 0 ? Number(rawRank[0].rank) : undefined;
    const isFollowing = viewerId ? await this.repo.existsFollow(viewerId, userId) : false;

    // Generate signed avatar URL if we have a storage key
    const avatarUrl = user.profilePictureKey
      ? await getSignedUrl(
          this.s3,
          new GetObjectCommand({ Bucket: this.bucket, Key: user.profilePictureKey }),
          { expiresIn: 60 * 60 },
        )
      : user.avatarUrl;

    return {
      id: user.id,
      name: user.name,
      role: user.role,
      muskBucks: user.muskBucks,
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
      followersCount,
      followingCount,
      isFollowing,
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
  ): Promise<PublicUserProfile> {
    await this.repo.updateProfile(userId, data);
    return this.getUserProfile(userId, userId);
  }

  // --- FEED ---

  async getUserFeed(userId: number, viewerId?: number): Promise<UserFeedPost[]> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.feedPrivate && user.id !== viewerId) throw new Error('Feed is private');
    const posts: DbUserPost[] = await this.repo.getUserFeed(userId); // no { parentId: null }
    return posts.map(toFeedPostDTO);
  }

  async createUserPost(
    authorId: number,
    content: string,
    parentId?: number | null,
    ownerId?: number,
  ): Promise<UserFeedPost> {
    const feedOwnerId = ownerId ?? authorId;
    const post: DbUserPost = await this.repo.createUserPost({
      authorId,
      ownerId: feedOwnerId,
      content,
      parentId: typeof parentId === 'undefined' ? null : parentId,
    });
    // Create legacy activity record
    await this.repo.createUserActivity({
      userId: authorId,
      type: parentId ? 'COMMENT_CREATED' : 'POST_CREATED',
      details: { postId: post.id },
    });

    // Create normalized activity event
    const author = await this.getPublicSocketUser(authorId);
    if (author) {
      await normalizedActivityService.createPostEvent(
        {
          id: author.id,
          name: author.name,
          avatarUrl: author.avatarUrl,
        },
        {
          id: post.id,
          content,
          isComment: Boolean(parentId),
        },
      );
    }

    return toFeedPostDTO(post);
  }

  async getUserPostThread(
    postId: number,
  ): Promise<(UserFeedPost & { children: UserFeedPost[] }) | null> {
    const thread = await this.repo.getUserPostThread(postId);
    if (!thread) return null;
    return {
      ...toFeedPostDTO(thread),
      children: (thread.children ?? []).map(toFeedPostDTO),
    };
  }

  // --- ACTIVITY ---

  async getUserActivity(userId: number, viewerId?: number): Promise<UserActivity[]> {
    const user = await this.repo.findById(userId);
    if (!user) throw new Error('User not found');
    if (user.feedPrivate && user.id !== viewerId) throw new Error('Activity feed is private');

    const activity: DbUserActivity[] = await this.repo.getUserActivity(userId);
    return activity.map(toActivityDTO);
  }

  async createUserActivity(userId: number, type: string, details?: any): Promise<UserActivity> {
    const activity = await this.repo.createUserActivity({ userId, type, details });

    // Decide if this activity is ticker-worthy
    if (
      [
        'PREDICTION_CREATED',
        'PREDICTION_RESOLVED',
        'BET_PLACED',
        'PARLAY_PLACED',
        'POST_CREATED',
        'COMMENT_CREATED',
        'BADGE_EARNED',
      ].includes(type)
    ) {
      publishTicker({
        id: activity.id,
        userId,
        type,
        details,
        createdAt: new Date().toISOString(),
      });
    }

    return toActivityDTO(activity);
  }

  // --- STATS ---

  async getUserStats(userId: number): Promise<UserStatsDTO | null> {
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
      totalWagered: stats.totalWagered,
      totalWon: stats.totalWon,
      profit: stats.profit,
      roi: stats.roi,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      mostCommonBet: stats.mostCommonBet ?? null,
      biggestWin: stats.biggestWin,
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
  async getUserActiveBets(userId: number): Promise<
    Array<{
      id: number;
      predictionId: number;
      predictionTitle: string;
      amount: number;
      odds: number;
      optionLabel?: string;
      status: string;
      createdAt: string;
    }>
  > {
    const bets = await prisma.bet.findMany({
      where: {
        userId,
        status: 'PENDING', // Only active/pending bets
      },
      include: {
        prediction: {
          select: {
            id: true,
            title: true,
            resolved: true,
          },
        },
        optionOption: {
          select: {
            label: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Limit to recent bets
    });

    return bets.map((bet) => ({
      id: bet.id,
      predictionId: bet.predictionId,
      predictionTitle: bet.prediction.title,
      amount: bet.amount,
      odds: bet.oddsAtPlacement || 1.0,
      optionLabel: bet.optionOption?.label,
      status: bet.status,
      createdAt: bet.createdAt.toISOString(),
    }));
  }

  /**
   * Get user's active parlays (pending parlays only)
   */
  async getUserActiveParlays(userId: number): Promise<
    Array<{
      id: number;
      amount: number;
      combinedOdds: number;
      potentialPayout: number;
      legCount: number;
      status: string;
      createdAt: string;
      legs: Array<{
        predictionTitle: string;
        optionLabel: string;
      }>;
    }>
  > {
    const parlays = await prisma.parlay.findMany({
      where: {
        userId,
        status: 'PENDING', // Only active/pending parlays
      },
      include: {
        legs: {
          include: {
            option: {
              include: {
                prediction: {
                  select: {
                    title: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Limit to recent parlays
    });

    return parlays.map((parlay) => ({
      id: parlay.id,
      amount: parlay.amount,
      combinedOdds: parlay.combinedOdds,
      potentialPayout: parlay.potentialPayout,
      legCount: parlay.legs.length,
      status: parlay.status,
      createdAt: parlay.createdAt.toISOString(),
      legs: parlay.legs.map((leg) => ({
        predictionTitle: leg.option.prediction.title,
        optionLabel: leg.option.label,
      })),
    }));
  }

  /**
   * Get user's created predictions (approved and pending)
   */
  async getUserPredictions(userId: number): Promise<
    Array<{
      id: number;
      title: string;
      category: string;
      type: string;
      approved: boolean;
      resolved: boolean;
      expiresAt: string;
      createdAt: string;
      totalBets?: number;
    }>
  > {
    const predictions = await prisma.prediction.findMany({
      where: {
        creatorId: userId,
      },
      include: {
        _count: {
          select: {
            bets: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Limit to recent predictions
    });

    return predictions.map((prediction) => ({
      id: prediction.id,
      title: prediction.title,
      category: prediction.category,
      type: prediction.type,
      approved: prediction.approved,
      resolved: prediction.resolved,
      expiresAt: prediction.expiresAt.toISOString(),
      createdAt: prediction.createdAt.toISOString(),
      totalBets: prediction._count.bets,
    }));
  }
}

// --- Helpers: always map DB types to DTOs used on frontend ---

function toFeedPostDTO(
  post: DbUserPost & { children?: DbUserPost[]; authorName?: string },
): UserFeedPost {
  return {
    id: post.id,
    authorId: post.authorId,
    ownerId: post.ownerId,
    content: post.content,
    parentId: post.parentId,
    createdAt: post.createdAt instanceof Date ? post.createdAt.toISOString() : post.createdAt,
    updatedAt: post.updatedAt instanceof Date ? post.updatedAt.toISOString() : post.updatedAt,
    children: post.children ? post.children.map(toFeedPostDTO) : undefined,
    authorName: post.authorName,
  };
}

function toActivityDTO(a: DbUserActivity): UserActivity {
  return {
    id: a.id,
    userId: a.userId,
    type: a.type,
    details: a.details,
    createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
  };
}

const TICKER_CHANNEL = 'activity:newsflash';
const TICKER_LIST = 'activity:ticker';
const TICKER_MAX = 100; // keep the 100 most-recent items

function publishTicker(item: {
  id: number; // activity id
  userId: number;
  type: string;
  details?: any;
  createdAt: string; // ISO
}) {
  const json = JSON.stringify(item);
  // 1) realtime broadcast
  redisClient.publish(TICKER_CHANNEL, json);
  // 2) bootstrap list for new connections
  redisClient.lpush(TICKER_LIST, json);
  redisClient.ltrim(TICKER_LIST, 0, TICKER_MAX - 1);
}
