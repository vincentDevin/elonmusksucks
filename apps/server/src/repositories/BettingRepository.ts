// apps/server/src/repositories/BettingRepository.ts
// Prisma implementation of IBettingRepository

import prisma from '../db';
import type { IBettingRepository } from './IBettingRepository';
import type {
  DbPredictionOption,
  DbPrediction,
  DbUser,
  DbBet,
  DbTransaction,
  DbParlay,
  TransactionType,
} from '@ems/types';

export class BettingRepository implements IBettingRepository {
  /**
   * Fetch a prediction option along with its parent prediction.
   */
  async findOptionWithPrediction(
    optionId: number,
  ): Promise<
    | (DbPredictionOption & { prediction: Pick<DbPrediction, 'id' | 'resolved' | 'expiresAt'> })
    | null
  > {
    return prisma.predictionOption.findUnique({
      where: { id: optionId },
      include: { prediction: { select: { id: true, resolved: true, expiresAt: true } } },
    }) as Promise<
      | (DbPredictionOption & { prediction: Pick<DbPrediction, 'id' | 'resolved' | 'expiresAt'> })
      | null
    >;
  }

  /**
   * Fetch minimal user info for betting (id and current balance).
   */
  async findUserById(userId: number): Promise<Pick<DbUser, 'id' | 'muskBucks'> | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, muskBucks: true },
    }) as Promise<Pick<DbUser, 'id' | 'muskBucks'> | null>;
  }

  /**
   * Update a user's MuskBucks balance.
   */
  async updateUserMuskBucks(userId: number, muskBucks: number): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { muskBucks } });
  }

  /**
   * Record a transaction for a user.
   */
  async createTransaction(data: {
    userId: number;
    type: TransactionType;
    amount: number;
    balanceAfter: number;
    relatedBetId?: number | null;
    relatedParlayId?: number | null;
  }): Promise<DbTransaction> {
    return prisma.transaction.create({ data }) as Promise<DbTransaction>;
  }

  /**
   * Create a single bet record.
   */
  async createBet(data: {
    userId: number;
    predictionId: number;
    optionId: number;
    amount: number;
  }): Promise<DbBet> {
    return prisma.bet.create({ data }) as Promise<DbBet>;
  }

  /**
   * Group bets by option for a given prediction and sum amounts.
   */
  async groupBetsByPrediction(
    predictionId: number,
  ): Promise<Array<{ optionId: number; totalAmount: number }>> {
    const pools = await prisma.bet.groupBy({
      by: ['optionId'],
      where: { predictionId },
      _sum: { amount: true },
    });
    return pools
      .filter((p) => p.optionId !== null)
      .map((p) => ({ optionId: p.optionId as number, totalAmount: p._sum.amount ?? 0 }));
  }

  /**
   * Update odds on a prediction option.
   */
  async updatePredictionOptionOdds(optionId: number, odds: number): Promise<void> {
    await prisma.predictionOption.update({
      where: { id: optionId },
      data: { odds },
    });
  }

  /**
   * Create a parlay bet with nested legs.
   */
  async createParlay(data: {
    userId: number;
    amount: number;
    combinedOdds: number;
    potentialPayout: number;
    legs: Array<{ optionId: number; oddsAtPlacement: number }>;
  }): Promise<DbParlay> {
    return prisma.parlay.create({
      data: {
        userId: data.userId,
        amount: data.amount,
        combinedOdds: data.combinedOdds,
        potentialPayout: data.potentialPayout,
        legs: {
          create: data.legs.map((leg) => ({
            optionId: leg.optionId,
            oddsAtPlacement: leg.oddsAtPlacement,
          })),
        },
      },
    }) as Promise<DbParlay>;
  }
}
