// apps/server/src/services/betting.service.ts
// Service layer for betting operations, using a repository for data access

import type { IBettingRepository } from '../repositories/IBettingRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import type { DbBet, DbParlay } from '@ems/types';

export class BettingService {
  constructor(private repo: IBettingRepository = new BettingRepository()) {}

  /**
   * Place a single bet: deduct balance, record transaction and bet, then recalculate odds
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
    // Load option with parent prediction
    const option = await this.repo.findOptionWithPrediction(optionId);
    if (!option) throw new Error('Option not found');
    const { prediction } = option;
    if (prediction.resolved || prediction.expiresAt < new Date()) {
      throw new Error('Prediction is closed');
    }

    // Check and deduct user balance
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) {
      throw new Error('Insufficient funds');
    }
    const newBalance = user.muskBucks - amount;
    await this.repo.updateUserMuskBucks(userId, newBalance);
    await this.repo.createTransaction({
      userId,
      type: 'DEBIT',
      amount,
      balanceAfter: newBalance,
      relatedBetId: null,
      relatedParlayId: null,
    });

    // Record the bet
    const bet = await this.repo.createBet({
      userId,
      predictionId: prediction.id,
      optionId,
      amount,
    });

    // Recalculate odds
    await this.recalculateOdds(prediction.id);
    return bet;
  }

  /**
   * Place a parlay (multi-leg bet): deduct balance, record transaction and parlay + legs
   */
  async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number,
  ): Promise<DbParlay> {
    // Validate user balance
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) {
      throw new Error('Insufficient funds');
    }

    // Validate each leg and snapshot odds
    const detailedLegs = await Promise.all(
      legs.map(async ({ optionId }) => {
        const opt = await this.repo.findOptionWithPrediction(optionId);
        if (!opt) throw new Error(`Option ${optionId} missing`);
        const { prediction } = opt;
        if (prediction.resolved || prediction.expiresAt < new Date()) {
          throw new Error(`Prediction ${prediction.id} is closed`);
        }
        return { optionId: opt.id, oddsAtPlacement: opt.odds };
      }),
    );

    const combinedOdds = detailedLegs.reduce((prod, leg) => prod * leg.oddsAtPlacement, 1);
    const potentialPayout = Math.floor(amount * combinedOdds);

    // Deduct balance and record transaction
    const newBalance = user.muskBucks - amount;
    await this.repo.updateUserMuskBucks(userId, newBalance);
    await this.repo.createTransaction({
      userId,
      type: 'DEBIT',
      amount,
      balanceAfter: newBalance,
      relatedBetId: null,
      relatedParlayId: null,
    });

    // Create parlay with legs
    const parlay = await this.repo.createParlay({
      userId,
      amount,
      combinedOdds,
      potentialPayout,
      legs: detailedLegs,
    });
    return parlay;
  }

  /**
   * Recalculate odds for a prediction by pari-mutuel pool
   */
  async recalculateOdds(predictionId: number): Promise<void> {
    const pools = await this.repo.groupBetsByPrediction(predictionId);
    const totalPool = pools.reduce((sum, p) => sum + p.totalAmount, 0);

    await Promise.all(
      pools.map(({ optionId, totalAmount }) =>
        this.repo.updatePredictionOptionOdds(
          optionId,
          totalPool && totalAmount ? totalPool / totalAmount : 1.0,
        ),
      ),
    );
  }
}

// Singleton for controllers
export const bettingService = new BettingService();
