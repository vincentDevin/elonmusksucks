/**
 * Config Layer - Socket.IO Configuration
 *
 * Socket.IO server configuration, heartbeat, acknowledgments, and timeouts
 */

// ============================================================================
// ACK Configuration
// ============================================================================

/**
 * ACK Timeout Configuration
 */
export interface ACKTimeoutConfig {
  timeoutMs: number;
  maxRetries: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
}

/**
 * ACK Retry Policy
 */
export interface ACKRetryPolicy {
  enabled: boolean;
  maxAttempts: number;
  attempt?: number;
  backoffStrategy: 'linear' | 'exponential';
  initialDelayMs: number;
  maxDelayMs: number;
  nextRetryDelayMs?: number;
}

// ============================================================================
// Socket.IO Server Configuration
// ============================================================================

/**
 * Socket.IO Server Configuration
 */
export interface SocketIOServerConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
    methods?: string[];
  };
  pingTimeout: number; // milliseconds
  pingInterval: number; // milliseconds
  upgradeTimeout: number; // milliseconds
  maxHttpBufferSize: number; // bytes
  allowRequest?: (req: unknown, callback: (err: string | null | undefined, success: boolean) => void) => void;
  transports?: ('polling' | 'websocket')[];
  allowUpgrades?: boolean;
  perMessageDeflate?: boolean | PerMessageDeflateConfig;
  httpCompression?: boolean | HttpCompressionConfig;
}

/**
 * Per-Message Deflate Configuration
 */
export interface PerMessageDeflateConfig {
  threshold: number; // bytes
  zlibDeflateOptions?: {
    level?: number;
    memLevel?: number;
    strategy?: number;
  };
  zlibInflateOptions?: {
    chunkSize?: number;
    windowBits?: number;
  };
  clientNoContextTakeover?: boolean;
  serverNoContextTakeover?: boolean;
  clientMaxWindowBits?: number;
  serverMaxWindowBits?: number;
}

/**
 * HTTP Compression Configuration
 */
export interface HttpCompressionConfig {
  threshold: number; // bytes
  level?: number; // 0-9
  memLevel?: number; // 1-9
}

// ============================================================================
// Socket Authentication Configuration
// ============================================================================

/**
 * Socket Authentication Configuration
 */
export interface SocketAuthConfig {
  enabled: boolean;
  tokenHeader: string; // e.g., 'x-auth-token'
  tokenQuery: string; // e.g., 'token'
  gracePeriod: number; // milliseconds before disconnecting unauthenticated clients
  maxAttempts: number;
  lockoutDuration: number; // milliseconds
}

// ============================================================================
// Socket Heartbeat Configuration
// ============================================================================

/**
 * Socket Heartbeat Configuration
 */
export interface SocketHeartbeatConfig {
  enabled: boolean;
  interval: number; // milliseconds
  timeout: number; // milliseconds
  maxMissed: number; // Number of missed heartbeats before disconnect
}

// ============================================================================
// Socket ACK Configuration
// ============================================================================

/**
 * Socket ACK Configuration
 */
export interface SocketAckConfig {
  timeout: number; // milliseconds
  retries: number;
  retryDelay: number; // milliseconds
  exponentialBackoff: boolean;
}

/**
 * ACK Timeout Configuration by Event Type
 */
export interface EventAckTimeouts {
  default: number; // milliseconds
  critical: number; // For critical events (betting, pong)
  normal: number; // For normal events (chat, reactions)
  background: number; // For low-priority events (analytics)
}

// ============================================================================
// Socket Room Configuration
// ============================================================================

/**
 * Socket Room Configuration
 */
export interface SocketRoomConfig {
  maxRoomsPerSocket: number;
  maxSocketsPerRoom?: number;
  roomPrefix?: string;
  autoCleanup: boolean;
  cleanupInterval: number; // milliseconds
}

/**
 * Room Naming Conventions
 */
