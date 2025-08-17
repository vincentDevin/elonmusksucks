import React from 'react';
import type { PublicPredictionSourceLink } from '@ems/types';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

interface PredictionSourceLinkProps {
  source: PublicPredictionSourceLink;
  compact?: boolean;
}

export const PredictionSourceLink: React.FC<PredictionSourceLinkProps> = ({
  source,
  compact = false,
}) => {
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
