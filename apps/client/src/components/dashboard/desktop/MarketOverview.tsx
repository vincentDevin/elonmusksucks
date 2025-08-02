// apps/client/src/components/dashboard/desktop/MarketOverview.tsx
import { useState, useEffect } from 'react';

interface MarketStats {
  totalVolume: number;
  activeMarkets: number;
  totalUsers: number;
  volumeChange: number;
  trending: {
    category: string;
    icon: string;
    growth: number;
  }[];
}

export default function MarketOverview() {
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1h' | '24h' | '7d'>('24h');

  useEffect(() => {
    // Mock data - in real app, this would come from API
    const mockStats: MarketStats = {
      totalVolume: Math.floor(Math.random() * 500000) + 100000,
      activeMarkets: Math.floor(Math.random() * 200) + 150,
      totalUsers: Math.floor(Math.random() * 5000) + 8000,
      volumeChange: (Math.random() - 0.5) * 20,
      trending: [
        { category: 'Sports', icon: '⚽', growth: 23.5 },
        { category: 'Politics', icon: '🗳️', growth: 18.2 },
        { category: 'Tech', icon: '💻', growth: 15.7 },
        { category: 'Entertainment', icon: '🎭', growth: 12.1 },
      ],
    };

    setStats(mockStats);
  }, [selectedTimeframe]);

  if (!stats) {
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
          </h3>
          <div className="space-y-4">
            {/* Liquidity */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Liquidity</span>
                <span className="text-content">High</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 rounded-full h-2 w-4/5"></div>
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Activity Level</span>
                <span className="text-content">Very High</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-blue-500 rounded-full h-2 w-5/6"></div>
              </div>
            </div>

            {/* Market Volatility */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">Volatility</span>
                <span className="text-content">Moderate</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-yellow-500 rounded-full h-2 w-3/5"></div>
              </div>
            </div>

            {/* User Satisfaction */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-tertiary">User Satisfaction</span>
                <span className="text-content">Excellent</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 rounded-full h-2 w-11/12"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
