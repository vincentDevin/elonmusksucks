import React, { useState, useRef } from 'react';
import type { PostVisibility, PostContentType } from '@ems/types';
import { PrivacySelector, VisibilityIndicator } from '../posts/PrivacySelector';
import { MentionAutocomplete } from '../posts/MentionAutocomplete';

type CreatePostFormProps = {
  onSubmit: (
    content: string,
    parentId?: number | null,
    options?: {
      visibility?: PostVisibility;
      contentType?: PostContentType;
    },
  ) => Promise<void>;
  parentId?: number | null;
  disabled?: boolean;
  showVisibilityOptions?: boolean;
  placeholder?: string;
};

export function CreatePostForm({
  onSubmit,
  parentId = null,
  disabled,
  showVisibilityOptions = false,
  placeholder,
}: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<PostVisibility>('PUBLIC');
  const [showOptions, setShowOptions] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(content, parentId, {
        visibility,
        contentType: 'TEXT',
      });
      setContent('');
      setVisibility('PUBLIC');
      setShowOptions(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to post');
    } finally {
      setSaving(false);
    }
  };

  const isComment = parentId !== null;
  const characterLimit = isComment ? 500 : 2000;
  const remainingChars = characterLimit - content.length;

  return (
    <div
      className={`bg-surface rounded-lg border border-muted ${isComment ? 'p-3' : 'p-4'} shadow-sm`}
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Main content area */}
        <div className="relative">
          <MentionAutocomplete
            value={content}
            onChange={setContent}
            placeholder={
              placeholder ||
              (isComment ? 'Write a comment…' : 'Share your thoughts about Elon Musk...')
            }
            disabled={saving || disabled}
            maxLength={characterLimit}
            rows={isComment ? 2 : 4}
            className=""
          />

          {/* Character counter */}
          {content.length > 0 && (
            <div
              className={`absolute bottom-2 right-2 text-xs ${
                remainingChars < 50 ? 'text-error' : 'text-tertiary'
              }`}
            >
              {remainingChars} left
            </div>
          )}
        </div>

        {error && (
          <div className="text-sm text-error bg-error/10 p-2 rounded-lg border border-error/20">
            {error}
          </div>
        )}

        {/* Options and controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Post options toggle (only for main posts, not comments) */}
            {!isComment && showVisibilityOptions && (
              <button
                type="button"
                onClick={() => setShowOptions(!showOptions)}
                className="p-2 text-tertiary hover:text-content hover:bg-muted rounded-lg transition-colors"
                title="Post options"
              >
                ⚙️
              </button>
            )}

            {/* Visibility indicator */}
            {!isComment && <VisibilityIndicator visibility={visibility} showLabel={true} />}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={saving || !content.trim() || disabled || remainingChars < 0}
            className={`
              px-6 py-2 rounded-lg font-medium transition-all
              ${
                isComment
                  ? 'bg-secondary hover:bg-secondary/90 text-white'
                  : 'bg-primary hover:bg-primary/90 text-white'
              }
              disabled:opacity-50 disabled:cursor-not-allowed
              focus:ring-2 focus:ring-offset-2 focus:ring-primary
            `}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                    fill="none"
                  />
                  <path
                    fill="currentColor"
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Posting...
              </span>
            ) : isComment ? (
              'Reply'
            ) : (
              'Share Post'
            )}
          </button>
        </div>

        {/* Expanded options */}
        {showOptions && !isComment && showVisibilityOptions && (
          <div className="border-t border-muted pt-3">
            <PrivacySelector
              value={visibility}
              onChange={setVisibility}
              disabled={saving}
              showLabels={true}
              compact={false}
            />
          </div>
        )}
      </form>
    </div>
  );
}
