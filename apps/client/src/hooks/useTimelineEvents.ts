// apps/client/src/hooks/useTimelineEvents.ts
// -----------------------------------------------------------------------------
// Timeline and content events integration with real-time article updates
// Handles new articles, feed updates, content approvals, and timeline refresh
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';

// Timeline article interface
export interface TimelineArticle {
  id: string;
  title: string;
  url: string;
  summary?: string;
  publishedAt: string;
  feedName: string;
  feedSource: string;
  category?: string;
  tags: string[];
  imageUrl?: string;
  isNew: boolean;
  isApproved: boolean;
  isPinned: boolean;
  engagementScore?: number;
  relatedPredictions?: Array<{
    id: number;
    title: string;
    odds: number;
  }>;
}

// Content update notification interface
export interface ContentNotification {
  id: string;
  type: 'new_article' | 'feed_update' | 'article_approved' | 'article_rejected' | 'breaking_news';
  title: string;
  description: string;
  timestamp: string;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: {
    articleId?: string;
    feedName?: string;
    category?: string;
    tags?: string[];
  };
}

// Feed source interface
export interface FeedSource {
  id: string;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetched?: string;
  articleCount: number;
  reliability: number; // 0-100 score
  avgEngagement: number;
}

// Timeline metrics interface
export interface TimelineMetrics {
  totalArticles: number;
  articlesThisWeek: number;
  topCategories: Array<{
    category: string;
    count: number;
    growth: number;
  }>;
  feedPerformance: Array<{
    feedName: string;
    articles: number;
    engagement: number;
    reliability: number;
  }>;
  userInteractions: {
    articlesRead: number;
    articlesShared: number;
    predictionsCreated: number;
  };
}

