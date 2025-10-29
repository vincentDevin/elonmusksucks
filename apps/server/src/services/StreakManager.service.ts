import prisma from '../db';
import { eventBus } from '../lib/EventBus';
import type { IEventBus } from '@ems/types';

// Using shared prisma from db.ts

/**
 * StreakManager Service
 *
 * Manages consecutive wins/losses/actions across different systems
 * - Betting wins/losses
 * - Pong wins/losses
 * - Daily login streaks
 * - Parlay wins/losses
 *
 * Key features:
 * - Thread-safe streak updates
 * - Automatic streak breaking logic
 * - Best streak tracking
 * - Event publishing for achievements
 */
export class StreakManager {
  constructor(private eventBus: IEventBus) {}

  /**
   * Update a user's streak for a specific type
   * @param userId - User ID
   * @param streakType - Type of streak ('bet_win', 'pong_win', 'daily_login', etc.)
   * @param successful - Whether the action was successful (continues streak) or not (breaks streak)
   * @param metadata - Optional metadata for the streak event
   */
  async updateStreak(
    userId: number,
    streakType: string,
    successful: boolean,
    metadata?: Record<string, any>,
  ): Promise<void> {
    const now = new Date();

    // Use upsert to handle concurrent updates safely
    const streak = await prisma.userStreak.upsert({
      where: {
        unique_user_streak_type: {
          userId,
          streakType,
        },
      },
      create: {
        userId,
        streakType,
        currentStreak: successful ? 1 : 0,
        bestStreak: successful ? 1 : 0,
        lastActionAt: now,
        startedAt: successful ? now : null,
      },
      update: {
        currentStreak: successful ? { increment: 1 } : 0, // Reset to 0 on failure
        lastActionAt: now,
        startedAt: successful
          ? undefined // Keep existing startedAt if continuing
          : null, // Reset startedAt on streak break
      },
    });

    // Update best streak if current streak is higher
    if (successful && streak.currentStreak + 1 > streak.bestStreak) {
      await prisma.userStreak.update({
        where: { id: streak.id },
        data: {
          bestStreak: streak.currentStreak + 1,
        },
      });
    }

    // Publish events for achievement system
    if (successful) {
      await this.eventBus.publish('streak:updated', {
        userId,
        streakType,
        currentStreak: streak.currentStreak + 1,
        bestStreak: Math.max(streak.bestStreak, streak.currentStreak + 1),
        metadata,
      });

      // Publish milestone events for common streak lengths
      const newStreak = streak.currentStreak + 1;
      const milestones = [3, 5, 7, 10, 15, 20, 25, 50, 100];
      if (milestones.includes(newStreak)) {
        await this.eventBus.publish('streak:milestone:reached', {
          userId,
          streakType,
          milestone: newStreak,
          metadata,
        });
      }
    } else if (streak.currentStreak > 0) {
      // Streak was broken
      await this.eventBus.publish('streak:broken', {
        userId,
        streakType,
        brokenStreak: streak.currentStreak,
        bestStreak: streak.bestStreak,
        metadata,
      });
    }
  }

  /**
   * Check and update daily-based streaks (login, betting, etc.)
   * This method handles the logic for streaks that depend on daily actions
   * @param userId - User ID
   * @param streakType - Type of daily streak
   * @param actionDate - Date of the action (defaults to today)
   */
  async checkDailyStreak(
    userId: number,
    streakType: string,
    actionDate: Date = new Date(),
  ): Promise<void> {
    const today = new Date(actionDate.toDateString()); // Normalize to start of day
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const streak = await prisma.userStreak.findUnique({
      where: {
        unique_user_streak_type: {
          userId,
          streakType,
        },
      },
    });

    if (!streak?.lastActionAt) {
      // First time action - start new streak
      await this.updateStreak(userId, streakType, true, { actionDate: today });
      return;
    }

    const lastActionDate = new Date(streak.lastActionAt.toDateString());

    if (lastActionDate.getTime() === today.getTime()) {
      // Already recorded today - no update needed
      return;
    }

    if (lastActionDate.getTime() === yesterday.getTime()) {
      // Consecutive day - continue streak
      await this.updateStreak(userId, streakType, true, { actionDate: today });
    } else {
      // Gap in days - break streak and start new
      await this.updateStreak(userId, streakType, false, { actionDate: today });
      // Start new streak
      await this.updateStreak(userId, streakType, true, { actionDate: today });
    }
  }

  /**
   * Manually reset a user's streak (admin function)
   * @param userId - User ID
   * @param streakType - Type of streak to reset
   */
  async resetStreak(userId: number, streakType: string): Promise<void> {
    await prisma.userStreak.update({
      where: {
        unique_user_streak_type: {
          userId,
          streakType,
        },
      },
      data: {
        currentStreak: 0,
        startedAt: null,
        lastActionAt: new Date(),
      },
    });

    await this.eventBus.publish('streak:reset', {
      userId,
      streakType,
      reason: 'manual_reset',
    });
  }

  /**
   * Get current streak information for a user
   * @param userId - User ID
   * @param streakType - Type of streak (optional, returns all if not specified)
   */
  async getUserStreaks(userId: number, streakType?: string): Promise<any[]> {
    return prisma.userStreak.findMany({
      where: {
        userId,
        ...(streakType && { streakType }),
      },
      orderBy: {
        bestStreak: 'desc',
      },
    });
  }

  /**
   * Get leaderboard for a specific streak type
   * @param streakType - Type of streak
   * @param limit - Number of results to return
   */
  async getStreakLeaderboard(streakType: string, limit: number = 10): Promise<any[]> {
    return prisma.userStreak.findMany({
      where: { streakType },
      orderBy: {
        bestStreak: 'desc',
      },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }
}

// Export singleton instance for dependency injection
export const streakManager = new StreakManager(eventBus);
