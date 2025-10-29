import type { JsonRuleAchievementData } from '@ems/types';

/**
 * Rule Complexity Tracker Service
 *
 * Calculates complexity scores and performance metrics for JSON rule achievements
 * Works alongside existing AchievementEngine and RuleEvaluator
 */
export class RuleComplexityTracker {
  /**
   * Calculate complexity score for a rule (0-100 scale)
   */
  calculateComplexityScore(rule: JsonRuleAchievementData): number {
    let score = 0;

    // Base score from event keys (2 points per event)
    score += rule.eventKeys.length * 2;

    // Score from progress type complexity
    switch (rule.progress.kind) {
      case 'binary':
        score += 1;
        break;
      case 'count':
        score += 2;
        break;
      case 'threshold':
        score += 4;
        break;
      case 'streak':
        score += 5;
        break;
    }

    // Score from progress conditions
    score += this.countConditionComplexity(rule.progress.incrementIf) * 3;
    score += this.countConditionComplexity(rule.progress.setIf) * 3;
    score += this.countConditionComplexity(rule.progress.resetIf) * 2;

    // Score from unlock conditions
    score += this.countConditionComplexity(rule.unlockWhen) * 1;

    // Score from counters
    score += (rule.counters?.length || 0) * 4;

    // Cap at 100
    return Math.min(100, score);
  }

  /**
   * Estimate performance impact score (0-100 scale)
   * Lower scores = better performance
   */
  estimatePerformanceImpact(rule: JsonRuleAchievementData): number {
    let impact = 0;

    // Multiple event keys increase processing overhead
    if (rule.eventKeys.length > 3) {
      impact += (rule.eventKeys.length - 3) * 5;
    }

    // Complex progress types have higher overhead
    switch (rule.progress.kind) {
      case 'binary':
        impact += 1;
        break;
      case 'count':
        impact += 2;
        break;
      case 'streak':
        impact += 4;
        break;
      case 'threshold':
        impact += 3;
        break;
    }

    // Deep condition nesting increases evaluation time
    impact += this.calculateConditionDepth(rule.progress.incrementIf) * 3;
    impact += this.calculateConditionDepth(rule.progress.setIf) * 3;
    impact += this.calculateConditionDepth(rule.progress.resetIf) * 2;
    impact += this.calculateConditionDepth(rule.unlockWhen) * 1;

    // Counter usage adds database lookup overhead
    impact += (rule.counters?.length || 0) * 2;

    // Cap at 100
    return Math.min(100, impact);
  }

  /**
   * Get performance optimization suggestions
   */
  getOptimizationSuggestions(rule: JsonRuleAchievementData): string[] {
    const suggestions: string[] = [];

    if (rule.eventKeys.length > 5) {
      suggestions.push(
        'Consider splitting into multiple achievements - too many event keys can impact performance',
      );
    }

    if (rule.counters && rule.counters.length > 3) {
      suggestions.push(
        'High counter usage detected - consider caching frequently accessed counters',
      );
    }

    if (rule.progress.kind === 'streak' && !rule.progress.resetIf) {
      suggestions.push('Streak rules without resetIf conditions may cause memory leaks');
    }

    const unlockComplexity = this.countConditionComplexity(rule.unlockWhen);
    if (unlockComplexity > 10) {
      suggestions.push(
        'Unlock conditions are very complex - consider simplifying for better performance',
      );
    }

    const hasDeepNesting = this.calculateConditionDepth(rule.unlockWhen) > 3;
    if (hasDeepNesting) {
      suggestions.push('Deep condition nesting detected - flatten conditions where possible');
    }

    return suggestions;
  }

  /**
   * Validate rule structure and return issues
   */
  validateRule(rule: JsonRuleAchievementData): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    if (!rule.eventKeys || rule.eventKeys.length === 0) {
      errors.push('Rule must have at least one event key');
    }

    if (!rule.progress || !rule.progress.kind) {
      errors.push('Rule must have progress configuration');
    } else if (!['count', 'streak', 'threshold', 'binary'].includes(rule.progress.kind)) {
      errors.push('Invalid progress kind - must be count, streak, threshold, or binary');
    }

    if (!rule.unlockWhen || Object.keys(rule.unlockWhen).length === 0) {
      errors.push('Rule must have unlock conditions');
    }

    // Streak-specific validation
    if (rule.progress.kind === 'streak') {
      if (!rule.progress.resetIf) {
        errors.push('Streak rules must have resetIf conditions');
      }
      if (!rule.progress.incrementIf) {
        warnings.push('Streak rules should have incrementIf conditions');
      }
    }

