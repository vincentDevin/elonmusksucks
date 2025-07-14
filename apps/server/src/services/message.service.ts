// apps/server/src/services/message.service.ts
import { MessageRepository } from '../repositories/MessageRepository';
import type { MessageWithUser } from '../repositories/IMessageRepository';

const repo = new MessageRepository();

/**
 * Creates and stores a new chat message in the given room.
 * Returns the created Message (without joined user).
 */
export async function createMessage(userId: number, roomId: number, content: string) {
  return repo.createMessage(userId, roomId, content);
}

/**
 * Fetches the most recent chat messages for a room, including user data.
 */
export async function getRecentMessages(roomId: number, limit = 50): Promise<MessageWithUser[]> {
  return repo.getRecentMessages(roomId, limit);
}
