// apps/client/src/api/timeline.ts
import api from './axios';
import type {
  TimelineResponse,
  PublicArticle,
  CreateFeedRequest,
  UpdateFeedRequest,
  PublicFeedSource,
  UpdateArticleRequest,
  ArticleModerationData,
  OPMLImportResult,
  FeedStatsResponse,
} from '@ems/types';

/**
 * Timeline API client for Homepage Timeline functionality
 */

// ===============================================
// Public Timeline APIs
// ===============================================

export const timelineApi = {
  /**
   * Get articles timeline with pagination
   */
  getArticles: async (params?: {
    cursor?: string;
    limit?: number;
    status?: string;
    tag?: string;
    sort?: 'newest' | 'oldest';
    search?: string;
  }): Promise<TimelineResponse> => {
    const searchParams = new URLSearchParams();

    // Default parameters
    searchParams.set('status', params?.status || 'APPROVED');
    searchParams.set('limit', String(params?.limit || 30));
    searchParams.set('sort', params?.sort || 'newest');

    // Optional parameters
    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.tag) searchParams.set('tag', params.tag);
    if (params?.search) searchParams.set('search', params.search);

    const response = await api.get(`/api/timeline/articles?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get tweets timeline with pagination
   */
  getTweets: async (params?: { cursor?: string; limit?: number }): Promise<TimelineResponse> => {
    const searchParams = new URLSearchParams();

    searchParams.set('limit', String(params?.limit || 50));
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const response = await api.get(`/api/timeline/tweets?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get full article details for ArticleDrawer
   */
  getArticleDetails: async (articleId: number): Promise<PublicArticle> => {
    const response = await api.get(`/api/timeline/articles/${articleId}`);
    return response.data;
  },

  /**
   * Toggle article reaction (like/dislike/etc)
   */
  toggleReaction: async (
    articleId: number,
    type: string = 'like',
  ): Promise<{
    action: 'added' | 'removed';
    type: string;
    counts: { reactions: number; comments: number };
  }> => {
    const response = await api.post(`/api/timeline/articles/${articleId}/react`, { type });
    return response.data;
  },

  /**
   * Get article reactions
   */
  getReactions: async (
    articleId: number,
  ): Promise<{
    reactions: Record<string, Array<{ id: number; user: any; createdAt: string }>>;
    total: number;
  }> => {
    const response = await api.get(`/api/timeline/articles/${articleId}/reactions`);
    return response.data;
  },

  /**
   * Add comment to article
   */
  addComment: async (
    articleId: number,
    content: string,
  ): Promise<{
    id: number;
    content: string;
    user: { id: number; name: string; avatarUrl?: string };
    createdAt: string;
    updatedAt: string;
  }> => {
    const response = await api.post(`/api/timeline/articles/${articleId}/comments`, { content });
    return response.data;
  },

  /**
   * Get article comments with pagination
   */
  getComments: async (
    articleId: number,
    params?: {
      limit?: number;
      cursor?: string;
    },
  ): Promise<{
    comments: Array<{
      id: number;
      content: string;
      user: { id: number; name: string; avatarUrl?: string };
      createdAt: string;
      updatedAt: string;
    }>;
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params?.limit || 20));
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const response = await api.get(
      `/api/timeline/articles/${articleId}/comments?${searchParams.toString()}`,
    );
    return response.data;
  },

  /**
   * Search timeline content
   */
  search: async (params: {
    query: string;
    filters?: any;
    limit?: number;
    cursor?: string;
  }): Promise<TimelineResponse> => {
    const searchParams = new URLSearchParams();
    searchParams.set('q', params.query);
    searchParams.set('limit', String(params.limit || 30));

    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.filters) searchParams.set('filters', JSON.stringify(params.filters));

    const response = await api.get(`/api/timeline/search?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get search suggestions
   */
  getSearchSuggestions: async (
    query: string,
  ): Promise<{
    suggestions: Array<{
      type: 'article' | 'tag' | 'author' | 'feed';
      value: string;
      count?: number;
    }>;
  }> => {
    const response = await api.get(
      `/api/timeline/search/suggestions?q=${encodeURIComponent(query)}`,
    );
    return response.data;
  },

  /**
   * Get trending content
   */
  getTrending: async (params?: {
    timeRange?: 'hour' | 'day' | 'week' | 'month';
    limit?: number;
    type?: 'articles' | 'posts' | 'all';
  }): Promise<{
    articles: any[];
    posts: any[];
    tags: any[];
    authors: any[];
  }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('timeRange', params?.timeRange || 'day');
    searchParams.set('limit', String(params?.limit || 10));
    searchParams.set('type', params?.type || 'all');

    const response = await api.get(`/api/timeline/trending?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Toggle article bookmark
   */
  toggleBookmark: async (
    articleId: number,
    collectionId?: number,
  ): Promise<{
    action: 'added' | 'removed';
    bookmarkId?: number;
  }> => {
    const response = await api.post(`/api/timeline/articles/${articleId}/bookmark`, {
      collectionId,
    });
    return response.data;
  },

  /**
   * Get user bookmarks
   */
  getBookmarks: async (params?: {
    limit?: number;
    cursor?: string;
    collectionId?: number;
  }): Promise<{
    bookmarks: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> => {
    const searchParams = new URLSearchParams();
    searchParams.set('limit', String(params?.limit || 20));

    if (params?.cursor) searchParams.set('cursor', params.cursor);
    if (params?.collectionId) searchParams.set('collectionId', String(params.collectionId));

    const response = await api.get(`/api/timeline/bookmarks?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Share article
   */
  shareArticle: async (
    articleId: number,
    data: {
      platform: string;
      message?: string;
      targetUsers?: number[];
    },
  ): Promise<{
    shareId: number;
    shareUrl?: string;
  }> => {
    const response = await api.post(`/api/timeline/articles/${articleId}/share`, data);
    return response.data;
  },
};

// ===============================================
// Admin Feed Management APIs
// ===============================================

export const feedsApi = {
  /**
   * Get all feeds with health statistics
   */
  getAllFeeds: async (): Promise<PublicFeedSource[]> => {
    const response = await api.get('/api/admin/feeds');
    return response.data;
  },

  /**
   * Create a new RSS feed
   */
  createFeed: async (feedData: CreateFeedRequest): Promise<PublicFeedSource> => {
    const response = await api.post('/api/admin/feeds', feedData);
    return response.data;
  },

  /**
   * Update an existing feed
   */
  updateFeed: async (feedId: number, updateData: UpdateFeedRequest): Promise<PublicFeedSource> => {
    const response = await api.patch(`/api/admin/feeds/${feedId}`, updateData);
    return response.data;
  },

  /**
   * Delete a feed and all its articles
   */
  deleteFeed: async (feedId: number): Promise<void> => {
    await api.delete(`/api/admin/feeds/${feedId}`);
  },

  /**
   * Get feed statistics and health metrics
   */
  getFeedStats: async (feedId: number): Promise<FeedStatsResponse> => {
    const response = await api.get(`/api/admin/feeds/${feedId}/stats`);
    return response.data;
  },

  /**
   * Manually trigger feed refresh
   */
  refreshFeed: async (feedId: number): Promise<{ status: string }> => {
    const response = await api.post(`/api/admin/feeds/${feedId}/refresh`);
    return response.data;
  },
};

// ===============================================
// Admin Moderation APIs
// ===============================================

export const moderationApi = {
  /**
   * Get articles for moderation queue
   */
  getArticlesForModeration: async (params?: {
    status?: string;
    limit?: number;
    cursor?: string;
  }): Promise<ArticleModerationData[]> => {
    const searchParams = new URLSearchParams();

    searchParams.set('status', params?.status || 'PENDING');
    searchParams.set('limit', String(params?.limit || 50));
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const response = await api.get(`/api/admin/feeds/articles?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Bulk moderate articles (approve/reject)
   */
  bulkModerate: async (data: {
    ids: number[];
    action: 'APPROVED' | 'REJECTED';
    notes?: string;
  }): Promise<{ processed: number }> => {
    const response = await api.post('/api/admin/feeds/moderate', data);
    return response.data;
  },

  /**
   * Bulk retag articles
   */
  bulkRetag: async (data: {
    ids: number[];
    add: string[];
    remove: string[];
  }): Promise<{ processed: number; tagged: number }> => {
    const response = await api.post('/api/admin/feeds/retag', data);
    return response.data;
  },

  /**
   * Update individual article
   */
  updateArticle: async (
    articleId: number,
    updateData: UpdateArticleRequest,
  ): Promise<PublicArticle> => {
    const response = await api.patch(`/api/admin/feeds/articles/${articleId}`, updateData);
    return response.data;
  },
};

// ===============================================
// OPML Import/Export APIs
// ===============================================

export const opmlApi = {
  /**
   * Import OPML feed list file
   */
  importOPML: async (file: File): Promise<OPMLImportResult> => {
    const formData = new FormData();
    formData.append('opml', file);

    const response = await api.post('/api/admin/feeds/import-opml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Export current feeds as OPML file
   */
  exportOPML: async (): Promise<Blob> => {
    const response = await api.get('/api/admin/feeds/export-opml', {
      responseType: 'blob',
    });
    return response.data;
  },
};

// ===============================================
// Combined API object for easy imports
// ===============================================

export const timelineAPIs = {
  timeline: timelineApi,
  feeds: feedsApi,
  moderation: moderationApi,
  opml: opmlApi,
};

export default timelineAPIs;
