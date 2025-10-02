import type { JsonRuleAchievementData, RuleValidationResult, EventKeyOption } from '@ems/types';

/**
 * RuleValidationService
 *
 * Provides comprehensive validation for JSON rule-based achievements including:
 * - Structure validation
 * - Event key validation
 * - Performance impact estimation
 * - Logic consistency checking
 * - Optimization suggestions
 */
export class RuleValidationService {
  private eventKeyCache: Map<string, EventKeyOption> = new Map();
  private cacheExpiry: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {}

  /**
   * Validate a complete achievement rule
   */
  async validateRule(rule: JsonRuleAchievementData): Promise<RuleValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const optimizationSuggestions: string[] = [];

    try {
      // 1. Basic structure validation
      const structureValidation = this.validateRuleStructure(rule);
      errors.push(...structureValidation.errors);
      warnings.push(...structureValidation.warnings);

      // 2. Event key validation
      const eventValidation = await this.validateEventKeys(rule.eventKeys);
      errors.push(...eventValidation.errors);
      warnings.push(...eventValidation.warnings);

      // 3. Progress type validation
      const progressValidation = this.validateProgressType(rule);
      errors.push(...progressValidation.errors);
      warnings.push(...progressValidation.warnings);

      // 4. Condition validation
      const conditionValidation = await this.validateConditionFields(rule);
      errors.push(...conditionValidation.errors);
      warnings.push(...conditionValidation.warnings);

      // 5. Logic consistency validation
      const logicValidation = this.validateLogicConsistency(rule);
      errors.push(...logicValidation.errors);
      warnings.push(...logicValidation.warnings);

      // 6. Performance impact estimation
      const complexityResult = this.estimateComplexity(rule);
      warnings.push(...complexityResult.warnings);
      optimizationSuggestions.push(...complexityResult.optimizations);

      const isValid = errors.length === 0;
      const estimatedComplexity = complexityResult.level;
      const estimatedPerformanceImpact = this.estimatePerformanceImpact(complexityResult.score);

      return {
        isValid,
        errors,
        warnings,
        estimatedComplexity,
        complexityScore: complexityResult.score,
        optimizationSuggestions,
        estimatedPerformanceImpact,
      };
    } catch (error) {
      console.error('[rule-validation] Unexpected validation error:', error);
      return {
        isValid: false,
        errors: ['Internal validation error occurred'],
        warnings: [],
        estimatedComplexity: 'high',
        complexityScore: 100,
        optimizationSuggestions: [],
        estimatedPerformanceImpact: 'high',
      };
    }
  }

  /**
   * Validate basic rule structure
   */
  private validateRuleStructure(rule: JsonRuleAchievementData): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!rule.eventKeys || !Array.isArray(rule.eventKeys)) {
      errors.push('eventKeys must be a non-empty array');
    } else if (rule.eventKeys.length === 0) {
      errors.push('At least one event key is required');
    }

    if (!rule.progress) {
      errors.push('progress configuration is required');
    } else {
      if (!rule.progress.kind) {
        errors.push('progress.kind is required');
      } else if (!['count', 'streak', 'threshold', 'binary'].includes(rule.progress.kind)) {
        errors.push('progress.kind must be one of: count, streak, threshold, binary');
      }
    }

    if (!rule.unlockWhen || typeof rule.unlockWhen !== 'object') {
      errors.push('unlockWhen conditions are required');
    } else if (Object.keys(rule.unlockWhen).length === 0) {
      errors.push('At least one unlock condition is required');
    }

    // Warnings for best practices
    if (rule.progress?.kind === 'streak' && !rule.progress.resetIf) {
      warnings.push(
        'Streak achievements should typically have resetIf conditions to handle losing streaks',
      );
    }

    if (rule.progress?.kind === 'threshold' && !rule.progress.setIf) {
      warnings.push(
        'Threshold achievements should typically have setIf conditions to track cumulative values',
      );
    }

    if (rule.eventKeys && rule.eventKeys.length > 5) {
      warnings.push('Using more than 5 event keys may impact performance');
    }

    if (rule.counters && rule.counters.length > 3) {
      warnings.push('Using more than 3 counters may impact performance');
    }

    return { errors, warnings };
  }

  /**
   * Validate event keys against known events
   */
  async validateEventKeys(eventKeys: string[]): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const availableEvents = await this.getAvailableEventKeys();
      const eventKeyMap = new Map(availableEvents.map((e) => [e.key, e]));

      for (const eventKey of eventKeys) {
        if (!eventKeyMap.has(eventKey)) {
          errors.push(`Unknown event key: ${eventKey}`);
        } else {
          const eventInfo = eventKeyMap.get(eventKey)!;

          // Check event volume for performance warnings
          if (eventInfo.volume === 'critical') {
            warnings.push(`Event '${eventKey}' has critical volume - may impact performance`);
          }

          // Warn about deprecated or low-value events
          if (eventInfo.volume === 'low') {
            warnings.push(
              `Event '${eventKey}' has low volume - achievement may be rarely triggered`,
            );
          }
        }
      }

      // Check for redundant event combinations
      if (
        eventKeys.includes('bet:placed') &&
        eventKeys.includes('bet:won') &&
        eventKeys.includes('bet:lost')
      ) {
        warnings.push(
          'Using bet:placed with bet:won and bet:lost may be redundant - consider simplifying',
        );
      }
    } catch (error) {
      console.error('[rule-validation] Error validating event keys:', error);
      warnings.push('Could not validate event keys against available events');
    }

    return { errors, warnings };
  }

  /**
   * Validate progress type configuration
   */
  private validateProgressType(rule: JsonRuleAchievementData): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { progress } = rule;
    if (!progress) return { errors, warnings };

    switch (progress.kind) {
      case 'count':
        if (progress.setIf) {
          warnings.push('Count progress type typically uses incrementIf, not setIf');
        }
        if (!progress.incrementIf) {
          warnings.push('Count progress type should typically have incrementIf conditions');
        }
        break;

      case 'streak':
        if (!progress.incrementIf || !progress.resetIf) {
          errors.push('Streak progress type requires both incrementIf and resetIf conditions');
        }
        if (progress.setIf) {
          warnings.push('Streak progress type typically does not use setIf');
        }
        break;

      case 'threshold':
        if (!progress.setIf) {
          warnings.push('Threshold progress type should typically have setIf conditions');
        }
        if (progress.resetIf) {
          warnings.push('Threshold progress type typically does not reset');
        }
        break;

      case 'binary':
        if (progress.resetIf) {
          warnings.push('Binary progress type typically does not reset once achieved');
        }
        if (!progress.incrementIf && !progress.setIf) {
          warnings.push('Binary progress type should have either incrementIf or setIf conditions');
        }
        break;
    }

    return { errors, warnings };
  }

  /**
   * Validate condition field references
   */
  private async validateConditionFields(
    rule: JsonRuleAchievementData,
  ): Promise<{ errors: string[]; warnings: string[] }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const availableEvents = await this.getAvailableEventKeys();
      const eventSchemas = new Map(availableEvents.map((e) => [e.key, e.payloadSchema]));

      // Validate incrementIf conditions
      if (rule.progress.incrementIf) {
        const conditionErrors = this.validateConditionObject(
          rule.progress.incrementIf,
          rule.eventKeys,
          eventSchemas,
        );
        errors.push(...conditionErrors);
      }

      // Validate setIf conditions
      if (rule.progress.setIf) {
        const conditionErrors = this.validateConditionObject(
          rule.progress.setIf,
          rule.eventKeys,
          eventSchemas,
        );
        errors.push(...conditionErrors);
      }

      // Validate resetIf conditions
      if (rule.progress.resetIf) {
        const conditionErrors = this.validateConditionObject(
          rule.progress.resetIf,
          rule.eventKeys,
          eventSchemas,
        );
        errors.push(...conditionErrors);
      }

      // Validate unlockWhen conditions
      const unlockErrors = this.validateUnlockConditions(rule.unlockWhen);
      errors.push(...unlockErrors);
    } catch (error) {
      console.error('[rule-validation] Error validating condition fields:', error);
      warnings.push('Could not fully validate condition field references');
    }

    return { errors, warnings };
  }

  /**
   * Validate individual condition objects
   */
  private validateConditionObject(
    condition: Record<string, unknown>,
    eventKeys: string[],
    eventSchemas: Map<string, Record<string, string>>,
  ): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(condition)) {
      // Handle logical operators
      if (key === 'and' || key === 'or') {
        if (!Array.isArray(value)) {
          errors.push(`${key} operator must be an array`);
          continue;
        }

        for (const subCondition of value) {
          if (typeof subCondition === 'object' && subCondition !== null) {
            errors.push(
              ...this.validateConditionObject(
                subCondition as Record<string, unknown>,
                eventKeys,
                eventSchemas,
              ),
            );
          }
        }
        continue;
      }

      // Handle comparison operators
      const [fieldName, operator] = this.parseConditionKey(key);

      // Check if field exists in any of the event schemas
      const fieldExists = eventKeys.some((eventKey) => {
        const schema = eventSchemas.get(eventKey);
        return schema && Object.prototype.hasOwnProperty.call(schema, fieldName);
      });

      // Also allow special fields like 'progress', 'counters.*', etc.
      const isSpecialField = ['progress', 'counters'].some(
        (special) => fieldName === special || fieldName.startsWith(`${special}.`),
      );

      if (!fieldExists && !isSpecialField) {
        errors.push(`Field '${fieldName}' not found in any event payload schema`);
      }

      // Validate operator
      const validOperators = ['>=', '<=', '>', '<', '==', '!=', 'in', 'contains'];
      if (operator && !validOperators.includes(operator)) {
        errors.push(`Invalid operator '${operator}' in condition '${key}'`);
      }

      // Basic type checking for values
      if (operator && ['>=', '<=', '>', '<'].includes(operator) && typeof value !== 'number') {
        errors.push(`Numeric operator '${operator}' requires numeric value, got ${typeof value}`);
      }
    }

    return errors;
  }

  /**
   * Parse condition key to extract field name and operator
   */
  private parseConditionKey(key: string): [string, string?] {
    const operators = ['>=', '<=', '>', '<', '==', '!=', 'in', 'contains'];

    for (const op of operators) {
      if (key.endsWith(` ${op}`)) {
        return [key.slice(0, -op.length - 1).trim(), op];
      }
    }

    return [key];
  }

  /**
   * Validate unlock conditions
   */
  private validateUnlockConditions(unlockWhen: Record<string, unknown>): string[] {
    const errors: string[] = [];

    for (const [key, value] of Object.entries(unlockWhen)) {
      const [fieldName, operator] = this.parseConditionKey(key);

      // Unlock conditions typically reference progress or counters
      if (
        !['progress', 'counters'].some(
          (field) => fieldName === field || fieldName.startsWith(`${field}.`),
        )
      ) {
        errors.push(
          `Unlock condition '${fieldName}' should typically reference 'progress' or 'counters'`,
        );
      }

      // Validate progress references
      if (fieldName === 'progress' && operator && ['>=', '<=', '>', '<'].includes(operator)) {
        if (typeof value !== 'number' || value < 0) {
          errors.push(
            `Progress unlock condition must have a positive numeric value, got ${typeof value}`,
          );
        }
      }
    }

    return errors;
  }

  /**
   * Validate logic consistency across the rule
   */
  private validateLogicConsistency(rule: JsonRuleAchievementData): {
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for impossible conditions
    if (rule.progress.kind === 'binary' && rule.unlockWhen['progress >=']) {
      const threshold = rule.unlockWhen['progress >='];
      if (typeof threshold === 'number' && threshold > 1) {
        errors.push(
          'Binary progress can only be 0 or 1, but unlock condition requires progress >= ' +
            threshold,
        );
      }
    }

    // Check for streak logic consistency
    if (rule.progress.kind === 'streak' && rule.progress.incrementIf && rule.progress.resetIf) {
      const incrementConditions = JSON.stringify(rule.progress.incrementIf);
      const resetConditions = JSON.stringify(rule.progress.resetIf);

      // Warn if increment and reset conditions could overlap
      if (incrementConditions === resetConditions) {
        errors.push(
          'Streak increment and reset conditions are identical - this will prevent progress',
        );
      }
    }

    // Check for counter references without counter definition
    const unlockConditionsStr = JSON.stringify(rule.unlockWhen);
    if (
      unlockConditionsStr.includes('counters.') &&
      (!rule.counters || rule.counters.length === 0)
    ) {
      errors.push('Unlock conditions reference counters, but no counters are defined');
    }

    // Check for realistic thresholds
    if (rule.unlockWhen['progress >=']) {
      const threshold = rule.unlockWhen['progress >='];
      if (typeof threshold === 'number' && threshold > 10000) {
        warnings.push(
          `Very high progress threshold (${threshold}) may take extremely long to achieve`,
        );
      }
    }

    return { errors, warnings };
  }

  /**
   * Estimate rule complexity and performance impact
   */
  private estimateComplexity(rule: JsonRuleAchievementData): {
    score: number;
    level: 'low' | 'medium' | 'high';
    warnings: string[];
    optimizations: string[];
  } {
    let score = 0;
    const warnings: string[] = [];
    const optimizations: string[] = [];

    // Base complexity from event keys
    score += rule.eventKeys.length * 2;

    // Complexity from conditions
    score += this.countNestedConditions(rule.progress.incrementIf) * 3;
    score += this.countNestedConditions(rule.progress.setIf) * 3;
    score += this.countNestedConditions(rule.progress.resetIf) * 2;
    score += this.countNestedConditions(rule.unlockWhen) * 1;

    // Counter complexity
    score += (rule.counters?.length || 0) * 4;

    // Progress type complexity
    switch (rule.progress.kind) {
      case 'count':
        score += 1;
        break;
      case 'threshold':
        score += 2;
        break;
      case 'binary':
        score += 1;
        break;
      case 'streak':
        score += 3; // Most complex due to state tracking
        break;
    }

    // Generate warnings and optimizations based on score
    if (score > 25) {
      warnings.push('Rule complexity is very high and may impact system performance');
      optimizations.push('Consider simplifying conditions or reducing the number of event keys');
    } else if (score > 15) {
      warnings.push('Rule complexity is moderate - monitor performance impact');
      optimizations.push('Consider caching frequently accessed counter values');
    }

    if (rule.eventKeys.length > 3) {
      optimizations.push('Consider using fewer event keys for better performance');
    }

    if (rule.counters && rule.counters.length > 2) {
      optimizations.push('Consider combining similar counters to reduce storage overhead');
    }

    // Suggest specific optimizations
    if (rule.progress.kind === 'streak' && rule.eventKeys.length > 2) {
      optimizations.push(
        'Streak achievements work best with 2 complementary events (e.g., win/lose)',
      );
    }

    const level = score < 8 ? 'low' : score < 20 ? 'medium' : 'high';

    return { score, level, warnings, optimizations };
  }

  /**
   * Count nested conditions for complexity calculation
   */
  private countNestedConditions(condition?: Record<string, unknown>): number {
    if (!condition || typeof condition !== 'object') {
      return 0;
    }

    let count = Object.keys(condition).length;

    for (const value of Object.values(condition)) {
      if (Array.isArray(value)) {
        // Handle 'and'/'or' operators
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            count += this.countNestedConditions(item as Record<string, unknown>);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        count += this.countNestedConditions(value as Record<string, unknown>);
      }
    }

    return count;
  }

  /**
   * Estimate performance impact based on complexity score
   */
  private estimatePerformanceImpact(complexityScore: number): 'minimal' | 'moderate' | 'high' {
    if (complexityScore < 10) return 'minimal';
    if (complexityScore < 25) return 'moderate';
    return 'high';
  }

  /**
   * Get available event keys with caching
   */
  private async getAvailableEventKeys(): Promise<EventKeyOption[]> {
    const now = Date.now();

    // Return cached results if still valid
    if (this.eventKeyCache.size > 0 && now < this.cacheExpiry) {
      return Array.from(this.eventKeyCache.values());
    }

    // Otherwise, fetch fresh data
    try {
      const eventKeys = await this.fetchEventKeys();

      // Update cache
      this.eventKeyCache.clear();
      eventKeys.forEach((event) => this.eventKeyCache.set(event.key, event));
      this.cacheExpiry = now + this.CACHE_TTL;

      return eventKeys;
    } catch (error) {
      console.error('[rule-validation] Error fetching event keys:', error);
      // Return empty array if fetch fails
      return [];
    }
  }

  /**
   * Fetch event keys from system configuration
   */
  private async fetchEventKeys(): Promise<EventKeyOption[]> {
    // This would typically fetch from a database or configuration service
    // For now, return the known event keys from the achievement system
    return [
      {
        key: 'bet:placed',
        description: 'Triggered when a user places a bet',
        category: 'betting',
        payloadSchema: {
          userId: 'number',
          betId: 'number',
          predictionId: 'number',
          amount: 'number',
          odds: 'number',
          category: 'string',
          optionLabel: 'string',
        },
        volume: 'high',
        examples: [
          {
            userId: 123,
            betId: 456,
            predictionId: 789,
            amount: 100,
            odds: 2.5,
            category: 'sports',
            optionLabel: 'Team A wins',
          },
        ],
      },
      {
        key: 'bet:won',
        description: 'Triggered when a user wins a bet',
        category: 'betting',
        payloadSchema: {
          userId: 'number',
          betId: 'number',
          predictionId: 'number',
          won: 'boolean',
          payout: 'number',
          profit: 'number',
          odds: 'number',
        },
        volume: 'medium',
        examples: [
          {
            userId: 123,
            betId: 456,
            predictionId: 789,
            won: true,
            payout: 250,
            profit: 150,
            odds: 2.5,
          },
        ],
      },
      {
        key: 'bet:lost',
        description: 'Triggered when a user loses a bet',
        category: 'betting',
        payloadSchema: {
          userId: 'number',
          betId: 'number',
          predictionId: 'number',
          won: 'boolean',
          amount: 'number',
          odds: 'number',
        },
        volume: 'medium',
        examples: [
          { userId: 123, betId: 456, predictionId: 789, won: false, amount: 100, odds: 2.5 },
        ],
      },
      {
        key: 'parlay:placed',
        description: 'Triggered when a user places a parlay bet',
        category: 'betting',
        payloadSchema: {
          userId: 'number',
          parlayId: 'number',
          legs: 'number',
          combinedOdds: 'number',
          stake: 'number',
          potentialPayout: 'number',
        },
        volume: 'low',
        examples: [
          {
            userId: 123,
            parlayId: 456,
            legs: 3,
            combinedOdds: 8.0,
            stake: 50,
            potentialPayout: 400,
          },
        ],
      },
      {
        key: 'parlay:won',
        description: 'Triggered when a user wins a parlay bet',
        category: 'betting',
        payloadSchema: {
          userId: 'number',
          parlayId: 'number',
          legs: 'number',
          combinedOdds: 'number',
          stake: 'number',
          payout: 'number',
          profit: 'number',
        },
        volume: 'low',
        examples: [
          {
            userId: 123,
            parlayId: 456,
            legs: 3,
            combinedOdds: 8.0,
            stake: 50,
            payout: 400,
            profit: 350,
          },
        ],
      },
      {
        key: 'pong:match:completed',
        description: 'Triggered when a pong match is completed',
        category: 'pong',
        payloadSchema: {
          userId: 'number',
          matchId: 'string',
          opponentId: 'number',
          result: 'string',
          playerScore: 'number',
          opponentScore: 'number',
          wager: 'number',
          isPerfectGame: 'boolean',
          isComeback: 'boolean',
          duration: 'number',
        },
        volume: 'medium',
        examples: [
          {
            userId: 123,
            matchId: 'match_456',
            opponentId: 789,
            result: 'win',
            playerScore: 11,
            opponentScore: 7,
            wager: 100,
            isPerfectGame: false,
            isComeback: true,
            duration: 180,
          },
        ],
      },
      {
        key: 'chat:message:sent',
        description: 'Triggered when a user sends a chat message',
        category: 'chat',
        payloadSchema: {
          userId: 'number',
          messageId: 'number',
          content: 'string',
          messageLength: 'number',
          emojiCount: 'number',
          isReply: 'boolean',
          threadParticipation: 'boolean',
        },
        volume: 'critical',
        examples: [
          {
            userId: 123,
            messageId: 456,
            content: 'Great bet!',
            messageLength: 10,
            emojiCount: 0,
            isReply: false,
            threadParticipation: false,
          },
        ],
      },
      {
        key: 'prediction:created',
        description: 'Triggered when a user creates a prediction',
        category: 'prediction',
        payloadSchema: {
          userId: 'number',
          predictionId: 'number',
          category: 'string',
          type: 'string',
          hasSourceLinks: 'boolean',
        },
        volume: 'low',
        examples: [
          {
            userId: 123,
            predictionId: 456,
            category: 'politics',
            type: 'BINARY',
            hasSourceLinks: true,
          },
        ],
      },
      {
        key: 'prediction:resolved',
        description: 'Triggered when a prediction is resolved',
        category: 'prediction',
        payloadSchema: {
          userId: 'number',
          predictionId: 'number',
          outcome: 'string',
          resolutionTimeHours: 'number',
          isFirstCorrect: 'boolean',
          resolvedWithinHour: 'boolean',
        },
        volume: 'low',
        examples: [
          {
            userId: 123,
            predictionId: 456,
            outcome: 'correct',
            resolutionTimeHours: 12,
            isFirstCorrect: true,
            resolvedWithinHour: false,
          },
        ],
      },
      {
        key: 'user:login',
        description: 'Triggered when a user logs in',
        category: 'user',
        payloadSchema: {
          userId: 'number',
          consecutiveDays: 'number',
          isFirstLogin: 'boolean',
          visitedToday: 'boolean',
        },
        volume: 'high',
        examples: [{ userId: 123, consecutiveDays: 5, isFirstLogin: false, visitedToday: true }],
      },
      {
        key: 'user:balance:snapshot',
        description: 'Triggered for user balance milestone tracking',
        category: 'user',
        payloadSchema: {
          userId: 'number',
          balance: 'number',
          netProfit: 'number',
          totalBets: 'number',
          totalWagered: 'number',
          totalLost: 'number',
          winRate: 'number',
        },
        volume: 'medium',
        examples: [
          {
            userId: 123,
            balance: 5000,
            netProfit: 2500,
            totalBets: 100,
            totalWagered: 10000,
            totalLost: 2500,
            winRate: 0.65,
          },
        ],
      },
      {
        key: 'leaderboard:rank:update',
        description: 'Triggered when user ranking changes',
        category: 'leaderboard',
        payloadSchema: {
          userId: 'number',
          rank: 'number',
          previousRank: 'number',
          isImprovement: 'boolean',
          isFirst: 'boolean',
          profitAll: 'number',
        },
        volume: 'medium',
        examples: [
          {
            userId: 123,
            rank: 5,
            previousRank: 8,
            isImprovement: true,
            isFirst: false,
            profitAll: 15000,
          },
        ],
      },
    ];
  }

  /**
   * Get rule performance suggestions based on event keys and structure
   */
  async getRuleOptimizationSuggestions(rule: JsonRuleAchievementData): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      const availableEvents = await this.getAvailableEventKeys();
      const eventVolumeMap = new Map(availableEvents.map((e) => [e.key, e.volume]));

      // Check for high-volume events
      const highVolumeEvents = rule.eventKeys.filter(
        (key) => eventVolumeMap.get(key) === 'critical',
      );
      if (highVolumeEvents.length > 0) {
        suggestions.push(
          `Consider optimizing conditions for high-volume events: ${highVolumeEvents.join(', ')}`,
        );
      }

      // Suggest counter usage for complex calculations
      const conditionComplexity =
        this.countNestedConditions(rule.progress.incrementIf) +
        this.countNestedConditions(rule.progress.setIf);
      if (conditionComplexity > 5 && (!rule.counters || rule.counters.length === 0)) {
        suggestions.push('Consider using counters to pre-calculate complex values');
      }

      // Suggest event key combinations
      if (
        rule.eventKeys.includes('bet:placed') &&
        !rule.eventKeys.includes('bet:won') &&
        !rule.eventKeys.includes('bet:lost')
      ) {
        suggestions.push(
          'Consider including bet outcome events (bet:won/bet:lost) for more precise tracking',
        );
      }

      return suggestions;
    } catch (error) {
      console.error('[rule-validation] Error generating optimization suggestions:', error);
      return ['Unable to generate optimization suggestions'];
    }
  }
}

// Export singleton instance for dependency injection
export const ruleValidationService = new RuleValidationService();
