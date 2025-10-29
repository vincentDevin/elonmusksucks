/**
 * Services Layer - Redis Pool Interface
 *
 * Abstract interface for Redis connection pool management.
 * Prevents direct Redis client usage in service layer.
 */

import type IORedis from 'ioredis';

/**
 * Redis Pool Configuration
 */
export interface RedisPoolConfig {
  /**
   * Maximum number of connections in the pool
   */
  maxConnections: number;

  /**
   * Minimum number of connections to maintain
   */
  minConnections: number;

  /**
   * Timeout in milliseconds for acquiring a connection
   */
  acquireTimeoutMs: number;

  /**
   * Timeout in milliseconds for idle connections
   */
  idleTimeoutMs: number;
}

/**
 * Redis Pool Health Statistics
 */
export interface RedisPoolHealth {
  /**
   * Total number of connections
   */
  totalConnections: number;

  /**
   * Number of active connections
   */
  activeConnections: number;

  /**
   * Number of idle connections
   */
  idleConnections: number;

  /**
   * Number of failed connection acquisitions
   */
  failedAcquisitions: number;

  /**
   * Average acquisition time in milliseconds
   */
  avgAcquisitionTime: number;

  /**
   * Timestamp of last health check
   */
  lastHealthCheck: number;
}

/**
 * Redis Pool Interface
 *
 * Services depend on this interface for Redis operations.
 * Implementation handles connection pooling, retry logic, and cleanup.
 */
export interface IRedisPool {
  /**
   * Get a value from Redis
   *
   * @param key - Redis key
   * @returns Promise resolving to value or null if not found
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a value in Redis
   *
   * @param key - Redis key
   * @param value - Value to store
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise that resolves when value is set
   */
  set(key: string, value: string, ttl?: number): Promise<void>;

  /**
   * Delete a key from Redis
   *
   * @param key - Redis key
   * @returns Promise resolving to number of keys deleted
   */
  del(key: string): Promise<number>;

  /**
   * Delete multiple keys from Redis
   *
   * @param keys - Array of Redis keys
   * @returns Promise resolving to number of keys deleted
   */
  delMany(keys: string[]): Promise<number>;

  /**
   * Check if a key exists in Redis
   *
   * @param key - Redis key
   * @returns Promise resolving to true if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Set expiration time on a key
   *
   * @param key - Redis key
   * @param seconds - Expiration time in seconds
   * @returns Promise resolving to true if expiration was set
   */
  expire(key: string, seconds: number): Promise<boolean>;

  /**
   * Get remaining time to live for a key
   *
   * @param key - Redis key
   * @returns Promise resolving to TTL in seconds (-1 if no expiration, -2 if key doesn't exist)
   */
  ttl(key: string): Promise<number>;

  /**
   * Increment a numeric value
   *
   * @param key - Redis key
   * @param amount - Amount to increment by (default 1)
   * @returns Promise resolving to new value
   */
  incr(key: string, amount?: number): Promise<number>;

  /**
   * Decrement a numeric value
   *
   * @param key - Redis key
   * @param amount - Amount to decrement by (default 1)
   * @returns Promise resolving to new value
   */
  decr(key: string, amount?: number): Promise<number>;

  /**
   * Get multiple values at once
   *
   * @param keys - Array of Redis keys
   * @returns Promise resolving to array of values (null for missing keys)
   */
  mget(keys: string[]): Promise<Array<string | null>>;

  /**
   * Set multiple key-value pairs at once
   *
   * @param entries - Array of key-value pairs
   * @returns Promise that resolves when all values are set
   */
  mset(entries: Array<{ key: string; value: string }>): Promise<void>;

  /**
   * Add member to a set
   *
   * @param key - Redis key
   * @param member - Member to add
   * @returns Promise resolving to number of members added
   */
  sadd(key: string, member: string): Promise<number>;

  /**
   * Remove member from a set
   *
   * @param key - Redis key
   * @param member - Member to remove
   * @returns Promise resolving to number of members removed
   */
  srem(key: string, member: string): Promise<number>;

