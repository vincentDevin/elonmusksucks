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

export class PredictionRepository implements IPredictionRepository {
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    options: Array<{ label: string }>;
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
      }
    >
  > {
    return prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            odds: true,
            predictionId: true,
            createdAt: true,
            parlayLegs: {
              include: {
                parlay: {
                  select: {
                    id: true,
                    user: { select: { id: true, name: true } },
                    amount: true,
                    combinedOdds: true,
                    createdAt: true,
                  },
                },
              },
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
  }

  async findPredictionById(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      })
    | null
  > {
    return prisma.prediction.findUnique({
      where: { id },
      include: {
        options: {
          select: {
            id: true,
            label: true,
            odds: true,
            predictionId: true,
            createdAt: true,
            parlayLegs: {
              include: {
                parlay: {
                  select: {
                    id: true,
                    user: { select: { id: true, name: true } },
                    amount: true,
                    combinedOdds: true,
                    createdAt: true,
                  },
                },
              },
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
  }

  /** Get leaderboard of top users */
  async getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]> {
    return prisma.user.findMany({
      orderBy: { muskBucks: 'desc' },
      take: limit,
      select: { id: true, name: true, muskBucks: true },
    });
  }
}
