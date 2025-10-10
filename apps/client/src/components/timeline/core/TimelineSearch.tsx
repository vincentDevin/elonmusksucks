import React, { useState, useEffect, useCallback, useRef, useDeferredValue } from 'react';
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  ClockIcon,
  ArrowTrendingUpIcon,
  HashtagIcon,
  UserIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
} from '@heroicons/react/24/outline';
import { useDebounce } from '../../../hooks/useDebounce';
import { timelineApi } from '../../../api/timeline';

interface SearchSuggestion {
  id: string;
  type: 'article' | 'post' | 'user' | 'hashtag' | 'recent';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  metadata?: {
    author?: string;
    date?: string;
    engagement?: number;
  };
}

interface TimelineSearchProps {
  onSearch: (query: string, type?: string) => void;
  onSuggestionClick?: (suggestion: SearchSuggestion) => void;
  placeholder?: string;
  className?: string;
}

export const TimelineSearch: React.FC<TimelineSearchProps> = ({
  onSearch,
  onSuggestionClick,
  placeholder = 'Search articles, posts, users, or hashtags...',
  className = '',
}) => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 300);

  // Defer suggestions rendering for better performance
  const deferredSuggestions = useDeferredValue(suggestions);
  const isPending = deferredSuggestions !== suggestions;

  // Helper function to get icon for suggestion type
  const getIconForType = (type: 'article' | 'post' | 'user' | 'hashtag' | 'recent') => {
    switch (type) {
      case 'article':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'post':
        return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      case 'user':
        return <UserIcon className="w-4 h-4" />;
      case 'hashtag':
        return <HashtagIcon className="w-4 h-4" />;
      case 'recent':
        return <ClockIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('timeline-recent-searches');
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        console.error('Failed to load recent searches:', e);
      }
    }
  }, []);

  // Fetch search suggestions based on query
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        // Use the existing axios API pattern
        const data = await timelineApi.getSearchSuggestions(debouncedQuery);
        // Transform API response to match SearchSuggestion interface
        const transformedSuggestions: SearchSuggestion[] =
          data.suggestions?.map((item, index) => {
            // Map API types to SearchSuggestion types
            let suggestionType: 'article' | 'post' | 'user' | 'hashtag' | 'recent' = 'article';
            if (item.type === 'tag') suggestionType = 'hashtag';
            else if (item.type === 'author') suggestionType = 'user';
            else if (item.type === 'article') suggestionType = 'article';
            else if (item.type === 'feed') suggestionType = 'article';

            return {
              // Use numeric ID if available (for authors, articles, etc), otherwise generate string ID
              id: item.id !== undefined ? String(item.id) : `${item.type}-${item.value}-${index}`,
              type: suggestionType,
              title: item.value,
              subtitle: item.count ? `${item.count} items` : undefined,
              icon: getIconForType(suggestionType),
            };
          }) || [];
        setSuggestions(transformedSuggestions);
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        // For now, use mock suggestions
        setSuggestions(getMockSuggestions(debouncedQuery));
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedQuery]);

  // Mock suggestions for development
  const getMockSuggestions = (searchQuery: string): SearchSuggestion[] => {
    const mockData: SearchSuggestion[] = [
      {
        id: '1',
        type: 'article',
        title: `Articles matching "${searchQuery}"`,
        subtitle: '24 articles found',
        icon: <DocumentTextIcon className="w-4 h-4" />,
        metadata: { engagement: 156 },
      },
      {
        id: '2',
        type: 'post',
        title: `Posts about "${searchQuery}"`,
        subtitle: '89 community posts',
        icon: <ChatBubbleLeftRightIcon className="w-4 h-4" />,
        metadata: { engagement: 432 },
      },
      {
        id: '3',
        type: 'hashtag',
        title: `#${searchQuery.replace(/\s+/g, '')}`,
        subtitle: 'Trending hashtag',
        icon: <HashtagIcon className="w-4 h-4" />,
        metadata: { engagement: 1024 },
      },
      {
        id: '4',
        type: 'user',
        title: `Users matching "${searchQuery}"`,
        subtitle: '12 users found',
        icon: <UserIcon className="w-4 h-4" />,
      },
    ];

    return mockData.filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard navigation (use actual suggestions, not deferred, for immediate response)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems =
      suggestions.length + (recentSearches.length > 0 && !query ? recentSearches.length : 0);

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (!query && selectedIndex < recentSearches.length) {
            handleRecentSearch(recentSearches[selectedIndex]);
          } else if (suggestions[selectedIndex]) {
            handleSuggestionClick(suggestions[selectedIndex]);
          }
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  const handleSearch = useCallback(() => {
    if (!query.trim()) return;

    // Save to recent searches
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('timeline-recent-searches', JSON.stringify(updated));

    onSearch(query);
    setIsFocused(false);
  }, [query, recentSearches, onSearch]);

  const handleSuggestionClick = useCallback(
    (suggestion: SearchSuggestion) => {
      if (onSuggestionClick) {
        onSuggestionClick(suggestion);
      } else {
        setQuery(suggestion.title);
        onSearch(suggestion.title, suggestion.type);
      }
      setIsFocused(false);
    },
    [onSearch, onSuggestionClick],
  );

  const handleRecentSearch = useCallback(
    (search: string) => {
      setQuery(search);
      onSearch(search);
      setIsFocused(false);
    },
    [onSearch],
  );

  const clearSearch = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('timeline-recent-searches');
  }, []);

  const showDropdown =
    isFocused &&
    (deferredSuggestions.length > 0 || (recentSearches.length > 0 && !query) || loading);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-5 w-5 text-tertiary" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 bg-surface border border-border rounded-lg
                     text-content placeholder-tertiary focus:outline-none focus:border-primary
                     focus:ring-1 focus:ring-primary transition-all duration-200"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-tertiary
                       hover:text-content transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Suggestions Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-lg
                        shadow-lg overflow-hidden"
        >
          {loading ? (
            <div className="px-4 py-8 text-center">
              <div
                className="inline-block animate-spin rounded-full h-6 w-6
                              border-b-2 border-primary"
              ></div>
              <p className="mt-2 text-sm text-tertiary">Searching...</p>
            </div>
          ) : (
            <>
              {/* Recent Searches */}
              {!query && recentSearches.length > 0 && (
                <div>
                  <div
                    className="px-4 py-2 flex justify-between items-center
                                  border-b border-border bg-primary/10"
                  >
                    <span className="text-xs font-medium text-tertiary uppercase">
                      Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-xs text-tertiary hover:text-content transition-colors"
                    >
                      Clear all
                    </button>
                  </div>
                  {recentSearches.map((search, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearch(search)}
                      className={`w-full px-4 py-3 flex items-center space-x-3
                                 hover:bg-primary/10 transition-colors text-left
                                 ${selectedIndex === index ? 'bg-primary/10' : ''}`}
                    >
                      <ClockIcon className="w-4 h-4 text-tertiary flex-shrink-0" />
                      <span className="text-sm text-content truncate">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Search Suggestions */}
              {deferredSuggestions.length > 0 && (
                <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
                  {query && (
                    <div className="px-4 py-2 border-b border-border bg-primary/10 flex items-center justify-between">
                      <span className="text-xs font-medium text-tertiary uppercase">
                        Suggestions
                      </span>
                      {isPending && <span className="text-xs text-tertiary">Updating...</span>}
                    </div>
                  )}
                  {deferredSuggestions.map((suggestion, index) => {
                    const actualIndex =
                      !query && recentSearches.length > 0 ? index + recentSearches.length : index;

                    return (
                      <button
                        key={suggestion.id}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className={`w-full px-4 py-3 flex items-center space-x-3
                                   hover:bg-primary/10 transition-colors text-left
                                   ${selectedIndex === actualIndex ? 'bg-primary/10' : ''}`}
                      >
                        <div
                          className={`flex-shrink-0 ${
                            suggestion.type === 'hashtag'
                              ? 'text-primary'
                              : suggestion.type === 'user'
                                ? 'text-secondary'
                                : 'text-tertiary'
                          }`}
                        >
                          {suggestion.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-content truncate">
                            {suggestion.title}
                          </div>
                          {suggestion.subtitle && (
                            <div className="text-xs text-tertiary truncate">
                              {suggestion.subtitle}
                            </div>
                          )}
                        </div>
                        {suggestion.metadata?.engagement && (
                          <div className="flex items-center space-x-1 text-xs text-tertiary">
                            <ArrowTrendingUpIcon className="w-3 h-3" />
                            <span>{suggestion.metadata.engagement}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Quick Search Tips */}
              {!query && recentSearches.length === 0 && (
                <div className="px-4 py-3 space-y-2">
                  <p className="text-xs font-medium text-tertiary uppercase">Search Tips</p>
                  <div className="space-y-1 text-xs text-tertiary">
                    <p>• Use @ to search for users</p>
                    <p>• Use # to search for hashtags</p>
                    <p>• Add "in:articles" or "in:posts" to filter</p>
                    <p>• Use quotes for exact phrases</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default TimelineSearch;
