// apps/client/src/components/CreatePredictionForm.tsx
import React, { useState } from 'react';
import type { CreatePredictionPayload } from '../api/predictions';
import { PredictionType } from '@ems/types';

interface CreatePredictionFormProps {
  /** Called with the new-prediction payload when the user submits */
  onCreated: (input: CreatePredictionPayload) => Promise<void> | void;
  /** Called when the user cancels creating */
  onCancel: () => void;
}

export default function CreatePredictionForm({ onCreated, onCancel }: CreatePredictionFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [type, setType] = useState<PredictionType>(PredictionType.MULTIPLE);
  const [threshold, setThreshold] = useState<number | ''>('');
  const [options, setOptions] = useState<string[]>(['']);

  const isBinary = type === PredictionType.BINARY;
  const isOU = type === PredictionType.OVER_UNDER;
  const isMultiple = type === PredictionType.MULTIPLE;

  const canSubmit =
    Boolean(title) &&
    Boolean(description) &&
    Boolean(category) &&
    Boolean(expiresAt) &&
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
      category,
      expiresAt: new Date(expiresAt),
      type,
      threshold: isOU ? Number(threshold) : undefined,
      options: isMultiple ? options.map((label) => ({ label })) : undefined,
    };

    await onCreated(payload);
  };

  const inputBase =
    'w-full border rounded-lg px-3 py-2 bg-[var(--color-surface)] ' +
    'text-[var(--color-content)] placeholder:text-[var(--color-tertiary)] ' +
    'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] ' +
    'border-[var(--color-muted)]';

  return (
    <form
      onSubmit={submit}
      className="bg-[var(--color-surface)] shadow-lg rounded-lg p-6 space-y-6"
    >
      <h2 className="text-2xl font-bold">New Prediction</h2>

      {/* Title / Category / Description / Expires At / Type / Threshold */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Title */}
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

        {/* Category */}
        <div>
          <label htmlFor="category" className="block mb-1 text-sm">
            Category
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputBase}
          />
        </div>

        {/* Description */}
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

        {/* Expires At */}
        <div>
          <label htmlFor="expiresAt" className="block mb-1 text-sm">
            Expires At
          </label>
          <input
            id="expiresAt"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputBase}
          />
        </div>

        {/* Prediction Type */}
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

        {/* Threshold for Over/Under */}
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

      {/* Options list for Multiple */}
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
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={addOption}
            className="text-[var(--color-primary)] text-sm font-medium"
          >
            + Add another option
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="pt-4 border-t flex justify-end space-x-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-[var(--color-muted)] hover:bg-[var(--color-tertiary)]"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!canSubmit}
          className={`px-6 py-2 rounded-lg font-medium transition ${
            canSubmit
              ? 'bg-[var(--color-primary)] text-white hover:bg-[var(--color-secondary)]'
              : 'bg-[var(--color-muted)] text-[var(--color-tertiary)] cursor-not-allowed'
          }`}
        >
          Create Prediction
        </button>
      </div>
    </form>
  );
}
