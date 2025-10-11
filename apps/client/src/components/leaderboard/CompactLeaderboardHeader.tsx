import React from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import type {
  LeaderboardVariant,
  LeaderboardHeaderStats,
  ControlBarConfig,
  FilterGroup,
} from './types';

interface TabConfig {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface CompactLeaderboardHeaderProps {
  variant: LeaderboardVariant;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  stats?: LeaderboardHeaderStats;
  isLoading?: boolean;

  // Tab navigation
  tabs: TabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;

  // Control bar
  controlBarConfig: ControlBarConfig;
}

const variantStyles = {
  betting: {
    iconColor: 'text-primary',
    titleColor: 'text-primary',
    bgGradient: 'from-primary/5 to-primary/10',
    borderColor: 'border-primary/20',
    tabActiveStyle: 'bg-primary text-white shadow-lg',
    tabHoverStyle: 'bg-surface text-content hover:bg-accent hover:text-primary',
    filterColor: 'bg-primary text-white',
    primaryColor: 'bg-primary text-white hover:bg-primary/90',
    secondaryColor: 'bg-secondary text-white hover:bg-secondary/90',
  },
  pong: {
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-500',
    bgGradient: 'from-blue-500/5 to-blue-500/10',
    borderColor: 'border-blue-500/20',
    tabActiveStyle: 'bg-blue-500 text-white shadow-lg',
    tabHoverStyle: 'bg-surface text-content hover:bg-blue-500/10 hover:text-blue-500',
    filterColor: 'bg-blue-500 text-white',
    primaryColor: 'bg-blue-500 text-white hover:bg-blue-500/90',
    secondaryColor: 'bg-blue-600 text-white hover:bg-blue-600/90',
  },
  shame: {
    iconColor: 'text-red-500',
    titleColor: 'text-red-500',
    bgGradient: 'from-red-500/5 to-red-500/10',
    borderColor: 'border-red-500/20',
    tabActiveStyle: 'bg-red-500 text-white shadow-lg',
    tabHoverStyle: 'bg-surface text-content hover:bg-red-50 hover:text-red-600',
    filterColor: 'bg-red-500 text-white',
    primaryColor: 'bg-red-500 text-white hover:bg-red-500/90',
    secondaryColor: 'bg-red-600 text-white hover:bg-red-600/90',
  },
};

function FilterDropdown({ group }: { group: FilterGroup }) {
  return (
    <div className="relative min-w-[160px]">
      <label className="block text-xs font-medium text-tertiary mb-1">{group.label}</label>
      <div className="relative">
        <select
          value={group.value}
          onChange={(e) => group.onChange(e.target.value)}
          className="appearance-none bg-surface border border-muted rounded-md px-3 py-2 pr-8 text-sm font-medium text-content w-full hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        >
          {group.options.map((option) => (
            <option key={option.key} value={option.key}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-tertiary pointer-events-none" />
      </div>
    </div>
  );
}

function FilterButtonGroup({ group, variant }: { group: FilterGroup; variant: string }) {
  const styles = variantStyles[variant as keyof typeof variantStyles];

  return (
    <div className="min-w-[160px]">
      <label className="block text-xs font-medium text-tertiary mb-1">{group.label}</label>
      <div className="flex flex-wrap gap-2">
        {group.options.map((option) => (
          <button
            key={option.key}
            onClick={() => group.onChange(option.key)}
            title={option.description}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
              group.value === option.key
                ? styles.filterColor
                : 'bg-muted/50 text-content hover:bg-muted hover:shadow-sm'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function CompactLeaderboardHeader({
  variant,
  title,
  subtitle,
  icon: Icon,
  stats,
  isLoading = false,
  tabs,
  activeTab,
  onTabChange,
  controlBarConfig,
}: CompactLeaderboardHeaderProps) {
  const styles = variantStyles[variant];
  const visibleGroups = controlBarConfig.filterGroups.filter((group) => group.show !== false);

  return (
    <div
      className={`bg-gradient-to-r ${styles.bgGradient} border ${styles.borderColor} rounded-xl overflow-hidden`}
    >
      {/* Top Section: Title, Icon, and Key Stats */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Left: Title and Icon */}
          <div className="flex items-center space-x-3">
            <Icon className={`w-8 h-8 ${styles.iconColor} flex-shrink-0`} />
            <div>
              <h1 className={`text-xl font-bold ${styles.titleColor}`}>{title}</h1>
              <p className="text-sm text-tertiary">{subtitle}</p>
            </div>
          </div>

          {/* Right: Key Stats (horizontal layout) */}
          {stats && (
            <div className="flex items-center space-x-6">
              {/* Primary Stat */}
              <div className="text-center">
                <div className="text-lg font-bold text-content">
                  {isLoading ? (
                    <div className="h-6 bg-muted rounded animate-pulse w-16" />
                  ) : (
                    stats.primary.value
                  )}
                </div>
                <div className="text-xs text-tertiary">{stats.primary.label}</div>
              </div>

              {/* Top 2-3 Secondary Stats */}
              {stats.secondary.slice(0, 3).map((stat, idx) => (
                <div key={idx} className="text-center">
                  <div className="text-base font-semibold text-content">
                    {isLoading ? (
                      <div className="h-5 bg-muted rounded animate-pulse w-12" />
                    ) : (
                      stat.value
                    )}
                  </div>
                  <div className="text-xs text-tertiary">{stat.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation Row */}
      <div className="border-t border-muted/50 bg-surface/20 px-4 py-2">
        <div className="grid grid-cols-3 gap-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-md font-medium text-sm transition-all duration-200 ${
                  isActive ? styles.tabActiveStyle : styles.tabHoverStyle
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls Row */}
      {(visibleGroups.length > 0 || controlBarConfig.actions.length > 0) && (
        <div className="border-t border-muted/50 bg-surface/30 px-4 py-3">
          <div
            className={`flex items-center gap-4 ${controlBarConfig.actions.length > 0 ? 'justify-between' : 'justify-center'}`}
          >
            {/* Filter Controls */}
            {visibleGroups.length > 0 && (
              <div className="flex items-end flex-wrap gap-4">
                {visibleGroups.map((group, idx) => (
                  <div key={idx}>
                    {group.options.length > 8 ? (
                      <FilterDropdown group={group} />
                    ) : (
                      <FilterButtonGroup group={group} variant={variant} />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Right: Action Buttons */}
            {controlBarConfig.actions.length > 0 && (
              <div className="flex space-x-2 ml-auto">
                {controlBarConfig.actions.map((action, idx) => {
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
                      className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyle}`}
                    >
                      {action.icon && (
                        <action.icon
                          className={`w-4 h-4 ${action.loading ? 'animate-spin' : ''}`}
                        />
                      )}
                      <span>{action.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
