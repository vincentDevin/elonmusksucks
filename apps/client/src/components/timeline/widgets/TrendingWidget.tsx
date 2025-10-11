import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FireIcon,
  ArrowTrendingUpIcon,
  ChatBubbleLeftRightIcon,
  HeartIcon,
  SparklesIcon,
  HashtagIcon,
} from '@heroicons/react/24/outline';
import { FireIcon as FireIconSolid } from '@heroicons/react/24/solid';
import type { TrendingItem } from '@ems/types';
import { timelineApi } from '../../../api/timeline';
import api from '../../../api/axios';

interface TrendingHashtag {
  id: number;
  tag: string;
  usageCount: number;
  trendingScore?: number;
}

interface TrendingWidgetProps {
  timeRange?: 'hour' | 'day' | 'week' | 'month';
  limit?: number;
  className?: string;
  onItemClick?: (item: TrendingItem) => void;
  onHashtagClick?: (tag: string) => void;
  isExpanded?: boolean;
}

type TabType = 'content' | 'hashtags';

export const TrendingWidget: React.FC<TrendingWidgetProps> = ({
  timeRange = 'day',
  limit = 5,
  className = '',
  onItemClick,
  onHashtagClick,
  isExpanded = true, // Default to true for backwards compatibility
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('content');
  const [contentItems, setContentItems] = useState<TrendingItem[]>([]);
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHydratedContent, setHasHydratedContent] = useState(false);
  const [hasHydratedHashtags, setHasHydratedHashtags] = useState(false);

  // Fetch trending content
  const fetchTrendingContent = useCallback(async () => {
    try {
      const data = await timelineApi.getTrending({
        timeRange,
        limit,
        type: 'all',
      });
      setContentItems(data.items || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching trending content:', err);
      setError('Failed to load trending content');
    }
  }, [timeRange, limit]);

  // Fetch trending hashtags
  const fetchTrendingHashtags = useCallback(async () => {
    try {
      const response = await api.get<TrendingHashtag[]>(
        `/api/posts/hashtags/trending?limit=${limit}`,
      );
      setHashtags(response.data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch trending hashtags:', err);
      setError('Failed to load trending topics');
    }
  }, [limit]);

  // Fetch data based on active tab
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (activeTab === 'content') {
      await fetchTrendingContent();
      setHasHydratedContent(true);
    } else {
      await fetchTrendingHashtags();
      setHasHydratedHashtags(true);
    }

    setLoading(false);
  }, [activeTab, fetchTrendingContent, fetchTrendingHashtags]);

  // Lazy load: Only fetch data when widget is expanded and tab hasn't been hydrated
  useEffect(() => {
    if (!isExpanded) return;

    const needsHydration =
      (activeTab === 'content' && !hasHydratedContent) ||
      (activeTab === 'hashtags' && !hasHydratedHashtags);

    if (needsHydration) {
      fetchData();
    }
  }, [isExpanded, activeTab, hasHydratedContent, hasHydratedHashtags, fetchData]);

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

  return (
    <div className={`bg-surface rounded-lg shadow ${className}`}>
      {/* Header with Tabs */}
      <div className={`p-4 ${isExpanded ? 'border-b border-border' : ''}`}>
        <div className={`flex items-center space-x-2 ${isExpanded ? 'mb-3' : ''}`}>
          <FireIcon className="w-5 h-5 text-error" />
          <h3 className="font-semibold text-content">Trending Now</h3>
        </div>

        {/* Tabs - Only show when expanded */}
        {isExpanded && (
          <div className="flex space-x-1 bg-muted/30 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('content')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === 'content'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-tertiary hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1">
                <FireIcon className="w-3.5 h-3.5" />
                <span>Content</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('hashtags')}
              className={`flex-1 px-3 py-1.5 text-xs rounded-md transition-colors ${
                activeTab === 'hashtags'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-tertiary hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center justify-center space-x-1">
                <HashtagIcon className="w-3.5 h-3.5" />
                <span>Topics</span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Content Area - Only show when expanded */}
      {isExpanded && (
        <div className="p-4">
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded mb-1"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-4 text-tertiary">
              <p className="text-sm">{error}</p>
              <button onClick={fetchData} className="mt-2 text-xs text-primary hover:underline">
                Try again
              </button>
            </div>
          ) : activeTab === 'content' ? (
            // Trending Content View
            <>
              {contentItems.length === 0 ? (
                <div className="text-center py-4 text-tertiary">
                  <FireIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trending content</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {contentItems.map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      className="w-full text-left hover:bg-primary/10 p-2 -mx-2 rounded transition-colors"
                    >
                      <div className="flex items-start space-x-2">
                        {index === 0 ? (
                          <FireIconSolid className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
                        ) : (
                          <span className="text-tertiary font-medium text-sm flex-shrink-0">
                            {index + 1}
                          </span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-content truncate">{item.title}</p>
                          <div className="flex items-center space-x-2 text-xs text-tertiary mt-1">
                            <span>{formatTimeAgo(item.timestamp)}</span>
                            <span>•</span>
                            <div className="flex items-center space-x-1">
                              <HeartIcon className="w-3 h-3" />
                              <span>{formatNumber(item.engagement.reactions)}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <ChatBubbleLeftRightIcon className="w-3 h-3" />
                              <span>{formatNumber(item.engagement.comments)}</span>
                            </div>
                            {getTrendIcon(item.trendingChange)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Link
                to="/timeline"
                className="block mt-3 text-xs text-primary hover:text-primary/80 transition-colors text-center"
              >
                View all trending →
              </Link>
            </>
          ) : (
            // Trending Hashtags View
            <>
              {hashtags.length === 0 ? (
                <div className="text-center py-4 text-tertiary">
                  <HashtagIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trending topics</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {hashtags.map((hashtag, index) => (
                    <button
                      key={hashtag.id}
                      onClick={() => onHashtagClick?.(hashtag.tag)}
                      className="w-full text-left group hover:bg-muted/10 rounded-lg p-2 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-tertiary text-sm">{index + 1}.</span>
                            <span className="font-medium text-primary group-hover:underline">
                              #{hashtag.tag}
                            </span>
                          </div>
                          <div className="mt-1">
                            <span className="text-xs text-tertiary">
                              {hashtag.trendingScore
                                ? `${hashtag.trendingScore} posts this week`
                                : `${hashtag.usageCount} total posts`}
                            </span>
                          </div>
                        </div>
                        {hashtag.trendingScore && hashtag.trendingScore > 10 && (
                          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                            🔥 Hot
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Link
                to="/timeline"
                className="block mt-3 text-xs text-primary hover:text-primary/80 transition-colors text-center"
              >
                View all topics →
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TrendingWidget;
