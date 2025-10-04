// apps/server/src/handlers/moderationHandlers.ts
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { moderationService } from '../services/moderation.service';
import type { BanType as PrismaBanType } from '@prisma/client';
import type { BanType } from '@ems/types';
import {
  SOCKET_EVENTS,
  type AdminBanUserRequest,
  type AdminBanUserResponse,
  type AdminUnbanUserRequest,
  type AdminUnbanUserResponse,
  type AdminMuteUserRequest,
  type AdminMuteUserResponse,
  type AdminKickUserRequest,
  type AdminKickUserResponse,
  type AdminDeleteMessageRequest,
  type AdminDeleteMessageResponse,
  type AdminDeletePostRequest,
  type AdminDeletePostResponse,
  type AdminGetActiveBansResponse,
  type AdminGetModerationHistoryRequest,
  type AdminGetModerationHistoryResponse,
  type AdminGetRecentActionsRequest,
  type AdminGetRecentActionsResponse,
  type UserBannedNotification,
  type UserMutedNotification,
  type UserKickedNotification,
} from '@ems/types';

// Convert Prisma BanType (UPPERCASE) to domain BanType (lowercase)
function convertBanType(prismaBanType: PrismaBanType): BanType {
  const mapping: Record<PrismaBanType, BanType> = {
    TEMPORARY: 'temporary',
    PERMANENT: 'permanent',
    SHADOW: 'shadow',
    CHAT_ONLY: 'chat_only',
    BETTING_RESTRICTED: 'betting_restricted',
    FULL: 'full',
  };
  return mapping[prismaBanType];
}

