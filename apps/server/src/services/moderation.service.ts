// apps/server/src/services/moderation.service.ts
import { PrismaClient } from '@prisma/client';
import { ModerationRepository } from '../repositories/ModerationRepository';
import type { IModerationRepository } from '../repositories/interfaces/IModerationRepository';
import type { ModerationAction } from '@prisma/client';
import { REDIS_CHANNELS } from '@ems/types';
import type { BanType } from '@ems/types';
import { eventBus } from '../lib/EventBus';

const prisma = new PrismaClient();
const moderationRepo: IModerationRepository = new ModerationRepository(prisma);

interface BanUserParams {
  userId: number;
  moderatorId: number;
  banType: BanType;
  reason: string;
  duration?: number; // minutes for temporary bans
  ipAddress?: string;
  userAgent?: string;
}

interface ModerationEventData {
  action: ModerationAction;
  moderatorId: number;
  targetUserId?: number;
  messageId?: number;
  postId?: number;
  reason?: string;
  duration?: number;
  banId?: number;
  timestamp: string;
}

// Publish moderation events to Redis
async function publishModerationEvent(channel: string, data: ModerationEventData): Promise<void> {
  try {
    await eventBus.publish(channel, data);
  } catch (error) {
    console.error(`[moderation] Failed to publish to ${channel}:`, error);
  }
}

// Create moderation log and publish event
async function logAndPublishAction(
  action: ModerationAction,
  moderatorId: number,
  channel: string,
  targetUserId?: number,
  details?: any,
  ipAddress?: string,
  userAgent?: string,
): Promise<void> {
  // Log the action
  await moderationRepo.createModerationLog({
    moderatorId,
    targetUserId,
    action,
    reason: details?.reason,
    details,
    ipAddress,
    userAgent,
  });

  // Publish event
  await publishModerationEvent(channel, {
    action,
    moderatorId,
    targetUserId,
    messageId: details?.messageId,
    postId: details?.postId,
    reason: details?.reason,
    duration: details?.duration,
    banId: details?.banId,
    timestamp: new Date().toISOString(),
  });
}

export const moderationService = {
  // Ban user
  async banUser(params: BanUserParams) {
    const { userId, moderatorId, banType, reason, duration, ipAddress, userAgent } = params;

    // Check if user is already banned
    const existingBan = await moderationRepo.getBanByUserId(userId);
    if (existingBan) {
      throw new Error('User is already banned');
    }

    // Calculate expiration for temporary bans
    const expiresAt =
      banType === 'temporary' && duration ? new Date(Date.now() + duration * 60 * 1000) : undefined;

    // Create ban
    const ban = await moderationRepo.createBan({
      userId,
      banType,
      reason,
      expiresAt,
    });

    // Deactivate user
    await moderationRepo.updateUserActiveStatus(userId, false);

    // Log and publish
    await logAndPublishAction(
      'USER_BAN',
      moderatorId,
      REDIS_CHANNELS.MODERATION_USER_BAN,
      userId,
      { reason, duration, banId: ban.id },
      ipAddress,
      userAgent,
    );

    return ban;
  },

  // Unban user
  async unbanUser(userId: number, moderatorId: number, ipAddress?: string, userAgent?: string) {
    const ban = await moderationRepo.getBanByUserId(userId);
    if (!ban) {
      throw new Error('User is not banned');
    }

    // Update ban status
    await moderationRepo.updateBanStatus(ban.id, false);

    // Reactivate user
    await moderationRepo.updateUserActiveStatus(userId, true);

    // Log and publish
    await logAndPublishAction(
      'USER_UNBAN',
      moderatorId,
      REDIS_CHANNELS.MODERATION_USER_UNBAN,
      userId,
      { banId: ban.id },
      ipAddress,
      userAgent,
    );

    return true;
  },

  // Mute user (temporary ban for chat)
  async muteUser(
    userId: number,
    moderatorId: number,
    duration: number, // minutes
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Create temporary ban
    const ban = await moderationRepo.createBan({
      userId,
      banType: 'temporary' as BanType,
      reason: `MUTE: ${reason}`,
      expiresAt: new Date(Date.now() + duration * 60 * 1000),
    });

    // Log and publish
    await logAndPublishAction(
      'USER_MUTE',
      moderatorId,
      REDIS_CHANNELS.MODERATION_USER_MUTE,
      userId,
      { reason, duration, banId: ban.id },
      ipAddress,
      userAgent,
    );

    return ban;
  },

  // Kick user (disconnect from chat)
  async kickUser(
    userId: number,
    moderatorId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Log and publish (no persistent state change for kick)
    await logAndPublishAction(
      'USER_KICK',
      moderatorId,
      REDIS_CHANNELS.MODERATION_USER_KICK,
      userId,
      { reason },
      ipAddress,
      userAgent,
    );

    return true;
  },

  // Delete message
  async deleteMessage(
    messageId: number,
    moderatorId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const message = await moderationRepo.getMessage(messageId);
    if (!message) {
      throw new Error('Message not found');
    }

    const deleted = await moderationRepo.deleteMessage(messageId);
    if (!deleted) {
      throw new Error('Failed to delete message');
    }

    // Log and publish
    await logAndPublishAction(
      'MESSAGE_DELETE',
      moderatorId,
      REDIS_CHANNELS.MODERATION_MESSAGE_DELETE,
      message.userId,
      { messageId, reason, content: message.content },
      ipAddress,
      userAgent,
    );

    return true;
  },

  // Delete post
  async deletePost(
    postId: number,
    moderatorId: number,
    reason: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const post = await moderationRepo.getPost(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const deleted = await moderationRepo.deletePost(postId);
    if (!deleted) {
      throw new Error('Failed to delete post');
    }

    // Log and publish
    await logAndPublishAction(
      'POST_DELETE',
      moderatorId,
      REDIS_CHANNELS.MODERATION_POST_DELETE,
      post.authorId,
      { postId, reason, content: post.body },
      ipAddress,
      userAgent,
    );

    return true;
  },

  // Get active bans
  async getActiveBans() {
    return moderationRepo.getActiveBans();
  },

  // Get user ban status
  async getUserBanStatus(userId: number) {
    return moderationRepo.getBanByUserId(userId);
  },

  // Get moderation history
  async getModerationHistory(targetUserId?: number, moderatorId?: number) {
    return moderationRepo.getModerationHistory(targetUserId, moderatorId);
  },

  // Get recent moderation actions
  async getRecentModerationActions(limit?: number) {
    return moderationRepo.getRecentModerationActions(limit);
  },

  // Check and expire bans
  async checkExpiredBans() {
    await moderationRepo.checkExpiredBans();
  },

  // Check if user is banned
  async isUserBanned(userId: number): Promise<boolean> {
    const ban = await moderationRepo.getBanByUserId(userId);
    return !!ban;
  },
};
