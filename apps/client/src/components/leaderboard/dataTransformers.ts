// Data transformers to convert different entry types to unified format
import { formatMuskBucks } from '../../utils/formatting';
import type { PublicLeaderboardEntry, PongLeaderboardView } from '@ems/types';
import type { ShameWallEntry } from '../../api/shameWall';
import type { UnifiedLeaderboardEntry, LeaderboardHeaderStats } from './types';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

/**
 * Transform betting leaderboard entry to unified format
 */
export function transformBettingEntry(
  entry: PublicLeaderboardEntry,
  period: 'all-time' | 'daily',
): UnifiedLeaderboardEntry {
  const profit = period === 'all-time' ? asNum(entry.profitAll) : asNum(entry.profitPeriod);

  return {
    id: entry.userId,
    userName: entry.userName,
    avatarUrl: entry.avatarUrl ?? undefined,
    variant: 'betting',
    primaryStat: {
      label: 'Balance',
      value: `${formatMuskBucks(entry.balance)} 🪙`,
      highlight: asNum(entry.balance) > 10000,
      color: asNum(entry.balance) > 10000 ? 'text-primary' : undefined,
    },
    secondaryStats: [
      {
        label: 'Bets',
        value: entry.totalBets.toString(),
        highlight: entry.totalBets > 100,
      },
      {
        label: 'Win Rate',
        value: `${(entry.winRate * 100).toFixed(1)}%`,
        highlight: entry.winRate > 0.7,
        color:
          entry.winRate > 0.7 ? 'text-green-400' : entry.winRate < 0.4 ? 'text-red-400' : undefined,
      },
      {
        label: period === 'all-time' ? 'Total Profit' : 'Daily Profit',
        value: `${formatMuskBucks(profit)} 🏦`,
        highlight: profit > (period === 'all-time' ? 1000 : 100),
        color: profit > 0 ? 'text-green-400' : 'text-red-400',
      },
      {
        label: 'ROI',
        value: `${(entry.roi * 100).toFixed(1)}%`,
        highlight: entry.roi > 0.2,
        color: entry.roi > 0 ? 'text-green-400' : 'text-red-400',
      },
      {
        label: 'Streak',
        value: `${entry.currentStreak}/${entry.longestStreak}`,
        highlight: entry.currentStreak >= 5,
        color: entry.currentStreak >= 5 ? 'text-orange-400' : undefined,
      },
    ],
    badges:
      entry.currentStreak >= 5
        ? [
            {
              text: `🔥 ${entry.currentStreak} streak`,
              color: 'bg-warning/20 text-warning dark:bg-warning/30',
            },
          ]
        : undefined,
    rawData: entry,
  };
}

/**
 * Transform Pong leaderboard entry to unified format
 */
export function transformPongEntry(
  entry: PongLeaderboardView,
  metric: string,
): UnifiedLeaderboardEntry {
  // Determine primary stat based on selected metric
  let primaryStat;
  switch (metric) {
    case 'elo':
      primaryStat = {
        label: 'Elo Rating',
        value: entry.eloRating?.toString() || '1200',
        highlight: (entry.eloRating || 1200) > 1800,
      };
      break;
    case 'wins':
      primaryStat = {
        label: 'Wins',
        value: entry.wins?.toString() || '0',
        highlight: (entry.wins || 0) > 50,
      };
      break;
    case 'winStreak':
      primaryStat = {
        label: 'Win Streak',
        value: entry.winStreak?.toString() || '0',
        highlight: (entry.winStreak || 0) > 5,
      };
      break;
    case 'totalWon':
      primaryStat = {
        label: 'Earnings',
        value: formatMuskBucks(entry.totalWon),
        highlight: asNum(entry.totalWon) > 10000,
      };
      break;
    case 'totalWagered':
      primaryStat = {
        label: 'Volume',
        value: formatMuskBucks(entry.totalWagered ?? 0),
        highlight: asNum(entry.totalWagered) > 50000,
      };
      break;
    case 'perfectGames':
      primaryStat = {
        label: 'Perfect Games',
        value: entry.perfectGames?.toString() || '0',
        highlight: (entry.perfectGames || 0) > 3,
      };
      break;
    default:
      primaryStat = {
        label: 'Elo Rating',
        value: entry.eloRating?.toString() || '1200',
      };
  }

  // Generate badges
  const badges = [];
  if (entry.tier) {
    const tierColors = {
      GRANDMASTER: 'bg-primary/20 text-primary dark:bg-primary/30',
      MASTER: 'bg-error/20 text-error dark:bg-error/30',
      DIAMOND: 'bg-info/20 text-info dark:bg-info/30',
      PLATINUM: 'bg-success/20 text-success dark:bg-success/30',
      GOLD: 'bg-warning/20 text-warning dark:bg-warning/30',
      SILVER: 'bg-muted/50 text-tertiary dark:bg-muted/70',
      BRONZE: 'bg-warning/15 text-warning dark:bg-warning/25',
    };
    badges.push({
      text: entry.tier,
      color: tierColors[entry.tier as keyof typeof tierColors] || 'bg-muted/50 text-tertiary',
    });
  }

  if (entry.riskTaker) {
    badges.push({
      text: '🎲 High Roller',
      color: 'bg-error/20 text-error dark:bg-error/30',
    });
  }

  // Build secondary stats array, avoiding duplication with primary stat
  const allSecondaryStats = [
    {
      label: 'Elo Rating',
      value: entry.eloRating?.toString() || '1200',
      color: 'text-primary',
    },
    {
      label: 'Wins',
      value: entry.wins?.toString() || '0',
      color: 'text-green-400',
    },
    {
      label: 'Win Rate',
      value: `${entry.winRate?.toFixed(1) || '0.0'}%`,
      color: 'text-blue-400',
    },
    {
      label: 'Earnings',
      value: formatMuskBucks(entry.totalWon),
      color: 'text-accent',
    },
    {
      label: 'Win Streak',
      value: entry.winStreak?.toString() || '0',
      color: 'text-orange-400',
    },
    {
      label: 'Perfect Games',
      value: entry.perfectGames?.toString() || '0',
      color: 'text-purple-400',
    },
    {
      label: 'Volume',
      value: formatMuskBucks(entry.totalWagered || 0),
      color: 'text-cyan-400',
    },
  ];

  // Filter out the primary stat from secondary stats to avoid duplication
  const secondaryStats = allSecondaryStats.filter((stat) => stat.label !== primaryStat.label);

  return {
    id: entry.userId,
    userName: entry.userName,
    avatarUrl: entry.avatarUrl ?? undefined,
    variant: 'pong',
    primaryStat,
    secondaryStats,
    badges,
    rawData: entry,
  };
}

