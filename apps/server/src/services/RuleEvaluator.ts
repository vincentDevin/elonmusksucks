import type { AchievementEvent } from '@ems/types';

export interface RuleProgress {
  kind: 'count' | 'streak' | 'binary';
  incrementIf?: Record<string, any>;
  resetIf?: Record<string, any>;
  counters?: string[];
}

export interface RuleUnlockCondition {
  'progress >=': number;
  'progress <=': number;
  'progress ==': number;
  'counter >=': { key: string; value: number };
  'counter <=': { key: string; value: number };
  'counter ==': { key: string; value: number };
}

export interface CompiledRule {
  eventKeys: string[];
  progress: RuleProgress;
  unlockWhen: Partial<RuleUnlockCondition>;
  counters?: string[];
}

export interface RuleEvaluationResult {
  shouldIncrement: boolean;
  shouldReset: boolean;
  shouldUnlock: boolean;
  newProgress: number;
  countersUsed: Record<string, number>;
}

/**
 * Rule evaluation engine that compiles JSON rules into executable predicates
 */
export class RuleEvaluator {
  /**
   * Evaluate a rule against an event and current progress
   */
  evaluateRule(
    event: AchievementEvent,
    rule: CompiledRule,
    currentProgress: number,
    userCounters: Record<string, number>,
  ): RuleEvaluationResult {
    const result: RuleEvaluationResult = {
      shouldIncrement: false,
      shouldReset: false,
      shouldUnlock: false,
      newProgress: currentProgress,
      countersUsed: {},
    };

    // Check if this rule applies to this event
    if (!rule.eventKeys.includes(event.key)) {
      return result;
    }

    // Evaluate progress conditions
    switch (rule.progress.kind) {
      case 'count':
        result.shouldIncrement = this.evaluateCondition(
          rule.progress.incrementIf,
          event,
          userCounters,
        );
        if (result.shouldIncrement) {
          result.newProgress = currentProgress + 1;
        }
        break;

      case 'streak':
        result.shouldIncrement = this.evaluateCondition(
          rule.progress.incrementIf,
          event,
          userCounters,
        );
        result.shouldReset = this.evaluateCondition(rule.progress.resetIf, event, userCounters);

        if (result.shouldReset) {
          result.newProgress = 0;
        } else if (result.shouldIncrement) {
          result.newProgress = currentProgress + 1;
        }
        break;

      case 'binary':
        // Binary achievements are either unlocked or not
        result.shouldIncrement = this.evaluateCondition(
          rule.progress.incrementIf,
          event,
          userCounters,
        );
        if (result.shouldIncrement) {
          result.newProgress = 1;
        }
        break;
    }

    // Check unlock conditions
    result.shouldUnlock = this.evaluateUnlockCondition(
      rule.unlockWhen,
      result.newProgress,
      userCounters,
    );

    // Track which counters were used
    if (rule.counters) {
      for (const counter of rule.counters) {
        result.countersUsed[counter] = userCounters[counter] || 0;
      }
    }

    return result;
  }

  /**
   * Evaluate a condition object against event payload and user counters
   */
  private evaluateCondition(
    condition: Record<string, any> | undefined,
    event: AchievementEvent,
    userCounters: Record<string, number>,
  ): boolean {
    if (!condition) return true; // No condition means always true

    for (const [key, expectedValue] of Object.entries(condition)) {
      const actualValue = this.getValue(key, event, userCounters);

      if (actualValue !== expectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * Evaluate unlock conditions using comparison operators
   */
  private evaluateUnlockCondition(
    unlockWhen: Partial<RuleUnlockCondition>,
    progress: number,
    userCounters: Record<string, number>,
  ): boolean {
    for (const [operator, value] of Object.entries(unlockWhen)) {
      switch (operator) {
        case 'progress >=':
          if (typeof value === 'number' && !(progress >= value)) return false;
          break;
        case 'progress <=':
          if (typeof value === 'number' && !(progress <= value)) return false;
          break;
        case 'progress ==':
          if (typeof value === 'number' && !(progress === value)) return false;
          break;
        case 'counter >=':
          if (typeof value === 'object' && value && 'key' in value && 'value' in value) {
            const counterGte = userCounters[value.key] || 0;
            if (!(counterGte >= value.value)) return false;
          }
          break;
        case 'counter <=':
          if (typeof value === 'object' && value && 'key' in value && 'value' in value) {
            const counterLte = userCounters[value.key] || 0;
            if (!(counterLte <= value.value)) return false;
          }
          break;
        case 'counter ==':
          if (typeof value === 'object' && value && 'key' in value && 'value' in value) {
            const counterEq = userCounters[value.key] || 0;
            if (!(counterEq === value.value)) return false;
          }
          break;
      }
    }

    return true;
  }

  /**
   * Extract a value from event payload or user counters using dot notation
   */
  private getValue(
    path: string,
    event: AchievementEvent,
    userCounters: Record<string, number>,
  ): any {
    // Handle counter references
    if (path.startsWith('counter.')) {
      const counterName = path.substring(8);
      return userCounters[counterName] || 0;
    }

    // Handle payload references
    if (path.startsWith('payload.')) {
      const payloadPath = path.substring(8);
      return this.getNestedValue(event.payload, payloadPath);
    }

    // Handle event properties
    if (path.startsWith('event.')) {
      const eventPath = path.substring(6);
      return this.getNestedValue(event, eventPath);
    }

    // Direct payload access (for backwards compatibility)
    return this.getNestedValue(event.payload, path);
  }

  /**
   * Get nested value using dot notation (e.g., "result.won" -> obj.result.won)
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Validate that a rule has the correct structure
   */
  validateRule(rule: any): rule is CompiledRule {
    return (
      rule &&
      Array.isArray(rule.eventKeys) &&
      rule.progress &&
      typeof rule.progress.kind === 'string' &&
      ['count', 'streak', 'binary'].includes(rule.progress.kind) &&
      rule.unlockWhen &&
      typeof rule.unlockWhen === 'object'
    );
  }

  /**
   * Compile a raw rule object into a validated CompiledRule
   */
  compileRule(rawRule: any): CompiledRule | null {
    if (!this.validateRule(rawRule)) {
      return null;
    }

    return {
      eventKeys: rawRule.eventKeys,
      progress: {
        kind: rawRule.progress.kind,
        incrementIf: rawRule.progress.incrementIf,
        resetIf: rawRule.progress.resetIf,
        counters: rawRule.progress.counters,
      },
      unlockWhen: rawRule.unlockWhen,
      counters: rawRule.counters,
    };
  }
}
