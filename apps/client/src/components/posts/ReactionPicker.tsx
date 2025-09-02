import { useState } from 'react';
import type { ReactionType } from '@ems/types';

interface ReactionPickerProps {
  onReactionSelect: (type: ReactionType) => void;
  userReaction?: ReactionType;
  disabled?: boolean;
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

export function ReactionPicker({
  onReactionSelect,
  userReaction,
  disabled = false,
  className = '',
}: ReactionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleReactionClick = (type: ReactionType) => {
    onReactionSelect(type);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-1 px-2 py-1 rounded-lg text-sm transition-colors
          ${
            userReaction
              ? 'bg-primary/10 text-primary hover:bg-primary/20'
              : 'text-tertiary hover:bg-muted hover:text-content'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        aria-label="Add reaction"
      >
        {userReaction ? (
          <>
            <span className="text-base">{REACTION_EMOJIS[userReaction]}</span>
            <span>{REACTION_LABELS[userReaction]}</span>
          </>
        ) : (
          <>
            <span className="text-base">😊</span>
            <span>React</span>
          </>
        )}
      </button>

      {/* Reaction Picker Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

          {/* Picker Panel */}
          <div className="absolute bottom-full left-0 mb-2 z-20 bg-surface border border-muted rounded-lg shadow-lg p-2">
            <div className="flex gap-1">
              {(Object.entries(REACTION_EMOJIS) as [ReactionType, string][]).map(
                ([type, emoji]) => (
                  <button
                    key={type}
                    onClick={() => handleReactionClick(type)}
                    className={`
                    flex flex-col items-center p-2 rounded-lg min-w-[48px] transition-all
                    hover:bg-muted hover:scale-110
                    ${userReaction === type ? 'bg-primary/10 ring-2 ring-primary' : ''}
                  `}
                    title={REACTION_LABELS[type]}
                    aria-label={`React with ${REACTION_LABELS[type]}`}
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-xs text-tertiary mt-1">{REACTION_LABELS[type]}</span>
                  </button>
                ),
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
