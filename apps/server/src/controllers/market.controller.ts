import type { RequestHandler } from 'express';
import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';

const prisma = new PrismaClient();

export const getMarketOverview: RequestHandler = async (_req, res, _next) => {
  try {
    const cacheKey = 'market:overview:stats';
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      res.json({ cached: true, ...JSON.parse(cached) });
      return;
    }

    // Get current statistics
    const [totalVolumeResult, activeMarkets, totalUsers] = await Promise.all([
      // Total volume from all bets and parlays
      prisma.$queryRaw<[{ total: bigint }]>`
        SELECT COALESCE(
          (SELECT SUM(amount) FROM "Bet") + 
          (SELECT SUM(amount) FROM "Parlay"), 
          0
        ) as total
      `,

      // Active (unresolved) predictions
      prisma.prediction.count({
        where: {
          resolved: false,
          approved: true,
          expiresAt: { gt: new Date() },
        },
      }),

      // Total registered users
      prisma.user.count(),
    ]);

    const totalVolume = Number(totalVolumeResult[0]?.total || 0);

    const stats = {
      totalVolume,
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

    // Cache for 30 seconds
    await redisClient.setex(cacheKey, 30, JSON.stringify(stats));

    res.json({ cached: false, ...stats });
  } catch (error) {
    console.error('Error fetching market overview:', error);
    res.status(500).json({
      error: 'Failed to fetch market statistics',
      cached: false,
      totalVolume: 0,
      activeMarkets: 0,
      totalUsers: 0,
      volumeChange: 0,
      trending: [],
    });
  }
};

export const getMarketHealth: RequestHandler = async (_req, res) => {
  try {
    const health = {
      liquidity: Math.floor(Math.random() * 40) + 60,
      activity: Math.floor(Math.random() * 30) + 70,
      volatility: Math.floor(Math.random() * 50) + 30,
      satisfaction: Math.floor(Math.random() * 20) + 80,
      metrics: {
        recentActivity: Math.floor(Math.random() * 20) + 5,
        avgBetSize: Math.floor(Math.random() * 500) + 100,
        uniqueBettors: Math.floor(Math.random() * 100) + 50,
        activeCategories: Math.floor(Math.random() * 5) + 3,
      },
    };

    res.json(health);
  } catch (error) {
    console.error('Error fetching market health:', error);
    res.status(500).json({
      error: 'Failed to fetch market health',
      liquidity: 0,
      activity: 0,
      volatility: 0,
      satisfaction: 0,
      metrics: {
        recentActivity: 0,
        avgBetSize: 0,
        uniqueBettors: 0,
        activeCategories: 0,
      },
    });
  }
};

export const getTrendingPredictions: RequestHandler = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    const trending = await prisma.prediction.findMany({
      where: {
        resolved: false,
        approved: true,
        expiresAt: { gt: new Date() },
      },
      include: {
        _count: {
          select: { bets: true },
        },
      },
      orderBy: {
        bets: { _count: 'desc' },
      },
      take: limit,
    });

    const formattedTrending = trending.map((prediction) => ({
      id: prediction.id,
      title: prediction.title,
      category: prediction.category,
      volume: Math.floor(Math.random() * 10000) + 1000, // TODO: Calculate real volume
      betCount: prediction._count.bets,
      expiresAt: prediction.expiresAt.toISOString(),
    }));

    res.json(formattedTrending);
  } catch (error) {
    console.error('Error fetching trending predictions:', error);
    res.status(500).json({ error: 'Failed to fetch trending predictions' });
  }
};
