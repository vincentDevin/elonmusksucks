// apps/client/src/api/feeds.ts
import api from './axios';
import type {
  PublicFeedSource,
  CreateFeedRequest,
  UpdateFeedRequest,
  FeedStatsResponse,
  ArticleModerationData,
} from '@ems/types';

/** — RSS Feeds Management — **/

// List all feeds
export async function listFeeds(): Promise<PublicFeedSource[]> {
  const res = await api.get<PublicFeedSource[]>('/api/admin/feeds');
  return res.data;
}

// Get feed statistics
export async function getFeedStats(): Promise<FeedStatsResponse[]> {
  const res = await api.get<FeedStatsResponse[]>('/api/admin/feeds/stats');
  return res.data;
}

// Create new feed
export async function createFeed(data: CreateFeedRequest): Promise<PublicFeedSource> {
  const res = await api.post<PublicFeedSource>('/api/admin/feeds', data);
  return res.data;
}

// Update feed
export async function updateFeed(
  feedId: number,
  data: UpdateFeedRequest,
): Promise<PublicFeedSource> {
  const res = await api.patch<PublicFeedSource>(`/api/admin/feeds/${feedId}`, data);
  return res.data;
}

// Delete feed
export async function deleteFeed(feedId: number): Promise<void> {
  await api.delete(`/api/admin/feeds/${feedId}`);
}

// Refresh feed manually
export async function refreshFeed(
  feedId: number,
): Promise<{ message: string; feedId: number; feedName: string }> {
  const res = await api.post<{ message: string; feedId: number; feedName: string }>(
    `/api/admin/feeds/${feedId}/refresh`,
  );
  return res.data;
}

/** — Content Moderation — **/

// Get articles for moderation
export async function getArticlesForModeration(params: {
  status?: string;
  limit?: number;
  offset?: number;
  search?: string;
  feedId?: string;
}): Promise<
  | ArticleModerationData[]
  | { articles: ArticleModerationData[]; total: number; page: number; totalPages: number }
> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.offset) queryParams.append('offset', params.offset.toString());
  if (params.search) queryParams.append('search', params.search);
  if (params.feedId) queryParams.append('feedId', params.feedId);

  const res = await api.get(`/api/admin/feeds/articles?${queryParams}`);
  return res.data;
}

// Bulk moderation
export async function bulkModerateArticles(data: {
  ids: number[];
  action: 'APPROVED' | 'REJECTED';
  notes?: string;
}): Promise<{ processed: number; action: string; message: string }> {
  const res = await api.post<{ processed: number; action: string; message: string }>(
    '/api/admin/feeds/moderate',
    data,
  );
  return res.data;
}

// Bulk retagging
export async function bulkRetagArticles(data: {
  ids: number[];
  add: string[];
  remove: string[];
}): Promise<{ processed: number; tagged: number; message: string }> {
  const res = await api.post<{ processed: number; tagged: number; message: string }>(
    '/api/admin/feeds/retag',
    data,
  );
  return res.data;
}
