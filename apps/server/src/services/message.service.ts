// apps/server/src/services/message.service.ts
import { MessageRepository } from '../repositories/MessageRepository';
import type { MessageWithUser } from '../repositories/IMessageRepository';
import { eventBus } from './eventBus.service';

const repo = new MessageRepository();

/**
 * Extract emojis from text content
 * Matches both Unicode emojis and shortcode emojis (:emoji:)
 */
function extractEmojis(content: string): string[] {
  const emojis: string[] = [];

  // Unicode emoji regex (covers most common emojis)
  const unicodeEmojiRegex =
    /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const unicodeMatches = content.match(unicodeEmojiRegex);
  if (unicodeMatches) {
    emojis.push(...unicodeMatches);
  }

  // Shortcode emoji regex (:emoji_name:)
  const shortcodeEmojiRegex = /:([a-z0-9_+-]+):/g;
  let match;
  while ((match = shortcodeEmojiRegex.exec(content)) !== null) {
    emojis.push(match[0]); // Include the colons
  }

  return [...new Set(emojis)]; // Remove duplicates
}

/**
 * Detect if a message is part of a thread based on various patterns
 */
function detectThreadParticipation(
  content: string,
  recentMessages: MessageWithUser[],
): {
  isThread: boolean;
  threadType?: 'reply' | 'discussion' | 'reaction_chain';
  relatedMessageIds?: number[];
} {
  const result = {
    isThread: false,
    threadType: undefined as 'reply' | 'discussion' | 'reaction_chain' | undefined,
    relatedMessageIds: [] as number[],
  };

  if (recentMessages.length === 0) return result;

  // Pattern 1: Direct reply indicators (@username, "replying to", etc.)
  const replyPatterns = [
    /@(\w+)/g,
    /replying to/i,
    /^re:/i,
    /^\>/, // Quote-style reply
  ];

  for (const pattern of replyPatterns) {
    if (pattern.test(content)) {
      result.isThread = true;
      result.threadType = 'reply';
      // Try to find the referenced user in recent messages
      const referencedUsers = content.match(/@(\w+)/g);
      if (referencedUsers) {
        const relatedMessages = recentMessages.filter((msg) =>
          referencedUsers.some((ref) =>
            msg.user.name?.toLowerCase().includes(ref.toLowerCase().substring(1)),
          ),
        );
        result.relatedMessageIds = relatedMessages.map((m) => m.id).slice(0, 3);
      }
      break;
    }
  }

  // Pattern 2: Rapid discussion (same users exchanging messages quickly)
  if (!result.isThread) {
    const recentUserMessages = recentMessages
      .filter((msg) => msg.timestamp > new Date(Date.now() - 5 * 60 * 1000)) // Last 5 minutes
      .slice(0, 5);

    const uniqueUsers = new Set(recentUserMessages.map((m) => m.userId));
    if (uniqueUsers.size >= 2 && uniqueUsers.size <= 4 && recentUserMessages.length >= 3) {
      result.isThread = true;
      result.threadType = 'discussion';
      result.relatedMessageIds = recentUserMessages.map((m) => m.id);
    }
  }

  // Pattern 3: Reaction chain (similar short messages, emojis, etc.)
  if (!result.isThread) {
    const recentShortMessages = recentMessages
      .filter(
        (msg) => msg.content.length <= 20 && msg.timestamp > new Date(Date.now() - 2 * 60 * 1000), // Last 2 minutes
      )
      .slice(0, 3);

    if (recentShortMessages.length >= 2 && content.length <= 20) {
      // Check if messages contain emojis or similar short reactions
      const hasEmojiPattern =
        /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]|:\w+:|lol|haha|yes|no|ok|wow|nice/giu;
      const currentHasEmoji = hasEmojiPattern.test(content);
      const recentHasEmoji = recentShortMessages.some((msg) => hasEmojiPattern.test(msg.content));

      if (currentHasEmoji || recentHasEmoji) {
        result.isThread = true;
        result.threadType = 'reaction_chain';
        result.relatedMessageIds = recentShortMessages.map((m) => m.id);
      }
    }
  }

  return result;
}

