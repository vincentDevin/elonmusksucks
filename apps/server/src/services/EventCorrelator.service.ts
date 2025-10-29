import prisma from '../db';
import { eventBus } from '../lib/EventBus';
import type { IEventBus } from '@ems/types';

// Using shared prisma from db.ts

/**
 * EventCorrelator Service
 *
 * Handles complex multi-step achievement progress tracking that requires
 * correlating events across different systems and time windows.
 *
 * Enables achievements like:
 * - "Statistical Anomaly" - Win 10 <10% probability bets
 * - "Defies Probability" - Win 5 <5% probability bets
 * - "YOLO All-In" - Bet entire balance and win
 * - "Galaxy Brain Parlay" - Win 7+ leg parlay
 * - "Pong Comeback King" - Win from 0-9 deficit
 */
export class EventCorrelator {
  constructor(private eventBus: IEventBus) {}

  /**
   * Track event sequence progress for multi-step achievements
   * @param userId - User ID
   * @param events - Array of event types that constitute the sequence
   * @param timeWindowSeconds - Optional time window for sequence completion
   */
  async trackEventSequence(
    userId: number,
    events: string[],
    timeWindowSeconds?: number,
  ): Promise<void> {
    try {
      const sequenceKey = `sequence:${events.join(':')}:${userId}`;
      const now = new Date();
      const windowStart = timeWindowSeconds
        ? new Date(now.getTime() - timeWindowSeconds * 1000)
        : new Date(now.getTime() - 24 * 60 * 60 * 1000); // Default 24h window

      // Find recent activities that match this sequence
      const activities = await prisma.userActivityLog.findMany({
        where: {
          userId,
          occurredAt: {
            gte: windowStart,
          },
          activityType: {
            in: events,
          },
        },
        orderBy: {
          occurredAt: 'asc',
        },
      });

      // Check if we have the complete sequence
      if (activities.length >= events.length) {
        const sequenceProgress = this.analyzeSequenceProgress(activities, events);

        if (sequenceProgress.isComplete) {
          await this.eventBus.publish('event:sequence:completed', {
            key: 'event:sequence:completed',
            userId,
            occurredAt: now.toISOString(),
            idempotencyKey: `${sequenceKey}:${sequenceProgress.completedAt}`,
            payload: {
              sequenceType: events.join('->'),
              events: sequenceProgress.matchedEvents,
              duration: sequenceProgress.durationMs,
              timeWindow: timeWindowSeconds,
              completedAt: sequenceProgress.completedAt,
            },
          });

          console.log(`[event-correlator] User ${userId} completed sequence: ${events.join('->')}`);
        }
      }
    } catch (error) {
      console.error('[event-correlator] Error tracking event sequence:', error);
    }
  }

