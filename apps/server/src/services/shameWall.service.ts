// Shame Wall Service
// Manages banned users and shame achievements

import { PrismaClient, BanType } from '@prisma/client';
import { achievementEvaluatorService } from './achievementEvaluator.service';
import { adminAchievementService } from './adminAchievement.service';

const prisma = new PrismaClient();

export interface BanRequest {
  userId: number;
  reason: string;
  durationDays?: number; // undefined = permanent
  moderatorId: number;
}

export interface ShameWallEntry {
  userId: number;
  userName: string;
  avatarUrl?: string;
  reason: string;
  startDate: string;
  endDate?: string; // null for permanent
  isActive: boolean;
  shameAchievements: Array<{
    slug: string;
    title: string;
    description: string;
    awardedAt: string;
  }>;
  banCount: number;
}

export interface BanHistory {
  id: number;
  userId: number;
  userName: string;
  banType: BanType;
  reason: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  moderatorName: string;
  shameAchievementsAwarded: string[];
}

class ShameWallService {
  /**
   * Issue a ban and award appropriate shame achievements
   */
  async issueBan(request: BanRequest): Promise<BanHistory> {
    const { userId, reason, durationDays, moderatorId } = request;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const moderator = await prisma.user.findUnique({
      where: { id: moderatorId },
      select: { name: true },
    });

    if (!moderator) {
      throw new Error('Moderator not found');
    }

    const isPermanent = !durationDays;
    const banType = isPermanent ? BanType.PERMANENT : BanType.TEMPORARY;
    const expiresAt = isPermanent
      ? null
      : new Date(Date.now() + durationDays! * 24 * 60 * 60 * 1000);

    // Create the ban record
    const ban = await prisma.userBan.create({
      data: {
        userId,
        banType,
        reason,
        expiresAt,
        isActive: true,
      },
    });

    // Create moderation log
    await prisma.moderationLog.create({
      data: {
        moderatorId,
        targetUserId: userId,
        action: 'USER_BAN',
        reason,
        details: {
          banType,
          durationDays: durationDays || null,
          banId: ban.id,
        },
      },
    });

    // Count total bans for this user
    const banCount = await prisma.userBan.count({
      where: { userId },
    });

    const shameAchievementsAwarded: string[] = [];

    // Award appropriate shame achievements
    if (isPermanent) {
      await adminAchievementService.grantAchievement(
        await this.getAchievementIdBySlug('perma-banned-legend'),
        userId,
      );
      shameAchievementsAwarded.push('perma-banned-legend');
    }

    if (durationDays === 7) {
      await adminAchievementService.grantAchievement(
        await this.getAchievementIdBySlug('one-week-timeout'),
        userId,
      );
      shameAchievementsAwarded.push('one-week-timeout');
    }

    if (banCount >= 3) {
      await adminAchievementService.grantAchievement(
        await this.getAchievementIdBySlug('community-menace'),
        userId,
      );
      shameAchievementsAwarded.push('community-menace');
    }

    // Trigger achievement evaluation for ban event
    await achievementEvaluatorService.processAchievementEvent({
      type: 'user_banned',
      userId,
      timestamp: new Date().toISOString(),
      data: {
        banType,
        durationDays,
        reason,
        banCount,
      },
    });

    return {
      id: ban.id,
      userId,
      userName: user.name,
      banType,
      reason,
      startDate: ban.createdAt.toISOString(),
      endDate: expiresAt?.toISOString(),
      isActive: true,
      moderatorName: moderator.name,
      shameAchievementsAwarded,
    };
  }

