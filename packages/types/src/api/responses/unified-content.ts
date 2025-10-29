/**
 * Unified Content Management Types
 *
 * Cross-content type definitions for admin content management dashboard.
 * Unifies Articles, User Posts, Comments, and Predictions into a single interface.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Unified content types across the platform
 * Maps to database models:
 * - 'article' → Article model (RSS feed articles)
 * - 'user_post' → Content model (type: POST)
 * - 'comment' → Content model (type: COMMENT)
 * - 'prediction' → Prediction model (market predictions)
 */
export type UnifiedContentType = 'article' | 'user_post' | 'comment' | 'prediction';

/**
 * Unified status across all content types
 * - Articles: PENDING, APPROVED, REJECTED → pending, approved, rejected
 * - Content: isFlagged, isDeleted → flagged, deleted
 * - Predictions: approved boolean → approved, pending
 */
export type UnifiedContentStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'flagged'
  | 'deleted'
  | 'draft';

/**
 * Content author types for unified display
 */
export type ContentAuthorType = 'user' | 'feed' | 'system' | 'ai';

/**
 * Content priority for moderation queue
 */
export type ContentPriority = 'low' | 'normal' | 'high' | 'urgent';

// ============================================================================
// Main Unified Content Interface
// ============================================================================

/**
 * Unified content item - represents any content type in a standardized format
 * Used for admin dashboard, cross-content search, and bulk operations
 */
export interface UnifiedContentItem {
  // Identity
  id: string;                    // Prefixed ID: "article:123", "post:456", "comment:789", "prediction:101"
  originalId: number;            // Original database ID for the specific model
  type: UnifiedContentType;

  // Content
  title?: string;                // Optional - articles and predictions have titles
  content: string;               // Main content body (excerpt for articles, body for posts/comments)
  excerpt?: string;              // Short summary (for articles)

  // Author information
  author: {
    id: number;                  // User ID or Feed ID
    name: string;                // Display name
    type: ContentAuthorType;     // Type of author
    avatarUrl?: string;          // Profile picture or feed icon
    profilePictureKey?: string;  // S3 key for avatar (needed for enrichment)
    reputation?: number;         // User reputation score (optional)
  };

  // Status & Moderation
  status: UnifiedContentStatus;
  priority: ContentPriority;
  flags: string[];               // Active flags: ['spam', 'inappropriate', 'duplicate']
  moderationNotes?: string;      // Admin notes from moderation
  moderatedBy?: {
    id: number;
    name: string;
    at: string;
  };

  // Metadata (varies by type)
  metadata: {
    // Common
    tags?: string[];             // Content tags
    categories?: string[];       // Categories (for predictions)

    // Article-specific
    url?: string;                // Original article URL
    feedId?: number;             // Source feed ID
    feedName?: string;           // Source feed name
    canonicalUrl?: string;       // Canonical URL
    leadImageUrl?: string;       // Featured image

    // Content-specific (posts/comments)
    contentType?: string;        // TEXT, IMAGE, LINK, etc. (PostContentType)
    visibility?: string;         // PUBLIC, PRIVATE, FOLLOWERS, etc. (PostVisibility)
    parentId?: number;           // Parent content ID for threading
    threadDepth?: number;        // Thread nesting level
    articleId?: number;          // Article ID if comment on article
    predictionId?: number;       // Prediction ID if comment on prediction
    mediaUrls?: string[];        // Media attachments

    // Prediction-specific
    expiresAt?: string;          // Prediction expiration
    resolvedAt?: string;         // Resolution timestamp
    winningOptionId?: number;    // Winning option (if resolved)
    resolved?: boolean;          // Resolution status
    categoryId?: number;         // Prediction category
  };

  // Engagement Metrics
  engagement: {
    views: number;
    reactions: {
      total: number;
      byType?: Record<string, number>;  // Like: 10, Love: 5, etc.
    };
    comments: number;
    shares?: number;
    bookmarks?: number;
  };

  // Timestamps
  timestamps: {
    createdAt: string;           // ISO string
    updatedAt?: string;          // ISO string
    publishedAt?: string;        // ISO string (for articles)
    deletedAt?: string;          // ISO string
    moderatedAt?: string;        // ISO string
  };

  // Quality & AI Metrics (optional)
  quality?: {
    score: number;               // 0-10 quality score
    readability?: number;        // 0-10 readability
    sentiment?: 'positive' | 'negative' | 'neutral';
    toxicity?: number;           // 0-10 toxicity level
    aiGenerated?: boolean;       // AI detection flag
    spam?: boolean;              // Spam detection flag
  };
}

// ============================================================================
// Filtering & Queries
// ============================================================================

/**
 * Comprehensive filtering options for unified content queries
 */
export interface UnifiedContentFilters {
  // Type & Status
  types?: UnifiedContentType[];
  statuses?: UnifiedContentStatus[];

  // Author
  authorIds?: number[];
  authorTypes?: ContentAuthorType[];

  // Content
  search?: string;              // Full-text search across title, content, author
  tags?: string[];
  categories?: string[];
  flags?: string[];
  priority?: ContentPriority[];

  // Date Ranges
  createdAfter?: string;        // ISO date string
  createdBefore?: string;
  publishedAfter?: string;
  publishedBefore?: string;

  // Media Filters
  hasImages?: boolean;
  hasVideos?: boolean;
  hasAttachments?: boolean;

  // Quality Filters
  minQualityScore?: number;
  maxToxicityScore?: number;
  excludeAI?: boolean;
  excludeSpam?: boolean;

  // Engagement Filters
  minViews?: number;
  minReactions?: number;
  minComments?: number;

