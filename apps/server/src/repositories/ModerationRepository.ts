// apps/server/src/repositories/ModerationRepository.ts
import { PrismaClient, BanType } from '@prisma/client';
import type {
  IModerationRepository,
  CreateBanData,
  CreateModerationLogData,
  BanWithUser,
  ModerationLogWithUsers,
} from './interfaces/IModerationRepository';
import type { UserBan, ModerationLog, User, Message, UserPost } from '@prisma/client';

export class ModerationRepository implements IModerationRepository {
  constructor(private prisma: PrismaClient) {}

  async createBan(data: CreateBanData): Promise<UserBan> {
    return this.prisma.userBan.create({
      data: {
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  async getActiveBans(): Promise<BanWithUser[]> {
    return this.prisma.userBan.findMany({
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
            email: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBanById(banId: number): Promise<BanWithUser | null> {
    return this.prisma.userBan.findUnique({
      where: { id: banId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async getBanByUserId(userId: number): Promise<UserBan | null> {
    return this.prisma.userBan.findFirst({
      where: {
        userId,
        isActive: true,
        OR: [
          { expiresAt: null }, // Permanent bans
          { expiresAt: { gt: new Date() } }, // Non-expired temporary bans
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateBanStatus(banId: number, isActive: boolean): Promise<UserBan> {
    return this.prisma.userBan.update({
      where: { id: banId },
      data: { isActive },
    });
  }

  async checkExpiredBans(): Promise<number> {
    const result = await this.prisma.userBan.updateMany({
      where: {
        isActive: true,
        expiresAt: {
          lte: new Date(),
        },
      },
      data: {
        isActive: false,
      },
    });
    return result.count;
  }

  async countUserBans(userId: number): Promise<number> {
    return this.prisma.userBan.count({
      where: { userId },
    });
  }

  async deleteMessage(messageId: number): Promise<boolean> {
    try {
      await this.prisma.message.delete({
        where: { id: messageId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getMessage(messageId: number): Promise<Message | null> {
    return this.prisma.message.findUnique({
      where: { id: messageId },
    });
  }

  async deletePost(postId: number): Promise<boolean> {
    try {
      await this.prisma.userPost.delete({
        where: { id: postId },
      });
      return true;
    } catch {
      return false;
    }
  }

  async getPost(postId: number): Promise<UserPost | null> {
    return this.prisma.userPost.findUnique({
      where: { id: postId },
    });
  }

  async createModerationLog(data: CreateModerationLogData): Promise<ModerationLog> {
    return this.prisma.moderationLog.create({
      data,
    });
  }

  async getModerationHistory(
    targetUserId?: number,
    moderatorId?: number,
  ): Promise<ModerationLogWithUsers[]> {
    const where: any = {};
    if (targetUserId) where.targetUserId = targetUserId;
    if (moderatorId) where.moderatorId = moderatorId;

    return this.prisma.moderationLog.findMany({
      where,
      include: {
        moderator: {
          select: {
            id: true,
            name: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getRecentModerationActions(limit = 50): Promise<ModerationLogWithUsers[]> {
    return this.prisma.moderationLog.findMany({
      take: limit,
      include: {
        moderator: {
          select: {
            id: true,
            name: true,
          },
        },
        targetUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async getBanHistoryWithModerator(limit: number): Promise<
    Array<{
      id: number;
      userId: number;
      userName: string;
      banType: BanType;
      reason: string;
      startDate: string;
      endDate: string | null;
      isActive: boolean;
      moderatorName: string;
    }>
  > {
    const bans = await this.prisma.userBan.findMany({
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

    // Get moderator info from moderation logs
    const result = [];
    for (const ban of bans) {
      const log = await this.prisma.moderationLog.findFirst({
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

      result.push({
        id: ban.id,
        userId: ban.userId,
        userName: ban.user.name,
        banType: ban.banType,
        reason: ban.reason,
        startDate: ban.createdAt.toISOString(),
        endDate: ban.expiresAt?.toISOString() || null,
        isActive: ban.isActive,
        moderatorName: log?.moderator.name || 'System',
      });
    }

    return result;
  }

  async getUserById(userId: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async updateUserActiveStatus(userId: number, active: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { active },
    });
  }
}
