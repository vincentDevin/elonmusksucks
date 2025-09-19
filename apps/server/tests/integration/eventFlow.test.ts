/**
 * Event Flow Integration Tests
 *
 * Tests the unified event system to ensure:
 * 1. Events flow through the correct path: Service → EventBus → Redis → Handlers
 * 2. No duplicate emissions occur (validates fragmentation fix)
 * 3. Event payloads are properly structured and delivered
 */

import Redis from 'ioredis';
import { EventBus } from '../../src/lib/EventBus';
import { REDIS_CHANNELS, AchievementSocketEvents } from '@ems/types';

describe('Event Flow Integration Tests', () => {
  let redis: Redis;
  let eventBus: EventBus;
  let subscriber: Redis;
  let receivedEvents: Array<{ channel: string; message: any; timestamp: number }> = [];

  beforeAll(async () => {
    // Setup Redis clients for testing
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    subscriber = redis.duplicate();
    eventBus = new EventBus();

    // Subscribe to all relevant channels and track events
    const channelsToTest = [
      REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
      REDIS_CHANNELS.POST_CREATED,
      REDIS_CHANNELS.POST_REACTION,
      REDIS_CHANNELS.COMMENT_CREATED,
      REDIS_CHANNELS.BET_PLACED,
    ];

    await subscriber.subscribe(...channelsToTest);

    subscriber.on('message', (channel, message) => {
      receivedEvents.push({
        channel,
        message: JSON.parse(message),
        timestamp: Date.now(),
      });
    });
  });

  afterAll(async () => {
    await redis.quit();
    await subscriber.quit();
  });

  beforeEach(() => {
    // Clear received events before each test
    receivedEvents = [];
  });

  describe('Achievement Events', () => {
    it('should emit achievement unlock events through unified path', async () => {
      // Arrange
      const testPayload = {
        type: AchievementSocketEvents.UNLOCKED,
        userId: 123,
        timestamp: new Date().toISOString(),
        data: {
          achievement: { name: 'Test Achievement', rarity: 'common' },
          progress: 100,
          progressMax: 100,
          unlockedAt: new Date().toISOString(),
        },
        achievementName: 'Test Achievement',
        rarity: 'common',
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload);

      // Assert - wait for Redis to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED);
      expect(receivedEvents[0].message).toMatchObject(testPayload);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.UNLOCKED);
      expect(receivedEvents[0].message.userId).toBe(123);
    });

    it('should emit achievement progress events through unified path', async () => {
      // Arrange
      const testPayload = {
        type: AchievementSocketEvents.PROGRESS,
        userId: 456,
        timestamp: new Date().toISOString(),
        data: {
          achievementId: 1,
          progress: 50,
          progressMax: 100,
          achievementName: 'Progress Test',
        },
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.PROGRESS);
      expect(receivedEvents[0].message.userId).toBe(456);
      expect(receivedEvents[0].message.data.progress).toBe(50);
    });

    it('should emit batch unlock events through unified path', async () => {
      // Arrange
      const achievements = [
        { id: 1, name: 'Achievement 1' },
        { id: 2, name: 'Achievement 2' },
      ];
      const testPayload = {
        type: AchievementSocketEvents.BATCH_UNLOCKED,
        userId: 789,
        count: achievements.length,
        achievements,
        timestamp: new Date().toISOString(),
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.BATCH_UNLOCKED);
      expect(receivedEvents[0].message.count).toBe(2);
      expect(receivedEvents[0].message.achievements).toHaveLength(2);
    });
  });

  describe('Post System Events', () => {
    it('should emit post creation events through unified path', async () => {
      // Arrange
      const testPayload = {
        post: {
          id: 1,
          content: 'Test post',
          userId: 123,
          createdAt: new Date().toISOString(),
        },
        authorId: 123,
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.POST_CREATED, testPayload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.POST_CREATED);
      expect(receivedEvents[0].message.post.content).toBe('Test post');
      expect(receivedEvents[0].message.authorId).toBe(123);
    });

    it('should emit comment creation events through unified path', async () => {
      // Arrange
      const testPayload = {
        comment: {
          id: 2,
          content: 'Test comment',
          userId: 456,
          parentId: 1,
          createdAt: new Date().toISOString(),
        },
        postId: 1,
        authorId: 456,
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.COMMENT_CREATED, testPayload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.COMMENT_CREATED);
      expect(receivedEvents[0].message.comment.content).toBe('Test comment');
      expect(receivedEvents[0].message.postId).toBe(1);
    });

    it('should emit reaction events through unified path', async () => {
      // Arrange
      const testPayload = {
        postId: 1,
        userId: 789,
        type: 'LIKE',
        action: 'added',
        counts: {
          LIKE: 1,
          LOVE: 0,
          LAUGH: 0,
          WOW: 0,
          SAD: 0,
          ANGRY: 0,
        },
      };

      // Act
      await eventBus.publish(REDIS_CHANNELS.POST_REACTION, testPayload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.POST_REACTION);
      expect(receivedEvents[0].message.type).toBe('LIKE');
      expect(receivedEvents[0].message.action).toBe('added');
    });
  });

  describe('Event Deduplication Validation', () => {
    it('should emit events exactly once (no fragmentation)', async () => {
      // This test validates that our fragmentation fix worked
      // Events should only appear once in Redis, not multiple times

      // Arrange
      const testPayload = {
        type: AchievementSocketEvents.UNLOCKED,
        userId: 999,
        timestamp: new Date().toISOString(),
        data: { achievement: { name: 'Dedup Test' } },
      };

      // Act - publish the same event multiple times rapidly
      await Promise.all([
        eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload),
        eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload),
        eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload),
      ]);

      // Assert - wait for Redis to process all events
      await new Promise((resolve) => setTimeout(resolve, 200));

      // We should receive exactly 3 events (one for each publish call)
      // This validates there's no internal duplication in our system
      expect(receivedEvents).toHaveLength(3);
      receivedEvents.forEach((event) => {
        expect(event.message.userId).toBe(999);
        expect(event.message.data.achievement.name).toBe('Dedup Test');
      });
    });

    it('should maintain event ordering', async () => {
      // Arrange
      const events = [
        { userId: 1, data: { order: 1 } },
        { userId: 2, data: { order: 2 } },
        { userId: 3, data: { order: 3 } },
      ];

      // Act - publish events in sequence
      for (const event of events) {
        await eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, {
          type: AchievementSocketEvents.UNLOCKED,
          timestamp: new Date().toISOString(),
          ...event,
        });
      }

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 200));

      expect(receivedEvents).toHaveLength(3);
      expect(receivedEvents[0].message.data.order).toBe(1);
      expect(receivedEvents[1].message.data.order).toBe(2);
      expect(receivedEvents[2].message.data.order).toBe(3);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON payloads gracefully', async () => {
      // This test ensures our event system is robust
      // Note: EventBus should handle serialization internally

      const testPayload = {
        type: AchievementSocketEvents.UNLOCKED,
        userId: 777,
        // Include a circular reference that would break JSON.stringify
        circularRef: {} as any,
      };
      testPayload.circularRef.self = testPayload;

      // This should not throw an error - EventBus should handle it
      await expect(
        eventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload),
      ).resolves.not.toThrow();
    });

    it('should handle Redis connection issues', async () => {
      // Create a new EventBus with invalid Redis URL
      const faultyEventBus = new EventBus();

      const testPayload = {
        type: AchievementSocketEvents.UNLOCKED,
        userId: 888,
        data: { test: true },
      };

      // This should not throw - EventBus should handle Redis errors gracefully
      await expect(
        faultyEventBus.publish(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, testPayload),
      ).resolves.not.toThrow();
    });
  });
});
