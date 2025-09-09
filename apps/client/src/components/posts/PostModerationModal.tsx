import React, { useState, useEffect } from 'react';
import type { UserFeedPost, ReportReason } from '@ems/types';
import { useAuth } from '../../contexts/AuthContext';

interface PostModerationModalProps {
  post: UserFeedPost | null;
  isOpen: boolean;
  onClose: () => void;
  onReportSubmitted?: (postId: number) => void;
}

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  {
    value: 'SPAM',
    label: 'Spam',
    description: 'Repetitive, promotional, or unwanted content',
  },
  {
    value: 'HARASSMENT',
    label: 'Harassment',
    description: 'Bullying, threatening, or targeting individuals',
  },
  {
    value: 'HATE_SPEECH',
    label: 'Hate Speech',
    description: 'Content that promotes hatred based on identity',
  },
  {
    value: 'MISINFORMATION',
    label: 'Misinformation',
    description: 'False or misleading information',
  },
  {
    value: 'INAPPROPRIATE_CONTENT',
    label: 'Inappropriate Content',
    description: 'NSFW, violent, or disturbing content',
  },
  {
    value: 'COPYRIGHT',
    label: 'Copyright Violation',
    description: 'Unauthorized use of copyrighted material',
  },
  {
    value: 'OTHER',
    label: 'Other',
    description: 'Other reason not listed above',
  },
];

export const PostModerationModal: React.FC<PostModerationModalProps> = ({
  post,
  isOpen,
  onClose,
  onReportSubmitted,
}) => {
  const { user } = useAuth();
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedReason(null);
      setDetails('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !post || !selectedReason) {
      setError('Please select a reason for reporting');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/posts/${post.id}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          reason: selectedReason,
          details: details.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit report');
      }

      setSuccess(true);
      onReportSubmitted?.(post.id);

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Failed to submit report:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit report');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
  };

  if (!isOpen || !post) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[100]">
      <div className="bg-surface border border-muted rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-muted">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-content flex items-center mb-2">
                <span className="mr-2">⚠️</span>
                Report Post
              </h2>
              <p className="text-sm text-tertiary">
                Help us keep the community safe by reporting inappropriate content
              </p>
            </div>
            <button
              onClick={handleCancel}
              className="text-tertiary hover:text-content transition-colors ml-4"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-content mb-2">Report Submitted</h3>
              <p className="text-tertiary text-sm">
                Thank you for helping keep our community safe. We'll review this report soon.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Post Preview */}
              <div className="bg-muted/10 rounded-lg p-3 border border-muted/20">
                <div className="flex items-start space-x-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-content mb-1">Reported Post</p>
                    <p className="text-sm text-tertiary truncate">
                      By {post.authorName || `User #${post.authorId}`}
                    </p>
                    <p className="text-sm text-content mt-2 line-clamp-3">{post.content}</p>
                  </div>
                </div>
              </div>

              {/* Reason Selection */}
              <div>
                <label className="block text-sm font-medium text-content mb-3">
                  Why are you reporting this post? *
                </label>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => (
                    <label
                      key={reason.value}
                      className="flex items-start space-x-3 p-3 rounded-lg border border-muted/20 hover:bg-muted/5 cursor-pointer transition-colors"
                    >
                      <input
                        type="radio"
                        name="reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={(e) => setSelectedReason(e.target.value as ReportReason)}
                        className="mt-0.5 text-primary focus:ring-primary"
                        disabled={loading}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-content">{reason.label}</div>
                        <div className="text-xs text-tertiary mt-0.5">{reason.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Additional Details */}
              <div>
                <label htmlFor="details" className="block text-sm font-medium text-content mb-2">
                  Additional Details (Optional)
                </label>
                <textarea
                  id="details"
                  rows={3}
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context that might help our review..."
                  className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content placeholder-tertiary focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none resize-none"
                  maxLength={500}
                  disabled={loading}
                />
                <div className="text-xs text-tertiary mt-1">{details.length}/500 characters</div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                  <p className="text-sm text-error">{error}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="px-4 py-2 text-sm font-medium text-tertiary hover:text-content transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !selectedReason}
                  className="px-6 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
