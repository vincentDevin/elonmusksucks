import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  TrophyIcon,
  CurrencyDollarIcon,
  FireIcon,
  StarIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';

interface PongStatsCardProps {
  userId: number;
  className?: string;
  compact?: boolean;
}

interface PongStats {
  // Match Statistics
  totalMatches: number;
  wins: number;
  losses: number;
  winStreak: number;
  bestWinStreak: number;

  // Economy Statistics
  totalWagered: bigint;
  totalWon: bigint;
  totalLost: bigint;
  biggestWin: bigint;
  biggestLoss: bigint;

  // Performance Statistics
  avgPing: number;
  avgGameDuration: number;
  perfectGames: number;
  comebacks: number;

  // AI Statistics
  aiWins: number;
  aiLosses: number;
  hardestAiBeaten?: string;

  // Elo Statistics
  eloRating: number;
  peakElo: number;
  tier: string;
  riskTaker: boolean;

  // Calculated fields
  winRate: number;
  profit: bigint;
  roi: number;
}

export default function PongStatsCard({
  userId,
  className = '',
  compact = false,
}: PongStatsCardProps) {
  const [stats, setStats] = useState<PongStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/users/${userId}/pong-stats`);
        setStats(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load stats');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const formatCurrency = (amount: bigint): string => {
    const num = Number(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-5/6"></div>
            <div className="h-3 bg-muted rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="text-center text-red-500">
          <p>{error || 'No stats available'}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-4 ${className}`}>
        <div className="flex items-center space-x-3 mb-3">
          <ChartBarIcon className="w-5 h-5 text-blue-500" />
          <span className="font-semibold text-content">Pong Stats</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center">
            <div className="font-bold text-blue-500">{stats.wins}</div>
            <div className="text-tertiary">Wins</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-green-500">{stats.winRate.toFixed(1)}%</div>
            <div className="text-tertiary">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-orange-500">{formatCurrency(stats.totalWon)}</div>
            <div className="text-tertiary">Earned</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-purple-500">{stats.winStreak}</div>
            <div className="text-tertiary">Streak</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ChartBarIcon className="w-6 h-6 text-blue-500" />
        <span className="font-semibold text-content text-lg">Pong Statistics</span>
        {stats.riskTaker && (
          <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-xs font-medium">
            🎲 High Roller
          </span>
        )}
      </div>

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <TrophyIcon className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{stats.wins}</div>
          <div className="text-sm text-tertiary">Wins</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl mb-1">📊</div>
          <div className="font-bold text-lg text-content">{stats.winRate.toFixed(1)}%</div>
          <div className="text-sm text-tertiary">Win Rate</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <FireIcon className="w-6 h-6 text-orange-500 mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{stats.winStreak}</div>
          <div className="text-sm text-tertiary">Current Streak</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <CurrencyDollarIcon className="w-6 h-6 text-green-500 mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{formatCurrency(stats.totalWon)}</div>
          <div className="text-sm text-tertiary">Total Earned</div>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="space-y-4">
        {/* Match Performance */}
        <div>
          <h4 className="font-medium text-content mb-2">Match Performance</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-tertiary">Total Matches</span>
              <span className="font-medium text-content">{stats.totalMatches}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Best Win Streak</span>
              <span className="font-medium text-content">{stats.bestWinStreak}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Perfect Games</span>
              <span className="font-medium text-content">{stats.perfectGames}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Comebacks</span>
              <span className="font-medium text-content">{stats.comebacks}</span>
            </div>
          </div>
        </div>

        {/* Financial Performance */}
        <div>
          <h4 className="font-medium text-content mb-2">Financial Performance</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-tertiary">Total Wagered</span>
              <span className="font-medium text-content">{formatCurrency(stats.totalWagered)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Profit/Loss</span>
              <span
                className={`font-medium ${stats.profit >= 0n ? 'text-green-500' : 'text-red-500'}`}
              >
                {stats.profit >= 0n ? '+' : ''}
                {formatCurrency(stats.profit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">ROI</span>
              <span className={`font-medium ${stats.roi >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.roi.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Biggest Win</span>
              <span className="font-medium text-green-500">{formatCurrency(stats.biggestWin)}</span>
            </div>
          </div>
        </div>

        {/* AI Performance */}
        {(stats.aiWins > 0 || stats.aiLosses > 0) && (
          <div>
            <h4 className="font-medium text-content mb-2">AI Performance</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-tertiary">AI Wins</span>
                <span className="font-medium text-content">{stats.aiWins}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-tertiary">AI Losses</span>
                <span className="font-medium text-content">{stats.aiLosses}</span>
              </div>
              {stats.hardestAiBeaten && (
                <div className="flex justify-between col-span-2">
                  <span className="text-tertiary">Hardest AI Beaten</span>
                  <span className="font-medium text-content">{stats.hardestAiBeaten}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Technical Stats */}
        <div>
          <h4 className="font-medium text-content mb-2">Technical Stats</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-tertiary">Avg Ping</span>
              <span className="font-medium text-content">{stats.avgPing.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Avg Game Time</span>
              <span className="font-medium text-content">
                {formatDuration(stats.avgGameDuration)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
