import { useState } from 'react';
import { usePredictions } from '../hooks/usePredictions';

export default function CreatePredictionForm({ onCreated }: { onCreated: () => void }) {
  const { createPrediction } = usePredictions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [options, setOptions] = useState<string[]>(['']); // start with one

  const addOption = () => setOptions((prev) => [...prev, '']);
  const updateOption = (idx: number, value: string) =>
    setOptions((prev) => prev.map((v, i) => (i === idx ? value : v)));
  const removeOption = (idx: number) => setOptions((prev) => prev.filter((_, i) => i !== idx));

  const canSubmit =
    title && description && category && expiresAt && options.every((o) => o.trim().length > 0);

  const submit = async () => {
    if (!canSubmit || !expiresAt) return;
    await createPrediction({
      title,
      description,
      category,
      expiresAt,
      options: options.map((label) => ({ label })),
    });
    onCreated();
  };

  return (
    <div className="p-4 bg-surface rounded space-y-4">
      <h2>New Prediction</h2>
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full border p-1"
      />
      <textarea
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full border p-1"
      />
      <input
        placeholder="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full border p-1"
      />
      <input
        type="date"
        value={expiresAt ? expiresAt.toISOString().slice(0, 10) : ''}
        onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value) : null)}
        className="w-full border p-1"
      />

      <div>
        <label className="font-medium">Options</label>
        {options.map((opt, i) => (
          <div key={i} className="flex space-x-2 mb-2">
            <input
              placeholder={`Option #${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              className="flex-1 border p-1"
            />
            {options.length > 1 && <button onClick={() => removeOption(i)}>✕</button>}
          </div>
        ))}
        <button onClick={addOption} className="text-blue-600">
          + Add another option
        </button>
      </div>

      <button
        disabled={!canSubmit}
        onClick={submit}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Create Prediction
      </button>
    </div>
  );
}
