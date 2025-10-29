import React from 'react';
import type { PostVisibility } from '@ems/types';

interface PrivacySelectorProps {
  value: PostVisibility;
  onChange: (visibility: PostVisibility) => void;
  disabled?: boolean;
  showLabels?: boolean;
  compact?: boolean;
  className?: string;
}

interface VisibilityOption {
  value: PostVisibility;
  label: string;
  description: string;
  icon: string;
}

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    value: 'PUBLIC',
    label: 'Public',
    description: 'Anyone can see this post',
    icon: '🌐',
  },
  {
    value: 'FOLLOWERS',
    label: 'Followers',
    description: 'Only your followers can see this post',
    icon: '👥',
  },
  {
    value: 'MENTIONED_ONLY',
    label: 'Mentioned Only',
    description: 'Only mentioned users can see this post',
    icon: '💬',
  },
  {
    value: 'PRIVATE',
    label: 'Private',
    description: 'Only you can see this post',
    icon: '🔒',
  },
];

export const PrivacySelector: React.FC<PrivacySelectorProps> = ({
  value,
  onChange,
  disabled = false,
  showLabels = true,
  compact = false,
  className = '',
}) => {
  const currentOption = VISIBILITY_OPTIONS.find((option) => option.value === value);

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as PostVisibility)}
          disabled={disabled}
          className="appearance-none bg-surface border border-muted rounded-lg px-3 py-2 pr-8 text-sm text-content focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {VISIBILITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.icon} {option.label}
            </option>
          ))}
        </select>
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <svg
            className="w-4 h-4 text-tertiary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <label className="block text-sm font-medium text-content">Who can see this post?</label>
      )}

      <div className="space-y-2">
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className={`
              flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-all
              ${
                value === option.value
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-muted/20 hover:bg-muted/5 hover:border-muted'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input
              type="radio"
              name="visibility"
              value={option.value}
              checked={value === option.value}
              onChange={(e) => onChange(e.target.value as PostVisibility)}
              disabled={disabled}
              className="mt-0.5 text-primary focus:ring-primary"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-sm font-medium text-content">
                <span className="text-base">{option.icon}</span>
                <span>{option.label}</span>
              </div>
              <div className="text-xs text-tertiary mt-0.5">{option.description}</div>
            </div>
          </label>
        ))}
      </div>

      {/* Current selection indicator for compact usage */}
      {currentOption && (
        <div className="flex items-center gap-2 text-sm text-tertiary bg-muted/10 rounded-lg p-2">
          <span className="text-base">{currentOption.icon}</span>
          <span>
            <span className="font-medium text-content">{currentOption.label}:</span>{' '}
            {currentOption.description}
          </span>
        </div>
      )}
    </div>
  );
};

// Quick visibility indicator component for displaying current visibility
export const VisibilityIndicator: React.FC<{
  visibility: PostVisibility;
  showLabel?: boolean;
  className?: string;
}> = ({ visibility, showLabel = true, className = '' }) => {
  const option = VISIBILITY_OPTIONS.find((opt) => opt.value === visibility);

  if (!option) return null;

  return (
    <div className={`flex items-center gap-1 text-sm text-tertiary ${className}`}>
      <span className="text-base">{option.icon}</span>
      {showLabel && <span className="capitalize">{option.label.toLowerCase()}</span>}
    </div>
  );
};
