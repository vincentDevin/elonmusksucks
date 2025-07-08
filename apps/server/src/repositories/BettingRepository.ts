// apps/server/src/repositories/BettingRepository.ts
import { PrismaClient } from '@prisma/client';
import type { IBettingRepository } from './IBettingRepository';
import type { DbBet, DbParlay } from '@ems/types';

const prisma = new PrismaClient();

export class BettingRepository implements IBettingRepository {
  findOptionWithPrediction(optionId: number) {
    return prisma.predictionOption.findUnique({
      where: { id: optionId },
      include: { prediction: { select: { id: true, resolved: true, expiresAt: true } } },
    });
  }

  findUserById(userId: number) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, muskBucks: true },
    });
  }

  async placeBet(
    userId: number,
    predictionId: number,
    optionId: number,
    amount: number,
    oddsAtPlacement: number,
    potentialPayout: number,
  ): Promise<DbBet> {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceAfter: user.muskBucks,
          relatedBetId: null,
          relatedParlayId: null,
        },
      });

      const bet = await tx.bet.create({
        data: { userId, predictionId, optionId, amount, oddsAtPlacement, potentialPayout },
      });

      // recalc odds
      const pools = await tx.bet.groupBy({
        by: ['optionId'],
        where: { predictionId },
        _sum: { amount: true },
      });
      const total = pools.reduce((s, p) => s + (p._sum.amount ?? 0), 0);
      await Promise.all(
        pools.map((p) =>
          tx.predictionOption.update({
            where: { id: p.optionId! },
            data: { odds: total && p._sum.amount ? total / p._sum.amount : 1 },
          }),
        ),
      );

      // upsert stats for single bet
      await tx.userStats.upsert({
        where: { userId },
        create: {
          userId,
          totalBets: 1,
          betsWon: 0,
          betsLost: 0,
          totalParlays: 0,
          parlaysWon: 0,
          parlaysLost: 0,
          totalParlayLegs: 0,
          parlayLegsWon: 0,
          parlayLegsLost: 0,
          totalWagered: amount,
          totalWon: 0,
          profit: -amount,
          roi: 0,
          currentStreak: 0,
          longestStreak: 0,
          mostCommonBet: null,
          biggestWin: 0,
          updatedAt: new Date(),
        },
        update: {
          totalBets: { increment: 1 },
          totalWagered: { increment: amount },
          profit: { decrement: amount },
        },
      });

      return bet;
    });
  }

  async placeParlay(
    userId: number,
    legs: Array<{ predictionId: number; optionId: number; oddsAtPlacement: number }>,
    amount: number,
    potentialPayout: number,
  ): Promise<DbParlay> {
    const legCount = legs.length;

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });

      await tx.transaction.create({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceAfter: user.muskBucks,
          relatedBetId: null,
          relatedParlayId: null,
        },
      });

      const parlay = await tx.parlay.create({
        data: {
          userId,
          amount,
          combinedOdds: legs.reduce((a, l) => a * l.oddsAtPlacement, 1),
          potentialPayout,
          legs: {
            create: legs.map((l) => ({
              optionId: l.optionId,
              oddsAtPlacement: l.oddsAtPlacement,
            })),
          },
        },
      });

      // upsert stats for parlay
      await tx.userStats.upsert({
        where: { userId },
        create: {
          userId,
          totalBets: 0,
          betsWon: 0,
          betsLost: 0,
          totalParlays: 1,
          parlaysWon: 0,
          parlaysLost: 0,
          totalParlayLegs: legCount,
          parlayLegsWon: 0,
          parlayLegsLost: legCount,
          totalWagered: amount,
          totalWon: 0,
          profit: -amount,
          roi: 0,
          currentStreak: 0,
          longestStreak: 0,
          mostCommonBet: null,
          biggestWin: 0,
          updatedAt: new Date(),
        },
        update: {
          totalParlays: { increment: 1 },
          totalParlayLegs: { increment: legCount },
          totalWagered: { increment: amount },
          profit: { decrement: amount },
        },
      });

      return parlay;
    });
  }

  recalculateOdds(predictionId: number): Promise<void> {
    return prisma.bet
      .groupBy({
        by: ['optionId'],
        where: { predictionId },
        _sum: { amount: true },
      })
      .then((pools) => {
        const total = pools.reduce((s, p) => s + (p._sum.amount ?? 0), 0);
        return Promise.all(
          pools.map((p) =>
            prisma.predictionOption.update({
              where: { id: p.optionId! },
              data: { odds: total && p._sum.amount ? total / p._sum.amount : 1 },
            }),
          ),
        ).then(() => undefined);
      });
  }
}
