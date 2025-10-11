import { useState, useMemo } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull } from '@ems/types';
import {
  ClockIcon as Clock,
  ArrowTrendingUpIcon as TrendingUp,
  FunnelIcon as Filter,
  MagnifyingGlassIcon as Search,
  ArrowsUpDownIcon as ArrowUpDown,
  Squares2X2Icon as Layers,
  EllipsisHorizontalIcon as MoreHorizontal,
  BoltIcon as Zap,
  EyeIcon as Target,
  TrophyIcon as Award,
} from '@heroicons/react/24/outline';

interface PredictionBettingHistoryProps {
  prediction: PredictionFull;
  className?: string;
}

interface CombinedBet {
  id: string;
  type: 'single' | 'parlay';
  userId: number;
  userName: string;
  userAvatar?: string;
  optionId: number;
  optionLabel: string;
  amount: number;
  odds: number;
  potentialPayout: number;
  createdAt: string;
  status: 'pending' | 'won' | 'lost';
  parlayId?: number;
  isHighStakes?: boolean;
  isRecent?: boolean;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

export default function PredictionBettingHistory({
  prediction,
  className = '',
}: PredictionBettingHistoryProps) {
  const [sortBy, setSortBy] = useState<'time' | 'amount' | 'odds' | 'user'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'single' | 'parlay' | 'highStakes'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);

  // Combine and process betting data
  const combinedBets = useMemo(() => {
    const bets: CombinedBet[] = [];
    const now = Date.now();

    // Add single bets
    prediction.bets.forEach((bet) => {
      const option = prediction.options.find((o) => o.id === bet.optionId);
      if (!option) return;

      const amount = asNum(bet.amount);
      const isHighStakes = amount >= 500;
      const isRecent = new Date(bet.createdAt).getTime() > now - 60 * 60 * 1000; // Last hour

      bets.push({
        id: `bet-${bet.id}`,
        type: 'single',
        userId: bet.userId,
        userName: bet.user?.name || 'Anonymous',
        userAvatar: bet.user?.avatarUrl || undefined,
        optionId: bet.optionId || 0,
        optionLabel: option.label,
        amount,
        odds: option.odds,
        potentialPayout: amount * option.odds,
        createdAt: bet.createdAt.toString(),
        status: 'pending', // Would come from actual bet resolution
        isHighStakes,
        isRecent,
      });
    });

    // Add parlay legs
    (prediction.parlayLegs || []).forEach((leg) => {
      const option = prediction.options.find((o) => o.id === leg.optionId);
      if (!option) return;

      const amount = asNum(leg.stake);
      const isHighStakes = amount >= 500;
      const isRecent = new Date(leg.createdAt).getTime() > now - 60 * 60 * 1000;

      bets.push({
        id: `parlay-${leg.parlayId}-${leg.optionId}`,
        type: 'parlay',
        userId: leg.user?.id || 0,
        userName: leg.user?.name || 'Anonymous',
        userAvatar: leg.user?.avatarUrl || undefined,
        optionId: leg.optionId || 0,
        optionLabel: option.label,
        amount,
        odds: option.odds,
        potentialPayout: amount * option.odds,
        createdAt: leg.createdAt.toString(),
        status: 'pending',
        parlayId: leg.parlayId,
        isHighStakes,
        isRecent,
      });
    });

    return bets;
  }, [prediction]);

  // Filter and sort bets
  const filteredAndSortedBets = useMemo(() => {
    let filtered = combinedBets;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (bet) =>
          bet.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bet.optionLabel.toLowerCase().includes(searchTerm.toLowerCase()),
      );
    }

    // Apply category filter
    switch (filterBy) {
      case 'single':
        filtered = filtered.filter((bet) => bet.type === 'single');
        break;
      case 'parlay':
        filtered = filtered.filter((bet) => bet.type === 'parlay');
        break;
      case 'highStakes':
        filtered = filtered.filter((bet) => bet.isHighStakes);
        break;
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'time':
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
          break;
        case 'amount':
          aVal = a.amount;
          bVal = b.amount;
          break;
        case 'odds':
          aVal = a.odds;
          bVal = b.odds;
          break;
        case 'user':
          aVal = a.userName.toLowerCase();
          bVal = b.userName.toLowerCase();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [combinedBets, searchTerm, filterBy, sortBy, sortOrder]);

  // Summary statistics
  const summaryStats = useMemo(() => {
    const totalBets = combinedBets.length;
    const totalVolume = combinedBets.reduce((sum, bet) => sum + bet.amount, 0);
    const uniqueUsers = new Set(combinedBets.map((bet) => bet.userId)).size;
    const singleBets = combinedBets.filter((bet) => bet.type === 'single').length;
    const parlayBets = combinedBets.filter((bet) => bet.type === 'parlay').length;
    const highStakesBets = combinedBets.filter((bet) => bet.isHighStakes).length;
    const avgBetSize = totalBets > 0 ? totalVolume / totalBets : 0;

    return {
      totalBets,
      totalVolume,
      uniqueUsers,
      singleBets,
      parlayBets,
      highStakesBets,
      avgBetSize,
    };
  }, [combinedBets]);

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getOptionColor = (optionId: number) => {
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];
    return colors[optionId % colors.length];
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Total Bets</div>
          <div className="text-lg font-bold text-content">{summaryStats.totalBets}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Total Volume</div>
          <div className="text-lg font-bold text-content">
            formatMuskBucks(summaryStats.totalVolume) 🪙
          </div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Unique Users</div>
          <div className="text-lg font-bold text-content">{summaryStats.uniqueUsers}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Single Bets</div>
          <div className="text-lg font-bold text-content">{summaryStats.singleBets}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Parlay Legs</div>
          <div className="text-lg font-bold text-content">{summaryStats.parlayBets}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">High Stakes</div>
          <div className="text-lg font-bold text-content">{summaryStats.highStakesBets}</div>
        </div>
        <div className="bg-surface border border-border rounded-lg p-3">
          <div className="text-xs text-tertiary mb-1">Avg Bet</div>
          <div className="text-lg font-bold text-content">
            formatMuskBucks(summaryStats.avgBetSize) 🪙
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary" />
            <input
              type="text"
              placeholder="Search by user or option..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary"
            />
          </div>

