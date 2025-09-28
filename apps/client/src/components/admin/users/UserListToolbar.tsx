import React, { useState, useEffect, useRef } from 'react';
import type { UserSearchParams } from '../../../api/admin';
import type { Role } from '@ems/types';

interface UserListToolbarProps {
  onSearch: (params: UserSearchParams) => void;
  loading: boolean;
  totalCount: number;
  activeCount: number;
  bannedCount: number;
  className?: string;
}

interface FilterChip {
  id: string;
  label: string;
  active: boolean;
  value: Role | string;
}

const UserListToolbar: React.FC<UserListToolbarProps> = ({
  onSearch,
  loading,
  totalCount,
  activeCount,
  bannedCount,
  className = '',
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'banned'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt' | 'role'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch();
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchText, selectedRoles, statusFilter, sortBy, sortOrder]);

  const performSearch = () => {
    const params: UserSearchParams = {
      page: 0,
      limit: 25,
      sortBy,
      sortOrder,
    };

    if (searchText.trim()) {
      params.search = searchText.trim();
    }

    if (selectedRoles.length > 0) {
      params.role = selectedRoles.map((r) => r.toString());
    }

    switch (statusFilter) {
      case 'active':
        params.active = true;
        break;
      case 'inactive':
        params.active = false;
        break;
      case 'banned':
        params.bannedOnly = true;
        break;
    }

    onSearch(params);
  };

  const handleRoleToggle = (role: Role) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleClearFilters = () => {
    setSearchText('');
    setSelectedRoles([]);
    setStatusFilter('all');
    setSortBy('createdAt');
    setSortOrder('desc');
  };

  const getFilterChips = (): FilterChip[] => {
    const chips: FilterChip[] = [];

    selectedRoles.forEach((role) => {
      chips.push({
        id: `role-${role}`,
        label: role,
        active: true,
        value: role,
      });
    });

    if (statusFilter !== 'all') {
      chips.push({
        id: 'status',
        label: statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1),
        active: true,
        value: statusFilter,
      });
    }

    return chips;
  };

  const removeFilterChip = (chipId: string) => {
    if (chipId.startsWith('role-')) {
      const role = chipId.replace('role-', '') as Role;
      setSelectedRoles((prev) => prev.filter((r) => r !== role));
    } else if (chipId === 'status') {
      setStatusFilter('all');
    }
  };

  const filterChips = getFilterChips();

  return (
    <div className={`bg-surface border border-muted rounded-lg p-4 space-y-4 ${className}`}>
      {/* Top Row: Search + Stats */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full px-4 py-2 pr-10 border border-muted rounded-lg bg-surface text-content focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <div className="absolute right-3 top-1/2 transform -y-1/2">
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-tertiary">🔍</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-lg">
            <span className="text-sm text-tertiary">Total:</span>
            <span className="text-sm font-medium text-content">{totalCount.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 bg-success/10 rounded-lg">
            <span className="text-sm text-success">Active:</span>
            <span className="text-sm font-medium text-success">{activeCount.toLocaleString()}</span>
          </div>
          {bannedCount > 0 && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-error/10 rounded-lg">
              <span className="text-sm text-error">Banned:</span>
              <span className="text-sm font-medium text-error">{bannedCount.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Filters + Sort */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          {/* Role Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-tertiary">Role:</span>
            <div className="flex space-x-1">
              {(['USER', 'ADMIN'] as Role[]).map((role) => (
                <button
                  key={role}
                  onClick={() => handleRoleToggle(role)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    selectedRoles.includes(role)
                      ? 'bg-primary text-surface'
                      : 'bg-muted text-content hover:bg-muted/80'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-tertiary">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1 text-xs border border-muted rounded bg-surface text-content"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="banned">Banned</option>
            </select>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-tertiary">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 text-xs border border-muted rounded bg-surface text-content"
            >
              <option value="createdAt">Join Date</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
            </select>
            <button
              onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
              className="px-2 py-1 text-xs bg-muted text-content rounded hover:bg-muted/80 transition-colors"
              title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>

          {/* Clear Filters */}
          {(filterChips.length > 0 || searchText) && (
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 text-xs bg-secondary text-surface rounded hover:opacity-90 transition-opacity"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Chips */}
      {filterChips.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-tertiary">Filters:</span>
          <div className="flex flex-wrap gap-2">
            {filterChips.map((chip) => (
              <div
                key={chip.id}
                className="flex items-center space-x-1 px-2 py-1 bg-primary text-surface rounded text-xs"
              >
                <span>{chip.label}</span>
                <button
                  onClick={() => removeFilterChip(chip.id)}
                  className="text-surface/80 hover:text-surface transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserListToolbar;
