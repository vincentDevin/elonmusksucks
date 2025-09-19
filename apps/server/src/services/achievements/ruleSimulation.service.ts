import type { JsonRuleAchievementData } from '@ems/types';

interface SimulationEvent {
  eventKey: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface SimulationStep {
  eventIndex: number;
  event: SimulationEvent;
  progressBefore: number;
  progressAfter: number;
  counters: Record<string, number>;
  unlocked: boolean;
  details: string;
}

interface SimulationResult {
  finalProgress: number;
  finalCounters: Record<string, number>;
  unlocked: boolean;
  unlockedAt?: number;
  steps: SimulationStep[];
  executionTime: number;
  complexity: 'low' | 'medium' | 'high';
}

export class RuleSimulationService {
  async simulateRule(
    rule: JsonRuleAchievementData,
    events: SimulationEvent[],
  ): Promise<SimulationResult> {
    const startTime = Date.now();

    let currentProgress = 0;
    const counters: Record<string, number> = {};
    const steps: SimulationStep[] = [];
    let unlocked = false;
    let unlockedAt: number | undefined;

    // Initialize counters
    rule.counters?.forEach((counter) => {
      counters[counter] = 0;
    });

    // Process each event
    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Skip if event key doesn't match
      if (!rule.eventKeys.includes(event.eventKey)) {
        continue;
      }

      const progressBefore = currentProgress;

      // Process progress update based on type
      const progressUpdate = this.processProgressUpdate(rule, event, currentProgress, counters);
      currentProgress = progressUpdate.newProgress;

      // Update counters
      this.updateCounters(rule, event, counters);

      // Check unlock condition
      const wasUnlocked = unlocked;
      unlocked = this.evaluateUnlockCondition(rule, currentProgress, counters);

      if (!wasUnlocked && unlocked) {
        unlockedAt = i;
      }

      steps.push({
        eventIndex: i,
        event,
        progressBefore,
        progressAfter: currentProgress,
        counters: { ...counters },
        unlocked,
        details: progressUpdate.details,
      });

      // Stop processing if unlocked (unless we want to continue tracking)
      if (unlocked && !this.shouldContinueAfterUnlock(rule)) {
        break;
      }
    }

    const executionTime = Date.now() - startTime;

    return {
      finalProgress: currentProgress,
      finalCounters: counters,
      unlocked,
      unlockedAt,
      steps,
      executionTime,
      complexity: this.estimateComplexity(rule),
    };
  }

  private processProgressUpdate(
    rule: JsonRuleAchievementData,
    event: SimulationEvent,
    currentProgress: number,
    _counters: Record<string, number>,
  ): { newProgress: number; details: string } {
    const { progress } = rule;

    switch (progress.kind) {
      case 'count':
        return this.processCountProgress(progress, event, currentProgress);

      case 'streak':
        return this.processStreakProgress(progress, event, currentProgress);

      case 'threshold':
        return this.processThresholdProgress(progress, event, currentProgress);

      case 'binary':
        return this.processBinaryProgress(progress, event, currentProgress);

      default:
        return { newProgress: currentProgress, details: 'Unknown progress type' };
    }
  }

  private processCountProgress(
    progress: JsonRuleAchievementData['progress'],
    event: SimulationEvent,
    currentProgress: number,
  ): { newProgress: number; details: string } {
    if (progress.incrementIf && this.evaluateCondition(progress.incrementIf, event.payload)) {
      return {
        newProgress: currentProgress + 1,
        details: `Incremented count by 1 (condition met)`,
      };
    }

    return {
      newProgress: currentProgress,
      details: `No increment (condition not met)`,
    };
  }