/**
 * Transform shame wall entry to unified format
 */
export function transformShameEntry(entry: ShameWallEntry): UnifiedLeaderboardEntry {
  const isPermanent = !entry.endDate;
  const banCount = entry.banCount ?? 1; // Default to 1 if undefined

  return {
    id: entry.userId,
    userName: entry.userName,
    avatarUrl: entry.avatarUrl ?? undefined,
    variant: 'shame',
    primaryStat: {
      label: 'Ban Type',
      value: isPermanent ? 'Permanent' : 'Temporary',
      color: isPermanent ? 'text-red-600' : 'text-orange-600',
    },
    secondaryStats: [
      {
        label: 'Ban Count',
        value: banCount.toString(),
        highlight: banCount > 1,
      },
      {
        label: 'Banned Since',
        value: new Date(entry.startDate).toLocaleDateString(),
      },
      ...(entry.endDate
        ? [
            {
              label: 'Until',
              value: new Date(entry.endDate).toLocaleDateString(),
            },
          ]
        : []),
      {
        label: 'Achievements',
        value: entry.shameAchievements.length.toString(),
        color: entry.shameAchievements.length > 0 ? 'text-red-500' : undefined,
      },
    ],
    badges: [
      {
        text: isPermanent ? 'Permanent Ban' : 'Temporary Ban',
        color: isPermanent
          ? 'bg-error/20 text-error dark:bg-error/30'
          : 'bg-warning/20 text-warning dark:bg-warning/30',
      },
      ...(banCount > 1
        ? [
            {
              text: `${banCount} bans`,
              color: 'bg-muted/50 text-tertiary dark:bg-muted/70',
            },
          ]
        : []),
    ],
    rawData: entry,
  };
}

/**
 * Transform stats for leaderboard headers
 */
export function transformBettingHeaderStats(stats: any): LeaderboardHeaderStats {
  return {
    primary: {
      value: stats?.totalUsers?.toLocaleString() || '0',
      label: 'Total Users',
    },
    secondary: [
      {
        value: stats?.activeUsers?.toLocaleString() || '0',
        label: 'Active Users',
      },
      {
        value: stats?.totalBets?.toLocaleString() || '0',
        label: 'Total Bets',
      },
      {
        value: formatMuskBucks(stats?.totalVolume || 0),
        label: 'Total Volume',
      },
      ...(stats?.lastRefresh
        ? [
            {
              value: new Date(stats.lastRefresh).toLocaleTimeString(),
              label: 'Last Updated',
            },
          ]
        : []),
    ],
  };
}

export function transformPongHeaderStats(
  leaderboard: PongLeaderboardView[],
): LeaderboardHeaderStats {
  return {
    primary: {
      value: leaderboard.length.toString(),
      label: 'Pong Players',
    },
    secondary: [
      {
        value: leaderboard[0]?.eloRating?.toString() || 'N/A',
        label: 'Top Elo',
      },
      {
        value: Math.max(...leaderboard.map((p) => p.wins || 0)).toString(),
        label: 'Most Wins',
      },
      {
        value: Math.max(...leaderboard.map((p) => p.winStreak || 0)).toString(),
        label: 'Best Streak',
      },
    ],
  };
}

export function transformShameHeaderStats(stats: any): LeaderboardHeaderStats {
  return {
    primary: {
      value: stats?.totalBanned?.toString() || '0',
      label: 'Banned Users',
    },
    secondary: [
      {
        value: stats?.permanentBans?.toString() || '0',
        label: 'Permanent',
      },
      {
        value: stats?.temporaryBans?.toString() || '0',
        label: 'Temporary',
      },
      ...(stats?.mostCommonReasons?.length > 0
        ? [
            {
              value: stats.mostCommonReasons[0].reason,
              label: 'Most Common',
            },
          ]
        : []),
    ],
  };
}
