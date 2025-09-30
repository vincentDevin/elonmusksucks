// apps/client/src/components/timeline/UseAsSourceModal.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TimelineItem, PredictionView } from '@ems/types';
import { getPredictions } from '../../api/predictions';
import { useAuth } from '../../contexts/AuthContext';
import BaseModal from '../BaseModal';

interface UseAsSourceModalProps {
  item: TimelineItem | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal for linking articles to predictions
 * Allows users to either:
 * 1. Create a new prediction with this article as a source
 * 2. Link this article to an existing prediction
 */
export const UseAsSourceModal: React.FC<UseAsSourceModalProps> = ({ item, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<'new' | 'existing' | null>(null);
  const [predictions, setPredictions] = useState<PredictionView[]>([]);
  const [selectedPrediction, setSelectedPrediction] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingPredictions, setLoadingPredictions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load existing predictions when user selects "existing" option
  useEffect(() => {
    if (selectedOption === 'existing' && predictions.length === 0) {
      loadPredictions();
    }
  }, [selectedOption]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedOption(null);
      setSelectedPrediction(null);
      setError(null);
    }
  }, [isOpen]);

  const loadPredictions = async () => {
    try {
      setLoadingPredictions(true);
      const data = await getPredictions();
      // Filter to show only active, unresolved predictions
      const activePredictions = data.filter((p) => !p.resolvedAt && p.status === 'ACTIVE');
      setPredictions(activePredictions);
    } catch (err) {
      console.error('Failed to load predictions:', err);
      setError('Failed to load predictions');
    } finally {
      setLoadingPredictions(false);
    }
  };

  const handleCreateNewPrediction = () => {
    if (!item) return;

    // Navigate to dashboard and trigger the create prediction modal
    // This is a temporary solution - ideally we'd have a better state management system
    const articleId = item.id.replace('article-', '');
    const sourceData = {
      type: 'article' as const,
      id: articleId,
      title: item.content.title,
      url: item.content.url || '',
      publisher: item.content.author || 'Unknown',
    };

    // Store source data in localStorage temporarily to pass to dashboard
    localStorage.setItem('pendingPredictionSource', JSON.stringify(sourceData));

    navigate('/dashboard');
    onClose();
  };

  const handleLinkToExisting = async () => {
    if (!item || !selectedPrediction) return;

    try {
      setLoading(true);
      setError(null);

      const articleId = parseInt(item.id.replace('article-', ''));

      // API call to link article to prediction
      const response = await fetch('/api/predictions/source-links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          predictionId: selectedPrediction,
          articleId,
          url: item.content.url,
          title: item.content.title,
          publisher: item.content.author,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to link article: ${response.statusText}`);
      }

      // Success - close modal and maybe show success message
      onClose();
      // Could show a toast notification here
    } catch (err) {
      console.error('Failed to link article:', err);
      setError(err instanceof Error ? err.message : 'Failed to link article');
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (option: 'new' | 'existing') => {
    setSelectedOption(option);
    setError(null);
  };

  if (!isOpen || !item) return null;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Use as Prediction Source"
      icon="📊"
      size="lg"
      headerContent={
        <div className="bg-muted/10 rounded-lg p-3 mt-3">
          <div className="flex items-start space-x-3">
            {item.content.imageUrl && (
              <img
                src={item.content.imageUrl}
                alt=""
                className="w-12 h-12 rounded object-cover flex-shrink-0"
              />
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-content text-sm line-clamp-2">
                {item.content.title}
              </h3>
              <p className="text-xs text-content/60 mt-1">
                {item.content.author} • {new Date(item.timestamp).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      }
    >
      {error && (
        <div className="mb-4 p-3 bg-danger/10 text-danger border border-danger/20 rounded-md text-sm">
          {error}
        </div>
      )}

      {!user && (
        <div className="text-center py-8">
          <p className="text-content/70 mb-4">You need to be logged in to create predictions.</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </button>
        </div>
      )}

      {user && !selectedOption && (
        <div className="space-y-4">
          <p className="text-content/70 text-sm mb-6">
            How would you like to use this article as a prediction source?
          </p>

          <div className="grid gap-4">
            <button
              onClick={() => handleOptionSelect('new')}
              className="p-4 border border-muted rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  ✨
                </div>
                <div>
                  <h3 className="font-semibold text-content">Create New Prediction</h3>
                  <p className="text-sm text-content/60 mt-1">
                    Start a new prediction market based on this article
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => handleOptionSelect('existing')}
              className="p-4 border border-muted rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-start space-x-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center flex-shrink-0">
                  🔗
                </div>
                <div>
                  <h3 className="font-semibold text-content">Link to Existing Prediction</h3>
                  <p className="text-sm text-content/60 mt-1">
                    Add this article as supporting evidence to an existing prediction
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {selectedOption === 'new' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-content/60">
            <button onClick={() => setSelectedOption(null)} className="hover:text-content">
              ← Back
            </button>
          </div>

          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <h3 className="font-semibold text-content mb-2">Create New Prediction</h3>
            <p className="text-sm text-content/70 mb-4">
              You'll be taken to the prediction creation form with this article pre-loaded as a
              source.
            </p>
            <button
              onClick={handleCreateNewPrediction}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue to Create Prediction
            </button>
          </div>
        </div>
      )}

      {selectedOption === 'existing' && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-sm text-content/60">
            <button onClick={() => setSelectedOption(null)} className="hover:text-content">
              ← Back
            </button>
          </div>

          <div>
            <h3 className="font-semibold text-content mb-3">Select Prediction</h3>

            {loadingPredictions ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                <p className="text-sm text-content/60 mt-2">Loading predictions...</p>
              </div>
            ) : predictions.length === 0 ? (
              <div className="text-center py-8 text-content/60">
                <p>No active predictions found.</p>
                <button
                  onClick={handleCreateNewPrediction}
                  className="mt-2 text-primary hover:text-primary/80 text-sm"
                >
                  Create a new prediction instead →
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {predictions.map((prediction) => (
                  <button
                    key={prediction.id}
                    onClick={() => setSelectedPrediction(prediction.id)}
                    className={`w-full p-3 border rounded-lg text-left transition-all ${
                      selectedPrediction === prediction.id
                        ? 'border-primary bg-primary/5'
                        : 'border-muted hover:border-primary/50'
                    }`}
                  >
                    <h4 className="font-medium text-content text-sm line-clamp-1">
                      {prediction.title}
                    </h4>
                    <p className="text-xs text-content/60 mt-1">
                      {prediction.category} • Expires{' '}
                      {new Date(prediction.expiresAt).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {selectedPrediction && (
              <div className="mt-4 pt-4 border-t border-muted">
                <button
                  onClick={handleLinkToExisting}
                  disabled={loading}
                  className={`w-full px-4 py-2 rounded-lg transition-colors ${
                    loading
                      ? 'bg-muted text-content/50 cursor-not-allowed'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90'
                  }`}
                >
                  {loading ? 'Linking...' : 'Link Article to Prediction'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer with tip */}
      <div className="p-4 bg-muted/5 mt-6">
        <p className="text-xs text-content/60">
          💡 Tip: Articles linked to predictions help provide context and evidence for better
          betting decisions
        </p>
      </div>
    </BaseModal>
  );
};

export default UseAsSourceModal;
