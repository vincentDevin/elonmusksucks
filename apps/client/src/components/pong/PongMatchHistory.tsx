import { useState, useEffect } from 'react';
import {
  ClockIcon,
  TrophyIcon,
  UserIcon,
  ComputerDesktopIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axios';
import PongTierBadge from './PongTierBadge';

interface PongMatchHistoryProps {
  userId: number;
  limit?: number;
  className?: string;
}

interface MatchHistoryEntry {
  id: string;
  playerWon: boolean;
  eloChange: number;
  opponent?: {
    id: number;
    name: string;
    avatarUrl?: string;
  };
  isAiMatch: boolean;
  aiDifficulty?: string;
  wagerAmount: bigint;
  completedAt: string;
  playerOneScore: number;
  playerTwoScore: number;
  currentUserScore: number;
  opponentScore: number;
  currentUserName: string;
  opponentName: string;
  skillComponent?: number;
  economyComponent?: number;
}

export default function PongMatchHistory({
  userId,
  limit = 10,
  className = '',
}: PongMatchHistoryProps) {
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/users/${userId}/pong-history?limit=${limit}`);
        setMatches(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load match history');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [userId, limit]);

  const formatCurrency = (amount: bigint): string => {
    const num = Number(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="text-center text-error">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center space-x-3 mb-6">
        <ClockIcon className="w-6 h-6 text-primary" />
        <span className="font-semibold text-content text-lg">Recent Matches</span>
      </div>

      {/* Match List */}
      {matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map((match) => (
            <div
              key={match.id}
              className={`p-4 rounded-lg border-l-4 transition-all duration-200 hover:shadow-sm ${
                match.playerWon ? 'bg-success/10 border-success' : 'bg-error/10 border-error'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Match Info */}
                <div className="flex items-center space-x-3">
                  {/* Result Icon */}
                  <div
                    className={`p-2 rounded-full ${
                      match.playerWon ? 'bg-success/20' : 'bg-error/20'
                    }`}
                  >
                    <TrophyIcon
                      className={`w-4 h-4 ${match.playerWon ? 'text-success' : 'text-error'}`}
                    />
                  </div>

                  {/* Match Info */}
                  <div>
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                        <UserIcon className="w-3 h-3 text-tertiary" />
                      </div>
                      <span className="font-medium text-content">
                        {match.currentUserName} vs {match.opponentName}
                      </span>
                    </div>
                    <div className="text-sm text-tertiary">
                      {match.playerWon ? 'Won' : 'Lost'} {match.currentUserScore}-
                      {match.opponentScore} • {formatTimeAgo(match.completedAt)}
                      {Number(match.wagerAmount) > 0 && (
                        <span> • {formatCurrency(match.wagerAmount)} wagered</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Elo Change */}
                <div className="text-right">
                  <div
                    className={`flex items-center space-x-1 text-sm font-medium ${
                      match.eloChange > 0 ? 'text-success' : 'text-error'
                    }`}
                  >
                    {match.eloChange > 0 ? (
                      <ArrowTrendingUpIcon className="w-4 h-4" />
                    ) : (
                      <ArrowTrendingDownIcon className="w-4 h-4" />
                    )}
                    <span>
                      {match.eloChange > 0 ? '+' : ''}
                      {match.eloChange}
                    </span>
                  </div>
                  <div className="text-xs text-tertiary">Elo Change</div>

                  {/* Elo Breakdown */}
                  {(match.skillComponent !== undefined || match.economyComponent !== undefined) && (
                    <div className="text-xs text-tertiary mt-1">
                      {match.skillComponent !== undefined && (
                        <span>
                          Skill: {match.skillComponent > 0 ? '+' : ''}
                          {match.skillComponent}
                        </span>
                      )}
                      {match.skillComponent !== undefined &&
                        match.economyComponent !== undefined &&
                        ' • '}
                      {match.economyComponent !== undefined && (
                        <span>
                          Economy: {match.economyComponent > 0 ? '+' : ''}
                          {match.economyComponent}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🏓</div>
          <h3 className="font-medium text-content mb-1">No matches yet</h3>
          <p className="text-sm text-tertiary">Play some Pong to see your match history here.</p>
        </div>
      )}
    </div>
  );
}
