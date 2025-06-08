import { useState } from 'react';
import { usePredictions } from '../hooks/usePredictions';

export default function CreatePredictionForm({ onCreated }: { onCreated: () => void }) {
  const { createPrediction } = usePredictions();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      if (!expiresAt) {
        alert('Please select an expiration date');
        setLoading(false);
        return;
      }
      await createPrediction({ title, description, category, expiresAt: expiresAt });
      onCreated();
    } catch (err) {
      console.error(err);
      alert('Failed to create prediction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 p-4 border rounded space-y-2 bg-surface">
      <h2 className="text-xl font-semibold">New Prediction</h2>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title"
        className="w-full border p-2 rounded"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="w-full border p-2 rounded"
      />
      <input
        type="text"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        className="w-full border p-2 rounded"
      />
      <input
        type="date"
        value={expiresAt ? expiresAt.toISOString().substr(0, 10) : ''}
        onChange={(e) => setExpiresAt(e.target.value ? new Date(e.target.value) : null)}
        className="w-full border p-2 rounded"
      />
      <button
        disabled={loading}
        onClick={submit}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        {loading ? 'Creating…' : 'Create'}
      </button>
    </div>
  );
}
