// apps/server/src/services/betting.service.ts
// -----------------------------------------------------------------------------
// • Publishes **present‑tense** Redis channels (`bet:place`, `parlay:place`) to
//   align with the command‑naming convention.
// • No direct io.emit — real‑time fan‑out handled by redisEventHandlers.ts.
// -----------------------------------------------------------------------------

import type {
  IBettingRepository,
  OptionWithPrediction,
} from '../repositories/interfaces/IBettingRepository';
import type { DbBet, DbParlay, ParlayLegWithUser, IEventBus, IEventCoalescer } from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import { BettingRepository } from '../repositories/BettingRepository';
import { eventBus } from '../lib/EventBus';
import { EventCoalescer } from '../lib/EventCoalescer';
import { unifiedActivityService } from './unifiedActivity.service';
import { UserService } from './user.service';
import { broadcastRealtimeMetrics } from './admin.service';
import { tracingCollector } from '../lib/tracing';
import { streakManager } from './StreakManager.service';
import { financialTracker } from './FinancialTracker.service';
import { CacheInvalidation } from '../utils/cacheInvalidation';

export class BettingService {
  private userService = new UserService();
  private eventCoalescer: IEventCoalescer;
  private eventBus: IEventBus;

  constructor(
    private repo: IBettingRepository = new BettingRepository(),
    eventBusParam?: IEventBus,
  ) {
    // Use the provided eventBus or import the singleton
    this.eventBus = eventBusParam || eventBus;
    // Optimized coalescing windows: stats updates 1s (vs default 2s) for better p95 latency
    this.eventCoalescer = new EventCoalescer(this.eventBus, {
      windowMs: 2000, // Default 2s for general events
      topicWindows: {
        'user:stats_update': 1000, // 1s for stats (50% reduction for better responsiveness)
        'stats:update': 1000, // 1s for global stats
        'leaderboard:refresh': 1500, // 1.5s for leaderboard (balanced)
      },
    });
  }

  /**
   * Calculate traditional parlay odds (simple multiplication)
   */
  private calculateParlayOdds(individualOdds: number[]): {
    baseCombinedOdds: number;
    legCount: number;
  } {
    const legCount = individualOdds.length;
    const baseCombinedOdds = individualOdds.reduce((prod, odds) => prod * odds, 1);

    return {
      baseCombinedOdds,
      legCount,
    };
  }

