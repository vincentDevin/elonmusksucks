export interface IAchievementRepository {
  findMany(params?: any): Promise<any[]>;
  findById(id: number): Promise<any | null>;
  findBySlug(slug: string): Promise<any | null>;
  findByName(name: string): Promise<any | null>;
  create(data: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<void>;
  findUserAchievements(userId: number): Promise<any[]>;
  findUserAchievementsByAchievementId(achievementId: number, params?: any): Promise<any[]>;
  createUserAchievement(data: any): Promise<any>;
  updateUserAchievement(params: any): Promise<any>;
  findAllUserIds(): Promise<{ id: number }[]>;
  createManyUserAchievements(
    data: { userId: number; achievementId: number; progress: number }[],
  ): Promise<void>;
  deleteUserAchievementsByAchievementId(achievementId: number): Promise<void>;
  findUserById(userId: number): Promise<any | null>;
  findUserAchievementByUserAndAchievementId(
    userId: number,
    achievementId: number,
  ): Promise<any | null>;
  findAllAchievements(): Promise<any[]>;
  findAllUserAchievementsWithDetails(): Promise<any[]>;
  findRecentUserAchievements(userId: number, limit: number): Promise<any[]>;
  // Idempotency methods
  recordEventIdempotency(
    idempotencyKey: string,
    userId: number,
    eventKey: string,
  ): Promise<boolean>;
  hasProcessedEvent(idempotencyKey: string): Promise<boolean>;
  findActiveRulesIndexedByEventKey(): Promise<Map<string, any[]>>;
  backfillAchievementRules(): Promise<number>;
  getShameAchievements(userId: number): Promise<
    Array<{
      slug: string;
      title: string;
      description: string;
      completedAt: Date;
    }>
  >;
  findShameAchievementByName(name: string): Promise<any | null>;
  // Rule complexity tracking methods
  updateRuleComplexityMetrics(
    achievementId: number,
    complexityScore: number,
    performanceScore: number,
  ): Promise<void>;
  findAchievementsNeedingValidation(): Promise<any[]>;
  validateAndUpdateRuleMetrics(
    achievementId: number,
  ): Promise<{ complexityScore: number; performanceScore: number }>;
}
