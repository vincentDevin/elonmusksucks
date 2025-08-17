import React, { useState, useEffect } from 'react';
import {
  getPredictiveAnalytics,
  type PredictiveAnalytics as PredictiveData,
  type AnalyticsParams,
} from '../../api/admin';

interface RiskIndicatorProps {
  probability: number;
  size?: 'small' | 'medium' | 'large';
}

const RiskIndicator: React.FC<RiskIndicatorProps> = ({ probability, size = 'medium' }) => {
  const getRiskColor = (prob: number) => {
    if (prob >= 0.7) return 'text-red-600 bg-red-100';
    if (prob >= 0.4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getRiskLabel = (prob: number) => {
    if (prob >= 0.7) return 'High Risk';
    if (prob >= 0.4) return 'Medium Risk';
    return 'Low Risk';
  };

  const sizeClasses = {
    small: 'px-2 py-1 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-2 text-base',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${getRiskColor(probability)} ${sizeClasses[size]}`}
    >
      {getRiskLabel(probability)} ({(probability * 100).toFixed(0)}%)
    </span>
  );
};

interface TrendCardProps {
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

const TrendCard: React.FC<TrendCardProps> = ({ title, value, unit, trend, description }) => {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    stable: 'text-gray-600',
  };

  const trendIcons = {
    up: '↗',
    down: '↘',
    stable: '→',
  };

  return (
    <div className="bg-surface rounded-lg p-6 border border-muted">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-content">{title}</h3>
        <span className={`text-2xl ${trendColors[trend]}`}>{trendIcons[trend]}</span>
      </div>
      <p className="text-3xl font-bold text-primary mb-1">
        {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(1) : value}
        {unit}
      </p>
      <p className="text-sm text-tertiary">{description}</p>
    </div>
  );
};

interface ForecastLineProps {
  data: Array<{
    date: string;
    predictedUsers: number;
    predictedRevenue: number;
    confidence: number;
  }>;
  metric: 'users' | 'revenue';
}

const ForecastLine: React.FC<ForecastLineProps> = ({ data, metric }) => {
  const maxValue = Math.max(
    ...data.map((d) => (metric === 'users' ? d.predictedUsers : d.predictedRevenue)),
  );
  const minConfidence = Math.min(...data.map((d) => d.confidence));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-content capitalize">{metric} Forecast</h4>
        <div className="text-xs text-tertiary">
          Confidence: {(minConfidence * 100).toFixed(0)}% -{' '}
          {(Math.max(...data.map((d) => d.confidence)) * 100).toFixed(0)}%
        </div>
      </div>

      <div className="relative h-32 flex items-end space-x-1">
        {data.slice(0, 14).map((point, index) => {
          const value = metric === 'users' ? point.predictedUsers : point.predictedRevenue;
          const height = (value / maxValue) * 100;
          const opacity = point.confidence;

          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-primary rounded-t"
                style={{
                  height: `${height}%`,
                  opacity: opacity,
                }}
                title={`${new Date(point.date).toLocaleDateString()}: ${value.toLocaleString()} (${(point.confidence * 100).toFixed(0)}% confidence)`}
              />
            </div>
          );
        })}
      </div>

      <div className="flex justify-between text-xs text-tertiary">
        <span>Today</span>
        <span>+14 days</span>
      </div>
    </div>
  );
};

const PredictiveAnalytics: React.FC = () => {
  const [predictiveData, setPredictiveData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'churn' | 'forecast' | 'trends'>('churn');

  const loadPredictiveData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: AnalyticsParams = {
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
      };

      const data = await getPredictiveAnalytics(params);
      setPredictiveData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load predictive analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPredictiveData();
  }, []);

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
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading predictive analytics</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <button
              onClick={loadPredictiveData}
              className="mt-2 text-sm text-red-800 underline hover:text-red-900"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!predictiveData) {
    return <div className="text-center text-tertiary">No predictive analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-content">Predictive Analytics</h2>
        <p className="text-tertiary mt-1">
          AI-powered insights and forecasting for proactive decision making
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-muted">
        <nav className="flex space-x-8">
          {[
            { key: 'churn', label: 'Churn Prediction', icon: '⚠️' },
            { key: 'forecast', label: 'Engagement Forecast', icon: '📈' },
            { key: 'trends', label: 'Market Trends', icon: '🔍' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSelectedTab(tab.key as any)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition ${
                selectedTab === tab.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-tertiary hover:text-content hover:border-muted'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Churn Prediction Tab */}
      {selectedTab === 'churn' && (
        <div className="space-y-6">
          <div className="bg-surface rounded-lg p-6 border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">User Churn Risk Analysis</h3>
            <p className="text-tertiary mb-6">
              {predictiveData.userChurnPrediction.length} users identified as at-risk for churning
            </p>

            <div className="space-y-4">
              {predictiveData.userChurnPrediction.slice(0, 10).map((user) => (
                <div key={user.userId} className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-content">{user.userName}</h4>
                      <p className="text-sm text-tertiary">User ID: {user.userId}</p>
                    </div>
                    <RiskIndicator probability={user.churnProbability} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h5 className="text-sm font-medium text-content mb-2">Risk Factors</h5>
                      <ul className="text-sm text-tertiary space-y-1">
                        {user.riskFactors.map((factor, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-red-400 rounded-full mr-2"></span>
                            {factor}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-content mb-2">Recommendations</h5>
                      <ul className="text-sm text-tertiary space-y-1">
                        {user.recommendations.map((rec, index) => (
                          <li key={index} className="flex items-center">
                            <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {predictiveData.userChurnPrediction.length > 10 && (
              <div className="text-center mt-4">
                <p className="text-sm text-tertiary">
                  Showing top 10 at-risk users. {predictiveData.userChurnPrediction.length - 10}{' '}
                  more users in full report.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Engagement Forecast Tab */}
      {selectedTab === 'forecast' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface rounded-lg p-6 border border-muted">
              <ForecastLine data={predictiveData.engagementForecasting} metric="users" />
            </div>

            <div className="bg-surface rounded-lg p-6 border border-muted">
              <ForecastLine data={predictiveData.engagementForecasting} metric="revenue" />
            </div>
          </div>

          <div className="bg-surface rounded-lg p-6 border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">14-Day Forecast Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-content mb-2">Predicted Users</h4>
                <p className="text-2xl font-bold text-primary">
                  {predictiveData.engagementForecasting[13]?.predictedUsers.toLocaleString()}
                </p>
                <p className="text-sm text-tertiary">in 14 days</p>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-content mb-2">Predicted Revenue</h4>
                <p className="text-2xl font-bold text-primary">
                  ${predictiveData.engagementForecasting[13]?.predictedRevenue.toLocaleString()}
                </p>
                <p className="text-sm text-tertiary">in 14 days</p>
              </div>

              <div className="text-center p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-content mb-2">Confidence Level</h4>
                <p className="text-2xl font-bold text-primary">
                  {(predictiveData.engagementForecasting[13]?.confidence * 100).toFixed(0)}%
                </p>
                <p className="text-sm text-tertiary">forecast accuracy</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Market Trends Tab */}
      {selectedTab === 'trends' && (
        <div className="space-y-6">
          {/* Emerging Categories */}
          <div className="bg-surface rounded-lg p-6 border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Emerging Categories</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {predictiveData.trendAnalysis.emergingCategories.map((category, index) => (
                <TrendCard
                  key={index}
                  title={category.category}
                  value={category.growthRate}
                  unit="%"
                  trend={
                    category.growthRate > 0 ? 'up' : category.growthRate < 0 ? 'down' : 'stable'
                  }
                  description={`Growth rate with ${category.potential}/10 potential`}
                />
              ))}
            </div>
          </div>

          {/* Seasonal Patterns */}
          <div className="bg-surface rounded-lg p-6 border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Seasonal Patterns</h3>
            <div className="space-y-4">
              {predictiveData.trendAnalysis.seasonalPatterns.map((pattern, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div>
                    <h4 className="font-medium text-content">{pattern.period}</h4>
                    <p className="text-sm text-tertiary capitalize">
                      {pattern.trend} trend observed
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-bold ${pattern.impact > 0 ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {pattern.impact > 0 ? '+' : ''}
                      {pattern.impact.toFixed(1)}%
                    </p>
                    <p className="text-xs text-tertiary">impact</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Market Sentiment */}
          <div className="bg-surface rounded-lg p-6 border border-muted">
            <h3 className="text-lg font-semibold text-content mb-4">Market Sentiment Analysis</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-center mb-4">
                  <p className="text-4xl font-bold text-primary mb-2">
                    {predictiveData.trendAnalysis.marketSentiment.score}/10
                  </p>
                  <p className="text-sm text-tertiary">Overall Market Sentiment</p>
                </div>
                <div className="w-full bg-muted rounded-full h-4">
                  <div
                    className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-4 rounded-full"
                    style={{
                      width: `${(predictiveData.trendAnalysis.marketSentiment.score / 10) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div>
                <h4 className="font-medium text-content mb-3">Contributing Factors</h4>
                <ul className="space-y-2">
                  {predictiveData.trendAnalysis.marketSentiment.factors.map((factor, index) => (
                    <li key={index} className="flex items-center text-sm text-tertiary">
                      <span className="w-2 h-2 bg-primary rounded-full mr-3"></span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={loadPredictiveData}
          disabled={loading}
          className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {loading ? 'Refreshing...' : 'Refresh Predictions'}
        </button>
      </div>
    </div>
  );
};

export default PredictiveAnalytics;
