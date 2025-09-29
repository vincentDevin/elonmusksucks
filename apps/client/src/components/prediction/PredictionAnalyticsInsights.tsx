// apps/client/src/components/prediction/PredictionAnalyticsInsights.tsx
import { useState } from 'react';
import {
  ChartBarIcon as Chart,
  ArrowTrendingUpIcon as TrendingUp,
  ArrowTrendingDownIcon as TrendingDown,
  BoltIcon as Bolt,
  UserGroupIcon as Users,
  CurrencyDollarIcon as Dollar,
  ClockIcon as Clock,
  ChevronDownIcon as ChevronDown,
  ChevronUpIcon as ChevronUp,
  InformationCircleIcon as Info,
} from '@heroicons/react/24/outline';
import { usePredictionAnalytics } from '../../hooks/usePredictionAnalytics';
import { formatPercentage } from '../../api/analytics';

interface PredictionAnalyticsInsightsProps {
  className?: string;
  compact?: boolean;
  onCategorySelect?: (category: string) => void;
}

export default function PredictionAnalyticsInsights({
  className = '',
  compact = false,
  onCategorySelect,
}: PredictionAnalyticsInsightsProps) {
  const { data, loading, error, lastUpdated, getMarketSentiment, getCategoryTrendStatus } =
    usePredictionAnalytics();
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends' | 'categories'>('overview');

  if (loading) {
    return (
      <div className={`bg-surface border border-border rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-muted rounded w-1/4 mb-3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-3/4"></div>
            <div className="h-3 bg-muted rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className={`bg-surface border border-border rounded-lg p-4 ${className}`}>
        <div className="flex items-center text-error">
          <Info className="w-4 h-4 mr-2" />
          <span className="text-sm">Unable to load analytics insights</span>
        </div>
      </div>
    );
  }

  const marketSentiment = getMarketSentiment();
  const sentimentIcon = {
    bullish: <TrendingUp className="w-4 h-4 text-success" />,
    bearish: <TrendingDown className="w-4 h-4 text-error" />,
    neutral: <Chart className="w-4 h-4 text-tertiary" />,
  };

  const sentimentColor = {
    bullish: 'text-success',
    bearish: 'text-error',
    neutral: 'text-tertiary',
  };

  const renderOverviewTab = () => (
    <div className="space-y-4">
      {/* Market Sentiment */}
      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
        <div className="flex items-center">
          {sentimentIcon[marketSentiment]}
          <div className="ml-2">
            <span className="text-sm font-medium text-content">Market Sentiment</span>
            <p className={`text-xs ${sentimentColor[marketSentiment]} capitalize`}>
              {marketSentiment}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-tertiary">Win Rate</p>
          <p className="text-sm font-medium text-content">
            {formatPercentage(data.platformInsights.winRate)}
          </p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 bg-background border border-border rounded-lg">
          <div className="flex items-center">
            <Chart className="w-4 h-4 text-primary mr-2" />
            <span className="text-xs text-tertiary">Active Predictions</span>
          </div>
          <p className="text-lg font-semibold text-content mt-1">
            {data.platformInsights.activePredictions}
          </p>
          <p className="text-xs text-tertiary">
            {formatPercentage(data.platformInsights.resolutionRate)} resolved
          </p>
        </div>

        <div className="p-3 bg-background border border-border rounded-lg">
          <div className="flex items-center">
            <Users className="w-4 h-4 text-primary mr-2" />
            <span className="text-xs text-tertiary">Active Users</span>
          </div>
          <p className="text-lg font-semibold text-content mt-1">
            {data.realtimeActivity.activeUsers}
          </p>
          <p className="text-xs text-tertiary">Last 24h</p>
        </div>
      </div>

      {/* Volume & Activity */}
      <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center">
              <Dollar className="w-4 h-4 text-primary mr-1" />
              <span className="text-sm font-medium text-content">24h Volume</span>
            </div>
            <p className="text-lg font-bold text-primary mt-1">
              {data.realtimeActivity.formattedVolume24h}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-tertiary">New Predictions</p>
            <p className="text-sm font-medium text-content">
              +{data.realtimeActivity.newPredictions}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTrendsTab = () => (
    <div className="space-y-3">
      <div className="flex items-center text-sm text-tertiary mb-2">
        <Bolt className="w-4 h-4 mr-1" />
        <span>Trending Categories</span>
      </div>
      {data.trendingCategories.slice(0, 5).map((trend, index) => (
        <div
          key={trend.category}
          className={`p-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
            onCategorySelect ? 'cursor-pointer' : ''
          }`}
          onClick={() => onCategorySelect?.(trend.category)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs text-tertiary mr-2">#{index + 1}</span>
              <span className="text-sm font-medium text-content">{trend.category}</span>
              {trend.score > 80 && <span className="text-xs ml-2">🔥</span>}
            </div>
            <div className="text-right">
              <p className="text-xs text-tertiary">Score</p>
              <p className="text-sm font-medium text-content">{trend.score.toFixed(1)}</p>
            </div>
          </div>
          <div className="mt-1">
            <div className="w-full bg-muted rounded-full h-1">
              <div
                className="bg-primary h-1 rounded-full transition-all"
                style={{ width: `${Math.min(trend.score, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCategoriesTab = () => (
    <div className="space-y-2">
      {data.categoryInsights.slice(0, 6).map((category) => {
        const trendStatus = getCategoryTrendStatus(category.category);
        const statusIcon = {
          hot: '🔥',
          trending: '📈',
          normal: '➡️',
          cooling: '📉',
        };

        return (
          <div
            key={category.category}
            className={`p-2 rounded-lg border hover:bg-muted/50 transition-colors ${
              onCategorySelect ? 'cursor-pointer' : ''
            }`}
            onClick={() => onCategorySelect?.(category.category)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center">
                  <span className="text-xs mr-1">{statusIcon[trendStatus]}</span>
                  <span className="text-sm font-medium text-content">{category.category}</span>
                </div>
                <p className="text-xs text-tertiary">
                  {category.totalPredictions} predictions • {formatPercentage(category.avgAccuracy)}{' '}
                  accuracy
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-tertiary">Volume</p>
                <p className="text-sm font-medium text-content">{category.formattedVolume}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  if (compact && !isExpanded) {
    return (
      <div className={`bg-surface border border-border rounded-lg ${className}`}>
        <button
          onClick={() => setIsExpanded(true)}
          className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center">
            <Chart className="w-4 h-4 text-primary mr-2" />
            <span className="text-sm font-medium text-content">Market Insights</span>
            {marketSentiment === 'bullish' && <span className="text-xs ml-2 text-success">🚀</span>}
            {marketSentiment === 'bearish' && <span className="text-xs ml-2 text-error">📉</span>}
          </div>
          <ChevronDown className="w-4 h-4 text-tertiary" />
        </button>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-border rounded-lg ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Chart className="w-4 h-4 text-primary mr-2" />
            <h3 className="text-sm font-medium text-content">Market Insights</h3>
          </div>
          {compact && (
            <button onClick={() => setIsExpanded(false)} className="p-1 hover:bg-muted rounded">
              <ChevronUp className="w-4 h-4 text-tertiary" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mt-2 bg-muted rounded-lg p-1">
          {(['overview', 'trends', 'categories'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                activeTab === tab
                  ? 'bg-surface text-primary shadow-sm'
                  : 'text-tertiary hover:text-content'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'trends' && renderTrendsTab()}
        {activeTab === 'categories' && renderCategoriesTab()}
      </div>

      {/* Footer */}
      {lastUpdated && (
        <div className="px-3 py-2 border-t border-border">
          <div className="flex items-center text-xs text-tertiary">
            <Clock className="w-3 h-3 mr-1" />
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
