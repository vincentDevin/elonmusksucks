import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MagnifyingGlassIcon, XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';

interface TimelineSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
  initialValue?: string;
}

export const TimelineSearch: React.FC<TimelineSearchProps> = ({
  onSearch,
  placeholder = 'Search articles and posts... (use @ for users, # for hashtags)',
  className = '',
  initialValue = '',
}) => {
  const [query, setQuery] = useState(initialValue);
  const [isFocused, setIsFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!query && recentSearches.length === 0) return;

    const totalItems = !query ? recentSearches.length : 0;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (totalItems > 0) {
          setSelectedIndex((prev) => (prev + 1) % totalItems);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (totalItems > 0) {
          setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
        }
        break;
      case 'Enter':
        e.preventDefault();
        if (!query && selectedIndex >= 0 && selectedIndex < recentSearches.length) {
          handleRecentSearch(recentSearches[selectedIndex]);
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
    if (!query.trim()) {
      // If empty query, clear search
      onSearch('');
      return;
    }

    // Save to recent searches
    const updated = [query, ...recentSearches.filter((s) => s !== query)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('timeline-recent-searches', JSON.stringify(updated));

    onSearch(query);
    setIsFocused(false);
  }, [query, recentSearches, onSearch]);

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
    onSearch('');
    inputRef.current?.focus();
  }, [onSearch]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    localStorage.removeItem('timeline-recent-searches');
  }, []);

  const showDropdown = isFocused && recentSearches.length > 0 && !query;

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <MagnifyingGlassIcon className="h-4 w-4 text-tertiary" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // Trigger search on blur if query changed
            if (e.target.value !== initialValue) {
              handleSearch();
            }
          }}
          placeholder={placeholder}
          className="w-full pl-9 pr-9 py-1.5 text-sm bg-surface border border-border rounded
                     text-content placeholder-tertiary focus:outline-none focus:border-primary
                     focus:ring-1 focus:ring-primary transition-all duration-200"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-tertiary
                       hover:text-content transition-colors"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Recent Searches Dropdown */}
      {showDropdown && (
        <div
          className="absolute z-50 w-full mt-2 bg-surface border border-border rounded-lg
                        shadow-lg overflow-hidden"
        >
          <div>
            <div
              className="px-4 py-2 flex justify-between items-center
                          border-b border-border bg-primary/5"
            >
              <span className="text-xs font-medium text-tertiary uppercase">Recent Searches</span>
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
        </div>
      )}
    </div>
  );
};

export default TimelineSearch;
