// apps/client/src/api/timeline.ts
import axios from './axios';
import type {
  TimelineResponse,
  PublicArticle,
  CreateFeedRequest,
  UpdateFeedRequest,
  PublicFeedSource,
  UpdateArticleRequest,
  ArticleModerationData,
  OPMLImportResult,
  FeedStatsResponse
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

    const response = await axios.get(`/timeline/articles?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get tweets timeline with pagination
   */
  getTweets: async (params?: {
    cursor?: string;
    limit?: number;
  }): Promise<TimelineResponse> => {
    const searchParams = new URLSearchParams();
    
    searchParams.set('limit', String(params?.limit || 50));
    if (params?.cursor) searchParams.set('cursor', params.cursor);

    const response = await axios.get(`/timeline/tweets?${searchParams.toString()}`);
    return response.data;
  },

  /**
   * Get full article details for ArticleDrawer
   */
  getArticleDetails: async (articleId: number): Promise<PublicArticle> => {
    const response = await axios.get(`/articles/${articleId}`);
    return response.data;
  }
};

// ===============================================
// Admin Feed Management APIs
// ===============================================

export const feedsApi = {
  /**
   * Get all feeds with health statistics
   */
  getAllFeeds: async (): Promise<PublicFeedSource[]> => {
    const response = await axios.get('/admin/feeds');
    return response.data;
  },

  /**
   * Create a new RSS feed
   */
  createFeed: async (feedData: CreateFeedRequest): Promise<PublicFeedSource> => {
    const response = await axios.post('/admin/feeds', feedData);
    return response.data;
  },

  /**
   * Update an existing feed
   */
  updateFeed: async (feedId: number, updateData: UpdateFeedRequest): Promise<PublicFeedSource> => {
    const response = await axios.patch(`/admin/feeds/${feedId}`, updateData);
    return response.data;
  },

  /**
   * Delete a feed and all its articles
   */
  deleteFeed: async (feedId: number): Promise<void> => {
    await axios.delete(`/admin/feeds/${feedId}`);
  },

  /**
   * Get feed statistics and health metrics
   */
  getFeedStats: async (feedId: number): Promise<FeedStatsResponse> => {
    const response = await axios.get(`/admin/feeds/${feedId}/stats`);
    return response.data;
  },

  /**
   * Manually trigger feed refresh
   */
  refreshFeed: async (feedId: number): Promise<{ status: string }> => {
    const response = await axios.post(`/admin/feeds/${feedId}/refresh`);
    return response.data;
  }
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

    const response = await axios.get(`/admin/articles?${searchParams.toString()}`);
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
    const response = await axios.post('/admin/moderate', data);
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
    const response = await axios.post('/admin/retag', data);
    return response.data;
  },

  /**
   * Update individual article
   */
  updateArticle: async (articleId: number, updateData: UpdateArticleRequest): Promise<PublicArticle> => {
    const response = await axios.patch(`/admin/articles/${articleId}`, updateData);
    return response.data;
  }
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

    const response = await axios.post('/admin/feeds/import-opml', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  /**
   * Export current feeds as OPML file
   */
  exportOPML: async (): Promise<Blob> => {
    const response = await axios.get('/admin/feeds/export-opml', {
      responseType: 'blob'
    });
    return response.data;
  }
};

// ===============================================
// Combined API object for easy imports
// ===============================================

export const timelineAPIs = {
  timeline: timelineApi,
  feeds: feedsApi,
  moderation: moderationApi,
  opml: opmlApi
};

export default timelineAPIs;