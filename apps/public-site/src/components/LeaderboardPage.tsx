import React from 'react';
import type { ServerData } from '../types';
import Layout from './Layout';

export default function LeaderboardPage({
  fullLeaderboardData,
  clientAppUrl,
  currentPath,
}: ServerData) {
  const leaderboard = Array.isArray(fullLeaderboardData) ? fullLeaderboardData : [];

  const formatMuskBucks = (amount: string | number | bigint | undefined | null) => {
    if (amount == null || amount === undefined) {
      return '0';
    }

    let numAmount: number;
    if (typeof amount === 'string') {
      numAmount = parseFloat(amount);
    } else if (typeof amount === 'bigint') {
      numAmount = Number(amount);
    } else {
      numAmount = amount;
    }

    if (isNaN(numAmount)) {
      return '0';
    }

    if (numAmount >= 1000000) {
      return `${(numAmount / 1000000).toFixed(1)}M`;
    }
    if (numAmount >= 1000) {
      return `${(numAmount / 1000).toFixed(1)}K`;
    }
    return numAmount.toString();
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return '🏆';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return `#${rank}`;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-300';
      case 2:
        return 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-300';
      case 3:
        return 'bg-gradient-to-r from-amber-100 to-amber-50 border-amber-300';
      default:
        return 'bg-surface';
    }
  };

  // Calculate some stats
  const totalVolume = leaderboard.reduce((sum, entry) => {
    const balance = typeof entry.balance === 'string' ? parseFloat(entry.balance) : entry.balance;
    return sum + (isNaN(balance) ? 0 : balance);
  }, 0);

  const totalBets = leaderboard.reduce((sum, entry) => sum + entry.totalBets, 0);
  const avgWinRate =
    leaderboard.length > 0
      ? (
          (leaderboard.reduce((sum, entry) => sum + entry.winRate, 0) / leaderboard.length) *
          100
        ).toFixed(1)
      : 0;

  return (
    <Layout currentPath={currentPath} clientAppUrl={clientAppUrl}>
      <div className="bg-background text-content min-h-screen">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="bg-surface rounded-lg p-8 mb-8 shadow">
            <div className="text-center max-w-4xl mx-auto">
              <h1 className="text-5xl font-bold mb-4">🏆 Leaderboard</h1>
              <p className="text-xl text-content/80 mb-2">The best Musk predictors in the game</p>
              <p className="text-lg text-content/70 mb-6">Can you climb to the top?</p>

              <div className="flex justify-center space-x-4">
                <a
                  href={`${clientAppUrl}/login`}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold transition-colors"
                >
                  Login to Compete
                </a>
                <a
                  href={`${clientAppUrl}/register`}
                  className="px-6 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold transition-colors"
                >
                  Join the Competition
                </a>
              </div>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-primary">{leaderboard.length}</div>
              <div className="text-sm text-tertiary">Active Players</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-green-600">
                {formatMuskBucks(totalVolume)}
              </div>
              <div className="text-sm text-tertiary">Total Volume</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-blue-600">{totalBets}</div>
              <div className="text-sm text-tertiary">Total Bets</div>
            </div>
            <div className="bg-surface rounded-lg p-4 shadow">
              <div className="text-3xl font-bold text-purple-600">{avgWinRate}%</div>
              <div className="text-sm text-tertiary">Avg Win Rate</div>
            </div>
          </div>

          {/* Top 3 Podium */}
          {leaderboard.length >= 3 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold mb-6 text-center">🎯 Top Predictors</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Second Place */}
                <div className="md:pt-8">
                  {leaderboard[1] && (
                    <div className="bg-gradient-to-b from-gray-100 to-gray-50 rounded-lg p-6 shadow-lg border-2 border-gray-300">
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">🥈</div>
                        <div className="text-3xl font-bold">2nd</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg mb-2">{leaderboard[1].userName}</div>
                        <div className="text-2xl font-bold text-primary mb-2">
                          +{formatMuskBucks(leaderboard[1].profitAll)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="text-tertiary">
                            {Math.round(leaderboard[1].winRate * 100)}% win rate
                          </div>
                          <div className="text-tertiary">{leaderboard[1].totalBets} bets</div>
                          <div className="font-medium text-green-600">
                            {Math.round((leaderboard[1].roi || 0) * 100)}% ROI
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* First Place */}
                <div>
                  {leaderboard[0] && (
                    <div className="bg-gradient-to-b from-yellow-100 to-yellow-50 rounded-lg p-6 shadow-xl border-2 border-yellow-400 transform scale-105">
                      <div className="text-center mb-4">
                        <div className="text-5xl mb-2">🏆</div>
                        <div className="text-4xl font-bold text-yellow-600">1st</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-xl mb-2">{leaderboard[0].userName}</div>
                        <div className="text-3xl font-bold text-primary mb-2">
                          +{formatMuskBucks(leaderboard[0].profitAll)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="text-tertiary">
                            {Math.round(leaderboard[0].winRate * 100)}% win rate
                          </div>
                          <div className="text-tertiary">{leaderboard[0].totalBets} bets</div>
                          <div className="font-bold text-green-600">
                            {Math.round((leaderboard[0].roi || 0) * 100)}% ROI
                          </div>
                          {leaderboard[0].longestStreak > 0 && (
                            <div className="text-orange-600 font-medium">
                              🔥 {leaderboard[0].longestStreak} streak
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Third Place */}
                <div className="md:pt-8">
                  {leaderboard[2] && (
                    <div className="bg-gradient-to-b from-amber-100 to-amber-50 rounded-lg p-6 shadow-lg border-2 border-amber-300">
                      <div className="text-center mb-4">
                        <div className="text-4xl mb-2">🥉</div>
                        <div className="text-3xl font-bold">3rd</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-lg mb-2">{leaderboard[2].userName}</div>
                        <div className="text-2xl font-bold text-primary mb-2">
                          +{formatMuskBucks(leaderboard[2].profitAll)}
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="text-tertiary">
                            {Math.round(leaderboard[2].winRate * 100)}% win rate
                          </div>
                          <div className="text-tertiary">{leaderboard[2].totalBets} bets</div>
                          <div className="font-medium text-green-600">
                            {Math.round((leaderboard[2].roi || 0) * 100)}% ROI
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Full Leaderboard */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-6">📊 Full Rankings</h2>

            {leaderboard.length === 0 ? (
              <div className="bg-surface rounded-lg p-8 text-center">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2">No rankings yet</h3>
                <p className="text-tertiary">Be the first to place some bets!</p>
              </div>
            ) : (
              <div className="bg-surface rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold">Rank</th>
                        <th className="px-4 py-3 text-left font-semibold">Player</th>
                        <th className="px-4 py-3 text-right font-semibold">Profit</th>
                        <th className="px-4 py-3 text-right font-semibold hidden md:table-cell">
                          Win Rate
                        </th>
                        <th className="px-4 py-3 text-right font-semibold hidden md:table-cell">
                          Bets
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">ROI</th>
                        <th className="px-4 py-3 text-right font-semibold hidden lg:table-cell">
                          Streak
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaderboard.map((entry, index) => {
                        const rank = index + 1;
                        return (
                          <tr
                            key={entry.userId}
                            className={`border-b border-border hover:bg-muted/20 transition-colors ${getRankStyle(rank)}`}
                          >
                            <td className="px-4 py-3">
                              <div className="font-bold text-lg">{getRankIcon(rank)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium">{entry.userName}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-bold text-primary">
                                +{formatMuskBucks(entry.profitAll)}
                              </div>
                              {entry.profitPeriod && (
                                <div className="text-xs text-tertiary">
                                  Today: +{formatMuskBucks(entry.profitPeriod)}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <div className="font-medium">{Math.round(entry.winRate * 100)}%</div>
                            </td>
                            <td className="px-4 py-3 text-right hidden md:table-cell">
                              <div>{entry.totalBets}</div>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <div className="font-medium text-green-600">
                                {Math.round((entry.roi || 0) * 100)}%
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right hidden lg:table-cell">
                              {entry.longestStreak > 0 && (
                                <div className="inline-flex items-center space-x-1">
                                  <span className="text-orange-500">🔥</span>
                                  <span>{entry.longestStreak}</span>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {leaderboard.length > 25 && (
                  <div className="p-4 bg-muted/30 text-center">
                    <a
                      href={`${clientAppUrl}/leaderboard`}
                      className="text-primary hover:underline font-medium"
                    >
                      View all {leaderboard.length} players →
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="bg-surface rounded-lg p-8 text-center shadow">
            <h2 className="text-2xl font-bold mb-4">Think You Can Do Better?</h2>
            <p className="text-tertiary mb-6">Join the competition and climb the leaderboard</p>
            <div className="flex justify-center space-x-4">
              <a
                href={`${clientAppUrl}/register`}
                className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-hover font-semibold text-lg transition-colors"
              >
                Start Competing
              </a>
              <a
                href={`${clientAppUrl}/predictions`}
                className="px-8 py-3 bg-surface border border-border text-content rounded-lg hover:bg-muted/20 font-semibold text-lg transition-colors"
              >
                View Predictions
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
