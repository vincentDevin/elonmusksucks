// apps/server/src/services/payout.service.ts
// -----------------------------------------------------------------------------
// Resolves predictions and ensures a `prediction:resolve` Redis event is
// published when the resolution happens synchronously (tests / dev mode).
// -----------------------------------------------------------------------------

import type { IPayoutRepository } from '../repositories/interfaces/IPayoutRepository';
import type { PublicPrediction } from '@ems/types';
import { QUEUE_NAMES, REDIS_CHANNELS } from '@ems/types';
import { PayoutRepository } from '../repositories/PayoutRepository';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createQueueOptions } from '../lib/bullmqConfig';
import { leaderboardService } from './leaderboard.service';
import type { LeaderboardTrigger } from './leaderboard.service';
import { unifiedActivityService } from './unifiedActivity.service';
import { eventBus } from '../lib/EventBus';

// Create a separate Redis client for subscriptions to avoid conflicts
const subscriptionRedis = new IORedis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
});

subscriptionRedis.on('error', (err: Error) => {
  console.error('[leaderboard] Subscription Redis client error:', err);
});

subscriptionRedis.on('connect', () => {
  console.log('[leaderboard] Subscription Redis client connected');
});

export class PayoutService {
  private payoutQueue = new Queue(QUEUE_NAMES.PAYOUTS, createQueueOptions('PAYOUTS'));

  constructor(private repo: IPayoutRepository = new PayoutRepository()) {}

  /**
   * Trigger prediction resolution. If `markResolving` exists we off‑load heavy
   * work to a worker; otherwise we resolve immediately (used in tests / local).
   * In the immediate path we also publish a `prediction:resolve` event so
   * connected clients update right away.
   */
  async resolvePrediction(
    predictionId: number,
    winningOptionId: number,
  ): Promise<PublicPrediction | void> {
    // ── TEST / SYNC PATH ────────────────────────────────────────────────────
    if (typeof this.repo.markResolving !== 'function') {
      const resolved = await this.repo.resolvePrediction(predictionId, winningOptionId);

      // Publish real‑time update so front‑end sees result instantly
      await eventBus.publish(REDIS_CHANNELS.PREDICTION_RESOLVE, resolved);

      // The resolved prediction from the repository includes options
      const resolvedWithOptions = resolved as PublicPrediction & {
        options?: Array<{ id: number; label: string }>;
      };
      const winningOption = resolvedWithOptions.options?.find(
        (opt: any) => opt.id === winningOptionId,
      );

      // Publish to unified activity system
      if (winningOption) {
        // Get resolver info (could be system/admin)
        const resolver = {
          id: 0, // System resolver
          name: 'System',
          avatarUrl: null,
        };

        await unifiedActivityService.createPredictionResolvedActivity(
          {
            id: resolved.id,
            title: resolved.title,
            category: resolved.category,
            winningOption: winningOption.label,
          },
          resolver,
        );
      }

      // Trigger leaderboard update for prediction completion
      await this.triggerLeaderboardUpdate(predictionId, resolved);

      return resolved;
    }

    // ── ASYNC PATH ──────────────────────────────────────────────────────────
    // 1) flip DB flag so UI can show "resolving" state
    await this.repo.markResolving(predictionId, winningOptionId);

    // 2) enqueue heavy payout calc for background worker
    await this.payoutQueue.add('processPayout', {
      predictionId,
      winningOptionId,
    });

    // 3) trigger leaderboard update (async path will be handled by worker)
    const trigger: LeaderboardTrigger = {
      event: 'prediction:completed',
      priority: 'batched',
      affectedMetrics: ['profit', 'winRate', 'streak'],
      metadata: { predictionId, winningOptionId },
    };

    await leaderboardService.triggerUpdate(trigger);
  }

  /**
   * Trigger leaderboard updates based on prediction resolution
   */
  private async triggerLeaderboardUpdate(
    predictionId: number,
    resolvedPrediction: PublicPrediction,
  ): Promise<void> {
    try {
      // Create trigger for prediction completion
      const trigger: LeaderboardTrigger = {
        event: 'prediction:completed',
        priority: 'immediate', // Immediate for sync path
        affectedMetrics: ['profit', 'winRate', 'streak'],
        metadata: {
          predictionId,
          category: resolvedPrediction.category,
        },
      };

      await leaderboardService.triggerUpdate(trigger);

      console.log(`[leaderboard] Triggered update for prediction ${predictionId} resolution`);
    } catch (error) {
      console.error(
        `[leaderboard] Failed to trigger update for prediction ${predictionId}:`,
        error,
      );
      // Don't throw - leaderboard update failure shouldn't break prediction resolution
    }
  }
}

export const payoutService = new PayoutService();

// Listen for payout completion events to trigger additional leaderboard updates
const initializePayoutSubscription = async () => {
  try {
    // Subscribe to the channel
    await subscriptionRedis.subscribe('payout:completed');
    console.log('[leaderboard] Payout completion subscription initialized');

    // Handle incoming messages
    subscriptionRedis.on('message', async (channel: string, message: string) => {
      if (channel === 'payout:completed') {
        try {
          const data = JSON.parse(message);
          const { predictionId, affectedUsers } = data;

          // Trigger leaderboard updates for users whose balances changed
          if (Array.isArray(affectedUsers)) {
            for (const userId of affectedUsers) {
              const trigger: LeaderboardTrigger = {
                event: 'bet:resolved',
                priority: 'batched',
                userId,
                affectedMetrics: ['profit', 'winRate'],
                metadata: { predictionId },
              };

              await leaderboardService.triggerUpdate(trigger);
            }
          }
        } catch (error) {
          console.error('[leaderboard] Failed to process payout completion event:', error);
        }
      }
    });
  } catch (error) {
    console.error('[leaderboard] Failed to subscribe to payout completion events:', error);
  }
};

// Initialize subscription
initializePayoutSubscription();
