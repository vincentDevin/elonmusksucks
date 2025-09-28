import React, { useEffect, useState } from 'react';
import type { UnifiedContentFilters, UnifiedContentAnalytics } from '@ems/types';
import * as unifiedContentAPI from '../../../api/unifiedContent';

interface ContentOverviewProps {
  totalContent: number;
  selectedFilters: UnifiedContentFilters;
  onQuickFilter: (filters: Partial<UnifiedContentFilters>) => void;
  className?: string;
}

/**
 * Content Overview Component
 *
 * Displays high-level statistics and quick action buttons for content management.
 * Shows analytics, content type breakdown, and provides quick filter options.
 */
const ContentOverview: React.FC<ContentOverviewProps> = ({
  totalContent,
  onQuickFilter,
  className = '',
}) => {
  const [analytics, setAnalytics] = useState<UnifiedContentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  // Load analytics data
  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        setLoading(true);
        const data = await unifiedContentAPI.getAnalytics('7d'); // Last 7 days
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading analytics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, []);

  // Quick filter options
  const quickFilters = [
    {
      label: 'Pending Review',
      icon: '⏳',
      filter: { statuses: ['pending' as const] },
      color: 'warning',
    },
    {
      label: 'Flagged Content',
      icon: '🚩',
      filter: { statuses: ['flagged' as const] },
      color: 'error',
    },
    {
      label: 'Recent Articles',
      icon: '📰',
      filter: {
        types: ['article' as const],
        createdAfter: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      },
      color: 'info',
    },
    {
      label: 'User Posts',
      icon: '💬',
      filter: { types: ['user_post' as const] },
      color: 'success',
    },
    {
      label: 'Comments',
      icon: '🗨️',
      filter: { types: ['comment' as const] },
      color: 'secondary',
    },
  ];

  if (loading) {
    return (
      <div className={`bg-background rounded-lg border border-muted p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface p-4 rounded-lg border border-muted">
                <div className="h-8 bg-muted rounded w-16 mb-2"></div>
                <div className="h-4 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-background p-6 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">{totalContent.toLocaleString()}</div>
          <div className="text-sm text-tertiary">Total Content Items</div>
          <div className="text-xs text-primary mt-1">All types combined</div>
        </div>

        <div className="bg-background p-6 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {analytics?.moderation.pendingReview || 0}
          </div>
          <div className="text-sm text-tertiary">Pending Review</div>
          <div className="text-xs text-warning mt-1">Needs moderation</div>
        </div>

        <div className="bg-background p-6 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {analytics?.overview.totalViews.toLocaleString() || 0}
          </div>
          <div className="text-sm text-tertiary">Total Views</div>
          <div className="text-xs text-success mt-1">All content</div>
        </div>

        <div className="bg-background p-6 rounded-lg border border-muted">
          <div className="text-2xl font-bold text-content">
            {analytics?.overview.averageQualityScore.toFixed(1) || 0}
          </div>
          <div className="text-sm text-tertiary">Avg Quality</div>
          <div className="text-xs text-info mt-1">Out of 10</div>
        </div>
      </div>

      {/* Content Type Breakdown */}
      {analytics?.overview.itemsByType && (
        <div className="bg-background rounded-lg border border-muted p-6">
          <h3 className="text-lg font-semibold text-content mb-4 flex items-center">
            <span className="mr-2">📊</span>
            Content by Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(analytics.overview.itemsByType).map(([type, count]) => {
              const typeIcons = {
                article: '📰',
                user_post: '💬',
                comment: '🗨️',
                prediction: '🔮',
              };

              const typeColors = {
                article: 'info',
                user_post: 'success',
                comment: 'secondary',
                prediction: 'primary',
              };

              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-4 bg-surface rounded-lg border border-muted hover:bg-background transition-colors cursor-pointer"
                  onClick={() => onQuickFilter({ types: [type as any] })}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {typeIcons[type as keyof typeof typeIcons] || '📄'}
                    </span>
                    <div>
                      <div className="font-medium text-content capitalize">
                        {type.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-tertiary">{count as number} items</div>
                    </div>
                  </div>
                  <div
                    className={`text-xs px-2 py-1 rounded bg-${typeColors[type as keyof typeof typeColors] || 'primary'}/10 text-${typeColors[type as keyof typeof typeColors] || 'primary'}`}
                  >
                    {(((count as number) / totalContent) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-background rounded-lg border border-muted p-6">
        <h3 className="text-lg font-semibold text-content mb-4 flex items-center">
          <span className="mr-2">⚡</span>
          Quick Filters
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickFilters.map((filter, index) => (
            <button
              key={index}
              onClick={() => onQuickFilter(filter.filter)}
              className={`flex items-center gap-3 p-4 bg-surface rounded-lg border border-muted hover:bg-background transition-colors group`}
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {filter.icon}
              </span>
              <div className="text-left">
                <div className="font-medium text-content text-sm">{filter.label}</div>
                <div className="text-xs text-tertiary">Click to filter</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Top Tags */}
      {analytics?.trends.topTags && analytics.trends.topTags.length > 0 && (
        <div className="bg-background rounded-lg border border-muted p-6">
          <h3 className="text-lg font-semibold text-content mb-4 flex items-center">
            <span className="mr-2">🏷️</span>
            Trending Tags
          </h3>
          <div className="flex flex-wrap gap-2">
            {analytics.trends.topTags.slice(0, 10).map((tagData, index) => (
              <button
                key={index}
                onClick={() => onQuickFilter({ tags: [tagData.tag] })}
                className="px-3 py-2 bg-surface border border-muted rounded-lg hover:bg-background transition-colors"
              >
                <div className="text-sm font-medium text-content">{tagData.tag}</div>
                <div className="text-xs text-tertiary">{tagData.count} uses</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentOverview;
