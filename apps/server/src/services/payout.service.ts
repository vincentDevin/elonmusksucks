// apps/server/src/services/payout.service.ts
import prisma from '../db';
import { Outcome, Prisma } from '@prisma/client';

export class PayoutService {
  /**
   * Resolve a prediction: mark it, then payout all bets & parlays.
   */
  static async resolvePrediction(predictionId: number, winningOptionId: number) {
    return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Mark prediction resolved
      await tx.prediction.update({
        where: { id: predictionId },
        data: { resolved: true, outcome: Outcome.YES, resolvedAt: new Date() }, // adapt outcome enum value as needed
      });

      // 2) Process single bets
      await PayoutService.processSingleBets(tx, predictionId, winningOptionId);

      // 3) Process parlays
      await PayoutService.processParlays(tx, predictionId, winningOptionId);
    });
  }

  private static async processSingleBets(
    tx: Prisma.TransactionClient,
    predictionId: number,
    winningOptionId: number,
  ) {
    const bets = await tx.bet.findMany({ where: { predictionId } });
    for (const b of bets) {
      if (b.optionId === winningOptionId) {
        await tx.bet.update({
          where: { id: b.id },
          data: { status: 'WON', payout: b.potentialPayout, won: true },
        });
        // credit user
        const user = await tx.user.findUnique({ where: { id: b.userId } });
        if (user) {
          const newBal = user.muskBucks + (b.potentialPayout ?? 0);
          await tx.user.update({
            where: { id: user.id },
            data: { muskBucks: newBal },
          });
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'CREDIT',
              amount: b.potentialPayout ?? 0,
              balanceAfter: newBal,
              relatedBetId: b.id,
              relatedParlayId: null,
            },
          });
        }
      } else {
        await tx.bet.update({
          where: { id: b.id },
          data: { status: 'LOST', won: false },
        });
      }
    }
  }

  private static async processParlays(
    tx: Prisma.TransactionClient,
    predictionId: number,
    winningOptionId: number,
  ) {
    // find parlays with any leg on this prediction
    const legs = await tx.parlayLeg.findMany({
      where: { option: { predictionId } },
      include: { parlay: { include: { user: true } } },
    });

    // group legs by parlay
    const parlaysMap = new Map<number, (typeof legs)[0][]>();
    for (const leg of legs) {
      if (!parlaysMap.has(leg.parlayId)) parlaysMap.set(leg.parlayId, []);
      parlaysMap.get(leg.parlayId)!.push(leg);
    }

    for (const [parlayId, legs] of parlaysMap.entries()) {
      const parlay = legs[0].parlay;
      // if any leg lost, mark whole parlay lost
      if (legs.some((l) => l.optionId !== winningOptionId)) {
        await tx.parlay.update({
          where: { id: parlayId },
          data: { status: 'LOST' },
        });
      } else {
        // all legs won → payout
        await tx.parlay.update({
          where: { id: parlayId },
          data: { status: 'WON' },
        });
        const newBal = parlay.user.muskBucks + parlay.potentialPayout;
        await tx.user.update({
          where: { id: parlay.userId },
          data: { muskBucks: newBal },
        });
        await tx.transaction.create({
          data: {
            userId: parlay.userId,
            type: 'CREDIT',
            amount: parlay.potentialPayout,
            balanceAfter: newBal,
            relatedBetId: null,
            relatedParlayId: parlay.id,
          },
        });
      }
    }
  }
}
