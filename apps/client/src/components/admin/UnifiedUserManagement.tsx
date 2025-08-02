import React, { useState, useEffect, useCallback } from 'react';
import UserSearchBar from './UserSearchBar';
import UserDataGrid from './UserDataGrid';
import type { DetailedUser, PaginatedUsers } from '../../api/admin';
import type { PublicBadge } from '@ems/types';
import { listBadges } from '../../api/admin';

interface UnifiedUserManagementProps {
  className?: string;
}

const UnifiedUserManagement: React.FC<UnifiedUserManagementProps> = ({ className = '' }) => {
  const [users, setUsers] = useState<DetailedUser[]>([]);
  const [badges, setBadges] = useState<PublicBadge[]>([]);
  const [paginationInfo, setPaginationInfo] = useState<Omit<PaginatedUsers, 'users'>>({
    totalCount: 0,
    totalPages: 0,
    currentPage: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Load badges on component mount
  useEffect(() => {
    const loadBadges = async () => {
      try {
        const badgeData = await listBadges();
        setBadges(badgeData);
      } catch (error) {
        console.error('Failed to load badges:', error);
        setBadges([]);
      }
    };

    loadBadges();
  }, []);

  const handleSearchResults = useCallback((results: PaginatedUsers) => {
    setUsers(results.users);
    setPaginationInfo({
      totalCount: results.totalCount,
      totalPages: results.totalPages,
      currentPage: results.currentPage,
      hasNextPage: results.hasNextPage,
      hasPreviousPage: results.hasPreviousPage,
    });
  }, []);

  const handleLoadingChange = useCallback((isLoading: boolean) => {
    setLoading(isLoading);
  }, []);

  const handleUserUpdate = useCallback((_userId: number) => {
    // Trigger a refresh of the search results
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleBulkUpdate = useCallback(() => {
    // Trigger a refresh of the search results after bulk operations
    setRefreshTrigger((prev) => prev + 1);
  }, []);

  const formatPaginationInfo = () => {
    if (paginationInfo.totalCount === 0) return 'No users found';

    const start = paginationInfo.currentPage * 25 + 1;
    const end = Math.min((paginationInfo.currentPage + 1) * 25, paginationInfo.totalCount);

    return `Showing ${start}-${end} of ${paginationInfo.totalCount} users`;
  };

  const getPerformanceMetrics = () => {
    const totalBets = users.reduce((sum, user) => sum + (user.stats?.totalBets || 0), 0);
    const totalWagered = users.reduce((sum, user) => sum + (user.stats?.totalWagered || 0), 0);
    const activeUsers = users.filter((user) => user.active).length;
    const adminUsers = users.filter((user) => user.role === 'ADMIN').length;

    return {
      totalBets,
      totalWagered,
      activeUsers,
      adminUsers,
      totalUsers: paginationInfo.totalCount,
    };
  };

  const metrics = getPerformanceMetrics();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Stats */}
      <div className="bg-surface border border-muted rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-content">User Management</h2>
            <p className="text-tertiary">
              Unified interface for managing users, roles, and permissions
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-tertiary">{formatPaginationInfo()}</div>
            {loading && <div className="text-sm text-primary mt-1">Loading...</div>}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-content">
              {metrics.totalUsers.toLocaleString()}
            </div>
            <div className="text-xs text-tertiary">Total Users</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-success">
              {metrics.activeUsers.toLocaleString()}
            </div>
            <div className="text-xs text-tertiary">Active</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-warning">
              {metrics.adminUsers.toLocaleString()}
            </div>
            <div className="text-xs text-tertiary">Admins</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-primary">
              {metrics.totalBets.toLocaleString()}
            </div>
            <div className="text-xs text-tertiary">Total Bets</div>
          </div>
          <div className="bg-muted rounded-lg p-3 text-center">
            <div className="text-lg font-semibold text-accent">
              {metrics.totalWagered.toFixed(0)}
            </div>
            <div className="text-xs text-tertiary">Total Wagered</div>
          </div>
        </div>
      </div>

      {/* Search Interface */}
      <UserSearchBar
        onSearchResults={handleSearchResults}
        onLoadingChange={handleLoadingChange}
        key={refreshTrigger} // Force re-render to refresh search
      />

      {/* Data Grid */}
      <UserDataGrid
        users={users}
        badges={badges}
        onUserUpdate={handleUserUpdate}
        onBulkUpdate={handleBulkUpdate}
        loading={loading}
      />

      {/* Pagination Controls */}
      {paginationInfo.totalPages > 1 && (
        <div className="bg-surface border border-muted rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-tertiary">
              Page {paginationInfo.currentPage + 1} of {paginationInfo.totalPages}
            </div>

            <div className="flex items-center space-x-2">
              <button
                disabled={!paginationInfo.hasPreviousPage}
                className="px-3 py-1 text-sm border border-muted rounded disabled:opacity-50 hover:bg-muted transition"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, paginationInfo.totalPages) }, (_, i) => {
                  const pageNum = paginationInfo.currentPage - 2 + i;
                  if (pageNum < 0 || pageNum >= paginationInfo.totalPages) return null;

                  return (
                    <button
                      key={pageNum}
                      className={`px-3 py-1 text-sm rounded transition ${
                        pageNum === paginationInfo.currentPage
                          ? 'bg-primary text-surface'
                          : 'border border-muted hover:bg-muted'
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              <button
                disabled={!paginationInfo.hasNextPage}
                className="px-3 py-1 text-sm border border-muted rounded disabled:opacity-50 hover:bg-muted transition"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Performance Notes */}
      {users.length > 0 && (
        <div className="bg-muted border border-muted rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-accent">⚡</div>
            <div>
              <div className="text-sm font-medium text-content">Performance Optimized</div>
              <div className="text-xs text-tertiary mt-1">
                This interface uses virtual scrolling and database-level pagination to efficiently
                handle large user datasets. Search results are debounced and cached for optimal
                performance.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedUserManagement;
