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
import { useAuth } from '../../contexts/AuthContext';
import api from '../../api/axios';

interface ActivityStats {
  today: {
    posts: number;
    reactions: number;
    comments: number;
    predictions: number;
  };
  week: {
    posts: number;
    reactions: number;
    comments: number;
    predictions: number;
    streak: number;
  };
  allTime: {
    totalPosts: number;
    totalReactions: number;
    totalComments: number;
    totalPredictions: number;
    accountAge: number; // in days
    bestStreak: number;
  };
}

interface ActivitySummaryProps {
  className?: string;
  variant?: 'full' | 'compact';
  showStreaks?: boolean;
}

export const ActivitySummary: React.FC<ActivitySummaryProps> = ({
  className = '',
  variant = 'full',
  showStreaks = true,
}) => {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'all'>('today');

  useEffect(() => {
    const fetchActivityStats = async () => {
      // Don't start loading stats until auth is complete
      if (authLoading) {
        return;
      }

      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/api/users/${user.id}/activity-stats`);
        setStats(response.data);
      } catch (error) {
        console.error('Failed to fetch activity stats:', error);
        // Use mock data for development
        setStats({
          today: {
            posts: 3,
            reactions: 12,
            comments: 7,
            predictions: 2,
          },
          week: {
            posts: 18,
            reactions: 67,
            comments: 34,
            predictions: 8,
            streak: 5,
          },
          allTime: {
            totalPosts: 234,
            totalReactions: 892,
            totalComments: 456,
            totalPredictions: 78,
            accountAge: 180,
            bestStreak: 21,
          },
        });
      } finally {
        setLoading(false);
      }
    };

    fetchActivityStats();
    // Refresh every 5 minutes
    const interval = setInterval(fetchActivityStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, authLoading]);

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

  // Show stats if user is authenticated
  if (!stats) {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Your Activity</h3>
        <p className="text-sm text-tertiary">Loading your activity stats...</p>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <h3 className="text-lg font-semibold mb-3 text-content">Your Activity</h3>
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
          <h3 className="text-lg font-semibold text-content">Your Activity</h3>
          <ChartBarIcon className="w-5 h-5 text-tertiary" />
        </div>

        {/* Timeframe selector */}
        <div className="flex space-x-1">
          {(['today', 'week', 'all'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                timeframe === period
                  ? 'bg-primary text-white'
                  : 'bg-muted text-tertiary hover:bg-hover'
              }`}
            >
              {period === 'all' ? 'All Time' : period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>
      </div>

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
    </div>
  );
};

export default ActivitySummary;
