import type { FeedView, FeedStatus, FeedsListResponse } from '@ems/types';

/**
 * Maps feed data to standardized FeedView DTO
 * Converts Date → ISO string for all timestamp fields
 */
export const toFeedView = (feed: {
  id: number;
  name: string;
  url: string;
  siteUrl: string | null;
  status: string;
  allowImages: boolean;
  lastFetchedAt: Date | null;
  lastSuccessAt: Date | null;
  lastErrorAt: Date | null;
  lastErrorMsg: string | null;
  fetchCount: number;
  errorCount: number;
  createdAt: Date;
  updatedAt: Date;
}): FeedView => ({
  id: feed.id,
  name: feed.name,
  url: feed.url,
  siteUrl: feed.siteUrl,
  status: feed.status as FeedStatus,
  allowImages: feed.allowImages,
  lastFetchedAt: feed.lastFetchedAt ? feed.lastFetchedAt.toISOString() : null,
  lastSuccessAt: feed.lastSuccessAt ? feed.lastSuccessAt.toISOString() : null,
  lastErrorAt: feed.lastErrorAt ? feed.lastErrorAt.toISOString() : null,
  lastErrorMsg: feed.lastErrorMsg,
  fetchCount: feed.fetchCount,
  errorCount: feed.errorCount,
  createdAt: feed.createdAt.toISOString(),
  updatedAt: feed.updatedAt.toISOString(),
});

/**
 * Maps feeds array to standardized FeedsListResponse DTO
 */
export const toFeedsListResponse = (feeds: Array<any>): FeedsListResponse => ({
  feeds: feeds.map(toFeedView),
});
