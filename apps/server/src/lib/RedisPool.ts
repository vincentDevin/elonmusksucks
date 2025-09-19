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
