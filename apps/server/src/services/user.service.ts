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

  // --- NEW: Upload profile image ---
  async uploadUserProfileImage(userId: number, file: UploadedFile): Promise<string> {
    await redisClient.del(`profileImageUrl:userId:${userId}`);
    const key = `${userId}/${Date.now()}-${file.originalname}`;
    // Upload to S3-compatible storage
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Persist the key so we can re-generate a URL later
    await this.repo.updateProfile(userId, { profilePictureKey: key });

    // Return a signed URL (valid 7 days)
    return getSignedUrl(this.s3, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: 60 * 60 * 24 * 7,
    });
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
    await this.repo.createUserActivity({
      userId: authorId,
      type: parentId ? 'COMMENT_CREATED' : 'POST_CREATED',
      details: { postId: post.id },
    });
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
    const activity: DbUserActivity = await this.repo.createUserActivity({
      userId,
      type,
      details,
    });
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
