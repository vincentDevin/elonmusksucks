// apps/server/src/services/betting.service.ts
import type { IBettingRepository } from '../repositories/IBettingRepository';
import { BettingRepository } from '../repositories/BettingRepository';
import type { DbBet, DbParlay } from '@ems/types';

export class BettingService {
  constructor(private repo: IBettingRepository = new BettingRepository()) {}

  /**
   * Place a single bet:
   *  - load & validate option/prediction
   *  - snapshot odds, compute payout
   *  - deduct balance + record transaction
   *  - persist bet
   *  - recalculate odds
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
    // 1) Load option + ensure open
    const option = await this.repo.findOptionWithPrediction(optionId);
    if (!option) throw new Error('OPTION_NOT_FOUND');
    if (option.prediction.resolved || option.prediction.expiresAt < new Date()) {
      throw new Error('PREDICTION_CLOSED');
    }

    // 2) Snapshot odds & compute payout
    const oddsAtPlacement = option.odds;
    const potentialPayout = Math.floor(amount * oddsAtPlacement);

    // 3) Deduct balance + record transaction
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');
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

    // 4) Persist the bet
    const bet = await this.repo.createBet({
      userId,
      predictionId: option.predictionId,
      optionId,
      amount,
      oddsAtPlacement,
      potentialPayout,
    });

    // 5) Recalculate odds
    await this.recalculateOdds(option.predictionId);

    return bet;
  }

  /**
   * Place a parlay:
   *  - validate & snapshot each leg
   *  - compute combined odds + payout
   *  - deduct balance + transaction
   *  - create parlay + legs
   */
  async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number,
  ): Promise<DbParlay> {
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    // snapshot odds & validate
    const detailedLegs = await Promise.all(
      legs.map(async ({ optionId }) => {
        const opt = await this.repo.findOptionWithPrediction(optionId);
        if (!opt) throw new Error(`OPTION_${optionId}_NOT_FOUND`);
        if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
          throw new Error(`PREDICTION_${opt.predictionId}_CLOSED`);
        }
        return { optionId: opt.id, oddsAtPlacement: opt.odds };
      }),
    );

    const combinedOdds = detailedLegs.reduce((prod, leg) => prod * leg.oddsAtPlacement, 1);
    const potentialPayout = Math.floor(amount * combinedOdds);

    // deduct + transaction
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

    // create parlay
    return this.repo.createParlay({
      userId,
      amount,
      combinedOdds,
      potentialPayout,
      legs: detailedLegs,
    });
  }

  /**
   * Odds recalculation (pari-mutuel style)
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

export const bettingService = new BettingService();
