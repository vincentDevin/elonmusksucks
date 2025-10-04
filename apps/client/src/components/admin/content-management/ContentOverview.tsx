import React, { useEffect, useState } from 'react';
import type { UnifiedContentFilters, UnifiedContentAnalytics } from '@ems/types';
import * as unifiedContentAPI from '../../../api/unifiedContent';

interface ContentOverviewProps {
  totalContent: number;
  selectedFilters: UnifiedContentFilters;
  className?: string;
}

/**
 * Content Overview Component
 *
 * Displays high-level statistics and quick action buttons for content management.
 * Shows analytics, content type breakdown, and provides quick filter options.
 */
const ContentOverview: React.FC<ContentOverviewProps> = ({ totalContent, className = '' }) => {
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

  if (loading) {
    return (
      <div className={`bg-background rounded-lg border border-muted p-4 ${className}`}>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-surface p-3 rounded-lg border border-muted">
                <div className="h-6 bg-muted rounded w-16 mb-2"></div>
                <div className="h-3 bg-muted rounded w-24"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-background p-3 rounded-lg border border-muted text-center">
          <div className="text-lg font-bold text-content">{totalContent.toLocaleString()}</div>
          <div className="text-xs text-tertiary">Total Content Items</div>
          <div className="text-xs text-primary mt-1">All types combined</div>
        </div>

        <div className="bg-background p-3 rounded-lg border border-muted text-center">
          <div className="text-lg font-bold text-content">
            {analytics?.moderation.pendingReview || 0}
          </div>
          <div className="text-xs text-tertiary">Pending Review</div>
          <div className="text-xs text-warning mt-1">Needs moderation</div>
        </div>

        <div className="bg-background p-3 rounded-lg border border-muted text-center">
          <div className="text-lg font-bold text-content">
            {analytics?.overview.totalViews.toLocaleString() || 0}
          </div>
          <div className="text-xs text-tertiary">Total Views</div>
          <div className="text-xs text-success mt-1">All content</div>
        </div>

        <div className="bg-background p-3 rounded-lg border border-muted text-center">
          <div className="text-lg font-bold text-content">
            {analytics?.overview.averageQualityScore.toFixed(1) || 0}
          </div>
          <div className="text-xs text-tertiary">Avg Quality</div>
          <div className="text-xs text-info mt-1">Out of 10</div>
        </div>
      </div>

      {/* Moderation Status Breakdown */}
      {analytics?.overview.itemsByStatus && (
        <div className="bg-background rounded-lg border border-muted p-4">
          <h3 className="text-sm font-semibold text-content mb-3 flex items-center">
            <span className="mr-2">🛡️</span>
            Moderation Status
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(analytics.overview.itemsByStatus).map(([status, count]) => {
              const statusIcons = {
                pending: '⏳',
                approved: '✅',
                rejected: '❌',
                flagged: '🚩',
                deleted: '🗑️',
                draft: '📝',
              };

              const statusColors: Record<string, string> = {
                pending: 'text-warning',
                approved: 'text-success',
                rejected: 'text-error',
                flagged: 'text-error',
                deleted: 'text-tertiary',
                draft: 'text-info',
              };

              // Skip if count is 0
              if ((count as number) === 0) return null;

              const colorClass = statusColors[status] || 'text-content';

              return (
                <div
                  key={status}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg border border-muted"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {statusIcons[status as keyof typeof statusIcons] || '📄'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-content capitalize">
                        {status.replace('_', ' ')}
                      </div>
                      <div className={`text-xs font-semibold ${colorClass}`}>
                        {count as number} items
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content Type Breakdown */}
      {analytics?.overview.itemsByType && (
        <div className="bg-background rounded-lg border border-muted p-4">
          <h3 className="text-sm font-semibold text-content mb-3 flex items-center">
            <span className="mr-2">📊</span>
            Content by Type
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(analytics.overview.itemsByType).map(([type, count]) => {
              const typeIcons = {
                article: '📰',
                user_post: '💬',
                comment: '🗨️',
                prediction: '🔮',
              };

              const typeColors: Record<string, string> = {
                article: 'text-info',
                user_post: 'text-success',
                comment: 'text-secondary',
                prediction: 'text-primary',
              };

              const colorClass = typeColors[type] || 'text-content';

              return (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg border border-muted"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {typeIcons[type as keyof typeof typeIcons] || '📄'}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-content capitalize">
                        {type.replace('_', ' ')}
                      </div>
                      <div className={`text-xs font-semibold ${colorClass}`}>
                        {count as number} items
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded bg-muted text-tertiary">
                    {(((count as number) / totalContent) * 100).toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentOverview;
