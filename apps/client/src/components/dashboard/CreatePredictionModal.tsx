// apps/client/src/components/dashboard/CreatePredictionModal.tsx
import { useState, useEffect } from 'react';
import CreatePredictionForm from '../CreatePredictionForm';
import { createPrediction } from '../../api/predictions';
import { useAuth } from '../../hooks/useAuth';
import api from '../../api/axios';
import type { PredictionFull } from '@ems/types';

interface CreatePredictionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceData?: {
    type: 'article' | 'tweet';
    id: string;
    title: string;
    url: string;
    publisher: string;
  } | null;
}

export default function CreatePredictionModal({
  isOpen,
  onClose,
  sourceData,
}: CreatePredictionModalProps) {
  const { user, accessToken } = useAuth();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prediction templates for quick creation
  const templates = [
    {
      id: 'custom',
      name: 'Custom Prediction',
      icon: '✨',
      description: 'Create a completely custom prediction',
      category: 'Custom',
      action: () => setShowForm(true),
    },
    {
      id: 'sports',
      name: 'Sports Event',
      icon: '⚽',
      description: 'Predict the outcome of a sporting event',
      category: 'Sports',
      action: () => setShowForm(true),
    },
    {
      id: 'politics',
      name: 'Political Event',
      icon: '🗳️',
      description: 'Predict political outcomes and elections',
      category: 'Politics',
      action: () => setShowForm(true),
    },
    {
      id: 'tech',
      name: 'Tech Announcement',
      icon: '📱',
      description: 'Predict technology releases and announcements',
      category: 'Technology',
      action: () => setShowForm(true),
    },
    {
      id: 'entertainment',
      name: 'Entertainment',
      icon: '🎬',
      description: 'Predict entertainment industry outcomes',
      category: 'Entertainment',
      action: () => setShowForm(true),
    },
    {
      id: 'finance',
      name: 'Financial Market',
      icon: '📈',
      description: 'Predict stock prices and market movements',
      category: 'Finance',
      action: () => setShowForm(true),
    },
    {
      id: 'weather',
      name: 'Weather Event',
      icon: '🌤️',
      description: 'Predict weather patterns and events',
      category: 'Weather',
      action: () => setShowForm(true),
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: '📱',
      description: 'Predict social media trends and viral content',
      category: 'Social',
      action: () => setShowForm(true),
    },
  ];

  const handleTemplateSelect = (template: (typeof templates)[0]) => {
    setSelectedTemplate(template.id);
    // Small delay for visual feedback
    setTimeout(() => {
      template.action();
    }, 200);
  };

  const handleCreatePrediction = async (payload: any) => {
    try {
      setCreating(true);
      setError(null);

      console.log('Creating prediction with payload:', payload);
      const newPrediction = await createPrediction(payload);
      console.log('Prediction created successfully:', newPrediction);

      // If we have source data, link it to the prediction
      if (sourceData) {
        if (!user || !accessToken) {
          console.error('User not authenticated for source linking');
          setError(
            'Prediction created successfully, but failed to link source: User not authenticated',
          );
          return;
        }

        try {
          const linkData = {
            predictionId: newPrediction.id,
            articleId: sourceData.type === 'article' ? parseInt(sourceData.id) : undefined,
            tweetId: sourceData.type === 'tweet' ? sourceData.id : undefined,
            url: sourceData.url,
            title: sourceData.title,
            publisher: sourceData.publisher,
          };

          console.log('Linking source to prediction:', linkData);
          console.log('Current user:', user);
          console.log('Access token exists:', !!accessToken);
          console.log('Access token in localStorage:', !!localStorage.getItem('accessToken'));

          const response = await api.post('/api/predictions/source-links', linkData);
          console.log('Source link created successfully:', response.data);
        } catch (linkError) {
          console.error('Failed to link source to prediction:', linkError);
          if (linkError.response) {
            console.error('Response status:', linkError.response.status);
            console.error('Response data:', linkError.response.data);
          }
          // Don't fail the creation if linking fails - show error but continue
          setError(
            `Prediction created successfully, but failed to link source: ${linkError.response?.data?.error || linkError.message}`,
          );
          return; // Don't close modal if there's an error
        }
      }

      // Success - close modal
      handleClose();
    } catch (err) {
      console.error('Failed to create prediction:', err);
      setError(err instanceof Error ? err.message : 'Failed to create prediction');
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setShowForm(false);
    setSelectedTemplate(null);
    setError(null);
    setCreating(false);
    onClose();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedTemplate(null);
      setShowForm(false);
      setError(null);
      setCreating(false);
    }
  }, [isOpen]);

  // If we have source data, automatically show the form
  useEffect(() => {
    if (isOpen && sourceData) {
      setShowForm(true);
    }
  }, [isOpen, sourceData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
      <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        {showForm ? (
          // Show the prediction creation form
          <div className="max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-content flex items-center">
                    <span className="mr-2">📊</span>
                    Create Prediction
                    {sourceData && (
                      <span className="ml-2 text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        With Source
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-tertiary mt-1">
                    {sourceData
                      ? 'Creating prediction based on article source'
                      : 'Fill out the details for your prediction'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-tertiary hover:text-content transition-colors text-sm"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-tertiary hover:text-content transition-colors text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-danger/10 text-danger border-b border-danger/20">{error}</div>
            )}

            <div className="p-6">
              <CreatePredictionForm
                onCreated={handleCreatePrediction}
                onCancel={handleClose}
                sourceData={sourceData}
                disabled={creating}
              />
            </div>
          </div>
        ) : (
          // Show template selection
          <>
            <div className="p-6 border-b border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-content flex items-center">
                    <span className="mr-2">📊</span>
                    Create Prediction
                  </h2>
                  <p className="text-sm text-tertiary mt-1">
                    Choose a template to get started quickly
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="text-tertiary hover:text-content transition-colors text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-96">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={selectedTemplate === template.id}
                    className={`p-4 border rounded-xl transition-all duration-200 text-left hover:scale-[1.02] ${
                      selectedTemplate === template.id
                        ? 'border-primary bg-primary/10 scale-[1.02]'
                        : 'border-muted bg-background/50 hover:border-primary/50 hover:bg-background'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="text-2xl">{template.icon}</span>
                      <div>
                        <h3 className="font-semibold text-content">{template.name}</h3>
                        <span className="text-xs text-tertiary px-2 py-1 bg-muted rounded-full">
                          {template.category}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-tertiary leading-relaxed">{template.description}</p>

                    {selectedTemplate === template.id && (
                      <div className="mt-3 flex items-center text-primary text-sm font-medium">
                        <span className="animate-spin mr-2">⏳</span>
                        Opening...
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {/* Quick Tips */}
              <div className="mt-8 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                <h4 className="font-semibold text-content mb-2 flex items-center">
                  <span className="mr-2">💡</span>
                  Quick Tips for Creating Great Predictions
                </h4>
                <ul className="text-sm text-tertiary space-y-1">
                  <li>• Be specific with your prediction question and timeline</li>
                  <li>• Choose clear, unambiguous options for betting</li>
                  <li>• Set a reasonable expiration date for resolution</li>
                  <li>• Include context and sources when possible</li>
                  <li>• Consider what information will be available to resolve the prediction</li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-muted bg-background/30">
              <div className="flex items-center justify-between">
                <div className="text-sm text-tertiary">
                  💎 Pro tip: Well-crafted predictions get more engagement and betting volume
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-tertiary transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Custom Prediction
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
