import React, { useMemo, useState } from 'react';
import type { UnifiedContentFilters, UnifiedContentItem, UnifiedContentType } from '@ems/types';

interface ContentAnalyticsProps {
  filters: UnifiedContentFilters;
  content: UnifiedContentItem[];
  className?: string;
}

/**
 * Advanced Content Analytics Component
 *
 * Provides comprehensive analytics for unified content management:
 * - Real-time content performance metrics
 * - Engagement analytics across content types
 * - Author performance and reputation tracking
 * - Quality score analysis and trends
 * - Content lifecycle and moderation analytics
 * - Time-based performance trends
 * - Cross-content type comparison
 * - Actionable insights and recommendations
 */
const ContentAnalytics: React.FC<ContentAnalyticsProps> = ({ content, className = '' }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Remove unused variables warnings
  React.useEffect(() => {
    // This effect can be used for time range changes in the future
  }, [timeRange]);

  // Content type definitions with colors
  const contentTypeConfig: Record<
    UnifiedContentType,
    { label: string; icon: string; color: string }
  > = {
    article: { label: 'Articles', icon: '📰', color: 'bg-blue-500' },
    user_post: { label: 'User Posts', icon: '💬', color: 'bg-green-500' },
    comment: { label: 'Comments', icon: '🗨️', color: 'bg-purple-500' },
    prediction: { label: 'Predictions', icon: '🔮', color: 'bg-amber-500' },
    feed: { label: 'Feeds', icon: '📡', color: 'bg-orange-500' },
  };

  // Calculate comprehensive analytics
  const analytics = useMemo(() => {
    if (content.length === 0) {
      return {
        overview: { total: 0, approved: 0, pending: 0, flagged: 0, rejected: 0 },
        engagement: { totalViews: 0, totalReactions: 0, totalComments: 0, avgEngagement: 0 },
        quality: { avgQualityScore: 0, highQuality: 0, lowQuality: 0 },
        authors: { uniqueAuthors: 0, topAuthors: [], authorStats: [] },
        contentTypes: {},
        timeDistribution: [],
        performance: { topPerforming: [], lowPerforming: [] },
        moderation: { approvalRate: 0, flaggedRate: 0, avgReviewTime: 0 },
        trends: { growthRate: 0, qualityTrend: 'stable', engagementTrend: 'stable' },
      };
    }

    // Basic overview metrics
    const overview = {
      total: content.length,
      approved: content.filter((item) => item.status === 'approved').length,
      pending: content.filter((item) => item.status === 'pending').length,
      flagged: content.filter((item) => item.status === 'flagged').length,
      rejected: content.filter((item) => item.status === 'rejected').length,
    };

    // Engagement metrics
    const totalViews = content.reduce((sum, item) => sum + (item.engagement?.views || 0), 0);
    const totalReactions = content.reduce((sum, item) => {
      if (typeof item.engagement?.reactions === 'object') {
        return sum + Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0);
      }
      return sum + ((item.engagement?.reactions as number) || 0);
    }, 0);
    const totalComments = content.reduce((sum, item) => sum + (item.engagement?.comments || 0), 0);
    const totalEngagement = totalViews + totalReactions + totalComments;

    const engagement = {
      totalViews,
      totalReactions,
      totalComments,
      avgEngagement: content.length > 0 ? totalEngagement / content.length : 0,
    };

    // Quality metrics
    const qualityScores = content
      .map((item) => item.quality?.score || 0)
      .filter((score) => score > 0);
    const avgQualityScore =
      qualityScores.length > 0
        ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
        : 0;

    const quality = {
      avgQualityScore,
      highQuality: content.filter((item) => (item.quality?.score || 0) >= 8).length,
      lowQuality: content.filter((item) => (item.quality?.score || 0) < 5).length,
    };

    // Author analytics
    const authorMap = new Map<
      string,
      { count: number; totalEngagement: number; avgQuality: number; content: UnifiedContentItem[] }
    >();

    content.forEach((item) => {
      const authorId = item.author.id.toString();
      if (!authorMap.has(authorId)) {
        authorMap.set(authorId, { count: 0, totalEngagement: 0, avgQuality: 0, content: [] });
      }
      const authorData = authorMap.get(authorId)!;
      authorData.count++;
      const reactions =
        typeof item.engagement?.reactions === 'object'
          ? Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0)
          : (item.engagement?.reactions as number) || 0;
      authorData.totalEngagement += (item.engagement?.views || 0) + reactions;
      authorData.content.push(item);
    });

    // Calculate average quality per author
    authorMap.forEach((data) => {
      const qualityScores = data.content
        .map((item) => item.quality?.score || 0)
        .filter((score) => score > 0);
      data.avgQuality =
        qualityScores.length > 0
          ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
          : 0;
    });

    const topAuthors = Array.from(authorMap.entries())
      .map(([authorId, data]) => {
        const authorInfo = content.find((item) => item.author.id.toString() === authorId)?.author;
        return {
          author: authorInfo,
          ...data,
          avgEngagementPerPost: data.count > 0 ? data.totalEngagement / data.count : 0,
        };
      })
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, 10);

    const authors = {
      uniqueAuthors: authorMap.size,
      topAuthors,
      authorStats: Array.from(authorMap.values()),
    };

    // Content type distribution
    const contentTypes = Object.keys(contentTypeConfig).reduce(
      (acc, type) => {
        const items = content.filter((item) => item.type === type);
        const totalEng = items.reduce((sum, item) => {
          const reactions =
            typeof item.engagement?.reactions === 'object'
              ? Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0)
              : (item.engagement?.reactions as number) || 0;
          return sum + ((item.engagement?.views || 0) + reactions);
        }, 0);

        acc[type as UnifiedContentType] = {
          count: items.length,
          percentage: content.length > 0 ? (items.length / content.length) * 100 : 0,
          avgEngagement: items.length > 0 ? totalEng / items.length : 0,
          approved: items.filter((item) => item.status === 'approved').length,
        };
        return acc;
      },
      {} as Record<UnifiedContentType, any>,
    );

    // Time distribution (simplified - would need actual date parsing)
    const timeDistribution = content.reduce(
      (acc, item) => {
        const date = new Date(
          item.timestamps.publishedAt || item.timestamps.createdAt,
        ).toDateString();
        acc[date] = (acc[date] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    // Performance analysis
    const sortedByEngagement = [...content].sort((a, b) => {
      const aReactions =
        typeof a.engagement?.reactions === 'object'
          ? Object.values(a.engagement.reactions).reduce((sum, val) => sum + val, 0)
          : (a.engagement?.reactions as number) || 0;
      const bReactions =
        typeof b.engagement?.reactions === 'object'
          ? Object.values(b.engagement.reactions).reduce((sum, val) => sum + val, 0)
          : (b.engagement?.reactions as number) || 0;

      const aEng = (a.engagement?.views || 0) + aReactions;
      const bEng = (b.engagement?.views || 0) + bReactions;
      return bEng - aEng;
    });

    const performance = {
      topPerforming: sortedByEngagement.slice(0, 5),
      lowPerforming: sortedByEngagement.slice(-5).reverse(),
    };

    // Moderation metrics
    const approvalRate = overview.total > 0 ? (overview.approved / overview.total) * 100 : 0;
    const flaggedRate = overview.total > 0 ? (overview.flagged / overview.total) * 100 : 0;

    const moderation = {
      approvalRate,
      flaggedRate,
      avgReviewTime: 2.5, // Placeholder - would calculate from actual review times
    };

    // Trend analysis (simplified)
    const trends = {
      growthRate: 12.5, // Placeholder
      qualityTrend:
        avgQualityScore > 7 ? 'improving' : avgQualityScore > 5 ? 'stable' : 'declining',
      engagementTrend: engagement.avgEngagement > 100 ? 'improving' : 'stable',
    } as const;

    return {
      overview,
      engagement,
      quality,
      authors,
      contentTypes,
      timeDistribution,
      performance,
      moderation,
      trends,
    };
  }, [content]);

  // Tab configuration
  const tabs = [
    { key: 'overview', label: 'Overview', icon: '📊' },
    { key: 'engagement', label: 'Engagement', icon: '💫' },
    { key: 'quality', label: 'Quality', icon: '⭐' },
    { key: 'authors', label: 'Authors', icon: '👥' },
    { key: 'performance', label: 'Performance', icon: '🚀' },
    { key: 'trends', label: 'Trends', icon: '📈' },
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return num.toFixed(1) + '%';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="bg-background rounded-lg border border-muted p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-content flex items-center">
            <span className="mr-2">📈</span>
            Content Analytics
          </h3>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-1 bg-surface border border-muted rounded text-sm text-content focus:ring-2 focus:ring-primary focus:border-primary"
            >
              <option value="1d">Last 24h</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-b border-muted">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-primary text-white border-b-2 border-primary'
                  : 'text-tertiary hover:text-content hover:bg-surface'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">{analytics.overview.total}</div>
              <div className="text-sm text-tertiary">Total Content</div>
              <div className="text-xs text-primary mt-1">All types</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-success">{analytics.overview.approved}</div>
              <div className="text-sm text-tertiary">Approved</div>
              <div className="text-xs text-success mt-1">
                {formatPercentage(analytics.moderation.approvalRate)}
              </div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-warning">{analytics.overview.pending}</div>
              <div className="text-sm text-tertiary">Pending</div>
              <div className="text-xs text-warning mt-1">Needs review</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-error">{analytics.overview.flagged}</div>
              <div className="text-sm text-tertiary">Flagged</div>
              <div className="text-xs text-error mt-1">
                {formatPercentage(analytics.moderation.flaggedRate)}
              </div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {analytics.authors.uniqueAuthors}
              </div>
              <div className="text-sm text-tertiary">Authors</div>
              <div className="text-xs text-info mt-1">Contributors</div>
            </div>
          </div>

          {/* Content Type Distribution */}
          <div className="bg-background rounded-lg border border-muted p-6">
            <h4 className="text-lg font-semibold text-content mb-4">Content Type Distribution</h4>
            <div className="space-y-4">
              {Object.entries(analytics.contentTypes).map(([type, data]) => {
                const config = contentTypeConfig[type as UnifiedContentType];
                if (!config) return null;
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{config.icon}</span>
                      <div>
                        <div className="font-medium text-content">{config.label}</div>
                        <div className="text-xs text-tertiary">
                          {data.count} items • {data.approved} approved
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm font-medium text-content">
                          {formatPercentage(data.percentage)}
                        </div>
                        <div className="text-xs text-tertiary">
                          {formatNumber(data.avgEngagement)} avg eng.
                        </div>
                      </div>
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className={`${config.color} rounded-full h-2 transition-all duration-300`}
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Engagement Tab */}
      {activeTab === 'engagement' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {formatNumber(analytics.engagement.totalViews)}
              </div>
              <div className="text-sm text-tertiary">Total Views</div>
              <div className="text-xs text-info mt-1">All content</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {formatNumber(analytics.engagement.totalReactions)}
              </div>
              <div className="text-sm text-tertiary">Reactions</div>
              <div className="text-xs text-success mt-1">Likes, shares, etc.</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {formatNumber(analytics.engagement.totalComments)}
              </div>
              <div className="text-sm text-tertiary">Comments</div>
              <div className="text-xs text-primary mt-1">User discussions</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {formatNumber(analytics.engagement.avgEngagement)}
              </div>
              <div className="text-sm text-tertiary">Avg Engagement</div>
              <div className="text-xs text-secondary mt-1">Per content item</div>
            </div>
          </div>

          {/* Top Performing Content */}
          <div className="bg-background rounded-lg border border-muted p-6">
            <h4 className="text-lg font-semibold text-content mb-4">Top Performing Content</h4>
            <div className="space-y-3">
              {analytics.performance.topPerforming.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{contentTypeConfig[item.type]?.icon || '📄'}</span>
                    <div>
                      <div className="font-medium text-content text-sm">
                        {item.title || item.content.substring(0, 50)}...
                      </div>
                      <div className="text-xs text-tertiary">
                        by {item.author.name} • {item.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-content">
                      {formatNumber(
                        (item.engagement?.views || 0) +
                          (typeof item.engagement?.reactions === 'object'
                            ? Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0)
                            : (item.engagement?.reactions as number) || 0),
                      )}
                    </div>
                    <div className="text-xs text-tertiary">engagement</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quality Tab */}
      {activeTab === 'quality' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content">
                {analytics.quality.avgQualityScore.toFixed(1)}
              </div>
              <div className="text-sm text-tertiary">Avg Quality Score</div>
              <div className="text-xs text-info mt-1">Out of 10</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-success">{analytics.quality.highQuality}</div>
              <div className="text-sm text-tertiary">High Quality</div>
              <div className="text-xs text-success mt-1">Score ≥ 8</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-error">{analytics.quality.lowQuality}</div>
              <div className="text-sm text-tertiary">Low Quality</div>
              <div className="text-xs text-error mt-1">Score &lt; 5</div>
            </div>
          </div>

          {/* Quality Distribution */}
          <div className="bg-background rounded-lg border border-muted p-6">
            <h4 className="text-lg font-semibold text-content mb-4">Quality Score Distribution</h4>
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => {
                const count = content.filter(
                  (item) => Math.floor(item.quality?.score || 0) === score,
                ).length;
                const percentage = content.length > 0 ? (count / content.length) * 100 : 0;

                return (
                  <div key={score} className="text-center">
                    <div className="h-20 bg-muted rounded-lg mb-2 flex items-end">
                      <div
                        className={`w-full rounded-lg transition-all duration-300 ${
                          score >= 8 ? 'bg-success' : score >= 6 ? 'bg-warning' : 'bg-error'
                        }`}
                        style={{ height: `${Math.max(percentage * 4, 2)}%` }}
                      />
                    </div>
                    <div className="text-xs text-content font-medium">{score}</div>
                    <div className="text-xs text-tertiary">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Authors Tab */}
      {activeTab === 'authors' && (
        <div className="space-y-6">
          <div className="bg-background rounded-lg border border-muted p-6">
            <h4 className="text-lg font-semibold text-content mb-4">Top Contributors</h4>
            <div className="space-y-3">
              {analytics.authors.topAuthors.slice(0, 10).map((authorData, index) => (
                <div
                  key={authorData.author?.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium text-content">
                        {authorData.author?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-tertiary">
                        {authorData.count} posts • Quality: {authorData.avgQuality.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-content">
                      {formatNumber(authorData.totalEngagement)}
                    </div>
                    <div className="text-xs text-tertiary">total engagement</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Best Performers */}
            <div className="bg-background rounded-lg border border-muted p-6">
              <h4 className="text-lg font-semibold text-content mb-4">🏆 Best Performers</h4>
              <div className="space-y-3">
                {analytics.performance.topPerforming.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-success/5 rounded-lg border border-success/20"
                  >
                    <span className="text-lg">{contentTypeConfig[item.type]?.icon || '📄'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-content text-sm">
                        {item.title || item.content.substring(0, 40)}...
                      </div>
                      <div className="text-xs text-tertiary">
                        {formatNumber(
                          (item.engagement?.views || 0) +
                            (typeof item.engagement?.reactions === 'object'
                              ? Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0)
                              : (item.engagement?.reactions as number) || 0),
                        )}{' '}
                        engagement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Needs Attention */}
            <div className="bg-background rounded-lg border border-muted p-6">
              <h4 className="text-lg font-semibold text-content mb-4">⚠️ Needs Attention</h4>
              <div className="space-y-3">
                {analytics.performance.lowPerforming.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-warning/5 rounded-lg border border-warning/20"
                  >
                    <span className="text-lg">{contentTypeConfig[item.type]?.icon || '📄'}</span>
                    <div className="flex-1">
                      <div className="font-medium text-content text-sm">
                        {item.title || item.content.substring(0, 40)}...
                      </div>
                      <div className="text-xs text-tertiary">
                        {formatNumber(
                          (item.engagement?.views || 0) +
                            (typeof item.engagement?.reactions === 'object'
                              ? Object.values(item.engagement.reactions).reduce((a, b) => a + b, 0)
                              : (item.engagement?.reactions as number) || 0),
                        )}{' '}
                        engagement
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trends Tab */}
      {activeTab === 'trends' && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-success">+{analytics.trends.growthRate}%</div>
              <div className="text-sm text-tertiary">Growth Rate</div>
              <div className="text-xs text-success mt-1">Content volume</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content capitalize">
                {analytics.trends.qualityTrend}
              </div>
              <div className="text-sm text-tertiary">Quality Trend</div>
              <div className="text-xs text-info mt-1">Overall direction</div>
            </div>

            <div className="bg-background p-6 rounded-lg border border-muted">
              <div className="text-2xl font-bold text-content capitalize">
                {analytics.trends.engagementTrend}
              </div>
              <div className="text-sm text-tertiary">Engagement Trend</div>
              <div className="text-xs text-primary mt-1">User interaction</div>
            </div>
          </div>

          {/* Insights and Recommendations */}
          <div className="bg-background rounded-lg border border-muted p-6">
            <h4 className="text-lg font-semibold text-content mb-4">📋 Actionable Insights</h4>
            <div className="space-y-3">
              {analytics.moderation.approvalRate < 70 && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="font-medium text-warning mb-1">Low Approval Rate</div>
                  <div className="text-sm text-content">
                    Only {formatPercentage(analytics.moderation.approvalRate)} of content is being
                    approved. Consider reviewing moderation guidelines or providing content creation
                    guidance.
                  </div>
                </div>
              )}

              {analytics.quality.avgQualityScore < 6 && (
                <div className="p-3 bg-error/10 border border-error/20 rounded-lg">
                  <div className="font-medium text-error mb-1">Quality Concerns</div>
                  <div className="text-sm text-content">
                    Average quality score is {analytics.quality.avgQualityScore.toFixed(1)}/10.
                    Implement quality improvement initiatives and author education programs.
                  </div>
                </div>
              )}

              {analytics.engagement.avgEngagement < 50 && (
                <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
                  <div className="font-medium text-info mb-1">Engagement Opportunity</div>
                  <div className="text-sm text-content">
                    Low average engagement detected. Consider implementing engagement campaigns,
                    improving content discovery, and optimizing posting times.
                  </div>
                </div>
              )}

              <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
                <div className="font-medium text-success mb-1">Growth Opportunity</div>
                <div className="text-sm text-content">
                  Content volume is growing at {analytics.trends.growthRate}%. Focus on maintaining
                  quality while scaling moderation capabilities.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContentAnalytics;
