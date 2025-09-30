import React, { useState, useEffect, useCallback } from 'react';
import {
  FireIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  ArrowPathIcon,
  ChevronRightIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';

interface TrendingItem {
  id: string;
  type: 'article' | 'post';
  title: string;
  excerpt?: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
  };
  engagement: {
    views: number;
    reactions: number;
    comments: number;
    shares: number;
    score: number; // Trending score calculation
  };
  timestamp: string;
  tags?: string[];
  mediaUrl?: string;
  trendingRank?: number;
  trendingChange?: 'up' | 'down' | 'same' | 'new';
}

interface TrendingContentProps {
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  onItemClick?: (item: TrendingItem) => void;
  className?: string;
  variant?: 'full' | 'compact' | 'sidebar';
}

export const TrendingContent: React.FC<TrendingContentProps> = ({
  timeRange = 'day',
  limit = 10,
  onItemClick,
  className = '',
  variant = 'full',
}) => {
  const [items, setItems] = useState<TrendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for development
  const getMockTrendingItems = (): TrendingItem[] => {
    return [
      {
        id: '1',
        type: 'article' as const,
        title: 'Breaking: Major Update to Platform Prediction System',
        excerpt:
          'The platform has announced significant improvements to its prediction market algorithm...',
        author: { id: '1', name: 'Sarah Johnson', avatar: undefined },
        engagement: {
          views: 15234,
          reactions: 892,
          comments: 234,
          shares: 156,
          score: 9850,
        },
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        tags: ['announcement', 'platform-update'],
        trendingRank: 1,
        trendingChange: 'up' as const,
      },
      {
        id: '2',
        type: 'post' as const,
        title: 'Community Discussion: Best Prediction Strategies',
        author: { id: '2', name: 'Mike Chen', avatar: undefined },
        engagement: {
          views: 8923,
          reactions: 567,
          comments: 189,
          shares: 78,
          score: 7230,
        },
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        tags: ['strategy', 'community'],
        trendingRank: 2,
        trendingChange: 'new' as const,
      },
      {
        id: '3',
        type: 'article' as const,
        title: 'Analysis: Q4 Market Trends and Predictions',
        excerpt: 'An in-depth look at the trends shaping prediction markets this quarter...',
        author: { id: '3', name: 'Emily Rodriguez', avatar: undefined },
        engagement: {
          views: 7456,
          reactions: 423,
          comments: 98,
          shares: 234,
          score: 6890,
        },
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        tags: ['analysis', 'market-trends'],
        trendingRank: 3,
        trendingChange: 'down' as const,
      },
      {
        id: '4',
        type: 'post' as const,
        title: "Achieved 90% prediction accuracy this month! Here's how...",
        author: { id: '4', name: 'Alex Thompson', avatar: undefined },
        engagement: {
          views: 6234,
          reactions: 892,
          comments: 156,
          shares: 45,
          score: 5670,
        },
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
        tags: ['success-story', 'tips'],
        trendingRank: 4,
        trendingChange: 'up' as const,
      },
      {
        id: '5',
        type: 'article' as const,
        title: 'New Feature: Parlay Betting System Explained',
        excerpt: 'Everything you need to know about the new parlay betting features...',
        author: { id: '5', name: 'Platform Team', avatar: undefined },
        engagement: {
          views: 5123,
          reactions: 234,
          comments: 67,
          shares: 89,
          score: 4560,
        },
        timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
        tags: ['feature', 'tutorial'],
        trendingRank: 5,
        trendingChange: 'same' as const,
      },
    ].slice(0, limit);
  };

  // Fetch trending content
  const fetchTrendingContent = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // TODO: Replace with actual API call
      const response = await fetch(
        `/api/timeline/trending?timeRange=${selectedTimeRange}&limit=${limit}`,
      );

      if (!response.ok) {
        throw new Error('Failed to fetch trending content');
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      console.error('Error fetching trending content:', err);
      // Use mock data for now
      setItems(getMockTrendingItems());
    } finally {
      setLoading(false);
    }
  }, [selectedTimeRange, limit]);

  useEffect(() => {
    fetchTrendingContent();
  }, [fetchTrendingContent]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchTrendingContent();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleTimeRangeChange = (range: typeof timeRange) => {
    setSelectedTimeRange(range);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getTrendIcon = (change?: string) => {
    switch (change) {
      case 'up':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-success" />;
      case 'down':
        return <ArrowTrendingUpIcon className="w-4 h-4 text-error transform rotate-180" />;
      case 'new':
        return <SparklesIcon className="w-4 h-4 text-warning" />;
      default:
        return null;
    }
  };

  // Render compact sidebar variant
  if (variant === 'sidebar') {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <FireIcon className="w-5 h-5 text-error" />
            <h3 className="font-semibold text-content">Trending Now</h3>
          </div>
          <button
            onClick={handleRefresh}
            className={`p-1 hover:bg-hover rounded transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <ArrowPathIcon className="w-4 h-4 text-tertiary" />
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-1"></div>
                <div className="h-3 bg-muted rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 5).map((item, index) => (
              <button
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="w-full text-left hover:bg-hover p-2 -mx-2 rounded transition-colors"
              >
                <div className="flex items-start space-x-2">
                  <span className="text-tertiary font-medium text-sm">{index + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-content truncate">{item.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-tertiary mt-1">
                      <span>{formatNumber(item.engagement.score)} points</span>
                      {getTrendIcon(item.trendingChange)}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
          View all trending →
        </button>
      </div>
    );
  }

  // Render full or compact variant
  return (
    <div className={`bg-surface rounded-lg shadow ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <FireIcon className="w-6 h-6 text-error" />
              <h2 className="text-xl font-bold text-content">Trending Content</h2>
            </div>
            {variant === 'full' && (
              <div className="flex items-center space-x-1">
                {(['hour', 'day', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => handleTimeRangeChange(range)}
                    className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                      selectedTimeRange === range
                        ? 'bg-primary text-white'
                        : 'bg-background text-tertiary hover:bg-hover'
                    }`}
                  >
                    {range.charAt(0).toUpperCase() + range.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={handleRefresh}
            className={`p-2 hover:bg-hover rounded-lg transition-colors ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          >
            <ArrowPathIcon className="w-5 h-5 text-tertiary" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            {[...Array(variant === 'compact' ? 3 : 5)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-muted rounded"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-muted rounded mb-2"></div>
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8 text-error">
            <p>{error}</p>
            <button onClick={fetchTrendingContent} className="mt-2 text-primary hover:underline">
              Try again
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <FireIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No trending content available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => onItemClick?.(item)}
                className="w-full text-left group hover:bg-hover p-3 -m-3 rounded-lg transition-colors"
              >
                <div className="flex items-start space-x-3">
                  {/* Rank Badge */}
                  <div className="flex-shrink-0">
                    <div
                      className={`
                      w-10 h-10 rounded-lg flex items-center justify-center font-bold
                      ${
                        item.trendingRank === 1
                          ? 'bg-warning/20 text-warning'
                          : item.trendingRank === 2
                            ? 'bg-tertiary/20 text-tertiary'
                            : item.trendingRank === 3
                              ? 'bg-amber-500/20 text-amber-600'
                              : 'bg-muted text-content'
                      }
                    `}
                    >
                      {item.trendingRank === 1 ? (
                        <FireIconSolid className="w-5 h-5" />
                      ) : (
                        item.trendingRank
                      )}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 mr-2">
                        <h3 className="font-semibold text-content group-hover:text-primary transition-colors">
                          {item.title}
                        </h3>
                        {item.excerpt && variant === 'full' && (
                          <p className="text-sm text-tertiary mt-1 line-clamp-2">{item.excerpt}</p>
                        )}
                        <div className="flex items-center space-x-3 mt-2 text-xs text-tertiary">
                          <span className="font-medium">{item.author.name}</span>
                          <span>•</span>
                          <span>{formatTimeAgo(item.timestamp)}</span>
                          {item.type === 'post' && (
                            <>
                              <span>•</span>
                              <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                            </>
                          )}
                        </div>
                      </div>
                      {getTrendIcon(item.trendingChange)}
                    </div>

                    {/* Engagement Metrics */}
                    <div className="flex items-center space-x-4 mt-3">
                      <div className="flex items-center space-x-1 text-xs text-tertiary">
                        <HeartIcon className="w-3.5 h-3.5" />
                        <span>{formatNumber(item.engagement.reactions)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-tertiary">
                        <ChatBubbleLeftRightIcon className="w-3.5 h-3.5" />
                        <span>{formatNumber(item.engagement.comments)}</span>
                      </div>
                      <div className="flex items-center space-x-1 text-xs text-primary font-medium">
                        <FireIcon className="w-3.5 h-3.5" />
                        <span>{formatNumber(item.engagement.score)}</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {item.tags && item.tags.length > 0 && variant === 'full' && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-muted text-tertiary rounded-full"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Arrow Icon */}
                  <ChevronRightIcon className="w-4 h-4 text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* View More */}
        {!loading && items.length >= limit && variant !== 'compact' && (
          <div className="mt-4 pt-4 border-t border-border text-center">
            <button className="text-sm text-primary hover:text-primary/80 transition-colors">
              View all trending content →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendingContent;
