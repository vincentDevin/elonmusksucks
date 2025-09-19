// apps/client/src/components/EventHandlers.tsx
// -----------------------------------------------------------------------------
// Central event handler component that integrates all event handler hooks
// Provides comprehensive event coverage for all 73+ Redis channels
// -----------------------------------------------------------------------------

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import EventHandlerErrorBoundary from './EventHandlerErrorBoundary';

// Import notification/alert-only event handler hooks (Smart Hybrid approach)
// Note: Chat, Prediction, Achievement, Activity, Parlay use dedicated contexts for state management
import { useBettingEvents } from '../hooks/useBettingEvents';
import { usePongEvents } from '../hooks/usePongEvents';
import { useFinancialEvents } from '../hooks/useFinancialEvents';
import { useSocialEvents } from '../hooks/useSocialEvents';
import { useLeaderboardEvents } from '../hooks/useLeaderboardEvents';
import { useTimelineEvents } from '../hooks/useTimelineEvents';

// EMERGENCY FIX: Updated to prevent duplicate hook calls
interface NotificationDisplayData {
  bettingEvents: any;
  pongEvents: any;
  financialEvents: any;
  socialEvents: any;
  leaderboardEvents: any;
  timelineEvents: any;
}

interface NotificationDisplayProps {
  show: boolean;
  eventData: NotificationDisplayData;
}

