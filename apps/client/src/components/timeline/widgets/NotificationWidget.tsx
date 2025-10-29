import React, { useState, useEffect, useCallback } from 'react';
import {
  BellIcon,
  XMarkIcon,
  EyeIcon,
  TrashIcon,
  Cog6ToothIcon,
  UserIcon,
  HeartIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  BookmarkIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';
import { BellIcon as BellIconSolid } from '@heroicons/react/24/solid';
import { useAuth } from '../../../contexts/AuthContext';

interface Notification {
  id: string;
  type:
    | 'follow'
    | 'reaction'
    | 'comment'
    | 'mention'
    | 'share'
    | 'bookmark'
    | 'prediction'
    | 'system';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actor?: {
    id: string;
    name: string;
    avatar?: string;
  };
  content?: {
    id: string;
    type: 'article' | 'post' | 'prediction';
    title: string;
    url?: string;
  };
  actionUrl?: string;
}

interface NotificationWidgetProps {
  variant?: 'bell' | 'panel' | 'sidebar';
  maxVisible?: number;
  autoRefresh?: boolean;
  onNotificationClick?: (notification: Notification) => void;
  className?: string;
}

export const NotificationWidget: React.FC<NotificationWidgetProps> = ({
  variant = 'bell',
  maxVisible = 5,
  autoRefresh = true,
  onNotificationClick,
  className = '',
}) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPanel, setShowPanel] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions' | 'follows'>('all');

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      // Mock data for development
      setNotifications([
        {
          id: '1',
          type: 'follow',
          title: 'New Follower',
          message: 'Alice Smith started following you',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          isRead: false,
          priority: 'medium',
          actor: { id: '1', name: 'Alice Smith' },
        },
        {
          id: '2',
          type: 'reaction',
          title: 'Post Reaction',
          message: 'Bob Johnson liked your post',
          timestamp: new Date(Date.now() - 900000).toISOString(),
          isRead: false,
          priority: 'low',
          actor: { id: '2', name: 'Bob Johnson' },
          content: { id: 'post-1', type: 'post', title: 'My prediction strategy' },
        },
        {
          id: '3',
          type: 'comment',
          title: 'New Comment',
          message: 'Charlie Brown commented on your article',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          isRead: true,
          priority: 'medium',
          actor: { id: '3', name: 'Charlie Brown' },
          content: { id: 'article-1', type: 'article', title: 'Market Analysis Q4' },
        },
        {
          id: '4',
          type: 'system',
          title: 'Weekly Summary',
          message: 'Your weekly activity summary is ready',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          isRead: true,
          priority: 'low',
        },
      ]);
      setUnreadCount(2);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Auto-refresh notifications
  useEffect(() => {
    fetchNotifications();

    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, autoRefresh]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const notification = notifications.find((n) => n.id === notificationId);
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (notification && !notification.isRead) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    onNotificationClick?.(notification);
    if (variant === 'bell') {
      setShowPanel(false);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return <UserIcon className="w-5 h-5 text-secondary" />;
      case 'reaction':
        return <HeartIcon className="w-5 h-5 text-error" />;
      case 'comment':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-info" />;
      case 'mention':
        return <ChatBubbleLeftRightIcon className="w-5 h-5 text-warning" />;
      case 'share':
        return <ShareIcon className="w-5 h-5 text-success" />;
      case 'bookmark':
        return <BookmarkIcon className="w-5 h-5 text-primary" />;
      case 'prediction':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-success" />;
      case 'system':
        return <DocumentTextIcon className="w-5 h-5 text-tertiary" />;
      default:
        return <BellIcon className="w-5 h-5 text-tertiary" />;
    }
  };

  const formatTimeAgo = (timestamp: string): string => {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getFilteredNotifications = () => {
    let filtered = notifications;

    switch (filter) {
      case 'unread':
        filtered = notifications.filter((n) => !n.isRead);
        break;
      case 'mentions':
        filtered = notifications.filter((n) => n.type === 'mention');
        break;
      case 'follows':
        filtered = notifications.filter((n) => n.type === 'follow');
        break;
    }

    return filtered.slice(0, maxVisible);
  };

  // Render bell icon variant
  if (variant === 'bell') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-2 rounded-lg transition-colors text-tertiary hover:text-primary hover:bg-primary/10"
        >
          {unreadCount > 0 ? (
            <BellIconSolid className="w-6 h-6 text-primary" />
          ) : (
            <BellIcon className="w-6 h-6" />
          )}
          {unreadCount > 0 && (
            <span
              className="absolute -top-1 -right-1 bg-error text-primary-foreground text-xs font-bold
                           rounded-full h-5 w-5 flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification panel */}
        {showPanel && (
          <div
            className="absolute z-50 mt-2 right-0 bg-surface border border-border rounded-lg
                          shadow-lg w-80 max-h-96 overflow-hidden"
          >
            <div className="p-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-content">Notifications</h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      Mark all read
                    </button>
                  )}
                  <button
                    onClick={() => setShowPanel(false)}
                    className="text-tertiary hover:text-content"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {unreadCount > 0 && (
                <p className="text-xs text-tertiary mt-1">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-tertiary">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm">Loading...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-tertiary">
                  <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No notifications yet</p>
                </div>
              ) : (
                getFilteredNotifications().map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full p-3 text-left hover:bg-primary/10 transition-colors border-b border-border last:border-b-0
                               ${!notification.isRead ? 'bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <p className="text-sm font-medium text-content truncate">
                            {notification.title}
                          </p>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-primary rounded-full ml-2 mt-2"></div>
                          )}
                        </div>
                        <p className="text-xs text-tertiary mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-tertiary mt-1">
                          {formatTimeAgo(notification.timestamp)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>

            {notifications.length > maxVisible && (
              <div className="p-3 border-t border-border text-center">
                <button className="text-xs text-primary hover:text-primary/80">
                  View all notifications →
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Render sidebar widget variant
  if (variant === 'sidebar') {
    return (
      <div className={`bg-surface rounded-lg p-4 shadow ${className}`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-content flex items-center space-x-2">
            <BellIcon className="w-5 h-5" />
            <span>Notifications</span>
          </h3>
          {unreadCount > 0 && (
            <span className="bg-error text-primary-foreground text-xs font-bold px-2 py-1 rounded-full">
              {unreadCount}
            </span>
          )}
        </div>

        <div className="space-y-2">
          {notifications.length === 0 ? (
            <p className="text-sm text-tertiary">No new notifications</p>
          ) : (
            getFilteredNotifications()
              .slice(0, 3)
              .map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left p-2 rounded hover:bg-primary/10 transition-colors
                           ${!notification.isRead ? 'bg-primary/5' : ''}`}
                >
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-content truncate">
                        {notification.title}
                      </p>
                      <p className="text-xs text-tertiary mt-1">
                        {formatTimeAgo(notification.timestamp)}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                    )}
                  </div>
                </button>
              ))
          )}
        </div>

        <button className="w-full mt-3 text-xs text-primary hover:text-primary/80 transition-colors">
          View all notifications →
        </button>
      </div>
    );
  }

  // Render full panel variant
  return (
    <div className={`bg-surface rounded-lg shadow ${className}`}>
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-bold text-content">Notifications</h2>
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-primary/10 rounded-lg transition-colors">
              <Cog6ToothIcon className="w-5 h-5 text-tertiary" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex space-x-1">
          {(['all', 'unread', 'mentions', 'follows'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-tertiary hover:bg-primary/10'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-tertiary">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <BellIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {getFilteredNotifications().map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-lg border transition-colors group
                           ${
                             !notification.isRead
                               ? 'border-primary/30 bg-primary/5'
                               : 'border-border bg-muted'
                           }`}
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => handleNotificationClick(notification)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-content">{notification.title}</p>
                        <p className="text-sm text-tertiary mt-1">{notification.message}</p>
                        <div className="flex items-center space-x-3 mt-2 text-xs text-tertiary">
                          <span>{formatTimeAgo(notification.timestamp)}</span>
                          {notification.priority === 'high' && (
                            <span className="text-warning font-medium">High Priority</span>
                          )}
                          {notification.priority === 'urgent' && (
                            <span className="text-error font-medium">Urgent</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 hover:bg-primary/10 rounded transition-colors"
                        title="Mark as read"
                      >
                        <EyeIcon className="w-4 h-4 text-tertiary" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNotification(notification.id)}
                      className="p-1 hover:bg-primary/10 rounded transition-colors"
                      title="Delete"
                    >
                      <TrashIcon className="w-4 h-4 text-tertiary hover:text-error" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationWidget;
