// apps/server/src/repositories/PrismaAdminRepository.ts
import {
  PrismaClient,
  Role,
  User,
  Prediction,
  Bet,
  Transaction,
  Badge,
  UserBadge,
  UserStats,
  AITweet,
  UserPost,
} from '@prisma/client';
import type { QueryParams, IAdminRepository } from './IAdminRepository';

export class PrismaAdminRepository implements IAdminRepository {
  private prisma = new PrismaClient();

  // -- User Management --
  async findAllUsers(): Promise<User[]> {
    return this.prisma.user.findMany();
  }

  async updateUserRole(userId: number, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateUserActive(userId: number, active: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { active },
    });
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { muskBucks: amount },
    });
  }

  // -- Prediction Management --
  async findPredictions(_filters?: QueryParams): Promise<Prediction[]> {
    // include the options so the admin UI can render them
    return this.prisma.prediction.findMany({
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updatePredictionStatus(
    predictionId: number,
    status: 'approved' | 'rejected',
  ): Promise<Prediction> {
    return this.prisma.prediction.update({
      where: { id: predictionId },
      data: { approved: status === 'approved' },
    });
  }

  // -- Bet & Transaction Oversight --
  async findBets(_filters?: QueryParams): Promise<Bet[]> {
    return this.prisma.bet.findMany();
  }

  async refundBet(betId: number): Promise<Bet> {
    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: 'REFUNDED' },
    });
  }

  async findTransactions(_filters?: QueryParams): Promise<Transaction[]> {
    return this.prisma.transaction.findMany();
  }

  // -- Badge & Content Moderation --
  async findPosts(_filters?: QueryParams): Promise<UserPost[]> {
    return this.prisma.userPost.findMany();
  }

  async deletePost(postId: number): Promise<void> {
    await this.prisma.userPost.delete({ where: { id: postId } });
  }

  async findAllBadges(): Promise<Badge[]> {
    return this.prisma.badge.findMany();
  }

  async insertBadge(data: {
    name: string;
    description?: string;
    iconUrl?: string;
  }): Promise<Badge> {
    return this.prisma.badge.create({ data });
  }

  async addBadgeToUser(userId: number, badgeId: number): Promise<UserBadge> {
    return this.prisma.userBadge.create({
      data: { userId, badgeId, awardedAt: new Date() },
    });
  }

  async removeBadgeFromUser(userId: number, badgeId: number): Promise<void> {
    await this.prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId } },
    });
  }

  // -- Leaderboard & Stats --
  async recalculateLeaderboard(): Promise<void> {
    // refresh the materialized view
    await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;');
  }

  async findUserStats(userId: number): Promise<UserStats | null> {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  // -- Miscellaneous --
  async triggerAITweet(): Promise<AITweet> {
    return this.prisma.aITweet.create({
      data: {
        content: 'Placeholder AI tweet',
      },
    });
  }
}
