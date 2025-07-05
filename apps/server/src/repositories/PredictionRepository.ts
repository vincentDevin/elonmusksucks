// apps/server/src/repositories/PredictionRepository.ts
import prisma from '../db';
import type { IPredictionRepository } from './IPredictionRepository';
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  DbLeaderboardEntry,
} from '@ems/types';
import type { PredictionType } from '@ems/types';

// Shape for a parlay leg, including the timestamp it was created
export type ParlayLegWithUser = {
  parlayId: number;
  user: Pick<DbUser, 'id' | 'name'>;
  stake: number;
  optionId: number;
  createdAt: Date;
};

export class PredictionRepository implements IPredictionRepository {
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
    }
  > {
    return prisma.prediction.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category,
        expiresAt: data.expiresAt,
        creatorId: data.creatorId,
        type: data.type,
        threshold: data.threshold,
        options: {
          create: data.options.map((o) => ({
            label: o.label,
            odds: 1.0,
          })),
        },
      },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            odds: true,
            predictionId: true,
            createdAt: true,
          },
        },
        bets: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
  }

  async listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      }
    >
  > {
    const preds = await prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          include: {
            parlayLegs: {
              include: { parlay: { include: { user: true } } },
            },
          },
        },
        bets: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    return preds.map((pred) => {
      const { bets, options, ...rest } = pred;
      const parlayLegs: ParlayLegWithUser[] = [];
      for (const opt of options) {
        for (const leg of opt.parlayLegs) {
          parlayLegs.push({
            parlayId: leg.parlay.id,
            user: { id: leg.parlay.user.id, name: leg.parlay.user.name },
            stake: leg.parlay.amount,
            optionId: opt.id,
            createdAt: leg.createdAt,
          });
        }
      }

      return {
        ...rest,
        bets,
        options,
        parlayLegs,
      };
    });
  }

  async findPredictionById(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      })
    | null
  > {
    const pred = await prisma.prediction.findUnique({
      where: { id },
      include: {
        options: {
          include: {
            parlayLegs: {
              include: { parlay: { include: { user: true } } },
            },
          },
        },
        bets: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!pred) return null;

    const { bets, options, ...rest } = pred;
    const parlayLegs: ParlayLegWithUser[] = [];
    for (const opt of options) {
      for (const leg of opt.parlayLegs) {
        parlayLegs.push({
          parlayId: leg.parlay.id,
          user: { id: leg.parlay.user.id, name: leg.parlay.user.name },
          stake: leg.parlay.amount,
          optionId: opt.id,
          createdAt: leg.createdAt,
        });
      }
    }

    return {
      ...rest,
      bets,
      options,
      parlayLegs,
    };
  }

  async getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]> {
    return prisma.user.findMany({
      orderBy: { muskBucks: 'desc' },
      take: limit,
      select: { id: true, name: true, muskBucks: true },
    });
  }
}
