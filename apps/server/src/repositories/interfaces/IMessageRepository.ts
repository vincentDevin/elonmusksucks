// apps/server/src/repositories/IMessageRepository.ts

import type { PrismaMessage, PrismaUser } from '@ems/types';

export type MessageWithUser = PrismaMessage & { user: PrismaUser };

export interface IMessageRepository {
  createMessage(userId: number, roomId: number, content: string): Promise<PrismaMessage>;
  getRecentMessages(roomId: number, limit?: number): Promise<MessageWithUser[]>;
}
