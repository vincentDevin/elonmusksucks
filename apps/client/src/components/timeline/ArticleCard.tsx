// apps/client/src/components/timeline/ArticleCard.tsx
import React from 'react';
import type { TimelineItem } from '@ems/types';

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
  className = ''
}) => {
  const handleUseAsSource = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onUseAsSource?.(item);
  };

  const handleViewDetails = () => {
    onViewDetails?.(item);
  };

  const formatTimeAgo = (timestamp: string) => {
    // TODO: Implement proper time formatting
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <article className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${className}`}>
      {/* Lead Image */}
      {article.content.imageUrl && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg">
          <img
            src={item.content.imageUrl}
            alt={item.content.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200 cursor-pointer"
            onClick={handleViewDetails}
          />
        </div>
      )}

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 
              className="font-semibold text-lg leading-tight mb-1 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleViewDetails}
            >
              {item.content.title}
            </h3>
            <div className="flex items-center text-sm text-gray-500 space-x-2">
              <span>{item.content.author}</span>
              <span>•</span>
              <span>{formatTimeAgo(item.timestamp)}</span>
              {item.content.source && (
                <>
                  <span>•</span>
                  <span>{item.content.source}</span>
                </>
              )}
            </div>
          </div>

          {/* Use as Source Button */}
          <button
            onClick={handleUseAsSource}
            className="ml-4 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors flex-shrink-0"
          >
            📊 Use as Source
          </button>
        </div>

        {/* Excerpt */}
        {item.content.excerpt && (
          <p className="text-gray-700 text-sm leading-relaxed mb-3 line-clamp-3">
            {item.content.excerpt}
          </p>
        )}

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {item.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
            {item.tags.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{item.tags.length - 4}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          {/* Engagement */}
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <span className="mr-1">👍</span>
              {item.engagement.reactions}
            </span>
            <span className="flex items-center">
              <span className="mr-1">💬</span>
              {item.engagement.comments}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handleViewDetails}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Read Full Article →
            </button>
          </div>
        </div>
      </div>

      {/* TODO: Add related prediction links if available */}
      {item.sourceLinks && item.sourceLinks.length > 0 && (
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-500 mb-2">Related Predictions:</div>
          <div className="space-y-1">
            {item.sourceLinks.slice(0, 2).map((link) => (
              <div key={link.id} className="text-xs">
                <a href={`/predictions/${link.predictionId}`} className="text-blue-600 hover:text-blue-800">
                  {link.title}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default ArticleCard;