export function useTimelineEvents() {
  const { subscribe } = useEventBusCore();
  const { user } = useAuth();
  const [timelineArticles, setTimelineArticles] = useState<TimelineArticle[]>([]);
  const [contentNotifications, setContentNotifications] = useState<ContentNotification[]>([]);
  const [feedSources, setFeedSources] = useState<FeedSource[]>([]);
  const [metrics, setMetrics] = useState<TimelineMetrics>({
    totalArticles: 0,
    articlesThisWeek: 0,
    topCategories: [],
    feedPerformance: [],
    userInteractions: {
      articlesRead: 0,
      articlesShared: 0,
      predictionsCreated: 0,
    },
  });

  // Clear content notification
  const clearNotification = useCallback((notificationId: string) => {
    setContentNotifications((prev) => prev.filter((notif) => notif.id !== notificationId));
  }, []);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setContentNotifications([]);
  }, []);

  // Add content notification helper
  const addNotification = useCallback((notification: Omit<ContentNotification, 'id'>) => {
    const notificationWithId: ContentNotification = {
      ...notification,
      id: `${notification.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    setContentNotifications((prev) => [notificationWithId, ...prev.slice(0, 29)]); // Keep max 30 notifications
  }, []);

  // Update metrics helper
  const updateMetrics = useCallback((updates: Partial<TimelineMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...updates }));
  }, []);

  // Mark article as read
  const markArticleAsRead = useCallback(
    (articleId: string) => {
      setTimelineArticles((prev) =>
        prev.map((article) => (article.id === articleId ? { ...article, isNew: false } : article)),
      );

      // Update user interaction metrics
      updateMetrics({
        userInteractions: {
          ...metrics.userInteractions,
          articlesRead: metrics.userInteractions.articlesRead + 1,
        },
      });
    },
    [metrics.userInteractions, updateMetrics],
  );

  // Get articles by category
  const getArticlesByCategory = useCallback(
    (category: string) => {
      return timelineArticles.filter((article) => article.category === category);
    },
    [timelineArticles],
  );

  // Get breaking news articles
  const getBreakingNews = useCallback(() => {
    return timelineArticles.filter(
      (article) => article.isPinned || (article.engagementScore && article.engagementScore > 80),
    );
  }, [timelineArticles]);

  useEffect(() => {
    const unsubscribers = [
      // New timeline articles
      subscribe(REDIS_CHANNELS.TIMELINE_ARTICLES_NEW, (payload: any) => {
        console.log('[TimelineEvents] New timeline articles:', payload);

        if (payload.articles && Array.isArray(payload.articles)) {
          const newArticles: TimelineArticle[] = payload.articles.map((article: any) => ({
            id: article.id,
            title: article.title,
            url: article.url,
            summary: article.summary,
            publishedAt: article.publishedAt,
            feedName: article.feedName,
            feedSource: article.feedSource,
            category: article.category,
            tags: article.tags || [],
            imageUrl: article.imageUrl,
            isNew: true,
            isApproved: article.isApproved || false,
            isPinned: article.isPinned || false,
            engagementScore: article.engagementScore,
            relatedPredictions: article.relatedPredictions || [],
          }));

          setTimelineArticles((prev) => {
            // Remove duplicates and add new articles
            const existingIds = new Set(prev.map((a) => a.id));
            const uniqueNewArticles = newArticles.filter((a) => !existingIds.has(a.id));

            return [...uniqueNewArticles, ...prev].slice(0, 200); // Keep max 200 articles
          });

          // Add notification for high-impact articles
          const highImpactArticles = newArticles.filter(
            (article) =>
              article.isPinned || (article.engagementScore && article.engagementScore > 70),
          );

          if (highImpactArticles.length > 0) {
            addNotification({
              type: 'breaking_news',
              title: '🚨 Breaking News',
              description: `${highImpactArticles.length} high-impact article(s) just published`,
              timestamp: new Date().toISOString(),
              priority: 'high',
              actionUrl: '/timeline',
              metadata: {
                category: 'breaking',
                tags: ['breaking', 'urgent'],
              },
            });
          } else if (newArticles.length > 0) {
            addNotification({
              type: 'new_article',
              title: `📰 ${newArticles.length} New Article${newArticles.length > 1 ? 's' : ''}`,
              description: `Fresh content from ${[...new Set(newArticles.map((a) => a.feedName))].join(', ')}`,
              timestamp: new Date().toISOString(),
              priority: 'medium',
              actionUrl: '/timeline',
            });
          }

          // Update metrics
          updateMetrics({
            totalArticles: metrics.totalArticles + newArticles.length,
            articlesThisWeek: metrics.articlesThisWeek + newArticles.length,
          });
        }
      }),

      // New feed articles
      subscribe(REDIS_CHANNELS.FEED_ARTICLE_NEW, (payload: any) => {
        console.log('[TimelineEvents] New feed article:', payload);

        const newArticle: TimelineArticle = {
          id: payload.id,
          title: payload.title,
          url: payload.url,
          summary: payload.summary,
          publishedAt: payload.publishedAt,
          feedName: payload.feedName,
          feedSource: payload.feedSource,
          category: payload.category,
          tags: payload.tags || [],
          imageUrl: payload.imageUrl,
          isNew: true,
          isApproved: false, // Newly fetched articles need approval
          isPinned: false,
          engagementScore: payload.engagementScore,
          relatedPredictions: payload.relatedPredictions || [],
        };

        setTimelineArticles((prev) => {
          // Check for duplicates
          const exists = prev.some((article) => article.id === newArticle.id);
          if (exists) return prev;

          return [newArticle, ...prev.slice(0, 199)]; // Keep max 200 articles
        });
      }),

      // Article approval status
      subscribe(REDIS_CHANNELS.FEED_ARTICLE_APPROVED, (payload: any) => {
        console.log('[TimelineEvents] Article approved:', payload);

        setTimelineArticles((prev) =>
          prev.map((article) =>
            article.id === payload.articleId
              ? { ...article, isApproved: true, isNew: true }
              : article,
          ),
        );

        addNotification({
          type: 'article_approved',
          title: '✅ Article Approved',
          description: `"${payload.title}" is now live on the timeline`,
          timestamp: payload.timestamp,
          priority: 'low',
          actionUrl: `/timeline?article=${payload.articleId}`,
          metadata: {
            articleId: payload.articleId,
            category: payload.category,
          },
        });
      }),

      // Article rejection status
      subscribe(REDIS_CHANNELS.FEED_ARTICLE_REJECTED, (payload: any) => {
        console.log('[TimelineEvents] Article rejected:', payload);

        // Remove rejected articles from timeline
        setTimelineArticles((prev) => prev.filter((article) => article.id !== payload.articleId));
      }),

      // New feed sources
      subscribe(REDIS_CHANNELS.FEED_SOURCE_CREATED, (payload: any) => {
        console.log('[TimelineEvents] New feed source created:', payload);

        const newFeedSource: FeedSource = {
          id: payload.id,
          name: payload.name,
          url: payload.url,
          category: payload.category,
          isActive: payload.isActive || true,
          lastFetched: payload.lastFetched,
          articleCount: 0,
          reliability: 50, // Default reliability score
          avgEngagement: 0,
        };

        setFeedSources((prev) => [newFeedSource, ...prev]);

        addNotification({
          type: 'feed_update',
          title: '📡 New Feed Source',
          description: `"${payload.name}" added to ${payload.category} category`,
          timestamp: payload.timestamp,
          priority: 'low',
          metadata: {
            feedName: payload.name,
            category: payload.category,
          },
        });
      }),

      // Feed source updates
      subscribe(REDIS_CHANNELS.FEED_SOURCE_UPDATED, (payload: any) => {
        console.log('[TimelineEvents] Feed source updated:', payload);

        setFeedSources((prev) =>
          prev.map((feed) => (feed.id === payload.id ? { ...feed, ...payload.updates } : feed)),
        );
      }),

      // Feed source deletion
      subscribe(REDIS_CHANNELS.FEED_SOURCE_DELETED, (payload: any) => {
        console.log('[TimelineEvents] Feed source deleted:', payload);

        setFeedSources((prev) => prev.filter((feed) => feed.id !== payload.id));

        // Remove articles from deleted feed
        setTimelineArticles((prev) => prev.filter((article) => article.feedSource !== payload.id));
      }),

      // New tweets (if integrated)
      subscribe(REDIS_CHANNELS.FEED_TWEET_NEW, (payload: any) => {
        console.log('[TimelineEvents] New tweet:', payload);

        // Convert tweet to article format for unified timeline
        const tweetArticle: TimelineArticle = {
          id: `tweet-${payload.id}`,
          title: payload.text.substring(0, 100) + (payload.text.length > 100 ? '...' : ''),
          url: payload.url,
          summary: payload.text,
          publishedAt: payload.createdAt,
          feedName: 'Twitter',
          feedSource: 'twitter',
          category: 'social',
          tags: payload.hashtags || [],
          imageUrl: payload.mediaUrl,
          isNew: true,
          isApproved: true, // Auto-approve tweets for now
          isPinned: false,
          engagementScore: payload.engagementScore,
        };

        setTimelineArticles((prev) => [tweetArticle, ...prev.slice(0, 199)]);
      }),

      // Tweet hidden (moderation)
      subscribe(REDIS_CHANNELS.FEED_TWEET_HIDDEN, (payload: any) => {
        console.log('[TimelineEvents] Tweet hidden:', payload);

        setTimelineArticles((prev) =>
          prev.filter((article) => article.id !== `tweet-${payload.id}`),
        );
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, addNotification, updateMetrics, metrics]);

  // Get unread articles count
  const unreadCount = timelineArticles.filter((article) => article.isNew).length;

  // Get articles from last 24 hours
  const recentArticles = timelineArticles.filter((article) => {
    const articleTime = new Date(article.publishedAt).getTime();
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    return articleTime > dayAgo;
  });

  // Get approved articles only
  const approvedArticles = timelineArticles.filter((article) => article.isApproved);

  return {
    timelineArticles: approvedArticles, // Only return approved articles for public consumption
    allArticles: timelineArticles, // All articles for admin/moderation
    contentNotifications,
    feedSources,
    metrics,
    unreadCount,
    recentArticles,
    clearNotification,
    clearAllNotifications,
    markArticleAsRead,
    getArticlesByCategory,
    getBreakingNews,
    addNotification, // For manual testing/debugging
  };
}
