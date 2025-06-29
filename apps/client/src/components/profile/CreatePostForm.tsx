import React, { useState, useRef } from 'react';

type CreatePostFormProps = {
  onSubmit: (content: string, parentId?: number | null) => Promise<void>;
  parentId?: number | null;
  disabled?: boolean;
};

export function CreatePostForm({ onSubmit, parentId = null, disabled }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(content, parentId);
      setContent('');
      // Optionally focus after posting (for replies)
      if (textareaRef.current) textareaRef.current.focus();
    } catch (err: any) {
      setError(err?.message || 'Failed to post');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mb-4">
      <textarea
        ref={textareaRef}
        className="w-full border rounded p-2"
        rows={parentId ? 2 : 3}
        placeholder={parentId ? 'Write a comment…' : 'Share something on your feed…'}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        disabled={saving || disabled}
      />
      {error && <div className="text-sm text-red-500">{error}</div>}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving || !content.trim() || disabled}
          className="bg-blue-600 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          {saving ? 'Posting…' : parentId ? 'Reply' : 'Post'}
        </button>
      </div>
    </form>
  );
}
