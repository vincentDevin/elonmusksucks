import prisma from '../db';
import { BetOption, Outcome } from '@prisma/client';

export async function listAllPredictions() {
  return prisma.prediction.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function createPrediction(data: {
  title: string;
  description: string;
  category: string;
  expiresAt: Date;
}) {
  return prisma.prediction.create({
    data: {
      title: data.title,
      description: data.description,
      category: data.category,
      expiresAt: data.expiresAt,
    },
  });
}

export async function getPrediction(id: number) {
  return prisma.prediction.findUnique({ where: { id } });
}

export async function placeBet(
  userId: number,
  predictionId: number,
  amount: number,
  option: BetOption,
) {
  const prediction = await prisma.prediction.findUnique({ where: { id: predictionId } });
  if (!prediction) throw new Error('PREDICTION_NOT_FOUND');
  if (prediction.expiresAt <= new Date()) throw new Error('PREDICTION_CLOSED');

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('USER_NOT_FOUND');
  if (user.muskBucks < amount) throw new Error('INSUFFICIENT_FUNDS');

  await prisma.user.update({
    where: { id: userId },
    data: { muskBucks: { decrement: amount } },
  });

  return prisma.bet.create({
    data: {
      userId,
      predictionId,
      amount,
      option,
    },
  });
}

export async function resolvePrediction(predictionId: number, outcome: Outcome) {
  const prediction = await prisma.prediction.update({
    where: { id: predictionId },
    data: {
      resolved: true,
      outcome,
      resolvedAt: new Date(),
    },
  });

  const bets = await prisma.bet.findMany({ where: { predictionId } });

  for (const bet of bets) {
    const won = bet.option === outcome;
    const payout = won ? bet.amount * 2 : 0;

    await prisma.bet.update({
      where: { id: bet.id },
      data: { won, payout },
    });

    if (won) {
      await prisma.user.update({
        where: { id: bet.userId },
        data: { muskBucks: { increment: payout } },
      });
    }
  }

  return prediction;
}

export async function getLeaderboard(limit = 10) {
  return prisma.user.findMany({
    orderBy: { muskBucks: 'desc' },
    take: limit,
    select: { id: true, name: true, muskBucks: true },
  });
}
