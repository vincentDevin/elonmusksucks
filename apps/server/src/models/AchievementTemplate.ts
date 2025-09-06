import type { AchievementTemplate as ITemplate, JsonRuleAchievementData } from '@ems/types';
import { JsonRuleAchievement } from './JsonRuleAchievement';

/**
 * AchievementTemplate Model
 *
 * Represents reusable achievement templates with variable substitution
 * and cloning capabilities for rapid achievement creation
 */
export class AchievementTemplate {
  public id: string;
  public name: string;
  public description: string;
  public category: string;
  public rarity: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
  public ruleTemplate: JsonRuleAchievementData;
  public variables: Record<string, string>;
  public usage: number;
  public createdAt: Date;
  public updatedAt: Date;

  constructor(data: Partial<AchievementTemplate>) {
    Object.assign(this, data);

    // Ensure defaults
    this.usage = data.usage ?? 0;
    this.createdAt = data.createdAt ?? new Date();
    this.updatedAt = data.updatedAt ?? new Date();
  }

  /**
   * Create achievement from template with variable substitution
   */
  instantiate(
    variables: Record<string, unknown>,
    metadata: {
      title: string;
      description?: string;
      category?: string;
      rarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | 'secret' | 'shame';
      name?: string;
    },
  ): Partial<JsonRuleAchievement> {
    // Validate all required variables are provided
    const missingVariables = this.getMissingVariables(variables);
    if (missingVariables.length > 0) {
      throw new Error(`Missing required variables: ${missingVariables.join(', ')}`);
    }

    // Substitute variables in rule template
    const instantiatedRule = this.substituteVariables(this.ruleTemplate, variables);

    // Generate achievement data
    const achievementData = {
      name: metadata.name || this.generateName(metadata.title),
      slug: this.generateSlug(metadata.name || metadata.title),
      title: metadata.title,
      description: metadata.description || this.description,
      category: metadata.category || this.category,
      rarity: metadata.rarity || this.rarity,
      ruleData: instantiatedRule,
      isActive: true,
      autoAward: true,
      manualOnly: false,
      isShame: this.rarity === 'shame',
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return achievementData;
  }

  /**
   * Get list of variables that need to be provided
   */
  getRequiredVariables(): string[] {
    return Object.keys(this.variables);
  }

  /**
   * Get missing variables from provided values
   */
  getMissingVariables(provided: Record<string, unknown>): string[] {
    const required = this.getRequiredVariables();
    return required.filter((variable) => !(variable in provided));
  }

  /**
   * Validate provided variables
   */
  validateVariables(variables: Record<string, unknown>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const missing = this.getMissingVariables(variables);
    if (missing.length > 0) {
      errors.push(`Missing required variables: ${missing.join(', ')}`);
    }

    // Type validation for common variables
    for (const [key, value] of Object.entries(variables)) {
      if (!this.variables[key]) {
        errors.push(`Unknown variable: ${key}`);
        continue;
      }

      // Validate common variable types
      const variableDescription = this.variables[key].toLowerCase();

      if (
        variableDescription.includes('number') ||
        variableDescription.includes('count') ||
        variableDescription.includes('threshold')
      ) {
        if (typeof value !== 'number' || value <= 0) {
          errors.push(`Variable '${key}' must be a positive number`);
        }
      }

      if (variableDescription.includes('percentage') || variableDescription.includes('rate')) {
        if (typeof value !== 'number' || value < 0 || value > 100) {
          errors.push(`Variable '${key}' must be a percentage between 0 and 100`);
        }
      }

      if (variableDescription.includes('category') || variableDescription.includes('type')) {
        if (typeof value !== 'string' || value.trim().length === 0) {
          errors.push(`Variable '${key}' must be a non-empty string`);
        }
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Substitute variables in rule template
   */
  private substituteVariables(
    template: JsonRuleAchievementData,
    variables: Record<string, unknown>,
  ): JsonRuleAchievementData {
    // Deep clone the template to avoid modifying the original
    const serialized = JSON.stringify(template);

    // Replace all {{variable}} placeholders
    let substituted = serialized;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      const regex = new RegExp(placeholder, 'g');
      substituted = substituted.replace(regex, String(value));
    }

    return JSON.parse(substituted);
  }

  /**
   * Generate achievement name from title
   */
  private generateName(title: string): string {
    // Convert title to snake_case name
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }

  /**
   * Generate slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-{2,}/g, '-')
      .replace(/^-|-$/g, '');
  }

  /**
   * Increment usage counter
   */
  incrementUsage(): void {
    this.usage++;
    this.updatedAt = new Date();
  }

  /**
   * Get template complexity score
   */
  getComplexityScore(): number {
    let score = 0;

    // Base score from event keys
    score += this.ruleTemplate.eventKeys.length * 2;

    // Score from progress type
    switch (this.ruleTemplate.progress.kind) {
      case 'count':
        score += 1;
        break;
      case 'binary':
        score += 1;
        break;
      case 'threshold':
        score += 2;
        break;
      case 'streak':
        score += 3;
        break;
    }

    // Score from conditions
    score += this.countConditions(this.ruleTemplate.progress.incrementIf) * 2;
    score += this.countConditions(this.ruleTemplate.progress.setIf) * 2;
    score += this.countConditions(this.ruleTemplate.progress.resetIf) * 1;
    score += this.countConditions(this.ruleTemplate.unlockWhen) * 1;

    // Score from counters
    score += (this.ruleTemplate.counters?.length || 0) * 3;

    return score;
  }

  private countConditions(condition?: Record<string, unknown>): number {
    if (!condition) return 0;

    let count = Object.keys(condition).length;

    for (const value of Object.values(condition)) {
      if (Array.isArray(value)) {
        count += value.length;
      }
    }

    return count;
  }

  /**
   * Get template preview with sample variables
   */
  getPreview(): {
    ruleSummary: string;
    sampleVariables: Record<string, unknown>;
    complexityLevel: 'low' | 'medium' | 'high';
  } {
    const sampleVariables = this.generateSampleVariables();
    const complexityScore = this.getComplexityScore();
    const complexityLevel = complexityScore < 10 ? 'low' : complexityScore < 20 ? 'medium' : 'high';

    try {
      const sampleRule = this.substituteVariables(this.ruleTemplate, sampleVariables);
      const ruleSummary = this.generateRuleSummary(sampleRule);

      return { ruleSummary, sampleVariables, complexityLevel };
    } catch (error) {
      return {
        ruleSummary: 'Error generating preview',
        sampleVariables,
        complexityLevel,
      };
    }
  }

  private generateSampleVariables(): Record<string, unknown> {
    const samples: Record<string, unknown> = {};

    for (const [key, description] of Object.entries(this.variables)) {
      const desc = description.toLowerCase();

      if (desc.includes('number') || desc.includes('count')) {
        samples[key] = 10;
      } else if (desc.includes('streak') || desc.includes('consecutive')) {
        samples[key] = 5;
      } else if (desc.includes('percentage') || desc.includes('rate')) {
        samples[key] = 75;
      } else if (desc.includes('amount') || desc.includes('value')) {
        samples[key] = 1000;
      } else if (desc.includes('time') || desc.includes('duration')) {
        samples[key] = 24;
      } else {
        samples[key] = 'sample';
      }
    }

    return samples;
  }

  private generateRuleSummary(rule: JsonRuleAchievementData): string {
    const eventKeys = rule.eventKeys.join(', ');
    const progressType = rule.progress.kind;
    const unlockCondition = Object.entries(rule.unlockWhen)[0];
    const [condition, value] = unlockCondition || ['progress >=', '?'];

    return `Track ${progressType} progress from events: ${eventKeys}. Unlocks when ${condition} ${value}.`;
  }

  /**
   * Convert to API response format
   */
  toApiResponse(): ITemplate {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      rarity: this.rarity,
      ruleTemplate: this.ruleTemplate,
      variables: this.variables,
      usage: this.usage,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Create template from JSON
   */
  static fromJson(data: any): AchievementTemplate {
    return new AchievementTemplate({
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      rarity: data.rarity,
      ruleTemplate: data.ruleTemplate,
      variables: data.variables,
      usage: data.usage || 0,
      createdAt: data.createdAt ? new Date(data.createdAt) : new Date(),
      updatedAt: data.updatedAt ? new Date(data.updatedAt) : new Date(),
    });
  }

  /**
   * Validate template structure
   */
  static validate(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.name || typeof data.name !== 'string') {
      errors.push('Template name is required');
    }

    if (!data.description || typeof data.description !== 'string') {
      errors.push('Template description is required');
    }

    if (!data.category || typeof data.category !== 'string') {
      errors.push('Template category is required');
    }

    if (!['common', 'uncommon', 'rare', 'legendary', 'secret', 'shame'].includes(data.rarity)) {
      errors.push(
        'Template rarity must be one of: common, uncommon, rare, legendary, secret, shame',
      );
    }

    if (!data.ruleTemplate || typeof data.ruleTemplate !== 'object') {
      errors.push('Rule template is required');
    } else {
      // Validate rule template structure
      const ruleValidation = JsonRuleAchievement.validateRuleData(data.ruleTemplate);
      if (!ruleValidation.isValid) {
        errors.push(...ruleValidation.errors.map((err) => `Rule template: ${err}`));
      }
    }

    if (!data.variables || typeof data.variables !== 'object') {
      errors.push('Variables definition is required');
    }

    return { isValid: errors.length === 0, errors };
  }
}

/**
 * Built-in achievement templates
 */
export const BUILTIN_TEMPLATES: Record<string, Partial<AchievementTemplate>> = {
  'betting-streak': {
    id: 'betting-streak',
    name: 'Betting Streak Template',
    description: 'Track consecutive betting wins or losses',
    category: 'betting',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['bet:won', 'bet:lost'],
      progress: {
        kind: 'streak',
        incrementIf: { won: true },
        resetIf: { won: false },
      },
      unlockWhen: { 'progress >=': '{{streakLength}}' },
    },
    variables: {
      streakLength: 'Number of consecutive wins required',
    },
  },

  'betting-volume': {
    id: 'betting-volume',
    name: 'Betting Volume Template',
    description: 'Track total number of bets placed',
    category: 'betting',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['bet:placed'],
      progress: {
        kind: 'count',
        incrementIf: {},
      },
      unlockWhen: { 'progress >=': '{{betCount}}' },
    },
    variables: {
      betCount: 'Number of bets required',
    },
  },

  'high-value-bet': {
    id: 'high-value-bet',
    name: 'High Value Bet Template',
    description: 'Place a bet above a certain amount',
    category: 'betting',
    rarity: 'uncommon',
    ruleTemplate: {
      eventKeys: ['bet:placed'],
      progress: {
        kind: 'binary',
        incrementIf: { 'amount >=': '{{minAmount}}' },
      },
      unlockWhen: { 'progress >=': 1 },
    },
    variables: {
      minAmount: 'Minimum bet amount required',
    },
  },

  'profit-milestone': {
    id: 'profit-milestone',
    name: 'Profit Milestone Template',
    description: 'Reach a certain profit threshold',
    category: 'betting',
    rarity: 'rare',
    ruleTemplate: {
      eventKeys: ['user:balance:snapshot'],
      progress: {
        kind: 'threshold',
        setIf: { netProfit: '$.netProfit' },
      },
      unlockWhen: { 'progress >=': '{{profitTarget}}' },
    },
    variables: {
      profitTarget: 'Profit amount to reach',
    },
  },

  'chat-activity': {
    id: 'chat-activity',
    name: 'Chat Activity Template',
    description: 'Send a certain number of chat messages',
    category: 'chat',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['chat:message:sent'],
      progress: {
        kind: 'count',
        incrementIf: {},
      },
      unlockWhen: { 'progress >=': '{{messageCount}}' },
    },
    variables: {
      messageCount: 'Number of messages to send',
    },
  },

