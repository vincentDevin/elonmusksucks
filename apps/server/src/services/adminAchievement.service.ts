import { PrismaClient } from '@prisma/client';
import { unifiedActivityService } from './unifiedActivity.service';
import {
  AchievementRepository,
  IAchievementRepository,
} from '../repositories/AchievementRepository';

const prisma = new PrismaClient();
const achievementRepository = new AchievementRepository(prisma);

export interface CreateAchievementData {
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface UpdateAchievementData {
  title?: string;
  description?: string;
  category?: string;
  targetValue?: number;
  iconUrl?: string;
  isActive?: boolean;
  sortOrder?: number;
}

export interface AchievementWithStats {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  totalUsers: number;
  completedUsers: number;
  completionRate: number;
  recentUnlocks: Array<{
    userId: number;
    userName: string;
    completedAt: Date;
  }>;
}

export interface AchievementAnalytics {
  overview: {
    totalAchievements: number;
    totalCategories: number;
    totalUnlocks: number;
    activeUsers: number;
    averageCompletion: number;
  };
  categoryBreakdown: Array<{
    category: string;
    achievementCount: number;
    totalUnlocks: number;
    averageCompletion: number;
  }>;
  topAchievements: Array<{
    id: number;
    name: string;
    title: string;
    completedUsers: number;
    completionRate: number;
  }>;
  recentActivity: Array<{
    achievementId: number;
    achievementTitle: string;
    userId: number;
    userName: string;
    completedAt: Date;
  }>;
}

class AdminAchievementService {
  private achievementRepository: IAchievementRepository;

  constructor(achievementRepository?: IAchievementRepository) {
    this.achievementRepository = achievementRepository || new AchievementRepository(prisma);
  }