  /**
   * Place a single bet with full transaction atomicity for all money operations.
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
    return tracingCollector.trace(
      'betting_service_place_bet',
      async () => {
        // 1) Pre-validation outside transaction (read-only operations)
        const opt = await this.repo.findOptionWithPrediction(optionId);
        if (!opt) throw new Error('OPTION_NOT_FOUND');
        if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
          throw new Error('PREDICTION_CLOSED');
        }

        const user = await this.repo.findUserById(userId);
        if (!user || Number(user.muskBucks) < amount) throw new Error('INSUFFICIENT_FUNDS');

        // 2) Calculate enhanced odds (before transaction)
        let finalOdds = opt.odds;
        let allInBonus = 1.0;
        const wasAllIn = amount >= Number(user.muskBucks) * 0.95;
        if (wasAllIn) {
          allInBonus = 2.5; // 🚀 MASSIVE 150% ALL-IN BONUS!
          finalOdds = opt.odds * allInBonus;
        }

        const potentialPayout = BigInt(Math.floor(amount * finalOdds));

        // 3) Execute all money operations atomically
        const { bet, balanceChange } = await this.repo.placeBet(
          userId,
          opt.prediction.id,
          optionId,
          amount,
          finalOdds,
          potentialPayout,
          wasAllIn,
        );

        // 4) Post-transaction operations (safe to fail without data corruption)
        try {
          // Generate proper signed avatar URL
          const avatarUrl = user.profilePictureKey
            ? await this.userService.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
            : user.avatarUrl;

          // Get activity metrics for the prediction
          const { PredictionService } = require('./predictions.service');
          const predictionService = new PredictionService();
          const activityMetrics = await predictionService.getActivityMetrics(opt.prediction.id);
          const difficulty = await predictionService.calculateDifficulty(opt.prediction.id);
          const viewStats = await predictionService.getPredictionViewStats(opt.prediction.id);

          // Compose enhanced bet event payload
          const betWithUser: any = {
            ...bet,
            user: {
              id: user.id,
              name: user.name,
              avatarUrl,
              profilePictureKey: user.profilePictureKey,
            },
            optionLabel: opt.label,
            predictionTitle: opt.prediction.title,
            // Enhanced with activity metrics
            activityMetrics,
            difficulty,
            viewStats,
          };

          // Execute all post-transaction operations in parallel for performance
          await Promise.allSettled([
            // Emit balance update event for real-time UI updates
            this.eventBus.publish(REDIS_CHANNELS.BALANCE_UPDATE, {
              userId,
              newBalance: Number(balanceChange.new),
              previousBalance: Number(balanceChange.previous),
              change: -amount,
              reason: `Bet wager on prediction ${opt.prediction.id}`,
              timestamp: new Date().toISOString(),
            }),

            // Publish real‑time event
            this.eventBus.publish('bet:place', betWithUser),

            // Recalculate odds after bet placement
            this.recalculateOdds(opt.prediction.id),

            // Publish to unified activity system
            unifiedActivityService.createBetActivity(
              {
                id: user.id,
                name: user.name,
                avatarUrl,
              },
              {
                id: bet.id,
                amount,
                odds: finalOdds,
                predictionId: opt.prediction.id,
                predictionTitle: opt.prediction.title,
                optionLabel: opt.label,
                category: opt.prediction.category,
              },
            ),

            // Publish JSON rule achievement event
            this.eventBus.publish('bet:placed', {
              key: 'bet:placed',
              userId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `bet:${bet.id}:placed`,
              payload: {
                betId: bet.id,
                predictionId: opt.prediction.id,
                amount,
                category: opt.prediction.category,
                odds: finalOdds,
                optionLabel: opt.label,
              },
            }),

            // Add activity log entry for time-based tracking
            this.eventBus.publish('user:activity:log', {
              userId,
              activityType: 'bet_placed',
              metadata: {
                betId: bet.id,
                predictionId: opt.prediction.id,
                amount,
                odds: finalOdds,
                category: opt.prediction.category,
                timestamp: new Date().toISOString(),
              },
              occurredAt: new Date().toISOString(),
              dateKey: new Date().toISOString().split('T')[0], // YYYY-MM-DD
              idempotencyKey: `activity:bet:${bet.id}`,
            }),

            // Check for speed betting patterns (multiple bets in short time)
            this.checkSpeedBettingPattern(userId),

            // Process transaction for financial tracking
            financialTracker.processTransaction(userId, {
              type: 'DEBIT',
              amount: BigInt(amount),
              balanceAfter: BigInt(Number(user.muskBucks) - amount),
              relatedBetId: bet.id,
            }),

            // Trigger stats update (coalesced)
            this.eventCoalescer.addEvent(
              'user:stats_update',
              {
                userId,
                reason: 'bet_placed',
                betId: bet.id,
                predictionId: opt.prediction.id,
                amount,
                category: opt.prediction.category,
                timestamp: new Date().toISOString(),
              },
              userId,
            ),

            // Broadcast real-time metrics
            broadcastRealtimeMetrics(),

            // Issue #3: Invalidate caches after bet placement
            CacheInvalidation.invalidateUser(userId),
            CacheInvalidation.invalidatePrediction(opt.prediction.id),
          ]);
        } catch (error) {
          console.error('[betting] Error in post-transaction operations for bet:', bet.id, error);
          // Don't throw - bet was successfully placed, these are just notifications
        }

        return bet;
      },
      { userId, optionId, amount },
    );
  }

  /**
   * Place a parlay bet with full transaction atomicity for all money operations.
   */
  async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number,
  ): Promise<DbParlay> {
    // 1) Pre-validation outside transaction (read-only operations)
    const detailed = await Promise.all(
      legs.map(({ optionId }) => this.repo.findOptionWithPrediction(optionId)),
    );
    const validLegs = detailed.filter((opt): opt is OptionWithPrediction => opt !== null);
    if (validLegs.length !== legs.length) throw new Error('OPTION_NOT_FOUND');

    // Validate all legs have odds > 1.0 (no break-even or losing bets in parlays)
    for (const opt of validLegs) {
      if (opt.odds <= 1.0) {
        throw new Error(`INVALID_ODDS_${opt.id}: Parlay legs must have odds greater than 1.0x`);
      }
    }

    // Ensure none closed
    for (const opt of validLegs) {
      if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
        throw new Error(`PREDICTION_${opt.prediction.id}_CLOSED`);
      }
    }

    const user = await this.repo.findUserById(userId);
    if (!user || Number(user.muskBucks) < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 2) Calculate traditional parlay odds (before transaction)
    const oddsCalculation = this.calculateParlayOdds(validLegs.map((o) => o.odds));
    const basePayout = Math.floor(amount * oddsCalculation.baseCombinedOdds);

    // 🚀 ALL-IN bonus detection for parlays (50% bonus for betting ≥95% of balance)
    const isAllIn = amount >= Number(user.muskBucks) * 0.95;
    const allInMultiplier = isAllIn ? 1.5 : 1.0; // Extra 50% bonus for all-in parlays
    const finalPayout = Math.floor(basePayout * allInMultiplier);
    const potentialPayout = BigInt(finalPayout);

    // 3) Execute all money operations atomically
    const { parlay, balanceChange } = await this.repo.placeParlay(
      userId,
      validLegs.map((o) => ({
        predictionId: o.prediction.id,
        optionId: o.id,
        oddsAtPlacement: o.odds,
      })),
      amount,
      potentialPayout,
    );

    // 4) Post-transaction operations (safe to fail without data corruption)
    try {
      // Generate proper signed avatar URL
      const avatarUrl = user.profilePictureKey
        ? await this.userService.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
        : user.avatarUrl;

      // Get activity metrics for each prediction in the parlay
      const { PredictionService } = require('./predictions.service');
      const predictionService = new PredictionService();

      // Prepare enhanced leg events payload with activity metrics
      const legsPayload: ParlayLegWithUser[] = await Promise.all(
        validLegs.map(async (o) => {
          const activityMetrics = await predictionService.getActivityMetrics(o.prediction.id);
          const difficulty = await predictionService.calculateDifficulty(o.prediction.id);
          const viewStats = await predictionService.getPredictionViewStats(o.prediction.id);

          return {
            parlayId: parlay.id,
            user: { id: user.id, name: user.name, avatarUrl },
            stake: amount.toString(),
            optionId: o.id,
            createdAt: parlay.createdAt,
            predictionId: o.prediction.id,
            optionLabel: o.label,
            predictionTitle: o.prediction.title,
            // Enhanced with activity metrics
            activityMetrics,
            difficulty,
            viewStats,
          };
        }),
      );

      // Get affected predictions for odds recalculation
      const affectedPredictions = Array.from(new Set(validLegs.map((leg) => leg.prediction.id)));

      // Execute all post-transaction operations in parallel for performance
      await Promise.allSettled([
        // Emit balance update event for real-time UI updates
        this.eventBus.publish(REDIS_CHANNELS.BALANCE_UPDATE, {
          userId,
          newBalance: Number(balanceChange.new),
          previousBalance: Number(balanceChange.previous),
          change: -amount,
          reason: `Parlay wager with ${validLegs.length} legs`,
          timestamp: new Date().toISOString(),
        }),

        // Publish legacy leg events
        ...legsPayload.map((leg) => this.eventBus.publish('parlay:place', leg)),

        // Recalculate odds for all affected predictions
        ...affectedPredictions.map((predId) => this.recalculateOdds(predId)),

        // Publish to unified activity system
        unifiedActivityService.createParlayActivity(
          {
            id: user.id,
            name: user.name,
            avatarUrl,
          },
          {
            id: parlay.id,
            amount,
            legCount: oddsCalculation.legCount,
            combinedOdds: oddsCalculation.baseCombinedOdds,
          },
        ),

        // Publish JSON rule achievement event for parlay placement
        this.eventBus.publish('parlay:placed', {
          key: 'parlay:placed',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `parlay:${parlay.id}:placed`,
          payload: {
            parlayId: parlay.id,
            amount, // Amount is already a number here (validated input), not BigInt
            legCount: oddsCalculation.legCount,
            combinedOdds: oddsCalculation.baseCombinedOdds,
            predictions: validLegs.map((leg) => ({
              id: leg.prediction.id,
              title: leg.prediction.title,
              category: leg.prediction.category,
            })),
          },
        }),

        // Trigger stats update (coalesced)
        this.eventCoalescer.addEvent(
          'user:stats_update',
          {
            userId,
            reason: 'parlay_placed',
            parlayId: parlay.id,
            amount,
            legCount: oddsCalculation.legCount,
            predictions: validLegs.map((leg) => ({
              id: leg.prediction.id,
              title: leg.prediction.title,
              category: leg.prediction.category,
            })),
            timestamp: new Date().toISOString(),
          },
          userId,
        ),

        // Broadcast real-time metrics
        broadcastRealtimeMetrics(),

        // Issue #3: Invalidate caches after parlay placement
        CacheInvalidation.invalidateUser(userId),
        // Invalidate all predictions in the parlay
        ...affectedPredictions.map((predId) => CacheInvalidation.invalidatePrediction(predId)),
      ]);
    } catch (error) {
      console.error('[betting] Error in post-transaction operations for parlay:', parlay.id, error);
      // Don't throw - parlay was successfully placed, these are just notifications
    }

    return parlay;
  }

  /**
   * Trigger odds recalculation and broadcast enhanced live updates.
   */
  async recalculateOdds(predictionId: number): Promise<void> {
    // Get odds before recalculation
    const beforeOdds = await this.repo.getPredictionOptions(predictionId);

    // Perform recalculation with new exciting factors
    await this.repo.recalculateOdds(predictionId);

    // Get odds after recalculation
    const afterOdds = await this.repo.getPredictionOptions(predictionId);

    // Calculate which options had significant changes
    const significantChanges = afterOdds.filter((after, index) => {
      const before = beforeOdds[index];
      if (!before) return false;
      const change = Math.abs(after.odds - before.odds) / before.odds;
      return change > 0.1; // 10%+ change is significant
    });

    // Get current activity metrics for the prediction
    const { PredictionService } = require('./predictions.service');
    const predictionService = new PredictionService();
    const activityMetrics = await predictionService.getActivityMetrics(predictionId);
    const difficulty = await predictionService.calculateDifficulty(predictionId);
    const viewStats = await predictionService.getPredictionViewStats(predictionId);

    // 🔥 Broadcast enhanced odds update with excitement data and activity metrics
    await this.eventBus.publish('odds:update:enhanced', {
      predictionId,
      timestamp: new Date().toISOString(),
      significantChanges: significantChanges.length,
      hotMarket: significantChanges.length >= 2, // Multiple options changed significantly
      // Enhanced with activity metrics
      activityMetrics,
      difficulty,
      viewStats,
      options: afterOdds.map((option, index) => {
        const before = beforeOdds[index];
        return {
          id: option.id,
          label: option.label,
          odds: option.odds,
          previousOdds: before?.odds || option.odds,
          change: before ? option.odds - before.odds : 0,
          changePercent: before ? ((option.odds - before.odds) / before.odds) * 100 : 0,
        };
      }),
    });
  }

  /**
   * Check for speed betting patterns (e.g., "10 bets in 60 seconds")
   * @param userId - User ID to check
   */
  private async checkSpeedBettingPattern(userId: number): Promise<void> {
    try {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
      const recentBets = await this.repo.findUserBets(userId, {
        limit: 20,
        createdAfter: oneMinuteAgo,
      });

      // Check for "Speed Demon" achievement (10 bets in 60 seconds)
      if (recentBets.length >= 10) {
        await this.eventBus.publish('activity:speed:burst', {
          key: 'activity:speed:burst',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `speed:burst:${userId}:${Date.now()}`,
          payload: {
            activityType: 'betting',
            count: recentBets.length,
            timeWindow: 60,
            milestone: 'speed_demon',
            firstBetAt: recentBets[recentBets.length - 1]?.createdAt.toISOString(),
            lastBetAt: recentBets[0]?.createdAt.toISOString(),
          },
        });

        console.log(
          `[betting] User ${userId} achieved speed betting: ${recentBets.length} bets in 60 seconds`,
        );
      }

      // Check for other time patterns
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const recentBetsFiveMin = await this.repo.findUserBets(userId, {
        limit: 50,
        createdAfter: fiveMinutesAgo,
      });

      if (recentBetsFiveMin.length >= 25) {
        await this.eventBus.publish('activity:time:pattern', {
          key: 'activity:time:pattern',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `time:pattern:${userId}:${Date.now()}`,
          payload: {
            patternType: 'betting_frenzy',
            count: recentBetsFiveMin.length,
            timeWindow: 300, // 5 minutes
            activityType: 'betting',
          },
        });
      }
    } catch (error) {
      console.error('[betting] Error checking speed pattern:', error);
      // Don't throw - this is optional tracking
    }
  }

  /**
   * Handle bet resolution events and update streaks
   * Called by payout worker when bets are resolved
   */
  async handleBetResolution(
    userId: number,
    betId: number,
    won: boolean,
    amount: bigint,
    payout?: bigint,
  ): Promise<void> {
    try {
      // Update betting streak
      await streakManager.updateStreak(userId, 'bet_win', won, {
        betId,
        amount: amount.toString(),
        payout: payout?.toString(),
      });

      // Add activity log for resolution
      await this.eventBus.publish('user:activity:log', {
        userId,
        activityType: won ? 'bet_won' : 'bet_lost',
        metadata: {
          betId,
          amount: amount.toString(),
          payout: payout?.toString(),
          timestamp: new Date().toISOString(),
        },
        occurredAt: new Date().toISOString(),
        dateKey: new Date().toISOString().split('T')[0],
        idempotencyKey: `activity:bet:resolved:${betId}`,
      });

      // Process winning transaction for financial tracking
      if (won && payout) {
        await financialTracker.processTransaction(userId, {
          type: 'CREDIT',
          amount: payout,
          balanceAfter: BigInt(0), // This would be populated from the actual transaction
          relatedBetId: betId,
        });
      }

      console.log(`[betting] Processed bet resolution: User ${userId}, Bet ${betId}, Won: ${won}`);
    } catch (error) {
      console.error('[betting] Error handling bet resolution:', error);
    }
  }
}

export const bettingService = new BettingService();
