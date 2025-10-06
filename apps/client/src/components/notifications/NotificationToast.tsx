import { useEffect, useState } from 'react';
import {
  TrophyIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XMarkIcon,
  StarIcon,
  FireIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { Notification } from './types';

interface NotificationToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

// Icon mapping for notification types
function getNotificationIcon(type: Notification['type'], icon?: React.ReactNode) {
  if (icon) return icon;

  switch (type) {
    case 'achievement':
      return <TrophyIcon className="w-5 h-5 text-accent" />;
    case 'pong-elo':
      return <ChartBarIcon className="w-5 h-5 text-primary" />;
    case 'pong-tier':
      return <StarIcon className="w-5 h-5 text-accent" />;
    case 'pong-achievement':
      return <FireIcon className="w-5 h-5 text-warning" />;
    case 'bet-won':
      return <ArrowTrendingUpIcon className="w-5 h-5 text-success" />;
    case 'bet-lost':
      return <ArrowTrendingDownIcon className="w-5 h-5 text-error" />;
    case 'parlay-won':
      return <TrophyIcon className="w-5 h-5 text-success" />;
    case 'parlay-lost':
      return <ArrowTrendingDownIcon className="w-5 h-5 text-error" />;
    case 'balance-milestone':
      return <CurrencyDollarIcon className="w-5 h-5 text-success" />;
    case 'bankruptcy':
      return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
    case 'rags-to-riches':
      return <TrophyIcon className="w-5 h-5 text-success" />;
    case 'massive-gain':
      return <ArrowTrendingUpIcon className="w-5 h-5 text-success" />;
    case 'massive-loss':
      return <ArrowTrendingDownIcon className="w-5 h-5 text-error" />;
    case 'comeback':
      return <StarIcon className="w-5 h-5 text-success" />;
    case 'success':
      return <CheckCircleIcon className="w-5 h-5 text-success" />;
    case 'warning':
      return <ExclamationTriangleIcon className="w-5 h-5 text-warning" />;
    case 'error':
      return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
    case 'info':
    default:
      return <InformationCircleIcon className="w-5 h-5 text-primary" />;
  }
}

// Color styling for notification types
function getNotificationStyles(type: Notification['type']) {
  switch (type) {
    case 'achievement':
    case 'pong-achievement':
    case 'pong-tier':
      return 'bg-accent/10 border-accent/30';
    case 'pong-elo':
      return 'bg-primary/10 border-primary/30';
    case 'bet-won':
    case 'parlay-won':
    case 'balance-milestone':
    case 'rags-to-riches':
    case 'massive-gain':
    case 'comeback':
    case 'success':
      return 'bg-success/10 border-success/30';
    case 'bet-lost':
    case 'parlay-lost':
    case 'bankruptcy':
    case 'massive-loss':
    case 'error':
      return 'bg-error/10 border-error/30';
    case 'warning':
      return 'bg-warning/10 border-warning/30';
    case 'info':
    default:
      return 'bg-primary/10 border-primary/30';
  }
}

export function NotificationToast({ notification, onDismiss }: NotificationToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (notification.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, notification.duration);

      return () => clearTimeout(timer);
    }
  }, [notification.duration, notification.id]);

  const handleDismiss = () => {
    setIsExiting(true);
    // Wait for animation to complete before actually removing
    setTimeout(() => {
      onDismiss(notification.id);
    }, 300);
  };

  const dismissible = notification.dismissible !== false;

  return (
    <div
      className={`
        pointer-events-auto bg-surface border rounded-xl shadow-lg p-4 max-w-sm
        transition-all duration-300 ease-out
        ${getNotificationStyles(notification.type)}
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        animate-in slide-in-from-right fade-in
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {getNotificationIcon(notification.type, notification.icon)}
          <span className="font-medium text-content text-sm">{notification.title}</span>
        </div>
        {dismissible && (
          <button
            onClick={handleDismiss}
            className="text-tertiary hover:text-content transition-colors flex-shrink-0 ml-2"
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Message */}
      <div className="text-content/90 text-sm leading-relaxed">{notification.message}</div>

      {/* Timestamp */}
      <div className="pt-2 mt-2 border-t border-border">
        <div className="text-xs text-tertiary flex items-center justify-between">
          <span>{new Date(notification.timestamp).toLocaleTimeString()}</span>
          {notification.duration > 0 && (
            <span className="text-xs opacity-60">
              {Math.ceil(notification.duration / 1000)}s
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
