// apps/server/src/services/betting.service.ts
// -----------------------------------------------------------------------------
// • Publishes **present‑tense** Redis channels (`bet:place`, `parlay:place`) to
//   align with the command‑naming convention.
// • No direct io.emit — real‑time fan‑out handled by redisEventHandlers.ts.
// -----------------------------------------------------------------------------

import type { IBettingRepository, OptionWithPrediction } from '../repositories/IBettingRepository';
import type { DbBet, DbParlay, BetWithUser, ParlayLegWithUser } from '@ems/types';
import { BettingRepository } from '../repositories/BettingRepository';
import redisClient from '../lib/redis';
import { unifiedActivityService } from './unifiedActivity.service';
import { UserService } from './user.service';
import { achievementService } from './achievement.service';
import { achievementEvaluatorService } from './achievementEvaluator.service';
import { broadcastRealtimeMetrics } from './admin.service';

export class BettingService {
  private userService = new UserService();

  constructor(private repo: IBettingRepository = new BettingRepository()) {}

  /**
   * Calculate enhanced parlay odds with exciting leg bonuses
   */
  private calculateEnhancedParlayOdds(individualOdds: number[]): {
    baseCombinedOdds: number;
    bonusMultiplier: number;
    finalOdds: number;
    legCount: number;
  } {
    const legCount = individualOdds.length;
    const baseCombinedOdds = individualOdds.reduce((prod, odds) => prod * odds, 1);

    // Exciting bonus multipliers for more legs!
    // 2 legs: 15% bonus, 3 legs: 32% bonus, 4 legs: 52% bonus, 5+ legs: 75% bonus
    let bonusMultiplier = 1;
    if (legCount >= 2) {
      bonusMultiplier = Math.pow(1.15, legCount - 1);
      // Cap the bonus at 2.0x for balance (10+ legs would be wild otherwise)
      bonusMultiplier = Math.min(bonusMultiplier, 2.0);
    }

    const finalOdds = baseCombinedOdds * bonusMultiplier;

    return {
      baseCombinedOdds,
      bonusMultiplier,
      finalOdds,
      legCount,
    };
  }

