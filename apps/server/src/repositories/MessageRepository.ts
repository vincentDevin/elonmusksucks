// apps/server/src/repositories/MessageRepository.ts

import { PrismaClient, Message } from '@prisma/client';
import type { IMessageRepository, MessageWithUser } from './IMessageRepository';

const prisma = new PrismaClient();

export class MessageRepository implements IMessageRepository {
  async createMessage(userId: number, roomId: number, content: string): Promise<Message> {
    return prisma.message.create({
      data: { userId, roomId, content },
    });
  }

  async getRecentMessages(roomId: number, limit = 50): Promise<MessageWithUser[]> {
    return prisma.message.findMany({
      where: { roomId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: { user: true }, // this ensures .user is present!
    });
  }
}