  private processStreakProgress(
    progress: JsonRuleAchievementData['progress'],
    event: SimulationEvent,
    currentProgress: number,
  ): { newProgress: number; details: string } {
    // Check reset condition first
    if (progress.resetIf && this.evaluateCondition(progress.resetIf, event.payload)) {
      return {
        newProgress: 0,
        details: `Streak reset (reset condition met)`,
      };
    }

    // Check increment condition
    if (progress.incrementIf && this.evaluateCondition(progress.incrementIf, event.payload)) {
      return {
        newProgress: currentProgress + 1,
        details: `Streak continued +1`,
      };
    }

    return {
      newProgress: currentProgress,
      details: `Streak maintained`,
    };
  }

  private processThresholdProgress(
    progress: JsonRuleAchievementData['progress'],
    event: SimulationEvent,
    currentProgress: number,
  ): { newProgress: number; details: string } {
    if (progress.setIf && this.evaluateCondition(progress.setIf, event.payload)) {
      const newValue = this.extractValueFromCondition(progress.setIf, event.payload);
      return {
        newProgress: newValue,
        details: `Progress set to ${newValue}`,
      };
    }

    return {
      newProgress: currentProgress,
      details: `No progress change`,
    };
  }

  private processBinaryProgress(
    progress: JsonRuleAchievementData['progress'],
    event: SimulationEvent,
    currentProgress: number,
  ): { newProgress: number; details: string } {
    if (progress.setIf && this.evaluateCondition(progress.setIf, event.payload)) {
      return {
        newProgress: 1,
        details: `Binary progress set to true`,
      };
    }

    if (progress.incrementIf && this.evaluateCondition(progress.incrementIf, event.payload)) {
      return {
        newProgress: 1,
        details: `Binary progress set to true (increment condition)`,
      };
    }

    return {
      newProgress: currentProgress,
      details: `Binary progress unchanged`,
    };
  }

  private updateCounters(
    rule: JsonRuleAchievementData,
    event: SimulationEvent,
    counters: Record<string, number>,
  ): void {
    // Update each counter based on event
    rule.counters?.forEach((counterName) => {
      if (event.payload[counterName]) {
        const increment = Number(event.payload[counterName]) || 1;
        counters[counterName] = (counters[counterName] || 0) + increment;
      }
    });
  }

  private evaluateUnlockCondition(
    rule: JsonRuleAchievementData,
    currentProgress: number,
    counters: Record<string, number>,
  ): boolean {
    const context = {
      progress: currentProgress,
      ...counters,
    };

    return this.evaluateCondition(rule.unlockWhen, context);
  }

