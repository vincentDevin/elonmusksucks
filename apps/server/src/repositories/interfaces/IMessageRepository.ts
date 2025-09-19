// apps/server/src/repositories/IMessageRepository.ts

import type { Message, User } from '@prisma/client';

export type MessageWithUser = Message & { user: User };

export interface IMessageRepository {
  createMessage(userId: number, roomId: number, content: string): Promise<Message>;
  getRecentMessages(roomId: number, limit?: number): Promise<MessageWithUser[]>;
}
