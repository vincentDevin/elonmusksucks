// apps/client/src/components/dashboard/activity/ActivityFilters.tsx
import type { ActivityFilter, ActivityItem } from '../../../hooks/useActivityStream';

interface ActivityFiltersProps {
  filters: ActivityFilter;
  onFiltersChange: (filters: Partial<ActivityFilter>) => void;
  activityCounts: {
    personal: number;
    social: number;
    platform: number;
    total: number;
  };
  className?: string;
}

const ACTIVITY_TYPE_LABELS: Record<ActivityItem['type'], string> = {
  bet_placed: 'Bets Placed',
  bet_won: 'Bets Won',
  bet_lost: 'Bets Lost',
  parlay_placed: 'Parlays Placed',
  parlay_won: 'Parlays Won',
  parlay_lost: 'Parlays Lost',
  prediction_created: 'Predictions Created',
  prediction_resolved: 'Predictions Resolved',
  achievement_earned: 'Achievements',
  rank_changed: 'Rank Changes',
  big_bet: 'Big Bets',
  big_win: 'Big Wins',
  friend_activity: 'Friend Activity',
  trending_prediction: 'Trending',
  hot_market: 'Hot Markets',
};

export default function ActivityFilters({
  filters,
  onFiltersChange,
  activityCounts,
  className = '',
}: ActivityFiltersProps) {
  const toggleActivityType = (type: ActivityItem['type']) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onFiltersChange({ types: newTypes });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      types: [],
      timeframe: '24h',
      showPersonal: true,
      showSocial: true,
      showPlatform: true,
    });
  };

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.timeframe !== '24h' ||
    !filters.showPersonal ||
    !filters.showSocial ||
    !filters.showPlatform;

  return (
    <div className={`p-4 space-y-4 ${className}`}>
      {/* Quick Category Toggles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-content text-sm">Activity Sources</h4>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-xs text-primary hover:text-primary/80 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => onFiltersChange({ showPersonal: !filters.showPersonal })}
            className={`p-2 rounded-lg text-sm border transition-colors flex items-center justify-center space-x-2 ${
              filters.showPersonal
                ? 'bg-blue-100 text-blue-800 border-blue-200'
                : 'bg-surface text-tertiary border-muted hover:border-primary/50'
            }`}
          >
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Personal ({activityCounts.personal})</span>
          </button>

          <button
            onClick={() => onFiltersChange({ showSocial: !filters.showSocial })}
            className={`p-2 rounded-lg text-sm border transition-colors flex items-center justify-center space-x-2 ${
              filters.showSocial
                ? 'bg-green-100 text-green-800 border-green-200'
                : 'bg-surface text-tertiary border-muted hover:border-primary/50'
            }`}
          >
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Social ({activityCounts.social})</span>
          </button>

          <button
            onClick={() => onFiltersChange({ showPlatform: !filters.showPlatform })}
            className={`p-2 rounded-lg text-sm border transition-colors flex items-center justify-center space-x-2 ${
              filters.showPlatform
                ? 'bg-orange-100 text-orange-800 border-orange-200'
                : 'bg-surface text-tertiary border-muted hover:border-primary/50'
            }`}
          >
            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
            <span>Platform ({activityCounts.platform})</span>
          </button>
        </div>
      </div>

      {/* Time Frame */}
      <div>
        <h4 className="font-medium text-content text-sm mb-3">Time Frame</h4>
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: '1h', label: '1 Hour' },
            { value: '6h', label: '6 Hours' },
            { value: '24h', label: '24 Hours' },
            { value: '7d', label: '7 Days' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => onFiltersChange({ timeframe: option.value as any })}
              className={`p-2 rounded-lg text-sm border transition-colors ${
                filters.timeframe === option.value
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-content border-muted hover:border-primary/50'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity Types */}
      <div>
        <h4 className="font-medium text-content text-sm mb-3">
          Activity Types {filters.types.length > 0 && `(${filters.types.length})`}
        </h4>
        <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
          {Object.entries(ACTIVITY_TYPE_LABELS).map(([type, label]) => (
            <button
              key={type}
              onClick={() => toggleActivityType(type as ActivityItem['type'])}
              className={`w-full p-2 rounded-lg text-sm border transition-colors text-left ${
                filters.types.includes(type as ActivityItem['type'])
                  ? 'bg-primary text-white border-primary'
                  : 'bg-surface text-content border-muted hover:border-primary/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Filters Summary */}
      {filters.types.length > 0 && (
        <div className="pt-3 border-t border-muted">
          <div className="flex flex-wrap gap-2">
            {filters.types.map((type) => (
              <span
                key={type}
                className="px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center space-x-1"
              >
                <span>{ACTIVITY_TYPE_LABELS[type]}</span>
                <button
                  onClick={() => toggleActivityType(type)}
                  className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
