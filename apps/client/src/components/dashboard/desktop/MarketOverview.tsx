// apps/client/src/components/dashboard/desktop/MarketOverview.tsx
import { useState, useEffect } from 'react';
import {
  getMarketOverview,
  getMarketHealth,
  type MarketStats,
  type MarketHealth,
} from '../../../api/market';

export default function MarketOverview() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [health, setHealth] = useState<MarketHealth | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('24h');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [marketStats, marketHealth] = await Promise.all([
          getMarketOverview(),
          getMarketHealth(),
        ]);

        setStats(marketStats);
        setHealth(marketHealth);
      } catch (err) {
        console.error('Error fetching market data:', err);
        setError('Failed to load market data');

        // Fallback to basic data structure to prevent UI breaks
        setStats({
          totalVolume: 0,
          activeMarkets: 0,
          totalUsers: 0,
          volumeChange: 0,
          trending: [],
        });
        setHealth({
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
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [selectedTimeframe]);

  if (loading || !stats || !health) {
    return (
      <div className="bg-surface border border-muted rounded-2xl p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatChange = (change: number) => {
    const color = change >= 0 ? 'text-green-500' : 'text-red-500';
    const arrow = change >= 0 ? '↗' : '↘';
    return (
      <span className={`${color} text-sm flex items-center`}>
        <span className="mr-1">{arrow}</span>
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-content">Market Overview</h2>
          <p className="text-sm text-tertiary">Real-time platform statistics</p>
        </div>

        {/* Timeframe Selector */}
        <div className="flex bg-background rounded-lg p-1 border border-muted">
          {(['1h', '24h', '7d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-tertiary hover:text-content'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        {/* Total Volume */}
        <div className="bg-background/50 rounded-xl p-4 border border-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-blue-500 text-2xl">💰</span>
            {formatChange(stats.volumeChange)}
          </div>
          <div className="text-2xl font-bold text-content mb-1">
            {formatNumber(stats.totalVolume)}🪙
          </div>
          <div className="text-sm text-tertiary">Total Volume</div>
        </div>

        {/* Active Markets */}
        <div className="bg-background/50 rounded-xl p-4 border border-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-green-500 text-2xl">🎯</span>
            <span className="text-green-500 text-sm flex items-center">
              <span className="mr-1">↗</span>
              12
            </span>
          </div>
          <div className="text-2xl font-bold text-content mb-1">{stats.activeMarkets}</div>
          <div className="text-sm text-tertiary">Active Markets</div>
        </div>

        {/* Total Users */}
        <div className="bg-background/50 rounded-xl p-4 border border-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-purple-500 text-2xl">👥</span>
            <span className="text-green-500 text-sm flex items-center">
              <span className="mr-1">↗</span>
              5.2%
            </span>
          </div>
          <div className="text-2xl font-bold text-content mb-1">
            {formatNumber(stats.totalUsers)}
          </div>
          <div className="text-sm text-tertiary">Active Users</div>
        </div>

        {/* Avg Bet Size */}
        <div className="bg-background/50 rounded-xl p-4 border border-muted">
          <div className="flex items-center justify-between mb-2">
            <span className="text-yellow-500 text-2xl">📊</span>
            <span className="text-red-500 text-sm flex items-center">
              <span className="mr-1">↘</span>
              2.1%
            </span>
          </div>
          <div className="text-2xl font-bold text-content mb-1">
            {Math.floor(stats.totalVolume / stats.activeMarkets)}🪙
          </div>
          <div className="text-sm text-tertiary">Avg Bet Size</div>
        </div>
      </div>

      {/* Trending Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trending Categories */}
        <div>
          <h3 className="font-semibold text-content mb-4 flex items-center">
            <span className="mr-2">🔥</span>
            Trending Categories
          </h3>
          <div className="space-y-3">
            {stats.trending.map((trend, index) => (
              <div
                key={trend.category}
                className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-muted hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 bg-surface rounded-full border border-muted">
                    <span className="text-sm">{trend.icon}</span>
                  </div>
                  <div>
                    <div className="font-medium text-content">{trend.category}</div>
                    <div className="text-xs text-tertiary">#{index + 1} trending</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-500 font-medium">+{trend.growth}%</div>
                  <div className="text-xs text-tertiary">growth</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Market Health */}
        <div>
          <h3 className="font-semibold text-content mb-4 flex items-center">
            <span className="mr-2">💓</span>
            Market Health
            {error && <span className="ml-2 text-xs text-error">⚠️</span>}
            {stats.cached && <span className="ml-2 text-xs text-tertiary">📦</span>}
          </h3>
          <div className="space-y-4">
            {/* Liquidity */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Liquidity</span>
                <span className="text-content">
                  {health.liquidity >= 80 ? 'High' : health.liquidity >= 50 ? 'Medium' : 'Low'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`rounded-full h-2 ${
                    health.liquidity >= 80
                      ? 'bg-success'
                      : health.liquidity >= 50
                        ? 'bg-warning'
                        : 'bg-error'
                  }`}
                  style={{ width: `${health.liquidity}%` }}
                ></div>
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Activity Level</span>
                <span className="text-content">
                  {health.activity >= 80
                    ? 'Very High'
                    : health.activity >= 50
                      ? 'High'
                      : 'Moderate'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`rounded-full h-2 ${
                    health.activity >= 80
                      ? 'bg-info'
                      : health.activity >= 50
                        ? 'bg-primary'
                        : 'bg-secondary'
                  }`}
                  style={{ width: `${health.activity}%` }}
                ></div>
              </div>
            </div>

            {/* Market Volatility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Volatility</span>
                <span className="text-content">
                  {health.volatility >= 80 ? 'High' : health.volatility >= 50 ? 'Moderate' : 'Low'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`rounded-full h-2 ${
                    health.volatility >= 80
                      ? 'bg-warning'
                      : health.volatility >= 50
                        ? 'bg-accent'
                        : 'bg-secondary'
                  }`}
                  style={{ width: `${health.volatility}%` }}
                ></div>
              </div>
            </div>

            {/* User Satisfaction */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">User Satisfaction</span>
                <span className="text-content">
                  {health.satisfaction >= 80
                    ? 'Excellent'
                    : health.satisfaction >= 60
                      ? 'Good'
                      : 'Fair'}
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className={`rounded-full h-2 ${
                    health.satisfaction >= 80
                      ? 'bg-success'
                      : health.satisfaction >= 60
                        ? 'bg-primary'
                        : 'bg-warning'
                  }`}
                  style={{ width: `${health.satisfaction}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
