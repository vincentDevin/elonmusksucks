import React, { useState } from 'react';
import type { PublicPredictionSourceLink } from '@ems/types';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  LinkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

// Internal component for displaying individual source link
interface PredictionSourceLinkProps {
  source: PublicPredictionSourceLink;
  compact?: boolean;
}

const PredictionSourceLink: React.FC<PredictionSourceLinkProps> = ({ source, compact = false }) => {
  const isArticle = source.articleId !== null;
  const isTweet = source.tweetId !== null;

  const icon = isArticle ? '📰' : isTweet ? '🐦' : '🔗';
  const typeLabel = isArticle ? 'Article' : isTweet ? 'Tweet' : 'Link';

  if (compact) {
    return (
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-content-secondary hover:text-content-primary transition-colors text-sm"
        title={source.title || source.url}
      >
        <span>{icon}</span>
        <span className="truncate max-w-[200px]">
          {source.publisher || source.title || typeLabel}
        </span>
        <ArrowTopRightOnSquareIcon className="w-3 h-3" />
      </a>
    );
  }

  return (
    <div className="border border-muted rounded-lg p-3 hover:bg-surface-secondary transition-colors">
      <a href={source.url} target="_blank" rel="noopener noreferrer" className="block space-y-1">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-sm text-content-secondary mb-1">
              <span>{icon}</span>
              {source.publisher && (
                <>
                  <span className="font-medium">{source.publisher}</span>
                  <span className="text-content-tertiary">•</span>
                </>
              )}
              <span className="text-content-tertiary">
                {new Date(source.capturedAt).toLocaleDateString()}
              </span>
            </div>
            {source.title && (
              <h4 className="font-medium text-content-primary line-clamp-2 hover:text-accent-primary transition-colors">
                {source.title}
              </h4>
            )}
            {!source.title && (
              <p className="text-content-secondary text-sm truncate">{source.url}</p>
            )}
          </div>
          <ArrowTopRightOnSquareIcon className="w-4 h-4 text-content-tertiary ml-2 flex-shrink-0" />
        </div>
      </a>
    </div>
  );
};

interface PredictionSourceListProps {
  sources: PublicPredictionSourceLink[];
  compact?: boolean;
  maxVisible?: number;
}

export const PredictionSourceList: React.FC<PredictionSourceListProps> = ({
  sources,
  compact = false,
  maxVisible = 2,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  const visibleSources = expanded ? sources : sources.slice(0, maxVisible);
  const hasMore = sources.length > maxVisible;

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm text-content-secondary">
        <LinkIcon className="w-3.5 h-3.5" />
        <span>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
        </span>
        {sources[0] && (
          <>
            <span className="text-content-tertiary">•</span>
            <PredictionSourceLink source={sources[0]} compact />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-content-secondary flex items-center gap-2">
          <LinkIcon className="w-4 h-4" />
          Sources ({sources.length})
        </h4>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-accent-primary hover:text-accent-secondary flex items-center gap-1 transition-colors"
          >
            {expanded ? (
              <>
                <span>Show less</span>
                <ChevronUpIcon className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>Show all</span>
                <ChevronDownIcon className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleSources.map((source) => (
          <PredictionSourceLink key={source.id} source={source} />
        ))}
      </div>
    </div>
  );
};
