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
      console.log(`[RuleEvaluator] Event ${event.key} not in rule eventKeys:`, rule.eventKeys);
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
      // Check if the key contains an operator (e.g., "data.wager >=")
      const operatorMatch = key.match(/^(.+)\s+(>=|<=|==|!=|>|<)$/);

      if (operatorMatch) {
        // Handle comparison operators
        const [, fieldPath, operator] = operatorMatch;
        const actualValue = this.getValue(fieldPath, event, userCounters);
        // Resolve expectedValue if it's a placeholder
        const resolvedExpectedValue =
          typeof expectedValue === 'string' && expectedValue.startsWith('$.')
            ? this.getValue(expectedValue, event, userCounters)
            : expectedValue;

        const result = this.compareValues(actualValue, operator, resolvedExpectedValue);

        if (!result) {
          return false;
        }
      } else {
        // Handle exact equality (original behavior)
        const actualValue = this.getValue(key, event, userCounters);
        // Resolve expectedValue if it's a placeholder
        const resolvedExpectedValue =
          typeof expectedValue === 'string' && expectedValue.startsWith('$.')
            ? this.getValue(expectedValue, event, userCounters)
            : expectedValue;

        const result = actualValue === resolvedExpectedValue;

        if (!result) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Compare two values using the specified operator
   */
  private compareValues(actual: any, operator: string, expected: any): boolean {
    // Handle BigInt comparisons safely
    if (typeof actual === 'bigint' || typeof expected === 'bigint') {
      const actualBig = typeof actual === 'bigint' ? actual : BigInt(actual);
      const expectedBig = typeof expected === 'bigint' ? expected : BigInt(expected);

      switch (operator) {
        case '>=':
          return actualBig >= expectedBig;
        case '<=':
          return actualBig <= expectedBig;
        case '>':
          return actualBig > expectedBig;
        case '<':
          return actualBig < expectedBig;
        case '==':
          return actualBig === expectedBig;
        case '!=':
          return actualBig !== expectedBig;
        default:
          return false;
      }
    }

    if (typeof actual === 'number' && typeof expected === 'number') {
      switch (operator) {
        case '>=':
          return actual >= expected;
        case '<=':
          return actual <= expected;
        case '>':
          return actual > expected;
        case '<':
          return actual < expected;
        case '==':
          return actual === expected;
        case '!=':
          return actual !== expected;
        default:
          return false;
      }
    }

    // For non-numeric values, only == and != make sense
    switch (operator) {
      case '==':
        return actual === expected;
      case '!=':
        return actual !== expected;
      default:
        return false;
    }
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
    // Handle placeholders
    if (path === '$.userId') {
      return event.userId;
    }

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

    // Handle data references (common in achievement rules)
    if (path.startsWith('data.')) {
      const dataPath = path.substring(5);
      return this.getNestedValue(event.payload, dataPath);
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
   * Validate that a rule has the correct structure with detailed error messages
   */
  validateRuleWithErrors(rule: any): { ok: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!rule) {
      errors.push('ruleData missing/null for auto award');
      return { ok: false, errors };
    }

    if (!Array.isArray(rule.eventKeys) || rule.eventKeys.length === 0) {
      errors.push('eventKeys must be non-empty array');
    }

    if (!rule.progress) {
      errors.push('progress missing');
    } else {
      if (!rule.progress.kind || !['count', 'streak', 'binary'].includes(rule.progress.kind)) {
        errors.push('progress.kind must be count, streak, or binary');
      }

      // Streak rules require resetIf
      if (rule.progress.kind === 'streak' && !rule.progress.resetIf) {
        errors.push('streak rules require progress.resetIf');
      }
    }

    if (!rule.unlockWhen) {
      errors.push('progress.when missing');
    } else {
      const hasValidCondition = Object.keys(rule.unlockWhen).some(
        (key) => key.includes('>=') || key.includes('<=') || key.includes('=='),
      );
      if (!hasValidCondition) {
        errors.push('unlockWhen must have valid condition (>=, <=, ==)');
      }
    }

    return { ok: errors.length === 0, errors };
  }

  /**
   * Validate that a rule has the correct structure (backward compatibility)
   */
  validateRule(rule: any): rule is CompiledRule {
    return this.validateRuleWithErrors(rule).ok;
  }

  /**
   * Compile a raw rule object into a validated CompiledRule
   */
  compileRule(rawRule: any): CompiledRule | null {
    console.log(`[RuleEvaluator] Compiling rule:`, JSON.stringify(rawRule, null, 2));

    const validation = this.validateRuleWithErrors(rawRule);
    console.log(`[RuleEvaluator] Validation result:`, validation);

    if (!validation.ok) {
      console.warn(`[RuleEvaluator] Rule validation failed:`, validation.errors);
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
