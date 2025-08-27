import type { RequestHandler } from 'express';
import redisClient from '../lib/redis';
import {
  getMarketOverviewStats,
  getTrendingPredictions as getTrendingPredictionsService,
} from '../services/market.service';
import { toMarketOverviewView } from '../view/market.view';
import type { MarketOverviewView } from '@ems/types';

export const getMarketOverview: RequestHandler = async (_req, res, _next) => {
  try {
    const cacheKey = 'market:overview:stats';
    const cached = await redisClient.get(cacheKey);

    if (cached) {
      const cachedStats = JSON.parse(cached);
      const payload = toMarketOverviewView(cachedStats, true) satisfies MarketOverviewView;
      res.json(payload);
      return;
    }

    const stats = await getMarketOverviewStats();

    // Cache for 30 seconds
    await redisClient.setex(cacheKey, 30, JSON.stringify(stats));

    const payload = toMarketOverviewView(stats, false) satisfies MarketOverviewView;
    res.json(payload);
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
    const formattedTrending = await getTrendingPredictionsService(limit);
    res.json(formattedTrending);
  } catch (error) {
    console.error('Error fetching trending predictions:', error);
    res.status(500).json({ error: 'Failed to fetch trending predictions' });
  }
};
