import React, { useState, useEffect } from 'react';
import { searchPredictions } from '../../api/admin';
import type { PaginatedPredictions, PredictionSearchParams } from '../../api/admin';

interface PredictionAnalyticsProps {
  className?: string;
}

interface AnalyticsData {
  totalPredictions: number;
  totalVolume: number;
  averageResolutionTime: number;
  categoryDistribution: Record<string, number>;
  statusDistribution: {
    pending: number;
    approved: number;
    resolved: number;
    rejected: number;
  };
  popularityTrends: Array<{
    category: string;
    averagePopularity: number;
  }>;
  controversyAnalysis: Array<{
    category: string;
    averageControversy: number;
  }>;
  volumeTrends: Array<{
    date: string;
    volume: number;
    count: number;
  }>;
}

const PredictionAnalytics: React.FC<PredictionAnalyticsProps> = ({ className = '' }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const categories = ['Politics', 'Sports', 'Technology', 'Entertainment', 'Economics', 'Science'];

  useEffect(() => {
    loadAnalytics();
  }, [selectedTimeRange, selectedCategory]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      // Calculate date range
      const now = new Date();
      const dateRange = selectedTimeRange !== 'all' ? {
        start: new Date(now.getTime() - (parseInt(selectedTimeRange) * 24 * 60 * 60 * 1000)),
        end: now
      } : undefined;

      // Fetch all predictions for analytics
      const params: PredictionSearchParams = {
        category: selectedCategory ? [selectedCategory] : undefined,
        startDate: dateRange?.start?.toISOString(),
        endDate: dateRange?.end?.toISOString(),
        page: 0,
        limit: 1000, // Get more for comprehensive analytics
        sortBy: 'createdAt',
        sortOrder: 'desc'
      };

      const results = await searchPredictions(params);
      const analyticsData = processAnalyticsData(results);
      setAnalytics(analyticsData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (data: PaginatedPredictions): AnalyticsData => {
    const predictions = data.predictions;
    
    // Category distribution
    const categoryDistribution: Record<string, number> = {};
    predictions.forEach(p => {
      categoryDistribution[p.category] = (categoryDistribution[p.category] || 0) + 1;
    });

    // Total volume
    const totalVolume = predictions.reduce((sum, p) => sum + (p.analytics?.totalVolume || 0), 0);

    // Popularity trends by category
    const categoryPopularity: Record<string, { total: number; count: number }> = {};
    predictions.forEach(p => {
      if (!categoryPopularity[p.category]) {
        categoryPopularity[p.category] = { total: 0, count: 0 };
      }
      categoryPopularity[p.category].total += p.analytics?.popularityScore || 0;
      categoryPopularity[p.category].count += 1;
    });

    const popularityTrends = Object.entries(categoryPopularity).map(([category, data]) => ({
      category,
      averagePopularity: data.count > 0 ? data.total / data.count : 0
    })).sort((a, b) => b.averagePopularity - a.averagePopularity);

    // Controversy analysis by category
    const categoryControversy: Record<string, { total: number; count: number }> = {};
    predictions.forEach(p => {
      if (!categoryControversy[p.category]) {
        categoryControversy[p.category] = { total: 0, count: 0 };
      }
      categoryControversy[p.category].total += p.analytics?.controversyScore || 0;
      categoryControversy[p.category].count += 1;
    });

    const controversyAnalysis = Object.entries(categoryControversy).map(([category, data]) => ({
      category,
      averageControversy: data.count > 0 ? data.total / data.count : 0
    })).sort((a, b) => b.averageControversy - a.averageControversy);

    // Volume trends (simplified - would need more sophisticated date grouping in real implementation)
    const volumeTrends = predictions
      .slice(0, 10) // Last 10 predictions for trend
      .map(p => ({
        date: new Date(p.createdAt.toString()).toLocaleDateString(),
        volume: p.analytics?.totalVolume || 0,
        count: 1
      }));

    return {
      totalPredictions: predictions.length,
      totalVolume,
      averageResolutionTime: data.analytics?.avgResolutionTime || 0,
      categoryDistribution,
      statusDistribution: {
        pending: data.analytics?.totalPending || 0,
        approved: data.analytics?.totalApproved || 0,
        resolved: data.analytics?.totalResolved || 0,
        rejected: data.analytics?.totalRejected || 0
      },
      popularityTrends,
      controversyAnalysis,
      volumeTrends
    };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getPercentage = (value: number, total: number) => {
    return total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
  };

  const getBarWidth = (value: number, max: number) => {
    return max > 0 ? `${(value / max) * 100}%` : '0%';
  };

  if (loading) {
    return (
      <div className={`bg-surface border border-muted rounded-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-tertiary">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className={`bg-surface border border-muted rounded-lg p-8 ${className}`}>
        <div className="flex items-center justify-center">
          <div className="text-error">Failed to load analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header and Controls */}
      <div className="bg-surface border border-muted rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-content">Prediction Analytics</h2>
            <p className="text-tertiary">Comprehensive insights and performance metrics</p>
          </div>
          
          <div className="flex items-center space-x-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-muted rounded-lg bg-surface text-content"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            
            <select
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value as any)}
              className="px-3 py-2 border border-muted rounded-lg bg-surface text-content"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-content">{analytics.totalPredictions}</div>
            <div className="text-sm text-tertiary">Total Predictions</div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-content">{formatCurrency(analytics.totalVolume)}</div>
            <div className="text-sm text-tertiary">Total Volume</div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-content">{analytics.averageResolutionTime}h</div>
            <div className="text-sm text-tertiary">Avg Resolution</div>
          </div>
          
          <div className="bg-muted p-4 rounded-lg text-center">
            <div className="text-2xl font-bold text-content">
              {getPercentage(analytics.statusDistribution.resolved, analytics.totalPredictions)}%
            </div>
            <div className="text-sm text-tertiary">Resolution Rate</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <div className="bg-surface border border-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold text-content mb-4">Status Distribution</h3>
          
          <div className="space-y-3">
            {Object.entries(analytics.statusDistribution).map(([status, count]) => {
              const percentage = getPercentage(count, analytics.totalPredictions);
              const maxCount = Math.max(...Object.values(analytics.statusDistribution));
              
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="capitalize text-content w-16">{status}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          status === 'pending' ? 'bg-warning' :
                          status === 'approved' ? 'bg-success' :
                          status === 'resolved' ? 'bg-primary' :
                          'bg-error'
                        }`}
                        style={{ width: getBarWidth(count, maxCount) }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm">
                    <span className="text-content font-medium">{count}</span>
                    <span className="text-tertiary">({percentage}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category Distribution */}
        <div className="bg-surface border border-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold text-content mb-4">Category Distribution</h3>
          
          <div className="space-y-3">
            {Object.entries(analytics.categoryDistribution)
              .sort(([,a], [,b]) => b - a)
              .slice(0, 6)
              .map(([category, count]) => {
                const percentage = getPercentage(count, analytics.totalPredictions);
                const maxCount = Math.max(...Object.values(analytics.categoryDistribution));
                
                return (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      <span className="text-content w-20 truncate">{category}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-accent"
                          style={{ width: getBarWidth(count, maxCount) }}
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-content font-medium">{count}</span>
                      <span className="text-tertiary">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Popularity Trends */}
        <div className="bg-surface border border-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold text-content mb-4">Popularity by Category</h3>
          
          <div className="space-y-3">
            {analytics.popularityTrends.slice(0, 5).map(({ category, averagePopularity }) => {
              const maxPopularity = Math.max(...analytics.popularityTrends.map(t => t.averagePopularity));
              
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-content w-20 truncate">{category}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: getBarWidth(averagePopularity, maxPopularity) }}
                      />
                    </div>
                  </div>
                  <span className="text-content font-medium text-sm">
                    {averagePopularity.toFixed(1)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Controversy Analysis */}
        <div className="bg-surface border border-muted rounded-lg p-6">
          <h3 className="text-lg font-semibold text-content mb-4">Controversy by Category</h3>
          
          <div className="space-y-3">
            {analytics.controversyAnalysis.slice(0, 5).map(({ category, averageControversy }) => {
              const maxControversy = Math.max(...analytics.controversyAnalysis.map(c => c.averageControversy));
              
              return (
                <div key={category} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <span className="text-content w-20 truncate">{category}</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          averageControversy > 70 ? 'bg-error' :
                          averageControversy > 40 ? 'bg-warning' :
                          'bg-success'
                        }`}
                        style={{ width: getBarWidth(averageControversy, maxControversy) }}
                      />
                    </div>
                  </div>
                  <span className="text-content font-medium text-sm">
                    {averageControversy.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="bg-surface border border-muted rounded-lg p-6">
        <h3 className="text-lg font-semibold text-content mb-4">Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-success mb-2">
              {analytics.popularityTrends[0]?.category || 'N/A'}
            </div>
            <div className="text-sm text-tertiary">Most Popular Category</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-error mb-2">
              {analytics.controversyAnalysis[0]?.category || 'N/A'}
            </div>
            <div className="text-sm text-tertiary">Most Controversial Category</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-2">
              {Object.entries(analytics.categoryDistribution)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}
            </div>
            <div className="text-sm text-tertiary">Most Active Category</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PredictionAnalytics;