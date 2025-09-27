// apps/client/src/components/dashboard/discovery/PredictionFilters.tsx
import { useState, useEffect, useRef } from 'react';
import type { PredictionFilter } from '../../hooks/usePredictionDiscovery';
import { usePredictionMarket } from '../../contexts/PredictionContext';

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
  const { predictions } = usePredictionMarket();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recentPredictionSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Generate search suggestions based on current input
  useEffect(() => {
    if (!filters.search || filters.search.length < 2) {
      setSearchSuggestions([]);
      return;
    }

    const searchLower = filters.search.toLowerCase();
    const suggestions: string[] = [];

    // Suggest prediction titles
    predictions?.forEach((prediction) => {
      if (prediction.title.toLowerCase().includes(searchLower)) {
        suggestions.push(prediction.title);
      }
    });

    // Suggest categories
    availableCategories.forEach((category) => {
      if (category.toLowerCase().includes(searchLower)) {
        suggestions.push(`Category: ${category}`);
      }
    });

    // Add popular search terms
    const popularTerms = [
      'AI',
      'crypto',
      'election',
      'sports',
      'tech',
      'market',
      'climate',
      'politics',
      'economy',
      'entertainment',
      'gaming',
      'science',
    ];

    popularTerms.forEach((term) => {
      if (term.toLowerCase().includes(searchLower)) {
        suggestions.push(term);
      }
    });

    // Remove duplicates and limit to 8 suggestions
    const uniqueSuggestions = [...new Set(suggestions)].slice(0, 8);
    setSearchSuggestions(uniqueSuggestions);
  }, [filters.search, predictions, availableCategories]);

  // Handle clicking outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearchChange = (value: string) => {
    onFiltersChange({ search: value });
    setShowSuggestions(value.length > 0);
  };

  const handleSearchSubmit = (searchTerm: string) => {
    if (searchTerm.trim()) {
      // Add to recent searches
      const newRecent = [searchTerm, ...recentSearches.filter((s) => s !== searchTerm)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem('recentPredictionSearches', JSON.stringify(newRecent));

      // Apply search
      if (searchTerm.startsWith('Category: ')) {
        const category = searchTerm.replace('Category: ', '');
        onFiltersChange({ search: '', categories: [category] });
      } else {
        onFiltersChange({ search: searchTerm });
      }
    }
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleSearchSubmit(suggestion);
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentPredictionSearches');
  };

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.difficulties.length > 0 ||
    filters.timeRemaining !== 'all' ||
    filters.activity !== 'all' ||
    filters.status !== 'all' ||
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

        {/* Advanced Search Bar */}
        <div className="mt-3 relative">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search predictions, categories, topics..."
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() =>
                setShowSuggestions(filters.search.length > 0 || recentSearches.length > 0)
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearchSubmit(filters.search);
                }
              }}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-muted rounded-lg text-content placeholder-tertiary focus:outline-none focus:border-primary transition-colors"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-tertiary">
              🔍
            </span>
            {filters.search && (
              <button
                onClick={() => {
                  onFiltersChange({ search: '' });
                  setShowSuggestions(false);
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-tertiary hover:text-content"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Suggestions Dropdown */}
          {showSuggestions && (filters.search.length > 0 || recentSearches.length > 0) && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-0 mt-1 bg-surface border border-muted rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            >
              {/* Recent Searches */}
              {recentSearches.length > 0 && filters.search.length === 0 && (
                <>
                  <div className="px-3 py-2 border-b border-muted flex items-center justify-between">
                    <span className="text-sm font-medium text-tertiary">Recent Searches</span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-tertiary hover:text-content"
                    >
                      Clear
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(search)}
                      className="w-full px-3 py-2 text-left text-content hover:bg-muted transition-colors flex items-center space-x-2"
                    >
                      <span className="text-tertiary">🕒</span>
                      <span>{search}</span>
                    </button>
                  ))}
                </>
              )}

              {/* Live Suggestions */}
              {searchSuggestions.length > 0 && filters.search.length > 0 && (
                <>
                  {recentSearches.length > 0 && (
                    <div className="px-3 py-1 border-b border-muted">
                      <span className="text-xs font-medium text-tertiary">Suggestions</span>
                    </div>
                  )}
                  {searchSuggestions.map((suggestion, index) => {
                    const isCategory = suggestion.startsWith('Category: ');
                    return (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full px-3 py-2 text-left text-content hover:bg-muted transition-colors flex items-center space-x-2"
                      >
                        <span className="text-tertiary">{isCategory ? '📁' : '🔍'}</span>
                        <span className="flex-1 truncate">{suggestion}</span>
                        {isCategory && (
                          <span className="text-xs text-primary bg-primary/10 px-2 py-1 rounded">
                            Category
                          </span>
                        )}
                      </button>
                    );
                  })}
                </>
              )}

              {/* No suggestions */}
              {searchSuggestions.length === 0 && recentSearches.length === 0 && (
                <div className="px-3 py-4 text-center text-tertiary">
                  <div className="text-2xl mb-2">🤔</div>
                  <p className="text-sm">No suggestions available</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* View Tabs (Always Visible) */}
      <div className="px-4 py-3 border-t border-muted">
        <h4 className="font-medium text-content mb-3">View</h4>
        <div className="flex flex-wrap gap-2">
          {[
            {
              value: 'open',
              label: 'Live',
              icon: '🎯',
              description: 'Active predictions you can bet on',
            },
            {
              value: 'all',
              label: 'All',
              icon: '📋',
              description: 'All predictions regardless of status',
            },
            {
              value: 'pending',
              label: 'Review Queue',
              icon: '⏳',
              description: 'Awaiting approval or resolution',
              badge: 'pending',
            },
            {
              value: 'expired',
              label: 'Action Needed',
              icon: '⏰',
              description: 'Expired, awaiting resolution',
            },
            {
              value: 'resolved',
              label: 'Historical',
              icon: '🏁',
              description: 'Completed predictions',
            },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFiltersChange({ status: tab.value as any })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                filters.status === tab.value
                  ? 'bg-primary text-white shadow-md scale-105'
                  : 'bg-surface text-content hover:bg-surface/80 hover:scale-105 border border-muted'
              }`}
              title={tab.description}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-tertiary mt-2">
          {filters.status === 'open' && 'Showing predictions available for betting'}
          {filters.status === 'all' && 'Showing all predictions in every status'}
          {filters.status === 'pending' && 'Showing predictions awaiting moderator approval'}
          {filters.status === 'expired' && 'Showing expired predictions needing resolution'}
          {filters.status === 'resolved' && 'Showing completed predictions with results'}
        </p>
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
            {filters.status !== 'all' && (
              <span className="px-2 py-1 bg-primary text-white text-xs rounded-full flex items-center space-x-1">
                <span>
                  {filters.status === 'open' && '🟢'}
                  {filters.status === 'pending' && '🟡'}
                  {filters.status === 'expired' && '🟠'}
                  {filters.status === 'resolved' && '✅'} {filters.status}
                </span>
                <button
                  onClick={() => onFiltersChange({ status: 'all' })}
                  className="hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center"
                >
                  ✕
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
