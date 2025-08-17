// apps/server/src/handlers/moderationHandlers.ts
import type { AuthenticatedSocket } from '../middleware/socketAuthMiddleware';
import { moderationService } from '../services/moderation.service';
import type { BanType } from '@prisma/client';

export function registerModerationHandlers(socket: AuthenticatedSocket): void {
  // Ensure user is admin
  if (socket.user?.role !== 'ADMIN') {
    return;
  }

  // Ban user
  socket.on(
    'admin:banUser',
    async (
      data: {
        userId: number;
        banType: BanType;
        reason: string;
        duration?: number;
      },
      callback,
    ) => {
      try {
        const ban = await moderationService.banUser({
          userId: data.userId,
          moderatorId: socket.user!.id,
          banType: data.banType,
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
            targetSocket.emit('user:banned', { reason: data.reason, banType: data.banType });
            targetSocket.disconnect(true);
            break;
          }
        }

        callback({ success: true, ban });
      } catch (error) {
        console.error('[moderation] Ban user error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Unban user
  socket.on('admin:unbanUser', async (data: { userId: number }, callback) => {
    try {
      await moderationService.unbanUser(
        data.userId,
        socket.user!.id,
        socket.handshake.address,
        socket.handshake.headers['user-agent'],
      );

      callback({ success: true });
    } catch (error) {
      console.error('[moderation] Unban user error:', error);
      callback({ success: false, error: (error as Error).message });
    }
  });

  // Mute user
  socket.on(
    'admin:muteUser',
    async (
      data: {
        userId: number;
        duration: number;
        reason: string;
      },
      callback,
    ) => {
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
            targetSocket.emit('user:muted', {
              reason: data.reason,
              duration: data.duration,
              expiresAt: ban.expiresAt,
            });
            break;
          }
        }

        callback({ success: true, ban });
      } catch (error) {
        console.error('[moderation] Mute user error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Kick user
  socket.on(
    'admin:kickUser',
    async (
      data: {
        userId: number;
        reason: string;
      },
      callback,
    ) => {
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
            targetSocket.emit('user:kicked', { reason: data.reason });
            targetSocket.disconnect(true);
            break;
          }
        }

        callback({ success: true });
      } catch (error) {
        console.error('[moderation] Kick user error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Delete message
  socket.on(
    'admin:deleteMessage',
    async (
      data: {
        messageId: number;
        reason: string;
      },
      callback,
    ) => {
      try {
        await moderationService.deleteMessage(
          data.messageId,
          socket.user!.id,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        callback({ success: true });
      } catch (error) {
        console.error('[moderation] Delete message error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Delete post
  socket.on(
    'admin:deletePost',
    async (
      data: {
        postId: number;
        reason: string;
      },
      callback,
    ) => {
      try {
        await moderationService.deletePost(
          data.postId,
          socket.user!.id,
          data.reason,
          socket.handshake.address,
          socket.handshake.headers['user-agent'],
        );

        callback({ success: true });
      } catch (error) {
        console.error('[moderation] Delete post error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Get active bans
  socket.on('admin:getActiveBans', async (callback) => {
    try {
      const bans = await moderationService.getActiveBans();
      callback({ success: true, bans });
    } catch (error) {
      console.error('[moderation] Get active bans error:', error);
      callback({ success: false, error: (error as Error).message });
    }
  });

  // Get moderation history
  socket.on(
    'admin:getModerationHistory',
    async (
      data: {
        targetUserId?: number;
        moderatorId?: number;
      },
      callback,
    ) => {
      try {
        const history = await moderationService.getModerationHistory(
          data.targetUserId,
          data.moderatorId,
        );
        callback({ success: true, history });
      } catch (error) {
        console.error('[moderation] Get moderation history error:', error);
        callback({ success: false, error: (error as Error).message });
      }
    },
  );

  // Get recent moderation actions
  socket.on('admin:getRecentActions', async (data: { limit?: number }, callback) => {
    try {
      const actions = await moderationService.getRecentModerationActions(data.limit);
      callback({ success: true, actions });
    } catch (error) {
      console.error('[moderation] Get recent actions error:', error);
      callback({ success: false, error: (error as Error).message });
    }
  });
}
