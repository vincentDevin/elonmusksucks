import { PrismaClient } from '@prisma/client';
import type { JsonRuleAchievementData, RuleSimulationResult } from '@ems/types';

interface TestScenario {
  name: string;
  description: string;
  events: Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }>;
  expectedResult: {
    unlocked: boolean;
    finalProgress: number;
  };
}

/**
 * AchievementSimulationService
 *
 * Provides simulation capabilities for testing achievement rules against:
 * - Historical user data
 * - Synthetic test scenarios
 * - Edge case scenarios
 * - Performance estimates
 */
export class AchievementSimulationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Simulate rule progress for a specific user
   */
  async simulateForUser(
    rule: JsonRuleAchievementData,
    userId?: number,
    scenarioType: 'historical' | 'synthetic' | 'edge-case' = 'historical',
  ): Promise<RuleSimulationResult> {
    try {
      if (scenarioType === 'historical' && userId) {
        return await this.simulateHistoricalData(rule, userId);
      } else if (scenarioType === 'synthetic') {
        return await this.simulateSyntheticScenario(rule, userId);
      } else if (scenarioType === 'edge-case') {
        return await this.simulateEdgeCases(rule);
      } else {
        // Default to synthetic if no user specified
        return await this.simulateSyntheticScenario(rule, userId);
      }
    } catch (error) {
      console.error('[simulation] Error simulating rule:', error);
      return this.createErrorResult('Simulation failed: ' + (error as Error).message);
    }
  }

  /**
   * Simulate rule against historical user data
   */
  private async simulateHistoricalData(
    rule: JsonRuleAchievementData,
    userId: number,
  ): Promise<RuleSimulationResult> {
    try {
      // Fetch historical events for the user based on rule's event keys
      const events = await this.fetchHistoricalEvents(userId, rule.eventKeys);

      if (events.length === 0) {
        return {
          userId,
          userName: await this.getUserName(userId),
          simulatedEvents: [],
          progressHistory: [],
          finalProgress: 0,
          unlocked: false,
          estimatedUnlockRate: 0,
        };
      }

      // Process events through rule engine
      const progressHistory = this.processEventsAgainstRule(events, rule);
      const finalProgress =
        progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].progress : 0;
      const unlocked = progressHistory.some((h) => h.unlocked);
      const unlockTimestamp = progressHistory.find((h) => h.unlocked)?.timestamp;

      return {
        userId,
        userName: await this.getUserName(userId),
        simulatedEvents: events,
        progressHistory,
        finalProgress,
        unlocked,
        unlockTimestamp,
        estimatedUnlockRate: await this.calculateUnlockRate(rule),
      };
    } catch (error) {
      console.error('[simulation] Error with historical data simulation:', error);
      return this.createErrorResult('Historical simulation failed');
    }
  }

  /**
   * Simulate rule with synthetic data
   */
  private async simulateSyntheticScenario(
    rule: JsonRuleAchievementData,
    userId?: number,
  ): Promise<RuleSimulationResult> {
    try {
      // Generate realistic synthetic events based on rule requirements
      const events = this.generateSyntheticEvents(rule);
      const progressHistory = this.processEventsAgainstRule(events, rule);
      const finalProgress =
        progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].progress : 0;
      const unlocked = progressHistory.some((h) => h.unlocked);
      const unlockTimestamp = progressHistory.find((h) => h.unlocked)?.timestamp;

      return {
        userId,
        userName: userId ? await this.getUserName(userId) : 'Synthetic User',
        simulatedEvents: events,
        progressHistory,
        finalProgress,
        unlocked,
        unlockTimestamp,
        estimatedUnlockRate: await this.calculateUnlockRate(rule),
      };
    } catch (error) {
      console.error('[simulation] Error with synthetic simulation:', error);
      return this.createErrorResult('Synthetic simulation failed');
    }
  }

  /**
   * Simulate edge cases for rule testing
   */
  private async simulateEdgeCases(rule: JsonRuleAchievementData): Promise<RuleSimulationResult> {
    try {
      // Generate edge case events that test rule boundaries
      const events = this.generateEdgeCaseEvents(rule);
      const progressHistory = this.processEventsAgainstRule(events, rule);
      const finalProgress =
        progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].progress : 0;
      const unlocked = progressHistory.some((h) => h.unlocked);
      const unlockTimestamp = progressHistory.find((h) => h.unlocked)?.timestamp;

      return {
        userId: 999999, // Edge case test user
        userName: 'Edge Case Test',
        simulatedEvents: events,
        progressHistory,
        finalProgress,
        unlocked,
        unlockTimestamp,
        estimatedUnlockRate: await this.calculateUnlockRate(rule),
      };
    } catch (error) {
      console.error('[simulation] Error with edge case simulation:', error);
      return this.createErrorResult('Edge case simulation failed');
    }
  }

  /**
   * Fetch historical events from database
   */
  private async fetchHistoricalEvents(
    userId: number,
    eventKeys: string[],
  ): Promise<Array<{ eventKey: string; payload: Record<string, unknown>; timestamp: string }>> {
    const events: Array<{ eventKey: string; payload: Record<string, unknown>; timestamp: string }> =
      [];

    // Fetch betting events
    if (
      eventKeys.includes('bet:placed') ||
      eventKeys.includes('bet:won') ||
      eventKeys.includes('bet:lost')
    ) {
      const bets = await this.prisma.bet.findMany({
        where: { userId },
        include: {
          optionOption: {
            include: { prediction: true },
          },
        },
        orderBy: { createdAt: 'asc' },
        take: 1000, // Limit for performance
      });

      for (const bet of bets) {
        // bet:placed event
        if (eventKeys.includes('bet:placed')) {
          events.push({
            eventKey: 'bet:placed',
            payload: {
              userId,
              betId: bet.id,
              predictionId: bet.predictionId,
              amount: Number(bet.amount),
              odds: bet.oddsAtPlacement,
              category: bet.optionOption?.prediction?.categoryId || 'unknown',
              optionLabel: bet.optionOption?.label || 'unknown',
            },
            timestamp: bet.createdAt.toISOString(),
          });
        }

        // bet outcome events
        if (bet.won !== null) {
          const eventKey = bet.won ? 'bet:won' : 'bet:lost';
          if (eventKeys.includes(eventKey)) {
            events.push({
              eventKey,
              payload: {
                userId,
                betId: bet.id,
                predictionId: bet.predictionId,
                won: bet.won,
                amount: Number(bet.amount),
                payout: bet.payout ? Number(bet.payout) : 0,
                profit: bet.payout ? Number(bet.payout) - Number(bet.amount) : -Number(bet.amount),
                odds: bet.oddsAtPlacement,
              },
              timestamp: bet.createdAt.toISOString(),
            });
          }
        }
      }
    }

    // Fetch parlay events
    if (eventKeys.includes('parlay:placed') || eventKeys.includes('parlay:won')) {
      const parlays = await this.prisma.parlay.findMany({
        where: { userId },
        include: { legs: true },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

      for (const parlay of parlays) {
        if (eventKeys.includes('parlay:placed')) {
          events.push({
            eventKey: 'parlay:placed',
            payload: {
              userId,
              parlayId: parlay.id,
              legs: parlay.legs.length,
              combinedOdds: parlay.combinedOdds,
              stake: Number(parlay.amount),
              potentialPayout: Number(parlay.potentialPayout),
            },
            timestamp: parlay.createdAt.toISOString(),
          });
        }

        if (parlay.status === 'WON' && eventKeys.includes('parlay:won')) {
          events.push({
            eventKey: 'parlay:won',
            payload: {
              userId,
              parlayId: parlay.id,
              legs: parlay.legs.length,
              combinedOdds: parlay.combinedOdds,
              stake: Number(parlay.amount),
              payout: Number(parlay.potentialPayout),
              profit: Number(parlay.potentialPayout) - Number(parlay.amount),
            },
            timestamp: parlay.createdAt.toISOString(),
          });
        }
      }
    }

    // Fetch pong events
    if (eventKeys.includes('pong:match:completed')) {
      const pongMatches = await this.prisma.pongMatch.findMany({
        where: {
          OR: [{ playerOneId: userId }, { playerTwoId: userId }],
        },
        orderBy: { createdAt: 'asc' },
        take: 500,
      });

      for (const match of pongMatches) {
        const isPlayerOne = match.playerOneId === userId;
        const won = match.winnerId === userId;

        events.push({
          eventKey: 'pong:match:completed',
          payload: {
            userId,
            matchId: match.id,
            opponentId: isPlayerOne ? match.playerTwoId : match.playerOneId,
            result: won ? 'win' : 'loss',
            playerScore: isPlayerOne ? match.playerOneScore : match.playerTwoScore,
            opponentScore: isPlayerOne ? match.playerTwoScore : match.playerOneScore,
            wager: Number(match.wagerAmount || 0),
            isPerfectGame:
              won &&
              ((isPlayerOne && match.playerTwoScore === 0) ||
                (!isPlayerOne && match.playerOneScore === 0)),
            isComeback: false, // Would need more complex logic to detect
            duration: match.gameDuration || 180,
          },
          timestamp: match.createdAt.toISOString(),
        });
      }
    }

    // Fetch chat events
    if (eventKeys.includes('chat:message:sent')) {
      const messages = await this.prisma.message.findMany({
        where: { userId },
        orderBy: { timestamp: 'asc' },
        take: 1000,
      });

      for (const message of messages) {
        events.push({
          eventKey: 'chat:message:sent',
          payload: {
            userId,
            messageId: message.id,
            content: message.content,
            messageLength: message.content.length,
            emojiCount: this.countEmojis(message.content),
            isReply: false, // Would need thread detection
            threadParticipation: false,
          },
          timestamp: message.timestamp.toISOString(),
        });
      }
    }

    // Sort events by timestamp
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return events;
  }

  /**
   * Generate synthetic events for testing
   */
  private generateSyntheticEvents(rule: JsonRuleAchievementData): Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }> {
    const events: Array<{ eventKey: string; payload: Record<string, unknown>; timestamp: string }> =
      [];
    const baseTime = new Date();
    baseTime.setDate(baseTime.getDate() - 30); // Start 30 days ago

    let timeOffset = 0;

    // Generate realistic sequences based on rule requirements
    for (const eventKey of rule.eventKeys) {
      const eventCount = this.getEventCountForSimulation(eventKey, rule);

      for (let i = 0; i < eventCount; i++) {
        const timestamp = new Date(baseTime.getTime() + timeOffset * 1000);
        const payload = this.generateEventPayload(eventKey, i);

        events.push({
          eventKey,
          payload,
          timestamp: timestamp.toISOString(),
        });

        // Add realistic time gaps between events
        timeOffset += this.getRealisticTimeGap(eventKey);
      }
    }

    return events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Generate edge case events for testing boundaries
   */
  private generateEdgeCaseEvents(rule: JsonRuleAchievementData): Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }> {
    const events: Array<{ eventKey: string; payload: Record<string, unknown>; timestamp: string }> =
      [];
    const baseTime = new Date();

    // Generate boundary condition events
    for (const eventKey of rule.eventKeys) {
      // Test minimum values
      events.push({
        eventKey,
        payload: this.generateEdgePayload(eventKey, 'minimum'),
        timestamp: new Date(baseTime.getTime() + 1000).toISOString(),
      });

      // Test maximum values
      events.push({
        eventKey,
        payload: this.generateEdgePayload(eventKey, 'maximum'),
        timestamp: new Date(baseTime.getTime() + 2000).toISOString(),
      });

      // Test exactly at threshold (if applicable)
      events.push({
        eventKey,
        payload: this.generateEdgePayload(eventKey, 'threshold'),
        timestamp: new Date(baseTime.getTime() + 3000).toISOString(),
      });
    }

    return events;
  }

  /**
   * Process events against rule logic
   */
  private processEventsAgainstRule(
    events: Array<{ eventKey: string; payload: Record<string, unknown>; timestamp: string }>,
    rule: JsonRuleAchievementData,
  ): Array<{
    step: number;
    progress: number;
    unlocked: boolean;
    timestamp: string;
    triggerEvent?: string;
  }> {
    const progressHistory: Array<{
      step: number;
      progress: number;
      unlocked: boolean;
      timestamp: string;
      triggerEvent?: string;
    }> = [];

    let currentProgress = 0;
    const counters = new Map<string, number>();

    // Initialize counters
    if (rule.counters) {
      rule.counters.forEach((counter: string) => counters.set(counter, 0));
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      let progressChanged = false;

      // Check if this event should affect progress
      if (rule.eventKeys.includes(event.eventKey)) {
        // Process based on progress kind
        switch (rule.progress.kind) {
          case 'count':
            if (this.evaluateCondition(event.payload, rule.progress.incrementIf)) {
              currentProgress++;
              progressChanged = true;
            }
            break;

          case 'streak':
            if (this.evaluateCondition(event.payload, rule.progress.incrementIf)) {
              currentProgress++;
              progressChanged = true;
            } else if (this.evaluateCondition(event.payload, rule.progress.resetIf)) {
              currentProgress = 0;
              progressChanged = true;
            }
            break;

          case 'threshold':
            if (rule.progress.setIf && this.evaluateCondition(event.payload, rule.progress.setIf)) {
              // Extract value from payload for threshold
              const value = this.extractValueFromPayload(event.payload, rule.progress.setIf);
              if (typeof value === 'number' && value > currentProgress) {
                currentProgress = value;
                progressChanged = true;
              }
            }
            break;

          case 'binary':
            if (
              currentProgress === 0 &&
              (this.evaluateCondition(event.payload, rule.progress.incrementIf) ||
                this.evaluateCondition(event.payload, rule.progress.setIf))
            ) {
              currentProgress = 1;
              progressChanged = true;
            }
            break;
        }

        // Update counters
        rule.counters?.forEach((counter: string) => {
          const counterValue = this.extractCounterValue(event.payload, counter);
          if (counterValue !== null) {
            counters.set(counter, (counters.get(counter) || 0) + counterValue);
          }
        });

        // Check unlock conditions
        const context = { progress: currentProgress, counters: Object.fromEntries(counters) };
        const unlocked = this.evaluateCondition(context, rule.unlockWhen);

        // Record progress if it changed or unlocked
        if (progressChanged || unlocked) {
          progressHistory.push({
            step: i + 1,
            progress: currentProgress,
            unlocked,
            timestamp: event.timestamp,
            triggerEvent: event.eventKey,
          });
        }

        // Stop processing if unlocked (for performance)
        if (unlocked) break;
      }
    }

    return progressHistory;
  }

  /**
   * Evaluate a condition object against payload/context
   */
  private evaluateCondition(
    context: Record<string, unknown>,
    condition?: Record<string, unknown>,
  ): boolean {
    if (!condition || Object.keys(condition).length === 0) {
      return true; // No condition means always true
    }

    for (const [key, expectedValue] of Object.entries(condition)) {
      // Handle logical operators
      if (key === 'and') {
        if (!Array.isArray(expectedValue)) return false;
        return expectedValue.every((subCondition) =>
          this.evaluateCondition(context, subCondition as Record<string, unknown>),
        );
      }

      if (key === 'or') {
        if (!Array.isArray(expectedValue)) return false;
        return expectedValue.some((subCondition) =>
          this.evaluateCondition(context, subCondition as Record<string, unknown>),
        );
      }

      // Handle comparison operators
      const [fieldName, operator] = this.parseConditionKey(key);
      const actualValue = this.getNestedValue(context, fieldName);

      if (!this.compareValues(actualValue, expectedValue, operator)) {
        return false;
      }
    }

    return true;
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
   * Compare values with operator
   */
  private compareValues(actual: unknown, expected: unknown, operator?: string): boolean {
    if (!operator || operator === '==') {
      return actual === expected;
    }

    switch (operator) {
      case '!=':
        return actual !== expected;
      case '>':
        return typeof actual === 'number' && typeof expected === 'number' && actual > expected;
      case '>=':
        return typeof actual === 'number' && typeof expected === 'number' && actual >= expected;
      case '<':
        return typeof actual === 'number' && typeof expected === 'number' && actual < expected;
      case '<=':
        return typeof actual === 'number' && typeof expected === 'number' && actual <= expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'contains':
        return (
          typeof actual === 'string' && typeof expected === 'string' && actual.includes(expected)
        );
      default:
        return false;
    }
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce<unknown>((current, key) => {
      if (current && typeof current === 'object' && key in current) {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Extract value from payload for threshold calculations
   */
  private extractValueFromPayload(
    payload: Record<string, unknown>,
    setIf: Record<string, unknown>,
  ): number | null {
    // This is a simplified implementation
    // In practice, you'd parse the setIf condition to extract the field reference
    for (const [, value] of Object.entries(setIf)) {
      if (typeof value === 'string' && value.startsWith('$.')) {
        const fieldName = value.substring(2);
        const fieldValue = payload[fieldName];
        if (typeof fieldValue === 'number') {
          return fieldValue;
        }
      }
    }
    return null;
  }

  /**
   * Extract counter value from payload
   */
  private extractCounterValue(payload: Record<string, unknown>, counter: string): number | null {
    // Simplified counter extraction - would be more sophisticated in practice
    if (counter === 'uniqueCategories' && typeof payload.category === 'string') {
      return 1; // Would track unique categories in a set
    }
    return null;
  }

  /**
   * Helper methods for synthetic data generation
   */
  private getEventCountForSimulation(eventKey: string, rule: JsonRuleAchievementData): number {
    // Generate enough events to potentially trigger the achievement
    const unlockThreshold = this.extractUnlockThreshold(rule);

    switch (eventKey) {
      case 'bet:placed':
      case 'bet:won':
      case 'bet:lost':
        return Math.max(unlockThreshold * 2, 20);
      case 'chat:message:sent':
        return Math.max(unlockThreshold * 3, 50);
      case 'pong:match:completed':
        return Math.max(unlockThreshold * 1.5, 10);
      default:
        return Math.max(unlockThreshold, 10);
    }
  }

  private extractUnlockThreshold(rule: JsonRuleAchievementData): number {
    const unlockValue = rule.unlockWhen['progress >='];
    return typeof unlockValue === 'number' ? unlockValue : 10;
  }

  private generateEventPayload(eventKey: string, index: number): Record<string, unknown> {
    const basePayload = {
      userId: 12345,
      timestamp: new Date().toISOString(),
    };

    switch (eventKey) {
      case 'bet:placed':
        return {
          ...basePayload,
          betId: 1000 + index,
          predictionId: 500 + (index % 10),
          amount: 50 + (index % 5) * 25,
          odds: 1.5 + (index % 10) * 0.3,
          category: ['sports', 'politics', 'crypto'][index % 3],
          optionLabel: `Option ${index % 2 === 0 ? 'A' : 'B'}`,
        };

      case 'bet:won':
        return {
          ...basePayload,
          betId: 1000 + index,
          won: true,
          payout: 100 + index * 10,
          profit: 50 + index * 5,
          odds: 2.0 + (index % 5) * 0.2,
        };

      case 'bet:lost':
        return {
          ...basePayload,
          betId: 1000 + index,
          won: false,
          amount: 50 + index * 5,
          odds: 2.0 + (index % 5) * 0.2,
        };

      case 'chat:message:sent':
        return {
          ...basePayload,
          messageId: 2000 + index,
          content: `Test message ${index}`,
          messageLength: 10 + (index % 20),
          emojiCount: index % 3,
          isReply: index % 4 === 0,
          threadParticipation: index % 3 === 0,
        };

      default:
        return basePayload;
    }
  }

  private generateEdgePayload(
    eventKey: string,
    type: 'minimum' | 'maximum' | 'threshold',
  ): Record<string, unknown> {
    const basePayload = { userId: 99999 };

    switch (eventKey) {
      case 'bet:placed':
        return {
          ...basePayload,
          amount: type === 'minimum' ? 1 : type === 'maximum' ? 1000000 : 100,
          odds: type === 'minimum' ? 1.01 : type === 'maximum' ? 100.0 : 2.0,
        };
      default:
        return basePayload;
    }
  }

  private getRealisticTimeGap(eventKey: string): number {
    // Return seconds between events
    switch (eventKey) {
      case 'bet:placed':
        return 3600 + Math.random() * 7200; // 1-3 hours
      case 'chat:message:sent':
        return 60 + Math.random() * 300; // 1-5 minutes
      case 'pong:match:completed':
        return 600 + Math.random() * 1800; // 10-30 minutes
      default:
        return 1800 + Math.random() * 3600; // 30-90 minutes
    }
  }

  /**
   * Calculate estimated unlock rate based on historical data
   */
  private async calculateUnlockRate(rule: JsonRuleAchievementData): Promise<number> {
    try {
      // This would analyze historical user activity to estimate what percentage
      // of users would unlock this achievement. For now, return a placeholder.

      const complexityScore = this.estimateRuleComplexity(rule);

      // More complex rules have lower unlock rates
      if (complexityScore > 20) return Math.random() * 5; // 0-5%
      if (complexityScore > 10) return 5 + Math.random() * 15; // 5-20%
      return 20 + Math.random() * 30; // 20-50%
    } catch (error) {
      console.error('[simulation] Error calculating unlock rate:', error);
      return 10; // Default estimate
    }
  }

  private estimateRuleComplexity(rule: JsonRuleAchievementData): number {
    let score = rule.eventKeys.length * 2;
    score += (rule.counters?.length || 0) * 3;

    if (rule.progress.kind === 'streak') score += 5;
    if (rule.progress.kind === 'threshold') score += 3;

    return score;
  }

  private countEmojis(text: string): number {
    // Simple emoji detection - would be more sophisticated in practice
    const emojiRegex =
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu;
    return (text.match(emojiRegex) || []).length;
  }

  private async getUserName(userId: number): Promise<string> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });
      return user?.name || 'Unknown User';
    } catch (error) {
      return 'Unknown User';
    }
  }

  private createErrorResult(_message: string): RuleSimulationResult {
    return {
      simulatedEvents: [],
      progressHistory: [],
      finalProgress: 0,
      unlocked: false,
      estimatedUnlockRate: 0,
    };
  }

  /**
   * Generate test scenarios for rule validation
   */
  async generateTestScenarios(rule: JsonRuleAchievementData): Promise<TestScenario[]> {
    const scenarios: TestScenario[] = [];

    // Success scenario - should unlock
    scenarios.push({
      name: 'Success Path',
      description: 'Events that should successfully unlock the achievement',
      events: this.generateSuccessScenario(rule),
      expectedResult: { unlocked: true, finalProgress: this.extractUnlockThreshold(rule) },
    });

    // Failure scenario - should not unlock
    scenarios.push({
      name: 'Failure Path',
      description: 'Events that should not unlock the achievement',
      events: this.generateFailureScenario(rule),
      expectedResult: { unlocked: false, finalProgress: 0 },
    });

    // Edge case scenario
    scenarios.push({
      name: 'Edge Cases',
      description: 'Boundary conditions and edge cases',
      events: this.generateEdgeCaseEvents(rule),
      expectedResult: { unlocked: false, finalProgress: 0 },
    });

    return scenarios;
  }

  private generateSuccessScenario(rule: JsonRuleAchievementData): Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }> {
    // Generate the minimum events needed to unlock
    const threshold = this.extractUnlockThreshold(rule);
    const events = [];
    const baseTime = new Date();

    for (let i = 0; i < threshold; i++) {
      const eventKey = rule.eventKeys[0]; // Use first event key
      events.push({
        eventKey,
        payload: this.generateEventPayload(eventKey, i),
        timestamp: new Date(baseTime.getTime() + i * 1000).toISOString(),
      });
    }

    return events;
  }

  private generateFailureScenario(rule: JsonRuleAchievementData): Array<{
    eventKey: string;
    payload: Record<string, unknown>;
    timestamp: string;
  }> {
    // Generate events that don't meet the unlock criteria
    const events = [];
    const baseTime = new Date();

    // Generate some events but not enough to unlock
    const threshold = this.extractUnlockThreshold(rule);
    const eventCount = Math.max(1, threshold - 1);

    for (let i = 0; i < eventCount; i++) {
      const eventKey = rule.eventKeys[0];
      events.push({
        eventKey,
        payload: this.generateEventPayload(eventKey, i),
        timestamp: new Date(baseTime.getTime() + i * 1000).toISOString(),
      });
    }

    return events;
  }
}

// Export singleton instance
export const achievementSimulationService = new AchievementSimulationService(new PrismaClient());
