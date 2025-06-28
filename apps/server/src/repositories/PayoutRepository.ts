// apps/server/src/repositories/PayoutRepository.ts
import { PrismaClient, Prisma, Outcome } from '@prisma/client';
import type { IPayoutRepository } from './IPayoutRepository';

const prisma = new PrismaClient();

export class PayoutRepository implements IPayoutRepository {
  async resolvePrediction(predictionId: number, winningOptionId: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1) Mark prediction resolved (adjust Outcome enum if needed)
      await tx.prediction.update({
        where: { id: predictionId },
        data: {
          resolved: true,
          outcome: Outcome.YES,
          resolvedAt: new Date(),
        },
      });

      // 2) Process single bets
      const bets = await tx.bet.findMany({ where: { predictionId } });
      for (const b of bets) {
        if (b.optionId === winningOptionId) {
          await tx.bet.update({
            where: { id: b.id },
            data: { status: 'WON', payout: b.potentialPayout, won: true },
          });
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

      // 3) Process parlays
      const legs = await tx.parlayLeg.findMany({
        where: { option: { predictionId } },
        include: { parlay: { include: { user: true } } },
      });

      // group by parlay
      const parlaysMap = new Map<number, typeof legs>();
      for (const leg of legs) {
        const list = parlaysMap.get(leg.parlayId) ?? [];
        list.push(leg);
        parlaysMap.set(leg.parlayId, list);
      }

      for (const [parlayId, legs] of parlaysMap.entries()) {
        const parlay = legs[0].parlay;
        const lost = legs.some((l) => l.optionId !== winningOptionId);
        await tx.parlay.update({
          where: { id: parlayId },
          data: { status: lost ? 'LOST' : 'WON' },
        });
        if (!lost) {
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
    });
  }
}
