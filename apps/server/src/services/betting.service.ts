// apps/server/src/services/betting.service.ts
import type { IBettingRepository } from '../repositories/IBettingRepository';
import type { DbBet, DbParlay, PublicBet } from '@ems/types';
import { BettingRepository } from '../repositories/BettingRepository';
import redisClient from '../lib/redis';

export class BettingService {
  constructor(private repo: IBettingRepository = new BettingRepository()) {}

  /**
   * Place a single bet:
   * 1) Validate option/prediction is open
   * 2) Validate user funds
   * 3) Compute payout
   * 4) Persist and emit real-time event
   */
  async placeBet(userId: number, optionId: number, amount: number): Promise<DbBet> {
    // 1) Load option + prediction
    const opt = await this.repo.findOptionWithPrediction(optionId);
    if (!opt) throw new Error('OPTION_NOT_FOUND');
    if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
      throw new Error('PREDICTION_CLOSED');
    }

    // 2) Check user balance
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 3) Compute odds and payout
    const oddsAtPlacement = opt.odds;
    const potentialPayout = Math.floor(amount * oddsAtPlacement);

    // 4) Persist via repository
    const bet = await this.repo.placeBet(
      userId,
      opt.prediction.id,
      optionId,
      amount,
      oddsAtPlacement,
      potentialPayout,
    );

    // 5) Publish real-time event to clients
    const payload: PublicBet = {
      id: bet.id,
      userId: bet.userId,
      predictionId: bet.predictionId,
      optionId: bet.optionId,
      amount: bet.amount,
      oddsAtPlacement: bet.oddsAtPlacement,
      potentialPayout: bet.potentialPayout,
      status: bet.status,
      won: bet.won,
      payout: bet.payout,
      createdAt: bet.createdAt,
    };
    await redisClient.publish('bet:placed', JSON.stringify(payload));

    return bet;
  }

  /**
   * Place a parlay:
   * 1) Validate each leg is open
   * 2) Validate user funds
   * 3) Compute combined payout
   * 4) Persist and emit real-time event
   */
  async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number,
  ): Promise<DbParlay> {
    // 1) Snapshot & filter valid legs
    const detailed = await Promise.all(
      legs.map(({ optionId }) => this.repo.findOptionWithPrediction(optionId)),
    );
    const validLegs = detailed.filter((opt): opt is NonNullable<typeof opt> => opt !== null);
    if (validLegs.length !== legs.length) throw new Error('OPTION_NOT_FOUND');

    // 2) Ensure none closed
    for (const opt of validLegs) {
      if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
        throw new Error(`PREDICTION_${opt.prediction.id}_CLOSED`);
      }
    }

    // 3) Check funds
    const user = await this.repo.findUserById(userId);
    if (!user || user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

    // 4) Compute combined odds
    const combinedOdds = validLegs.reduce((prod, o) => prod * o.odds, 1);
    const potentialPayout = Math.floor(amount * combinedOdds);

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

    // 6) Publish real-time event to clients
    await redisClient.publish('parlay:placed', JSON.stringify(parlay));

    return parlay;
  }

  /**
   * Recalculate odds is db-only; delegate directly
   */
  async recalculateOdds(predictionId: number): Promise<void> {
    return this.repo.recalculateOdds(predictionId);
  }
}

export const bettingService = new BettingService();
