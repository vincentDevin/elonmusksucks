// apps/server/tests/repositories/betting.repository.test.ts

import type { BettingRepository as BettingRepoType } from '../../../src/repositories/BettingRepository';

// Mock transaction context used inside $transaction
const mTx = {
  user: { update: jest.fn() },
  transaction: { create: jest.fn() },
  bet: { create: jest.fn(), groupBy: jest.fn() },
  predictionOption: { update: jest.fn() },
  userStats: { upsert: jest.fn() },
  parlay: { create: jest.fn() },
};

// Mock PrismaClient instance
const mPrisma = {
  predictionOption: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  bet: {
    groupBy: jest.fn(),
  },
  $transaction: jest.fn((fn: (tx: typeof mTx) => any) => fn(mTx)),
};

// Use doMock so the factory runs after mPrisma is defined
jest.doMock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mPrisma),
}));

describe('BettingRepository (unit)', () => {
  let repo: BettingRepoType;

  beforeEach(() => {
    jest.clearAllMocks();
    // Re-require a fresh instance to pick up the mock
    const { BettingRepository: Repo } = require('../../../src/repositories/BettingRepository');
    repo = new Repo();
  });

  describe('findOptionWithPrediction', () => {
    it('queries predictionOption.findUnique with include', async () => {
      const mockOpt = {
        id: 1,
        odds: 2.5,
        prediction: { id: 10, resolved: false, expiresAt: new Date() },
      };
      mPrisma.predictionOption.findUnique.mockResolvedValue(mockOpt);

      const result = await repo.findOptionWithPrediction(42);

      expect(mPrisma.predictionOption.findUnique).toHaveBeenCalledWith({
        where: { id: 42 },
        include: { prediction: { select: { id: true, resolved: true, expiresAt: true } } },
      });
      expect(result).toBe(mockOpt);
    });
  });

  describe('findUserById', () => {
    it('queries user.findUnique with select', async () => {
      const mockUser = { id: 5, muskBucks: 100 };
      mPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await repo.findUserById(5);

      expect(mPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 5 },
        select: { id: true, muskBucks: true },
      });
      expect(result).toBe(mockUser);
    });
  });

  describe('placeBet', () => {
    it('runs full transaction and returns created bet', async () => {
      const userId = 1;
      const predictionId = 10;
      const optionId = 2;
      const amount = 15;
      const oddsAtPlacement = 2;
      const potentialPayout = Math.floor(amount * oddsAtPlacement);

      mTx.user.update.mockResolvedValue({ id: userId, muskBucks: 85 });
      mTx.transaction.create.mockResolvedValue(undefined);
      const mockBet = {
        id: 100,
        userId,
        predictionId,
        optionId,
        amount,
        oddsAtPlacement,
        potentialPayout,
        status: 'PENDING',
        won: null,
        payout: null,
        createdAt: new Date(),
      } as any;
      mTx.bet.create.mockResolvedValue(mockBet);
      mTx.bet.groupBy.mockResolvedValue([{ optionId, _sum: { amount } }]);
      mTx.predictionOption.update.mockResolvedValue(undefined);
      mTx.userStats.upsert.mockResolvedValue(undefined);

      const result = await repo.placeBet(
        userId,
        predictionId,
        optionId,
        amount,
        oddsAtPlacement,
        potentialPayout,
      );

      expect(mPrisma.$transaction).toHaveBeenCalled();
      expect(mTx.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });
      expect(mTx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceAfter: 85,
          relatedBetId: null,
          relatedParlayId: null,
        },
      });
      expect(mTx.bet.create).toHaveBeenCalledWith({
        data: { userId, predictionId, optionId, amount, oddsAtPlacement, potentialPayout },
      });
      expect(mTx.bet.groupBy).toHaveBeenCalledWith({
        by: ['optionId'],
        where: { predictionId },
        _sum: { amount: true },
      });
      expect(mTx.predictionOption.update).toHaveBeenCalledWith({
        where: { id: optionId },
        data: { odds: 1 },
      });
      expect(mTx.userStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(result).toBe(mockBet);
    });
  });

  describe('placeParlay', () => {
    it('runs full transaction and returns created parlay', async () => {
      const userId = 2;
      const amount = 20;
      const legs = [
        { predictionId: 5, optionId: 50, oddsAtPlacement: 2 },
        { predictionId: 6, optionId: 60, oddsAtPlacement: 3 },
      ];
      const potentialPayout = Math.floor(amount * 2 * 3);

      mTx.user.update.mockResolvedValue({ id: userId, muskBucks: 80 });
      mTx.transaction.create.mockResolvedValue(undefined);
      const mockParlay = {
        id: 200,
        userId,
        amount,
        potentialPayout,
        legs: [],
        createdAt: new Date(),
      } as any;
      mTx.parlay.create.mockResolvedValue(mockParlay);
      mTx.userStats.upsert.mockResolvedValue(undefined);

      const result = await repo.placeParlay(userId, legs, amount, potentialPayout);

      expect(mPrisma.$transaction).toHaveBeenCalled();
      expect(mTx.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { muskBucks: { decrement: amount } },
      });
      expect(mTx.transaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          type: 'DEBIT',
          amount,
          balanceAfter: 80,
          relatedBetId: null,
          relatedParlayId: null,
        },
      });
      expect(mTx.parlay.create).toHaveBeenCalledWith({
        data: {
          userId,
          amount,
          combinedOdds: 6,
          potentialPayout,
          legs: {
            create: [
              { optionId: 50, oddsAtPlacement: 2 },
              { optionId: 60, oddsAtPlacement: 3 },
            ],
          },
        },
      });
      expect(mTx.userStats.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(result).toBe(mockParlay);
    });
  });

  describe('recalculateOdds', () => {
    it('groups by bets and updates option odds', async () => {
      const predictionId = 99;
      mPrisma.bet.groupBy.mockResolvedValue([{ optionId: 7, _sum: { amount: 30 } }]);
      mPrisma.predictionOption.update.mockResolvedValue(undefined);

      await repo.recalculateOdds(predictionId);

      expect(mPrisma.bet.groupBy).toHaveBeenCalledWith({
        by: ['optionId'],
        where: { predictionId },
        _sum: { amount: true },
      });
      expect(mPrisma.predictionOption.update).toHaveBeenCalledWith({
        where: { id: 7 },
        data: { odds: 1 },
      });
    });
  });
});