export interface RoomNamingConvention {
  user: (userId: number) => string; // e.g., `user:${userId}`
  prediction: (predictionId: number) => string; // e.g., `prediction:${predictionId}`
  pongMatch: (matchId: string) => string; // e.g., `pong:match:${matchId}`
  category: (categoryId: number) => string; // e.g., `category:${categoryId}`
  global: string; // e.g., 'global'
  leaderboard: (type: string) => string; // e.g., `leaderboard:${type}`
}

// ============================================================================
// Socket Event Rate Limiting
// ============================================================================

/**
 * Socket Event Rate Limiting
 */
export interface SocketEventRateLimit {
  enabled: boolean;
  windowMs: number;
  maxEvents: number;
  byEvent?: Record<string, { windowMs: number; maxEvents: number }>;
  punishmentDuration?: number; // milliseconds to mute/disconnect
}

// ============================================================================
// Socket Namespace Configuration
// ============================================================================

/**
 * Socket Namespace Configuration
 */
export interface SocketNamespaceConfig {
  name: string;
  path: string;
  auth?: SocketAuthConfig;
  rateLimit?: SocketEventRateLimit;
  rooms?: SocketRoomConfig;
}

/**
 * Namespace Definitions
 */
export const SocketNamespaces = {
  DEFAULT: {
    name: 'default',
    path: '/',
  },
  PONG: {
    name: 'pong',
    path: '/pong',
  },
  ADMIN: {
    name: 'admin',
    path: '/admin',
  },
} as const;

export type SocketNamespace = (typeof SocketNamespaces)[keyof typeof SocketNamespaces];

// ============================================================================
// Socket Middleware Configuration
// ============================================================================

/**
 * Socket Middleware Configuration
 */
export interface SocketMiddlewareConfig {
  auth: boolean;
  rateLimit: boolean;
  logging: boolean;
  errorHandling: boolean;
  compression: boolean;
  order?: string[]; // Middleware execution order
}

// ============================================================================
// Socket Connection Limits
// ============================================================================

/**
 * Socket Connection Limits
 */
export interface SocketConnectionLimits {
  maxConnectionsPerUser: number;
  maxConnectionsPerIP?: number;
  maxTotalConnections?: number;
  gracefulShutdown: boolean;
  shutdownTimeout: number; // milliseconds
}

// ============================================================================
// Socket Reconnection Configuration
// ============================================================================

/**
 * Socket Reconnection Configuration (Client-side guidance)
 */
export interface SocketReconnectionConfig {
  enabled: boolean;
  attempts: number; // Max reconnection attempts
  delay: number; // Initial delay in milliseconds
  delayMax: number; // Maximum delay in milliseconds
  randomizationFactor: number; // 0-1, adds jitter
  timeout: number; // Connection timeout in milliseconds
}

// ============================================================================
// Socket Monitoring Configuration
// ============================================================================

/**
 * Socket Monitoring Configuration
 */
export interface SocketMonitoringConfig {
  enabled: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  metrics: {
    connections: boolean;
    events: boolean;
    rooms: boolean;
    latency: boolean;
    errors: boolean;
  };
  aggregationInterval: number; // milliseconds
  retentionPeriod: number; // milliseconds
}

// ============================================================================
// Pong Server Specific Configuration
// ============================================================================

/**
 * Pong Server Socket Configuration
 */
export interface PongSocketConfig extends SocketIOServerConfig {
  tickRate: number; // Game updates per second
  maxSpectators: number; // Per game
  spectatorDelay: number; // milliseconds delay for spectators
  inputBufferSize: number; // Number of input events to buffer
  stateSnapshotInterval: number; // milliseconds
  antiCheat: {
    enabled: boolean;
    maxInputRate: number; // Max inputs per second
    validateClientState: boolean;
  };
}

// ============================================================================
// Socket.IO Adapter Configuration (Redis)
// ============================================================================

/**
 * Socket.IO Redis Adapter Configuration
 */
export interface SocketRedisAdapterConfig {
  enabled: boolean;
  pubClient: unknown; // Redis client
  subClient: unknown; // Redis client
  key: string; // Prefix for Redis keys
  requestsTimeout: number; // milliseconds
}
