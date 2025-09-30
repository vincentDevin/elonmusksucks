import React, { useState, useRef, useCallback } from 'react';
import { searchUsers } from '../../api/users';

interface User {
  id: number;
  name: string;
  avatarUrl?: string;
}

interface MentionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onMention?: (username: string) => void;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  rows?: number;
  className?: string;
}

export const MentionAutocomplete: React.FC<MentionAutocompleteProps> = ({
  value,
  onChange,
  onMention,
  placeholder,
  disabled = false,
  maxLength,
  rows = 4,
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [suggestions, setSuggestions] = useState<User[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [currentMention, setCurrentMention] = useState('');
  const [mentionStartPos, setMentionStartPos] = useState(-1);

  // Search for users when @ is typed
  const searchUsersForMention = async (query: string) => {
    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    try {
      const users = await searchUsers(query);
      setSuggestions(users.slice(0, 5)); // Limit to 5 suggestions
    } catch (error) {
      console.error('Failed to search users:', error);
      setSuggestions([]);
    }
  };

  // Handle text change and detect mentions
  const handleTextChange = useCallback(
    (newValue: string) => {
      onChange(newValue);

      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = newValue.slice(0, cursorPos);

      // Find the last @ symbol before the cursor
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);

        // Check if we're still in a mention (no spaces after @)
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setCurrentMention(textAfterAt);
          setMentionStartPos(lastAtIndex);
          setShowSuggestions(true);
          setActiveSuggestion(0);

          // Search for users
          searchUsersForMention(textAfterAt);
        } else {
          setShowSuggestions(false);
          setCurrentMention('');
          setMentionStartPos(-1);
        }
      } else {
        setShowSuggestions(false);
        setCurrentMention('');
        setMentionStartPos(-1);
      }
    },
    [onChange],
  );

  // Handle suggestion selection
  const selectSuggestion = (user: User) => {
    if (mentionStartPos === -1) return;

    const beforeMention = value.slice(0, mentionStartPos);
    const afterMention = value.slice(mentionStartPos + currentMention.length + 1);
    const newValue = `${beforeMention}@${user.name} ${afterMention}`;

    onChange(newValue);
    onMention?.(user.name);

    setShowSuggestions(false);
    setCurrentMention('');
    setMentionStartPos(-1);

    // Focus back to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newCursorPos = beforeMention.length + user.name.length + 2; // +2 for @ and space
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 0);
  };

  // Handle keyboard navigation in suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveSuggestion((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setActiveSuggestion((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;

      case 'Enter':
      case 'Tab':
        e.preventDefault();
        if (suggestions[activeSuggestion]) {
          selectSuggestion(suggestions[activeSuggestion]);
        }
        break;

      case 'Escape':
        setShowSuggestions(false);
        break;
    }
  };

  // Calculate suggestion box position
  const getSuggestionPosition = () => {
    const textarea = textareaRef.current;
    if (!textarea || mentionStartPos === -1) return { top: 0, left: 0 };

    // This is a simplified positioning - in production you'd want more sophisticated positioning
    const rect = textarea.getBoundingClientRect();
    const lineHeight = 20; // Approximate line height
    const charWidth = 8; // Approximate character width

    return {
      top: rect.top + lineHeight,
      left: rect.left + mentionStartPos * charWidth,
    };
  };

  const suggestionPosition = getSuggestionPosition();

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        rows={rows}
        className={`w-full border border-muted rounded-lg p-3 resize-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all bg-surface text-content ${className}`}
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          className="absolute z-50 bg-surface border border-muted rounded-lg shadow-lg max-w-xs w-64"
          style={{
            top: `${suggestionPosition.top + 30}px`, // Offset below cursor
            left: `${suggestionPosition.left}px`,
          }}
        >
          <div className="py-2">
            <div className="px-3 py-1 text-xs text-tertiary border-b border-muted">
              Mention someone
            </div>
            {suggestions.map((user, index) => (
              <button
                key={user.id}
                onClick={() => selectSuggestion(user)}
                className={`w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-muted/20 transition-colors ${
                  index === activeSuggestion ? 'bg-primary/10 border-r-2 border-primary' : ''
                }`}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="w-6 h-6 rounded-full flex-shrink-0" />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs text-tertiary">
                    {user.name[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-content truncate">@{user.name}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Overlay to capture clicks outside */}
      {showSuggestions && (
        <div className="fixed inset-0 z-40" onClick={() => setShowSuggestions(false)} />
      )}
    </div>
  );
};