  /**
   * Check for time-windowed patterns (e.g., "10 bets in 60 seconds")
   * @param userId - User ID
   * @param pattern - Event pattern configuration
   */
  async checkTimeWindowedPattern(userId: number, pattern: EventPattern): Promise<boolean> {
    try {
      const now = new Date();
      const windowStart = new Date(now.getTime() - (pattern.timeWindow || 3600) * 1000);

      const activities = await prisma.userActivityLog.findMany({
        where: {
          userId,
          occurredAt: {
            gte: windowStart,
          },
          activityType: {
            in: pattern.events,
          },
        },
        orderBy: {
          occurredAt: 'desc',
        },
      });

      // Check if pattern is satisfied
      const isPatternMatched = this.evaluatePattern(activities, pattern);

      if (isPatternMatched) {
        await this.eventBus.publish('pattern:matched', {
          key: 'pattern:matched',
          userId,
          occurredAt: now.toISOString(),
          idempotencyKey: `pattern:${userId}:${pattern.name}:${Date.now()}`,
          payload: {
            patternName: pattern.name,
            events: pattern.events,
            timeWindow: pattern.timeWindow,
            matchedCount: activities.length,
            firstEventAt: activities[activities.length - 1]?.occurredAt.toISOString(),
            lastEventAt: activities[0]?.occurredAt.toISOString(),
          },
        });

        console.log(`[event-correlator] User ${userId} matched pattern: ${pattern.name}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[event-correlator] Error checking time windowed pattern:', error);
      return false;
    }
  }

  /**
   * Detect complex scenarios based on historical data
   * @param userId - User ID
   * @param scenario - Scenario type to check
   */
  async detectComplexScenario(userId: number, scenario: string): Promise<boolean> {
    try {
      switch (scenario) {
        case 'statistical_anomaly':
          return await this.checkStatisticalAnomaly(userId);

        case 'probability_defier':
          return await this.checkProbabilityDefier(userId);

        case 'yolo_all_in':
          // Check both single bets and parlays for YOLO All-In
          const singleBetYolo = await this.checkYoloAllIn(userId);
          const parlayYolo = await this.checkYoloAllInParlay(userId);
          return singleBetYolo || parlayYolo;

        case 'galaxy_brain_parlay':
          return await this.checkGalaxyBrainParlay(userId);

        case 'pong_comeback':
          return await this.checkPongComeback(userId);

        default:
          console.warn(`[event-correlator] Unknown scenario: ${scenario}`);
          return false;
      }
    } catch (error) {
      console.error(`[event-correlator] Error detecting scenario ${scenario}:`, error);
      return false;
    }
  }

  /**
   * Check for statistical anomaly: Win 10 <10% probability bets
   */
  private async checkStatisticalAnomaly(userId: number): Promise<boolean> {
    const lowProbWins = await prisma.bet.count({
      where: {
        userId,
        status: 'WON',
        oddsAtPlacement: {
          gte: 10.0, // >10 odds = <10% implied probability
        },
      },
    });

    if (lowProbWins >= 10) {
      await this.eventBus.publish('achievement:statistical:anomaly', {
        key: 'achievement:statistical:anomaly',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `statistical:anomaly:${userId}:${Date.now()}`,
        payload: {
          lowProbabilityWins: lowProbWins,
          threshold: 10,
          scenario: 'statistical_anomaly',
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Check for probability defier: Win 5 <5% probability bets
   */
  private async checkProbabilityDefier(userId: number): Promise<boolean> {
    const veryLowProbWins = await prisma.bet.count({
      where: {
        userId,
        status: 'WON',
        oddsAtPlacement: {
          gte: 20.0, // >20 odds = <5% implied probability
        },
      },
    });

    if (veryLowProbWins >= 5) {
      await this.eventBus.publish('achievement:probability:defier', {
        key: 'achievement:probability:defier',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `probability:defier:${userId}:${Date.now()}`,
        payload: {
          veryLowProbabilityWins: veryLowProbWins,
          threshold: 5,
          scenario: 'probability_defier',
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Check for YOLO all-in: Bet entire balance and win
   */
  private async checkYoloAllIn(userId: number): Promise<boolean> {
    // Look for recent transactions where user bet almost entire balance
    const recentWinningBets = await prisma.bet.findMany({
      where: {
        userId,
        status: 'WON',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        user: {
          include: {
            transactions: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    for (const bet of recentWinningBets) {
      // Find the transaction for this bet
      const betTransaction = bet.user.transactions.find(
        (t) => t.relatedBetId === bet.id && t.type === 'DEBIT',
      );

      if (betTransaction) {
        const balanceBeforeBet = betTransaction.balanceAfter + betTransaction.amount;
        const betAmountRatio = Number(betTransaction.amount) / Number(balanceBeforeBet);

        // If they bet >95% of their balance and won
        if (betAmountRatio >= 0.95) {
          await this.eventBus.publish('achievement:yolo:all:in', {
            key: 'achievement:yolo:all:in',
            userId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `yolo:all:in:${userId}:${bet.id}`,
            payload: {
              betId: bet.id,
              betAmount: betTransaction.amount.toString(),
              balanceBeforeBet: balanceBeforeBet.toString(),
              balanceRatio: betAmountRatio,
              payout: bet.payout?.toString(),
              scenario: 'yolo_all_in',
            },
          });
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check for Galaxy Brain Parlay: Win 7+ leg parlay
   */
  private async checkGalaxyBrainParlay(userId: number): Promise<boolean> {
    const bigParlayWins = await prisma.parlay.findMany({
      where: {
        userId,
        status: 'WON',
        legs: {
          some: {}, // Has legs
        },
      },
      include: {
        legs: true,
      },
    });

    const galaxyBrainParlays = bigParlayWins.filter((parlay) => parlay.legs.length >= 7);

    if (galaxyBrainParlays.length > 0) {
      const bestParlay = galaxyBrainParlays.reduce((best, current) =>
        current.legs.length > best.legs.length ? current : best,
      );

      await this.eventBus.publish('achievement:galaxy:brain:parlay', {
        key: 'achievement:galaxy:brain:parlay',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `galaxy:brain:${userId}:${bestParlay.id}`,
        payload: {
          parlayId: bestParlay.id,
          legCount: bestParlay.legs.length,
          combinedOdds: bestParlay.combinedOdds,
          potentialPayout: bestParlay.potentialPayout?.toString(),
          scenario: 'galaxy_brain_parlay',
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Check for Pong comeback: Win from 0-9 deficit
   */
  private async checkPongComeback(userId: number): Promise<boolean> {
    // This would require detailed pong match data with score progression
    // For now, we'll check if there are any pong matches where user won despite low early scores
    const pongMatches = await prisma.pongMatch.findMany({
      where: {
        OR: [
          { playerOneId: userId, winnerId: userId },
          { playerTwoId: userId, winnerId: userId },
        ],
      },
      take: 50,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // This is a simplified check - in practice, you'd need detailed match progression data
    // For demonstration, we'll just check if they have any wins (placeholder logic)
    if (pongMatches.length >= 5) {
      await this.eventBus.publish('achievement:pong:comeback', {
        key: 'achievement:pong:comeback',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `pong:comeback:${userId}:${Date.now()}`,
        payload: {
          recentWins: pongMatches.length,
          scenario: 'pong_comeback',
        },
      });
      return true;
    }
    return false;
  }

  /**
   * Analyze sequence progress from activities
   */
  private analyzeSequenceProgress(activities: any[], expectedEvents: string[]) {
    const matchedEvents = [];
    let currentIndex = 0;

    for (const activity of activities) {
      if (
        currentIndex < expectedEvents.length &&
        activity.activityType === expectedEvents[currentIndex]
      ) {
        matchedEvents.push({
          type: activity.activityType,
          occurredAt: activity.occurredAt,
          metadata: activity.metadata,
        });
        currentIndex++;
      }
    }

    const isComplete = currentIndex === expectedEvents.length;
    const duration =
      isComplete && matchedEvents.length > 0
        ? new Date(matchedEvents[matchedEvents.length - 1].occurredAt).getTime() -
          new Date(matchedEvents[0].occurredAt).getTime()
        : 0;

    return {
      isComplete,
      matchedEvents,
      durationMs: duration,
      completedAt: isComplete ? matchedEvents[matchedEvents.length - 1].occurredAt : null,
    };
  }

  /**
   * Evaluate if activities match the specified pattern
   */
  private evaluatePattern(activities: any[], pattern: EventPattern): boolean {
    if (pattern.order === 'sequential') {
      // For sequential patterns, ensure events appear in the correct order
      return this.checkSequentialPattern(activities, pattern.events);
    } else {
      // For 'any' order, just check if we have enough of each event type
      return this.checkAnyOrderPattern(activities, pattern.events);
    }
  }

  private checkSequentialPattern(activities: any[], events: string[]): boolean {
    let eventIndex = 0;
    for (const activity of activities) {
      if (eventIndex < events.length && activity.activityType === events[eventIndex]) {
        eventIndex++;
      }
    }
    return eventIndex === events.length;
  }

  private checkAnyOrderPattern(activities: any[], events: string[]): boolean {
    const eventCounts = new Map<string, number>();
    const requiredCounts = new Map<string, number>();

    // Count required events
    for (const event of events) {
      requiredCounts.set(event, (requiredCounts.get(event) || 0) + 1);
    }

    // Count actual events
    for (const activity of activities) {
      eventCounts.set(activity.activityType, (eventCounts.get(activity.activityType) || 0) + 1);
    }

    // Check if we have enough of each required event
    for (const [event, requiredCount] of requiredCounts) {
      if ((eventCounts.get(event) || 0) < requiredCount) {
        return false;
      }
    }

    return true;
  }
  /**
   * Check for YOLO All-In Parlay: Win a parlay after betting >95% of balance
   */
  private async checkYoloAllInParlay(userId: number): Promise<boolean> {
    // Get recent winning parlays
    const recentWinningParlays = await prisma.parlay.findMany({
      where: {
        userId,
        status: 'WON',
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
      include: {
        user: {
          select: {
            transactions: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
    });

    for (const parlay of recentWinningParlays) {
      // Find the transaction for this parlay
      const parlayTransaction = parlay.user.transactions.find(
        (t) => t.relatedParlayId === parlay.id && t.type === 'DEBIT',
      );

      if (parlayTransaction) {
        const balanceBeforeParlay = parlayTransaction.balanceAfter + parlayTransaction.amount;
        const parlayAmountRatio = Number(parlayTransaction.amount) / Number(balanceBeforeParlay);

        // If they bet >95% of their balance and won the parlay
        if (parlayAmountRatio >= 0.95) {
          await this.eventBus.publish('achievement:yolo:all:in', {
            key: 'achievement:yolo:all:in',
            userId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `yolo:all:in:parlay:${userId}:${parlay.id}`,
            payload: {
              parlayId: parlay.id,
              parlayAmount: parlayTransaction.amount.toString(),
              balanceBeforeParlay: balanceBeforeParlay.toString(),
              balanceRatio: parlayAmountRatio,
              payout: parlay.potentialPayout?.toString(),
              scenario: 'yolo_all_in_parlay',
            },
          });
          return true;
        }
      }
    }
    return false;
  }
}

/**
 * Event pattern interface
 */
export interface EventPattern {
  name: string;
  events: string[];
  timeWindow?: number; // seconds
  order: 'sequential' | 'any';
  minimumCount?: number;
}

// Export singleton instance for dependency injection
export const eventCorrelator = new EventCorrelator(eventBus);