function NotificationDisplay({ show, eventData }: NotificationDisplayProps) {
  // EMERGENCY FIX: Receive data as props instead of calling hooks again
  const {
    bettingEvents,
    pongEvents,
    financialEvents,
    socialEvents,
    leaderboardEvents,
    timelineEvents,
  } = eventData;

  if (!show) return null;

  // Calculate total notification alerts active
  const totalAlerts = [
    ...bettingEvents.bettingAlerts,
    ...pongEvents.pongAlerts,
    ...financialEvents.financialAlerts,
    ...socialEvents.socialAlerts,
    ...leaderboardEvents.leaderboardAlerts,
    ...timelineEvents.timelineAlerts,
  ];

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-surface border border-border rounded-lg shadow-lg p-4 mb-4">
        <h3 className="text-sm font-semibold text-content mb-2">Event System Status</h3>
        <div className="text-xs text-tertiary space-y-1">
          <div>Total Active Alerts: {totalAlerts.length}</div>
          <div>Betting: {bettingEvents.bettingAlerts.length}</div>
          <div>Pong: {pongEvents.pongAlerts.length}</div>
          <div>Financial: {financialEvents.financialAlerts.length}</div>
          <div>Social: {socialEvents.socialAlerts.length}</div>
          <div>Leaderboard: {leaderboardEvents.leaderboardAlerts.length}</div>
          <div>Timeline: {timelineEvents.timelineAlerts.length}</div>
          <div className="mt-2 pt-2 border-t border-border">
            <div className="text-xs text-tertiary">State managed by contexts:</div>
            <div className="text-xs text-muted">
              Chat, Predictions, Achievements, Activity, Parlays
            </div>
          </div>
        </div>
      </div>

      {/* Display recent alerts */}
      {totalAlerts.slice(0, 3).map((alert) => (
        <div
          key={alert.id}
          className={`bg-surface border rounded-lg shadow-lg p-3 mb-2 transition-all duration-300 ${
            alert.severity === 'success'
              ? 'border-success'
              : alert.severity === 'error'
                ? 'border-error'
                : alert.severity === 'warning'
                  ? 'border-warning'
                  : 'border-info'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="text-sm font-medium text-content flex items-center gap-2">
                <span>{alert.icon}</span>
                {alert.title}
              </div>
              <div className="text-xs text-tertiary mt-1">{alert.description}</div>
            </div>
            <button
              onClick={() => {
                // Clear alert based on type (Smart Hybrid approach)
                if (
                  'clearAlert' in bettingEvents &&
                  bettingEvents.bettingAlerts.find((a) => a.id === alert.id)
                ) {
                  bettingEvents.clearAlert(alert.id);
                } else if (
                  'clearAlert' in pongEvents &&
                  pongEvents.pongAlerts.find((a) => a.id === alert.id)
                ) {
                  pongEvents.clearAlert(alert.id);
                } else if (
                  'clearAlert' in financialEvents &&
                  financialEvents.financialAlerts.find((a) => a.id === alert.id)
                ) {
                  financialEvents.clearAlert(alert.id);
                } else if (
                  'clearAlert' in socialEvents &&
                  socialEvents.socialAlerts.find((a) => a.id === alert.id)
                ) {
                  socialEvents.clearAlert(alert.id);
                } else if (
                  'clearAlert' in leaderboardEvents &&
                  leaderboardEvents.leaderboardAlerts.find((a) => a.id === alert.id)
                ) {
                  leaderboardEvents.clearAlert(alert.id);
                } else if (
                  'clearAlert' in timelineEvents &&
                  timelineEvents.timelineAlerts.find((a) => a.id === alert.id)
                ) {
                  timelineEvents.clearAlert(alert.id);
                }
              }}
              className="text-tertiary hover:text-content text-xs"
            >
              ✕
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main event handlers component (Smart Hybrid approach)
function EventHandlersCore() {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  // Initialize notification/alert-only event handler hooks with error boundaries
  // State management handled by dedicated contexts: Chat, Prediction, Achievement, Activity, Parlay
  const bettingEvents = useBettingEvents();
  const pongEvents = usePongEvents();
  const financialEvents = useFinancialEvents();
  const socialEvents = useSocialEvents();
  const leaderboardEvents = useLeaderboardEvents();
  const timelineEvents = useTimelineEvents();

  // Debug logging to verify notification hooks are working
  useEffect(() => {
    if (user) {
      console.log('[EventHandlers] Smart Hybrid event system initialized for user:', user.id);
      console.log('[EventHandlers] Active notification systems:', {
        betting: !!bettingEvents,
        pong: !!pongEvents,
        financial: !!financialEvents,
        social: !!socialEvents,
        leaderboard: !!leaderboardEvents,
        timeline: !!timelineEvents,
      });
      console.log(
        '[EventHandlers] State managed by contexts: Chat, Predictions, Achievements, Activity, Parlays',
      );
    }
  }, [
    user,
    bettingEvents,
    pongEvents,
    financialEvents,
    socialEvents,
    leaderboardEvents,
    timelineEvents,
  ]);

  // Enable debug notifications with keyboard shortcut
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'E') {
        setShowNotifications((prev) => !prev);
        console.log('[EventHandlers] Debug notifications toggled:', !showNotifications);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [showNotifications]);

  // Only render if user is authenticated
  if (!user) {
    return null;
  }

  return (
    <>
      {/* Hidden component that just initializes all event handlers */}
      <div className="hidden" data-component="event-handlers">
        Event handlers active for {user.name || `User ${user.id}`}
      </div>

      {/* Debug notification display (Ctrl+Shift+E to toggle) */}
      <NotificationDisplay
        show={showNotifications}
        eventData={{
          bettingEvents,
          pongEvents,
          financialEvents,
          socialEvents,
          leaderboardEvents,
          timelineEvents,
        }}
      />
    </>
  );
}

// Export wrapped with comprehensive error boundaries
export default function EventHandlers() {
  return (
    <EventHandlerErrorBoundary eventType="EventHandlers">
      <EventHandlerErrorBoundary eventType="BettingEvents">
        <EventHandlerErrorBoundary eventType="PongEvents">
          <EventHandlerErrorBoundary eventType="FinancialEvents">
            <EventHandlerErrorBoundary eventType="SocialEvents">
              <EventHandlerErrorBoundary eventType="LeaderboardEvents">
                <EventHandlerErrorBoundary eventType="TimelineEvents">
                  <EventHandlersCore />
                </EventHandlerErrorBoundary>
              </EventHandlerErrorBoundary>
            </EventHandlerErrorBoundary>
          </EventHandlerErrorBoundary>
        </EventHandlerErrorBoundary>
      </EventHandlerErrorBoundary>
    </EventHandlerErrorBoundary>
  );
}
