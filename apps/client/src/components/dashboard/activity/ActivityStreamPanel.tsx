// apps/client/src/components/dashboard/activity/ActivityStreamPanel.tsx
import { useState, useEffect, useRef } from 'react';
import { useActivityStream } from '../../../hooks/useActivityStream';
import ActivityItemComponent from './ActivityItem';
import ActivityFilters from './ActivityFilters';

interface ActivityStreamPanelProps {
  className?: string;
}

export default function ActivityStreamPanel({ className = '' }: ActivityStreamPanelProps) {
  const { activities, loading, error, hasMore, filters, updateFilters, loadMore, refresh } =
    useActivityStream();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top when new activities arrive
  const prevActivitiesLength = useRef(activities.length);
  useEffect(() => {
    if (activities.length > prevActivitiesLength.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
    prevActivitiesLength.current = activities.length;
  }, [activities.length]);

  // Handle scroll to bottom for loading more
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop - clientHeight < 100 && hasMore && !loading) {
      loadMore();
    }
  };

  const getActivityCounts = () => {
    const personal = activities.filter((a) => a.isPersonal).length;
    const social = activities.filter((a) => !a.isPersonal && a.userName).length;
    const platform = activities.filter((a) => !a.isPersonal && !a.userName).length;
    return { personal, social, platform, total: activities.length };
  };

  const counts = getActivityCounts();

  if (error) {
    return (
      <div className={`bg-surface border border-muted rounded-2xl p-6 shadow-lg ${className}`}>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-surface border border-muted rounded-2xl shadow-lg overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">📡</span>
            <div>
              <h3 className="font-semibold text-content">Live Activity Stream</h3>
              <p className="text-sm text-tertiary">{counts.total} recent activities</p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg transition-colors ${
                showFilters ? 'bg-primary text-white' : 'hover:bg-background'
              }`}
              title="Filters"
            >
              🔍
            </button>
            <button
              onClick={refresh}
              className={`p-2 rounded-lg transition-colors hover:bg-background ${
                loading ? 'animate-spin' : ''
              }`}
              title="Refresh"
            >
              🔄
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 hover:bg-background rounded-lg transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>
        </div>

        {/* Activity Summary */}
        <div className="mt-3 flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span className="text-tertiary">{counts.personal} Personal</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span className="text-tertiary">{counts.social} Social</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span className="text-tertiary">{counts.platform} Platform</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="border-b border-muted">
          <ActivityFilters
            filters={filters}
            onFiltersChange={updateFilters}
            activityCounts={counts}
          />
        </div>
      )}

      {/* Activity List */}
      {isExpanded && (
        <div className="relative">
          {loading && activities.length === 0 && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-tertiary">Loading activities...</span>
            </div>
          )}

          {activities.length === 0 && !loading && (
            <div className="text-center py-8 text-tertiary">
              <div className="text-4xl mb-2">📭</div>
              <p className="text-sm">No activities found</p>
              <p className="text-xs mt-1">Try adjusting your filters or check back later</p>
            </div>
          )}

          {activities.length > 0 && (
            <div
              ref={scrollContainerRef}
              className="max-h-96 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60"
              onScroll={handleScroll}
            >
              <div className="p-4 space-y-3">
                {activities.map((activity, index) => (
                  <ActivityItemComponent
                    key={activity.id}
                    activity={activity}
                    isFirst={index === 0}
                    isLast={index === activities.length - 1}
                  />
                ))}

                {/* Load More Indicator */}
                {loading && activities.length > 0 && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="ml-2 text-tertiary text-sm">Loading more...</span>
                  </div>
                )}

                {!hasMore && activities.length > 0 && (
                  <div className="text-center py-4 text-tertiary text-sm">
                    <span>📍 You've reached the end</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsed Preview */}
      {!isExpanded && activities.length > 0 && (
        <div className="p-4">
          <div className="space-y-2">
            {activities.slice(0, 3).map((activity) => (
              <div
                key={activity.id}
                className="flex items-center space-x-3 p-2 bg-background/50 rounded-lg hover:bg-background/80 transition-colors cursor-pointer"
                onClick={() => setIsExpanded(true)}
              >
                <span className={`text-lg ${activity.color}`}>{activity.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content truncate">{activity.title}</p>
                  <p className="text-xs text-tertiary truncate">{activity.description}</p>
                </div>
                <div className="text-xs text-tertiary">
                  {new Date(activity.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            ))}

            {activities.length > 3 && (
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full text-center text-sm text-primary hover:text-primary/80 transition-colors py-2"
              >
                View {activities.length - 3} more activities
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
