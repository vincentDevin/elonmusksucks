import { useState } from 'react';
import type { ReactionType, PostReaction } from '@ems/types';

interface PostReactionsProps {
  counts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  postId: number;
  onShowDetails?: (postId: number) => void;
  className?: string;
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

export function PostReactions({
  counts,
  userReaction,
  postId,
  onShowDetails,
  className = '',
}: PostReactionsProps) {
  const totalReactions = Object.values(counts).reduce((sum, count) => sum + count, 0);

  if (totalReactions === 0) {
    return null;
  }

  // Get reactions with counts > 0, sorted by count (descending)
  const reactionsWithCounts = (Object.entries(counts) as [ReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const handleClick = () => {
    if (onShowDetails) {
      onShowDetails(postId);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Reaction Emojis and Counts */}
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
        title={`${totalReactions} reaction${totalReactions === 1 ? '' : 's'}`}
        aria-label={`View ${totalReactions} reactions`}
      >
        {/* Show top 3 reaction types */}
        <div className="flex -space-x-1">
          {reactionsWithCounts.slice(0, 3).map(([type]) => (
            <span
              key={type}
              className="inline-block w-5 h-5 rounded-full bg-surface border border-muted text-xs leading-5 text-center"
              title={REACTION_LABELS[type]}
            >
              {REACTION_EMOJIS[type]}
            </span>
          ))}
        </div>

        {/* Total count */}
        <span className="text-sm text-tertiary ml-1">{totalReactions}</span>
      </button>

      {/* User's reaction indicator */}
      {userReaction && (
        <div className="flex items-center gap-1 ml-2 px-2 py-1 bg-primary/10 text-primary rounded-lg text-sm">
          <span className="text-base">{REACTION_EMOJIS[userReaction]}</span>
          <span>You reacted</span>
        </div>
      )}
    </div>
  );
}

interface ReactionDetailsProps {
  postId: number;
  onClose: () => void;
  reactions?: PostReaction[];
  loading?: boolean;
}

export function ReactionDetails({
  postId,
  onClose,
  reactions = [],
  loading = false,
}: ReactionDetailsProps) {
  // Group reactions by type
  const reactionsByType = reactions.reduce(
    (acc, reaction) => {
      if (!acc[reaction.type]) {
        acc[reaction.type] = [];
      }
      acc[reaction.type].push(reaction);
      return acc;
    },
    {} as Record<ReactionType, PostReaction[]>,
  );

  const [selectedType, setSelectedType] = useState<ReactionType | 'all'>('all');

  const filteredReactions =
    selectedType === 'all' ? reactions : reactionsByType[selectedType] || [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-lg shadow-xl max-w-md w-full mx-4 max-h-96 flex flex-col border border-muted"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-muted">
          <h3 className="text-lg font-semibold text-content">Reactions</h3>
          <button
            onClick={onClose}
            className="text-tertiary hover:text-content transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Reaction Type Tabs */}
        <div className="flex gap-2 p-4 border-b border-muted overflow-x-auto">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-lg whitespace-nowrap transition-colors ${
              selectedType === 'all'
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-tertiary hover:bg-muted/80'
            }`}
          >
            All ({reactions.length})
          </button>
          {Object.entries(reactionsByType).map(([type, typeReactions]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type as ReactionType)}
              className={`flex items-center gap-1 px-3 py-1 rounded-lg whitespace-nowrap transition-colors ${
                selectedType === type
                  ? 'bg-primary/10 text-primary'
                  : 'bg-muted text-tertiary hover:bg-muted/80'
              }`}
            >
              <span>{REACTION_EMOJIS[type as ReactionType]}</span>
              <span>({typeReactions.length})</span>
            </button>
          ))}
        </div>

        {/* Reactions List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-4 text-tertiary">Loading reactions...</div>
          ) : filteredReactions.length === 0 ? (
            <div className="text-center py-4 text-tertiary">No reactions found</div>
          ) : (
            <div className="space-y-3">
              {filteredReactions.map((reaction) => (
                <div key={reaction.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    {reaction.userAvatar ? (
                      <img
                        src={reaction.userAvatar}
                        alt={reaction.userName || 'User'}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm text-tertiary">
                        {(reaction.userName || 'U')[0].toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <span className="font-medium text-content">
                      {reaction.userName || `User #${reaction.userId}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-lg">{REACTION_EMOJIS[reaction.type]}</span>
                    <span className="text-sm text-tertiary">{REACTION_LABELS[reaction.type]}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
