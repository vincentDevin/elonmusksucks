import React, { useState, useEffect } from 'react';
import {
  UserPlusIcon,
  UserMinusIcon,
  UsersIcon,
  CheckIcon,
  BellIcon,
  BellSlashIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/AuthContext';

interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  stats: {
    followers: number;
    following: number;
    posts: number;
  };
  isFollowing?: boolean;
  isFollowedBy?: boolean;
  notificationsEnabled?: boolean;
}

interface UserFollowingProps {
  userId?: string;
  onFollowChange?: (userId: string, isFollowing: boolean) => void;
  className?: string;
  variant?: 'button' | 'card' | 'list' | 'minimal';
  showStats?: boolean;
  showBio?: boolean;
}

export const UserFollowing: React.FC<UserFollowingProps> = ({
  userId,
  onFollowChange,
  className = '',
  variant = 'button',
  showStats = true,
  showBio = false,
}) => {
  const { user: currentUser } = useAuth();
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [followingList, setFollowingList] = useState<User[]>([]);
  const [followersList, setFollowersList] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following');

  // Fetch user data
  useEffect(() => {
    if (!userId) return;

    const fetchUserData = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (response.ok) {
          const data = await response.json();
          setTargetUser(data);
          setIsFollowing(data.isFollowing || false);
          setNotificationsEnabled(data.notificationsEnabled || false);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Mock data for development
        setTargetUser({
          id: userId,
          name: 'John Doe',
          username: 'johndoe',
          bio: 'Prediction enthusiast and data analyst',
          stats: {
            followers: 234,
            following: 156,
            posts: 89,
          },
          isFollowing: false,
          isFollowedBy: false,
          notificationsEnabled: false,
        });
      }
    };

    fetchUserData();
  }, [userId]);

  // Handle follow/unfollow
  const handleFollow = async () => {
    if (!currentUser || !targetUser) return;

    setLoading(true);
    try {
      const endpoint = isFollowing
        ? `/api/users/${targetUser.id}/unfollow`
        : `/api/users/${targetUser.id}/follow`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setIsFollowing(!isFollowing);
        if (targetUser) {
          setTargetUser({
            ...targetUser,
            stats: {
              ...targetUser.stats,
              followers: isFollowing
                ? targetUser.stats.followers - 1
                : targetUser.stats.followers + 1,
            },
          });
        }
        onFollowChange?.(targetUser.id, !isFollowing);
      }
    } catch (error) {
      console.error('Failed to update follow status:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle notifications
  const handleToggleNotifications = async () => {
    if (!currentUser || !targetUser || !isFollowing) return;

    try {
      const response = await fetch(`/api/users/${targetUser.id}/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !notificationsEnabled }),
      });

      if (response.ok) {
        setNotificationsEnabled(!notificationsEnabled);
      }
    } catch (error) {
      console.error('Failed to update notification settings:', error);
    }
  };

  // Fetch following/followers list for list variant
  useEffect(() => {
    if (variant !== 'list' || !currentUser?.id) return;

    const fetchFollowData = async () => {
      try {
        const [followingRes, followersRes] = await Promise.all([
          fetch(`/api/users/${currentUser.id}/following`),
          fetch(`/api/users/${currentUser.id}/followers`),
        ]);

        if (followingRes.ok) {
          const followingData = await followingRes.json();
          setFollowingList(followingData.users || []);
        }

        if (followersRes.ok) {
          const followersData = await followersRes.json();
          setFollowersList(followersData.users || []);
        }
      } catch (error) {
        console.error('Failed to fetch follow data:', error);
        // Mock data for development
        setFollowingList([
          {
            id: '1',
            name: 'Alice Smith',
            username: 'alice',
            stats: { followers: 450, following: 230, posts: 120 },
            isFollowing: true,
          },
          {
            id: '2',
            name: 'Bob Johnson',
            username: 'bob',
            stats: { followers: 890, following: 340, posts: 450 },
            isFollowing: true,
          },
        ] as User[]);
        setFollowersList([
          {
            id: '3',
            name: 'Charlie Brown',
            username: 'charlie',
            stats: { followers: 120, following: 90, posts: 45 },
            isFollowedBy: true,
          },
        ] as User[]);
      }
    };

    fetchFollowData();
  }, [variant, currentUser?.id]);

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  // Render minimal button variant
  if (variant === 'minimal') {
    return (
      <button
        onClick={handleFollow}
        disabled={loading || !currentUser}
        className={`p-2 rounded-full transition-colors ${
          isFollowing
            ? 'bg-muted text-content hover:bg-error/10 hover:text-error'
            : 'bg-primary text-white hover:bg-primary/90'
        } ${loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      >
        {isFollowing ? <UserMinusIcon className="w-5 h-5" /> : <UserPlusIcon className="w-5 h-5" />}
      </button>
    );
  }

  // Render button variant
  if (variant === 'button') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={handleFollow}
          disabled={loading || !currentUser}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
            isFollowing
              ? 'bg-muted text-content hover:bg-error/10 hover:text-error border border-border'
              : 'bg-primary text-white hover:bg-primary/90'
          } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {isFollowing ? (
            <>
              <CheckIcon className="w-4 h-4" />
              <span>Following</span>
            </>
          ) : (
            <>
              <UserPlusIcon className="w-4 h-4" />
              <span>Follow</span>
            </>
          )}
        </button>

        {isFollowing && (
          <button
            onClick={handleToggleNotifications}
            className={`p-2 rounded-lg border transition-colors ${
              notificationsEnabled
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-muted text-tertiary border-border hover:bg-hover'
            }`}
            title={notificationsEnabled ? 'Notifications on' : 'Notifications off'}
          >
            {notificationsEnabled ? (
              <BellIcon className="w-4 h-4" />
            ) : (
              <BellSlashIcon className="w-4 h-4" />
            )}
          </button>
        )}
      </div>
    );
  }

  // Render card variant
  if (variant === 'card' && targetUser) {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            {targetUser.avatar ? (
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-12 h-12 rounded-full"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">{targetUser.name.charAt(0)}</span>
              </div>
            )}
            <div>
              <h4 className="font-semibold text-content">{targetUser.name}</h4>
              <p className="text-sm text-tertiary">@{targetUser.username}</p>
            </div>
          </div>
          {targetUser.isFollowedBy && (
            <span className="text-xs bg-muted px-2 py-1 rounded-full text-tertiary">
              Follows you
            </span>
          )}
        </div>

        {showBio && targetUser.bio && (
          <p className="text-sm text-content/80 mb-3">{targetUser.bio}</p>
        )}

        {showStats && (
          <div className="flex justify-around mb-4 pt-3 border-t border-border">
            <div className="text-center">
              <p className="font-bold text-content">{formatNumber(targetUser.stats.posts)}</p>
              <p className="text-xs text-tertiary">Posts</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-content">{formatNumber(targetUser.stats.followers)}</p>
              <p className="text-xs text-tertiary">Followers</p>
            </div>
            <div className="text-center">
              <p className="font-bold text-content">{formatNumber(targetUser.stats.following)}</p>
              <p className="text-xs text-tertiary">Following</p>
            </div>
          </div>
        )}

        <div className="flex space-x-2">
          <button
            onClick={handleFollow}
            disabled={loading || !currentUser}
            className={`flex-1 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              isFollowing
                ? 'bg-muted text-content hover:bg-error/10 hover:text-error'
                : 'bg-primary text-white hover:bg-primary/90'
            } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </button>
          {isFollowing && (
            <button
              onClick={handleToggleNotifications}
              className={`px-3 py-2 rounded-lg border transition-colors ${
                notificationsEnabled
                  ? 'bg-primary/10 text-primary border-primary/30'
                  : 'bg-muted text-tertiary border-border'
              }`}
            >
              {notificationsEnabled ? (
                <BellIcon className="w-4 h-4" />
              ) : (
                <BellSlashIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Render list variant
  if (variant === 'list') {
    const currentList = activeTab === 'following' ? followingList : followersList;

    return (
      <div className={`bg-surface rounded-lg shadow ${className}`}>
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-content">Connections</h3>
            <UsersIcon className="w-5 h-5 text-tertiary" />
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('following')}
              className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === 'following'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-tertiary hover:bg-hover'
              }`}
            >
              Following ({followingList.length})
            </button>
            <button
              onClick={() => setActiveTab('followers')}
              className={`flex-1 px-3 py-1.5 text-sm rounded transition-colors ${
                activeTab === 'followers'
                  ? 'bg-primary text-white'
                  : 'bg-muted text-tertiary hover:bg-hover'
              }`}
            >
              Followers ({followersList.length})
            </button>
          </div>
        </div>

        <div className="p-4">
          {currentList.length === 0 ? (
            <p className="text-center text-tertiary py-4">
              {activeTab === 'following' ? "You're not following anyone yet" : 'No followers yet'}
            </p>
          ) : (
            <div className="space-y-3">
              {currentList.slice(0, 5).map((user) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-xs font-bold text-primary">
                          {user.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-content">{user.name}</p>
                      <p className="text-xs text-tertiary">@{user.username}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setTargetUser(user);
                      setIsFollowing(user.isFollowing || false);
                      handleFollow();
                    }}
                    className={`px-3 py-1 text-xs rounded-full transition-colors ${
                      user.isFollowing
                        ? 'bg-muted text-content hover:bg-error/10 hover:text-error'
                        : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                    }`}
                  >
                    {user.isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {currentList.length > 5 && (
            <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
              View all {currentList.length} {activeTab} →
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default UserFollowing;
