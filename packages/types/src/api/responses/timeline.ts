/**
 * Timeline Response DTOs
 *
 * Response types for timeline/feed endpoints
 */

import type { TimelineItem } from '../../database/timeline';
import type { ReactionTypeName } from '../../shared/enums';

// ============================================================================
// Timeline Response
// ============================================================================

export interface TimelineResponse {
  items: TimelineItem[];
  pagination: {
    cursor?: string;
    hasMore: boolean;
    total?: number;
  };
}

// ============================================================================
// Article Reaction Response
// ============================================================================

export interface ArticleReactionResponse {
  action: 'added' | 'removed' | 'changed';
  type: ReactionTypeName;
  totalReactions: number;
  reactionCounts: Record<string, number>;
}

// ============================================================================
// Article Comment Response
// ============================================================================

export interface ArticleCommentResponse {
  id: number;
  content: string;
  body: string; // For PostCard compatibility
  authorId: number;
  authorName: string;
  articleId: number;
  createdAt: string; // Date → ISO string
  author?: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey?: string | null;
  };
  user?: {
    id: number;
    name: string;
    avatarUrl: string | null;
    profilePictureKey?: string | null;
  };
}

// ============================================================================
// Feed Stats Response
// ============================================================================

export interface FeedStatsResponse {
  feedId: number;
  totalArticles: number;
  recentArticles: number;
  errorRate: number;
  avgFetchTime: number;
  lastSuccess: string | null;
  lastError: string | null;
}

// ============================================================================
// Feed Management Data
// ============================================================================

export interface FeedManagementData {
  totalFeeds: number;
  activeFeeds: number;
  pausedFeeds: number;
  blockedFeeds: number;
  totalArticles: number;
  pendingArticles: number;
  approvedArticles: number;
  rejectedArticles: number;
  lastFetchedAt: string | null;
  averageFetchTime: number; // in minutes
  errorRate: number; // percentage
}

// ============================================================================
// OPML Types
// ============================================================================

export interface OPMLFeed {
  title: string;
  xmlUrl: string;
  htmlUrl?: string;
  type?: string;
}

export interface OPMLCategory {
  title: string;
  feeds: OPMLFeed[];
}

export interface OPMLDocument {
  title: string;
  categories: OPMLCategory[];
  feeds: OPMLFeed[]; // Root level feeds
}

export interface OPMLImportResult {
  totalFeeds: number;
  importedFeeds: number;
  skippedFeeds: number;
  failedFeeds: number;
  errors: Array<{
    feedUrl: string;
    error: string;
  }>;
  importedFeedIds: number[];
  processedAt: string;
}

export interface OPMLExportResult {
  xml: string; // Generated OPML XML
  feedCount: number; // Number of feeds exported
  categories: string[]; // Categories included
  generatedAt: string;
  metadata: {
    title: string;
    generator: string;
    docs: string;
  };
}
