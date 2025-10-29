// apps/server/src/lib/RedisPool.ts
// -----------------------------------------------------------------------------
// Redis connection pooling for optimizing connection usage across services
// -----------------------------------------------------------------------------

import IORedis, { type RedisOptions } from 'ioredis';
import type { IRedisPool, RedisPoolConfig, RedisPoolHealth } from '@ems/types';

export class RedisPool implements IRedisPool {
  private connections: IORedis[] = [];
  private availableConnections: IORedis[] = [];
  private pendingRequests: Array<{
    resolve: (conn: IORedis) => void;
    reject: (err: Error) => void;
  }> = [];
  private config: RedisPoolConfig;
  private redisOptions: RedisOptions;
  private destroyed = false;
  private healthStats: RedisPoolHealth = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    failedAcquisitions: 0,
    avgAcquisitionTime: 0,
    lastHealthCheck: Date.now(),
  };

  constructor(redisOptions: RedisOptions, config: Partial<RedisPoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      minConnections: config.minConnections || 2,
      acquireTimeoutMs: config.acquireTimeoutMs || 5000,
      idleTimeoutMs: config.idleTimeoutMs || 30000,
    };
    this.redisOptions = redisOptions;

    // Initialize minimum connections
    this.initializePool();
  }

  // ============================================================================
  // Redis Data Operations (IRedisPool interface compliance)
  // ============================================================================

  async get(key: string): Promise<string | null> {
    const conn = await this.getConnection();
    try {
      return await conn.get(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    const conn = await this.getConnection();
    try {
      if (ttl) {
        await conn.setex(key, ttl, value);
      } else {
        await conn.set(key, value);
      }
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async del(key: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.del(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async delMany(keys: string[]): Promise<number> {
    if (keys.length === 0) return 0;
    const conn = await this.getConnection();
    try {
      return await conn.del(...keys);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async exists(key: string): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const result = await conn.exists(key);
      return result === 1;
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const result = await conn.expire(key, seconds);
      return result === 1;
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async ttl(key: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.ttl(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async incr(key: string, amount = 1): Promise<number> {
    const conn = await this.getConnection();
    try {
      if (amount === 1) {
        return await conn.incr(key);
      }
      return await conn.incrby(key, amount);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async decr(key: string, amount = 1): Promise<number> {
    const conn = await this.getConnection();
    try {
      if (amount === 1) {
        return await conn.decr(key);
      }
      return await conn.decrby(key, amount);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async mget(keys: string[]): Promise<Array<string | null>> {
    if (keys.length === 0) return [];
    const conn = await this.getConnection();
    try {
      return await conn.mget(...keys);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async mset(entries: Array<{ key: string; value: string }>): Promise<void> {
    if (entries.length === 0) return;
    const conn = await this.getConnection();
    try {
      const args = entries.flatMap((entry) => [entry.key, entry.value]);
      await conn.mset(...args);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async sadd(key: string, member: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.sadd(key, member);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async srem(key: string, member: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.srem(key, member);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async sismember(key: string, member: string): Promise<boolean> {
    const conn = await this.getConnection();
    try {
      const result = await conn.sismember(key, member);
      return result === 1;
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async smembers(key: string): Promise<string[]> {
    const conn = await this.getConnection();
    try {
      return await conn.smembers(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zadd(key: string, score: number, member: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.zadd(key, score, member);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zrange(
    key: string,
    start: number,
    stop: number,
    withScores = false,
  ): Promise<string[] | Array<{ member: string; score: number }>> {
    const conn = await this.getConnection();
    try {
      if (withScores) {
        const results = await conn.zrange(key, start, stop, 'WITHSCORES');
        const pairs: Array<{ member: string; score: number }> = [];
        for (let i = 0; i < results.length; i += 2) {
          pairs.push({
            member: results[i],
            score: parseFloat(results[i + 1]),
          });
        }
        return pairs;
      }
      return await conn.zrange(key, start, stop);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    const conn = await this.getConnection();
    try {
      return await conn.zrangebyscore(key, min, max);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zrank(key: string, member: string): Promise<number | null> {
    const conn = await this.getConnection();
    try {
      return await conn.zrank(key, member);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zscore(key: string, member: string): Promise<number | null> {
    const conn = await this.getConnection();
    try {
      const result = await conn.zscore(key, member);
      return result !== null ? parseFloat(result) : null;
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async zrem(key: string, member: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.zrem(key, member);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    const conn = await this.getConnection();
    try {
      await conn.hset(key, field, value);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async hget(key: string, field: string): Promise<string | null> {
    const conn = await this.getConnection();
    try {
      return await conn.hget(key, field);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    const conn = await this.getConnection();
    try {
      return await conn.hgetall(key);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async hdel(key: string, field: string): Promise<number> {
    const conn = await this.getConnection();
    try {
      return await conn.hdel(key, field);
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async pipeline(commands: Array<[string, ...string[]]>): Promise<unknown[]> {
    const conn = await this.getConnection();
    try {
      const pipeline = conn.pipeline();
      for (const [cmd, ...args] of commands) {
        (pipeline as any)[cmd](...args);
      }
      const results = await pipeline.exec();
      return results?.map((r) => r[1]) || [];
    } finally {
      await this.releaseConnection(conn);
    }
  }

  async close(): Promise<void> {
    await this.destroy();
  }

  // ============================================================================
  // Pool Management Operations
  // ============================================================================

  private async initializePool(): Promise<void> {
    for (let i = 0; i < this.config.minConnections; i++) {
      try {
        const connection = await this.createConnection();
        this.connections.push(connection);
        this.availableConnections.push(connection);
      } catch (error) {
        console.error('[redis-pool] Failed to initialize connection:', error);
      }
    }
  }

  private async createConnection(): Promise<IORedis> {
    const connection = new IORedis(this.redisOptions);

    connection.on('error', (err) => {
      console.error('[redis-pool] Connection error:', err);
      this.removeConnection(connection);
    });

    connection.on('end', () => {
      this.removeConnection(connection);
    });

    return connection;
  }

  private removeConnection(connection: IORedis): void {
    const connIndex = this.connections.indexOf(connection);
    if (connIndex > -1) {
      this.connections.splice(connIndex, 1);
    }

    const availIndex = this.availableConnections.indexOf(connection);
    if (availIndex > -1) {
      this.availableConnections.splice(availIndex, 1);
    }
  }

  async getConnection(): Promise<IORedis> {
    const startTime = Date.now();

    if (this.destroyed) {
      throw new Error('Pool has been destroyed');
    }

    // If we have available connections, use one
    if (this.availableConnections.length > 0) {
      const connection = this.availableConnections.pop()!;
      const acquisitionTime = Date.now() - startTime;
      this.updateAcquisitionTime(acquisitionTime);
      return connection;
    }

    // If we can create more connections, do so
    if (this.connections.length < this.config.maxConnections) {
      try {
        const connection = await this.createConnection();
        this.connections.push(connection);
        const acquisitionTime = Date.now() - startTime;
        this.updateAcquisitionTime(acquisitionTime);
        return connection;
      } catch (error) {
        console.error('[redis-pool] Failed to create connection:', error);
      }
    }

    // Wait for a connection to become available
    return new Promise<IORedis>((resolve, reject) => {
      const timeout = setTimeout(() => {
        const index = this.pendingRequests.findIndex((req) => req.resolve === resolve);
        if (index > -1) {
          this.pendingRequests.splice(index, 1);
        }
        this.healthStats.failedAcquisitions++;
        reject(new Error('Pool acquire timeout'));
      }, this.config.acquireTimeoutMs);

      this.pendingRequests.push({
        resolve: (conn) => {
          clearTimeout(timeout);
          const acquisitionTime = Date.now() - startTime;
          this.updateAcquisitionTime(acquisitionTime);
          resolve(conn);
        },
        reject: (err) => {
          clearTimeout(timeout);
          reject(err);
        },
      });
    });
  }

  async releaseConnection(connection: IORedis): Promise<void> {
    if (this.destroyed || !this.connections.includes(connection)) {
      return;
    }

    // If there are pending requests, fulfill one
    if (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift()!;
      request.resolve(connection);
      return;
    }

    // Return to available pool
    this.availableConnections.push(connection);
  }

  getStats(): { active: number; idle: number; total: number } {
    return {
      total: this.connections.length,
      idle: this.availableConnections.length,
      active: this.connections.length - this.availableConnections.length,
    };
  }

  getHealthStats(): RedisPoolHealth {
    this.updateHealthStats();
    return { ...this.healthStats };
  }

  private updateHealthStats(): void {
    this.healthStats.totalConnections = this.connections.length;
    this.healthStats.activeConnections = this.connections.length - this.availableConnections.length;
    this.healthStats.idleConnections = this.availableConnections.length;
    this.healthStats.lastHealthCheck = Date.now();
  }

  private updateAcquisitionTime(acquisitionTimeMs: number): void {
    // Exponential moving average for acquisition time
    this.healthStats.avgAcquisitionTime =
      this.healthStats.avgAcquisitionTime * 0.9 + acquisitionTimeMs * 0.1;
  }

  async destroy(): Promise<void> {
    this.destroyed = true;

    // Reject all pending requests
    for (const request of this.pendingRequests) {
      request.reject(new Error('Pool destroyed'));
    }
    this.pendingRequests.length = 0;

    // Close all connections
    await Promise.all(this.connections.map((conn) => conn.quit()));
    this.connections.length = 0;
    this.availableConnections.length = 0;
  }
}