  /**
   * Place a single bet with full transaction atomicity for all money operations.
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
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
    if (amount >= Number(user.muskBucks) * 0.95) {
      allInBonus = 2.5; // 🚀 MASSIVE 150% ALL-IN BONUS!
      finalOdds = opt.odds * allInBonus;
    }

    const potentialPayout = BigInt(Math.floor(amount * finalOdds));

    // 3) Execute all money operations atomically
    const bet = await this.repo.placeBet(
      userId,
      opt.prediction.id,
      optionId,
      amount,
      finalOdds,
      potentialPayout,
    );

    // 4) Post-transaction operations (safe to fail without data corruption)
    try {
      // Generate proper signed avatar URL
      const avatarUrl = user.profilePictureKey
        ? await this.userService.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
        : user.avatarUrl;

      // Compose bet event payload
      const betWithUser: BetWithUser = {
        ...bet,
        amount: bet.amount.toString(),
        potentialPayout: bet.potentialPayout?.toString() || null,
        payout: bet.payout?.toString() || null,
        user: {
          id: user.id,
          name: user.name,
          avatarUrl,
        },
        optionLabel: opt.label,
        predictionTitle: opt.prediction.title,
      };

      // Execute all post-transaction operations in parallel for performance
      await Promise.allSettled([
        // Publish real‑time event
        redisClient.publish('bet:place', JSON.stringify(betWithUser)),

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

        // Check for achievement unlocks (legacy system)
        achievementService.checkAndUpdateAchievements({
          type: 'bet_placed',
          userId,
          data: {
            betId: bet.id,
            predictionId: opt.prediction.id,
            amount,
            category: opt.prediction.category,
          },
        }),

        // Check for achievement unlocks (advanced evaluator)
        achievementEvaluatorService.processAchievementEvent({
          type: 'bet_placed',
          userId,
          timestamp: new Date().toISOString(),
          data: {
            betId: bet.id,
            predictionId: opt.prediction.id,
            amount,
            category: opt.prediction.category,
            wasAllIn: false, // We'll need to calculate this
          },
        }),

        // Trigger stats update
        redisClient.publish(
          'user:stats_update',
          JSON.stringify({
            userId,
            reason: 'bet_placed',
            betId: bet.id,
            predictionId: opt.prediction.id,
            amount,
            category: opt.prediction.category,
            timestamp: new Date().toISOString(),
          }),
        ),

        // Broadcast real-time metrics
        broadcastRealtimeMetrics(),
      ]);
    } catch (error) {
      console.error('[betting] Error in post-transaction operations for bet:', bet.id, error);
      // Don't throw - bet was successfully placed, these are just notifications
    }

    return bet;
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

    // Ensure none closed
    for (const opt of validLegs) {
      if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
        throw new Error(`PREDICTION_${opt.prediction.id}_CLOSED`);
      }
    }

    const user = await this.repo.findUserById(userId);
    if (!user || Number(user.muskBucks) < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 2) Calculate enhanced odds matching frontend exactly (before transaction)
    const oddsCalculation = this.calculateEnhancedParlayOdds(validLegs.map((o) => o.odds));
    const basePayout = Math.floor(amount * oddsCalculation.finalOdds);

    // 🚀 ALL-IN bonus detection for parlays (matching frontend logic)
    const isAllIn = amount >= Number(user.muskBucks) * 0.95;
    const allInMultiplier = isAllIn ? 1.5 : 1.0; // Extra 50% bonus for all-in parlays
    const finalPayout = isAllIn ? Math.floor(basePayout * allInMultiplier) : basePayout;
    const potentialPayout = BigInt(finalPayout);

    // 3) Execute all money operations atomically
    const parlay = await this.repo.placeParlay(
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

      // Prepare leg events payload
      const legsPayload: ParlayLegWithUser[] = validLegs.map((o) => ({
        parlayId: parlay.id,
        user: { id: user.id, name: user.name, avatarUrl },
        stake: amount.toString(),
        optionId: o.id,
        createdAt: parlay.createdAt,
        predictionId: o.prediction.id,
        optionLabel: o.label,
        predictionTitle: o.prediction.title,
      }));

      // Get affected predictions for odds recalculation
      const affectedPredictions = Array.from(new Set(validLegs.map((leg) => leg.prediction.id)));

      // Execute all post-transaction operations in parallel for performance
      await Promise.allSettled([
        // Publish legacy leg events
        ...legsPayload.map((leg) => redisClient.publish('parlay:place', JSON.stringify(leg))),

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
            combinedOdds: oddsCalculation.finalOdds,
          },
        ),

        // Check for achievement unlocks (legacy system)
        achievementService.checkAndUpdateAchievements({
          type: 'parlay_completed',
          userId,
          data: {
            parlayId: parlay.id,
            amount,
            legCount: oddsCalculation.legCount,
            won: false, // Will be updated when parlay is resolved
          },
        }),

        // Check for achievement unlocks (advanced evaluator)
        achievementEvaluatorService.processAchievementEvent({
          type: 'bet_placed', // Parlay is a type of bet in the advanced system
          userId,
          timestamp: new Date().toISOString(),
          data: {
            parlayId: parlay.id,
            amount,
            legCount: oddsCalculation.legCount,
            isParlay: true,
          },
        }),

        // Trigger stats update
        redisClient.publish(
          'user:stats_update',
          JSON.stringify({
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
          }),
        ),

        // Broadcast real-time metrics
        broadcastRealtimeMetrics(),
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

    // 🔥 Broadcast enhanced odds update with excitement data
    await redisClient.publish(
      'odds:update:enhanced',
      JSON.stringify({
        predictionId,
        timestamp: new Date().toISOString(),
        significantChanges: significantChanges.length,
        hotMarket: significantChanges.length >= 2, // Multiple options changed significantly
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
      }),
    );
  }
}

export const bettingService = new BettingService();