  /**
   * Lift a ban (for temporary bans or pardons)
   */
  async liftBan(banId: number, moderatorId: number, reason?: string): Promise<void> {
    const ban = await prisma.userBan.findUnique({
      where: { id: banId },
      include: { user: true },
    });

    if (!ban) {
      throw new Error('Ban not found');
    }

    if (!ban.isActive) {
      throw new Error('Ban is already inactive');
    }

    // Deactivate ban
    await prisma.userBan.update({
      where: { id: banId },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    // Log the unban action
    await prisma.moderationLog.create({
      data: {
        moderatorId,
        targetUserId: ban.userId,
        action: 'USER_UNBAN',
        reason: reason || 'Ban lifted',
        details: {
          originalBanId: banId,
          originalReason: ban.reason,
        },
      },
    });

    console.log(`[shame-wall] Lifted ban for user ${ban.user.name} (ID: ${ban.userId})`);
  }

  /**
   * Get current shame wall (active bans with shame achievements)
   */
  async getShameWall(): Promise<ShameWallEntry[]> {
    const activeBans = await prisma.userBan.findMany({
      where: {
        isActive: true,
        OR: [
          { expiresAt: null }, // Permanent bans
          { expiresAt: { gt: new Date() } }, // Non-expired temporary bans
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Get ban counts for each user
    const userIds = activeBans.map((ban) => ban.userId);
    const banCounts = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        count: await prisma.userBan.count({ where: { userId } }),
      })),
    );
    const banCountMap = Object.fromEntries(banCounts.map((bc) => [bc.userId, bc.count]));

    // Get shame achievements for each banned user
    const shameWallEntries = await Promise.all(
      activeBans.map(async (ban) => {
        // Get shame achievements for this user
        const shameAchievements = await prisma.userAchievement.findMany({
          where: {
            userId: ban.userId,
            completedAt: { not: null },
            achievement: {
              isShame: true,
            },
          },
          include: {
            achievement: {
              select: {
                slug: true,
                title: true,
                description: true,
              },
            },
          },
        });

        return {
          userId: ban.user.id,
          userName: ban.user.name,
          avatarUrl: ban.user.avatarUrl || undefined,
          reason: ban.reason,
          startDate: ban.createdAt.toISOString(),
          endDate: ban.expiresAt?.toISOString(),
          isActive: ban.isActive,
          shameAchievements: shameAchievements.map((ua) => ({
            slug: ua.achievement.slug!,
            title: ua.achievement.title,
            description: ua.achievement.description,
            awardedAt: ua.completedAt!.toISOString(),
          })),
          banCount: banCountMap[ban.userId] || 1,
        };
      }),
    );

    return shameWallEntries;
  }

  /**
   * Get ban history for admin
   */
  async getBanHistory(limit = 50): Promise<BanHistory[]> {
    const bans = await prisma.userBan.findMany({
      include: {
        user: {
          select: { name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Get moderator info from moderation logs (simplified approach)
    const moderatorMap: Record<number, string> = {};

    for (const ban of bans) {
      // Get the moderation log for this specific ban
      const log = await prisma.moderationLog.findFirst({
        where: {
          action: 'USER_BAN',
          targetUserId: ban.userId,
          createdAt: {
            gte: new Date(ban.createdAt.getTime() - 1000), // 1 second tolerance
            lte: new Date(ban.createdAt.getTime() + 1000),
          },
        },
        include: {
          moderator: {
            select: { name: true },
          },
        },
      });

      if (log) {
        moderatorMap[ban.id] = log.moderator.name;
      }
    }

    return bans.map((ban) => ({
      id: ban.id,
      userId: ban.userId,
      userName: ban.user.name,
      banType: ban.banType,
      reason: ban.reason,
      startDate: ban.createdAt.toISOString(),
      endDate: ban.expiresAt?.toISOString(),
      isActive: ban.isActive,
      moderatorName: moderatorMap[ban.id] || 'System',
      shameAchievementsAwarded: [], // Would need to track this separately
    }));
  }

  /**
   * Automatically lift expired bans (run via cron/worker)
   */
  async expireOldBans(): Promise<number> {
    const expiredBans = await prisma.userBan.updateMany({
      where: {
        isActive: true,
        banType: BanType.TEMPORARY,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });

    if (expiredBans.count > 0) {
      console.log(`[shame-wall] Auto-expired ${expiredBans.count} temporary bans`);
    }

    return expiredBans.count;
  }

  /**
   * Helper: Get achievement ID by slug
   */
  private async getAchievementIdBySlug(slug: string): Promise<number> {
    const achievement = await prisma.achievement.findFirst({
      where: { name: slug }, // Use name field for now until slug is populated
      select: { id: true },
    });

    if (!achievement) {
      throw new Error(`Achievement not found: ${slug}`);
    }

    return achievement.id;
  }

  /**
   * Award manual shame achievement
   */
  async awardShameAchievement(
    userId: number,
    slug: string,
    moderatorId: number,
    reason?: string,
  ): Promise<void> {
    const achievement = await prisma.achievement.findFirst({
      where: {
        name: slug, // Use name field for now until slug is populated
        isShame: true,
      },
    });

    if (!achievement) {
      throw new Error('Shame achievement not found');
    }

    await adminAchievementService.grantAchievement(achievement.id, userId);

    // Log the manual shame award
    await prisma.moderationLog.create({
      data: {
        moderatorId,
        targetUserId: userId,
        action: 'USER_BAN', // Closest existing action
        reason: reason || `Manual shame achievement: ${achievement.title}`,
        details: {
          achievementSlug: slug,
          achievementTitle: achievement.title,
          type: 'manual_shame_award',
        },
      },
    });
  }
}

export const shameWallService = new ShameWallService();
