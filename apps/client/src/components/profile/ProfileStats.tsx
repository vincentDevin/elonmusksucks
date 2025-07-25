import { useState } from 'react';
import type { UserStatsDTO } from '@ems/types';
import { WinLossPieChart } from './graphs/WinLossPieChart';
import { FinancialBarChart } from './graphs/FinancialBarChart';
import { PerformanceProgressBars } from './graphs/PerformanceProgressBars';

export function ProfileStats({
  profile,
  stats,
  isOwn,
}: {
  profile: { muskBucks: number; rank?: number };
  stats: UserStatsDTO;
  isOwn: boolean;
}) {
  const [showRawStats, setShowRawStats] = useState(false);

  const betWinRate = stats.totalBets > 0 ? stats.betsWon / stats.totalBets : 0;
  const parlayWinRate = stats.totalParlays > 0 ? stats.parlaysWon / stats.totalParlays : 0;
  const parlayAccuracy = stats.totalParlayLegs > 0 ? stats.parlayLegsWon / stats.totalParlayLegs : 0;

  return (
    <div className="bg-surface border border-muted rounded-2xl p-4 shadow space-y-4"> {/* Combined into one card */}
      <h3 className="text-lg font-semibold">User Stats Overview</h3> {/* Changed title and reduced size */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full min-h-[300px]">
        <WinLossPieChart
          wins={stats.betsWon + stats.parlaysWon}
          losses={stats.betsLost + stats.parlaysLost}
          title="Overall Win/Loss"
        />
        <FinancialBarChart
          wagered={stats.totalWagered}
          won={stats.totalWon}
          profit={stats.profit}
        />
        <PerformanceProgressBars
          roi={stats.roi}
          winRate={betWinRate}
          parlayAccuracy={parlayAccuracy}
        />
      </div>

      {/* Raw Stats Section - now collapsible inside the same card */}
      <div className="border-t border-muted pt-4 mt-4"> {/* Added top border for separation */}
        <h4
          className="text-base font-semibold mb-3 flex items-center gap-2 cursor-pointer" /* Reduced size */
          onClick={() => setShowRawStats(!showRawStats)}
        >
          Detailed Stats
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className={`w-5 h-5 transition-transform ${showRawStats ? 'rotate-180' : ''}`}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
          </svg>
        </h4>
        {showRawStats && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
            <div className="flex justify-between py-1">
              <span className="text-tertiary">MuskBucks:</span>
              <span className="font-medium">{`${profile.muskBucks} 🪙`}</span>
            </div>
            {isOwn && (
              <div className="flex justify-between py-1">
                <span className="text-tertiary">Rank:</span>
                <span className="font-medium">{`#${profile.rank ?? '-'}`}</span>
              </div>
            )}
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Total Bets:</span>
              <span className="font-medium">{stats.totalBets.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Total Parlays:</span>
              <span className="font-medium">{stats.totalParlays.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Parlay Legs W/L:</span>
              <span className="font-medium">{`${stats.parlayLegsWon}/${stats.totalParlayLegs}`}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Biggest Win:</span>
              <span className="font-medium">{stats.biggestWin.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Common Bet:</span>
              <span className="font-medium">{stats.mostCommonBet ?? '-'}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Current Streak:</span>
              <span className="font-medium">{stats.currentStreak.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Longest Streak:</span>
              <span className="font-medium">{stats.longestStreak.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">Profit:</span>
              <span className="font-medium">{stats.profit.toString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-tertiary">ROI:</span>
              <span className="font-medium">{`${(stats.roi * 100).toFixed(1)}%`}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
