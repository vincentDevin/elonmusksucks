import React, { useState, useEffect } from 'react';
import type { ReactionType } from '@ems/types';
import { useReactions } from '../../contexts/ReactionContext';

interface PredictionReactionsProps {
  predictionId: number;
  className?: string;
  compact?: boolean;
  // Optional initial data from PredictionView (embedded in prediction object)
  initialReactionCounts?: Record<ReactionType, number>;
  initialUserReaction?: ReactionType;
}

const REACTION_EMOJIS: Record<ReactionType, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  LAUGH: '😄',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😠',
};

const REACTION_LABELS: Record<ReactionType, string> = {
  LIKE: 'Like',
  LOVE: 'Love',
  LAUGH: 'Laugh',
  WOW: 'Wow',
  SAD: 'Sad',
  ANGRY: 'Angry',
};

export function PredictionReactions({
  predictionId,
  className = '',
  compact = false,
  initialReactionCounts,
  initialUserReaction,
}: PredictionReactionsProps) {
  const { getReactionState, toggleReaction, initializeReactions } = useReactions();
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  // Initialize reactions with embedded data from PredictionView
  useEffect(() => {
    initializeReactions('prediction', predictionId, initialReactionCounts, initialUserReaction);
  }, [predictionId, initializeReactions, initialReactionCounts, initialUserReaction]);

  const { reactionCounts, userReaction, isReacting } = getReactionState('prediction', predictionId);
  const totalReactions = Object.values(reactionCounts).reduce((sum, count) => sum + count, 0);

  // Get reactions with counts > 0, sorted by count (descending)
  const reactionsWithCounts = (Object.entries(reactionCounts) as [ReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReactionPicker(!showReactionPicker);
  };

  const handleReactionSelect = async (type: ReactionType) => {
    if (isReacting) return;

    try {
      await toggleReaction('prediction', predictionId, type);
    } catch (error) {
      console.error('Failed to toggle prediction reaction:', error);
    }

    setShowReactionPicker(false);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Reaction Emojis and Counts OR React Button */}
      <button
        onClick={handleClick}
        disabled={isReacting}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer
          ${isReacting ? 'opacity-50 cursor-not-allowed' : ''}
          ${compact ? 'text-xs' : 'text-sm'}
        `}
        title={
          totalReactions > 0
            ? `${totalReactions} reaction${totalReactions === 1 ? '' : 's'}`
            : 'Add reaction'
        }
        aria-label={totalReactions > 0 ? `View ${totalReactions} reactions` : 'Add reaction'}
      >
        {totalReactions > 0 ? (
          <>
            {/* Show top 3 reaction types */}
            <div className="flex -space-x-1">
              {reactionsWithCounts.slice(0, 3).map(([type]) => (
                <span
                  key={type}
                  className={`
                    inline-block rounded-full bg-surface border border-muted text-center
                    ${compact ? 'w-5 h-5 text-xs leading-5' : 'w-6 h-6 text-sm leading-6'}
                  `}
                  title={REACTION_LABELS[type]}
                >
                  {REACTION_EMOJIS[type]}
                </span>
              ))}
            </div>

            {/* Total count */}
            <span className={`text-tertiary ml-1 ${compact ? 'text-xs' : 'text-sm'}`}>
              {totalReactions}
            </span>
          </>
        ) : (
          <>
            {/* React button when no reactions */}
            <span className={compact ? 'text-sm' : 'text-base'}>😊</span>
            <span className={`text-tertiary ${compact ? 'text-xs' : 'text-sm'}`}>React</span>
          </>
        )}
      </button>

      {/* Reaction Picker */}
      {showReactionPicker && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setShowReactionPicker(false)} />

          {/* Picker Panel */}
          <div className="absolute top-full left-0 mt-2 z-50 bg-surface border border-muted rounded-lg shadow-xl p-1 min-w-max">
            <div className="flex gap-1">
              {(Object.entries(REACTION_EMOJIS) as [ReactionType, string][]).map(
                ([type, emoji]) => (
                  <button
                    key={type}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReactionSelect(type);
                    }}
                    disabled={isReacting}
                    className={`
                      flex flex-col items-center p-1.5 rounded-md min-w-[36px] transition-all
                      hover:bg-muted hover:scale-105
                      ${userReaction === type ? 'bg-primary/10 ring-1 ring-primary' : ''}
                      ${isReacting ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                    title={REACTION_LABELS[type]}
                    aria-label={`React with ${REACTION_LABELS[type]}`}
                  >
                    <span className="text-base">{emoji}</span>
                    <span className="text-xs text-tertiary mt-0.5">{type.slice(0, 3)}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )}

      {/* User's reaction indicator */}
      {userReaction && !compact && (
        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm">
          <span className="text-base">{REACTION_EMOJIS[userReaction]}</span>
          <span>You reacted</span>
        </div>
      )}
    </div>
  );
}

export default PredictionReactions;
