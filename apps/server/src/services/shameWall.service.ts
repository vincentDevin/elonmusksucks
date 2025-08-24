// Shame Wall Service
// Manages banned users and shame achievements

import { PrismaClient, BanType } from '@prisma/client';
import { achievementEvaluatorService } from './achievementEvaluator.service';
import { adminAchievementService } from './adminAchievement.service';
import { UserRepository } from '../repositories/UserRepository';
import { ModerationRepository } from '../repositories/ModerationRepository';
import { AchievementRepository } from '../repositories/AchievementRepository';
import type { BanRequest } from '@ems/types';

const prisma = new PrismaClient();
const userRepository = new UserRepository();
const moderationRepository = new ModerationRepository(prisma);
const achievementRepository = new AchievementRepository(prisma);

// TEMP: Re-export for backwards compatibility during migration
export type { BanRequest } from '@ems/types';

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
  private achievementRepository = new AchievementRepository(prisma);
  private moderationRepository = new ModerationRepository(prisma);
  /**
   * Issue a ban and award appropriate shame achievements
   */
  async issueBan(request: BanRequest): Promise<BanHistory> {
    const { userId, reason, durationDays, moderatorId } = request;

    const user = await userRepository.findUserBasicById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const moderator = await userRepository.findUserBasicById(moderatorId);

    if (!moderator) {
      throw new Error('Moderator not found');
    }

    const isPermanent = !durationDays;
    const banType = isPermanent ? BanType.PERMANENT : BanType.TEMPORARY;
    const expiresAt = isPermanent
      ? null
      : new Date(Date.now() + durationDays! * 24 * 60 * 60 * 1000);

    // Create the ban record
    const ban = await moderationRepository.createBan({
      userId,
      banType,
      reason,
      expiresAt: expiresAt || undefined,
      isActive: true,
    });

    // Create moderation log
    await moderationRepository.createModerationLog({
      moderatorId,
      targetUserId: userId,
      action: 'USER_BAN',
      reason,
      details: {
        banType,
        durationDays: durationDays || null,
        banId: ban.id,
      },
    });

    // Count total bans for this user
    const banCount = await moderationRepository.countUserBans(userId);

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
    const ban = await moderationRepository.getBanById(banId);

    if (!ban) {
      throw new Error('Ban not found');
    }

    if (!ban.isActive) {
      throw new Error('Ban is already inactive');
    }

    // Deactivate ban
    await moderationRepository.updateBanStatus(banId, false);

    // Log the unban action
    await moderationRepository.createModerationLog({
      moderatorId,
      targetUserId: ban.userId,
      action: 'USER_UNBAN',
      reason: reason || 'Ban lifted',
      details: {
        originalBanId: banId,
        originalReason: ban.reason,
      },
    });

    console.log(`[shame-wall] Lifted ban for user ${ban.user.name} (ID: ${ban.userId})`);
  }

  /**
   * Get current shame wall (active bans with shame achievements)
   */
  async getShameWall(): Promise<ShameWallEntry[]> {
    const activeBans = await moderationRepository.getActiveBans();

    // Get ban counts for each user
    const userIds = activeBans.map((ban) => ban.userId);
    const banCounts = await Promise.all(
      userIds.map(async (userId) => ({
        userId,
        count: await moderationRepository.countUserBans(userId),
      })),
    );
    const banCountMap = Object.fromEntries(banCounts.map((bc) => [bc.userId, bc.count]));

    // Get shame achievements for each banned user
    const shameWallEntries = await Promise.all(
      activeBans.map(async (ban) => {
        // Get shame achievements for this user
        const shameAchievements = await achievementRepository.getShameAchievements(ban.userId);

        return {
          userId: ban.user.id,
          userName: ban.user.name,
          avatarUrl: ban.user.avatarUrl || undefined,
          reason: ban.reason,
          startDate: ban.createdAt.toISOString(),
          endDate: ban.expiresAt?.toISOString(),
          isActive: ban.isActive,
          shameAchievements: shameAchievements.map((achievement) => ({
            slug: achievement.slug,
            title: achievement.title,
            description: achievement.description,
            awardedAt: achievement.completedAt.toISOString(),
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
    const history = await moderationRepository.getBanHistoryWithModerator(limit);
    return history.map((ban) => ({
      ...ban,
      endDate: ban.endDate || undefined,
      shameAchievementsAwarded: [], // Would need to track this separately
    }));
  }

  /**
   * Automatically lift expired bans (run via cron/worker)
   */
  async expireOldBans(): Promise<number> {
    const expiredCount = await moderationRepository.checkExpiredBans();

    if (expiredCount > 0) {
      console.log(`[shame-wall] Auto-expired ${expiredCount} temporary bans`);
    }

    return expiredCount;
  }

  /**
   * Helper: Get achievement ID by slug
   */
  private async getAchievementIdBySlug(slug: string): Promise<number> {
    const achievement = await this.achievementRepository.findByName(slug);

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
    const achievement = await this.achievementRepository.findShameAchievementByName(slug);

    if (!achievement) {
      throw new Error('Shame achievement not found');
    }

    await adminAchievementService.grantAchievement(achievement.id, userId);

    // Log the manual shame award
    await this.moderationRepository.createModerationLog({
      moderatorId,
      targetUserId: userId,
      action: 'USER_BAN', // Closest existing action
      reason: reason || `Manual shame achievement: ${achievement.title}`,
      details: {
        achievementSlug: slug,
        achievementTitle: achievement.title,
        type: 'manual_shame_award',
      },
    });
  }
}

export const shameWallService = new ShameWallService();