  /**
   * Check if member exists in a set
   *
   * @param key - Redis key
   * @param member - Member to check
   * @returns Promise resolving to true if member exists
   */
  sismember(key: string, member: string): Promise<boolean>;

  /**
   * Get all members of a set
   *
   * @param key - Redis key
   * @returns Promise resolving to array of members
   */
  smembers(key: string): Promise<string[]>;

  /**
   * Add member to sorted set with score
   *
   * @param key - Redis key
   * @param score - Score for ranking
   * @param member - Member to add
   * @returns Promise resolving to number of members added
   */
  zadd(key: string, score: number, member: string): Promise<number>;

  /**
   * Get members from sorted set by rank range
   *
   * @param key - Redis key
   * @param start - Start rank (0-based)
   * @param stop - Stop rank (inclusive, -1 for end)
   * @param withScores - Include scores in result
   * @returns Promise resolving to array of members (or member-score pairs)
   */
  zrange(
    key: string,
    start: number,
    stop: number,
    withScores?: boolean
  ): Promise<string[] | Array<{ member: string; score: number }>>;

  /**
   * Get members from sorted set by score range
   *
   * @param key - Redis key
   * @param min - Minimum score
   * @param max - Maximum score
   * @returns Promise resolving to array of members
   */
  zrangebyscore(key: string, min: number, max: number): Promise<string[]>;

  /**
   * Get rank of member in sorted set
   *
   * @param key - Redis key
   * @param member - Member to check
   * @returns Promise resolving to rank (0-based) or null if not found
   */
  zrank(key: string, member: string): Promise<number | null>;

  /**
   * Get score of member in sorted set
   *
   * @param key - Redis key
   * @param member - Member to check
   * @returns Promise resolving to score or null if not found
   */
  zscore(key: string, member: string): Promise<number | null>;

  /**
   * Remove member from sorted set
   *
   * @param key - Redis key
   * @param member - Member to remove
   * @returns Promise resolving to number of members removed
   */
  zrem(key: string, member: string): Promise<number>;

  /**
   * Set hash field
   *
   * @param key - Redis key
   * @param field - Field name
   * @param value - Field value
   * @returns Promise that resolves when field is set
   */
  hset(key: string, field: string, value: string): Promise<void>;

  /**
   * Get hash field
   *
   * @param key - Redis key
   * @param field - Field name
   * @returns Promise resolving to field value or null
   */
  hget(key: string, field: string): Promise<string | null>;

  /**
   * Get all hash fields and values
   *
   * @param key - Redis key
   * @returns Promise resolving to object with field-value pairs
   */
  hgetall(key: string): Promise<Record<string, string>>;

  /**
   * Delete hash field
   *
   * @param key - Redis key
   * @param field - Field name
   * @returns Promise resolving to number of fields deleted
   */
  hdel(key: string, field: string): Promise<number>;

  /**
   * Execute a pipeline of commands atomically
   *
   * @param commands - Array of command tuples [command, ...args]
   * @returns Promise resolving to array of results
   */
  pipeline(commands: Array<[string, ...string[]]>): Promise<unknown[]>;

  /**
   * Close all connections in the pool
   *
   * @returns Promise that resolves when all connections are closed
   */
  close(): Promise<void>;

  /**
   * Get a connection from the pool (for advanced operations)
   *
   * @returns Promise resolving to a Redis connection
   */
  getConnection(): Promise<IORedis>;

  /**
   * Release a connection back to the pool
   *
   * @param connection - Redis connection to release
   * @returns Promise that resolves when connection is released
   */
  releaseConnection(connection: IORedis): Promise<void>;

  /**
   * Destroy the pool and all connections
   *
   * @returns Promise that resolves when pool is destroyed
   */
  destroy(): Promise<void>;

  /**
   * Get pool statistics
   *
   * @returns Current pool stats
   */
  getStats(): { active: number; idle: number; total: number };

  /**
   * Get detailed health statistics
   *
   * @returns Detailed health stats or null if unavailable
   */
  getHealthStats?(): RedisPoolHealth | null;
}

/**
 * Redis Pool Factory
 *
 * Used for dependency injection in service constructors
 */
export type RedisPoolFactory = () => IRedisPool;
