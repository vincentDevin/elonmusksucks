import { PrismaClient, Theme } from '@prisma/client';

const prisma = new PrismaClient();

export type UserProfileDTO = {
  id: number;
  name: string;
  muskBucks: number;
  rank?: number;
  bio?: string | null;
  avatarUrl?: string | null;
  location?: string | null;
  timezone?: string | null;
  notifyOnResolve: boolean;
  theme: string;
  twoFactorEnabled: boolean;
  stats: {
    successRate: number;
    totalPredictions: number;
    currentStreak: number;
    longestStreak: number;
  };
  badges: {
    id: number;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    awardedAt: Date;
  }[];
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
};

export async function getUserProfile(userId: number, viewerId?: number): Promise<UserProfileDTO> {
  // fetch the core user + counts + badges + follow info
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      bio: true,
      avatarUrl: true,
      location: true,
      timezone: true,
      muskBucks: true,
      notifyOnResolve: true,
      theme: true,
      twoFactorEnabled: true,
      successRate: true,
      totalPredictions: true,
      currentStreak: true,
      longestStreak: true,
      userBadges: {
        select: {
          badge: {
            select: { id: true, name: true, description: true, iconUrl: true },
          },
          awardedAt: true,
        },
      },
      _count: {
        select: { followers: true, following: true },
      },
    },
  });

  if (!user) throw new Error('User not found');

  // optional: compute rank by comparing muskBucks to others
  // (you might do this in SQL with a window function)
  const rawRank = (await prisma.$queryRawUnsafe(
    `SELECT rank FROM (
     SELECT id, RANK() OVER (ORDER BY "muskBucks" DESC) AS rank
     FROM "User"
   ) u WHERE u.id = $1;`,
    userId,
  )) as { rank: bigint }[];
  let rank: number | undefined;
  if (Array.isArray(rawRank) && rawRank.length > 0) {
    const r = rawRank[0].rank;
    rank = typeof r === 'bigint' ? Number(r) : r;
  } else {
    rank = undefined;
  }

  // optional: check if the viewer is following
  let isFollowing = false;
  if (viewerId) {
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: viewerId,
          followingId: userId,
        },
      },
    });
    isFollowing = Boolean(follow);
  }

  return {
    id: user.id,
    name: user.name,
    muskBucks: user.muskBucks,
    rank,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
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
    badges: user.userBadges.map((ub) => ({
      id: ub.badge.id,
      name: ub.badge.name,
      description: ub.badge.description,
      iconUrl: ub.badge.iconUrl,
      awardedAt: ub.awardedAt,
    })),
    followersCount: user._count.followers,
    followingCount: user._count.following,
    isFollowing,
  };
}

/**
 * Follow a user.
 */
export async function followUser(followerId: number, followingId: number): Promise<void> {
  await prisma.follow.create({
    data: { followerId, followingId },
  });
}

/**
 * Unfollow a user.
 */
export async function unfollowUser(followerId: number, followingId: number): Promise<void> {
  await prisma.follow.delete({
    where: {
      followerId_followingId: { followerId, followingId },
    },
  });
}

/**
 * Update user profile fields.
 */
export async function updateUserProfile(
  userId: number,
  data: {
    bio?: string | null;
    avatarUrl?: string | null;
    location?: string | null;
    timezone?: string | null;
    notifyOnResolve?: boolean;
    theme?: Theme;
    twoFactorEnabled?: boolean;
    profileComplete?: boolean;
    // note: no `role` here!
  },
): Promise<UserProfileDTO> {
  // Whitelist only the fields we allow to be written
  const {
    bio,
    avatarUrl,
    location,
    timezone,
    notifyOnResolve,
    theme,
    twoFactorEnabled,
    profileComplete,
  } = data;

  await prisma.user.update({
    where: { id: userId },
    data: {
      bio,
      avatarUrl,
      location,
      timezone,
      notifyOnResolve,
      ...(theme !== undefined ? { theme } : {}),
      twoFactorEnabled,
      profileComplete,
    },
  });

  return getUserProfile(userId, userId);
}
