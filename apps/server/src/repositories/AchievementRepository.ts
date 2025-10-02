import { PrismaClient, Prisma } from '@prisma/client';
import type {
  PrismaAchievement,
  PrismaUser,
  DbAchievementQueryParams,
  DbUserAchievementQueryParams,
  DetailedAchievement,
  DetailedUserAchievement,
  CreateAchievementData,
  UpdateAchievementData,
  CreateUserAchievementData,
  UpdateUserAchievementData,
  BulkCreateUserAchievementData,
  DbAchievementRule,
  DbAchievementRuleMetrics,
  ShameAchievement,
} from '@ems/types';
import { RuleComplexityTracker } from '../services/achievements/ruleComplexityTracker.service';
import type { IAchievementRepository } from './interfaces/IAchievementRepository';

// Helper type for rule data structure
interface JsonRuleAchievementData {
  eventKeys: string[];
  progress: {
    kind: string;
    incrementIf?: Record<string, unknown>;
  };
  unlockWhen: Record<string, unknown>;
  counters?: string[];
}

export class AchievementRepository implements IAchievementRepository {
  private complexityTracker = new RuleComplexityTracker();

  constructor(private prisma: PrismaClient) {}

  async findMany(params?: DbAchievementQueryParams): Promise<PrismaAchievement[]> {
    const where: Prisma.AchievementWhereInput = {};

    if (params) {
      if (params.category) where.category = params.category;
      if (params.rarity) where.rarity = params.rarity;
      if (params.isActive !== undefined) where.isActive = params.isActive;
      if (params.autoAward !== undefined) where.autoAward = params.autoAward;
      if (params.manualOnly !== undefined) where.manualOnly = params.manualOnly;
      if (params.isShame !== undefined) where.isShame = params.isShame;
    }

    return this.prisma.achievement.findMany({
      where,
      take: params?.limit,
      skip: params?.offset,
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findById(id: number): Promise<DetailedAchievement | null> {
    if (typeof id !== 'number' || isNaN(id)) {
      throw new Error(`Invalid achievement ID: ${id} (type: ${typeof id})`);
    }

    const achievement = await this.prisma.achievement.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            userProgress: true,
          },
        },
      },
    });

    if (!achievement) return null;

    // Transform to DetailedAchievement
    return {
      ...achievement,
      totalEarned: achievement._count.userProgress,
    };
  }

  async findBySlug(slug: string): Promise<PrismaAchievement | null> {
    return this.prisma.achievement.findUnique({
      where: { slug },
    });
  }

  async findByName(name: string): Promise<PrismaAchievement | null> {
    return this.prisma.achievement.findUnique({
      where: { name },
    });
  }

  async create(data: CreateAchievementData): Promise<PrismaAchievement> {
    return this.prisma.achievement.create({
      data: {
        name: data.name,
        slug: data.slug,
        title: data.title,
        description: data.description,
        category: data.category,
        rarity: data.rarity ?? 'common',
        targetValue: data.targetValue,
        iconUrl: data.iconUrl ?? null,
        isActive: data.isActive ?? true,
        autoAward: data.autoAward ?? true,
        manualOnly: data.manualOnly ?? false,
        isShame: data.isShame ?? false,
        sortOrder: data.sortOrder ?? 999,
        ruleData: data.ruleData ?? Prisma.JsonNull,
      },
    });
  }

  async update(id: number, data: UpdateAchievementData): Promise<PrismaAchievement> {
    const updateData: Prisma.AchievementUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.slug !== undefined) updateData.slug = data.slug;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.rarity !== undefined) updateData.rarity = data.rarity;
    if (data.targetValue !== undefined) updateData.targetValue = data.targetValue;
    if (data.iconUrl !== undefined) updateData.iconUrl = data.iconUrl;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.autoAward !== undefined) updateData.autoAward = data.autoAward;
    if (data.manualOnly !== undefined) updateData.manualOnly = data.manualOnly;
    if (data.isShame !== undefined) updateData.isShame = data.isShame;
    if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
    if (data.ruleData !== undefined) updateData.ruleData = data.ruleData ?? Prisma.JsonNull;
    if (data.ruleComplexity !== undefined) updateData.ruleComplexity = data.ruleComplexity;
    if (data.rulePerformanceScore !== undefined)
      updateData.rulePerformanceScore = data.rulePerformanceScore;
    if (data.lastRuleValidation !== undefined)
      updateData.lastRuleValidation = data.lastRuleValidation;

    return this.prisma.achievement.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: number): Promise<void> {
    await this.prisma.achievement.delete({
      where: { id },
    });
  }

  async findUserAchievements(userId: number): Promise<DetailedUserAchievement[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: [{ achievement: { category: 'asc' } }, { achievement: { sortOrder: 'asc' } }],
    });

    return userAchievements.map((ua) => ({
      ...ua,
      achievement: ua.achievement,
      percentComplete:
        ua.achievement.targetValue > 0
          ? Math.min(100, (ua.progress / ua.achievement.targetValue) * 100)
          : 0,
    }));
  }

  async findUserAchievementsByAchievementId(
    achievementId: number,
    params?: DbUserAchievementQueryParams,
  ): Promise<DetailedUserAchievement[]> {
    const where: Prisma.UserAchievementWhereInput = { achievementId };

    if (params) {
      if (params.userId) where.userId = params.userId;
      if (params.completed !== undefined) {
        where.completedAt = params.completed ? { not: null } : null;
      }
      if (params.minProgress !== undefined) {
        where.progress = { gte: params.minProgress };
      }
    }

    const userAchievements = await this.prisma.userAchievement.findMany({
      where,
      include: {
        achievement: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      take: params?.limit,
      skip: params?.offset,
      orderBy: { progress: 'desc' },
    });

    return userAchievements.map((ua) => ({
      ...ua,
      achievement: ua.achievement,
      user: ua.user,
      percentComplete:
        ua.achievement.targetValue > 0
          ? Math.min(100, (ua.progress / ua.achievement.targetValue) * 100)
          : 0,
    }));
  }

  async createUserAchievement(
    data: CreateUserAchievementData,
  ): Promise<import('@prisma/client').UserAchievement> {
    return this.prisma.userAchievement.create({
      data: {
        userId: data.userId,
        achievementId: data.achievementId,
        progress: data.progress ?? 0,
        completedAt: data.completedAt,
      },
    });
  }

  async updateUserAchievement(
    params: UpdateUserAchievementData,
  ): Promise<import('@prisma/client').UserAchievement> {
    return this.prisma.userAchievement.upsert({
      where: {
        userId_achievementId: {
          userId: params.userId,
          achievementId: params.achievementId,
        },
      },
      update: {
        progress: params.progress,
        completedAt: params.completedAt,
      },
      create: {
        userId: params.userId,
        achievementId: params.achievementId,
        progress: params.progress ?? 0,
        completedAt: params.completedAt,
      },
    });
  }

  async findAllUserIds(): Promise<{ id: number }[]> {
    return this.prisma.user.findMany({ select: { id: true } });
  }

  async createManyUserAchievements(data: BulkCreateUserAchievementData[]): Promise<void> {
    await this.prisma.userAchievement.createMany({
      data,
      skipDuplicates: true,
    });
  }

  async deleteUserAchievementsByAchievementId(achievementId: number): Promise<void> {
    await this.prisma.userAchievement.deleteMany({
      where: { achievementId },
    });
  }

  async findUserById(userId: number): Promise<PrismaUser | null> {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async findUserAchievementByUserAndAchievementId(
    userId: number,
    achievementId: number,
  ): Promise<DetailedUserAchievement | null> {
    const userAchievement = await this.prisma.userAchievement.findUnique({
      where: {
        userId_achievementId: {
          userId,
          achievementId,
        },
      },
      include: {
        achievement: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!userAchievement) return null;

    return {
      ...userAchievement,
      achievement: userAchievement.achievement,
      user: userAchievement.user,
      percentComplete:
        userAchievement.achievement.targetValue > 0
          ? Math.min(
              100,
              (userAchievement.progress / userAchievement.achievement.targetValue) * 100,
            )
          : 0,
    };
  }

  async findAllAchievements(): Promise<PrismaAchievement[]> {
    return this.prisma.achievement.findMany();
  }

  async findAllUserAchievementsWithDetails(): Promise<DetailedUserAchievement[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        achievement: true,
      },
    });

    return userAchievements.map((ua) => ({
      ...ua,
      achievement: ua.achievement,
      user: ua.user,
      percentComplete:
        ua.achievement.targetValue > 0
          ? Math.min(100, (ua.progress / ua.achievement.targetValue) * 100)
          : 0,
    }));
  }

  async findRecentUserAchievements(
    userId: number,
    limit: number,
  ): Promise<DetailedUserAchievement[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: {
        userId,
        completedAt: { not: null },
      },
      include: {
        achievement: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: limit,
    });

    return userAchievements.map((ua) => ({
      ...ua,
      achievement: ua.achievement,
      user: ua.user,
      percentComplete:
        ua.achievement.targetValue > 0
          ? Math.min(100, (ua.progress / ua.achievement.targetValue) * 100)
          : 0,
    }));
  }

  async recordEventIdempotency(
    idempotencyKey: string,
    userId: number,
    eventKey: string,
  ): Promise<boolean> {
    try {
      await this.prisma.achievementEventLog.create({
        data: {
          idempotencyKey,
          userId,
          eventKey,
        },
      });
      return true;
    } catch (error) {
      // If unique constraint fails, event already processed
      return false;
    }
  }

  async hasProcessedEvent(idempotencyKey: string): Promise<boolean> {
    const existing = await this.prisma.achievementEventLog.findUnique({
      where: { idempotencyKey },
    });
    return !!existing;
  }

  async findActiveRulesIndexedByEventKey(): Promise<Map<string, DbAchievementRule[]>> {
    try {
      // Fetch all active achievements that have rule data and auto-award enabled
      const achievements = await this.prisma.achievement.findMany({
        where: {
          isActive: true,
          autoAward: true,
          manualOnly: false,
          ruleData: {
            not: Prisma.JsonNull,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
          category: true,
          targetValue: true,
          ruleData: true,
          ruleComplexity: true,
          rulePerformanceScore: true,
        },
      });

      // Index rules by event keys
      const rulesIndex = new Map<string, DbAchievementRule[]>();

      for (const achievement of achievements) {
        if (!achievement.ruleData) continue;

        try {
          const rule = achievement.ruleData as unknown as JsonRuleAchievementData;

          // Validate rule structure
          if (!rule.eventKeys || !Array.isArray(rule.eventKeys)) {
            console.warn(
              `Achievement ${achievement.id} has invalid rule structure - missing eventKeys`,
            );
            continue;
          }

          // Create enriched rule object
          const enrichedRule: DbAchievementRule = {
            id: achievement.id,
            achievementId: achievement.id,
            eventKey: rule.eventKeys[0], // Primary event key
            ruleData: rule,
            isActive: true,
            complexity: achievement.ruleComplexity,
            performanceScore: achievement.rulePerformanceScore,
          };

          // Index by each event key this rule listens to
          for (const eventKey of rule.eventKeys) {
            if (!rulesIndex.has(eventKey)) {
              rulesIndex.set(eventKey, []);
            }
            rulesIndex.get(eventKey)!.push(enrichedRule);
          }
        } catch (error) {
          console.error(`Failed to parse rule for achievement ${achievement.id}:`, error);
          continue;
        }
      }

      return rulesIndex;
    } catch (error) {
      console.error('Failed to load achievement rules:', error);
      return new Map();
    }
  }

  /**
   * Helper method to generate default rules for legacy achievements based on category
   */
  private generateDefaultRule(achievement: PrismaAchievement): JsonRuleAchievementData | null {
    const { category, targetValue } = achievement;

    // Generate basic rules based on category
    switch (category) {
      case 'betting':
        return {
          eventKeys: ['bet:placed', 'bet:resolved'],
          progress: {
            kind: 'count',
            incrementIf: { 'payload.won': true },
          },
          unlockWhen: { 'progress >= ': targetValue },
          counters: ['betsWon'],
        };

      case 'pong':
        return {
          eventKeys: ['pong:match:recorded'],
          progress: {
            kind: 'count',
            incrementIf: { 'payload.result': 'win' },
          },
          unlockWhen: { 'progress >= ': targetValue },
          counters: ['pongWins'],
        };

      case 'social':
        return {
          eventKeys: ['user:follow'],
          progress: {
            kind: 'count',
          },
          unlockWhen: { 'progress >= ': targetValue },
          counters: ['followersCount'],
        };

      default:
        return null;
    }
  }

  /**
   * Backfill method to generate rules for achievements that don't have ruleData
   */
  async backfillAchievementRules(): Promise<number> {
    try {
      // Find achievements without rule data
      const achievementsWithoutRules = await this.prisma.achievement.findMany({
        where: {
          isActive: true,
          autoAward: true,
          manualOnly: false,
          ruleData: {
            equals: Prisma.JsonNull,
          },
        },
      });

      let backfilledCount = 0;

      for (const achievement of achievementsWithoutRules) {
        const defaultRule = this.generateDefaultRule(achievement);

        if (defaultRule) {
          await this.prisma.achievement.update({
            where: { id: achievement.id },
            data: { ruleData: defaultRule as any },
          });
          backfilledCount++;
        }
      }

      return backfilledCount;
    } catch (error) {
      console.error('Failed to backfill achievement rules:', error);
      return 0;
    }
  }

  async getShameAchievements(userId: number): Promise<ShameAchievement[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: {
        userId,
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
      orderBy: {
        completedAt: 'desc',
      },
    });

    return userAchievements.map((ua) => ({
      slug: ua.achievement.slug || '',
      title: ua.achievement.title,
      description: ua.achievement.description,
      completedAt: ua.completedAt!,
    }));
  }

  async findShameAchievementByName(name: string): Promise<PrismaAchievement | null> {
    return this.prisma.achievement.findFirst({
      where: {
        name,
        isShame: true,
      },
    });
  }

  /**
   * Update rule complexity and performance metrics for an achievement
   */
  async updateRuleComplexityMetrics(
    achievementId: number,
    complexityScore: number,
    performanceScore: number,
  ): Promise<void> {
    await this.prisma.achievement.update({
      where: { id: achievementId },
      data: {
        ruleComplexity: Math.min(100, Math.max(0, complexityScore)),
        rulePerformanceScore: Math.min(100, Math.max(0, performanceScore)),
        lastRuleValidation: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Find achievements that need rule validation (never validated or validation is stale)
   */
  async findAchievementsNeedingValidation(): Promise<PrismaAchievement[]> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.achievement.findMany({
      where: {
        isActive: true,
        ruleData: { not: Prisma.JsonNull },
        OR: [{ lastRuleValidation: null }, { lastRuleValidation: { lt: sevenDaysAgo } }],
      },
    });
  }

  /**
   * Validate and update rule metrics for a specific achievement
   */
  async validateAndUpdateRuleMetrics(achievementId: number): Promise<DbAchievementRuleMetrics> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { id: achievementId },
      select: { ruleData: true },
    });

    if (!achievement?.ruleData) {
      throw new Error(`Achievement ${achievementId} has no rule data`);
    }

    // Validate that the JSON actually matches our expected structure
    const ruleData = achievement.ruleData;
    if (!ruleData || typeof ruleData !== 'object' || Array.isArray(ruleData)) {
      throw new Error(`Invalid rule data structure for achievement ${achievementId}`);
    }

    // Additional validation for required fields
    const data = ruleData as Record<string, unknown>;
    if (!data.eventKeys || !data.progress || !data.unlockWhen) {
      throw new Error(`Rule data missing required fields for achievement ${achievementId}`);
    }

    // Validate progress.kind is a valid literal type
    const progress = data.progress as Record<string, unknown>;
    const validKinds = ['count', 'streak', 'threshold', 'binary'];
    if (
      !progress.kind ||
      typeof progress.kind !== 'string' ||
      !validKinds.includes(progress.kind)
    ) {
      throw new Error(`Invalid progress.kind for achievement ${achievementId}: ${progress.kind}`);
    }

    // Now safe to cast since we've validated the structure
    // Using 'any' to bypass type conflicts between source and dist versions
    const typedRuleData = ruleData as any;

    // Calculate complexity and performance scores
    const complexityScore = this.complexityTracker.calculateComplexityScore(typedRuleData);
    const performanceScore = this.complexityTracker.estimatePerformanceImpact(typedRuleData);

    // Update in database
    await this.updateRuleComplexityMetrics(achievementId, complexityScore, performanceScore);

    return { complexityScore, performanceScore };
  }
}
