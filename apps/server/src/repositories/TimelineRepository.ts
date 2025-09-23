import { PrismaClient } from '@prisma/client';

export class TimelineRepository {
  constructor(private prisma: PrismaClient) {}

  async getApprovedArticles(params: { cursor?: Date; limit: number }) {
    const where: any = { status: 'APPROVED' };

    if (params.cursor) {
      where.publishedAt = { lt: params.cursor };
    }

    return this.prisma.article.findMany({
      where,
      include: {
        feed: {
          select: {
            id: true,
            name: true,
            siteUrl: true,
          },
        },
      },
      orderBy: { publishedAt: 'desc' },
      take: params.limit + 1,
    });
  }

  async getTimelineTweets(params: { cursor?: string; limit: number }) {
    const where: {
      status: string;
      id?: { lt: string };
    } = {
      status: 'VISIBLE',
    };

    if (params.cursor) {
      where.id = { lt: params.cursor };
    }

    return this.prisma.tweet.findMany({
      where,
      include: {
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true,
          },
          take: 5,
        },
      },
      orderBy: { postedAt: 'desc' },
      take: params.limit + 1,
    });
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.prisma.article.findUnique({
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
        sourceLinks: {
          select: {
            id: true,
            predictionId: true,
            title: true,
          },
        },
      },
    });
  }

  async toggleArticleReaction(
    articleId: number,
    userId: number,
    type: string,
  ): Promise<{
    action: 'added' | 'removed';
    counts: { reactions: number; comments: number };
  }> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for reactions');
    }

    // Check if user already reacted with this type
    const existingReaction = await this.prisma.articleReaction.findUnique({
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
      await this.prisma.$transaction(async (tx: any) => {
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
      await this.prisma.$transaction(async (tx: any) => {
        await tx.articleReaction.create({
          data: { articleId, userId, type },
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
    const updatedCounts = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { reactions: true, comments: true },
    });

    return {
      action,
      counts: {
        reactions: updatedCounts?.reactions || 0,
        comments: updatedCounts?.comments || 0,
      },
    };
  }

  async getArticleReactions(articleId: number): Promise<any[]> {
    return this.prisma.articleReaction.findMany({
      where: { articleId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createArticleComment(articleId: number, userId: number, content: string): Promise<any> {
    // Check if article exists and is approved
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true, status: true },
    });

    if (!article) {
      throw new Error('Article not found');
    }

    if (article.status !== 'APPROVED') {
      throw new Error('Article not available for comments');
    }

    // Create comment and increment counter
    const newComment = await this.prisma.$transaction(async (tx: any) => {
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
              profilePictureKey: true,
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

    return newComment;
  }

  async getArticleComments(
    articleId: number,
    limit: number,
    cursor?: string,
  ): Promise<{
    comments: any[];
    pagination: { cursor?: string; hasMore: boolean; total?: number };
  }> {
    const pageLimit = Math.min(limit || 20, 100);
    const where: any = { articleId };

    if (cursor) {
      const cursorDate = new Date(cursor);
      if (!isNaN(cursorDate.getTime())) {
        where.createdAt = { lt: cursorDate };
      }
    }

    const comments = await this.prisma.articleComment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            profilePictureKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: pageLimit + 1,
    });

    const hasMore = comments.length > pageLimit;
    const items = comments.slice(0, pageLimit);

    const formattedComments = items.map((comment: any) => ({
      id: comment.id,
      content: comment.content,
      user: comment.user,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
    }));

    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].createdAt.toISOString() : undefined;

    return {
      comments: formattedComments,
      pagination: {
        cursor: nextCursor,
        hasMore,
        total: undefined,
      },
    };
  }
}
