import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { ChartBarIcon, CalendarIcon } from '@heroicons/react/24/outline';
import api from '../../api/axios';

interface EloHistoryEntry {
  date: string;
  rating: number;
  matchId: string;
  change: number;
  tier?: string;
}

interface EloChartProps {
  userId: number;
  className?: string;
  height?: number;
  showControls?: boolean;
}

const TIER_COLORS = {
  BRONZE: '#f97316',
  SILVER: '#6b7280',
  GOLD: '#eab308',
  PLATINUM: '#22c55e',
  DIAMOND: '#3b82f6',
  MASTER: '#ef4444',
  GRANDMASTER: '#a855f7',
};

const TIER_RANGES = {
  BRONZE: { min: 400, max: 999 },
  SILVER: { min: 1000, max: 1399 },
  GOLD: { min: 1400, max: 1799 },
  PLATINUM: { min: 1800, max: 2199 },
  DIAMOND: { min: 2200, max: 2599 },
  MASTER: { min: 2600, max: 2999 },
  GRANDMASTER: { min: 3000, max: 10000 },
};

export default function EloChart({
  userId,
  className = '',
  height = 400,
  showControls = true,
}: EloChartProps) {
  const [eloHistory, setEloHistory] = useState<EloHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    const fetchEloHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get(`/api/pong/elo-history/${userId}`);
        const data = response.data;

        // Filter data based on timeframe
        const now = new Date();
        const filteredData = data.filter((entry: EloHistoryEntry) => {
          if (timeframe === 'all') return true;

          const entryDate = new Date(entry.date);
          const daysAgo = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
          const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

          return entryDate >= cutoff;
        });

        setEloHistory(filteredData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Elo history');
      } finally {
        setLoading(false);
      }
    };

    fetchEloHistory();
  }, [userId, timeframe]);

  const formatTooltip = (value: any, name: any) => {
    if (name === 'rating') {
      return [`${value} Elo`, 'Rating'];
    }
    return [value, name];
  };

  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      ...(timeframe === 'all' ? { year: '2-digit' } : {}),
    });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    const rating = payload[0].value;

    return (
      <div className="bg-surface border border-accent/20 rounded-lg p-3 shadow-lg">
        <p className="text-sm text-tertiary mb-1">
          {new Date(label).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
        <p className="text-lg font-bold text-blue-500">{rating} Elo</p>
        {data.change && (
          <p
            className={`text-sm font-medium ${data.change > 0 ? 'text-green-500' : 'text-red-500'}`}
          >
            Change: {data.change > 0 ? '+' : ''}
            {data.change}
          </p>
        )}
        {data.tier && <p className="text-xs text-tertiary mt-1">Tier: {data.tier}</p>}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className={`bg-muted rounded`} style={{ height: `${height}px` }}></div>
        </div>
      </div>
    );
  }

  if (error || eloHistory.length === 0) {
    return (
      <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
        <div className="flex items-center space-x-3 mb-4">
          <ChartBarIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content">Elo Progression</span>
        </div>
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📈</div>
          <p className="text-tertiary">{error ? error : 'No Elo history available yet'}</p>
          {!error && (
            <p className="text-sm text-tertiary mt-1">
              Play some Pong matches to see your progression!
            </p>
          )}
        </div>
      </div>
    );
  }

  const minRating = Math.min(...eloHistory.map((entry) => entry.rating));
  const maxRating = Math.max(...eloHistory.map((entry) => entry.rating));
  const ratingRange = maxRating - minRating;
  const yAxisMin = Math.max(400, minRating - ratingRange * 0.1);
  const yAxisMax = maxRating + ratingRange * 0.1;

  // Find tier boundaries that are visible in the chart
  const visibleTierLines = Object.entries(TIER_RANGES)
    .filter(([, range]) => range.min >= yAxisMin && range.min <= yAxisMax)
    .map(([tier, range]) => ({ tier, rating: range.min }));

  return (
    <div className={`bg-surface rounded-xl shadow-sm border border-accent/20 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <ChartBarIcon className="w-6 h-6 text-blue-500" />
          <span className="font-semibold text-content">Elo Progression</span>
        </div>

        {showControls && (
          <div className="flex items-center space-x-2">
            <CalendarIcon className="w-4 h-4 text-tertiary" />
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as any)}
              className="text-sm bg-surface border border-accent/20 rounded px-2 py-1 text-content"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4 text-center">
        <div>
          <div className="text-sm text-tertiary">Current</div>
          <div className="text-lg font-bold text-blue-500">
            {eloHistory[eloHistory.length - 1]?.rating || 'N/A'}
          </div>
        </div>
        <div>
          <div className="text-sm text-tertiary">Peak</div>
          <div className="text-lg font-bold text-green-500">{maxRating}</div>
        </div>
        <div>
          <div className="text-sm text-tertiary">Change</div>
          <div
            className={`text-lg font-bold ${
              eloHistory.length > 1
                ? eloHistory[eloHistory.length - 1].rating - eloHistory[0].rating >= 0
                  ? 'text-green-500'
                  : 'text-red-500'
                : 'text-tertiary'
            }`}
          >
            {eloHistory.length > 1
              ? `${eloHistory[eloHistory.length - 1].rating - eloHistory[0].rating >= 0 ? '+' : ''}${
                  eloHistory[eloHistory.length - 1].rating - eloHistory[0].rating
                }`
              : 'N/A'}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={eloHistory} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
            <XAxis dataKey="date" tickFormatter={formatXAxisLabel} stroke="#6b7280" fontSize={12} />
            <YAxis
              domain={[yAxisMin, yAxisMax]}
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Tier boundary lines */}
            {visibleTierLines.map(({ tier, rating }) => (
              <ReferenceLine
                key={tier}
                y={rating}
                stroke={TIER_COLORS[tier as keyof typeof TIER_COLORS]}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
                label={{
                  value: tier,
                  position: 'right',
                  style: {
                    fontSize: 10,
                    fill: TIER_COLORS[tier as keyof typeof TIER_COLORS],
                    fontWeight: 'bold',
                  },
                }}
              />
            ))}

            <Line
              type="monotone"
              dataKey="rating"
              stroke="#3b82f6"
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#ffffff' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 text-xs text-tertiary">
        <p>📈 Track your Elo rating progress over time</p>
        <p>Dashed lines show tier boundaries • Hover over points for details</p>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function MiniEloChart({
  userId,
  className = '',
}: Pick<EloChartProps, 'userId' | 'className'>) {
  return <EloChart userId={userId} className={className} height={200} showControls={false} />;
}
