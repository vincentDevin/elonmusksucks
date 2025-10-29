import { useState, useEffect, memo } from 'react';
import { TrophyIcon, CurrencyDollarIcon, FireIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import BaseCard from '../BaseCard';
import { formatMuskBucks } from '../../utils/formatting';

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

function PongStatsCardComponent({ userId, className = '', compact = false }: PongStatsCardProps) {
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
        <div className="text-center text-error">
          <p>{error || 'No stats available'}</p>
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <BaseCard variant="compact" className={className} title="📊 Pong Stats">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="text-center">
            <div className="font-bold text-primary">{stats.wins}</div>
            <div className="text-tertiary">Wins</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-success">{stats.winRate.toFixed(1)}%</div>
            <div className="text-tertiary">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-success">{formatMuskBucks(stats.totalWon)}</div>
            <div className="text-tertiary">Earned</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-primary">{stats.winStreak}</div>
            <div className="text-tertiary">Streak</div>
          </div>
        </div>
      </BaseCard>
    );
  }

  return (
    <BaseCard variant="full" className={className} title="📊 Pong Statistics">
      {/* High Roller Badge */}
      {stats.riskTaker && (
        <div className="mb-4">
          <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
            🎲 High Roller
          </span>
        </div>
      )}

      {/* Core Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <TrophyIcon className="w-6 h-6 text-accent mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{stats.wins}</div>
          <div className="text-sm text-tertiary">Wins</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <div className="text-2xl mb-1">📊</div>
          <div className="font-bold text-lg text-content">{stats.winRate.toFixed(1)}%</div>
          <div className="text-sm text-tertiary">Win Rate</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <FireIcon className="w-6 h-6 text-warning mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{stats.winStreak}</div>
          <div className="text-sm text-tertiary">Current Streak</div>
        </div>
        <div className="text-center p-3 bg-muted/30 rounded-lg">
          <CurrencyDollarIcon className="w-6 h-6 text-success mx-auto mb-1" />
          <div className="font-bold text-lg text-content">{formatMuskBucks(stats.totalWon)}</div>
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
              <span className="font-medium text-content">
                {formatMuskBucks(stats.totalWagered)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Profit/Loss</span>
              <span className={`font-medium ${stats.profit >= 0n ? 'text-success' : 'text-error'}`}>
                {stats.profit >= 0n ? '+' : ''}
                {formatMuskBucks(stats.profit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">ROI</span>
              <span
                className={`font-medium ${(stats.roi ?? 0) >= 0 ? 'text-success' : 'text-error'}`}
              >
                {(stats.roi ?? 0).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-tertiary">Biggest Win</span>
              <span className="font-medium text-success">{formatMuskBucks(stats.biggestWin)}</span>
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
              <span className="font-medium text-content">{(stats.avgPing ?? 0).toFixed(0)}ms</span>
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
    </BaseCard>
  );
}

// Memoize to prevent re-fetching stats when parent re-renders
export default memo(PongStatsCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.className === nextProps.className &&
    prevProps.compact === nextProps.compact
  );
});
