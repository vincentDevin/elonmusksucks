// Central orchestrator for all notification event handlers
// This component uses all notification hooks to subscribe to events
import { useAchievementNotifications } from './hooks/useAchievementNotifications';
import { useBettingNotifications } from './hooks/useBettingNotifications';
import { useFinancialNotifications } from './hooks/useFinancialNotifications';
import { usePongNotifications } from './hooks/usePongNotifications';

/**
 * NotificationEventHandlers - Central event orchestrator
 *
 * This component:
 * - Subscribes to all notification-worthy events via EventBusCore
 * - Filters events by userId for security
 * - Enforces hydration guards to prevent race conditions
 * - Pushes notifications to the unified notification system
 *
 * IMPORTANT: This component should be mounted once in the app tree.
 * It uses EventBusCore which already handles cleanup and deduplication.
 */
export function NotificationEventHandlers() {
  // Subscribe to all notification event types
  useAchievementNotifications();
  useBettingNotifications();
  useFinancialNotifications();
  usePongNotifications();

  // No UI needed - this is a pure event handler component
  return null;
}
