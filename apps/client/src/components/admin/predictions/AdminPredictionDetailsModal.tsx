import React from 'react';
import { formatMuskBucks } from '../../../utils/formatting';
import type { DetailedPrediction } from '../../../api/admin';

interface AdminPredictionDetailsModalProps {
  prediction: DetailedPrediction & {
    analytics?: {
      totalBets: number;
      totalVolume: number;
      uniqueBettors: number;
      controversyScore: number;
      popularityScore: number;
    };
    bets?: Array<{
      id: number;
      amount: number;
      userId: number;
      userName?: string;
      optionId: number;
      optionLabel?: string;
      createdAt: string;
    }>;
    options?: Array<{
      id: number;
      label: string;
      odds: number;
      betCount?: number;
      totalAmount?: number;
    }>;
    qualityFlags?: {
      isDuplicate: boolean;
      hasOffensiveContent: boolean;
      hasSuspiciousActivity: boolean;
      needsReview: boolean;
    };
  };
  onClose: () => void;
  className?: string;
}

const AdminPredictionDetailsModal: React.FC<AdminPredictionDetailsModalProps> = ({
  prediction,
  onClose,
  className = '',
}) => {
  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return 'No date';
    try {
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = () => {
    if (prediction.resolved) {
      return (
        <span className="px-2 py-1 bg-success/10 text-success text-xs rounded-full">Resolved</span>
      );
    }
    if (prediction.approved) {
      return (
        <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Approved</span>
      );
    }
    return (
      <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded-full">Pending</span>
    );
  };

  const getQualityFlags = () => {
    if (!prediction.qualityFlags) return null;

    const flags = [];
    if (prediction.qualityFlags.isDuplicate) flags.push('Duplicate');
    if (prediction.qualityFlags.hasOffensiveContent) flags.push('Offensive');
    if (prediction.qualityFlags.hasSuspiciousActivity) flags.push('Suspicious');
    if (prediction.qualityFlags.needsReview) flags.push('Needs Review');

    return flags;
  };

  const qualityFlags = getQualityFlags();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className={`bg-surface rounded-lg border border-muted max-w-4xl w-full max-h-[90vh] overflow-hidden ${className}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-content">Prediction Details</h2>
            {getStatusBadge()}
          </div>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-100px)]">
          <div className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Basic Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Title</label>
                      <p className="text-content font-medium">{prediction.title}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">Description</label>
                      <p className="text-content">{prediction.description || 'No description'}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-tertiary">Category</label>
                        <p className="text-content">{prediction.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-tertiary">Type</label>
                        <p className="text-content">{prediction.type}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Creator Information</h3>
                  <div className="space-y-2">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Name</label>
                      <p className="text-content">{prediction.creator?.name || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">Email</label>
                      <p className="text-content">{prediction.creator?.email || 'Unknown'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">User ID</label>
                      <p className="text-content">#{prediction.creatorId}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-3">Timeline</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-tertiary">Created</label>
                      <p className="text-content">{formatDate(prediction.createdAt)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-tertiary">Expires</label>
                      <p className="text-content">{formatDate(prediction.expiresAt)}</p>
                    </div>
                    {prediction.resolved && prediction.resolvedAt && (
                      <div>
                        <label className="text-sm font-medium text-tertiary">Resolved</label>
                        <p className="text-content">{formatDate(prediction.resolvedAt)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quality Flags */}
                {qualityFlags && qualityFlags.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-content mb-3">Quality Flags</h3>
                    <div className="flex flex-wrap gap-2">
                      {qualityFlags.map((flag) => (
                        <span
                          key={flag}
                          className="px-2 py-1 bg-error/10 text-error text-xs rounded-full"
                        >
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics */}
            {prediction.analytics && (
              <div>
                <h3 className="text-lg font-semibold text-content mb-3">Analytics</h3>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-background p-4 rounded-lg border border-muted">
                    <div className="text-sm font-medium text-tertiary">Total Bets</div>
                    <div className="text-xl font-bold text-content">
                      {prediction.analytics.totalBets}
                    </div>
                  </div>
                  <div className="bg-background p-4 rounded-lg border border-muted">
                    <div className="text-sm font-medium text-tertiary">Total Volume</div>
                    <div className="text-xl font-bold text-content">
                      {formatMuskBucks(prediction.analytics.totalVolume)}
                    </div>
                  </div>
                  <div className="bg-background p-4 rounded-lg border border-muted">
                    <div className="text-sm font-medium text-tertiary">Unique Bettors</div>
                    <div className="text-xl font-bold text-content">
                      {prediction.analytics.uniqueBettors}
                    </div>
                  </div>
                  <div className="bg-background p-4 rounded-lg border border-muted">
                    <div className="text-sm font-medium text-tertiary">Controversy Score</div>
                    <div className="text-xl font-bold text-content">
                      {prediction.analytics.controversyScore.toFixed(1)}
                    </div>
                  </div>
                  <div className="bg-background p-4 rounded-lg border border-muted">
                    <div className="text-sm font-medium text-tertiary">Popularity Score</div>
                    <div className="text-xl font-bold text-content">
                      {prediction.analytics.popularityScore}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Prediction Options */}
            {prediction.options && prediction.options.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-content mb-3">Prediction Options</h3>
                <div className="space-y-3">
                  {prediction.options.map((option) => (
                    <div
                      key={option.id}
                      className={`p-4 rounded-lg border ${
                        prediction.winningOptionId === option.id
                          ? 'border-success bg-success/5'
                          : 'border-muted bg-background'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-content">{option.label}</span>
                          {prediction.winningOptionId === option.id && (
                            <span className="px-2 py-1 bg-success text-white text-xs rounded-full">
                              Winner
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-tertiary">
                            {(option as any).betCount || 0} bets •{' '}
                            {formatMuskBucks((option as any).totalAmount || 0)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Bets */}
            {prediction.bets && prediction.bets.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-content mb-3">Recent Bets</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-muted">
                        <th className="text-left py-3 text-tertiary font-medium">Bet ID</th>
                        <th className="text-left py-3 text-tertiary font-medium">User</th>
                        <th className="text-left py-3 text-tertiary font-medium">Option</th>
                        <th className="text-right py-3 text-tertiary font-medium">Amount</th>
                        <th className="text-right py-3 text-tertiary font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prediction.bets.slice(0, 10).map((bet) => (
                        <tr key={bet.id} className="border-b border-muted/50">
                          <td className="py-2 text-content">#{bet.id}</td>
                          <td className="py-2 text-content">
                            {bet.userName || `User #${bet.userId}`}
                          </td>
                          <td className="py-2 text-content">
                            {bet.optionLabel || `Option #${bet.optionId}`}
                          </td>
                          <td className="py-2 text-right text-content font-medium">
                            {formatMuskBucks(bet.amount)}
                          </td>
                          <td className="py-2 text-right text-tertiary">
                            {formatDate(bet.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {prediction.bets.length > 10 && (
                    <div className="text-center py-3 text-tertiary text-sm">
                      Showing 10 of {prediction.bets.length} bets
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-muted bg-background">
          <button
            onClick={onClose}
            className="px-4 py-2 text-tertiary hover:text-content transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminPredictionDetailsModal;
