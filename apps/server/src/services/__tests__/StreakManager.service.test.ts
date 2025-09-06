import { PrismaClient } from '@prisma/client';
import { StreakManager } from '../StreakManager.service';
import type { IEventBus } from '@ems/types';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  userStreak: {
    findFirst: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock EventBus
const mockEventBus: IEventBus = {
  publish: jest.fn(),
  subscribe: jest.fn(),
};

describe('StreakManager Service', () => {
  let streakManager: StreakManager;

  beforeEach(() => {
    jest.clearAllMocks();
    streakManager = new StreakManager(mockPrisma, mockEventBus);
  });

  describe('updateStreak', () => {
    it('should create new streak when none exists', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = true;

      // Mock no existing streak
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(null);

      // Mock upsert operation
      const mockStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 1,
        bestStreak: 1,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(mockStreak);

      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: {
          userId,
          streakType,
          currentStreak: 1,
          bestStreak: 1,
          lastActivityAt: expect.any(Date),
        },
        update: {
          currentStreak: 1,
          bestStreak: 1,
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(mockStreak);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:milestone:reached',
        expect.objectContaining({
          userId,
          streakType,
          currentStreak: 1,
          isNewBest: true,
        }),
      );
    });

    it('should increment existing streak', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = true;

      // Mock existing streak
      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 4,
        bestStreak: 10,
        lastActivityAt: new Date(Date.now() - 60000), // 1 minute ago
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      // Mock upsert operation
      const updatedStreak = {
        ...existingStreak,
        currentStreak: 5,
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(updatedStreak);

      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: expect.any(Object),
        update: {
          currentStreak: 5,
          bestStreak: 10, // Should not change since 5 < 10
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(updatedStreak);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:milestone:reached',
        expect.objectContaining({
          userId,
          streakType,
          currentStreak: 5,
          isNewBest: false,
        }),
      );
    });

    it('should set new best streak when current exceeds best', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = true;

      // Mock existing streak where current will exceed best
      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 9,
        bestStreak: 9,
        lastActivityAt: new Date(Date.now() - 60000),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const updatedStreak = {
        ...existingStreak,
        currentStreak: 10,
        bestStreak: 10,
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(updatedStreak);

      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: expect.any(Object),
        update: {
          currentStreak: 10,
          bestStreak: 10, // Should update to new best
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:milestone:reached',
        expect.objectContaining({
          userId,
          streakType,
          currentStreak: 10,
          isNewBest: true,
        }),
      );
    });

    it('should reset streak when increment is false', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = false;

      // Mock existing streak
      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 5,
        bestStreak: 10,
        lastActivityAt: new Date(Date.now() - 60000),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const updatedStreak = {
        ...existingStreak,
        currentStreak: 0,
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(updatedStreak);

      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: expect.any(Object),
        update: {
          currentStreak: 0,
          bestStreak: 10, // Best streak should remain unchanged
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:broken',
        expect.objectContaining({
          userId,
          streakType,
          previousStreak: 5,
          bestStreak: 10,
        }),
      );
    });
  });

  describe('checkDailyStreak', () => {
    it('should continue streak when activity within same day', async () => {
      const userId = 1;
      const streakType = 'daily_login';

      // Mock existing streak from today
      const today = new Date();
      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 5,
        bestStreak: 10,
        lastActivityAt: new Date(today.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago today
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const result = await streakManager.checkDailyStreak(userId, streakType);

      expect(result).toEqual({
        shouldIncrement: false,
        shouldReset: false,
        daysSinceLastActivity: 0,
        isNewDay: false,
      });

      // Should not call upsert since no change needed
      expect(mockPrisma.userStreak.upsert).not.toHaveBeenCalled();
    });

    it('should increment streak when activity from consecutive day', async () => {
      const userId = 1;
      const streakType = 'daily_login';

      // Mock existing streak from yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(23, 0, 0, 0); // Yesterday evening

      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 5,
        bestStreak: 10,
        lastActivityAt: yesterday,
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const updatedStreak = {
        ...existingStreak,
        currentStreak: 6,
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(updatedStreak);

      const result = await streakManager.checkDailyStreak(userId, streakType);

      expect(result).toEqual({
        shouldIncrement: true,
        shouldReset: false,
        daysSinceLastActivity: 1,
        isNewDay: true,
      });

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: expect.any(Object),
        update: {
          currentStreak: 6,
          bestStreak: 10,
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });
    });

    it('should reset streak when activity gap > 1 day', async () => {
      const userId = 1;
      const streakType = 'daily_login';

      // Mock existing streak from 3 days ago
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 5,
        bestStreak: 10,
        lastActivityAt: threeDaysAgo,
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const updatedStreak = {
        ...existingStreak,
        currentStreak: 1, // Reset to 1 for today's activity
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(updatedStreak);

      const result = await streakManager.checkDailyStreak(userId, streakType);

      expect(result).toEqual({
        shouldIncrement: false,
        shouldReset: true,
        daysSinceLastActivity: 3,
        isNewDay: true,
      });

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: expect.any(Object),
        update: {
          currentStreak: 1,
          bestStreak: 10,
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:broken',
        expect.objectContaining({
          userId,
          streakType,
          previousStreak: 5,
          daysBroken: 3,
        }),
      );
    });

    it('should handle no existing streak', async () => {
      const userId = 1;
      const streakType = 'daily_login';

      // Mock no existing streak
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(null);

      const newStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 1,
        bestStreak: 1,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(newStreak);

      const result = await streakManager.checkDailyStreak(userId, streakType);

      expect(result).toEqual({
        shouldIncrement: true,
        shouldReset: false,
        daysSinceLastActivity: 0,
        isNewDay: true,
      });

      expect(mockPrisma.userStreak.upsert).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        create: {
          userId,
          streakType,
          currentStreak: 1,
          bestStreak: 1,
          lastActivityAt: expect.any(Date),
        },
        update: expect.any(Object),
      });
    });
  });

  describe('resetStreak', () => {
    it('should reset streak to zero', async () => {
      const userId = 1;
      const streakType = 'betting_wins';

      // Mock existing streak
      const existingStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 8,
        bestStreak: 15,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(existingStreak);

      const resetStreak = {
        ...existingStreak,
        currentStreak: 0,
        lastActivityAt: new Date(),
      };
      (mockPrisma.userStreak.update as jest.Mock).mockResolvedValue(resetStreak);

      const result = await streakManager.resetStreak(userId, streakType);

      expect(mockPrisma.userStreak.update).toHaveBeenCalledWith({
        where: {
          userId_streakType: { userId, streakType },
        },
        data: {
          currentStreak: 0,
          lastActivityAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
      });

      expect(result).toEqual(resetStreak);
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'streak:reset',
        expect.objectContaining({
          userId,
          streakType,
          previousStreak: 8,
          bestStreak: 15,
        }),
      );
    });

    it('should handle non-existent streak gracefully', async () => {
      const userId = 1;
      const streakType = 'betting_wins';

      // Mock no existing streak
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await streakManager.resetStreak(userId, streakType);

      expect(result).toBeNull();
      expect(mockPrisma.userStreak.update).not.toHaveBeenCalled();
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('getUserStreaks', () => {
    it('should return all streaks for user', async () => {
      const userId = 1;

      const mockStreaks = [
        {
          id: 1,
          userId,
          streakType: 'betting_wins',
          currentStreak: 5,
          bestStreak: 12,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          userId,
          streakType: 'daily_login',
          currentStreak: 30,
          bestStreak: 45,
          lastActivityAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (mockPrisma.userStreak.findMany as jest.Mock).mockResolvedValue(mockStreaks);

      const result = await streakManager.getUserStreaks(userId);

      expect(mockPrisma.userStreak.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });

      expect(result).toEqual(mockStreaks);
    });

    it('should return empty array when no streaks exist', async () => {
      const userId = 1;

      (mockPrisma.userStreak.findMany as jest.Mock).mockResolvedValue([]);

      const result = await streakManager.getUserStreaks(userId);

      expect(result).toEqual([]);
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully in updateStreak', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = true;

      // Mock database error
      const dbError = new Error('Database connection failed');
      (mockPrisma.userStreak.findFirst as jest.Mock).mockRejectedValue(dbError);

      // Should log error but not throw
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[streak-manager] Error updating streak:', dbError);

      consoleSpy.mockRestore();
    });

    it('should handle EventBus errors gracefully', async () => {
      const userId = 1;
      const streakType = 'betting_wins';
      const increment = true;

      // Mock successful database operations
      (mockPrisma.userStreak.findFirst as jest.Mock).mockResolvedValue(null);
      const mockStreak = {
        id: 1,
        userId,
        streakType,
        currentStreak: 1,
        bestStreak: 1,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.userStreak.upsert as jest.Mock).mockResolvedValue(mockStreak);

      // Mock EventBus error
      (mockEventBus.publish as jest.Mock).mockRejectedValue(new Error('EventBus failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Should still return the streak result even if event publishing fails
      const result = await streakManager.updateStreak(userId, streakType, increment);

      expect(result).toEqual(mockStreak);
      expect(consoleSpy).toHaveBeenCalledWith(
        '[streak-manager] Error publishing streak event:',
        expect.any(Error),
      );

      consoleSpy.mockRestore();
    });
  });

  describe('date calculation utilities', () => {
    it('should correctly calculate days between dates', () => {
      const date1 = new Date('2024-01-01T10:00:00Z');
      const date2 = new Date('2024-01-03T15:30:00Z');

      // Access private method for testing
      const daysDiff = (streakManager as any).getDaysDifference(date1, date2);

      expect(daysDiff).toBe(2);
    });

    it('should handle same day correctly', () => {
      const date1 = new Date('2024-01-01T08:00:00Z');
      const date2 = new Date('2024-01-01T20:00:00Z');

      const daysDiff = (streakManager as any).getDaysDifference(date1, date2);

      expect(daysDiff).toBe(0);
    });

    it('should check if dates are same calendar day', () => {
      const date1 = new Date('2024-01-01T23:59:00Z');
      const date2 = new Date('2024-01-01T00:01:00Z');

      const isSameDay = (streakManager as any).isSameCalendarDay(date1, date2);

      expect(isSameDay).toBe(true);
    });

    it('should detect different calendar days', () => {
      const date1 = new Date('2024-01-01T23:59:00Z');
      const date2 = new Date('2024-01-02T00:01:00Z');

      const isSameDay = (streakManager as any).isSameCalendarDay(date1, date2);

      expect(isSameDay).toBe(false);
    });
  });
});
