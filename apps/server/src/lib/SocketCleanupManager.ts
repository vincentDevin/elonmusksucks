// apps/server/src/lib/SocketCleanupManager.ts
// -----------------------------------------------------------------------------
// Socket.IO event listener cleanup manager to prevent memory leaks
// -----------------------------------------------------------------------------

import type { ISocketCleanupManager, SocketEventListener } from '@ems/types';

export class SocketCleanupManager implements ISocketCleanupManager {
  private socketListeners: Map<string, SocketEventListener[]> = new Map();

  /**
   * Register an event handler for cleanup tracking
   */
  registerHandler(
    socketId: string,
    event: string,
    handler: Function,
    cleanup?: () => void | Promise<void>,
  ): void {
    if (!this.socketListeners.has(socketId)) {
      this.socketListeners.set(socketId, []);
    }

    const listeners = this.socketListeners.get(socketId)!;
    listeners.push({
      event,
      handler,
      cleanup,
    });
  }

  /**
   * Clean up all registered handlers for a socket
   */
  async cleanupSocket(socketId: string): Promise<void> {
    const listeners = this.socketListeners.get(socketId);
    if (!listeners) return;

    // Execute custom cleanup functions
    const cleanupPromises: Promise<void>[] = [];
    for (const listener of listeners) {
      if (listener.cleanup) {
        try {
          const result = listener.cleanup();
          if (result && typeof result.then === 'function') {
            cleanupPromises.push(result);
          }
        } catch (error) {
          console.error(`[cleanup] Error in cleanup for event ${listener.event}:`, error);
        }
      }
    }

    // Wait for all cleanup operations to complete
    if (cleanupPromises.length > 0) {
      try {
        await Promise.allSettled(cleanupPromises);
      } catch (error) {
        console.error('[cleanup] Error waiting for cleanup operations:', error);
      }
    }

    // Remove from tracking
    this.socketListeners.delete(socketId);

    console.log(`[cleanup] Cleaned up ${listeners.length} event handlers for socket ${socketId}`);
  }

  /**
   * Get total listener count across all sockets or for specific socket
   */
  getListenerCount(socketId?: string): number {
    if (socketId) {
      return this.socketListeners.get(socketId)?.length || 0;
    }

    let total = 0;
    for (const listeners of this.socketListeners.values()) {
      total += listeners.length;
    }
    return total;
  }

  /**
   * Get cleanup statistics for monitoring
   */
  getStats() {
    const socketsWithListeners = this.socketListeners.size;
    const totalListeners = this.getListenerCount();
    const avgListenersPerSocket =
      socketsWithListeners > 0
        ? Math.round((totalListeners / socketsWithListeners) * 100) / 100
        : 0;

    return {
      socketsWithListeners,
      totalListeners,
      avgListenersPerSocket,
    };
  }

  /**
   * Clean up abandoned sockets (for emergency cleanup)
   */
  async cleanupAll(): Promise<void> {
    const socketIds = Array.from(this.socketListeners.keys());
    const cleanupPromises = socketIds.map((id) => this.cleanupSocket(id));

    await Promise.allSettled(cleanupPromises);
    console.log(`[cleanup] Emergency cleanup completed for ${socketIds.length} sockets`);
  }
}

// Singleton instance for global use
export const socketCleanupManager = new SocketCleanupManager();
