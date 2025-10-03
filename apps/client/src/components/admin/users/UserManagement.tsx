import React, { useState, useEffect, useCallback } from 'react';
import { searchUsers, type UserSearchParams } from '../../../api/admin';
import { listBadges } from '../../../api/admin';
import { SOCKET_EVENTS, type PublicBadge } from '@ems/types';
import { useSocket } from '../../../contexts/SocketContext';
import UserListToolbar from './UserListToolbar';
import CompactUserList, { type CompactUser } from './CompactUserList';
import UserDetailsModal from './UserDetailsModal';

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
  const [badges, setBadges] = useState<PublicBadge[]>([]);
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

  const socket = useSocket();

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
        role: user.role,
        active: user.active,
        createdAt: user.createdAt.toString(),
        banStatus: user.banStatus,
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
  const handleUserUpdate = (userId: number) => {
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
    if (socket) {
      const handleUserUpdate = () => {
        // Refresh current search when user updates occur
        performSearch(currentSearchParams, false);
      };

      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_BAN, handleUserUpdate);
      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_UNBAN, handleUserUpdate);
      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_MUTE, handleUserUpdate);
      socket.on(SOCKET_EVENTS.ADMIN_MODERATION_USER_KICK, handleUserUpdate);

      return () => {
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_BAN, handleUserUpdate);
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_UNBAN, handleUserUpdate);
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_MUTE, handleUserUpdate);
        socket.off(SOCKET_EVENTS.ADMIN_MODERATION_USER_KICK, handleUserUpdate);
      };
    }
  }, [socket, currentSearchParams]);

  return (
    <div className={`space-y-6 ${className}`}>
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
          badges={badges}
        />
      )}
    </div>
  );
};

export default UserManagement;
