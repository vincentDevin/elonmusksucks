// apps/server/src/repositories/PredictionRepository.ts
import prisma from '../db';
import type { IPredictionRepository } from './IPredictionRepository';
import type { DbPrediction, DbLeaderboardEntry } from '@ems/types';

export class PredictionRepository implements IPredictionRepository {
  /** List all predictions */
  async listAllPredictions(): Promise<DbPrediction[]> {
    return prisma.prediction.findMany({
      orderBy: { createdAt: 'desc' },
    }) as Promise<DbPrediction[]>;
  }

  /** Create a new prediction */
  async createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
  }): Promise<DbPrediction> {
    return prisma.prediction.create({ data }) as Promise<DbPrediction>;
  }

  /** Find a prediction by ID */
  async findPredictionById(id: number): Promise<DbPrediction | null> {
    return prisma.prediction.findUnique({ where: { id } }) as Promise<DbPrediction | null>;
  }

  /** Get leaderboard of top users */
  async getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]> {
    return prisma.user.findMany({
      orderBy: { muskBucks: 'desc' },
      take: limit,
      select: { id: true, name: true, muskBucks: true },
    }) as Promise<DbLeaderboardEntry[]>;
  }
}
