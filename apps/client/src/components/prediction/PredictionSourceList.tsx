import React, { useState } from 'react';
import type { PublicPredictionSourceLink } from '@ems/types';
import { PredictionSourceLink } from './PredictionSourceLink';
import { ChevronDownIcon, ChevronUpIcon, LinkIcon } from '@heroicons/react/24/outline';

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
    const articleCount = sources.filter((s) => s.articleId !== null).length;
    const tweetCount = sources.filter((s) => s.tweetId !== null).length;

    return (
      <div className="flex items-center gap-2 text-sm text-content-secondary">
        <LinkIcon className="w-3.5 h-3.5" />
        <span>
          {sources.length} source{sources.length !== 1 ? 's' : ''}
          {articleCount > 0 && ` • ${articleCount} article${articleCount !== 1 ? 's' : ''}`}
          {tweetCount > 0 && ` • ${tweetCount} tweet${tweetCount !== 1 ? 's' : ''}`}
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
