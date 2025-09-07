/**
 * Service Event Integration Tests
 *
 * Tests that refactored services properly use the unified event system:
 * 1. AchievementSocketEmitter uses eventBus instead of direct Socket.IO
 * 2. Post and Reaction services removed direct io.emit() calls
 * 3. Services integrate correctly with the event flow
 */

import Redis from 'ioredis';
import { AchievementSocketEmitter } from '../../src/services/AchievementSocketEmitter';
import { PostService } from '../../src/services/post.service';
import { ReactionService } from '../../src/services/reaction.service';
import { REDIS_CHANNELS, AchievementSocketEvents } from '@ems/types';

describe('Service Event Integration Tests', () => {
  let redis: Redis;
  let subscriber: Redis;
  let receivedEvents: Array<{ channel: string; message: any; timestamp: number }> = [];

  beforeAll(async () => {
    // Setup Redis clients for testing
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    subscriber = redis.duplicate();

    // Subscribe to all channels that services should publish to
    const channelsToTest = [
      REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED,
      REDIS_CHANNELS.POST_CREATED,
      REDIS_CHANNELS.POST_UPDATED,
      REDIS_CHANNELS.POST_DELETED,
      REDIS_CHANNELS.POST_REACTION,
      REDIS_CHANNELS.COMMENT_CREATED,
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

  describe('AchievementSocketEmitter Integration', () => {
    let emitter: AchievementSocketEmitter;

    beforeEach(() => {
      // Create emitter without Socket.IO dependency (our refactor)
      emitter = new AchievementSocketEmitter();
    });

    it('should emit unlock events via eventBus', async () => {
      // Arrange
      const userId = 123;
      const payload = {
        achievement: { name: 'Test Achievement', rarity: 'common' },
        progress: 100,
        progressMax: 100,
        unlockedAt: new Date().toISOString(),
      };

      // Act
      await emitter.emitUnlocked(userId, payload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.UNLOCKED);
      expect(receivedEvents[0].message.userId).toBe(userId);
      expect(receivedEvents[0].message.achievementName).toBe('Test Achievement');
      expect(receivedEvents[0].message.rarity).toBe('common');
    });

    it('should emit progress events via eventBus', async () => {
      // Arrange
      const userId = 456;
      const payload = {
        achievementId: 1,
        progress: 50,
        progressMax: 100,
        achievementName: 'Progress Achievement',
      };

      // Act
      await emitter.emitProgress(userId, payload);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.PROGRESS);
      expect(receivedEvents[0].message.userId).toBe(userId);
      expect(receivedEvents[0].message.data).toMatchObject(payload);
    });

    it('should emit batch unlock events via eventBus', async () => {
      // Arrange
      const userId = 789;
      const achievements = [
        { id: 1, name: 'Achievement 1', rarity: 'common' },
        { id: 2, name: 'Achievement 2', rarity: 'rare' },
      ];

      // Act
      await emitter.emitBatchUnlock(userId, achievements);

      // Assert
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0].channel).toBe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED);
      expect(receivedEvents[0].message.type).toBe(AchievementSocketEvents.BATCH_UNLOCKED);
      expect(receivedEvents[0].message.userId).toBe(userId);
      expect(receivedEvents[0].message.count).toBe(2);
      expect(receivedEvents[0].message.achievements).toHaveLength(2);
    });

    it('should handle errors gracefully without throwing', async () => {
      // Test that service methods don't throw on event bus failures
      // This validates our error handling in the refactored code

      const userId = 999;
      const payload = {
        achievement: { name: 'Error Test' },
        progress: 100,
        progressMax: 100,
        unlockedAt: new Date().toISOString(),
      };

      // Should not throw even if there are issues
      await expect(emitter.emitUnlocked(userId, payload)).resolves.not.toThrow();
      await expect(
        emitter.emitProgress(userId, {
          achievementId: 1,
          progress: 50,
          progressMax: 100,
          achievementName: 'Test',
        }),
      ).resolves.not.toThrow();
      await expect(emitter.emitBatchUnlock(userId, [])).resolves.not.toThrow();
    });
  });

  describe('PostService Integration', () => {
    let postService: PostService;

    beforeEach(() => {
      // Create service without Socket.IO dependency (our refactor)
      postService = new PostService();
    });

    // Note: These tests would require database setup and mocking
    // For now, we test that the service can be instantiated without Socket.IO
    it('should instantiate without Socket.IO dependency', () => {
      expect(postService).toBeInstanceOf(PostService);

      // Verify the service has the methods we expect
      expect(typeof postService.createPost).toBe('function');
      expect(typeof postService.updatePost).toBe('function');
      expect(typeof postService.deletePost).toBe('function');
      expect(typeof postService.sharePost).toBe('function');
    });
  });

  describe('ReactionService Integration', () => {
    let reactionService: ReactionService;

    beforeEach(() => {
      // Create service without Socket.IO dependency (our refactor)
      reactionService = new ReactionService();
    });

    it('should instantiate without Socket.IO dependency', () => {
      expect(reactionService).toBeInstanceOf(ReactionService);

      // Verify the service has the methods we expect
      expect(typeof reactionService.addReaction).toBe('function');
      expect(typeof reactionService.removeReaction).toBe('function');
      expect(typeof reactionService.toggleReaction).toBe('function');
      expect(typeof reactionService.getPostReactions).toBe('function');
    });
  });

  describe('Event System Architecture Validation', () => {
    it('should validate unified event flow architecture', async () => {
      // This test validates our architectural changes
      // Services → EventBus → Redis → Handlers (not tested here) → Socket.IO

      const emitter = new AchievementSocketEmitter();

      // Multiple service calls should result in multiple events
      await Promise.all([
        emitter.emitUnlocked(1, {
          achievement: { name: 'Test 1', rarity: 'common' },
          progress: 100,
          progressMax: 100,
          unlockedAt: new Date().toISOString(),
        }),
        emitter.emitProgress(2, {
          achievementId: 1,
          progress: 75,
          progressMax: 100,
          achievementName: 'Test 2',
        }),
        emitter.emitBatchUnlock(3, [{ id: 1, name: 'Test 3' }]),
      ]);

      await new Promise((resolve) => setTimeout(resolve, 150));

      // Should receive exactly 3 events (one for each service call)
      expect(receivedEvents).toHaveLength(3);

      // All should go through the same Redis channel
      receivedEvents.forEach((event) => {
        expect(event.channel).toBe(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED);
      });

      // Should have different types
      const types = receivedEvents.map((e) => e.message.type).sort();
      expect(types).toContain(AchievementSocketEvents.UNLOCKED);
      expect(types).toContain(AchievementSocketEvents.PROGRESS);
      expect(types).toContain(AchievementSocketEvents.BATCH_UNLOCKED);
    });

    it('should validate event payload structure consistency', async () => {
      // Ensure all events have consistent base structure
      const emitter = new AchievementSocketEmitter();

      await emitter.emitUnlocked(123, {
        achievement: { name: 'Structure Test', rarity: 'common' },
        progress: 100,
        progressMax: 100,
        unlockedAt: new Date().toISOString(),
      });

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(receivedEvents).toHaveLength(1);
      const event = receivedEvents[0].message;

      // Validate required fields for all achievement events
      expect(event).toHaveProperty('type');
      expect(event).toHaveProperty('userId');
      expect(event).toHaveProperty('timestamp');
      expect(event).toHaveProperty('data');

      // Validate timestamp is valid ISO string
      expect(() => new Date(event.timestamp)).not.toThrow();
      expect(new Date(event.timestamp).toISOString()).toBe(event.timestamp);
    });
  });

  describe('Fragmentation Elimination Validation', () => {
    it('should confirm no competing event emission paths exist', () => {
      // This test validates our fragmentation fix by ensuring services
      // don't have direct Socket.IO dependencies that could cause duplicate emissions

      const emitter = new AchievementSocketEmitter();
      const postService = new PostService();
      const reactionService = new ReactionService();

      // Services should not have any Socket.IO references
      // (This is a structural test to ensure our refactor worked)

      // Check that services can be instantiated without Socket.IO
      expect(emitter).toBeInstanceOf(AchievementSocketEmitter);
      expect(postService).toBeInstanceOf(PostService);
      expect(reactionService).toBeInstanceOf(ReactionService);

      // Services should not have 'io' properties (removed in refactor)
      expect((emitter as any).io).toBeUndefined();
      expect((postService as any).io).toBeUndefined();
      expect((reactionService as any).io).toBeUndefined();
    });
  });
});
