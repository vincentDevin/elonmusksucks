import React, { useState, useEffect } from 'react';
import {
  getUserBehaviorAnalytics,
  type UserBehaviorAnalytics as UserBehaviorData,
  type AnalyticsParams
} from '../../api/admin';

interface ChartProps {
  title: string;
  children: React.ReactNode;
}

const ChartContainer: React.FC<ChartProps> = ({ title, children }) => (
  <div className="bg-surface rounded-lg p-6 border border-muted">
    <h3 className="text-lg font-semibold text-content mb-4">{title}</h3>
    {children}
  </div>
);

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ 
  label, 
  value, 
  maxValue, 
  color = 'bg-primary' 
}) => {
  const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
  
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex-1">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-content">{label}</span>
          <span className="text-xs text-tertiary">{value.toLocaleString()}</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};

interface TimePatternBarProps {
  hour: number;
  betCount: number;
  volume: number;
  maxBetCount: number;
  maxVolume: number;
}

const TimePatternBar: React.FC<TimePatternBarProps> = ({ 
  hour, 
  betCount, 
  volume, 
  maxBetCount, 
  maxVolume 
}) => {
  const betHeight = maxBetCount > 0 ? (betCount / maxBetCount) * 100 : 0;
  const volumeHeight = maxVolume > 0 ? (volume / maxVolume) * 100 : 0;

  return (
    <div className="flex flex-col items-center space-y-2">
      <div className="flex space-x-1 h-24 items-end">
        <div 
          className="w-3 bg-primary rounded-t"
          style={{ height: `${betHeight}%` }}
          title={`${betCount} bets`}
        />
        <div 
          className="w-3 bg-secondary rounded-t"
          style={{ height: `${volumeHeight}%` }}
          title={`$${volume.toLocaleString()} volume`}
        />
      </div>
      <span className="text-xs text-tertiary">{hour}:00</span>
    </div>
  );
};

