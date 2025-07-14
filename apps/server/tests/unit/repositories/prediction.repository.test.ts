// apps/server/tests/repositories/prediction.repository.test.ts
jest.mock('../../../src/db', () => ({
  __esModule: true,
  default: {
    prediction: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  },
}));

import prisma from '../../../src/db';
import {
  PredictionRepository,
  ParlayLegWithUser,
} from '../../../src/repositories/PredictionRepository';
import type { DbPrediction, DbPredictionOption, DbBet, DbUser } from '@ems/types';
import { PredictionType } from '@ems/types';

describe('PredictionRepository (unit)', () => {
  let repo: PredictionRepository;

  beforeEach(() => {
    repo = new PredictionRepository();
    jest.clearAllMocks();
  });

  describe('createPrediction', () => {
    it('calls prisma.prediction.create with correct args and returns its result', async () => {
      const input = {
        title: 'Test Title',
        description: 'Test Description',
        category: 'TestCat',
        expiresAt: new Date('2025-01-01'),
        creatorId: 1,
        options: [{ label: 'Yes' }, { label: 'No' }],
        type: PredictionType.BINARY,
        threshold: 42,
      };
      const expected = { foo: 'bar' };
      (prisma.prediction.create as jest.Mock).mockResolvedValue(expected);

      const result = await repo.createPrediction(input);

      expect(prisma.prediction.create).toHaveBeenCalledWith({
        data: {
          title: input.title,
          description: input.description,
          category: input.category,
          expiresAt: input.expiresAt,
          creatorId: input.creatorId,
          type: input.type,
          threshold: input.threshold,
          options: {
            create: [
              { label: 'Yes', odds: 1.0 },
              { label: 'No', odds: 1.0 },
            ],
          },
        },
        include: {
          options: {
            select: { id: true, label: true, odds: true, predictionId: true, createdAt: true },
          },
          bets: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      expect(result).toBe(expected);
    });
  });

  describe('listAllPredictions', () => {
    it('flattens nested parlay legs and returns full predictions list', async () => {
      const dbUser = { id: 1, name: 'Alice' } as DbUser;
      const rawPred: DbPrediction & {
        options: Array<
          DbPredictionOption & {
            parlayLegs: Array<{
              createdAt: Date;
              parlay: { id: number; amount: number; user: DbUser };
            }>;
          }
        >;
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      } = {
        id: 1,
        title: 'T',
        description: 'D',
        category: 'C',
        type: PredictionType.BINARY,
        threshold: null,
        expiresAt: new Date('2025-01-01'),
        resolved: false,
        resolvedAt: null,
        approved: true,
        winningOptionId: null,
        creatorId: 1,
        createdAt: new Date('2024-01-01'),
        options: [
          {
            id: 10,
            label: 'Opt',
            odds: 2.0,
            predictionId: 1,
            createdAt: new Date('2024-01-01'),
            parlayLegs: [
              { createdAt: new Date('2024-01-02'), parlay: { id: 100, amount: 5, user: dbUser } },
            ],
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
            user: { id: 1, name: 'Alice' },
          },
        ],
      };
      (prisma.prediction.findMany as jest.Mock).mockResolvedValue([rawPred]);

      const result = await repo.listAllPredictions();

      expect(prisma.prediction.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
        include: {
          options: {
            include: { parlayLegs: { include: { parlay: { include: { user: true } } } } },
          },
          bets: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      expect(result).toHaveLength(1);

      const mapped = result[0];
      expect(mapped.options).toEqual(rawPred.options);
      expect(mapped.bets).toEqual(rawPred.bets);
      expect(mapped.parlayLegs).toEqual<ParlayLegWithUser[]>([
        {
          parlayId: 100,
          user: { id: 1, name: 'Alice' },
          stake: 5,
          optionId: 10,
          createdAt: new Date('2024-01-02'),
        },
      ]);
    });
  });

  describe('findPredictionById', () => {
    it('returns null when no prediction is found', async () => {
      (prisma.prediction.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await repo.findPredictionById(999);

      expect(prisma.prediction.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: {
          options: {
            include: { parlayLegs: { include: { parlay: { include: { user: true } } } } },
          },
          bets: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      expect(result).toBeNull();
    });

    it('maps a found prediction the same way as listAllPredictions', async () => {
      const dbUser = { id: 1, name: 'Alice' } as DbUser;
      const rawPred: DbPrediction & {
        options: Array<
          DbPredictionOption & {
            parlayLegs: Array<{
              createdAt: Date;
              parlay: { id: number; amount: number; user: DbUser };
            }>;
          }
        >;
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      } = {
        id: 2,
        title: 'X',
        description: 'Y',
        category: 'Z',
        type: PredictionType.MULTIPLE,
        threshold: 5,
        expiresAt: new Date('2025-06-01'),
        resolved: false,
        resolvedAt: null,
        approved: false,
        winningOptionId: null,
        creatorId: 2,
        createdAt: new Date('2024-02-01'),
        options: [
          {
            id: 11,
            label: 'Opt2',
            odds: 1.5,
            predictionId: 2,
            createdAt: new Date('2024-02-01'),
            parlayLegs: [
              { createdAt: new Date('2024-02-02'), parlay: { id: 200, amount: 10, user: dbUser } },
            ],
          },
        ],
        bets: [
          {
            id: 21,
            userId: 1,
            predictionId: 2,
            amount: 10,
            oddsAtPlacement: 1.5,
            potentialPayout: 15,
            status: 'PENDING',
            optionId: 11,
            won: null,
            payout: null,
            createdAt: new Date(),
            user: { id: 1, name: 'Alice' },
          },
        ],
      };
      (prisma.prediction.findUnique as jest.Mock).mockResolvedValue(rawPred);

      const result = await repo.findPredictionById(2);

      expect(prisma.prediction.findUnique).toHaveBeenCalledWith({
        where: { id: 2 },
        include: {
          options: {
            include: { parlayLegs: { include: { parlay: { include: { user: true } } } } },
          },
          bets: { include: { user: { select: { id: true, name: true } } } },
        },
      });
      expect(result).not.toBeNull();
      if (result) {
        expect(result.options).toEqual(rawPred.options);
        expect(result.bets).toEqual(rawPred.bets);
        expect(result.parlayLegs).toEqual<ParlayLegWithUser[]>([
          {
            parlayId: 200,
            user: { id: 1, name: 'Alice' },
            stake: 10,
            optionId: 11,
            createdAt: new Date('2024-02-02'),
          },
        ]);
      }
    });
  });
});
