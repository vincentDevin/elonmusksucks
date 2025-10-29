// Notification System Context - React 19 compatible with stable subscriptions
import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import type { Notification, NotificationOptions, NotificationType } from './types';

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (
    type: NotificationType,
    title: string,
    message: string,
    options?: NotificationOptions,
  ) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_DURATION = 10000; // 10 seconds
const MAX_NOTIFICATIONS = 5; // Maximum number of visible notifications

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export function NotificationProvider({
  children,
  maxNotifications = MAX_NOTIFICATIONS,
}: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Add a new notification
  const addNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      options: NotificationOptions = {},
    ): string => {
      const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const notification: Notification = {
        id,
        type,
        title,
        message,
        priority: options.priority || 'normal',
        duration: options.duration !== undefined ? options.duration : DEFAULT_DURATION,
        dismissible: options.dismissible !== false,
        icon: options.icon,
        data: options.data,
        timestamp: Date.now(),
      };

      setNotifications((prev) => {
        // Sort by priority: high > normal > low
        const priorityOrder = { high: 0, normal: 1, low: 2 };

        // Add new notification
        const updated = [notification, ...prev];

        // Sort by priority, then by timestamp
        const sorted = updated.sort((a, b) => {
          const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.timestamp - a.timestamp; // Newer first
        });

        // Limit to maxNotifications
        return sorted.slice(0, maxNotifications);
      });

      return id;
    },
    [maxNotifications],
  );

  // Remove a notification by ID
  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<NotificationContextType>(
    () => ({
      notifications,
      addNotification,
      removeNotification,
      clearAll,
    }),
    [notifications, addNotification, removeNotification, clearAll],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

// Hook to use the notification system
export function useNotificationSystem() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotificationSystem must be used within a NotificationProvider');
  }
  return context;
}
