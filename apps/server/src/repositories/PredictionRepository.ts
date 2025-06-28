// apps/server/src/repositories/PredictionRepository.ts
import prisma from '../db';
import type { IPredictionRepository } from './IPredictionRepository';
import type { 
  DbPrediction, 
  DbBet, 
  DbUser, 
  DbLeaderboardEntry 
} from '@ems/types';

export class PredictionRepository implements IPredictionRepository {
  /** List all predictions */
  async listAllPredictions(): Promise<
    Array<DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> }>
  > {
    return prisma.prediction.findMany({
      include: {
        bets: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }) as any;
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
  async findPredictionById(id: number): Promise<
    (DbPrediction & { bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }> })
    | null
  > {
    return prisma.prediction.findUnique({
      where: { id },
      include: {
        bets: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    }) as any;
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
