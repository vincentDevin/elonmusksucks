import { useState, useMemo } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull } from '@ems/types';
import {
  ArrowTrendingUpIcon as TrendingUp,
  ChartBarIcon as BarChart3,
  ChartPieIcon as PieChart,
  BoltIcon as Activity,
  UsersIcon as Users,
  CurrencyDollarIcon as DollarSign,
  ClockIcon as Clock,
  EyeIcon as Target,
  BoltIcon as Zap,
  CalendarIcon as Calendar,
  TrophyIcon as Award,
  EyeIcon as Eye,
  CursorArrowRaysIcon as MousePointer,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface PredictionStatsProps {
  prediction: PredictionFull;
  className?: string;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

export default function PredictionStats({ prediction, className = '' }: PredictionStatsProps) {
  const [activeChart, setActiveChart] = useState<'volume' | 'odds' | 'activity' | 'demographics'>(
    'volume',
  );

  // Process betting data
  const bettingData = useMemo(() => {
    const createdAt = new Date(prediction.createdAt).getTime();
    const expires = new Date(prediction.expiresAt).getTime();
    const duration = expires - createdAt;

    // Group bets by time periods (24 hour buckets)
    const timelineData: { [key: string]: any } = {};
    const allBets = [...prediction.bets, ...(prediction.parlayLegs || [])];

    // Initialize timeline buckets
    const buckets = 20; // 20 time periods
    const bucketSize = duration / buckets;
    for (let i = 0; i < buckets; i++) {
      const bucketStart = createdAt + i * bucketSize;
      // const bucketEnd = bucketStart + bucketSize;
      const date = new Date(bucketStart).toLocaleDateString();

      timelineData[date] = {
        date,
        volume: 0,
        bets: 0,
        timestamp: bucketStart,
        period: i,
      };
    }

    // Aggregate betting data
    allBets.forEach((bet) => {
      const betTime = new Date(bet.createdAt).getTime();
      const bucketIndex = Math.floor((betTime - createdAt) / bucketSize);
      const date = new Date(createdAt + bucketIndex * bucketSize).toLocaleDateString();

      if (timelineData[date]) {
        const amount = 'amount' in bet ? asNum(bet.amount) : asNum((bet as any).stake);
        timelineData[date].volume += amount;
        timelineData[date].bets += 1;
      }
    });

    return Object.values(timelineData).sort((a: any, b: any) => a.timestamp - b.timestamp);
  }, [prediction]);

  // Option performance data
  const optionData = useMemo(() => {
    return prediction.options.map((option) => {
      const optionBets = prediction.bets.filter((bet) => bet.optionId === option.id);
      const optionParlayLegs = (prediction.parlayLegs || []).filter(
        (leg) => leg.optionId === option.id,
      );

      const volume =
        optionBets.reduce((sum, bet) => sum + asNum(bet.amount), 0) +
        optionParlayLegs.reduce((sum, leg) => sum + asNum(leg.stake), 0);

      const count = optionBets.length + optionParlayLegs.length;
      const percentage = prediction.bets.length > 0 ? (count / prediction.bets.length) * 100 : 0;

      return {
        label: option.label,
        odds: option.odds,
        volume,
        count,
        percentage,
        color: option.id % 2 === 0 ? '#3b82f6' : '#8b5cf6',
      };
    });
  }, [prediction]);

  // Activity metrics
  const activityMetrics = useMemo(() => {
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const weekMs = 7 * dayMs;

    const recentDay = prediction.bets.filter(
      (bet) => new Date(bet.createdAt).getTime() > now - dayMs,
    );
    const recentWeek = prediction.bets.filter(
      (bet) => new Date(bet.createdAt).getTime() > now - weekMs,
    );

    const totalVolume =
      prediction.bets.reduce((sum, bet) => sum + asNum(bet.amount), 0) +
      (prediction.parlayLegs || []).reduce((sum, leg) => sum + asNum(leg.stake), 0);

    const avgBetSize = prediction.bets.length > 0 ? totalVolume / prediction.bets.length : 0;

    // Calculate velocity (bets per day)
    const daysSinceCreation = (now - new Date(prediction.createdAt).getTime()) / dayMs;
    const velocity = daysSinceCreation > 0 ? prediction.bets.length / daysSinceCreation : 0;

    return {
      total: {
        bets: prediction.bets.length,
        volume: totalVolume,
        parlays: (prediction.parlayLegs || []).length,
        avgBetSize,
      },
      day: {
        bets: recentDay.length,
        volume: recentDay.reduce((sum, bet) => sum + asNum(bet.amount), 0),
      },
      week: {
        bets: recentWeek.length,
        volume: recentWeek.reduce((sum, bet) => sum + asNum(bet.amount), 0),
      },
      velocity,
    };
  }, [prediction]);

  // User engagement data
  const engagementData = useMemo(() => {
    const uniqueUsers = new Set(prediction.bets.map((bet) => bet.userId)).size;
    const repeatBettors = prediction.bets.reduce(
      (acc, bet) => {
        acc[bet.userId] = (acc[bet.userId] || 0) + 1;
        return acc;
      },
      {} as { [key: number]: number },
    );

    const multiplyBettors = Object.values(repeatBettors).filter((count) => count > 1).length;
    const engagementRate = uniqueUsers > 0 ? (multiplyBettors / uniqueUsers) * 100 : 0;

    return {
      uniqueUsers,
      multiplyBettors,
      engagementRate,
      avgBetsPerUser: uniqueUsers > 0 ? prediction.bets.length / uniqueUsers : 0,
    };
  }, [prediction]);

  // Odds history simulation (would come from real data)
  const oddsHistory = useMemo(() => {
    return bettingData.map((point) => ({
      ...point,
      ...prediction.options.reduce((acc, option, optionIndex) => {
        // Simulate odds changes based on betting volume
        const baseOdds = option.odds;
        const volumeImpact = point.volume > 0 ? Math.random() * 0.2 - 0.1 : 0;
        acc[`option${optionIndex + 1}Odds`] = Math.max(1.1, baseOdds + volumeImpact);
        return acc;
      }, {} as any),
    }));
  }, [bettingData, prediction.options]);

  const renderVolumeChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={bettingData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip
          formatter={(value: any, name: string) => [
            name === 'volume' ? `$formatMuskBucks(value) 🪙` : value,
            name === 'volume' ? 'Volume' : 'Bets',
          ]}
        />
        <Area
          type="monotone"
          dataKey="volume"
          stroke="#3b82f6"
          fill="#3b82f6"
          fillOpacity={0.3}
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );

  const renderOddsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={oddsHistory}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Legend />
        {prediction.options.map((option, index) => (
          <Line
            key={option.id}
            type="monotone"
            dataKey={`option${index + 1}Odds`}
            stroke={optionData[index]?.color || '#3b82f6'}
            strokeWidth={2}
            name={option.label}
            dot={{ fill: optionData[index]?.color || '#3b82f6', strokeWidth: 2, r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  const renderActivityChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={bettingData}>
        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} angle={-45} textAnchor="end" height={60} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="bets" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );

  const renderDemographicsChart = () => (
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Pie
          data={optionData}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(1)}%`}
        >
          {optionData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: any) => [`${value} bets`, 'Count']} />
        <Legend />
      </RechartsPieChart>
    </ResponsiveContainer>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">Total Bets</span>
          </div>
          <div className="text-2xl font-bold text-content">{activityMetrics.total.bets}</div>
          <div className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {activityMetrics.day.bets} today
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Total Volume</span>
          </div>
          <div className="text-2xl font-bold text-content">
            {formatMuskBucks(activityMetrics.total.volume)} 🪙
          </div>
          <div className="text-xs text-success flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            {formatMuskBucks(activityMetrics.day.volume)} 🪙 today
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-2">
            <Target className="w-4 h-4" />
            <span className="text-sm">Unique Users</span>
          </div>
          <div className="text-2xl font-bold text-content">{engagementData.uniqueUsers}</div>
          <div className="text-xs text-info flex items-center gap-1">
            <Eye className="w-3 h-3" />
            {engagementData.engagementRate.toFixed(1)}% engagement
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-sm">Avg Bet Size</span>
          </div>
          <div className="text-2xl font-bold text-content">
            {formatMuskBucks(activityMetrics.total.avgBetSize)} 🪙
          </div>
          <div className="text-xs text-tertiary flex items-center gap-1">
            <MousePointer className="w-3 h-3" />
            {activityMetrics.velocity.toFixed(1)} bets/day
          </div>
        </div>
      </div>

      {/* Option Performance */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Option Performance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {optionData.map((option, index) => (
            <div key={index} className="bg-muted/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-content line-clamp-1">{option.label}</h4>
                <span className="text-sm font-bold text-primary">{option.odds.toFixed(2)}x</span>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Volume</span>
                  <span className="font-medium text-content">
                    {formatMuskBucks(option.volume)} 🪙
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Bets</span>
                  <span className="font-medium text-content">{option.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-tertiary">Share</span>
                  <span className="font-medium text-content">{option.percentage.toFixed(1)}%</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${option.percentage}%`,
                      backgroundColor: option.color,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Section */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            Analytics Dashboard
          </h3>

          {/* Chart Selector */}
          <div className="flex bg-muted rounded-lg p-1">
            {[
              { id: 'volume', label: 'Volume', icon: <DollarSign className="w-4 h-4" /> },
              { id: 'odds', label: 'Odds', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'activity', label: 'Activity', icon: <Activity className="w-4 h-4" /> },
              { id: 'demographics', label: 'Distribution', icon: <PieChart className="w-4 h-4" /> },
            ].map((chart) => (
              <button
                key={chart.id}
                onClick={() => setActiveChart(chart.id as any)}
                className={`
                  flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors
                  ${
                    activeChart === chart.id
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-tertiary hover:text-content'
                  }
                `}
              >
                {chart.icon}
                <span className="hidden sm:inline">{chart.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chart Content */}
        <div>
          {activeChart === 'volume' && renderVolumeChart()}
          {activeChart === 'odds' && renderOddsChart()}
          {activeChart === 'activity' && renderActivityChart()}
          {activeChart === 'demographics' && renderDemographicsChart()}
        </div>

        {/* Chart Description */}
        <div className="mt-4 text-sm text-tertiary">
          {activeChart === 'volume' &&
            'Betting volume over time showing market interest and engagement patterns.'}
          {activeChart === 'odds' &&
            'Odds movements over time reflecting market sentiment and betting pressure.'}
          {activeChart === 'activity' &&
            'Number of bets placed over time showing activity spikes and trends.'}
          {activeChart === 'demographics' &&
            'Distribution of bets across different prediction options.'}
        </div>
      </div>

      {/* Time-based Analysis */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-3">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Last 24 Hours</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Bets</span>
              <span className="text-sm font-medium text-content">{activityMetrics.day.bets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Volume</span>
              <span className="text-sm font-medium text-content">
                {formatMuskBucks(activityMetrics.day.volume)} 🪙
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-3">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-medium">Last 7 Days</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Bets</span>
              <span className="text-sm font-medium text-content">{activityMetrics.week.bets}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Volume</span>
              <span className="text-sm font-medium text-content">
                {formatMuskBucks(activityMetrics.week.volume)} 🪙
              </span>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="flex items-center gap-2 text-tertiary mb-3">
            <Zap className="w-4 h-4" />
            <span className="text-sm font-medium">Velocity</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Daily Rate</span>
              <span className="text-sm font-medium text-content">
                {activityMetrics.velocity.toFixed(1)} bets/day
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-tertiary">Engagement</span>
              <span className="text-sm font-medium text-content">
                {engagementData.engagementRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
