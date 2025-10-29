import React, { useState, useEffect } from 'react';
import { listBadges, searchUsers } from '../../../api/admin';
import { REDIS_CHANNELS, type PublicBadge, type UserSearchParams, type Role } from '@ems/types';
import { useEventBusCore } from '../../../contexts/EventBusCoreContext';
import UserListToolbar from './UserListToolbar';
import CompactUserList, { type CompactUser } from './CompactUserList';
import UserDetailsModal from './UserDetailsModal';
import DefaultAvatarModal from './modals/DefaultAvatarModal';

interface UserManagementProps {
  className?: string;
}

// Simple stats for toolbar
interface UserStats {
  totalCount: number;
  activeCount: number;
  bannedCount: number;
}

const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [users, setUsers] = useState<CompactUser[]>([]);
  const [_badges, setBadges] = useState<PublicBadge[]>([]);
  const [stats, setStats] = useState<UserStats>({
    totalCount: 0,
    activeCount: 0,
    bannedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<number>>(new Set());
  const [hasMore, setHasMore] = useState(false);
  const [currentSearchParams, setCurrentSearchParams] = useState<UserSearchParams>({
    page: 0,
    limit: 25,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Modal state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDefaultAvatarModal, setShowDefaultAvatarModal] = useState(false);

  const { subscribe } = useEventBusCore();

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
    performSearch(currentSearchParams); // Initial load
  }, []);

  // Perform search with minimal data requirements
  const performSearch = async (params: UserSearchParams, append = false) => {
    setLoading(true);
    try {
      const results = await searchUsers(params);

      // Convert to compact user format
      const compactUsers: CompactUser[] = results.users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role as Role,
        active: user.active,
        createdAt: user.createdAt.toString(),
        avatarUrl: user.avatarUrl || null,
        banStatus: user.banStatus || undefined,
      }));

      if (append) {
        setUsers((prev) => [...prev, ...compactUsers]);
      } else {
        setUsers(compactUsers);
        setSelectedUsers(new Set()); // Clear selection on new search
      }

      setHasMore(results.hasNextPage);
      setStats({
        totalCount: results.totalCount,
        activeCount: compactUsers.filter((u) => u.active && !u.banStatus?.isBanned).length,
        bannedCount: compactUsers.filter((u) => u.banStatus?.isBanned).length,
      });

      setCurrentSearchParams(params);
    } catch (error) {
      console.error('Search failed:', error);
      if (!append) {
        setUsers([]);
        setStats({ totalCount: 0, activeCount: 0, bannedCount: 0 });
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle search from toolbar
  const handleSearch = (params: UserSearchParams) => {
    performSearch(params, false);
  };

  // Handle load more
  const handleLoadMore = () => {
    const nextPage = Math.floor(users.length / currentSearchParams.limit);
    const nextParams = { ...currentSearchParams, page: nextPage };
    performSearch(nextParams, true);
  };

  // User selection handlers
  const handleUserSelect = (userId: number, selected: boolean) => {
    setSelectedUsers((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(userId);
      } else {
        newSet.delete(userId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  // User update handler
  const handleUserUpdate = (_userId: number) => {
    // Refresh the current search to show updated data
    performSearch(currentSearchParams, false);
  };

  // Modal handlers
  const handleShowDetails = (userId: number) => {
    setSelectedUserId(userId);
    setShowDetailsModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailsModal(false);
    setSelectedUserId(null);
  };

  // Listen for real-time updates
  useEffect(() => {
    const handleUserUpdate = () => {
      // Refresh current search when user updates occur
      performSearch(currentSearchParams, false);
    };

    const unsubscribers = [
      subscribe(REDIS_CHANNELS.MODERATION_USER_BAN, handleUserUpdate),
      subscribe(REDIS_CHANNELS.MODERATION_USER_UNBAN, handleUserUpdate),
      subscribe(REDIS_CHANNELS.MODERATION_USER_MUTE, handleUserUpdate),
      subscribe(REDIS_CHANNELS.MODERATION_USER_KICK, handleUserUpdate),
    ];

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [subscribe, currentSearchParams]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Default Avatar Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowDefaultAvatarModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors font-medium text-sm flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          Update Default Avatar
        </button>
      </div>

      {/* Compact Toolbar */}
      <UserListToolbar
        onSearch={handleSearch}
        loading={loading}
        totalCount={stats.totalCount}
        activeCount={stats.activeCount}
        bannedCount={stats.bannedCount}
      />

      {/* Compact User List */}
      <CompactUserList
        users={users}
        loading={loading}
        onUserUpdate={handleUserUpdate}
        onShowDetails={handleShowDetails}
        selectedUsers={selectedUsers}
        onUserSelect={handleUserSelect}
        onSelectAll={handleSelectAll}
        totalCount={stats.totalCount}
        hasMore={hasMore}
        onLoadMore={handleLoadMore}
      />

      {/* User Details Modal */}
      {showDetailsModal && selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          isOpen={showDetailsModal}
          onClose={handleCloseModal}
          onUserUpdate={handleUserUpdate}
        />
      )}

      {/* Default Avatar Modal */}
      <DefaultAvatarModal
        isOpen={showDefaultAvatarModal}
        onClose={() => setShowDefaultAvatarModal(false)}
      />
    </div>
  );
};

export default UserManagement;
