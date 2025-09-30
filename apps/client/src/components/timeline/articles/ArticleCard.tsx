// apps/client/src/components/timeline/ArticleCard.tsx
// Migrated to use BaseCard for consistent styling and behavior
import React, { useState, useEffect } from 'react';
import type { TimelineItem, ReactionType } from '@ems/types';
import { ArticleCard as BaseArticleCard } from '../../BaseCard';
import { PostReactions } from '../../posts/core/PostReactions';
import { useReactions } from '../../../contexts/ReactionContext';

interface ArticleCardProps {
  item: TimelineItem;
  onUseAsSource?: (item: TimelineItem) => void;
  onViewDetails?: (item: TimelineItem) => void;
  className?: string;
}

/**
 * Article preview card for timeline display
 * Features:
 * - Article title, excerpt, and metadata
 * - Lead image display
 * - Source/publisher information
 * - Tag display
 * - "Use as Prediction Source" button
 * - "Read Full Article" action
 * - Engagement metrics (reactions, comments)
 */
export const ArticleCard: React.FC<ArticleCardProps> = ({
  item,
  onUseAsSource,
  onViewDetails,
  className = '',
}) => {
  const { getReactionState, toggleReaction, initializeReactions } = useReactions();
  const [commentsCount, setCommentsCount] = useState(item.engagement?.comments || 0);

  // Initialize reactions on mount
  useEffect(() => {
    const articleId = parseInt(item.id.replace('article-', ''));
    initializeReactions('article', articleId);
  }, [item.id, initializeReactions]);

  // Get current reaction state from context
  const articleId = parseInt(item.id.replace('article-', ''));
  const { reactionCounts, userReaction, isReacting } = getReactionState('article', articleId);

  const handleViewDetails = () => {
    onViewDetails?.(item);
  };

  const handleReaction = async (type: ReactionType) => {
    await toggleReaction('article', articleId, type);
  };

  const formatTimeAgo = (timestamp: string) => {
    // Basic relative time formatting
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <BaseArticleCard
      title={item.content?.title}
      subtitle={`${item.content?.author} • ${formatTimeAgo(item.timestamp)}${item.content?.source ? ` • ${item.content?.source}` : ''}`}
      className={className}
      onClick={handleViewDetails}
      primaryAction={
        onUseAsSource
          ? {
              label: 'Use as Source',
              onClick: () => onUseAsSource(item),
              icon: '📊',
            }
          : undefined
      }
      secondaryAction={{
        label: 'Read Full Article →',
        onClick: handleViewDetails,
      }}
    >
      {/* Lead Image */}
      {item.content?.imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-lg mb-4 -mx-1">
          <img
            src={item.content?.imageUrl}
            alt={item.content?.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
            onClick={handleViewDetails}
          />
        </div>
      )}

      {/* Excerpt */}
      {item.content?.excerpt && (
        <p className="text-content/80 text-sm leading-relaxed mb-3 line-clamp-3">
          {item.content?.excerpt}
        </p>
      )}

      {/* Tags */}
      {item.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags?.slice(0, 4).map((tag) => (
            <span key={tag} className="px-2 py-1 bg-muted/20 text-content/70 text-xs rounded-full">
              {tag}
            </span>
          ))}
          {item.tags?.length > 4 && (
            <span className="px-2 py-1 bg-muted/20 text-content/70 text-xs rounded-full">
              +{item.tags?.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Engagement */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          {/* Reactions - Always show PostReactions component */}
          <PostReactions
            counts={reactionCounts}
            userReaction={userReaction}
            postId={parseInt(item.id.replace('article-', ''))}
            onReactionSelect={handleReaction}
          />

          {/* Comments */}
          <button
            onClick={handleViewDetails}
            className="flex items-center space-x-1.5 text-tertiary hover:text-primary transition-colors hover:bg-muted/30 px-2 py-1 rounded-lg cursor-pointer"
          >
            <span className="text-base">💬</span>
            <span className="font-medium">{commentsCount}</span>
          </button>
        </div>
      </div>

      {/* Related prediction links section */}
      {item.sourceLinks && item.sourceLinks.length > 0 && (
        <div className="border-t border-muted pt-3 mt-3">
          <div className="text-xs text-content/60 mb-2">Related Predictions:</div>
          <div className="space-y-1">
            {item.sourceLinks.slice(0, 2).map((link) => (
              <div key={link.id} className="text-xs">
                <a
                  href={`/predictions/${link.predictionId}`}
                  className="text-primary hover:text-primary/80"
                >
                  {link.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </BaseArticleCard>
  );
};

export default ArticleCard;
