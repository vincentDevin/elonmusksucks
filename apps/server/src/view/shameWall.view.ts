import type { ShameWallEntryView, ShameWallStatsView } from '@ems/types';

/**
 * Maps shame wall entry data to standardized ShameWallEntryView DTO
 * Handles Date → ISO string conversion
 */
export const toShameWallEntryView = (entry: {
  id?: number;
  userId: number;
  userName: string;
  reason: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  moderatorId?: number;
  moderatorName?: string;
  shameAchievements?: Array<{
    slug: string;
    title: string;
    description: string;
    awardedAt: string;
  }>;
}): ShameWallEntryView => ({
  id: entry.id || 0,
  userId: entry.userId,
  userName: entry.userName,
  reason: entry.reason,
  startDate: typeof entry.startDate === 'string' ? entry.startDate : entry.startDate.toISOString(),
  endDate: entry.endDate
    ? typeof entry.endDate === 'string'
      ? entry.endDate
      : entry.endDate.toISOString()
    : null,
  moderatorId: entry.moderatorId || 0,
  moderatorName: entry.moderatorName || 'System',
  shameAchievements: (entry.shameAchievements || []).map((achievement) => ({
    title: achievement.title,
    description: achievement.description,
    icon: achievement.slug, // Use slug as icon since icon field is missing
  })),
});

/**
 * Maps shame wall statistics to standardized ShameWallStatsView DTO
 */
export const toShameWallStatsView = (stats: {
  totalBanned: number;
  permanentBans: number;
  temporaryBans: number;
  mostCommonReasons: Array<{
    reason: string;
    count: number;
  }>;
  shameAchievementCounts: Array<{
    slug: string;
    title: string;
    count: number;
  }>;
}): ShameWallStatsView => ({
  totalBanned: stats.totalBanned,
  permanentBans: stats.permanentBans,
  temporaryBans: stats.temporaryBans,
  mostCommonReasons: stats.mostCommonReasons,
  shameAchievementCounts: stats.shameAchievementCounts,
});
