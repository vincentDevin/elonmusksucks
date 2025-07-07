import { useState } from 'react';
import type { UserStatsDTO } from '@ems/types';

export function ProfileStats({
  profile,
  stats,
  isOwn,
}: {
  profile: { muskBucks: number; rank?: number };
  stats: UserStatsDTO;
  isOwn: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  // Core tiles always shown in collapsed view
  const collapsedTiles = [
    { label: 'MuskBucks', value: `${profile.muskBucks} 🪙` },
    isOwn && { label: 'Rank', value: `#${profile.rank ?? '-'}` },
    {
      label: 'Win Rate',
      value: `${((stats.betsWon / Math.max(1, stats.totalBets)) * 100).toFixed(1)}%`,
    },
    { label: 'Profit', value: stats.profit.toString() },
  ].filter((t): t is { label: string; value: string } => Boolean(t));

  // Full set of tiles for expanded view
  const allTiles = [
    { label: 'MuskBucks', value: `${profile.muskBucks} 🪙` },
    isOwn && { label: 'Rank', value: `#${profile.rank ?? '-'}` },
    { label: 'Total Bets', value: stats.totalBets.toString() },
    { label: 'Wins', value: stats.betsWon.toString() },
    { label: 'Losses', value: stats.betsLost.toString() },
    { label: 'Total Parlays', value: stats.totalParlays.toString() },
    { label: 'Parlays Won', value: stats.parlaysWon.toString() },
    { label: 'Parlays Lost', value: stats.parlaysLost.toString() },
    { label: 'Parlay Legs W/L', value: `${stats.parlayLegsWon}/${stats.totalParlayLegs}` },
    { label: 'Wagered', value: stats.totalWagered.toString() },
    { label: 'Total Won', value: stats.totalWon.toString() },
    { label: 'Biggest Win', value: stats.biggestWin.toString() },
    { label: 'Common Bet', value: stats.mostCommonBet ?? '-' },
    { label: 'Current Streak', value: stats.currentStreak.toString() },
    { label: 'Longest Streak', value: stats.longestStreak.toString() },
    { label: 'Profit', value: stats.profit.toString() },
    { label: 'ROI', value: `${(stats.roi * 100).toFixed(1)}%` },
  ].filter((t): t is { label: string; value: string } => Boolean(t));

  const displayedTiles = expanded ? allTiles : collapsedTiles;

  return (
    <div>
      <div
        className={`grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-${expanded ? 6 : 4}`}
      >
        {displayedTiles.map(({ label, value }) => (
          <div
            key={label}
            className="p-4 bg-surface rounded-lg text-center flex flex-col justify-center"
          >
            <div className="text-sm text-tertiary uppercase">{label}</div>
            <div className="text-xl font-bold">{value}</div>
          </div>
        ))}
      </div>
      <button
        onClick={() => setExpanded((prev) => !prev)}
        className="mt-4 text-sm text-accent hover:underline"
      >
        {expanded ? 'Collapse stats' : 'View all stats'}
      </button>
    </div>
  );
}
