import type { IMarketRepository } from '../repositories/interfaces/IMarketRepository';
import { MarketRepository } from '../repositories/MarketRepository';

const repo: IMarketRepository = new MarketRepository();

export async function getMarketOverviewStats() {
  const [totalVolume, activeMarkets, totalUsers] = await Promise.all([
    repo.getTotalVolume(),
    repo.getActiveMarketsCount(),
    repo.getTotalUsersCount(),
  ]);

  return {
    totalVolume: Number(totalVolume),
    activeMarkets,
    totalUsers,
    volumeChange: Math.random() * 20 - 10, // TODO: Calculate real change
    trending: [
      { category: 'Sports', icon: '⚽', growth: 23.5 },
      { category: 'Politics', icon: '🗳️', growth: 18.2 },
      { category: 'Tech', icon: '💻', growth: 15.7 },
      { category: 'Entertainment', icon: '🎭', growth: 12.1 },
    ],
  };
}

export async function getTrendingPredictions(limit: number) {
  const trending = await repo.getTrendingPredictions(limit);

  return trending.map((prediction) => ({
    id: prediction.id,
    title: prediction.title,
    category: prediction.category,
    volume: Math.floor(Math.random() * 10000) + 1000, // TODO: Calculate real volume
    betCount: prediction.betCount,
    expiresAt: prediction.expiresAt.toISOString(),
  }));
}

export function getMarketHealth() {
  // This method has no DB operations, just returns calculated health metrics
  return null; // Signal controller to use existing implementation
}
