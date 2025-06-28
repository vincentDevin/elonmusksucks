// apps/server/src/repositories/PredictionRepository.ts
// Prisma implementation of IPredictionRepository

import prisma from '../db';
import type { IPredictionRepository } from './IPredictionRepository';
import type { DbPrediction, DbBet, DbUser, DbLeaderboardEntry } from '@ems/types';

export class PredictionRepository implements IPredictionRepository {
  /** List all predictions with their bets and betting users */
  async listAllPredictions(): Promise<
    Array<DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> }>
  > {
    return prisma.prediction.findMany({
      include: {
        bets: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as Promise<
      Array<DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> }>
    >;
  }

  /** Create a new prediction event */
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction> {
    return prisma.prediction.create({ data }) as Promise<DbPrediction>;
  }

  /** Find a prediction by its ID */
  async findPredictionById(id: number): Promise<DbPrediction | null> {
    return prisma.prediction.findUnique({ where: { id } }) as Promise<DbPrediction | null>;
  }

  /** Find a user by their ID (id, name, muskBucks) */
  async findUserById(id: number): Promise<Pick<DbUser, 'id' | 'name' | 'muskBucks'> | null> {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, muskBucks: true },
    }) as Promise<Pick<DbUser, 'id' | 'name' | 'muskBucks'> | null>;
  }

  /** Decrement a user's muskBucks balance */
  async decrementUserMuskBucks(userId: number, amount: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { muskBucks: { decrement: amount } },
    });
  }

  /** Create a bet for a prediction */
  async createBet(
    userId: number,
    predictionId: number,
    amount: number,
    optionId: number,
  ): Promise<DbBet> {
    return prisma.bet.create({
      data: { userId, predictionId, amount, optionId },
    }) as Promise<DbBet>;
  }

  /** Find all bets associated with a prediction */
  async findBetsByPrediction(predictionId: number): Promise<DbBet[]> {
    return prisma.bet.findMany({ where: { predictionId } }) as Promise<DbBet[]>;
  }

  /** Update a bet (e.g., when resolving outcome) */
  async updateBet(betId: number, data: Partial<Pick<DbBet, 'won' | 'payout'>>): Promise<void> {
    await prisma.bet.update({ where: { id: betId }, data });
  }

  /** Increment a user's muskBucks balance */
  async incrementUserMuskBucks(userId: number, amount: number): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { muskBucks: { increment: amount } },
    });
  }

  /** Mark a prediction as resolved at a specific time */
  async markPredictionResolved(predictionId: number, resolvedAt: Date): Promise<DbPrediction> {
    return prisma.prediction.update({
      where: { id: predictionId },
      data: { resolved: true, resolvedAt },
    }) as Promise<DbPrediction>;
  }

  /** Retrieve the leaderboard of top users by muskBucks */
  async getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]> {
    return prisma.user.findMany({
      orderBy: { muskBucks: 'desc' },
      take: limit,
      select: { id: true, name: true, muskBucks: true },
    }) as Promise<DbLeaderboardEntry[]>;
  }
}
