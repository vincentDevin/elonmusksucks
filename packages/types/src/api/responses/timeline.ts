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

// ============================================================================
// Trending Content Types
// ============================================================================

export interface TrendingItem {
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

export interface TrendingContentResponse {
  items: TrendingItem[];
}

// ============================================================================
// Public Post View (for SSR / Public Timeline)
// ============================================================================

/**
 * Public post view - serialized for public API consumption
 * Dates are ISO strings, no authentication-specific data
 */
export interface PublicPostView {
  id: number;
  authorId: number;
  type: string; // ContentType
  body: string;
  parentId: number | null;
  threadDepth: number;
  reactionsCount: number;
  repliesCount: number;
  commentsCount?: number; // Alias for repliesCount
  createdAt: string; // ISO string
  author: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  // Optional enriched fields
  visibility?: string;
  mediaUrls?: string[];
  viewsCount?: string;
  sharesCount?: number;
  reactionCounts?: Record<string, number>;
  userReaction?: string | null;
}
