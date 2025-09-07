/**
 * Mock Achievement Emitter Unit Tests
 *
 * Tests the MockAchievementSocketEmitter for testing scenarios
 */

import { MockAchievementSocketEmitter } from '../../src/services/AchievementSocketEmitter';

describe('MockAchievementSocketEmitter', () => {
  let mockEmitter: MockAchievementSocketEmitter;

  beforeEach(() => {
    mockEmitter = new MockAchievementSocketEmitter();
  });

  it('should track unlocked events', async () => {
    // Arrange
    const userId = 123;
    const payload = {
      achievement: { name: 'Test Achievement', rarity: 'common' },
      progress: 100,
      progressMax: 100,
      unlockedAt: new Date().toISOString(),
    };

    // Act
    await mockEmitter.emitUnlocked(userId, payload);

    // Assert
    expect(mockEmitter.emittedEvents).toHaveLength(1);
    expect(mockEmitter.emittedEvents[0]).toMatchObject({
      type: 'unlocked',
      userId,
      payload,
    });
    expect(mockEmitter.emittedEvents[0].timestamp).toBeDefined();
  });

  it('should track progress events', async () => {
    // Arrange
    const userId = 456;
    const payload = {
      achievementId: 1,
      progress: 50,
      progressMax: 100,
      achievementName: 'Progress Test',
    };

    // Act
    await mockEmitter.emitProgress(userId, payload);

    // Assert
    expect(mockEmitter.emittedEvents).toHaveLength(1);
    expect(mockEmitter.emittedEvents[0]).toMatchObject({
      type: 'progress',
      userId,
      payload,
    });
  });

  it('should track batch unlock events', async () => {
    // Arrange
    const userId = 789;
    const achievements = [
      { id: 1, name: 'Achievement 1' },
      { id: 2, name: 'Achievement 2' },
    ];

    // Act
    await mockEmitter.emitBatchUnlock(userId, achievements);

    // Assert
    expect(mockEmitter.emittedEvents).toHaveLength(1);
    expect(mockEmitter.emittedEvents[0]).toMatchObject({
      type: 'batch',
      userId,
      payload: { achievements, count: 2 },
    });
  });

  it('should track multiple events in order', async () => {
    // Arrange & Act
    await mockEmitter.emitUnlocked(1, { test: 'unlock' } as any);
    await mockEmitter.emitProgress(2, { test: 'progress' } as any);
    await mockEmitter.emitBatchUnlock(3, []);

    // Assert
    expect(mockEmitter.emittedEvents).toHaveLength(3);
    expect(mockEmitter.emittedEvents[0].type).toBe('unlocked');
    expect(mockEmitter.emittedEvents[1].type).toBe('progress');
    expect(mockEmitter.emittedEvents[2].type).toBe('batch');
  });

  it('should clear events', () => {
    // Arrange
    mockEmitter.emittedEvents.push({
      type: 'unlocked',
      userId: 1,
      payload: {},
      timestamp: new Date().toISOString(),
    });

    // Act
    mockEmitter.clear();

    // Assert
    expect(mockEmitter.emittedEvents).toHaveLength(0);
  });

  it('should filter events by user', async () => {
    // Arrange & Act
    await mockEmitter.emitUnlocked(1, { test: 'user1' } as any);
    await mockEmitter.emitUnlocked(2, { test: 'user2' } as any);
    await mockEmitter.emitProgress(1, { test: 'user1-progress' } as any);

    // Assert
    const user1Events = mockEmitter.getEventsForUser(1);
    const user2Events = mockEmitter.getEventsForUser(2);
    const user3Events = mockEmitter.getEventsForUser(3);

    expect(user1Events).toHaveLength(2);
    expect(user2Events).toHaveLength(1);
    expect(user3Events).toHaveLength(0);

    expect(user1Events[0].payload.test).toBe('user1');
    expect(user1Events[1].payload.test).toBe('user1-progress');
    expect(user2Events[0].payload.test).toBe('user2');
  });

  it('should maintain timestamp consistency', async () => {
    // Arrange
    const beforeTime = Date.now();

    // Act
    await mockEmitter.emitUnlocked(1, { test: true } as any);

    // Assert
    const afterTime = Date.now();
    const eventTime = new Date(mockEmitter.emittedEvents[0].timestamp).getTime();

    expect(eventTime).toBeGreaterThanOrEqual(beforeTime);
    expect(eventTime).toBeLessThanOrEqual(afterTime);
  });
});
