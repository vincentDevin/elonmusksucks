// apps/server/src/repositories/PayoutRepository.ts
import { PrismaClient, Prisma } from '@prisma/client';
import type { IPayoutRepository } from './IPayoutRepository';
import type { PublicPrediction, DbUserStats } from '@ems/types';

const prisma = new PrismaClient();

export class PayoutRepository implements IPayoutRepository {
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction> {
    return await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<PublicPrediction> => {
        // --- STEP 1: mark prediction resolved & grab updated prediction ---
        const updatedPrediction = await tx.prediction.update({
          where: { id: predictionId },
          data: {
            resolved: true,
            winningOptionId,
            resolvedAt: new Date(),
          },
          include: { options: true },
        });

        // --- STEP 2: process single bets ---
        const bets = await tx.bet.findMany({ where: { predictionId } });
        for (const b of bets) {
          const isWinner = b.optionId === winningOptionId;
          const payoutAmount = isWinner ? b.potentialPayout ?? 0 : 0;

          await tx.bet.update({
            where: { id: b.id },
            data: { status: isWinner ? 'WON' : 'LOST', won: isWinner, payout: isWinner ? b.potentialPayout : undefined },
          });

          if (isWinner) {
            const user = await tx.user.findUnique({ where: { id: b.userId } });
            if (user) {
              const newBal = user.muskBucks + payoutAmount;
              await tx.user.update({ where: { id: user.id }, data: { muskBucks: newBal } });
              await tx.transaction.create({
                data: { userId: user.id, type: 'CREDIT', amount: payoutAmount, balanceAfter: newBal, relatedBetId: b.id, relatedParlayId: null }
              });
            }
          }

          // fetch existing stats before upsert
          const statsBefore = await tx.userStats.findUnique({ where: { userId: b.userId } });
          const prevStats: DbUserStats = await tx.userStats.upsert({
            where: { userId: b.userId },
            create: {
              userId: b.userId,
              totalBets: 1,
              betsWon: isWinner ? 1 : 0,
              betsLost: isWinner ? 0 : 1,
              totalParlays: 0,
              parlaysWon: 0,
              parlaysLost: 0,
              totalParlayLegs: 0,
              parlayLegsWon: 0,
              parlayLegsLost: 0,
              totalWagered: b.amount,
              totalWon: payoutAmount,
              profit: payoutAmount - b.amount,
              roi: 0,
              currentStreak: isWinner ? (statsBefore?.currentStreak ?? 0) + 1 : 0,
              longestStreak: isWinner
                ? Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1)
                : statsBefore?.longestStreak ?? 0,
              mostCommonBet: null,
              biggestWin: payoutAmount,
            },
            update: {
              totalBets: { increment: 1 },
              betsWon: isWinner ? { increment: 1 } : undefined,
              betsLost: !isWinner ? { increment: 1 } : undefined,
              totalWagered: { increment: b.amount },
              totalWon: { increment: payoutAmount },
              profit: { increment: payoutAmount - b.amount },
              biggestWin: { set: Math.max(statsBefore?.biggestWin ?? 0, payoutAmount) },
              currentStreak: isWinner ? { set: (statsBefore?.currentStreak ?? 0) + 1 } : { set: 0 },
              longestStreak: isWinner
                ? { set: Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1) }
                : undefined,
            },
          });

          // recalc ROI
          await tx.userStats.update({
            where: { userId: b.userId },
            data: {
              roi: (prevStats.profit + (payoutAmount - b.amount)) / (prevStats.totalWagered + b.amount),
            },
          });
        }

        // --- STEP 3: process parlays ---
        const affected = await tx.parlayLeg.findMany({ where: { option: { predictionId } }, select: { parlayId: true } });
        const parlayIds = Array.from(new Set(affected.map((l) => l.parlayId)));

        for (const parlayId of parlayIds) {
          const legs = await tx.parlayLeg.findMany({
            where: { parlayId },
            include: { option: { include: { prediction: true } }, parlay: { include: { user: true } } },
          });
          if (!legs.every((l) => l.option.prediction.resolved)) continue;

          const parlay = legs[0].parlay;
          const legCount = legs.length;
          const legsWon = legs.filter((l) => l.optionId === l.option.prediction.winningOptionId).length;
          const lost = legsWon < legCount;
          const payoutAmount = lost ? 0 : parlay.potentialPayout;

          await tx.parlay.update({ where: { id: parlayId }, data: { status: lost ? 'LOST' : 'WON' } });

          if (!lost) {
            const newBal = parlay.user.muskBucks + payoutAmount;
            await tx.user.update({ where: { id: parlay.userId }, data: { muskBucks: newBal } });
            await tx.transaction.create({ data: { userId: parlay.userId, type: 'CREDIT', amount: payoutAmount, balanceAfter: newBal, relatedBetId: null, relatedParlayId: parlay.id } });
          }

          // fetch existing stats
          const statsBefore = await tx.userStats.findUnique({ where: { userId: parlay.userId } });
          const prevP: DbUserStats = await tx.userStats.upsert({
            where: { userId: parlay.userId },
            create: {
              userId: parlay.userId,
              totalBets: 0,
              betsWon: 0,
              betsLost: 0,
              totalParlays: 1,
              parlaysWon: lost ? 0 : 1,
              parlaysLost: lost ? 1 : 0,
              totalParlayLegs: legCount,
              parlayLegsWon: legsWon,
              parlayLegsLost: legCount - legsWon,
              totalWagered: parlay.amount,
              totalWon: payoutAmount,
              profit: payoutAmount - parlay.amount,
              roi: 0,
              currentStreak: lost ? 0 : (statsBefore?.currentStreak ?? 0) + 1,
              longestStreak: lost
                ? statsBefore?.longestStreak ?? 0
                : Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1),
              mostCommonBet: null,
              biggestWin: payoutAmount,
            },
            update: {
              totalParlays: { increment: 1 },
              parlaysWon: lost ? undefined : { increment: 1 },
              parlaysLost: lost ? { increment: 1 } : undefined,
              totalParlayLegs: { increment: legCount },
              parlayLegsWon: { increment: legsWon },
              parlayLegsLost: { increment: legCount - legsWon },
              totalWagered: { increment: parlay.amount },
              totalWon: { increment: payoutAmount },
              profit: { increment: payoutAmount - parlay.amount },
              biggestWin: { set: Math.max(statsBefore?.biggestWin ?? 0, payoutAmount) },
              currentStreak: lost ? { set: 0 } : { set: (statsBefore?.currentStreak ?? 0) + 1 },
              longestStreak: lost
                ? undefined
                : { set: Math.max(statsBefore?.longestStreak ?? 0, (statsBefore?.currentStreak ?? 0) + 1) },
            },
          });

          await tx.userStats.update({
            where: { userId: parlay.userId },
            data: {
              roi: (prevP.profit + (payoutAmount - parlay.amount)) / (prevP.totalWagered + parlay.amount),
            },
          });
        }

        return updatedPrediction;
      },
    );
  }
}
