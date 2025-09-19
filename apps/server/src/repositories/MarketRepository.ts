import prisma from '../db';
import type { IMarketRepository } from './interfaces/IMarketRepository';

export class MarketRepository implements IMarketRepository {
  async getTotalVolume(): Promise<bigint> {
    const result = await prisma.$queryRaw<[{ total: bigint }]>`
      SELECT COALESCE(
        (SELECT SUM(amount) FROM "Bet") + 
        (SELECT SUM(amount) FROM "Parlay"), 
        0
      ) as total
    `;
    return result[0]?.total || BigInt(0);
  }

  async getActiveMarketsCount(): Promise<number> {
    return prisma.prediction.count({
      where: {
        resolved: false,
        approved: true,
        expiresAt: { gt: new Date() },
      },
    });
  }

  async getTotalUsersCount(): Promise<number> {
    return prisma.user.count();
  }

  async getTrendingPredictions(limit: number): Promise<
    Array<{
      id: number;
      title: string;
      category: string;
      betCount: number;
      expiresAt: Date;
    }>
  > {
    const trending = await prisma.prediction.findMany({
      where: {
        resolved: false,
        approved: true,
        expiresAt: { gt: new Date() },
      },
      include: { _count: { select: { bets: true } } },
      orderBy: { bets: { _count: 'desc' } },
      take: limit,
    });

    return trending.map((p) => ({
      id: p.id,
      title: p.title,
      category: p.category,
      betCount: p._count.bets,
      expiresAt: p.expiresAt,
    }));
  }
}
