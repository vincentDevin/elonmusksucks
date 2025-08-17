// Public Shame Wall Controller
// Provides read-only access to current bans and shame achievements

import { Request, Response, NextFunction } from 'express';
import { shameWallService } from '../services/shameWall.service';
import { serializeBigInt } from '../utils/bigintSerializer';

/**
 * Get current shame wall (public endpoint)
 * Shows currently banned users with their shame achievements
 */
export async function getShameWall(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shameWall = await shameWallService.getShameWall();
    res.json(serializeBigInt(shameWall));
  } catch (err) {
    next(err);
  }
}

/**
 * Get shame wall statistics (public endpoint)
 */
export async function getShameWallStats(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shameWall = await shameWallService.getShameWall();

    const stats = {
      totalBanned: shameWall.length,
      permanentBans: shameWall.filter((entry) => !entry.endDate).length,
      temporaryBans: shameWall.filter((entry) => entry.endDate).length,
      mostCommonReasons: calculateMostCommonReasons(shameWall),
      shameAchievementCounts: calculateShameAchievementStats(shameWall),
    };

    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// Helper functions
function calculateMostCommonReasons(entries: any[]): Array<{ reason: string; count: number }> {
  const reasonCounts: Record<string, number> = {};

  entries.forEach((entry) => {
    const reason = entry.reason.toLowerCase();
    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
  });

  return Object.entries(reasonCounts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calculateShameAchievementStats(
  entries: any[],
): Array<{ slug: string; title: string; count: number }> {
  const achievementCounts: Record<string, { title: string; count: number }> = {};

  entries.forEach((entry) => {
    entry.shameAchievements.forEach((achievement: any) => {
      if (!achievementCounts[achievement.slug]) {
        achievementCounts[achievement.slug] = {
          title: achievement.title,
          count: 0,
        };
      }
      achievementCounts[achievement.slug].count++;
    });
  });

  return Object.entries(achievementCounts)
    .map(([slug, data]) => ({ slug, title: data.title, count: data.count }))
    .sort((a, b) => b.count - a.count);
}
