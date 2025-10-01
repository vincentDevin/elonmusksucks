import type {
  PrismaAchievement,
  PrismaUserAchievement,
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

export interface IAchievementRepository {
  // Achievement CRUD
  findMany(params?: DbAchievementQueryParams): Promise<PrismaAchievement[]>;
  findById(id: number): Promise<DetailedAchievement | null>;
  findBySlug(slug: string): Promise<PrismaAchievement | null>;
  findByName(name: string): Promise<PrismaAchievement | null>;
  create(data: CreateAchievementData): Promise<PrismaAchievement>;
  update(id: number, data: UpdateAchievementData): Promise<PrismaAchievement>;
  delete(id: number): Promise<void>;

  // User Achievement CRUD
  findUserAchievements(userId: number): Promise<DetailedUserAchievement[]>;
  findUserAchievementsByAchievementId(
    achievementId: number,
    params?: DbUserAchievementQueryParams,
  ): Promise<DetailedUserAchievement[]>;
  createUserAchievement(data: CreateUserAchievementData): Promise<PrismaUserAchievement>;
  updateUserAchievement(params: UpdateUserAchievementData): Promise<PrismaUserAchievement>;

  // Bulk Operations
  findAllUserIds(): Promise<{ id: number }[]>;
  createManyUserAchievements(data: BulkCreateUserAchievementData[]): Promise<void>;
  deleteUserAchievementsByAchievementId(achievementId: number): Promise<void>;

  // User Queries
  findUserById(userId: number): Promise<PrismaUser | null>;
  findUserAchievementByUserAndAchievementId(
    userId: number,
    achievementId: number,
  ): Promise<DetailedUserAchievement | null>;

  // Achievement Lists
  findAllAchievements(): Promise<PrismaAchievement[]>;
  findAllUserAchievementsWithDetails(): Promise<DetailedUserAchievement[]>;
  findRecentUserAchievements(userId: number, limit: number): Promise<DetailedUserAchievement[]>;

  // Idempotency methods
  recordEventIdempotency(
    idempotencyKey: string,
    userId: number,
    eventKey: string,
  ): Promise<boolean>;
  hasProcessedEvent(idempotencyKey: string): Promise<boolean>;

  // Rule Management
  findActiveRulesIndexedByEventKey(): Promise<Map<string, DbAchievementRule[]>>;
  backfillAchievementRules(): Promise<number>;

  // Shame Achievements
  getShameAchievements(userId: number): Promise<ShameAchievement[]>;
  findShameAchievementByName(name: string): Promise<PrismaAchievement | null>;

  // Rule complexity tracking methods
  updateRuleComplexityMetrics(
    achievementId: number,
    complexityScore: number,
    performanceScore: number,
  ): Promise<void>;
  findAchievementsNeedingValidation(): Promise<PrismaAchievement[]>;
  validateAndUpdateRuleMetrics(achievementId: number): Promise<DbAchievementRuleMetrics>;
}