export function registerModerationHandlers(socket: AuthenticatedSocket): void {
  // Ensure user is admin
  if (socket.user?.role !== 'ADMIN') {
    return;
  }

  // Ban user
  socket.on(
    SOCKET_EVENTS.ADMIN_BAN_USER,
    async (data: AdminBanUserRequest, callback: (response: AdminBanUserResponse) => void) => {
      try {
        const ban = await moderationService.banUser({
          userId: data.userId,
          moderatorId: socket.user!.id,
          banType: convertBanType(data.banType),
          reason: data.reason,
          duration: data.duration,
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers['user-agent'],
        });

        // Disconnect the banned user
        const sockets = socket.nsp.sockets;
        for (const [, targetSocket] of sockets) {
          const authSocket = targetSocket as AuthenticatedSocket;
          if (authSocket.user?.id === data.userId) {
            const notification: UserBannedNotification = {
              reason: data.reason,
              banType: data.banType,
            };
            targetSocket.emit(SOCKET_EVENTS.USER_BANNED, notification);
            targetSocket.disconnect(true);
            break;
          }
        }

        const response: AdminBanUserResponse = { success: true, ban };
        callback(response);
      } catch (error) {
        console.error('[moderation] Ban user error:', error);
        const response: AdminBanUserResponse = { success: false, error: (error as Error).message };
        callback(response);
      }
    },
  );

  // Unban user
  socket.on(
    SOCKET_EVENTS.ADMIN_UNBAN_USER,
    async (data: AdminUnbanUserRequest, callback: (response: AdminUnbanUserResponse) => void) => {
      try {
        await moderationService.unbanUser(
          data.userId,
          socket.user!.id,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        const response: AdminUnbanUserResponse = { success: true };
        callback(response);
      } catch (error) {
        console.error('[moderation] Unban user error:', error);
        const response: AdminUnbanUserResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );

  // Mute user
  socket.on(
    SOCKET_EVENTS.ADMIN_MUTE_USER,
    async (data: AdminMuteUserRequest, callback: (response: AdminMuteUserResponse) => void) => {
      try {
        const ban = await moderationService.muteUser(
          data.userId,
          socket.user!.id,
          data.duration,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        // Notify the muted user
        const sockets = socket.nsp.sockets;
        for (const [, targetSocket] of sockets) {
          const authSocket = targetSocket as AuthenticatedSocket;
          if (authSocket.user?.id === data.userId) {
            const notification: UserMutedNotification = {
              reason: data.reason,
              duration: data.duration,
              expiresAt: ban.expiresAt,
            };
            targetSocket.emit(SOCKET_EVENTS.USER_MUTED, notification);
            break;
          }
        }

        const response: AdminMuteUserResponse = { success: true, ban };
        callback(response);
      } catch (error) {
        console.error('[moderation] Mute user error:', error);
        const response: AdminMuteUserResponse = { success: false, error: (error as Error).message };
        callback(response);
      }
    },
  );

  // Kick user
  socket.on(
    SOCKET_EVENTS.ADMIN_KICK_USER,
    async (data: AdminKickUserRequest, callback: (response: AdminKickUserResponse) => void) => {
      try {
        await moderationService.kickUser(
          data.userId,
          socket.user!.id,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        // Disconnect the user
        const sockets = socket.nsp.sockets;
        for (const [, targetSocket] of sockets) {
          const authSocket = targetSocket as AuthenticatedSocket;
          if (authSocket.user?.id === data.userId) {
            const notification: UserKickedNotification = { reason: data.reason };
            targetSocket.emit(SOCKET_EVENTS.USER_KICKED, notification);
            targetSocket.disconnect(true);
            break;
          }
        }

        const response: AdminKickUserResponse = { success: true };
        callback(response);
      } catch (error) {
        console.error('[moderation] Kick user error:', error);
        const response: AdminKickUserResponse = { success: false, error: (error as Error).message };
        callback(response);
      }
    },
  );

  // Delete message
  socket.on(
    SOCKET_EVENTS.ADMIN_DELETE_MESSAGE,
    async (
      data: AdminDeleteMessageRequest,
      callback: (response: AdminDeleteMessageResponse) => void,
    ) => {
      try {
        await moderationService.deleteMessage(
          data.messageId,
          socket.user!.id,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        const response: AdminDeleteMessageResponse = { success: true };
        callback(response);
      } catch (error) {
        console.error('[moderation] Delete message error:', error);
        const response: AdminDeleteMessageResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );

  // Delete post
  socket.on(
    SOCKET_EVENTS.ADMIN_DELETE_POST,
    async (data: AdminDeletePostRequest, callback: (response: AdminDeletePostResponse) => void) => {
      try {
        await moderationService.deletePost(
          data.postId,
          socket.user!.id,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        const response: AdminDeletePostResponse = { success: true };
        callback(response);
      } catch (error) {
        console.error('[moderation] Delete post error:', error);
        const response: AdminDeletePostResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );

  // Get active bans
  socket.on(
    SOCKET_EVENTS.ADMIN_GET_ACTIVE_BANS,
    async (callback: (response: AdminGetActiveBansResponse) => void) => {
      try {
        const bans = await moderationService.getActiveBans();
        const response: AdminGetActiveBansResponse = { success: true, bans };
        callback(response);
      } catch (error) {
        console.error('[moderation] Get active bans error:', error);
        const response: AdminGetActiveBansResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );

  // Get moderation history
  socket.on(
    SOCKET_EVENTS.ADMIN_GET_MODERATION_HISTORY,
    async (
      data: AdminGetModerationHistoryRequest,
      callback: (response: AdminGetModerationHistoryResponse) => void,
    ) => {
      try {
        const history = await moderationService.getModerationHistory(
          data.targetUserId,
          data.moderatorId,
        );
        const response: AdminGetModerationHistoryResponse = { success: true, history };
        callback(response);
      } catch (error) {
        console.error('[moderation] Get moderation history error:', error);
        const response: AdminGetModerationHistoryResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );

  // Get recent moderation actions
  socket.on(
    SOCKET_EVENTS.ADMIN_GET_RECENT_ACTIONS,
    async (
      data: AdminGetRecentActionsRequest,
      callback: (response: AdminGetRecentActionsResponse) => void,
    ) => {
      try {
        const actions = await moderationService.getRecentModerationActions(data.limit);
        const response: AdminGetRecentActionsResponse = { success: true, actions };
        callback(response);
      } catch (error) {
        console.error('[moderation] Get recent actions error:', error);
        const response: AdminGetRecentActionsResponse = {
          success: false,
          error: (error as Error).message,
        };
        callback(response);
      }
    },
  );
}