          {/* Filter */}
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value as any)}
            className="px-3 py-2 bg-muted border border-border rounded-lg text-content focus:outline-none focus:border-primary"
          >
            <option value="all">All Bets</option>
            <option value="single">Single Bets</option>
            <option value="parlay">Parlay Legs</option>
            <option value="highStakes">High Stakes ($500+)</option>
          </select>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-tertiary" />
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [field, order] = e.target.value.split('-');
                setSortBy(field as any);
                setSortOrder(order as any);
              }}
              className="px-3 py-2 bg-muted border border-border rounded-lg text-content focus:outline-none focus:border-primary"
            >
              <option value="time-desc">Newest First</option>
              <option value="time-asc">Oldest First</option>
              <option value="amount-desc">Highest Amount</option>
              <option value="amount-asc">Lowest Amount</option>
              <option value="odds-desc">Highest Odds</option>
              <option value="odds-asc">Lowest Odds</option>
              <option value="user-asc">User A-Z</option>
              <option value="user-desc">User Z-A</option>
            </select>
          </div>
        </div>
      </div>

      {/* Betting History Table */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Betting History ({filteredAndSortedBets.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30">
              <tr>
                <th className="text-left p-4 text-sm font-medium text-tertiary">
                  <button
                    onClick={() => toggleSort('user')}
                    className="flex items-center gap-1 hover:text-content"
                  >
                    User
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">Type</th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">Option</th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">
                  <button
                    onClick={() => toggleSort('amount')}
                    className="flex items-center gap-1 hover:text-content"
                  >
                    Amount
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">
                  <button
                    onClick={() => toggleSort('odds')}
                    className="flex items-center gap-1 hover:text-content"
                  >
                    Odds
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">Potential Win</th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">
                  <button
                    onClick={() => toggleSort('time')}
                    className="flex items-center gap-1 hover:text-content"
                  >
                    Time
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="text-left p-4 text-sm font-medium text-tertiary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedBets.map((bet) => (
                <tr
                  key={bet.id}
                  className={`border-b border-border hover:bg-muted/20 transition-colors ${
                    bet.isRecent ? 'bg-primary/5' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                        {bet.userAvatar ? (
                          <img
                            src={bet.userAvatar}
                            alt={bet.userName}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-primary font-bold text-sm">
                            {bet.userName.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-content">{bet.userName}</p>
                        {bet.isRecent && (
                          <p className="text-xs text-success flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Recent
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {bet.type === 'single' ? (
                        <Target className="w-4 h-4 text-primary" />
                      ) : (
                        <Layers className="w-4 h-4 text-secondary" />
                      )}
                      <span
                        className={`text-sm font-medium ${
                          bet.type === 'single' ? 'text-primary' : 'text-secondary'
                        }`}
                      >
                        {bet.type === 'single' ? 'Single' : 'Parlay'}
                      </span>
                      {bet.isHighStakes && (
                        <Award className="w-3 h-3 text-warning ml-1" title="High Stakes" />
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getOptionColor(bet.optionId) }}
                      />
                      <span className="text-sm text-content">{bet.optionLabel}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`text-sm font-medium ${
                        bet.isHighStakes ? 'text-warning' : 'text-content'
                      }`}
                    >
                      formatMuskBucks(bet.amount) 🪙
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-primary">{bet.odds.toFixed(2)}x</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-success">
                      formatMuskBucks(bet.potentialPayout) 🪙
                    </span>
                  </td>
                  <td className="p-4">
                    <div>
                      <p className="text-sm text-content">
                        {new Date(bet.createdAt).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-tertiary">
                        {new Date(bet.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => setShowDetails(showDetails === bet.id ? null : bet.id)}
                      className="p-1 hover:bg-muted rounded transition-colors"
                    >
                      <MoreHorizontal className="w-4 h-4 text-tertiary" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedBets.length === 0 && (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📊</div>
            <h3 className="text-lg font-semibold text-content mb-2">No Betting History</h3>
            <p className="text-tertiary">
              {searchTerm || filterBy !== 'all'
                ? 'No bets match your current filters.'
                : 'No bets have been placed on this prediction yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Option Distribution */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          Betting Distribution by Option
        </h3>
        <div className="space-y-3">
          {prediction.options.map((option) => {
            const optionBets = filteredAndSortedBets.filter((bet) => bet.optionId === option.id);
            const optionVolume = optionBets.reduce((sum, bet) => sum + bet.amount, 0);
            const percentage =
              summaryStats.totalVolume > 0 ? (optionVolume / summaryStats.totalVolume) * 100 : 0;

            return (
              <div
                key={option.id}
                className="flex items-center justify-between p-3 bg-muted/20 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: getOptionColor(option.id) }}
                  />
                  <div>
                    <p className="text-sm font-medium text-content">{option.label}</p>
                    <p className="text-xs text-tertiary">
                      {optionBets.length} bets • {option.odds.toFixed(2)}x odds
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-content">
                    formatMuskBucks(optionVolume) 🪙
                  </p>
                  <p className="text-xs text-tertiary">{percentage.toFixed(1)}%</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
