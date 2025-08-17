import React, { useState, useEffect, useRef, useCallback } from 'react';
import { searchUsers } from '../../api/admin';
import type { UserSearchParams, DetailedUser } from '../../api/admin';
import type { Role } from '@ems/types';

interface UserSearchBarProps {
  onSearchResults: (results: {
    users: DetailedUser[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }) => void;
  onLoadingChange: (loading: boolean) => void;
  className?: string;
}

const UserSearchBar: React.FC<UserSearchBarProps> = ({
  onSearchResults,
  onLoadingChange,
  className = '',
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [activeFilter, setActiveFilter] = useState<boolean | undefined>(undefined);
  const [bannedFilter, setBannedFilter] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt' | 'muskBucks' | 'role'>(
    'createdAt',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<DetailedUser[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const roles: Role[] = ['USER', 'ADMIN'];
  const limit = 25;

  // Debounced search function
  const performSearch = useCallback(
    async (params: Partial<UserSearchParams> = {}) => {
      try {
        onLoadingChange(true);
        const searchParams: UserSearchParams = {
          search: searchText.trim() || undefined,
          role: selectedRoles.length > 0 ? selectedRoles.map((r) => r.toString()) : undefined,
          active: activeFilter,
          bannedOnly: bannedFilter,
          page: currentPage,
          limit,
          sortBy,
          sortOrder,
          ...params,
        };

        const results = await searchUsers(searchParams);
        onSearchResults(results);
      } catch (error) {
        console.error('Search failed:', error);
        onSearchResults({
          users: [],
          totalCount: 0,
          totalPages: 0,
          currentPage: 0,
          hasNextPage: false,
          hasPreviousPage: false,
        });
      } finally {
        onLoadingChange(false);
      }
    },
    [
      searchText,
      selectedRoles,
      activeFilter,
      bannedFilter,
      currentPage,
      sortBy,
      sortOrder,
      onLoadingChange,
      onSearchResults,
    ],
  );

  // Debounced suggestions for autocomplete
  const fetchSuggestions = async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      const results = await searchUsers({
        search: query,
        page: 0,
        limit: 5,
        sortBy: 'name',
        sortOrder: 'asc',
      });
      setSuggestions(results.users);
      setShowSuggestions(true);
    } catch (error) {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Effect for main search with debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(0); // Reset to first page on new search
      performSearch({ page: 0 });
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, selectedRoles, activeFilter, bannedFilter, sortBy, sortOrder, performSearch]);

  // Effect for pagination
  useEffect(() => {
    performSearch({});
  }, [currentPage, performSearch]);

  // Effect for suggestions with debouncing
  useEffect(() => {
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    suggestionTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(searchText);
    }, 200);

    return () => {
      if (suggestionTimeoutRef.current) {
        clearTimeout(suggestionTimeoutRef.current);
      }
    };
  }, [searchText]);

  const handleSuggestionClick = (user: DetailedUser) => {
    setSearchText(user.name);
    setShowSuggestions(false);
  };

  const handleRoleToggle = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedRoles([]);
    setActiveFilter(undefined);
    setBannedFilter(false);
    setSortBy('createdAt');
    setSortOrder('desc');
    setCurrentPage(0);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div className={`bg-surface border border-muted rounded-lg p-4 ${className}`}>
      {/* Search Input with Autocomplete */}
      <div className="relative mb-4">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onFocus={() =>
                searchText.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)
              }
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              className="w-full px-4 py-2 border border-muted rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />

            {/* Autocomplete Suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 mt-1 bg-surface border border-muted rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {suggestions.map((user) => (
                  <div
                    key={user.id}
                    className="px-4 py-2 hover:bg-muted cursor-pointer border-b border-muted last:border-b-0"
                    onClick={() => handleSuggestionClick(user)}
                  >
                    <div className="font-medium text-content">{user.name}</div>
                    <div className="text-sm text-tertiary">{user.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              showFilters
                ? 'bg-primary text-surface border-primary'
                : 'bg-surface text-content border-muted hover:bg-muted'
            }`}
          >
            Filters
          </button>

          <button
            onClick={handleClearFilters}
            className="px-4 py-2 bg-secondary text-surface rounded-lg hover:opacity-90 transition-opacity"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="bg-muted rounded-lg p-4 mb-4 space-y-4">
          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-content mb-2">Roles</label>
            <div className="flex flex-wrap gap-2">
              {roles.map((role) => (
                <label key={role} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-muted"
                  />
                  <span className="text-sm text-content">{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Status Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Active Status</label>
              <select
                value={activeFilter === undefined ? '' : activeFilter ? 'true' : 'false'}
                onChange={(e) =>
                  setActiveFilter(e.target.value === '' ? undefined : e.target.value === 'true')
                }
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="">All Users</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">Ban Status</label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bannedFilter}
                  onChange={(e) => setBannedFilter(e.target.checked)}
                  className="rounded border-muted"
                />
                <span className="text-sm text-content">Show banned users only</span>
              </label>
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-content mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="createdAt">Join Date</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="muskBucks">Balance</option>
                <option value="role">Role</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-content mb-2">Sort Order</label>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 border border-muted rounded-lg bg-surface text-content"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearchBar;
