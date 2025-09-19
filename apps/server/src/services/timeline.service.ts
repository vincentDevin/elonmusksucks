import { PrismaClient } from '@prisma/client';
import { TimelineRepository } from '../repositories/TimelineRepository';

const prisma = new PrismaClient();

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
    return this.repository.getArticleReactions(articleId);
  }

  async createArticleComment(articleId: number, userId: number, content: string) {
    return this.repository.createArticleComment(articleId, userId, content);
  }

  async getArticleComments(articleId: number, limit: number, cursor?: string) {
    return this.repository.getArticleComments(articleId, limit, cursor);
  }
}
