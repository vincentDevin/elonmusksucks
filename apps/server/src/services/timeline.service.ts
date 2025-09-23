import { PrismaClient } from '@prisma/client';
import { TimelineRepository } from '../repositories/TimelineRepository';
import { UserService } from './user.service';

const prisma = new PrismaClient();
const userService = new UserService();

export class TimelineService {
  private repository: TimelineRepository;

  constructor() {
    this.repository = new TimelineRepository(prisma);
  }

  async getArticles(params: { cursor?: Date; limit: number }) {
    return this.repository.getApprovedArticles(params);
  }

  async getTimelineTweets(params: { cursor?: string; limit: number }) {
    return this.repository.getTimelineTweets(params);
  }

  async getArticleDetails(articleId: number): Promise<any> {
    return this.repository.getArticleDetails(articleId);
  }

  async toggleArticleReaction(articleId: number, userId: number, type: string) {
    return this.repository.toggleArticleReaction(articleId, userId, type);
  }

  async getArticleReactions(articleId: number) {
    const reactions = await this.repository.getArticleReactions(articleId);

    // Enrich user data with signed avatar URLs
    const enrichedReactions = await Promise.all(
      reactions.map(async (reaction) => {
        if (reaction.user) {
          const enrichedUser = await userService.enrichUserWithAvatar(reaction.user);
          return {
            ...reaction,
            user: enrichedUser,
          };
        }
        return reaction;
      }),
    );

    return enrichedReactions;
  }

  async createArticleComment(articleId: number, userId: number, content: string) {
    const comment = await this.repository.createArticleComment(articleId, userId, content);

    // Enrich user data with signed avatar URL
    if (comment.user) {
      const enrichedUser = await userService.enrichUserWithAvatar(comment.user);
      return {
        ...comment,
        user: enrichedUser,
      };
    }

    return comment;
  }

  async getArticleComments(articleId: number, limit: number, cursor?: string) {
    const result = await this.repository.getArticleComments(articleId, limit, cursor);

    // Enrich user data with signed avatar URLs
    const enrichedComments = await Promise.all(
      result.comments.map(async (comment) => {
        if (comment.user) {
          const enrichedUser = await userService.enrichUserWithAvatar(comment.user);
          return {
            ...comment,
            user: enrichedUser,
          };
        }
        return comment;
      }),
    );

    return {
      ...result,
      comments: enrichedComments,
    };
  }
}
