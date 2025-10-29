import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ChatBubbleOvalLeftIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import { getPredictionComments, createPredictionComment } from '../../api/predictions';

interface Comment {
  id: number;
  body?: string; // Content model uses 'body'
  content?: string; // Some endpoints might use 'content'
  createdAt: string;
  user?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
  author?: {
    id: number;
    name: string;
    avatarUrl: string | null;
  };
}

interface PredictionCommentsProps {
  predictionId: number;
}

export default function PredictionComments({ predictionId }: PredictionCommentsProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPredictionComments(predictionId, { limit: 50 });
      setComments(data.comments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [predictionId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      setSubmitting(true);
      const newCommentData = await createPredictionComment(predictionId, newComment.trim());
      setComments([newCommentData, ...comments]);
      setNewComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-tertiary">Loading comments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Comment Form */}
      {user ? (
        <form onSubmit={handleSubmit} className="bg-surface rounded-xl border border-border p-4">
          <div className="flex gap-3">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-10 h-10 rounded-full border border-border object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-border flex-shrink-0">
                <span className="text-primary font-bold text-sm">
                  {user.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
            )}
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-content placeholder-tertiary focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                rows={3}
                maxLength={1000}
                disabled={submitting}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-tertiary">{newComment.length}/1000 characters</span>
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-surface rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                  {submitting ? 'Posting...' : 'Post Comment'}
                </button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-muted/30 rounded-xl border border-border p-6 text-center">
          <p className="text-tertiary">Sign in to join the discussion</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error/10 border border-error rounded-lg p-4 text-error text-sm">
          {error}
        </div>
      )}

      {/* Comments List */}
      {comments.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            <ChatBubbleOvalLeftIcon className="w-5 h-5 text-primary" />
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </h3>
          {comments.map((comment) => {
            const user = comment.user || comment.author;
            const content = comment.content || comment.body || '';

            return (
              <div
                key={comment.id}
                className="bg-surface rounded-xl border border-border p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex gap-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border border-border object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center border border-border flex-shrink-0">
                      <span className="text-primary font-bold text-sm">
                        {user?.name?.charAt(0).toUpperCase() || '?'}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-content">
                        {user?.name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-tertiary">
                        {new Date(comment.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-content whitespace-pre-wrap break-words">{content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ChatBubbleOvalLeftIcon className="w-16 h-16 mx-auto mb-4 text-tertiary" />
          <h3 className="text-lg font-semibold text-content mb-2">No comments yet</h3>
          <p className="text-tertiary">Be the first to share your thoughts!</p>
        </div>
      )}
    </div>
  );
}
