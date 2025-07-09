// apps/server/tests/services/betting.service.test.ts
import { BettingService } from '../../../src/services/betting.service';
import type { IBettingRepository } from '../../../src/repositories/IBettingRepository';
import type { DbBet, DbParlay } from '@ems/types';

describe('BettingService', () => {
  let service: BettingService;
  let mockRepo: IBettingRepository;

  beforeEach(() => {
    mockRepo = {
      findOptionWithPrediction: jest.fn(),
      findUserById: jest.fn(),
      placeBet: jest.fn(),
      placeParlay: jest.fn(),
      recalculateOdds: jest.fn(),
    };
    service = new BettingService(mockRepo);
  });

  describe('placeBet', () => {
    it('throws when option is not found', async () => {
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(null);
      await expect(service.placeBet(1, 2, 10)).rejects.toThrow('OPTION_NOT_FOUND');
    });

    it('throws when prediction is closed (resolved)', async () => {
      const option = {
        id: 2,
        odds: 2,
        prediction: {
          id: 20,
          resolved: true,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(option);
      await expect(service.placeBet(1, 2, 5)).rejects.toThrow('PREDICTION_CLOSED');
    });

    it('throws when prediction is closed (expired)', async () => {
      const option = {
        id: 3,
        odds: 2,
        prediction: {
          id: 30,
          resolved: false,
          expiresAt: new Date(Date.now() - 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(option);
      await expect(service.placeBet(1, 3, 5)).rejects.toThrow('PREDICTION_CLOSED');
    });

    it('throws when user has insufficient funds', async () => {
      const option = {
        id: 4,
        odds: 1.5,
        prediction: {
          id: 40,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(option);
      (mockRepo.findUserById as jest.Mock).mockResolvedValue({ id: 1, muskBucks: 2 });
      await expect(service.placeBet(1, 4, 5)).rejects.toThrow('INSUFFICIENT_FUNDS');
    });

    it('places bet successfully', async () => {
      const option = {
        id: 5,
        odds: 2.5,
        prediction: {
          id: 50,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      const user = { id: 1, muskBucks: 100 };
      const amount = 10;
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(option);
      (mockRepo.findUserById as jest.Mock).mockResolvedValue(user);

      const mockBet: DbBet = {
        id: 101,
        userId: user.id,
        predictionId: option.prediction.id,
        optionId: option.id,
        amount,
        oddsAtPlacement: option.odds,
        potentialPayout: Math.floor(amount * option.odds),
        status: 'PENDING',
        won: null,
        payout: null,
        createdAt: new Date(),
      };
      (mockRepo.placeBet as jest.Mock).mockResolvedValue(mockBet);

      const result = await service.placeBet(user.id, option.id, amount);
      expect(mockRepo.placeBet).toHaveBeenCalledWith(
        user.id,
        option.prediction.id,
        option.id,
        amount,
        option.odds,
        Math.floor(amount * option.odds),
      );
      expect(result).toBe(mockBet);
    });
  });

  describe('placeParlay', () => {
    it('throws when an option is not found', async () => {
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValueOnce({} as any);
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValueOnce(null);
      await expect(service.placeParlay(1, [{ optionId: 1 }, { optionId: 2 }], 10)).rejects.toThrow(
        'OPTION_NOT_FOUND',
      );
    });

    it('throws when any prediction in legs is closed', async () => {
      const openOption = {
        id: 6,
        odds: 2,
        prediction: {
          id: 60,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      const closedOption = {
        id: 7,
        odds: 3,
        prediction: {
          id: 70,
          resolved: true,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock)
        .mockResolvedValueOnce(openOption)
        .mockResolvedValueOnce(closedOption);

      await expect(service.placeParlay(1, [{ optionId: 6 }, { optionId: 7 }], 5)).rejects.toThrow(
        `PREDICTION_${closedOption.prediction.id}_CLOSED`,
      );
    });

    it('throws when user has insufficient funds', async () => {
      const option = {
        id: 8,
        odds: 1.5,
        prediction: {
          id: 80,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock).mockResolvedValue(option);
      (mockRepo.findUserById as jest.Mock).mockResolvedValue({ id: 1, muskBucks: 4 });

      await expect(service.placeParlay(1, [{ optionId: 8 }], 10)).rejects.toThrow(
        'INSUFFICIENT_FUNDS',
      );
    });

    it('places parlay successfully', async () => {
      const legs = [{ optionId: 9 }, { optionId: 10 }];
      const option1 = {
        id: 9,
        odds: 2,
        prediction: {
          id: 90,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      const option2 = {
        id: 10,
        odds: 3,
        prediction: {
          id: 100,
          resolved: false,
          expiresAt: new Date(Date.now() + 10000),
        },
      };
      (mockRepo.findOptionWithPrediction as jest.Mock)
        .mockResolvedValueOnce(option1)
        .mockResolvedValueOnce(option2);
      (mockRepo.findUserById as jest.Mock).mockResolvedValue({ id: 2, muskBucks: 50 });

      const amount = 10;
      const combinedOdds = option1.odds * option2.odds;
      const potentialPayout = Math.floor(amount * combinedOdds);
      const mockParlay: DbParlay = {
        id: 202,
        userId: 2,
        amount,
        potentialPayout,
        createdAt: new Date(),
        legs: [
          {
            parlayId: 202,
            predictionId: option1.prediction.id,
            optionId: option1.id,
            oddsAtPlacement: option1.odds,
          },
          {
            parlayId: 202,
            predictionId: option2.prediction.id,
            optionId: option2.id,
            oddsAtPlacement: option2.odds,
          },
        ],
      } as any;
      (mockRepo.placeParlay as jest.Mock).mockResolvedValue(mockParlay);

      const result = await service.placeParlay(2, legs, amount);
      expect(mockRepo.placeParlay).toHaveBeenCalledWith(
        2,
        [
          {
            predictionId: option1.prediction.id,
            optionId: option1.id,
            oddsAtPlacement: option1.odds,
          },
          {
            predictionId: option2.prediction.id,
            optionId: option2.id,
            oddsAtPlacement: option2.odds,
          },
        ],
        amount,
        potentialPayout,
      );
      expect(result).toBe(mockParlay);
    });
  });

  describe('recalculateOdds', () => {
    it('delegates to repository', async () => {
      await service.recalculateOdds(123);
      expect(mockRepo.recalculateOdds).toHaveBeenCalledWith(123);
    });
  });
});
