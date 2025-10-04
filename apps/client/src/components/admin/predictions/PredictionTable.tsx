import React from 'react';
import type { DetailedPrediction } from '../../../api/admin';
import type { TabType } from './PredictionTabs';
import { formatMuskBucks } from '../../../utils/formatting';

interface PredictionTableProps {
  predictions: DetailedPrediction[];
  selectedPredictions: Set<number>;
  currentTab: TabType;
  onPredictionSelect: (predictionId: number, selected: boolean) => void;
  onPredictionAction: (predictionId: number, action: string) => void;
  onSelectAll: () => void;
  loading?: boolean;
  isLoadingDetails?: boolean;
  className?: string;
}

const PredictionTable: React.FC<PredictionTableProps> = ({
  predictions,
  selectedPredictions,
  currentTab,
  onPredictionSelect,
  onPredictionAction,
  onSelectAll,
  loading = false,
  isLoadingDetails = false, // TODO: Use for details button loading state
  className = '',
}) => {
  // Prevent unused variable warning
  void isLoadingDetails;
  const formatDate = (dateString: string | Date | null | undefined | object) => {
    // Handle null, undefined, or empty values
    if (!dateString) return 'No date';

    // Handle empty objects from API
    if (typeof dateString === 'object' && !(dateString instanceof Date)) {
      return 'No date';
    }

    try {
      const date = new Date(dateString as string | Date);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'approved':
        return 'text-success bg-success/10 border-success/20';
      case 'resolved':
        return 'text-primary bg-primary/10 border-primary/20';
      case 'rejected':
        return 'text-error bg-error/10 border-error/20';
      default:
        return 'text-tertiary bg-muted border-muted';
    }
  };

  const getEngagementLevel = (score: number, type: 'controversy' | 'popularity') => {
    if (score > 70) return { level: type === 'controversy' ? 'High' : 'Hot', color: 'text-error' };
    if (score > 40)
      return { level: type === 'controversy' ? 'Medium' : 'Popular', color: 'text-warning' };
    return { level: type === 'controversy' ? 'Low' : 'Quiet', color: 'text-success' };
  };

  const currentStatus = (prediction: DetailedPrediction) => {
    if (prediction.resolved) return 'resolved';
    if (prediction.approved) return 'approved';
    if (!prediction.approved && currentTab === 'rejected') return 'rejected';
    return 'pending';
  };

  return (
    <div className={`bg-surface rounded-lg border border-muted overflow-hidden ${className}`}>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/30 border-b border-muted">
              <tr>
                <th className="w-12 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={
                      predictions.length > 0 && selectedPredictions.size === predictions.length
                    }
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-muted focus:ring-primary focus:ring-2"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Prediction
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Creator
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Analytics
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Engagement
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-content uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-muted/50">
              {predictions.map((prediction) => {
                const isSelected = selectedPredictions.has(prediction.id);
                const status = currentStatus(prediction);
                const controversy = getEngagementLevel(
                  prediction.analytics?.controversyScore || 0,
                  'controversy',
                );
                const popularity = getEngagementLevel(
                  prediction.analytics?.popularityScore || 0,
                  'popularity',
                );

                return (
                  <tr
                    key={prediction.id}
                    className={`hover:bg-background/50 transition-colors ${
                      isSelected ? 'bg-primary/5 ring-1 ring-primary/20' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onPredictionSelect(prediction.id, e.target.checked)}
                        className="w-4 h-4 rounded border-muted focus:ring-primary focus:ring-2"
                      />
                    </td>

                    {/* Prediction Info */}
                    <td className="px-4 py-3">
                      <div className="max-w-sm">
                        <div className="font-medium text-content truncate mb-1">
                          {prediction.title}
                        </div>
                        <div className="text-xs text-tertiary truncate mb-2">
                          {prediction.description}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-secondary/20 text-secondary rounded-full">
                            Category {prediction.categoryId || 'N/A'}
                          </span>
                          {prediction.qualityFlags?.needsReview && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-warning/20 text-warning rounded-full">
                              Needs Review
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Creator */}
                    <td className="px-4 py-3">
                      <div className="text-sm text-content font-medium">
                        {prediction.creator?.name || 'Unknown'}
                      </div>
                      <div className="text-xs text-tertiary">
                        {formatDate(prediction.createdAt)}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </td>

                    {/* Analytics */}
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-tertiary">Bets:</span>
                          <span className="font-medium text-content">
                            {prediction.analytics?.totalBets || 0}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-tertiary">Volume:</span>
                          <span className="font-medium text-content">
                            {formatMuskBucks(prediction.analytics?.totalVolume || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-tertiary">Bettors:</span>
                          <span className="font-medium text-content">
                            {prediction.analytics?.uniqueBettors || 0}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Engagement */}
                    <td className="px-4 py-3">
                      <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                          <span className="text-tertiary">Controversy:</span>
                          <span className={`font-medium ${controversy.color}`}>
                            {controversy.level}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-tertiary">Interest:</span>
                          <span className={`font-medium ${popularity.color}`}>
                            {popularity.level}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {currentTab === 'pending' && (
                          <>
                            <button
                              onClick={() => onPredictionAction(prediction.id, 'approve')}
                              className="p-1.5 text-success hover:bg-success hover:text-white rounded transition-colors"
                              title="Approve"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => onPredictionAction(prediction.id, 'reject')}
                              className="p-1.5 text-error hover:bg-error hover:text-white rounded transition-colors"
                              title="Reject"
                            >
                              ✗
                            </button>
                          </>
                        )}
                        {currentTab === 'approved' && (
                          <button
                            onClick={() => onPredictionAction(prediction.id, 'resolve')}
                            className="p-1.5 text-primary hover:bg-primary hover:text-white rounded transition-colors"
                            title="Resolve"
                          >
                            ⚡
                          </button>
                        )}
                        <button
                          onClick={() => onPredictionAction(prediction.id, 'details')}
                          className="p-1.5 text-tertiary hover:text-content hover:bg-muted rounded transition-colors"
                          title="View Details"
                        >
                          👁
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3 p-4">
        {predictions.map((prediction) => {
          const isSelected = selectedPredictions.has(prediction.id);
          const status = currentStatus(prediction);
          const controversy = getEngagementLevel(
            prediction.analytics?.controversyScore || 0,
            'controversy',
          );
          const popularity = getEngagementLevel(
            prediction.analytics?.popularityScore || 0,
            'popularity',
          );

          return (
            <div
              key={prediction.id}
              className={`p-4 rounded-lg border transition-all ${
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-muted bg-surface hover:border-primary/30'
              }`}
            >
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onPredictionSelect(prediction.id, e.target.checked)}
                  className="mt-1 w-4 h-4 rounded border-muted focus:ring-primary focus:ring-2"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-content mb-1 line-clamp-2">{prediction.title}</h3>
                  <p className="text-sm text-tertiary mb-2 line-clamp-2">
                    {prediction.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-secondary/20 text-secondary rounded-full">
                      Category {prediction.categoryId || 'N/A'}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(status)}`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                    {prediction.qualityFlags?.needsReview && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-warning/20 text-warning rounded-full">
                        Needs Review
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-3 text-sm">
                <div>
                  <div className="text-tertiary text-xs">Creator</div>
                  <div className="font-medium text-content">
                    {prediction.creator?.name || 'Unknown'}
                  </div>
                  <div className="text-xs text-tertiary">{formatDate(prediction.createdAt)}</div>
                </div>
                <div>
                  <div className="text-tertiary text-xs">Analytics</div>
                  <div className="font-medium text-content">
                    {prediction.analytics?.totalBets || 0} bets
                  </div>
                  <div className="text-xs text-tertiary">
                    {formatMuskBucks(prediction.analytics?.totalVolume || 0)} volume
                  </div>
                </div>
              </div>

              {/* Engagement */}
              <div className="flex items-center justify-between mb-3 text-sm">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-tertiary text-xs">Controversy: </span>
                    <span className={`font-medium ${controversy.color}`}>{controversy.level}</span>
                  </div>
                  <div>
                    <span className="text-tertiary text-xs">Interest: </span>
                    <span className={`font-medium ${popularity.color}`}>{popularity.level}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-muted">
                {currentTab === 'pending' && (
                  <>
                    <button
                      onClick={() => onPredictionAction(prediction.id, 'approve')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-success hover:bg-success hover:text-white rounded transition-colors"
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => onPredictionAction(prediction.id, 'reject')}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-error hover:bg-error hover:text-white rounded transition-colors"
                    >
                      ✗ Reject
                    </button>
                  </>
                )}
                {currentTab === 'approved' && (
                  <button
                    onClick={() => onPredictionAction(prediction.id, 'resolve')}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-primary hover:bg-primary hover:text-white rounded transition-colors"
                  >
                    ⚡ Resolve
                  </button>
                )}
                <button
                  onClick={() => onPredictionAction(prediction.id, 'details')}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm text-tertiary hover:text-content hover:bg-muted rounded transition-colors"
                >
                  👁 Details
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {predictions.length === 0 && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-medium text-content mb-2">
            {loading ? 'Loading predictions...' : 'No predictions found'}
          </div>
          <div className="text-sm text-tertiary">
            {loading
              ? 'Please wait while we fetch the data.'
              : 'Try adjusting your filters to see more results.'}
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionTable;