  private evaluateCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>,
  ): boolean {
    for (const [key, value] of Object.entries(condition)) {
      if (key === 'and') {
        const conditions = value as Record<string, unknown>[];
        return conditions.every((cond) => this.evaluateCondition(cond, context));
      }

      if (key === 'or') {
        const conditions = value as Record<string, unknown>[];
        return conditions.some((cond) => this.evaluateCondition(cond, context));
      }

      if (key.endsWith(' >=')) {
        const fieldName = key.replace(' >=', '');
        const contextValue = Number(context[fieldName]) || 0;
        return contextValue >= Number(value);
      }

      if (key.endsWith(' <=')) {
        const fieldName = key.replace(' <=', '');
        const contextValue = Number(context[fieldName]) || 0;
        return contextValue <= Number(value);
      }

      if (key.endsWith(' >')) {
        const fieldName = key.replace(' >', '');
        const contextValue = Number(context[fieldName]) || 0;
        return contextValue > Number(value);
      }

      if (key.endsWith(' <')) {
        const fieldName = key.replace(' <', '');
        const contextValue = Number(context[fieldName]) || 0;
        return contextValue < Number(value);
      }

      // Direct equality check
      if (context[key] !== value) {
        return false;
      }
    }

    return true;
  }

  private extractValueFromCondition(
    condition: Record<string, unknown>,
    context: Record<string, unknown>,
  ): number {
    // For dynamic value extraction from $ references
    for (const [_key, value] of Object.entries(condition)) {
      if (typeof value === 'string' && value.startsWith('$.')) {
        const fieldName = value.substring(2);
        return Number(context[fieldName]) || 0;
      }

      if (typeof value === 'number') {
        return value;
      }
    }

    return 0;
  }

  private shouldContinueAfterUnlock(rule: JsonRuleAchievementData): boolean {
    // Continue tracking for analytics even after unlock
    return !!(rule.counters && rule.counters.length > 0);
  }

  private estimateComplexity(rule: JsonRuleAchievementData): 'low' | 'medium' | 'high' {
    let complexity = 0;

    // Event keys complexity
    complexity += rule.eventKeys.length * 0.1;

    // Progress conditions complexity
    if (rule.progress.incrementIf)
      complexity += this.getConditionComplexity(rule.progress.incrementIf);
    if (rule.progress.setIf) complexity += this.getConditionComplexity(rule.progress.setIf);
    if (rule.progress.resetIf) complexity += this.getConditionComplexity(rule.progress.resetIf);

    // Unlock condition complexity
    complexity += this.getConditionComplexity(rule.unlockWhen);

    // Counters complexity
    complexity += (rule.counters?.length || 0) * 0.2;

    if (complexity < 2) return 'low';
    if (complexity < 5) return 'medium';
    return 'high';
  }

  private getConditionComplexity(condition: Record<string, unknown>): number {
    let complexity = 0;

    for (const [key, value] of Object.entries(condition)) {
      if (key === 'and' || key === 'or') {
        const conditions = value as Record<string, unknown>[];
        complexity += conditions.reduce((sum, cond) => sum + this.getConditionComplexity(cond), 0);
        complexity += 0.5; // Logical operator overhead
      } else {
        complexity += 0.3; // Basic condition
      }
    }

    return complexity;
  }

  async generateTestEvents(
    rule: JsonRuleAchievementData,
    scenarios: 'success' | 'failure' | 'mixed' = 'mixed',
    eventCount: number = 50,
  ): Promise<SimulationEvent[]> {
    const events: SimulationEvent[] = [];
    const baseTime = new Date();

    for (let i = 0; i < eventCount; i++) {
      const eventKey = this.selectRandomEventKey(rule.eventKeys);
      const payload = this.generateEventPayload(rule, scenarios, i, eventCount);

      events.push({
        eventKey,
        payload,
        timestamp: new Date(baseTime.getTime() + i * 60000), // 1 minute intervals
      });
    }

    return events;
  }

  private selectRandomEventKey(eventKeys: string[]): string {
    return eventKeys[Math.floor(Math.random() * eventKeys.length)];
  }

  private generateEventPayload(
    rule: JsonRuleAchievementData,
    scenario: 'success' | 'failure' | 'mixed',
    eventIndex: number,
    totalEvents: number,
  ): Record<string, unknown> {
    const payload: Record<string, unknown> = {};

    // Generate based on scenario
    switch (scenario) {
      case 'success':
        payload.won = true;
        payload.amount = 50 + Math.random() * 100;
        payload.score = 80 + Math.random() * 20;
        break;

      case 'failure':
        payload.won = eventIndex > totalEvents * 0.8; // Only succeed near the end
        payload.amount = 10 + Math.random() * 30;
        payload.score = 20 + Math.random() * 40;
        break;

      case 'mixed':
        payload.won = Math.random() > 0.4; // 60% win rate
        payload.amount = 25 + Math.random() * 75;
        payload.score = 40 + Math.random() * 60;
        break;
    }

    // Add counter values
    rule.counters?.forEach((counter) => {
      switch (counter) {
        case 'totalBets':
          payload[counter] = 1;
          break;
        case 'totalWagered':
          payload[counter] = payload.amount;
          break;
        case 'netProfit':
          payload[counter] = payload.won ? Number(payload.amount) * 0.8 : -Number(payload.amount);
          break;
        default:
          payload[counter] = Math.floor(Math.random() * 10);
      }
    });

    return payload;
  }
}
