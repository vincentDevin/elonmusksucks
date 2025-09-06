import type { JsonRuleAchievementData } from '@ems/types';

/**
 * JsonRuleAchievement Model
 *
 * Represents the core data structure for rule-based achievements
 * with comprehensive validation and utility methods
 */
export class JsonRuleAchievement {
  public id: number;
  public name: string;
  public slug: string;
  public title: string;
  public description: string;
  public category: string;
  public rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  public iconUrl: string | null;
  public isActive: boolean;
  public autoAward: boolean;
  public manualOnly: boolean;
  public isShame: boolean;
  public sortOrder: number;
  public ruleData: JsonRuleAchievementData;
  public ruleComplexity: number;
  public rulePerformanceScore: number;
  public lastRuleValidation: Date | null;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<JsonRuleAchievement>) {
    Object.assign(this, data);

    // Ensure required fields have defaults
    this.isActive = data.isActive ?? true;
    this.autoAward = data.autoAward ?? true;
    this.manualOnly = data.manualOnly ?? false;
    this.isShame = data.isShame ?? false;
    this.sortOrder = data.sortOrder ?? 0;
    this.ruleComplexity = data.ruleComplexity ?? 0;
    this.rulePerformanceScore = data.rulePerformanceScore ?? 0;
  }

  /**
   * Check if achievement is eligible for auto-awarding
   */
  isAutoAwardable(): boolean {
    return this.isActive && this.autoAward && !this.manualOnly;
  }

  /**
   * Check if achievement should be processed for given event key
   */
  shouldProcessEvent(eventKey: string): boolean {
    return this.isAutoAwardable() && this.ruleData.eventKeys.includes(eventKey);
  }

  /**
   * Get event keys that this achievement listens to
   */
  getEventKeys(): string[] {
    return this.ruleData.eventKeys;
  }

  /**
   * Get progress configuration
   */
  getProgressConfig(): JsonRuleAchievementData['progress'] {
    return this.ruleData.progress;
  }

  /**
   * Get unlock conditions
   */
  getUnlockConditions(): Record<string, unknown> {
    return this.ruleData.unlockWhen;
  }

  /**
   * Get counter definitions
   */
  getCounters(): string[] {
    return this.ruleData.counters || [];
  }

  /**
   * Check if achievement uses counters
   */
  hasCounters(): boolean {
    return Boolean(this.ruleData.counters && this.ruleData.counters.length > 0);
  }

  /**
   * Get achievement difficulty based on complexity and performance scores
   */
  getDifficultyLevel(): 'easy' | 'medium' | 'hard' | 'extreme' {
    const complexity = this.ruleComplexity;
    const performance = this.rulePerformanceScore;
    const averageScore = (complexity + (100 - performance)) / 2;

    if (averageScore < 15) return 'easy';
    if (averageScore < 30) return 'medium';
    if (averageScore < 50) return 'hard';
    return 'extreme';
  }

  /**
   * Check if achievement needs rule validation
   */
  needsValidation(): boolean {
    if (!this.lastRuleValidation) return true;

    // Re-validate if last validation was more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.lastRuleValidation < sevenDaysAgo;
  }

  /**
   * Mark achievement as validated
   */
  markAsValidated(complexityScore: number, performanceScore: number): void {
    this.ruleComplexity = complexityScore;
    this.rulePerformanceScore = performanceScore;
    this.lastRuleValidation = new Date();
    this.updatedAt = new Date();
  }

  /**
   * Get human-readable summary of the rule
   */
  getRuleSummary(): string {
    const { progress, eventKeys, unlockWhen } = this.ruleData;

    const eventDescription =
      eventKeys.length === 1 ? `"${eventKeys[0]}"` : `${eventKeys.length} different events`;

    const progressDescription = this.getProgressDescription(progress);
    const unlockDescription = this.getUnlockDescription(unlockWhen);

    return `${progressDescription} from ${eventDescription}. ${unlockDescription}`;
  }

  private getProgressDescription(progress: JsonRuleAchievementData['progress']): string {
    switch (progress.kind) {
      case 'count':
        return 'Count occurrences';
      case 'streak':
        return 'Track consecutive occurrences';
      case 'threshold':
        return 'Track cumulative value';
      case 'binary':
        return 'Check if condition occurs';
      default:
        return 'Track progress';
    }
  }

  private getUnlockDescription(unlockWhen: Record<string, unknown>): string {
    const conditions = Object.entries(unlockWhen);
    if (conditions.length === 0) return 'Unlocks immediately';

    const [key, value] = conditions[0];
    if (key.startsWith('progress')) {
      return `Unlocks when progress ${key.replace('progress ', '')} ${value}`;
    }

    return `Unlocks when ${key} ${value}`;
  }

  /**
   * Convert to API response format
   */
  toApiResponse(): any {
    return {
      id: this.id,
      name: this.name,
      slug: this.slug,
      title: this.title,
      description: this.description,
      category: this.category,
      rarity: this.rarity,
      iconUrl: this.iconUrl,
      isActive: this.isActive,
      autoAward: this.autoAward,
      manualOnly: this.manualOnly,
      isShame: this.isShame,
      sortOrder: this.sortOrder,
      ruleData: this.ruleData,
      ruleComplexity: this.ruleComplexity,
      rulePerformanceScore: this.rulePerformanceScore,
      difficultyLevel: this.getDifficultyLevel(),
      ruleSummary: this.getRuleSummary(),
      needsValidation: this.needsValidation(),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create from database record
   */
  static fromDatabase(record: any): JsonRuleAchievement {
    return new JsonRuleAchievement({
      id: record.id,
      name: record.name,
      slug: record.slug,
      title: record.title,
      description: record.description,
      category: record.category,
      rarity: record.rarity,
      iconUrl: record.iconUrl,
      isActive: record.isActive,
      autoAward: record.autoAward,
      manualOnly: record.manualOnly,
      isShame: record.isShame,
      sortOrder: record.sortOrder,
      ruleData: record.ruleData,
      ruleComplexity: record.ruleComplexity || 0,
      rulePerformanceScore: record.rulePerformanceScore || 0,
      lastRuleValidation: record.lastRuleValidation,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Validate rule data structure
   */
  static validateRuleData(ruleData: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check required fields
    if (!ruleData.eventKeys || !Array.isArray(ruleData.eventKeys)) {
      errors.push('eventKeys must be an array');
    } else if (ruleData.eventKeys.length === 0) {
      errors.push('At least one event key is required');
    }

    if (!ruleData.progress || typeof ruleData.progress !== 'object') {
      errors.push('progress configuration is required');
    } else {
      if (!['count', 'streak', 'threshold', 'binary'].includes(ruleData.progress.kind)) {
        errors.push('progress.kind must be one of: count, streak, threshold, binary');
      }
    }

    if (!ruleData.unlockWhen || typeof ruleData.unlockWhen !== 'object') {
      errors.push('unlockWhen conditions are required');
    } else if (Object.keys(ruleData.unlockWhen).length === 0) {
      errors.push('At least one unlock condition is required');
    }

    return { isValid: errors.length === 0, errors };
  }
}
