import { PredictionService, ParlayLegWithUser } from '../../../src/services/predictions.service';
import type { DbPrediction, DbPredictionOption } from '@ems/types';
import type { IPredictionRepository } from '../../../src/repositories/IPredictionRepository';
import { PredictionType } from '@prisma/client';

describe('PredictionService', () => {
  let service: PredictionService;
  let mockRepo: IPredictionRepository;

  beforeEach(() => {
    // Prepare mock repository
    mockRepo = {
      listAllPredictions: jest.fn(),
      createPrediction: jest.fn(),
      findPredictionById: jest.fn(),
    };
    service = new PredictionService(mockRepo);
  });

  describe('listAllPredictions', () => {
    it('sanitizes raw predictions correctly', async () => {
      const raw: Array<DbPrediction & { options: any[]; bets: any[]; parlayLegs: any[] }> = [
        {
          id: 1,
          title: 'T',
          description: 'D',
          category: 'C',
          type: PredictionType.BINARY,
          threshold: null,
          expiresAt: new Date('2025-01-01'),
          resolved: false,
          approved: true,
          resolvedAt: null,
          winningOptionId: null,
          createdAt: new Date('2024-01-01'),
          creatorId: 1,
          options: [
            {
              id: 10,
              label: 'Opt',
              odds: 2.0,
              predictionId: 1,
              createdAt: new Date('2024-01-01'),
              extra: 'x',
            },
          ],
          bets: [
            {
              id: 20,
              userId: 1,
              predictionId: 1,
              amount: 5,
              oddsAtPlacement: 2.0,
              potentialPayout: 10,
              status: 'PENDING',
              optionId: 10,
              won: null,
              payout: null,
              createdAt: new Date(),
              user: { id: 1, name: 'Alice', passwordHash: 'h' },
            },
          ],
          parlayLegs: [
            {
              parlayId: 100,
              user: { id: 1, name: 'Alice', role: 'USER' },
              stake: 5,
              optionId: 10,
              createdAt: new Date(),
            },
          ],
        },
      ];
      (mockRepo.listAllPredictions as jest.Mock).mockResolvedValue(raw);

      const out = await service.listAllPredictions();
      expect(mockRepo.listAllPredictions).toHaveBeenCalled();
      expect(out[0].options).toEqual([
        { id: 10, label: 'Opt', odds: 2.0, predictionId: 1, createdAt: new Date('2024-01-01') },
      ]);
      expect(out[0].bets[0].user).toEqual({ id: 1, name: 'Alice' });
      expect(out[0].parlayLegs[0]).toEqual({
        parlayId: 100,
        user: { id: 1, name: 'Alice' },
        stake: 5,
        optionId: 10,
        createdAt: out[0].parlayLegs[0].createdAt,
      } as ParlayLegWithUser);
    });
  });

  describe('createPrediction', () => {
    it('returns newly created prediction with empty bets and parlayLegs', async () => {
      const params = {
        title: 'X',
        description: 'D',
        category: 'C',
        expiresAt: new Date(),
        creatorId: 2,
        options: [{ label: 'L' }],
        type: PredictionType.MULTIPLE,
        threshold: 1,
      };
      const created: DbPrediction & { options: DbPredictionOption[]; bets: any; parlayLegs: any } =
        {
          id: 2,
          title: 'X',
          description: 'D',
          category: 'C',
          type: PredictionType.MULTIPLE,
          threshold: 1,
          expiresAt: params.expiresAt,
          resolved: false,
          approved: false,
          resolvedAt: null,
          winningOptionId: null,
          createdAt: new Date(),
          creatorId: 2,
          options: [{ id: 11, label: 'L', odds: 1.0, predictionId: 2, createdAt: new Date() }],
          bets: [],
          parlayLegs: [],
        };
      (mockRepo.createPrediction as jest.Mock).mockResolvedValue(created);

      const result = await service.createPrediction(params);
      expect(mockRepo.createPrediction).toHaveBeenCalledWith(params);
      expect(result.bets).toEqual([]);
      expect(result.parlayLegs).toEqual([]);
      expect(result.id).toBe(2);
    });
  });

  describe('getPrediction', () => {
    it('returns null when not found', async () => {
      (mockRepo.findPredictionById as jest.Mock).mockResolvedValue(null);
      const res = await service.getPrediction(999);
      expect(res).toBeNull();
    });

    it('sanitizes single prediction', async () => {
      const raw: DbPrediction & { options: any[]; bets: any[]; parlayLegs: any[] } = {
        id: 3,
        title: 'Y',
        description: 'D',
        category: 'C',
        type: PredictionType.OVER_UNDER,
        threshold: 5,
        expiresAt: new Date(),
        resolved: false,
        approved: true,
        resolvedAt: null,
        winningOptionId: null,
        createdAt: new Date(),
        creatorId: 3,
        options: [
          { id: 12, label: 'O', odds: 1.2, predictionId: 3, createdAt: new Date(), extra: 'x' },
        ],
        bets: [
          {
            id: 30,
            userId: 3,
            predictionId: 3,
            amount: 10,
            oddsAtPlacement: 1.2,
            potentialPayout: 12,
            status: 'PENDING',
            optionId: 12,
            won: null,
            payout: null,
            createdAt: new Date(),
            user: { id: 3, name: 'Bob' },
          },
        ],
        parlayLegs: [
          {
            parlayId: 200,
            user: { id: 3, name: 'Bob' },
            stake: 10,
            optionId: 12,
            createdAt: new Date(),
          },
        ],
      };
      (mockRepo.findPredictionById as jest.Mock).mockResolvedValue(raw);

      const p = await service.getPrediction(3);
      expect(mockRepo.findPredictionById).toHaveBeenCalledWith(3);
      expect(p).not.toBeNull();
      if (p) {
        expect(p.options[0]).toEqual({
          id: 12,
          label: 'O',
          odds: 1.2,
          predictionId: 3,
          createdAt: p.options[0].createdAt,
        });
        expect(p.bets[0].user).toEqual({ id: 3, name: 'Bob' });
        expect(p.parlayLegs[0]).toEqual({
          parlayId: 200,
          user: { id: 3, name: 'Bob' },
          stake: 10,
          optionId: 12,
          createdAt: p.parlayLegs[0].createdAt,
        } as ParlayLegWithUser);
      }
    });
  });
});
