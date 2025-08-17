// apps/client/src/components/dashboard/discovery/PredictionFilters.tsx
import { useState } from 'react';
import type { PredictionFilter } from '../../../hooks/usePredictionDiscovery';

interface PredictionFiltersProps {
  filters: PredictionFilter;
  availableCategories: string[];
  onFiltersChange: (filters: Partial<PredictionFilter>) => void;
  onClearFilters: () => void;
  className?: string;
}

export default function PredictionFilters({
  filters,
  availableCategories,
  onFiltersChange,
  onClearFilters,
  className = '',
}: PredictionFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.timeRemaining !== 'all' ||
    filters.activity !== 'all' ||
    filters.search.length > 0;

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter((c) => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ categories: newCategories });
  };

  const toggleDifficulty = (difficulty: 'easy' | 'medium' | 'hard' | 'expert') => {
    const newDifficulties = filters.difficulties.includes(difficulty)
      ? filters.difficulties.filter((d) => d !== difficulty)
      : [...filters.difficulties, difficulty];
    onFiltersChange({ difficulties: newDifficulties });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'hard':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'expert':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'easy':
        return '🟢';
      case 'medium':
        return '🟡';
      case 'hard':
        return '🟠';
      case 'expert':
        return '🔴';
      default:
        return '⚪';
    }
  };

  return (
    <div className={`bg-background/50 rounded-xl border border-muted ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">🔍</span>
            <h3 className="font-semibold text-content">Filters</h3>
            {hasActiveFilters && (
              <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">Active</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {hasActiveFilters && (
              <button
                onClick={onClearFilters}
                className="text-sm text-tertiary hover:text-primary transition-colors"
              >
                Clear All
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 hover:bg-surface rounded transition-colors"
            >
              <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search predictions..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary transition-colors"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary">
              🔍
            </span>
            {filters.search && (
              <button
                onClick={() => onFiltersChange({ search: '' })}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Filters */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Categories */}
          <div>
            <h4 className="font-medium text-content mb-3">Categories</h4>
            <div className="flex flex-wrap gap-2">
              {availableCategories.map((category) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                    filters.categories.includes(category)
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-content border-muted hover:border-primary/50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <h4 className="font-medium text-content mb-3">Difficulty</h4>
            <div className="grid grid-cols-2 gap-2">
              {(['easy', 'medium', 'hard', 'expert'] as const).map((difficulty) => (
                <button
                  key={difficulty}
                  onClick={() => toggleDifficulty(difficulty)}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                    filters.difficulties.includes(difficulty)
                      ? 'bg-primary text-white border-primary'
                      : `${getDifficultyColor(difficulty)} hover:opacity-80`
                  }`}
                >
                  <span>{getDifficultyIcon(difficulty)}</span>
                  <span className="capitalize">{difficulty}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Time Remaining */}
          <div>
            <h4 className="font-medium text-content mb-3">Time Remaining</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: 'All Time', icon: '⏳' },
                { value: '1h', label: '1 Hour', icon: '⚡' },
                { value: '1d', label: '1 Day', icon: '🌅' },
                { value: '1w', label: '1 Week', icon: '📅' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFiltersChange({ timeRemaining: option.value as any })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                    filters.timeRemaining === option.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-content border-muted hover:border-primary/50'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <h4 className="font-medium text-content mb-3">Activity Level</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'all', label: 'All Levels', icon: '📊' },
                { value: 'high', label: 'High', icon: '🔥' },
                { value: 'medium', label: 'Medium', icon: '📈' },
                { value: 'low', label: 'Low', icon: '📉' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => onFiltersChange({ activity: option.value as any })}
                  className={`px-3 py-2 rounded-lg text-sm border transition-colors flex items-center space-x-2 ${
                    filters.activity === option.value
                      ? 'bg-primary text-white border-primary'
                      : 'bg-surface text-content border-muted hover:border-primary/50'
                  }`}
                >
                  <span>{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Filter Chips */}
      {hasActiveFilters && !isExpanded && (
        <div className="p-4 pt-0">
          <div className="flex flex-wrap gap-2">
            {filters.categories.map((category) => (
              <span
                key={`cat-${category}`}
                className="px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center space-x-1"
              >
                <span>{category}</span>
                <button
                  onClick={() => toggleCategory(category)}
                  className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ✕
                </button>
              </span>
            ))}
            {filters.difficulties.map((difficulty) => (
              <span
                key={`diff-${difficulty}`}
                className="px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center space-x-1"
              >
                <span>
                  {getDifficultyIcon(difficulty)} {difficulty}
                </span>
                <button
                  onClick={() => toggleDifficulty(difficulty)}
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
