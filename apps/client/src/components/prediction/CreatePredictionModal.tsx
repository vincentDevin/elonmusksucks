// apps/client/src/components/prediction/CreatePredictionModal.tsx
import { useState, useEffect } from 'react';
import { PredictionType } from '@ems/types';
import {
  createPrediction,
  getCategories,
  type Category,
  type CreatePredictionPayload,
} from '../../api/predictions';
import { useAuth } from '../../contexts/AuthContext';
import { usePredictionMarket } from '../../contexts/PredictionContext';
import api from '../../api/axios';

/**
 * Global Create Prediction Modal
 * Controlled by PredictionContext state
 * Accessible from anywhere via FloatingCreatePredictionWidget or UseAsSourceModal
 */
export default function CreatePredictionModal() {
  const { user, accessToken } = useAuth();
  const { createModalOpen, createModalSourceData, closeCreateModal } = usePredictionMarket();
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categoryMap, setCategoryMap] = useState<Record<string, number>>({});
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | undefined>();
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Form state (from CreatePredictionForm)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [type, setType] = useState<PredictionType>(PredictionType.MULTIPLE);
  const [threshold, setThreshold] = useState<number | ''>('');
  const [options, setOptions] = useState<string[]>(['']);
  const [categories, setCategories] = useState<Category[]>([]);

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

  // Fetch categories on mount and build category map
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        // Map template category names to category IDs
        const map: Record<string, number> = {};
        cats.forEach((cat: Category) => {
          // Handle both exact matches and variations
          const normalizedName = cat.name.toLowerCase().replace(/\s+/g, '');
          map[normalizedName] = cat.id;
          // Also store with original name for direct lookup
          map[cat.name.toLowerCase()] = cat.id;
        });
        setCategoryMap(map);
        setCategories(cats); // Also set for form dropdown
        setCategoriesLoaded(true);
      } catch (error) {
        console.error('Failed to load categories:', error);
        setCategoriesLoaded(true); // Set to true even on error to unblock UI
      }
    }
    loadCategories();
  }, []);

  const handleTemplateSelect = (template: (typeof templates)[0]) => {
    setSelectedTemplate(template.id);
    // Map template category to category ID
    const normalizedCategory = template.category.toLowerCase().replace(/\s+/g, '');
    const templateCategoryId =
      categoryMap[normalizedCategory] || categoryMap[template.category.toLowerCase()];
    setSelectedCategoryId(templateCategoryId);
    // Also set the form category
    if (templateCategoryId) {
      setCategoryId(templateCategoryId);
    }
    // Small delay for visual feedback
    setTimeout(() => {
      template.action();
    }, 200);
  };

  // Form helper functions
  const isBinary = type === PredictionType.BINARY;
  const isOU = type === PredictionType.OVER_UNDER;
  const isMultiple = type === PredictionType.MULTIPLE;

  // Validate that expiration date is in the future
  const isExpirationValid = expiresAt && new Date(expiresAt) > new Date();

  const canSubmit =
    Boolean(title) &&
    Boolean(description) &&
    typeof categoryId === 'number' &&
    Boolean(expiresAt) &&
    isExpirationValid &&
    ((isMultiple && options.every((o) => o.trim().length > 0)) ||
      isBinary ||
      (isOU && threshold !== ''));

  const addOption = () => setOptions((prev) => [...prev, '']);
  const updateOption = (idx: number, value: string) =>
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const removeOption = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  const handleCreatePrediction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    try {
      setCreating(true);
      setError(null);

      const payload: CreatePredictionPayload = {
        title,
        description,
        categoryId: typeof categoryId === 'number' ? categoryId : Number(categoryId),
        expiresAt: new Date(expiresAt),
        type,
        threshold: isOU ? Number(threshold) : undefined,
        options: isMultiple ? options.map((label) => ({ label })) : undefined,
      };

      console.log('Creating prediction with payload:', payload);
      const newPrediction = await createPrediction(payload);
      console.log('Prediction created successfully:', newPrediction);

      // If we have source data, link it to the prediction
      if (createModalSourceData) {
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
            articleId:
              createModalSourceData.type === 'article'
                ? parseInt(createModalSourceData.id)
                : undefined,
            tweetId: createModalSourceData.type === 'tweet' ? createModalSourceData.id : undefined,
            url: createModalSourceData.url,
            title: createModalSourceData.title,
            publisher: createModalSourceData.publisher,
          };

          console.log('Linking source to prediction:', linkData);
          console.log('Current user:', user);
          console.log('Access token exists:', !!accessToken);
          console.log('Access token in localStorage:', !!localStorage.getItem('accessToken'));

          const response = await api.post('/api/predictions/source-links', linkData);
          console.log('Source link created successfully:', response.data);
        } catch (linkError: any) {
          console.error('Failed to link source to prediction:', linkError);
          if (linkError?.response) {
            console.error('Response status:', linkError.response.status);
            console.error('Response data:', linkError.response.data);
          }
          // Don't fail the creation if linking fails - show error but continue
          setError(
            `Prediction created successfully, but failed to link source: ${linkError?.response?.data?.error || linkError?.message}`,
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
    // Reset form state
    setTitle('');
    setDescription('');
    setCategoryId('');
    setExpiresAt('');
    setType(PredictionType.MULTIPLE);
    setThreshold('');
    setOptions(['']);
    closeCreateModal();
  };

  // Reset state when modal closes
  useEffect(() => {
    if (!createModalOpen) {
      setSelectedTemplate(null);
      setShowForm(false);
      setError(null);
      setCreating(false);
      // Reset form state
      setTitle('');
      setDescription('');
      setCategoryId('');
      setExpiresAt('');
      setType(PredictionType.MULTIPLE);
      setThreshold('');
      setOptions(['']);
    }
  }, [createModalOpen]);

  // If we have source data, automatically show the form (wait for categories to load)
  useEffect(() => {
    if (createModalOpen && createModalSourceData && categoriesLoaded) {
      setShowForm(true);
    }
  }, [createModalOpen, createModalSourceData, categoriesLoaded]);

  // Pre-populate title when source data is available
  useEffect(() => {
    if (createModalSourceData && createModalSourceData.title && !title) {
      // Suggest a prediction title based on the article
      setTitle(`Will ${createModalSourceData.title.split(' ').slice(0, 8).join(' ')}...?`);
    }
  }, [createModalSourceData, title]);

  // Set default category ID when provided
  useEffect(() => {
    if (selectedCategoryId && categoryId === '') {
      setCategoryId(selectedCategoryId);
    }
  }, [selectedCategoryId, categoryId]);

  if (!createModalOpen) return null;

  // Show loading state while categories are loading (when opening with source data)
  if (createModalSourceData && !categoriesLoaded) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
        <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-md w-full p-8">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
            <p className="text-content font-medium">Loading prediction categories...</p>
            <p className="text-tertiary text-sm mt-2">Preparing form with source data</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[90]">
      <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {showForm ? (
          // Show the prediction creation form
          <div className="max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-muted">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-content flex items-center">
                    <span className="mr-2">📊</span>
                    Create Prediction
                    {createModalSourceData && (
                      <span className="ml-2 text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                        With Source
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-tertiary mt-1">
                    {createModalSourceData
                      ? 'Creating prediction based on article source'
                      : 'Fill out the details for your prediction'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-tertiary hover:text-content transition-colors text-sm cursor-pointer"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={handleClose}
                    className="text-tertiary hover:text-content transition-colors text-2xl cursor-pointer"
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
              <form onSubmit={handleCreatePrediction} className="space-y-6">
                {/* Source Information */}
                {createModalSourceData && (
                  <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-content flex items-center">
                        <span className="mr-2">📰</span>
                        Prediction Source
                      </h3>
                    </div>
                    <div className="bg-background/50 rounded p-3">
                      <h4 className="font-medium text-content text-sm line-clamp-2">
                        {createModalSourceData.title}
                      </h4>
                      <p className="text-xs text-content/60 mt-1">
                        {createModalSourceData.publisher} •{' '}
                        {createModalSourceData.type === 'article' ? 'Article' : 'Tweet'}
                      </p>
                      {createModalSourceData.url && (
                        <a
                          href={createModalSourceData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:text-primary/80 mt-1 inline-block cursor-pointer"
                        >
                          View Original →
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-content/60 mt-2">
                      This source will be automatically linked to your prediction as supporting
                      evidence.
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="title" className="block mb-1 text-sm">
                      Title
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label htmlFor="categoryId" className="block mb-1 text-sm">
                      Category
                    </label>
                    <select
                      id="categoryId"
                      value={categoryId}
                      onChange={(e) =>
                        setCategoryId(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                      disabled={creating || !categoriesLoaded}
                    >
                      <option value="">
                        {!categoriesLoaded ? 'Loading categories...' : 'Select a category'}
                      </option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.name}
                        </option>
                      ))}
                    </select>
                    {categoriesLoaded && categories.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">
                        No categories available. Please contact an administrator.
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="description" className="block mb-1 text-sm">
                      Terms of Prediction
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                      disabled={creating}
                    />
                  </div>

                  <div>
                    <label htmlFor="expiresAt" className="block mb-1 text-sm">
                      Expires At
                    </label>
                    <input
                      id="expiresAt"
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer ${expiresAt && !isExpirationValid ? 'border-red-500 focus:ring-red-500' : ''}`}
                      disabled={creating}
                    />
                    {expiresAt && !isExpirationValid && (
                      <p className="text-red-500 text-xs mt-1">
                        Expiration date must be in the future
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="type" className="block mb-1 text-sm">
                      Prediction Type
                    </label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value as PredictionType)}
                      className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                      disabled={creating}
                    >
                      <option value={PredictionType.MULTIPLE}>Multiple choice</option>
                      <option value={PredictionType.BINARY}>Yes / No</option>
                      <option value={PredictionType.OVER_UNDER}>Over / Under</option>
                    </select>
                  </div>

                  {isOU && (
                    <div>
                      <label htmlFor="threshold" className="block mb-1 text-sm">
                        Threshold
                      </label>
                      <input
                        id="threshold"
                        type="number"
                        placeholder="e.g. 100"
                        value={threshold}
                        onChange={(e) =>
                          setThreshold(e.target.value === '' ? '' : Number(e.target.value))
                        }
                        className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                        disabled={creating}
                      />
                    </div>
                  )}
                </div>

                {isMultiple && (
                  <div className="space-y-3">
                    <label className="block mb-1 text-sm">Options</label>
                    {options.map((opt, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <input
                          type="text"
                          placeholder={`Option #${i + 1}`}
                          value={opt}
                          onChange={(e) => updateOption(i, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer"
                          disabled={creating}
                        />
                        {options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeOption(i)}
                            className="text-red-500 hover:text-red-700 cursor-pointer"
                            disabled={creating}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addOption}
                      className="text-primary text-sm font-medium cursor-pointer disabled:opacity-50"
                      disabled={creating}
                    >
                      + Add another option
                    </button>
                  </div>
                )}

                <div className="pt-4 border-t flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-4 py-2 rounded-lg bg-muted hover:bg-tertiary cursor-pointer disabled:opacity-50"
                    disabled={creating}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!canSubmit || creating}
                    className={`px-6 py-2 rounded-lg font-medium transition ${canSubmit && !creating ? 'bg-primary text-primary-foreground hover:bg-secondary cursor-pointer' : 'bg-muted text-tertiary cursor-not-allowed'}`}
                  >
                    {creating ? 'Creating...' : 'Create Prediction'}
                  </button>
                </div>
              </form>
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
                  className="text-tertiary hover:text-content transition-colors text-2xl cursor-pointer"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    disabled={selectedTemplate === template.id}
                    className={`p-4 border rounded-xl transition-all duration-200 text-left hover:scale-[1.02] cursor-pointer ${
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
                    className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-tertiary transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowForm(true)}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors cursor-pointer"
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