  // Pagination & Sorting
  limit?: number;
  offset?: number;
  cursor?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'publishedAt' | 'views' | 'reactions' | 'quality' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated response for unified content queries
 */
export interface UnifiedContentResponse {
  items: UnifiedContentItem[];
  pagination: {
    total: number;
    hasMore: boolean;
    nextCursor?: string;
    currentPage?: number;
    totalPages?: number;
    limit: number;
    offset: number;
  };
  filters: UnifiedContentFilters;
  generatedAt: string;
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk actions available for unified content
 */
export type UnifiedContentBulkAction =
  | 'approve'           // Approve content (articles, predictions)
  | 'reject'            // Reject/hide content
  | 'delete'            // Soft delete content
  | 'flag'              // Add moderation flag
  | 'unflag'            // Remove moderation flag
  | 'feature'           // Feature content
  | 'unfeature'         // Remove feature status
  | 'change_status'     // Change content status
  | 'add_tags'          // Add tags to content
  | 'remove_tags'       // Remove tags from content
  | 'change_priority';  // Change moderation priority

/**
 * Bulk operation request
 */
export interface UnifiedContentBulkOperation {
  action: UnifiedContentBulkAction;
  itemIds: string[];             // Array of prefixed IDs: ["article:123", "post:456"]
  parameters?: {
    status?: UnifiedContentStatus;
    tags?: string[];
    priority?: ContentPriority;
    reason?: string;             // Moderation reason
    notes?: string;              // Admin notes
    notifyAuthors?: boolean;     // Send notification to content authors
  };
}

/**
 * Bulk operation result
 */
export interface UnifiedContentBulkResult {
  successCount: number;
  failureCount: number;
  totalProcessed: number;
  results: Array<{
    itemId: string;
    success: boolean;
    error?: string;
    warning?: string;
  }>;
  processedAt: string;
  processedBy: {
    id: number;
    name: string;
  };
}

// ============================================================================
// Analytics & Insights
// ============================================================================

/**
 * Cross-content analytics for admin dashboard
 */
export interface UnifiedContentAnalytics {
  overview: {
    totalItems: number;
    itemsByType: Record<UnifiedContentType, number>;
    itemsByStatus: Record<UnifiedContentStatus, number>;
    averageQualityScore: number;
    totalViews: number;
    totalReactions: number;
    totalComments: number;
  };

  moderation: {
    pendingReview: number;
    flaggedContent: number;
    rejectedContent: number;
    autoModerated: number;
    manualReview: number;
    averageReviewTime: number;    // In minutes
  };

  trends: {
    dailyCreated: Array<{
      date: string;
      count: number;
      byType: Record<UnifiedContentType, number>;
    }>;
    weeklyEngagement: Array<{
      week: string;
      views: number;
      reactions: number;
      comments: number;
    }>;
    topTags: Array<{
      tag: string;
      count: number;
      engagement: number;
    }>;
    topAuthors: Array<{
      id: number;
      name: string;
      type: ContentAuthorType;
      itemCount: number;
      totalEngagement: number;
    }>;
  };

  quality: {
    averageScores: {
      quality: number;
      readability: number;
      toxicity: number;
    };
    flaggedContent: number;
    aiGeneratedContent: number;
    spamContent: number;
    lowQualityContent: number;
    highQualityContent: number;
  };

  timeRange: {
    from: string;
    to: string;
    days: number;
  };

  generatedAt: string;
}

// ============================================================================
// Moderation Actions
// ============================================================================

/**
 * Individual moderation action on content
 */
export interface UnifiedContentModerationAction {
  itemId: string;
  action: 'approve' | 'reject' | 'flag' | 'delete' | 'restore';
  reason: string;
  notes?: string;
  moderatorId: number;
  performedAt: string;
  previousStatus: UnifiedContentStatus;
  newStatus: UnifiedContentStatus;
}

/**
 * Moderation history entry
 */
export interface UnifiedContentModerationHistory {
  itemId: string;
  actions: UnifiedContentModerationAction[];
  totalActions: number;
  lastAction?: UnifiedContentModerationAction;
}

// ============================================================================
// Create & Update Payloads
// ============================================================================

/**
 * Generic content creation (admin can create any type)
 */
export interface CreateUnifiedContentPayload {
  type: UnifiedContentType;
  title?: string;
  content: string;
  authorId: number;
  status?: UnifiedContentStatus;
  priority?: ContentPriority;
  metadata?: Record<string, any>;
  tags?: string[];
}

/**
 * Generic content update
 */
export interface UpdateUnifiedContentPayload {
  title?: string;
  content?: string;
  status?: UnifiedContentStatus;
  priority?: ContentPriority;
  tags?: string[];
  metadata?: Record<string, any>;
  moderationNotes?: string;
}

// ============================================================================
// Search & Discovery
// ============================================================================

/**
 * Advanced search query for unified content
 */
export interface UnifiedContentSearchQuery {
  query: string;
  filters?: UnifiedContentFilters;
  searchFields?: ('title' | 'content' | 'author' | 'tags')[];
  fuzzy?: boolean;
  highlightMatches?: boolean;
}

/**
 * Search result with highlighting
 */
export interface UnifiedContentSearchResult {
  items: Array<UnifiedContentItem & {
    highlights?: {
      title?: string;
      content?: string;
      author?: string;
    };
    relevanceScore: number;
  }>;
  totalResults: number;
  queryTime: number;           // In milliseconds
  filters: UnifiedContentFilters;
}

// ============================================================================
// Export Types
// ============================================================================

/**
 * Export format options
 */
export type UnifiedContentExportFormat = 'csv' | 'json' | 'xlsx';

/**
 * Export request
 */
export interface UnifiedContentExportRequest {
  filters: UnifiedContentFilters;
  format: UnifiedContentExportFormat;
  includeMetadata?: boolean;
  includeEngagement?: boolean;
  includeQuality?: boolean;
}
