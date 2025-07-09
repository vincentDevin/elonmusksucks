// apps/server/tests/repositories/payout.repository.test.ts

import type { PayoutRepository as PayoutRepoType } from '../../../src/repositories/PayoutRepository';
import { PredictionType } from '@ems/types';

// Mock transaction context
const mTx = {
  prediction: { update: jest.fn() },
  bet: { findMany: jest.fn(), update: jest.fn() },
  user: { findUnique: jest.fn(), update: jest.fn() },
  transaction: { create: jest.fn() },
  userStats: { findUnique: jest.fn(), upsert: jest.fn(), update: jest.fn() },
  parlayLeg: { findMany: jest.fn() },
  parlay: { update: jest.fn() },
};

// Mock PrismaClient
const mPrisma = {
  $transaction: jest.fn((fn: (tx: typeof mTx) => any) => fn(mTx)),
};

jest.doMock('@prisma/client', () => ({ PrismaClient: jest.fn(() => mPrisma) }));

// Import repository
const { PayoutRepository } = require('../../../src/repositories/PayoutRepository');

// Test across all prediction types
const predictionTypes: PredictionType[] = [
  PredictionType.BINARY,
  PredictionType.MULTIPLE,
  PredictionType.OVER_UNDER,
];

describe.each(predictionTypes)('PayoutRepository (unit) with prediction type %s', (predType) => {
  let repo: PayoutRepoType;
  const predictionId = 101;
  const winningOptionId = 5;

  // Base prediction returned after resolve
  const basePrediction: any = {
    id: predictionId,
    title: 'Test',
    description: 'Desc',
    category: 'Cat',
    expiresAt: new Date(),
    resolved: true,
    resolvedAt: new Date(),
    approved: true,
    type: predType,
    threshold: predType === PredictionType.BINARY ? null : 1,
    creatorId: 1,
    winningOptionId,
    options: [{ id: 1, label: 'Opt', odds: 2, predictionId, createdAt: new Date() }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    repo = new PayoutRepository();
  });

  it('returns updated prediction with options intact when no bets or parlays exist', async () => {
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([]);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mPrisma.$transaction).toHaveBeenCalled();
    expect(result).toBe(basePrediction);
    expect(result.options).toEqual(basePrediction.options);
  });

  it('handles a single winning bet', async () => {
    const bet = { id: 1, userId: 10, optionId: winningOptionId, potentialPayout: 50, amount: 20 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue({ id: 10, muskBucks: 100 });
    mTx.user.update.mockResolvedValue({ id: 10, muskBucks: 150 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 10,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.bet.update).toHaveBeenCalledWith({
      where: { id: bet.id },
      data: { status: 'WON', won: true, payout: bet.potentialPayout },
    });
    expect(mTx.user.update).toHaveBeenCalledWith({ where: { id: 10 }, data: { muskBucks: 150 } });
    expect(mTx.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ relatedBetId: bet.id, amount: bet.potentialPayout }),
      }),
    );
    expect(result).toBe(basePrediction);
  });

  it('skips credit if user missing on winning bet', async () => {
    const bet = { id: 2, userId: 20, optionId: winningOptionId, potentialPayout: 30, amount: 10 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue(null);
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 20,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.user.update).not.toHaveBeenCalled();
    expect(mTx.transaction.create).not.toHaveBeenCalled();
    expect(result).toBe(basePrediction);
  });

  it('handles a single losing bet', async () => {
    const bet = { id: 3, userId: 30, optionId: 0, potentialPayout: 0, amount: 25 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 30,
      currentStreak: 1,
      longestStreak: 1,
      profit: 10,
      totalWagered: 10,
      biggestWin: 10,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.bet.update).toHaveBeenCalledWith({
      where: { id: bet.id },
      data: { status: 'LOST', won: false, payout: undefined },
    });
    expect(result).toBe(basePrediction);
  });

  it('handles mixed bets across multiple users including all winners', async () => {
    const bets = [
      { id: 4, userId: 40, optionId: winningOptionId, potentialPayout: 100, amount: 40 },
      { id: 5, userId: 41, optionId: winningOptionId, potentialPayout: 80, amount: 20 },
    ];
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue(bets);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique
      .mockResolvedValueOnce({ id: 40, muskBucks: 200 })
      .mockResolvedValueOnce({ id: 41, muskBucks: 100 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 40,
      currentStreak: 1,
      longestStreak: 1,
      profit: 20,
      totalWagered: 20,
      biggestWin: 20,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 20, totalWagered: 40 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.bet.update).toHaveBeenCalledTimes(2);
    expect(mTx.transaction.create).toHaveBeenCalledTimes(2);
    expect(result).toBe(basePrediction);
  });

  it('processes parlays: wins and losses', async () => {
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([]);
    const pidWin = 100;
    const pidLoss = 200;

    mTx.parlayLeg.findMany
      .mockResolvedValueOnce([{ parlayId: pidWin }, { parlayId: pidLoss }])
      .mockResolvedValueOnce([
        {
          optionId: winningOptionId,
          option: { prediction: { resolved: true, winningOptionId } },
          parlay: { id: pidWin, userId: 30, potentialPayout: 80, user: { id: 30, muskBucks: 100 } },
        },
      ])
      .mockResolvedValueOnce([
        {
          optionId: 0,
          option: { prediction: { resolved: true, winningOptionId } },
          parlay: {
            id: pidLoss,
            userId: 40,
            potentialPayout: 90,
            user: { id: 40, muskBucks: 120 },
          },
        },
      ]);

    mTx.parlay.update.mockResolvedValue(undefined);
    mTx.user.update
      .mockResolvedValueOnce({ id: 30, muskBucks: 180 })
      .mockResolvedValueOnce(undefined);
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 30,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.parlay.update).toHaveBeenCalledWith({
      where: { id: pidWin },
      data: { status: 'WON' },
    });
    expect(mTx.parlay.update).toHaveBeenCalledWith({
      where: { id: pidLoss },
      data: { status: 'LOST' },
    });
    expect(mTx.user.update).toHaveBeenCalledWith({ where: { id: 30 }, data: { muskBucks: 180 } });
    expect(result).toBe(basePrediction);
  });

  it('calculates ROI correctly when stats row initially missing (divide by zero)', async () => {
    const bet = { id: 6, userId: 90, optionId: winningOptionId, potentialPayout: 0, amount: 0 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue({ id: 90, muskBucks: 0 });
    mTx.user.update.mockResolvedValue({ id: 90, muskBucks: 0 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue(null);
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 0 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.userStats.update).toHaveBeenCalled();
    const updateCall = mTx.userStats.update.mock.calls[0][0];
    expect(updateCall.where).toEqual({ userId: 90 });
    expect(Number.isNaN(updateCall.data.roi)).toBe(true);
  });

  it('handles large numeric balances without overflow', async () => {
    const largeBalance = Number.MAX_SAFE_INTEGER / 2;
    const bet = {
      id: 7,
      userId: 91,
      optionId: winningOptionId,
      potentialPayout: largeBalance,
      amount: 1,
    };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue({ id: 91, muskBucks: largeBalance });
    mTx.user.update.mockResolvedValue({ id: 91, muskBucks: largeBalance * 2 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 91,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.user.update).toHaveBeenCalledWith({
      where: { id: 91 },
      data: { muskBucks: largeBalance * 2 },
    });
    expect(result).toBe(basePrediction);
  });

  it('handles fractional payouts without rounding (repo preserves raw payout)', async () => {
    const bet = { id: 8, userId: 92, optionId: winningOptionId, potentialPayout: 12.7, amount: 5 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue({ id: 92, muskBucks: 0 });
    mTx.user.update.mockResolvedValue({ id: 92, muskBucks: 12.7 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 92,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.user.update).toHaveBeenCalledWith({ where: { id: 92 }, data: { muskBucks: 12.7 } });
    expect(result).toBe(basePrediction);
  });

  it('handles negative wager edge case', async () => {
    const bet = { id: 9, userId: 93, optionId: winningOptionId, potentialPayout: -10, amount: -5 };
    mTx.prediction.update.mockResolvedValue(basePrediction);
    mTx.bet.findMany.mockResolvedValue([bet]);
    mTx.bet.update.mockResolvedValue(undefined);
    mTx.user.findUnique.mockResolvedValue({ id: 93, muskBucks: 100 });
    mTx.user.update.mockResolvedValue({ id: 93, muskBucks: 90 });
    mTx.transaction.create.mockResolvedValue(undefined);
    mTx.userStats.findUnique.mockResolvedValue({
      userId: 93,
      currentStreak: 0,
      longestStreak: 0,
      profit: 0,
      totalWagered: 0,
      biggestWin: 0,
    });
    mTx.userStats.upsert.mockResolvedValue({ profit: 0, totalWagered: 1 });
    mTx.userStats.update.mockResolvedValue(undefined);
    mTx.parlayLeg.findMany.mockResolvedValue([]);

    const result: any = await repo.resolvePrediction(predictionId, winningOptionId);
    expect(mTx.user.update).toHaveBeenCalledWith({ where: { id: 93 }, data: { muskBucks: 90 } });
    expect(result).toBe(basePrediction);
  });
});
