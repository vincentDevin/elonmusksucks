import React, { useState, useEffect } from 'react';
import { getPredictionDetails } from '../../api/admin';
import type { DetailedPrediction } from '../../api/admin';

interface PredictionPreviewProps {
  predictionId: number;
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: string, predictionId: number, params?: any) => void;
}

const PredictionPreview: React.FC<PredictionPreviewProps> = ({
  predictionId,
  isOpen,
  onClose,
  onAction
}) => {
  const [prediction, setPrediction] = useState<DetailedPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<number | null>(null);
  const [resolutionEvidence, setResolutionEvidence] = useState('');
  const [showResolutionForm, setShowResolutionForm] = useState(false);

  useEffect(() => {
    if (isOpen && predictionId) {
      loadPredictionDetails();
    }
  }, [isOpen, predictionId]);

  const loadPredictionDetails = async () => {
    setLoading(true);
    try {
      const details = await getPredictionDetails(predictionId);
      setPrediction(details);
    } catch (error) {
      console.error('Failed to load prediction details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: string, params?: any) => {
    if (onAction && prediction) {
      onAction(action, prediction.id, params);
      onClose();
    }
  };

  const handleResolve = () => {
    if (selectedOptionId && prediction) {
      handleAction('resolve', {
        winningOptionId: selectedOptionId,
        evidence: resolutionEvidence.trim() || undefined
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Utility function for status colors (keeping for future use)
  // const getStatusColor = (resolved: boolean, approved: boolean) => {
  //   if (resolved) return 'text-primary';
  //   if (approved) return 'text-success';
  //   return 'text-warning';
  // };

  const getQualityFlagColor = (flag: string, value: boolean) => {
    if (!value) return 'text-success';
    switch (flag) {
      case 'needsReview': return 'text-warning';
      case 'hasSuspiciousActivity': return 'text-error';
      case 'hasOffensiveContent': return 'text-error';
      case 'isDuplicate': return 'text-warning';
      default: return 'text-tertiary';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-surface border border-muted rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-muted">
          <h2 className="text-xl font-bold text-content">Prediction Preview</h2>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content p-2 rounded-lg hover:bg-muted transition"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="text-tertiary">Loading prediction details...</div>
          </div>
        ) : prediction ? (
          <div className="p-6 space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-content mb-2">{prediction.title}</h3>
                  <p className="text-content">{prediction.description}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 bg-secondary text-surface rounded-full text-sm">
                    {prediction.category}
                  </span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    prediction.resolved 
                      ? 'bg-primary text-surface' 
                      : prediction.approved 
                        ? 'bg-success text-surface' 
                        : 'bg-warning text-surface'
                  }`}>
                    {prediction.resolved ? 'Resolved' : prediction.approved ? 'Approved' : 'Pending'}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-tertiary">Created:</span>
                    <span className="text-content">{formatDate(prediction.createdAt.toString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tertiary">Expires:</span>
                    <span className="text-content">{formatDate(prediction.expiresAt.toString())}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-tertiary">Creator:</span>
                    <span className="text-content">{prediction.creator?.name || 'Unknown'}</span>
                  </div>
                  {prediction.resolutionData?.resolvedAt && (
                    <div className="flex justify-between">
                      <span className="text-tertiary">Resolved:</span>
                      <span className="text-content">{formatDate(prediction.resolutionData.resolvedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-content">Analytics</h4>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-content">
                      {prediction.analytics?.totalBets || 0}
                    </div>
                    <div className="text-xs text-tertiary">Total Bets</div>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-content">
                      {formatCurrency(prediction.analytics?.totalVolume || 0)}
                    </div>
                    <div className="text-xs text-tertiary">Volume</div>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-content">
                      {prediction.analytics?.uniqueBettors || 0}
                    </div>
                    <div className="text-xs text-tertiary">Unique Bettors</div>
                  </div>
                  
                  <div className="bg-muted p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-content">
                      {Math.round(prediction.analytics?.controversyScore || 0)}%
                    </div>
                    <div className="text-xs text-tertiary">Controversy</div>
                  </div>
                </div>

                {/* Quality Flags */}
                <div>
                  <h5 className="font-medium text-content mb-2">Quality Assessment</h5>
                  <div className="space-y-1 text-sm">
                    {prediction.qualityFlags && Object.entries(prediction.qualityFlags).map(([flag, value]) => (
                      <div key={flag} className="flex justify-between">
                        <span className="text-tertiary capitalize">
                          {flag.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span className={getQualityFlagColor(flag, value)}>
                          {value ? 'Yes' : 'No'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Prediction Options */}
            <div>
              <h4 className="text-lg font-semibold text-content mb-4">Prediction Options</h4>
              <div className="space-y-2">
                {prediction.options?.map((option: any) => (
                  <div
                    key={option.id}
                    className={`p-4 border rounded-lg transition-colors ${
                      prediction.resolutionData?.winningOptionId === option.id
                        ? 'border-success bg-success bg-opacity-10'
                        : selectedOptionId === option.id
                          ? 'border-primary bg-primary bg-opacity-10'
                          : 'border-muted hover:border-accent'
                    }`}
                    onClick={() => !prediction.resolved && setSelectedOptionId(option.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-medium text-content">{option.label}</div>
                        <div className="text-sm text-tertiary">Odds: {option.odds.toFixed(2)}</div>
                      </div>
                      
                      {prediction.resolutionData?.winningOptionId === option.id && (
                        <div className="text-success font-semibold">Winner ✓</div>
                      )}
                      
                      {!prediction.resolved && selectedOptionId === option.id && (
                        <div className="text-primary">Selected</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Resolution Evidence */}
            {prediction.resolutionData?.evidence && (
              <div>
                <h4 className="text-lg font-semibold text-content mb-2">Resolution Evidence</h4>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-content">{prediction.resolutionData.evidence}</p>
                </div>
              </div>
            )}

            {/* Resolution Form */}
            {showResolutionForm && !prediction.resolved && (
              <div className="border-t border-muted pt-6">
                <h4 className="text-lg font-semibold text-content mb-4">Resolve Prediction</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-content mb-2">
                      Select Winning Option
                    </label>
                    <div className="space-y-2">
                      {prediction.options?.map((option: any) => (
                        <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                          <input
                            type="radio"
                            name="winningOption"
                            value={option.id}
                            checked={selectedOptionId === option.id}
                            onChange={() => setSelectedOptionId(option.id)}
                            className="text-primary"
                          />
                          <span className="text-content">{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-content mb-2">
                      Evidence/Reasoning (Optional)
                    </label>
                    <textarea
                      value={resolutionEvidence}
                      onChange={(e) => setResolutionEvidence(e.target.value)}
                      placeholder="Provide evidence or reasoning for this resolution..."
                      className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content h-24 resize-none"
                    />
                  </div>

                  <div className="flex space-x-3">
                    <button
                      onClick={handleResolve}
                      disabled={!selectedOptionId}
                      className="px-4 py-2 bg-primary text-surface rounded-lg disabled:opacity-50 hover:opacity-90 transition"
                    >
                      Resolve Prediction
                    </button>
                    <button
                      onClick={() => setShowResolutionForm(false)}
                      className="px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-muted">
              <div className="flex space-x-3">
                {!prediction.approved && !prediction.resolved && (
                  <>
                    <button
                      onClick={() => handleAction('approve')}
                      className="px-4 py-2 bg-success text-surface rounded-lg hover:opacity-90 transition"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction('reject')}
                      className="px-4 py-2 bg-error text-surface rounded-lg hover:opacity-90 transition"
                    >
                      Reject
                    </button>
                  </>
                )}
                
                {prediction.approved && !prediction.resolved && (
                  <button
                    onClick={() => setShowResolutionForm(true)}
                    className="px-4 py-2 bg-primary text-surface rounded-lg hover:opacity-90 transition"
                  >
                    Resolve Prediction
                  </button>
                )}
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-accent hover:bg-opacity-20 transition"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center p-8">
            <div className="text-error">Failed to load prediction details</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredictionPreview;