// Notification system types
import type { ReactNode } from 'react';

export type NotificationType =
  | 'achievement'
  | 'pong-elo'
  | 'pong-tier'
  | 'pong-achievement'
  | 'bet-won'
  | 'bet-lost'
  | 'parlay-won'
  | 'parlay-lost'
  | 'balance-milestone'
  | 'bankruptcy'
  | 'rags-to-riches'
  | 'massive-gain'
  | 'massive-loss'
  | 'comeback'
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

export type NotificationPriority = 'high' | 'normal' | 'low';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  icon?: ReactNode;
  data?: any; // Type-specific payload data
  timestamp: number;
  duration: number; // Auto-dismiss timeout in milliseconds
  dismissible?: boolean;
}

export interface NotificationOptions {
  priority?: NotificationPriority;
  duration?: number;
  dismissible?: boolean;
  icon?: ReactNode;
  data?: any;
}
