// apps/client/src/components/dashboard/activity/ActivityItem.tsx
import { useState } from 'react';
import type { ActivityItem as ActivityItemType } from '../../../hooks/useActivityStream';

interface ActivityItemProps {
  activity: ActivityItemType;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

export default function ActivityItem({
  activity,
  isFirst = false,
  isLast: _isLast = false,
  className = '',
}: ActivityItemProps) {
  const [isHovered, setIsHovered] = useState(false);

  const formatTimeAgo = (timestamp: string) => {
    const now = Date.now();
    const activityTime = new Date(timestamp).getTime();
    const diffInSeconds = Math.floor((now - activityTime) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const getPriorityStyle = () => {
    switch (activity.priority) {
      case 'high':
        return 'border-l-4 border-l-red-400 bg-red-50/5';
      case 'medium':
        return 'border-l-4 border-l-yellow-400 bg-yellow-50/5';
      default:
        return 'border-l-4 border-l-transparent';
    }
  };

  const handleClick = () => {
    if (activity.predictionId) {
      // Navigate to prediction
      window.location.href = `/predictions/${activity.predictionId}`;
    } else if (activity.metadata?.betId) {
      // Show bet details (could open a modal)
      console.log('Show bet details:', activity.metadata.betId);
    }
  };

  const getActionButton = () => {
    if (activity.predictionId) {
      return (
        <button
          onClick={handleClick}
          className="text-xs text-primary hover:text-primary/80 transition-colors"
        >
          View →
        </button>
      );
    }
    return null;
  };

  const getMetadataDisplay = () => {
    if (!activity.metadata) return null;

    const items = [];

    if (activity.metadata.odds) {
      items.push(`${activity.metadata.odds}× odds`);
    }
    if (activity.metadata.legCount) {
      items.push(`${activity.metadata.legCount} legs`);
    }
    if (activity.metadata.potentialPayout && activity.amount) {
      const multiplier = activity.metadata.potentialPayout / activity.amount;
      items.push(`${multiplier.toFixed(1)}× payout`);
    }
    if (activity.metadata.change && activity.type === 'rank_changed') {
      const direction = activity.metadata.change > 0 ? '↗' : '↘';
      items.push(`${direction} ${Math.abs(activity.metadata.change)} spots`);
    }

    return items.length > 0 ? (
      <div className="flex flex-wrap gap-1 mt-1">
        {items.map((item, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-surface text-tertiary text-xs rounded border border-muted"
          >
            {item}
          </span>
        ))}
      </div>
    ) : null;
  };

  const getNewBadge = () => {
    const activityAge = Date.now() - new Date(activity.timestamp).getTime();
    const isNew = activityAge < 2 * 60 * 1000; // Less than 2 minutes old

    return isNew ? (
      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full animate-pulse">
        NEW
      </span>
    ) : null;
  };

  return (
    <div
      className={`
        relative p-3 rounded-lg transition-all duration-200 cursor-pointer
        ${getPriorityStyle()}
        ${isHovered ? 'bg-background/80 transform scale-[1.02]' : 'bg-background/30'}
        ${isFirst ? 'animate-slideIn' : ''}
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {/* Priority Indicator */}
      {activity.priority === 'high' && (
        <div className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
      )}

      <div className="flex items-start space-x-3">
        {/* Icon */}
        <div className={`text-lg ${activity.color} flex-shrink-0`}>{activity.icon}</div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="text-sm font-medium text-content truncate">{activity.title}</h4>
                {getNewBadge()}
              </div>

              <p className="text-sm text-tertiary leading-relaxed">{activity.description}</p>

              {/* Category and Amount */}
              <div className="flex items-center space-x-3 mt-2 text-xs text-tertiary">
                {activity.category && (
                  <span className="px-2 py-1 bg-surface rounded border border-muted">
                    {activity.category}
                  </span>
                )}
                {activity.amount && (
                  <span
                    className={`font-medium ${
                      activity.type.includes('won')
                        ? 'text-green-600'
                        : activity.type.includes('lost')
                          ? 'text-red-600'
                          : 'text-content'
                    }`}
                  >
                    {activity.amount}🪙
                  </span>
                )}
                <span>{formatTimeAgo(activity.timestamp)}</span>
              </div>

              {/* Metadata */}
              {getMetadataDisplay()}
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end space-y-1 ml-3">
              {getActionButton()}

              {/* User Avatar */}
              {activity.userAvatar && !activity.isPersonal && (
                <div className="w-6 h-6 rounded-full bg-muted border border-muted overflow-hidden">
                  <img
                    src={activity.userAvatar}
                    alt={activity.userName || 'User'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Personal Activity Indicator */}
      {activity.isPersonal && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full"></div>
      )}

      {/* Hover Effect */}
      {isHovered && (
        <div className="absolute inset-0 bg-primary/5 rounded-lg pointer-events-none"></div>
      )}
    </div>
  );
}