const UserBehaviorAnalytics: React.FC = () => {
  const [behaviorData, setBehaviorData] = useState<UserBehaviorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<string>('30d');

  const loadBehaviorData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: AnalyticsParams = {};
      const now = new Date();

      switch (dateRange) {
        case '7d':
          params.startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '30d':
          params.startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '90d':
          params.startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();
          break;
        case '1y':
          params.startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
          break;
      }

      params.endDate = now.toISOString();

      const data = await getUserBehaviorAnalytics(params);
      setBehaviorData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load behavior analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBehaviorData();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="text-red-600">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadBehaviorData}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!behaviorData) {
    return (
      <div className="text-center text-tertiary">
        No behavior analytics data available
      </div>
    );
  }

  const maxCategoryCount = Math.max(...behaviorData.bettingPatterns.preferredCategories.map(c => c.count));
  const maxCategoryVolume = Math.max(...behaviorData.bettingPatterns.preferredCategories.map(c => c.volume));
  const maxBetCount = Math.max(...behaviorData.bettingPatterns.timePatterns.map(p => p.betCount));
  const maxVolume = Math.max(...behaviorData.bettingPatterns.timePatterns.map(p => p.volume));

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-content">User Behavior Analytics</h2>
          <p className="text-tertiary mt-1">Detailed insights into user engagement patterns and preferences</p>
        </div>
        <div className="flex space-x-2">
          {[
            { key: '7d', label: '7 Days' },
            { key: '30d', label: '30 Days' },
            { key: '90d', label: '90 Days' },
            { key: '1y', label: '1 Year' }
          ].map((range) => (
            <button
              key={range.key}
              onClick={() => setDateRange(range.key)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition ${
                dateRange === range.key
                  ? 'bg-primary text-white'
                  : 'bg-surface text-tertiary hover:text-content border border-muted'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Betting Pattern Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-surface rounded-lg p-6 border border-muted">
          <h3 className="text-lg font-semibold text-content mb-2">Average Bets Per User</h3>
          <p className="text-3xl font-bold text-primary">{behaviorData.bettingPatterns.avgBetsPerUser.toFixed(1)}</p>
          <p className="text-sm text-tertiary mt-1">bets per user</p>
        </div>
        
        <div className="bg-surface rounded-lg p-6 border border-muted">
          <h3 className="text-lg font-semibold text-content mb-2">Average Bet Amount</h3>
          <p className="text-3xl font-bold text-primary">${behaviorData.bettingPatterns.avgBetAmount.toFixed(0)}</p>
          <p className="text-sm text-tertiary mt-1">per bet</p>
        </div>

        <div className="bg-surface rounded-lg p-6 border border-muted">
          <h3 className="text-lg font-semibold text-content mb-2">Total Categories</h3>
          <p className="text-3xl font-bold text-primary">{behaviorData.bettingPatterns.preferredCategories.length}</p>
          <p className="text-sm text-tertiary mt-1">active categories</p>
        </div>
      </div>

      {/* Category Preferences */}
      <ChartContainer title="Preferred Betting Categories">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
              <span className="text-tertiary">Bet Count</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-secondary rounded-full mr-2"></div>
              <span className="text-tertiary">Volume ($)</span>
            </div>
          </div>
          
          {behaviorData.bettingPatterns.preferredCategories.slice(0, 8).map((category, index) => (
            <div key={index} className="space-y-2">
              <ProgressBar
                label={`${category.category} (Count)`}
                value={category.count}
                maxValue={maxCategoryCount}
                color="bg-primary"
              />
              <ProgressBar
                label={`${category.category} (Volume)`}
                value={category.volume}
                maxValue={maxCategoryVolume}
                color="bg-secondary"
              />
              {index < behaviorData.bettingPatterns.preferredCategories.length - 1 && (
                <div className="border-b border-muted my-3"></div>
              )}
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Time-based Betting Patterns */}
      <ChartContainer title="Hourly Betting Patterns">
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-primary rounded-full mr-2"></div>
              <span className="text-tertiary">Bet Count</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-secondary rounded-full mr-2"></div>
              <span className="text-tertiary">Volume ($)</span>
            </div>
          </div>
          
          <div className="flex justify-between items-end space-x-1 overflow-x-auto pb-2">
            {behaviorData.bettingPatterns.timePatterns.map((pattern, index) => (
              <TimePatternBar
                key={index}
                hour={pattern.hour}
                betCount={pattern.betCount}
                volume={pattern.volume}
                maxBetCount={maxBetCount}
                maxVolume={maxVolume}
              />
            ))}
          </div>
          
          <div className="text-xs text-tertiary text-center mt-4">
            Peak betting hours are typically {' '}
            {behaviorData.bettingPatterns.timePatterns
              .reduce((peak, pattern, index) => 
                pattern.betCount > (behaviorData.bettingPatterns.timePatterns[peak]?.betCount || 0) ? index : peak, 0
              )}:00 - {' '}
            {behaviorData.bettingPatterns.timePatterns
              .reduce((peak, pattern, index) => 
                pattern.betCount > (behaviorData.bettingPatterns.timePatterns[peak]?.betCount || 0) ? index : peak, 0
              ) + 2}:00
          </div>
        </div>
      </ChartContainer>

      {/* Activity Level Distribution */}
      <ChartContainer title="User Activity Levels">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {behaviorData.demographics.activityLevels.map((level, index) => (
            <div key={index} className="text-center p-4 bg-muted rounded-lg">
              <h4 className="font-semibold text-content mb-2">{level.level} Activity</h4>
              <p className="text-2xl font-bold text-primary mb-1">{level.count.toLocaleString()}</p>
              <p className="text-sm text-tertiary">users</p>
              <p className="text-xs text-tertiary mt-2">
                Avg Value: ${level.avgValue.toFixed(0)}
              </p>
            </div>
          ))}
        </div>
      </ChartContainer>

      {/* Demographics Overview */}
      <ChartContainer title="User Demographics">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-content mb-3">Age Distribution</h4>
            <div className="space-y-3">
              {behaviorData.demographics.ageDistribution.map((age, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-content">{age.ageRange}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-muted rounded-full h-2">
                      <div
                        className="h-2 bg-primary rounded-full"
                        style={{ width: `${age.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-tertiary w-8">{age.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-content mb-3">Engagement Metrics</h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-content">Avg Session Length</span>
                <span className="text-sm font-medium text-primary">
                  {behaviorData.engagement.sessionMetrics.avgLength} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-content">Avg Actions per Session</span>
                <span className="text-sm font-medium text-primary">
                  {behaviorData.engagement.sessionMetrics.avgActions}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-content">Feature Usage</span>
                <span className="text-sm font-medium text-primary">
                  {behaviorData.engagement.featureUsage.length} features tracked
                </span>
              </div>
            </div>
          </div>
        </div>
      </ChartContainer>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadBehaviorData}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Refreshing...' : 'Refresh Analytics'}
        </button>
      </div>
    </div>
  );
};

export default UserBehaviorAnalytics;