// apps/server/src/routes/timeline.routes.simple.ts
// Simplified timeline routes for Phase 2 - basic functionality
import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, type AuthRequest } from '../middleware/auth.middleware';
import { getArticles } from '../controllers/timeline.controller';

const router = Router();
const prisma = new PrismaClient();

/**
 * Simple timeline routes - Phase 2 implementation
 */

// GET /api/timeline/articles - Basic article listing
router.get('/articles', getArticles);

// GET /api/timeline/tweets - Placeholder for tweets
router.get('/tweets', async (_req: any, res: any) => {
  try {
    // For now, return empty tweets
    res.json({
      items: [],
      pagination: {
        cursor: undefined,
        hasMore: false,
        total: 0,
      },
    });
  } catch (error) {
    console.error('[timeline] Error fetching tweets:', error);
    res.status(500).json({ error: 'Failed to fetch tweets' });
  }
});

// GET /api/articles/:id - Article details
router.get('/articles/:id', async (req: any, res: any) => {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true,
            status: true,
          },
        },
      },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    // Return simplified article data
    res.json({
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
            url: '',
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
    });
  } catch (error) {
    console.error('[timeline] Error fetching article details:', error);
    res.status(500).json({ error: 'Failed to fetch article details' });
  }
});

// ===============================================
// Article Reactions API
// ===============================================

// POST /api/timeline/articles/:id/react - Toggle article reaction
router.post('/articles/:id/react', requireAuth, async (req: AuthRequest, res: any) => {
  try {
    const articleId = parseInt(req.params.id);
    const { type = 'like' } = req.body;
    const userId = req.user!.id;

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    // Validate reaction type
    const validTypes = ['like', 'dislike', 'love', 'laugh', 'angry'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Invalid reaction type' });
      return;
    }

    // Check if article exists
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (article.status !== 'APPROVED') {
      res.status(403).json({ error: 'Article not available for reactions' });
      return;
    }

    // Check if user already reacted with this type
    const existingReaction = await prisma.articleReaction.findUnique({
      where: {
        articleId_userId_type: {
          articleId,
          userId,
          type,
        },
      },
    });

    let action: 'added' | 'removed';

    if (existingReaction) {
      // Remove existing reaction
      await prisma.$transaction(async (tx) => {
        await tx.articleReaction.delete({
          where: { id: existingReaction.id },
        });

        // Decrement reaction count
        await tx.article.update({
          where: { id: articleId },
          data: { reactions: { decrement: 1 } },
        });
      });
      action = 'removed';
    } else {
      // Add new reaction
      await prisma.$transaction(async (tx) => {
        await tx.articleReaction.create({
          data: {
            articleId,
            userId,
            type,
          },
        });

        // Increment reaction count
        await tx.article.update({
          where: { id: articleId },
          data: { reactions: { increment: 1 } },
        });
      });
      action = 'added';
    }

    // Get updated reaction counts
    const updatedCounts = await prisma.article.findUnique({
      where: { id: articleId },
      select: { reactions: true, comments: true },
    });

    res.json({
      action,
      type,
      counts: {
        reactions: updatedCounts?.reactions || 0,
        comments: updatedCounts?.comments || 0,
      },
    });
  } catch (error) {
    console.error('[timeline] Error toggling article reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

// GET /api/timeline/articles/:id/reactions - Get article reactions
router.get('/articles/:id/reactions', async (req: any, res: any) => {
  try {
    const articleId = parseInt(req.params.id);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const reactions = await prisma.articleReaction.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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
});

// ===============================================
// Article Comments API
// ===============================================

// POST /api/timeline/articles/:id/comments - Add comment
router.post('/articles/:id/comments', requireAuth, async (req: AuthRequest, res: any) => {
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

    // Check if article exists and is approved
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      res.status(404).json({ error: 'Article not found' });
      return;
    }

    if (article.status !== 'APPROVED') {
      res.status(403).json({ error: 'Article not available for comments' });
      return;
    }

    // Create comment and increment counter
    const newComment = await prisma.$transaction(async (tx) => {
      const comment = await tx.articleComment.create({
        data: {
          articleId,
          userId,
          content: content.trim(),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatarUrl: true,
            },
          },
        },
      });

      // Increment comment count
      await tx.article.update({
        where: { id: articleId },
        data: { comments: { increment: 1 } },
      });

      return comment;
    });

    res.status(201).json({
      id: newComment.id,
      content: newComment.content,
      user: newComment.user,
      createdAt: newComment.createdAt.toISOString(),
      updatedAt: newComment.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('[timeline] Error creating article comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// GET /api/timeline/articles/:id/comments - Get article comments
router.get('/articles/:id/comments', async (req: any, res: any) => {
  try {
    const articleId = parseInt(req.params.id);
    const { limit = '20', cursor } = req.query;
    const pageLimit = Math.min(parseInt(limit) || 20, 100);

    if (isNaN(articleId)) {
      res.status(400).json({ error: 'Invalid article ID' });
      return;
    }

    const where: any = { articleId };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const comments = await prisma.articleComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = comments.length > pageLimit;
    const items = comments.slice(0, pageLimit);

    const formattedComments = items.map((comment) => ({
      id: comment.id,
      content: comment.content,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    res.json({
      comments: formattedComments,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    });
  } catch (error) {
    console.error('[timeline] Error fetching article comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

export default router;