  /**
   * Get all achievements with statistics
   */
  async getAllAchievements(): Promise<AchievementWithStats[]> {
    const achievements = await this.achievementRepository.findMany({
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    const achievementsWithStats = await Promise.all(
      achievements.map(async (achievement) => {
        const userProgress = await this.achievementRepository.findUserAchievementsByAchievementId(
          achievement.id,
          {
            include: { user: true },
            orderBy: { completedAt: 'desc' },
            take: 5,
          },
        );

        const totalUsers = userProgress.length;
        const completedUsers = userProgress.filter((p) => p.completedAt !== null).length;

        return {
          ...achievement,
          totalUsers,
          completedUsers,
          completionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
          recentUnlocks: userProgress
            .filter((p) => p.completedAt)
            .map((p) => ({
              userId: p.userId,
              userName: p.user.name,
              completedAt: p.completedAt!,
            })),
        };
      }),
    );

    return achievementsWithStats;
  }

  /**
   * Get single achievement with detailed stats
   */
  async getAchievementById(achievementId: number): Promise<AchievementWithStats | null> {
    const achievement = await this.achievementRepository.findById(achievementId);

    if (!achievement) return null;

    const userProgress = await this.achievementRepository.findUserAchievementsByAchievementId(
      achievementId,
      {
        include: { user: true },
        orderBy: { completedAt: 'desc' },
      },
    );

    const totalUsers = userProgress.length;
    const completedUsers = userProgress.filter((p) => p.completedAt !== null).length;

    return {
      ...achievement,
      totalUsers,
      completedUsers,
      completionRate: totalUsers > 0 ? (completedUsers / totalUsers) * 100 : 0,
      recentUnlocks: userProgress
        .filter((p) => p.completedAt)
        .slice(0, 10)
        .map((p) => ({
          userId: p.userId,
          userName: p.user.name,
          completedAt: p.completedAt!,
        })),
    };
  }

  /**
   * Create a new achievement
   */
  async createAchievement(data: CreateAchievementData): Promise<AchievementWithStats> {
    // Validate unique name
    const existing = await achievementRepository.findByName(data.name);

    if (existing) {
      throw new Error(`Achievement with name "${data.name}" already exists`);
    }

    const achievement = await achievementRepository.create({
      name: data.name,
      title: data.title,
      description: data.description,
      category: data.category,
      targetValue: data.targetValue,
      iconUrl: data.iconUrl || null,
      isActive: data.isActive ?? true,
      sortOrder: data.sortOrder ?? 999,
    });

    // Initialize progress for all existing users if this is an automatic achievement
    if (data.targetValue > 0) {
      const users = await achievementRepository.findAllUserIds();

      await achievementRepository.createManyUserAchievements(
        users.map((user) => ({
          userId: user.id,
          achievementId: achievement.id,
          progress: 0,
        })),
      );
    }

    return {
      ...achievement,
      totalUsers: 0,
      completedUsers: 0,
      completionRate: 0,
      recentUnlocks: [],
    };
  }

  /**
   * Update an achievement
   */
  async updateAchievement(
    achievementId: number,
    data: UpdateAchievementData,
  ): Promise<AchievementWithStats> {
    await achievementRepository.update(achievementId, {
      title: data.title,
      description: data.description,
      category: data.category,
      targetValue: data.targetValue,
      iconUrl: data.iconUrl,
      isActive: data.isActive,
      sortOrder: data.sortOrder,
      updatedAt: new Date(),
    });

    return this.getAchievementById(achievementId) as Promise<AchievementWithStats>;
  }

  /**
   * Delete an achievement (and all user progress)
   */
  async deleteAchievement(achievementId: number): Promise<void> {
    // Delete all user progress first
    await achievementRepository.deleteUserAchievementsByAchievementId(achievementId);

    // Delete the achievement
    await achievementRepository.delete(achievementId);
  }

  /**
   * Manually grant an achievement to a user
   */
  async grantAchievement(achievementId: number, userId: number): Promise<void> {
    const achievement = await achievementRepository.findById(achievementId);

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    const user = await achievementRepository.findUserById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    // Check if already granted
    const existing = await achievementRepository.findUserAchievementByUserAndAchievementId(
      userId,
      achievementId,
    );

    if (existing?.completedAt) {
      throw new Error('User already has this achievement');
    }

    // Grant the achievement
    await achievementRepository.updateUserAchievement({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      create: {
        userId,
        achievementId,
        progress: achievement.targetValue,
        completedAt: new Date(),
      },
      update: {
        progress: achievement.targetValue,
        completedAt: new Date(),
      },
    });

    // Create activity for manual grant
    await unifiedActivityService.createAchievementActivity(
      {
        id: userId,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
      {
        id: achievement.id,
        name: achievement.name,
        description: achievement.description,
      },
    );

    console.log(`[admin] Manually granted achievement "${achievement.title}" to user ${user.name}`);
  }

  /**
   * Revoke an achievement from a user
   */
  async revokeAchievement(achievementId: number, userId: number): Promise<void> {
    const existing = await achievementRepository.findUserAchievementByUserAndAchievementId(
      userId,
      achievementId,
    );

    if (!existing) {
      throw new Error('User does not have this achievement');
    }

    // Reset progress and completion
    await achievementRepository.updateUserAchievement({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      create: {
        userId,
        achievementId,
        progress: 0,
        completedAt: null,
      },
      update: {
        progress: 0,
        completedAt: null,
      },
    });
  }

  /**
   * Bulk grant achievements to multiple users
   */
  async bulkGrantAchievement(
    achievementId: number,
    userIds: number[],
  ): Promise<{
    successCount: number;
    failureCount: number;
    errors: Array<{ userId: number; error: string }>;
  }> {
    const achievement = await achievementRepository.findById(achievementId);

    if (!achievement) {
      throw new Error('Achievement not found');
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ userId: number; error: string }> = [];

    for (const userId of userIds) {
      try {
        await this.grantAchievement(achievementId, userId);
        successCount++;
      } catch (error) {
        failureCount++;
        errors.push({
          userId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { successCount, failureCount, errors };
  }

  /**
   * Get users who have a specific achievement
   */
  async getUsersWithAchievement(achievementId: number): Promise<
    Array<{
      userId: number;
      userName: string;
      progress: number;
      completedAt: Date | null;
    }>
  > {
    const userProgress = await achievementRepository.findUserAchievementsByAchievementId(
      achievementId,
      {
        include: { user: true },
        orderBy: { completedAt: 'desc' },
      },
    );

    return userProgress.map((p: any) => ({
      userId: p.userId,
      userName: p.user.name,
      progress: p.progress,
      completedAt: p.completedAt,
    }));
  }

  /**
   * Get system-wide achievement analytics
   */
  async getAchievementAnalytics(): Promise<AchievementAnalytics> {
    const achievements = await achievementRepository.findAllAchievements();
    const userAchievements = await achievementRepository.findAllUserAchievementsWithDetails();

    // Calculate overview stats
    const totalAchievements = achievements.length;
    const categories = [...new Set(achievements.map((a) => a.category))];
    const totalCategories = categories.length;
    const completedAchievements = userAchievements.filter((ua) => ua.completedAt !== null);
    const totalUnlocks = completedAchievements.length;
    const activeUsers = [...new Set(userAchievements.map((ua) => ua.userId))].length;

    // Calculate average completion
    const achievementCompletions = achievements.map((achievement) => {
      const progress = userAchievements.filter((ua) => ua.achievementId === achievement.id);
      const completed = progress.filter((p) => p.completedAt !== null).length;
      return progress.length > 0 ? completed / progress.length : 0;
    });
    const averageCompletion =
      (achievementCompletions.reduce((sum, rate) => sum + rate, 0) / totalAchievements) * 100;

    // Category breakdown
    const categoryBreakdown = categories.map((category) => {
      const categoryAchievements = achievements.filter((a) => a.category === category);
      const categoryProgress = userAchievements.filter((ua) =>
        categoryAchievements.some((ca) => ca.id === ua.achievementId),
      );
      const categoryCompleted = categoryProgress.filter((p) => p.completedAt !== null);

      return {
        category,
        achievementCount: categoryAchievements.length,
        totalUnlocks: categoryCompleted.length,
        averageCompletion:
          categoryProgress.length > 0
            ? (categoryCompleted.length / categoryProgress.length) * 100
            : 0,
      };
    });

    // Top achievements by completion
    const topAchievements = achievements
      .map((achievement) => {
        const progress = userAchievements.filter((ua) => ua.achievementId === achievement.id);
        const completed = progress.filter((p) => p.completedAt !== null).length;

        return {
          id: achievement.id,
          name: achievement.name,
          title: achievement.title,
          completedUsers: completed,
          completionRate: progress.length > 0 ? (completed / progress.length) * 100 : 0,
        };
      })
      .sort((a, b) => b.completedUsers - a.completedUsers)
      .slice(0, 10);

    // Recent activity
    const recentActivity = completedAchievements
      .sort((a, b) => b.completedAt!.getTime() - a.completedAt!.getTime())
      .slice(0, 20)
      .map((ua) => ({
        achievementId: ua.achievementId,
        achievementTitle: ua.achievement.title,
        userId: ua.userId,
        userName: ua.user.name,
        completedAt: ua.completedAt!,
      }));

    return {
      overview: {
        totalAchievements,
        totalCategories,
        totalUnlocks,
        activeUsers,
        averageCompletion,
      },
      categoryBreakdown,
      topAchievements,
      recentActivity,
    };
  }

  /**
   * Get recent achievement unlocks for a user
   */
  async getRecentAchievements(
    userId: number,
    limit: number = 5,
  ): Promise<
    Array<{
      id: string;
      name: string;
      title: string;
      description: string;
      category: string;
      iconUrl: string | null;
      completedAt: string;
    }>
  > {
    const recentAchievements = await prisma.userAchievement.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        achievement: true,
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });

    return recentAchievements.map((ua) => ({
      id: ua.achievement.name, // Use name as ID for frontend compatibility
      name: ua.achievement.name,
      title: ua.achievement.title,
      description: ua.achievement.description,
      category: ua.achievement.category,
      iconUrl: ua.achievement.iconUrl,
      completedAt: ua.completedAt!.toISOString(),
    }));
  }
}

export const adminAchievementService = new AdminAchievementService();