  'pong-victories': {
    id: 'pong-victories',
    name: 'Pong Victories Template',
    description: 'Win a certain number of pong matches',
    category: 'pong',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['pong:match:completed'],
      progress: {
        kind: 'count',
        incrementIf: { result: 'win' },
      },
      unlockWhen: { 'progress >=': '{{winCount}}' },
    },
    variables: {
      winCount: 'Number of wins required',
    },
  },

  'prediction-creator': {
    id: 'prediction-creator',
    name: 'Prediction Creator Template',
    description: 'Create a certain number of predictions',
    category: 'prediction',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['prediction:created'],
      progress: {
        kind: 'count',
        incrementIf: {},
      },
      unlockWhen: { 'progress >=': '{{predictionCount}}' },
    },
    variables: {
      predictionCount: 'Number of predictions to create',
    },
  },

  'daily-login-streak': {
    id: 'daily-login-streak',
    name: 'Daily Login Streak Template',
    description: 'Login consecutively for multiple days',
    category: 'user',
    rarity: 'common',
    ruleTemplate: {
      eventKeys: ['user:login'],
      progress: {
        kind: 'streak',
        incrementIf: { visitedToday: true },
        resetIf: { visitedToday: false },
      },
      unlockWhen: { 'progress >=': '{{dayCount}}' },
    },
    variables: {
      dayCount: 'Number of consecutive days required',
    },
  },
};
