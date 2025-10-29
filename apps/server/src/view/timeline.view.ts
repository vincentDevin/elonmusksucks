import type {
  TimelineResponse,
  ArticleReactionResponse,
  ArticleCommentResponse,
  TimelineItem,
} from '@ems/types';

/**
 * Maps articles array to timeline items for the articles endpoint
 */
export const toTimelineArticlesResponse = (
  articles: Array<{
    id: number;
    title: string;
    excerpt: string | null;
    url: string;
    leadImageUrl: string | null;
    publishedAt: Date | null;
    createdAt: Date;
    reactions: number;
    comments: number;
    tags: string[];
    feed?: {
      name: string;
      siteUrl: string | null;
    } | null;
  }>,
  hasMore: boolean,
  nextCursor?: string,
): TimelineResponse => {
  const timelineItems: TimelineItem[] = articles.map((article) => ({
    id: `article-${article.id}`,
    type: 'article' as const,
    timestamp: article.publishedAt?.toISOString() || article.createdAt.toISOString(),
    content: {
      title: article.title,
      excerpt: article.excerpt || undefined,
      url: article.url,
      imageUrl: article.leadImageUrl,
      author: article.feed?.name || 'Unknown',
      source: article.feed?.siteUrl ? new URL(article.feed.siteUrl).hostname : 'Unknown',
    },
    engagement: {
      reactions: article.reactions,
      comments: article.comments,
    },
    tags: article.tags,
    sourceLinks: [], // Can be populated as needed
  }));

  return {
    items: timelineItems,
    pagination: {
      cursor: nextCursor,
      hasMore,
      total: undefined, // Not provided by service
    },
  };
};

/**
 * Maps article reaction response from service
 */
export const toArticleReactionResponse = (reaction: {
  action: 'added' | 'removed' | 'changed';
  type: string;
  totalReactions: number;
  reactionCounts?: Record<string, number>;
}): ArticleReactionResponse => ({
  action: reaction.action,
  type: reaction.type as any, // Type is validated at controller level
  totalReactions: reaction.totalReactions,
  reactionCounts: reaction.reactionCounts || {},
});

/**
 * Maps article comment response from service
 */
export const toArticleCommentResponse = (comment: {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  articleId: number;
  createdAt: Date;
}): ArticleCommentResponse => ({
  id: comment.id,
  content: comment.content,
  body: comment.content, // For PostCard compatibility
  authorId: comment.authorId,
  authorName: comment.authorName,
  articleId: comment.articleId,
  createdAt: comment.createdAt.toISOString(),
});
