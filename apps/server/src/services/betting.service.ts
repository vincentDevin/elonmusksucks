// apps/server/src/services/betting.service.ts
import prisma from '../db';

export class BettingService {
  /**
   * Place a single bet.
   * Deducts from user balance, creates Bet record, and recalculates odds.
   */
  static async placeBet(userId: number, optionId: number, amount: number) {
    // 1) Load the option and check predict is open
    const option = await prisma.predictionOption.findUnique({
      where: { id: optionId! },
      include: { prediction: true },
    });
    if (!option) throw new Error('Option not found');
    if (option.prediction.resolved || option.prediction.expiresAt < new Date()) {
      throw new Error('Prediction is closed');
    }

    // 2) Deduct user balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.muskBucks < amount) {
      throw new Error('Insufficient funds');
    }
    const newBalance = user.muskBucks - amount;
    await prisma.user.update({
      where: { id: userId },
      data: { muskBucks: newBalance },
    });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEBIT',
        amount,
        balanceAfter: newBalance,
        relatedBetId: null,
        relatedParlayId: null,
      },
    });

    // 3) Create the bet (middleware will set potentialPayout)
    const bet = await prisma.bet.create({
      data: {
        userId,
        predictionId: option.predictionId,
        optionId: parseInt(optionId as any, 10),
        amount,
      },
    });

    // 4) Recalculate odds across all options for this prediction
    await BettingService.recalculateOdds(option.predictionId);

    return bet;
  }

  /**
   * Place a parlay (multi-leg bet).
   * Deducts from user, creates Parlay + ParlayLegs via nested create.
   */
  static async placeParlay(
    userId: number,
    legs: Array<{ optionId: number }>,
    amount: number
  ) {
    // 1) Validate user balance
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.muskBucks < amount) throw new Error('Insufficient funds');

    // 2) Load each option to snapshot odds and check open
    const detailedLegs = await Promise.all(
      legs.map(async (leg) => {
        const opt = await prisma.predictionOption.findUnique({
          where: { id: leg.optionId! },
          include: { prediction: true },
        });
        if (!opt) throw new Error(`Option ${leg.optionId} missing`);
        if (opt.prediction.resolved || opt.prediction.expiresAt < new Date()) {
          throw new Error(`Prediction ${opt.predictionId} is closed`);
        }
        return { optionId: opt.id, oddsAtPlacement: opt.odds };
      })
    );

    const combinedOdds = detailedLegs.reduce((prod, leg) => prod * leg.oddsAtPlacement, 1);
    const potentialPayout = Math.floor(amount * combinedOdds);

    // 3) Deduct balance + transaction
    const newBalance = user.muskBucks - amount;
    await prisma.user.update({ where: { id: userId }, data: { muskBucks: newBalance } });
    await prisma.transaction.create({
      data: {
        userId,
        type: 'DEBIT',
        amount,
        balanceAfter: newBalance,
        relatedBetId: null,
        relatedParlayId: null,
      },
    });

    // 4) Create parlay + nested legs
    const parlay = await prisma.parlay.create({
      data: {
        userId,
        amount,
        combinedOdds,
        potentialPayout,
        legs: {
          create: detailedLegs.map((leg) => ({
            optionId: leg.optionId,
            oddsAtPlacement: leg.oddsAtPlacement,
          })),
        },
      },
    });

    return parlay;
  }

  /**
   * Recalculate decimal odds for every option on this prediction
   * based on total pool vs option pool (pari-mutuel style).
   */
  static async recalculateOdds(predictionId: number) {
    // 1) Sum total wagers by option
    const pools = await prisma.bet.groupBy({
      by: ['optionId'],
      where: { predictionId },
      _sum: { amount: true },
    });
    const totalPool = pools.reduce((sum, p) => sum + (p._sum.amount || 0), 0);
    // 2) For each option, update odds = totalPool / optionPool
    await Promise.all(
      pools.map((p) =>
        prisma.predictionOption.update({
          where: { id: p.optionId! },
          data: {
            odds:
              p._sum.amount && totalPool
                ? totalPool / p._sum.amount
                : 1.0,
          },
        })
      )
    );
  }
}