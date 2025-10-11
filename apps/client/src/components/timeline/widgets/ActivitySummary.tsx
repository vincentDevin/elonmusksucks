import React, { useState, useEffect } from 'react';
import {
  ChatBubbleLeftRightIcon,
  HeartIcon,
  PencilSquareIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  FireIcon,
  StarIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserActivityStats } from '../../../api/users';
import type { UserActivityStats } from '@ems/types';

interface ActivitySummaryProps {
  className?: string;
  variant?: 'full' | 'compact';
  showStreaks?: boolean;
  isExpanded?: boolean;
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({
  className = '',
  variant = 'full',
  showStreaks = true,
  isExpanded = true, // Default to true for backwards compatibility
}) => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<UserActivityStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    const fetchActivityStats = async () => {
      // Lazy load: Don't fetch until expanded
      if (!isExpanded || hasHydrated) {
        return;
      }

      // Don't start loading stats until auth is complete
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setLoading(false);
        setHasHydrated(true);
        return;
      }

      setLoading(true);

      try {
        // Fetch aggregated stats from backend
        const activityStats = await getUserActivityStats(user.id);
        setStats(activityStats);
      } catch (error) {
        console.error('[ActivitySummary] Failed to fetch activity stats:', error);
        // Use minimal fallback data
        setStats({
          today: { posts: 0, reactions: 0, comments: 0, predictions: 0 },
          week: { posts: 0, reactions: 0, comments: 0, predictions: 0, streak: 0 },
          allTime: {
            totalPosts: 0,
            totalReactions: 0,
            totalComments: 0,
            totalPredictions: 0,
            accountAge: 0,
            bestStreak: 0,
          },
        });
      } finally {
        setLoading(false);
        setHasHydrated(true);
      }
    };

    fetchActivityStats();

    // Only set up refresh interval if already hydrated
    if (hasHydrated && isExpanded) {
      const interval = setInterval(fetchActivityStats, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [user?.id, authLoading, isExpanded, hasHydrated]);

  // Show loading while auth is loading or stats are loading
  if (authLoading || loading) {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <div className="animate-pulse">
          <div className="h-5 bg-muted rounded mb-3"></div>
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Only show login message if auth is complete and no user is found
  if (!user) {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Your Activity</h3>
        <p className="text-sm text-tertiary">Log in to see your activity stats</p>
      </div>
    );
  }

  // Render compact variant
  if (variant === 'compact') {
    // If not expanded, just show header
    if (!isExpanded) {
      return (
        <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
          <h3 className="text-lg font-semibold mb-3 text-content flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5" />
            <span>Your Activity</span>
          </h3>
        </div>
      );
    }

    // Show loading state
    if (loading || !stats) {
      return (
        <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
          <h3 className="text-lg font-semibold mb-3 text-content">Your Activity</h3>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded"></div>
          </div>
        </div>
      );
    }

    // Show data
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content flex items-center space-x-2">
          <ChartBarIcon className="w-5 h-5" />
          <span>Your Activity</span>
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-tertiary flex items-center space-x-1">
              <PencilSquareIcon className="w-4 h-4" />
              <span>Posts today:</span>
            </span>
            <span className="font-medium text-content">{stats.today.posts}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-tertiary flex items-center space-x-1">
              <HeartIcon className="w-4 h-4" />
              <span>Reactions given:</span>
            </span>
            <span className="font-medium text-content">{stats.today.reactions}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-tertiary flex items-center space-x-1">
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Comments:</span>
            </span>
            <span className="font-medium text-content">{stats.today.comments}</span>
          </div>
          {showStreaks && stats.week.streak > 0 && (
            <div className="pt-2 mt-2 border-t border-border">
              <div className="flex items-center justify-between">
                <span className="text-tertiary flex items-center space-x-1">
                  <FireIcon className="w-4 h-4" />
                  <span>Current streak:</span>
                </span>
                <span className="font-medium text-warning">{stats.week.streak} days</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full variant
  return (
    <div className={`bg-surface rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-content flex items-center space-x-2">
            <ChartBarIcon className="w-5 h-5" />
            <span>Your Activity</span>
          </h3>
        </div>

        {/* Timeframe selector - Only show when expanded */}
        {isExpanded && (
          <div className="flex space-x-1">
            {(['today', 'week', 'all'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimeframe(period)}
                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                  timeframe === period
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-tertiary hover:bg-hover'
                }`}
              >
                {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        )}
      </div>

      {isExpanded && stats && (
        <div className="p-4 space-y-3">
          {/* Activity Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <PencilSquareIcon className="w-4 h-4 text-primary" />
                <span className="text-xs text-tertiary">Posts</span>
              </div>
              <p className="text-xl font-bold text-content">
                {timeframe === 'today'
                  ? stats.today.posts
                  : timeframe === 'week'
                    ? stats.week.posts
                    : stats.allTime.totalPosts}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <HeartIcon className="w-4 h-4 text-error" />
                <span className="text-xs text-tertiary">Reactions</span>
              </div>
              <p className="text-xl font-bold text-content">
                {timeframe === 'today'
                  ? stats.today.reactions
                  : timeframe === 'week'
                    ? stats.week.reactions
                    : stats.allTime.totalReactions}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-info" />
                <span className="text-xs text-tertiary">Comments</span>
              </div>
              <p className="text-xl font-bold text-content">
                {timeframe === 'today'
                  ? stats.today.comments
                  : timeframe === 'week'
                    ? stats.week.comments
                    : stats.allTime.totalComments}
              </p>
            </div>

            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <ArrowTrendingUpIcon className="w-4 h-4 text-success" />
                <span className="text-xs text-tertiary">Predictions</span>
              </div>
              <p className="text-xl font-bold text-content">
                {timeframe === 'today'
                  ? stats.today.predictions
                  : timeframe === 'week'
                    ? stats.week.predictions
                    : stats.allTime.totalPredictions}
              </p>
            </div>
          </div>

          {/* Streak Section */}
          {showStreaks && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <FireIcon
                      className={`w-5 h-5 ${stats.week.streak > 7 ? 'text-error' : 'text-warning'}`}
                    />
                    <span className="text-sm font-medium text-content">Current Streak</span>
                  </div>
                  <p className="text-2xl font-bold text-content mt-1">{stats.week.streak} days</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-tertiary">Best Streak</p>
                  <p className="text-lg font-semibold text-content">
                    {stats.allTime.bestStreak} days
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Achievement Hint */}
          {stats.week.streak >= 7 && (
            <div className="bg-warning/10 border border-warning/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <StarIcon className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-xs font-medium text-content">Week Warrior!</p>
                  <p className="text-xs text-tertiary">You've been active for 7+ days straight</p>
                </div>
              </div>
            </div>
          )}

          {/* Account Age */}
          {timeframe === 'all' && (
            <div className="pt-3 border-t border-border">
              <div className="flex items-center justify-between text-xs text-tertiary">
                <div className="flex items-center space-x-1">
                  <ClockIcon className="w-4 h-4" />
                  <span>Member for</span>
                </div>
                <span className="font-medium text-content">{stats.allTime.accountAge} days</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ActivitySummary;