/**
 * Creates and stores a new chat message in the given room.
 * Enhanced with emoji extraction and thread detection.
 * Returns the created Message (without joined user).
 */
export async function createMessage(userId: number, roomId: number, content: string) {
  try {
    // Create the message first
    const message = await repo.createMessage(userId, roomId, content);

    // Get recent messages for thread detection (in background, don't block message creation)
    setImmediate(async () => {
      try {
        const recentMessages = await repo.getRecentMessages(roomId, 10);

        // 1. Extract and track emoji usage
        const emojis = extractEmojis(content);
        if (emojis.length > 0) {
          // Track each unique emoji used
          for (const emoji of emojis) {
            await eventBus.publish('emoji:used', {
              key: 'emoji:used',
              userId,
              occurredAt: new Date().toISOString(),
              idempotencyKey: `emoji:${userId}:${emoji}:${message.id}:${Date.now()}`,
              payload: {
                messageId: message.id,
                roomId,
                emoji,
                content: content.substring(0, 100), // Truncated for privacy
                context: 'chat_message',
              },
            });
          }

          console.log(
            `[message] User ${userId} used ${emojis.length} emoji(s) in message ${message.id}`,
          );
        }

        // 2. Detect thread participation
        const threadInfo = detectThreadParticipation(
          content,
          recentMessages.filter((m) => m.id !== message.id),
        );
        if (threadInfo.isThread) {
          await eventBus.publish('thread:participation', {
            key: 'thread:participation',
            userId,
            occurredAt: new Date().toISOString(),
            idempotencyKey: `thread:${userId}:${message.id}:${Date.now()}`,
            payload: {
              messageId: message.id,
              roomId,
              threadType: threadInfo.threadType,
              relatedMessageIds: threadInfo.relatedMessageIds,
              content: content.substring(0, 100), // Truncated for privacy
              participantCount: threadInfo.relatedMessageIds?.length || 0,
            },
          });

          console.log(
            `[message] User ${userId} participated in ${threadInfo.threadType} thread in message ${message.id}`,
          );
        }

        // 3. General chat activity tracking for time-based achievements
        await eventBus.publish('user:activity:log', {
          userId,
          activityType: 'chat_message_sent',
          metadata: {
            messageId: message.id,
            roomId,
            contentLength: content.length,
            emojiCount: emojis.length,
            isThread: threadInfo.isThread,
            threadType: threadInfo.threadType,
            timestamp: new Date().toISOString(),
          },
          occurredAt: new Date().toISOString(),
          dateKey: new Date().toISOString().split('T')[0],
          idempotencyKey: `activity:chat:${message.id}:${userId}`,
        });

        // 4. Publish general chat message sent event for achievements
        await eventBus.publish('chat:message:sent', {
          key: 'chat:message:sent',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `chat:sent:${message.id}:${userId}`,
          payload: {
            messageId: message.id,
            roomId,
            contentLength: content.length,
            emojiCount: emojis.length,
            hasEmojis: emojis.length > 0,
            isThread: threadInfo.isThread,
            threadType: threadInfo.threadType,
            messageContent: content.substring(0, 50), // Very short snippet for context
          },
        });
      } catch (trackingError) {
        console.error(
          `[message] Error tracking message ${message.id} enhancements:`,
          trackingError,
        );
        // Don't fail the message creation if tracking fails
      }
    });

    return message;
  } catch (error) {
    console.error('[message] Error creating message:', error);
    throw error;
  }
}

/**
 * Fetches the most recent chat messages for a room, including user data.
 */
export async function getRecentMessages(roomId: number, limit = 50): Promise<MessageWithUser[]> {
  return repo.getRecentMessages(roomId, limit);
}
