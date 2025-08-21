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
}
