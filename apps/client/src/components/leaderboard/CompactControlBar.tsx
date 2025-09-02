import React from 'react';
import { ArrowPathIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { ControlBarConfig, FilterGroup } from './types';

interface CompactControlBarProps {
  config: ControlBarConfig;
  className?: string;
}

const variantStyles = {
  betting: {
    primaryColor: 'bg-primary text-white hover:bg-primary/90',
    secondaryColor: 'bg-secondary text-white hover:bg-secondary/90',
    filterColor: 'bg-primary text-white',
  },
  pong: {
    primaryColor: 'bg-blue-500 text-white hover:bg-blue-500/90',
    secondaryColor: 'bg-blue-600 text-white hover:bg-blue-600/90',
    filterColor: 'bg-blue-500 text-white',
  },
  shame: {
    primaryColor: 'bg-red-500 text-white hover:bg-red-500/90',
    secondaryColor: 'bg-red-600 text-white hover:bg-red-600/90',
    filterColor: 'bg-red-500 text-white',
  },
};

function FilterDropdown({ group }: { group: FilterGroup }) {
  const selectedOption = group.options.find((opt) => opt.key === group.value);

  return (
    <div className="relative">
      <label className="block text-xs font-medium text-tertiary mb-1">{group.label}</label>
      <div className="relative">
        <select
          value={group.value}
          onChange={(e) => group.onChange(e.target.value)}
          className="
            appearance-none bg-surface border border-muted rounded-lg px-3 py-2 pr-8
            text-sm font-medium text-content
            hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50
            transition-colors
          "
        >
          {group.options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
      </div>
      {selectedOption?.description && (
        <div className="text-xs text-tertiary mt-1 truncate">{selectedOption.description}</div>
      )}
    </div>
  );
}

function FilterButtonGroup({ group, variant }: { group: FilterGroup; variant: string }) {
  const styles = variantStyles[variant as keyof typeof variantStyles];

  return (
    <div>
      <label className="block text-xs font-medium text-tertiary mb-2">{group.label}</label>
      <div className="flex flex-wrap gap-2">
        {group.options.map((option) => (
          <button
            key={option.key}
            onClick={() => group.onChange(option.key)}
            title={option.description}
            className={`
              px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200
              ${
                group.value === option.key
                  ? styles.filterColor
                  : 'bg-muted/50 text-content hover:bg-muted hover:scale-105'
              }
            `}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompactControlBar({ config, className = '' }: CompactControlBarProps) {
  const styles = variantStyles[config.variant];
  const visibleGroups = config.filterGroups.filter((group) => group.show !== false);

  return (
    <div className={`bg-surface border border-muted rounded-xl p-4 shadow-sm ${className}`}>
      <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-end">
        {/* Filter Groups */}
        <div className="flex-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleGroups.map((group, idx) => (
              <div key={idx}>
                {/* Use dropdown for options > 4, button group for <= 4 */}
                {group.options.length > 4 ? (
                  <FilterDropdown group={group} />
                ) : (
                  <FilterButtonGroup group={group} variant={config.variant} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        {config.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 lg:flex-shrink-0">
            {config.actions.map((action, idx) => {
              let buttonStyle = 'bg-muted text-content hover:bg-accent transition-colors';

              if (action.variant === 'primary') {
                buttonStyle = styles.primaryColor;
              } else if (action.variant === 'secondary') {
                buttonStyle = styles.secondaryColor;
              } else if (action.variant === 'danger') {
                buttonStyle = 'bg-red-500 text-white hover:bg-red-500/90';
              }

              return (
                <button
                  key={idx}
                  onClick={action.onClick}
                  disabled={action.loading}
                  className={`
                    flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium
                    transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                    hover:scale-105 ${buttonStyle}
                  `}
                >
                  {action.icon && (
                    <action.icon className={`w-4 h-4 ${action.loading ? 'animate-spin' : ''}`} />
                  )}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
