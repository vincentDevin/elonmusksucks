// apps/client/src/components/CreatePredictionForm.tsx
// -----------------------------------------------------------------------------
// Form component used by admins/moderators to create a new prediction.
// Relies on shared @ems/types enum + DTO from '@/api/predictions'.
// -----------------------------------------------------------------------------

import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { CreatePredictionPayload } from '@ems/types';
import { PredictionType } from '@ems/types';
import { getCategories, type Category } from '../../api/predictions';

interface CreatePredictionFormProps {
  /** Called with the payload when the user submits. */
  onCreated: (input: CreatePredictionPayload) => Promise<void> | void;
  /** Called when the user cancels creating. */
  onCancel: () => void;
  /** Source data for prediction creation */
  sourceData?: {
    type: 'article' | 'tweet';
    id: string;
    title: string;
    url: string;
    publisher: string;
  } | null;
  /** Whether the form is disabled (submitting) */
  disabled?: boolean;
  /** Default category ID to pre-select */
  defaultCategoryId?: number;
}

interface SourceData {
  type: 'article' | 'tweet';
  id: string;
  title: string;
  url: string;
  publisher: string;
}

export default function CreatePredictionForm({
  onCreated,
  onCancel,
  sourceData: propSourceData,
  defaultCategoryId,
}: CreatePredictionFormProps) {
  const location = useLocation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [type, setType] = useState<PredictionType>(PredictionType.MULTIPLE);
  const [threshold, setThreshold] = useState<number | ''>('');
  const [options, setOptions] = useState<string[]>(['']);
  const [sourceData, setSourceData] = useState<SourceData | null>(propSourceData || null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await getCategories();
        setCategories(cats);
      } catch (error) {
        console.error('Failed to load categories:', error);
      } finally {
        setCategoriesLoading(false);
      }
    }
    loadCategories();
  }, []);

  // Set default category ID when provided
  useEffect(() => {
    if (defaultCategoryId && categoryId === '') {
      setCategoryId(defaultCategoryId);
    }
  }, [defaultCategoryId, categoryId]);

  // Parse URL parameters for source data (only if no prop source data)
  useEffect(() => {
    if (propSourceData) return; // Use prop data instead

    const searchParams = new URLSearchParams(location.search);
    const sourceType = searchParams.get('sourceType');
    const sourceId = searchParams.get('sourceId');
    const sourceTitle = searchParams.get('sourceTitle');
    const sourceUrl = searchParams.get('sourceUrl');
    const sourcePublisher = searchParams.get('sourcePublisher');

    if (sourceType && sourceId && sourceTitle) {
      setSourceData({
        type: sourceType as 'article' | 'tweet',
        id: sourceId,
        title: sourceTitle,
        url: sourceUrl || '',
        publisher: sourcePublisher || 'Unknown',
      });
    }
  }, [location.search, propSourceData]);

  // Pre-populate fields when source data changes
  useEffect(() => {
    if (sourceData && sourceData.title && !title) {
      // Suggest a prediction title based on the article
      setTitle(`Will ${sourceData.title.split(' ').slice(0, 8).join(' ')}...?`);
    }
  }, [sourceData, title]);

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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: CreatePredictionPayload = {
      title,
      description,
      categoryId: typeof categoryId === 'number' ? categoryId : Number(categoryId),
      expiresAt: new Date(expiresAt).toISOString(),
      type,
      threshold: isOU ? Number(threshold) : undefined,
      options: isMultiple ? options.map((label) => ({ label })) : undefined,
    };

    // Create the prediction - parent component handles source linking
    await onCreated(payload);
  };

  const inputBase =
    'w-full border rounded-lg px-3 py-2 bg-surface text-content placeholder:text-tertiary ' +
    'focus:outline-none focus:ring-2 focus:ring-primary border-muted cursor-pointer';

  return (
    <form onSubmit={submit} className="bg-surface shadow-lg rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold">New Prediction</h2>

      {/* Source Information */}
      {sourceData && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-content flex items-center">
              <span className="mr-2">📰</span>
              Prediction Source
            </h3>
            <button
              type="button"
              onClick={() => setSourceData(null)}
              className="text-content/60 hover:text-content text-sm cursor-pointer"
            >
              Remove
            </button>
          </div>
          <div className="bg-background/50 rounded p-3">
            <h4 className="font-medium text-content text-sm line-clamp-2">{sourceData.title}</h4>
            <p className="text-xs text-content/60 mt-1">
              {sourceData.publisher} • {sourceData.type === 'article' ? 'Article' : 'Tweet'}
            </p>
            {sourceData.url && (
              <a
                href={sourceData.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 mt-1 inline-block cursor-pointer"
              >
                View Original →
              </a>
            )}
          </div>
          <p className="text-xs text-content/60 mt-2">
            This source will be automatically linked to your prediction as supporting evidence.
          </p>
        </div>
      )}

      {/* Title / Category / Description / Expires At / Type / Threshold */}
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
            className={inputBase}
          />
        </div>

        <div>
          <label htmlFor="categoryId" className="block mb-1 text-sm">
            Category
          </label>
          <select
            id="categoryId"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
            className={inputBase}
            disabled={categoriesLoading}
          >
            <option value="">
              {categoriesLoading ? 'Loading categories...' : 'Select a category'}
            </option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.icon} {cat.name}
              </option>
            ))}
          </select>
          {!categoriesLoading && categories.length === 0 && (
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
            className={inputBase}
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
            className={`${inputBase} ${expiresAt && !isExpirationValid ? 'border-red-500 focus:ring-red-500' : ''}`}
          />
          {expiresAt && !isExpirationValid && (
            <p className="text-red-500 text-xs mt-1">Expiration date must be in the future</p>
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
            className={inputBase}
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
              onChange={(e) => setThreshold(e.target.value === '' ? '' : Number(e.target.value))}
              className={inputBase}
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
                className={inputBase}
              />
              {options.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeOption(i)}
                  className="text-red-500 hover:text-red-700 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-primary text-sm font-medium cursor-pointer"
          >
            + Add another option
          </button>
        </div>
      )}

      <div className="pt-4 border-t flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-tertiary cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-6 py-2 rounded-lg font-medium transition ${canSubmit ? 'bg-primary text-primary-foreground hover:bg-secondary cursor-pointer' : 'bg-muted text-tertiary cursor-not-allowed'}`}
        >
          Create Prediction
        </button>
      </div>
    </form>
  );
}
