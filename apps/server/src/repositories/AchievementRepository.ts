import { PrismaClient, Prisma } from '@prisma/client';

export interface IAchievementRepository {
  findMany(params?: any): Promise<any[]>;
  findById(id: number): Promise<any | null>;
  findBySlug(slug: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<void>;
  findUserAchievements(userId: number): Promise<any[]>;
  findUserAchievementsByAchievementId(achievementId: number, params?: any): Promise<any[]>;
  createUserAchievement(data: any): Promise<any>;
  updateUserAchievement(params: any): Promise<any>;
  // Idempotency methods
  recordEventIdempotency(
    idempotencyKey: string,
    userId: number,
    eventKey: string,
  ): Promise<boolean>;
  hasProcessedEvent(idempotencyKey: string): Promise<boolean>;
  findActiveRulesIndexedByEventKey(): Promise<Map<string, any[]>>;
  backfillAchievementRules(): Promise<number>;
}

export class AchievementRepository implements IAchievementRepository {
  constructor(private prisma: PrismaClient) {}

  async findMany(params?: any) {
    return this.prisma.achievement.findMany(params);
  }

  async findById(id: number) {
    return this.prisma.achievement.findUnique({
      where: { id },
    });
  }

  async findBySlug(slug: string) {
    return this.prisma.achievement.findUnique({
      where: { slug },
    });
  }

  async create(data: any) {
    return this.prisma.achievement.create({
      data,
    });
  }

  async update(id: number, data: any) {
    return this.prisma.achievement.update({
      where: { id },
      data,
    });
  }

  async delete(id: number) {
    await this.prisma.achievement.delete({
      where: { id },
    });
  }

  async findUserAchievements(userId: number) {
    return this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
    });
  }

  async findUserAchievementsByAchievementId(achievementId: number, params?: any) {
    return this.prisma.userAchievement.findMany({
      where: { achievementId },
      ...params,
    });
  }

  async createUserAchievement(data: any) {
    return this.prisma.userAchievement.create({
      data,
    });
  }

  async updateUserAchievement(params: any) {
    return this.prisma.userAchievement.upsert(params);
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

  async findActiveRulesIndexedByEventKey(): Promise<Map<string, any[]>> {
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
        },
      });

      // Index rules by event keys
      const rulesIndex = new Map<string, any[]>();

      for (const achievement of achievements) {
        if (!achievement.ruleData) continue;

        try {
          const rule = achievement.ruleData as any;

          // Validate rule structure
          if (!rule.eventKeys || !Array.isArray(rule.eventKeys)) {
            console.warn(
              `Achievement ${achievement.id} has invalid rule structure - missing eventKeys`,
            );
            continue;
          }

          // Create enriched rule object
          const enrichedRule = {
            achievementId: achievement.id,
            achievementName: achievement.name,
            achievementSlug: achievement.slug,
            category: achievement.category,
            targetValue: achievement.targetValue,
            rule,
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
  private generateDefaultRule(achievement: any): any | null {
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
            data: { ruleData: defaultRule },
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
}