    // Binary-specific validation
    if (rule.progress.kind === 'binary') {
      if (!rule.progress.incrementIf && !rule.progress.setIf) {
        errors.push('Binary rules must have either incrementIf or setIf conditions');
      }
    }

    // Threshold-specific validation
    if (rule.progress.kind === 'threshold') {
      if (!rule.progress.setIf) {
        errors.push('Threshold rules must have setIf conditions');
      }
    }

    // Performance warnings
    if (rule.eventKeys.length > 5) {
      warnings.push('High number of event keys may impact performance');
    }

    if (rule.counters && rule.counters.length > 5) {
      warnings.push('High number of counters may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Count complexity of condition objects
   */
  private countConditionComplexity(condition?: Record<string, unknown>): number {
    if (!condition) return 0;

    let complexity = Object.keys(condition).length;

    // Add complexity for logical operators
    for (const [key, value] of Object.entries(condition)) {
      if (key === 'and' || key === 'or') {
        if (Array.isArray(value)) {
          complexity += value.length * 2; // Logical operations are more complex
        }
      }

      // Add complexity for operators in keys
      if (key.includes('>=') || key.includes('<=') || key.includes('!=') || key.includes('==')) {
        complexity += 1;
      }
    }

    return complexity;
  }

  /**
   * Calculate nesting depth of conditions
   */
  private calculateConditionDepth(condition?: Record<string, unknown>): number {
    if (!condition) return 0;

    let maxDepth = 1;

    for (const value of Object.values(condition)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const depth = 1 + this.calculateConditionDepth(value as Record<string, unknown>);
        maxDepth = Math.max(maxDepth, depth);
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'object' && item !== null) {
            const depth = 1 + this.calculateConditionDepth(item as Record<string, unknown>);
            maxDepth = Math.max(maxDepth, depth);
          }
        }
      }
    }

    return maxDepth;
  }

  /**
   * Generate complexity analysis report
   */
  generateAnalysisReport(rule: JsonRuleAchievementData): {
    complexityScore: number;
    performanceImpact: number;
    validation: { isValid: boolean; errors: string[]; warnings: string[] };
    optimizationSuggestions: string[];
    breakdown: {
      eventKeysComplexity: number;
      progressTypeComplexity: number;
      conditionsComplexity: number;
      countersComplexity: number;
    };
  } {
    const complexityScore = this.calculateComplexityScore(rule);
    const performanceImpact = this.estimatePerformanceImpact(rule);
    const validation = this.validateRule(rule);
    const optimizationSuggestions = this.getOptimizationSuggestions(rule);

    // Detailed breakdown
    const breakdown = {
      eventKeysComplexity: rule.eventKeys.length * 2,
      progressTypeComplexity: this.getProgressTypeComplexity(rule.progress.kind),
      conditionsComplexity:
        this.countConditionComplexity(rule.progress.incrementIf) * 3 +
        this.countConditionComplexity(rule.progress.setIf) * 3 +
        this.countConditionComplexity(rule.progress.resetIf) * 2 +
        this.countConditionComplexity(rule.unlockWhen) * 1,
      countersComplexity: (rule.counters?.length || 0) * 4,
    };

    return {
      complexityScore,
      performanceImpact,
      validation,
      optimizationSuggestions,
      breakdown,
    };
  }

  /**
   * Get complexity score for progress types
   */
  private getProgressTypeComplexity(kind: string): number {
    switch (kind) {
      case 'binary':
        return 1;
      case 'count':
        return 2;
      case 'threshold':
        return 4;
      case 'streak':
        return 5;
      default:
        return 0;
    }
  }

  /**
   * Calculate estimated events needed to complete achievement
   */
  estimateEventsToCompletion(rule: JsonRuleAchievementData): number {
    // Extract target from unlock conditions
    const target = this.extractTargetFromUnlockConditions(rule.unlockWhen);
    if (!target) return 10; // Default estimate

    switch (rule.progress.kind) {
      case 'count':
        return target; // Direct 1:1 mapping
      case 'streak':
        return target * 3; // Account for potential resets
      case 'threshold':
        return Math.ceil(target / 50); // Assume average event value of 50
      case 'binary':
        return 3; // Usually achieved quickly
      default:
        return target;
    }
  }

  /**
   * Extract target value from unlock conditions
   */
  private extractTargetFromUnlockConditions(unlockWhen: Record<string, unknown>): number | null {
    for (const [key, value] of Object.entries(unlockWhen)) {
      if (key.includes('progress') && typeof value === 'number') {
        return value;
      }
    }
    return null;
  }
}
