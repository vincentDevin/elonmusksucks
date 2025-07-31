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
import { normalizedActivityService } from './normalizedActivity.service';
import { UserService } from './user.service';

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
      legCount
    };
  }

  /**
   * Place a single bet and publish real‑time event with user info.
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
    // 1) Load option + prediction
    const opt = await this.repo.findOptionWithPrediction(optionId);
    if (!opt) throw new Error('OPTION_NOT_FOUND');
    if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
      throw new Error('PREDICTION_CLOSED');
    }

    // 2) Check user balance and get user info
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 3) Apply ALL-IN multiplier if user is betting their entire balance
    let finalOdds = opt.odds;
    let allInBonus = 1.0;
    if (amount >= user.muskBucks * 0.95) { // 95%+ of balance = ALL-IN
      allInBonus = 2.5; // 🚀 MASSIVE 150% ALL-IN BONUS!
      finalOdds = opt.odds * allInBonus;
    }
    
    const potentialPayout = Math.floor(amount * finalOdds);

    // 4) Persist via repository with enhanced odds
    const bet = await this.repo.placeBet(
      userId,
      opt.prediction.id,
      optionId,
      amount,
      finalOdds, // Use enhanced odds instead of old odds
      potentialPayout,
    );

    // 5) Generate proper signed avatar URL
    const avatarUrl = user.profilePictureKey
      ? await this.userService.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
      : user.avatarUrl;

    // 6) Compose full bet event payload including user info
    const betWithUser: BetWithUser = {
      ...bet,
      user: {
        id: user.id,
        name: user.name,
        avatarUrl,
      },
      optionLabel: opt.label,
      predictionTitle: opt.prediction.title,
    };

    // 7) Publish real‑time event (present‑tense channel) - legacy format
    await redisClient.publish('bet:place', JSON.stringify(betWithUser));

    // 8) Recalculate odds after bet is placed (for next bets)
    await this.recalculateOdds(opt.prediction.id);

    // 9) Publish normalized activity event
    await normalizedActivityService.createBetPlacedEvent(
      {
        id: user.id,
        name: user.name,
        avatarUrl,
      },
      {
        amount,
        predictionId: opt.prediction.id,
        predictionTitle: opt.prediction.title,
        optionLabel: opt.label,
        category: opt.prediction.category,
        odds: finalOdds,
      }
    );

    return bet;
  }

  /**
   * Place a parlay bet and publish real‑time event.
   */
  async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number,
  ): Promise<DbParlay> {
    // 1) Get all leg details
    const detailed = await Promise.all(
      legs.map(({ optionId }) => this.repo.findOptionWithPrediction(optionId)),
    );
    const validLegs = detailed.filter((opt): opt is OptionWithPrediction => opt !== null);
    if (validLegs.length !== legs.length) throw new Error('OPTION_NOT_FOUND');

    // 2) Ensure none closed
    for (const opt of validLegs) {
      if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
        throw new Error(`PREDICTION_${opt.prediction.id}_CLOSED`);
      }
    }

    // 3) Check user balance
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 4) Compute enhanced combined odds with exciting bonuses!
    const oddsCalculation = this.calculateEnhancedParlayOdds(validLegs.map(o => o.odds));
    const potentialPayout = Math.floor(amount * oddsCalculation.finalOdds);

    // 5) Persist via repository
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

    // 6) Generate proper signed avatar URL
    const avatarUrl = user.profilePictureKey
      ? await this.userService.getCachedProfileImageUrl(user.id, user.profilePictureKey, 3600)
      : user.avatarUrl;

    // 7) Publish a leg event for each leg with extra info
    const legsPayload: ParlayLegWithUser[] = validLegs.map((o) => ({
      parlayId: parlay.id,
      user: { id: user.id, name: user.name, avatarUrl },
      stake: amount,
      optionId: o.id,
      createdAt: parlay.createdAt,
      predictionId: o.prediction.id,
      optionLabel: o.label,
      predictionTitle: o.prediction.title,
    }));

    // 7) Publish legacy leg events
    await Promise.all(
      legsPayload.map((leg) => redisClient.publish('parlay:place', JSON.stringify(leg))),
    );

    // 8) Recalculate odds for all affected predictions (make markets alive!)
    const affectedPredictions = Array.from(new Set(validLegs.map(leg => leg.prediction.id)));
    await Promise.all(
      affectedPredictions.map(predId => this.recalculateOdds(predId))
    );

    // 9) Publish normalized parlay activity event with final odds
    await normalizedActivityService.createParlayStartedEvent(
      {
        id: user.id,
        name: user.name,
        avatarUrl,
      },
      {
        amount,
        parlayId: parlay.id,
        legCount: oddsCalculation.legCount,
        combinedOdds: oddsCalculation.finalOdds,
      }
    );

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
    await redisClient.publish('odds:update:enhanced', JSON.stringify({
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
          change: before ? (option.odds - before.odds) : 0,
          changePercent: before ? ((option.odds - before.odds) / before.odds) * 100 : 0
        };
      })
    }));

  }
}

export const bettingService = new BettingService();
