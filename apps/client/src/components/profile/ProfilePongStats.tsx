import { useState, useEffect, memo } from 'react';
import { TrophyIcon, ChartBarIcon, ClockIcon, PuzzlePieceIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';
import PongEloCard from '../pong/PongEloCard';
import PongStatsCard from '../pong/PongStatsCard';
import PongMatchHistory from '../pong/PongMatchHistory';
import EloChart from '../pong/EloChart';

interface ProfilePongStatsProps {
  userId: number;
  isOwn: boolean;
  userName: string;
}

type PongTab = 'overview' | 'stats' | 'history' | 'elo-chart';

interface PongOverviewData {
  eloRating: number;
  tier: string;
  totalMatches: number;
  wins: number;
  winRate: number;
  winStreak: number;
  totalWon: bigint;
  lastEloChange: number;
  peakElo: number;
  riskTaker: boolean;
}

function ProfilePongStatsComponent({ userId, isOwn, userName }: ProfilePongStatsProps) {
  const [activeTab, setActiveTab] = useState<PongTab>('overview');
  const [visitedTabs, setVisitedTabs] = useState<Set<PongTab>>(new Set(['overview']));
  const [overviewData, setOverviewData] = useState<PongOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverviewData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/users/${userId}/pong-stats`);
        setOverviewData(response.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Pong stats');
      } finally {
        setLoading(false);
      }
    };

    fetchOverviewData();
  }, [userId]);

  const tabs = [
    {
      key: 'overview' as const,
      label: 'Overview',
      icon: TrophyIcon,
      description: 'Elo rating and quick stats',
    },
    {
      key: 'stats' as const,
      label: 'Detailed Stats',
      icon: ChartBarIcon,
      description: 'Complete performance breakdown',
    },
    {
      key: 'history' as const,
      label: 'Match History',
      icon: ClockIcon,
      description: 'Recent matches and results',
    },
    {
      key: 'elo-chart' as const,
      label: 'Elo Progression',
      icon: ChartBarIcon,
      description: 'Rating progression over time',
    },
  ];

  const formatCurrency = (amount: bigint): string => {
    const num = Number(amount);
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-accent/20 p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-6">
            <PuzzlePieceIcon className="w-6 h-6 text-primary" />
            <div className="h-6 bg-muted rounded w-32"></div>
          </div>
          <div className="h-32 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-accent/20 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <PuzzlePieceIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content">Pong Statistics</span>
        </div>
        <div className="text-center py-8">
          <div className="text-error mb-2">❌ Error loading Pong stats</div>
          <p className="text-sm text-tertiary">{error}</p>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="bg-surface rounded-xl shadow-sm border border-accent/20 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <PuzzlePieceIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content">Pong Statistics</span>
        </div>
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🏓</div>
          <h3 className="text-lg font-semibold text-content mb-2">
            {isOwn ? "You haven't played Pong yet!" : `${userName} hasn't played Pong yet!`}
          </h3>
          <p className="text-tertiary mb-4">
            {isOwn
              ? 'Start your Pong journey and build your Elo rating!'
              : "Check back when they've played some matches."}
          </p>
          {isOwn && (
            <a
              href="/pong"
              className="inline-flex items-center space-x-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary/80 transition-colors"
            >
              <PuzzlePieceIcon className="w-4 h-4" />
              <span>Play Pong</span>
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-xl shadow-sm border border-accent/20 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <PuzzlePieceIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content text-lg">Pong Statistics</span>
          {overviewData.riskTaker && (
            <span className="px-2 py-1 bg-warning/10 text-warning rounded-full text-xs font-medium">
              🎲 High Roller
            </span>
          )}
        </div>
        <a href="/pong" className="text-sm text-primary hover:text-primary/80 font-medium">
          Play Pong →
        </a>
      </div>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{overviewData.eloRating}</div>
          <div className="text-sm text-tertiary">Elo Rating</div>
          <div
            className={`text-xs px-2 py-1 rounded-full mt-1 inline-block ${
              overviewData.tier === 'GRANDMASTER'
                ? 'bg-accent/20 text-accent'
                : overviewData.tier === 'MASTER'
                  ? 'bg-error/10 text-error'
                  : overviewData.tier === 'DIAMOND'
                    ? 'bg-primary/10 text-primary'
                    : overviewData.tier === 'PLATINUM'
                      ? 'bg-success/10 text-success'
                      : overviewData.tier === 'GOLD'
                        ? 'bg-accent/10 text-accent'
                        : overviewData.tier === 'SILVER'
                          ? 'bg-surface text-content'
                          : 'bg-muted text-tertiary'
            }`}
          >
            {overviewData.tier}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-success">{overviewData.wins}</div>
          <div className="text-sm text-tertiary">Wins</div>
          <div className="text-xs text-tertiary">{overviewData.winRate?.toFixed(1)}% rate</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-warning">{overviewData.winStreak}</div>
          <div className="text-sm text-tertiary">Win Streak</div>
          <div className="text-xs text-tertiary">{overviewData.totalMatches} total</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-accent">
            {formatCurrency(overviewData.totalWon)}
          </div>
          <div className="text-sm text-tertiary">Earnings</div>
          <div
            className={`text-xs ${overviewData.lastEloChange >= 0 ? 'text-success' : 'text-error'}`}
          >
            {overviewData.lastEloChange >= 0 ? '+' : ''}
            {overviewData.lastEloChange} Elo
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map(({ key, label, icon: Icon, description }) => (
          <button
            key={key}
            onClick={() => {
              setActiveTab(key);
              setVisitedTabs((prev) => new Set(prev).add(key));
            }}
            title={description}
            className={`
              flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200
              ${
                activeTab === key
                  ? 'bg-primary text-white shadow-lg scale-105'
                  : 'bg-muted/50 text-content hover:bg-primary/10 hover:text-primary hover:scale-105'
              }
            `}
          >
            <Icon className="w-4 h-4" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content - Lazy mount on first visit, then keep mounted */}
      <div className="min-h-[300px] relative">
        {visitedTabs.has('overview') && (
          <div
            className={`grid md:grid-cols-2 gap-6 ${activeTab === 'overview' ? '' : 'absolute inset-0 invisible pointer-events-none opacity-0'}`}
          >
            <PongEloCard
              userId={userId}
              eloRating={overviewData.eloRating}
              tier={overviewData.tier}
              peakElo={overviewData.peakElo}
              lastEloChange={overviewData.lastEloChange}
              showDetails={true}
            />
            <PongStatsCard userId={userId} compact={true} />
          </div>
        )}

        {visitedTabs.has('stats') && (
          <div
            className={
              activeTab === 'stats'
                ? ''
                : 'absolute inset-0 invisible pointer-events-none opacity-0'
            }
          >
            <PongStatsCard userId={userId} compact={false} />
          </div>
        )}

        {visitedTabs.has('history') && (
          <div
            className={
              activeTab === 'history'
                ? ''
                : 'absolute inset-0 invisible pointer-events-none opacity-0'
            }
          >
            <PongMatchHistory userId={userId} />
          </div>
        )}

        {visitedTabs.has('elo-chart') && (
          <div
            className={
              activeTab === 'elo-chart'
                ? ''
                : 'absolute inset-0 invisible pointer-events-none opacity-0'
            }
          >
            <EloChart userId={userId} />
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent re-renders when parent re-renders
// Only re-render if userId, isOwn, or userName actually changes
export default memo(ProfilePongStatsComponent, (prevProps, nextProps) => {
  return (
    prevProps.userId === nextProps.userId &&
    prevProps.isOwn === nextProps.isOwn &&
    prevProps.userName === nextProps.userName
  );
});
