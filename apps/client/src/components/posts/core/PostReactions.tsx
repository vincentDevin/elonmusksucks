import { useState } from 'react';
import type { ReactionType, PostReaction } from '@ems/types';

interface PostReactionsProps {
  counts: Record<ReactionType, number>;
  userReaction?: ReactionType;
  postId: number;
  onShowDetails?: (postId: number) => void;
  onReactionSelect?: (type: ReactionType) => void;
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
  onReactionSelect,
  className = '',
}: PostReactionsProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const totalReactions = Object.values(counts).reduce((sum, count) => sum + count, 0);

  // Always show the component so users can add reactions even when count is 0

  // Get reactions with counts > 0, sorted by count (descending)
  const reactionsWithCounts = (Object.entries(counts) as [ReactionType, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent card onClick

    // If we have onReactionSelect, show picker; otherwise show details
    if (onReactionSelect) {
      setShowReactionPicker(!showReactionPicker);
    } else if (onShowDetails) {
      onShowDetails(postId);
    }
  };

  const handleReactionSelect = (type: ReactionType) => {
    if (onReactionSelect) {
      onReactionSelect(type);
    }
    setShowReactionPicker(false);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      {/* Reaction Emojis and Counts OR React Button */}
      <button
        onClick={handleClick}
        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-muted transition-colors cursor-pointer"
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
                  className="inline-block w-6 h-6 rounded-full bg-surface border border-muted text-sm leading-6 text-center"
                  title={REACTION_LABELS[type]}
                >
                  {REACTION_EMOJIS[type]}
                </span>
              ))}
            </div>

            {/* Total count */}
            <span className="text-sm text-tertiary ml-1">{totalReactions}</span>
          </>
        ) : (
          <>
            {/* React button when no reactions */}
            <span className="text-base">😊</span>
            <span className="text-sm text-tertiary">React</span>
          </>
        )}
      </button>

      {/* Reaction Picker */}
      {showReactionPicker && onReactionSelect && (
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
                    className={`
                      flex flex-col items-center p-1.5 rounded-md min-w-[36px] transition-all
                      hover:bg-muted hover:scale-105
                      ${userReaction === type ? 'bg-primary/10 ring-1 ring-primary' : ''}
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
  postId: _postId,
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
