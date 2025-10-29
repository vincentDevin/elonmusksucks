/**
 * Services Layer - Socket Cleanup Manager Interface
 *
 * Abstract interface for managing Socket.IO event listener cleanup.
 * Prevents memory leaks by tracking and cleaning up socket event handlers.
 */

/**
 * Socket Event Listener
 */
export interface SocketEventListener {
  /**
   * Event name
   */
  event: string;

  /**
   * Event handler function
   */
  handler: Function;

  /**
   * Optional cleanup function to run when socket disconnects
   */
  cleanup?: (() => void | Promise<void>);
}

/**
 * Socket Cleanup Statistics
 */
export interface SocketCleanupStats {
  /**
   * Number of sockets being tracked
   */
  socketsWithListeners: number;

  /**
   * Total number of event listeners across all sockets
   */
  totalListeners: number;

  /**
   * Average listeners per socket
   */
  avgListenersPerSocket: number;
}

/**
 * Socket Cleanup Manager Interface
 *
 * Services depend on this interface for managing socket event cleanup.
 * Implementation handles listener tracking and automatic cleanup on disconnect.
 */
export interface ISocketCleanupManager {
  /**
   * Register an event handler for cleanup tracking
   *
   * @param socketId - Socket ID
   * @param event - Event name
   * @param handler - Event handler function
   * @param cleanup - Optional cleanup function
   */
  registerHandler(
    socketId: string,
    event: string,
    handler: Function,
    cleanup?: (() => void | Promise<void>)
  ): void;

  /**
   * Clean up all registered handlers for a socket
   *
   * @param socketId - Socket ID
   * @returns Promise that resolves when cleanup is complete
   */
  cleanupSocket(socketId: string): Promise<void>;

  /**
   * Get total listener count
   *
   * @param socketId - Optional socket ID to get count for specific socket
   * @returns Listener count
   */
  getListenerCount(socketId?: string): number;

  /**
   * Get cleanup statistics for monitoring
   *
   * @returns Socket cleanup statistics
   */
  getStats(): SocketCleanupStats;

  /**
   * Clean up all sockets (emergency cleanup)
   *
   * @returns Promise that resolves when all cleanup is complete
   */
  cleanupAll(): Promise<void>;
}

/**
 * Socket Cleanup Manager Factory
 *
 * Used for dependency injection in service constructors
 */
export type SocketCleanupManagerFactory = () => ISocketCleanupManager;
