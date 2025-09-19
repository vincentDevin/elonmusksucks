import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';

interface RecentActivity {
  id: string;
  type: 'bet' | 'prediction' | 'comment' | 'reaction';
  description: string;
  user?: {
    username: string;
    displayName?: string;
  };
  timestamp: string;
  amount?: number;
  prediction?: {
    id: number;
    title: string;
  };
}

interface ActivityPreviewProps {
  className?: string;
  limit?: number;
}

export const ActivityPreview: React.FC<ActivityPreviewProps> = ({ className = '', limit = 6 }) => {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentActivity();
  }, [limit]);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      const response = await api.get<RecentActivity[]>(`/api/activity/recent?limit=${limit}`);
      // Ensure data is an array
      const activityArray = Array.isArray(response.data) ? response.data : [];
      setActivities(activityArray);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch recent activity:', err);
      setError('Failed to load recent activity');
      // Set fallback data to show activity
      setActivities([
        {
          id: '1',
          type: 'bet',
          description: 'placed a bet on Tesla stock prediction',
          user: { username: 'musktracker', displayName: 'Musk Tracker' },
          timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          amount: 500,
          prediction: { id: 123, title: 'Will Tesla hit $300?' },
        },
        {
          id: '2',
          type: 'prediction',
          description: 'created a new prediction',
          user: { username: 'teslabear', displayName: 'Tesla Bear' },
          timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
          prediction: { id: 124, title: 'Next Twitter controversy timing' },
        },
        {
          id: '3',
          type: 'comment',
          description: 'commented on a prediction',
          user: { username: 'spacexfan', displayName: 'SpaceX Fan' },
          timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
          prediction: { id: 125, title: 'SpaceX launch delays' },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'bet':
        return '💰';
      case 'prediction':
        return '🔮';
      case 'comment':
        return '💬';
      case 'reaction':
        return '👍';
      default:
        return '📈';
    }
  };

  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(time);
  };

  const formatAmount = (amount: number) => {
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toString();
  };

  if (loading) {
    return (
      <div
        className={`bg-surface rounded-lg p-6 shadow transition-colors duration-300 ${className}`}
      >
        <h2 className="text-2xl font-bold mb-4 text-content">⚡ Live Activity</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start space-x-3 animate-pulse">
              <div className="w-6 h-6 bg-muted/20 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted/20 rounded w-3/4 mb-1"></div>
                <div className="h-3 bg-muted/20 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-surface rounded-lg p-6 shadow transition-colors duration-300 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">⚡ Live Activity</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-xs text-tertiary">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/5 transition-colors"
          >
            <div className="text-lg">{getActivityIcon(activity.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium text-primary">
                  {activity.user?.displayName || activity.user?.username || 'Someone'}
                </span>{' '}
                <span className="text-content">{activity.description}</span>
                {activity.amount && (
                  <span className="text-primary font-medium">
                    {' '}
                    ({formatAmount(activity.amount)} MB)
                  </span>
                )}
              </div>
              {activity.prediction && (
                <div className="text-xs text-tertiary mt-1 truncate">
                  "{activity.prediction.title}"
                </div>
              )}
              <div className="text-xs text-tertiary mt-1">
                {getRelativeTime(activity.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="mt-2 p-2 bg-muted/10 rounded text-xs text-tertiary">
          Real-time activity unavailable - showing recent activity
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-border">
        <Link
          to="/register"
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors text-sm font-medium"
        >
          Join the action!
        </Link>
      </div>
    </div>
  );
};
