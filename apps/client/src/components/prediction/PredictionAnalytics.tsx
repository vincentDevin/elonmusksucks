import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  FireIcon,
  TrophyIcon,
  EyeIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { getPredictionAnalytics } from '../../api/predictions';
import { formatMuskBucks } from '../../utils/formatting';

interface AnalyticsData {
  totalBets: number;
  totalVolume: number;
  uniqueBettors: number;
  controversyScore: number;
  popularityScore: number;
  viewStats: {
    totalViews: number;
    uniqueUserViews: number;
    viewToEngagementRatio: number;
  };
  difficultyLevel: 'easy' | 'medium' | 'hard' | 'expert';
  activityLevel: 'high' | 'medium' | 'low';
}

interface PredictionAnalyticsProps {
  predictionId: number;
}

const difficultyColors = {
  easy: 'text-green-500',
  medium: 'text-yellow-500',
  hard: 'text-orange-500',
  expert: 'text-red-500',
};

const activityColors = {
  high: 'text-green-500',
  medium: 'text-yellow-500',
  low: 'text-gray-500',
};

export default function PredictionAnalytics({ predictionId }: PredictionAnalyticsProps) {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await getPredictionAnalytics(predictionId);
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [predictionId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-tertiary">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="text-center py-8 text-error">
        <ChartBarIcon className="w-12 h-12 mx-auto mb-3" />
        <p>Failed to load analytics: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<ChartBarIcon className="w-6 h-6" />}
          label="Total Bets"
          value={analytics.totalBets.toString()}
          color="text-blue-500"
        />
        <MetricCard
          icon={<CurrencyDollarIcon className="w-6 h-6" />}
          label="Total Volume"
          value={`${formatMuskBucks(analytics.totalVolume)}`}
          color="text-green-500"
        />
        <MetricCard
          icon={<UserGroupIcon className="w-6 h-6" />}
          label="Unique Bettors"
          value={analytics.uniqueBettors.toString()}
          color="text-purple-500"
        />
        <MetricCard
          icon={<EyeIcon className="w-6 h-6" />}
          label="Total Views"
          value={analytics.viewStats.totalViews.toString()}
          color="text-indigo-500"
        />
      </div>

      {/* Engagement Metrics */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
          <SignalIcon className="w-5 h-5 text-primary" />
          Engagement Metrics
        </h3>
        <div className="space-y-4">
          <ProgressMetric
            label="Controversy Score"
            value={analytics.controversyScore}
            max={100}
            color="bg-orange-500"
            description="How evenly split the betting is"
          />
          <ProgressMetric
            label="Popularity Score"
            value={analytics.popularityScore}
            max={100}
            color="bg-pink-500"
            description="Overall engagement and interest"
          />
          <ProgressMetric
            label="View to Engagement Ratio"
            value={Math.round(analytics.viewStats.viewToEngagementRatio * 100)}
            max={100}
            color="bg-blue-500"
            description="Percentage of viewers who placed bets"
          />
        </div>
      </div>

      {/* View Statistics */}
      <div className="bg-surface rounded-xl border border-border p-6">
        <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
          <EyeIcon className="w-5 h-5 text-primary" />
          View Statistics
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatItem label="Total Views" value={analytics.viewStats.totalViews} />
          <StatItem label="Unique Viewers" value={analytics.viewStats.uniqueUserViews} />
          <StatItem
            label="Engagement Rate"
            value={`${(analytics.viewStats.viewToEngagementRatio * 100).toFixed(1)}%`}
          />
        </div>
      </div>

      {/* Classification */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-primary" />
            Difficulty Level
          </h3>
          <div className="text-center">
            <div
              className={`text-4xl font-bold ${difficultyColors[analytics.difficultyLevel]} mb-2`}
            >
              {analytics.difficultyLevel.toUpperCase()}
            </div>
            <p className="text-sm text-tertiary">Prediction complexity rating</p>
          </div>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <h3 className="text-lg font-semibold text-content mb-4 flex items-center gap-2">
            <FireIcon className="w-5 h-5 text-primary" />
            Activity Level
          </h3>
          <div className="text-center">
            <div className={`text-4xl font-bold ${activityColors[analytics.activityLevel]} mb-2`}>
              {analytics.activityLevel.toUpperCase()}
            </div>
            <p className="text-sm text-tertiary">Current betting activity</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`${color}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-sm text-tertiary">{label}</p>
          <p className="text-2xl font-bold text-content">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ProgressMetric({
  label,
  value,
  max,
  color,
  description,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  description: string;
}) {
  const percentage = (value / max) * 100;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <div>
          <p className="text-sm font-medium text-content">{label}</p>
          <p className="text-xs text-tertiary">{description}</p>
        </div>
        <span className="text-lg font-bold text-content">{value}</span>
      </div>
      <div className="w-full bg-muted rounded-full h-3">
        <div
          className={`${color} h-3 rounded-full transition-all duration-500`}
          style={{ width: `${Math.min(100, percentage)}%` }}
        />
      </div>
    </div>
  );
}

function StatItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center p-4 bg-muted/30 rounded-lg">
      <p className="text-2xl font-bold text-content mb-1">{value}</p>
      <p className="text-sm text-tertiary">{label}</p>
    </div>
  );
}
