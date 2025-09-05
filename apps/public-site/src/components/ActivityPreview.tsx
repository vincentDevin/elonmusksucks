import React from 'react';
import type { ActivityPreviewProps } from '../types';

export default function ActivityPreview({
  data,
  className = '',
  clientAppUrl,
}: ActivityPreviewProps) {
  // Use fallback data if API data is not available or not an array
  const activities = (Array.isArray(data) ? data : null) || [
    {
      id: '1',
      type: 'post_created',
      userId: 1,
      userName: 'MuskTracker',
      userAvatar: 'https://i.pravatar.cc/150?img=1',
      title: 'MuskTracker posted',
      description: 'Just saw another Tesla price drop prediction!',
      icon: '📝',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      amount: 500,
      isPersonal: false,
      isHighValue: false,
      priority: 'low',
    },
    {
      id: '2',
      type: 'parlay_started',
      userId: 2,
      userName: 'TeslaBear',
      userAvatar: 'https://i.pravatar.cc/150?img=2',
      title: 'TeslaBear started a 3-leg parlay',
      description: '12500🪙 @15.2x combined odds',
      icon: '🎯',
      timestamp: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
      amount: 12500,
      odds: 15.2,
      isPersonal: false,
      isHighValue: true,
      priority: 'medium',
    },
    {
      id: '3',
      type: 'achievement_unlocked',
      userId: 3,
      userName: 'SpaceXFan',
      userAvatar: 'https://i.pravatar.cc/150?img=3',
      title: 'SpaceXFan unlocked an achievement',
      description: 'Big Spender',
      icon: '🏅',
      timestamp: new Date(Date.now() - 18 * 60 * 1000).toISOString(),
      isPersonal: false,
      isHighValue: true,
      priority: 'medium',
    },
  ];

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

  return (
    <div className={`bg-surface rounded-lg p-6 shadow ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-content">⚡ Live Activity</h2>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-xs text-tertiary">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {activities.slice(0, 6).map((activity) => (
          <div
            key={activity.id}
            className="flex items-start space-x-3 p-3 border border-border rounded-lg hover:bg-muted/5 transition-colors"
          >
            <div className="text-lg">{activity.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm">
                <span className="font-medium text-primary">{activity.userName}</span>{' '}
                <span className="text-content">{activity.description}</span>
                {activity.amount && (
                  <span className="text-primary font-medium">
                    {' '}
                    ({formatAmount(activity.amount)} MB)
                  </span>
                )}
              </div>
              <div className="text-xs text-tertiary mt-1 font-medium">{activity.title}</div>
              <div className="text-xs text-tertiary mt-1">
                {getRelativeTime(activity.timestamp)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <a
          href={`${clientAppUrl}/register`}
          className="block w-full text-center px-4 py-2 bg-primary text-white rounded hover:bg-primary-hover transition-colors text-sm font-medium"
        >
          Join the action!
        </a>
      </div>
    </div>
  );
}
