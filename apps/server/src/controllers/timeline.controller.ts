import type { Request, Response } from 'express';
import { TimelineService } from '../services/timeline.service';
import type {
  TimelineItem,
  TimelineResponse,
  TimelineArticlesResponse,
  ArticleReactionResponse,
  ArticleCommentResponse,
} from '@ems/types';
import { validateArticleId } from '../utils/timeline';
import type { AuthRequest } from '../middleware/auth.middleware';
import {
  toTimelineArticlesResponse,
  toArticleReactionResponse,
  toArticleCommentResponse,
} from '../view/timeline.view';

const timelineService = new TimelineService();

export async function getArticles(req: Request, res: Response) {
  try {
    const { limit = '30', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 30, 100);

    const cursorDate = cursor ? new Date(cursor as string) : undefined;
    if (cursor && isNaN(cursorDate!.getTime())) {
      // Keep same behavior - ignore invalid cursor
      cursorDate ? undefined : undefined;
    }

    const articles = await timelineService.getArticles({
      cursor: cursorDate && !isNaN(cursorDate.getTime()) ? cursorDate : undefined,
      limit: pageLimit,
    });

    const hasMore = articles.length > pageLimit;
    const items = articles.slice(0, pageLimit);

    const nextCursor =
      hasMore && items.length > 0
        ? items[items.length - 1].publishedAt?.toISOString() ||
          items[items.length - 1].createdAt.toISOString()
        : undefined;

    const payload = toTimelineArticlesResponse(
      items,
      hasMore,
      nextCursor,
    ) satisfies TimelineArticlesResponse;
    res.json(payload);
  } catch (error) {
    console.error('[timeline] Error fetching articles:', error);
    res.status(500).json({ error: 'Failed to fetch articles' });
  }
}

export async function getTimelineTweets(req: Request, res: Response) {
  try {
    const { cursor, limit = '50' } = req.query as Record<string, string>;

    const pageLimit = Math.min(parseInt(limit) || 50, 100);

    const tweets = await timelineService.getTimelineTweets({
      cursor: cursor || undefined,
      limit: pageLimit,
    });

    const hasMore = tweets.length > pageLimit;
    const items = tweets.slice(0, pageLimit);

    const timelineItems: TimelineItem[] = items.map((tweet) => ({
      id: `tweet-${tweet.id}`,
      type: 'tweet' as const,
      timestamp: tweet.postedAt.toISOString(),
      content: {
        title: `@${tweet.authorHandle}`,
        excerpt: tweet.text,
        url: tweet.permalink,
        author: `@${tweet.authorHandle}`,
        source: 'X (Twitter)',
      },
      engagement: {
        reactions: tweet.likeCount,
        comments: tweet.replyCount,
      },
      tags: [],
      sourceLinks: tweet.sourceLinks.map((link) => ({
        id: link.id,
        predictionId: link.predictionId,
        articleId: null,
        tweetId: tweet.id,
        url: tweet.permalink,
        title: link.title,
        publisher: 'X (Twitter)',
        capturedAt: new Date().toISOString(),
      })),
    }));

    const nextCursor = hasMore && items.length > 0 ? items[items.length - 1].id : undefined;

    const response: TimelineResponse = {
      items: timelineItems,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('[timeline] Error fetching tweets:', error);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
}

export const getArticleDetails = async (req: Request, res: Response) => {
  try {
    const articleId = validateArticleId(req.params.id);

    if (articleId === null) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const article = await timelineService.getArticleDetails(articleId);

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Convert to PublicArticle format
    const publicArticle = {
      id: article.id,
      feedId: article.feedId,
      guid: article.guid,
      url: article.url,
      canonicalUrl: article.canonicalUrl,
      title: article.title,
      excerpt: article.excerpt,
      leadImageUrl: article.leadImageUrl,
      publishedAt: article.publishedAt?.toISOString() || null,
      fetchedAt: article.fetchedAt.toISOString(),
      hash: article.hash,
      status: article.status,
      tags: article.tags,
      modNotes: article.modNotes,
      reactions: article.reactions,
      comments: article.comments,
      createdAt: article.createdAt.toISOString(),
      updatedAt: article.updatedAt.toISOString(),
      feed: article.feed
        ? {
            id: article.feed.id,
            name: article.feed.name,
            url: '', // Not exposing internal feed URL
            siteUrl: article.feed.siteUrl,
            status: article.feed.status,
            allowImages: true,
            lastFetchedAt: null,
            lastSuccessAt: null,
            lastErrorAt: null,
            lastErrorMsg: null,
            fetchCount: 0,
            errorCount: 0,
            createdAt: '',
            updatedAt: '',
          }
        : null,
    };

    res.json(publicArticle);
  } catch (error) {
    console.error('[timeline] Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
};

export const toggleArticleReaction = async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { type = 'like' } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    // Validate reaction type
    const validTypes = ['like', 'dislike', 'love', 'laugh', 'angry'] as const;
    if (!validTypes.includes(type as (typeof validTypes)[number])) {
      res.status(400).json({ error: 'Invalid reaction type' });
      return;
    }

    const result = await timelineService.toggleArticleReaction(articleId, userId, type);

    const payload = toArticleReactionResponse({
      action: result.action,
      type: type as string,
      totalReactions: (result.counts as any)?.[type] || 0,
    }) satisfies ArticleReactionResponse;
    res.json(payload);
  } catch (error: any) {
    console.error('[timeline] Error toggling article reaction:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (error.message === 'Article not available for reactions') {
      res.status(403).json({ error: 'Article not available for reactions' });
      return;
    }

    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
};

export const getArticleReactions = async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const reactions = await timelineService.getArticleReactions(articleId);

    // Group by reaction type
    const groupedReactions = reactions.reduce(
      (acc, reaction) => {
        if (!acc[reaction.type]) {
          acc[reaction.type] = [];
        }
        acc[reaction.type].push({
          id: reaction.id,
          user: reaction.user,
          createdAt: reaction.createdAt.toISOString(),
        });
        return acc;
      },
      {} as Record<string, any[]>,
    );

    res.json({
      reactions: groupedReactions,
      total: reactions.length,
    });
  } catch (error) {
    console.error('[timeline] Error fetching article reactions:', error);
    res.status(500).json({ error: 'Failed to fetch reactions' });
  }
};

export const createArticleComment = async (req: AuthRequest, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { content } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ error: 'Comment content is required' });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ error: 'Comment too long (max 1000 characters)' });
      return;
    }

    const newComment = await timelineService.createArticleComment(articleId, userId, content);

    const payload = toArticleCommentResponse({
      id: newComment.id,
      content: newComment.content,
      authorId: newComment.user.id,
      authorName: newComment.user.name,
      articleId,
      createdAt: newComment.createdAt,
    }) satisfies ArticleCommentResponse;
    res.status(201).json(payload);
  } catch (error: any) {
    console.error('[timeline] Error creating article comment:', error);

    if (error.message === 'Article not found') {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (error.message === 'Article not available for comments') {
      res.status(403).json({ error: 'Article not available for comments' });
      return;
    }

    res.status(500).json({ error: 'Failed to create comment' });
  }
};

export const getArticleComments = async (req: Request, res: Response) => {
  try {
    const articleId = parseInt(req.params.id);
    const { limit = '20', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit as string) || 20, 100);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const result = await timelineService.getArticleComments(articleId, pageLimit, cursor as string);
    res.json(result);
  } catch (error) {
    console.error('[timeline] Error fetching article comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
};
