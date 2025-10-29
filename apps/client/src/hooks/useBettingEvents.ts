// apps/client/src/hooks/useBettingEvents.ts
// -----------------------------------------------------------------------------
// Betting events integration with real-time UI updates and user feedback
// Handles bet placement, wins, losses, and status changes
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '@ems/types';
import { safeEventHandler } from '../lib/safeEventHandler';

// Betting alert interface
export interface BettingAlert {
  id: string;
  type: 'bet_placed' | 'bet_won' | 'bet_lost' | 'bet_status_change';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  duration?: number;
  predictionId?: number;
  betId?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
}

// Betting metrics interface
export interface BettingMetrics {
  totalBets: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalWagered: number;
  totalWinnings: number;
  netProfit: number;
  averageBetSize: number;
  longestWinStreak: number;
  currentWinStreak: number;
  longestLossStreak: number;
  currentLossStreak: number;
}

export function useBettingEvents() {
  const { subscribe } = useEventBusCore();
  const { user } = useAuth();
  const [bettingAlerts, setBettingAlerts] = useState<BettingAlert[]>([]);
  const [metrics, setMetrics] = useState<BettingMetrics>({
    totalBets: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    totalWagered: 0,
    totalWinnings: 0,
    netProfit: 0,
    averageBetSize: 0,
    longestWinStreak: 0,
    currentWinStreak: 0,
    longestLossStreak: 0,
    currentLossStreak: 0,
  });

  // Clear alert by ID
  const clearAlert = useCallback((alertId: string) => {
    setBettingAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setBettingAlerts([]);
  }, []);

  // Add alert with auto-dismiss
  const addAlert = useCallback(
    (alert: Omit<BettingAlert, 'id'>) => {
      const alertWithId: BettingAlert = {
        ...alert,
        id: `${alert.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setBettingAlerts((prev) => [alertWithId, ...prev.slice(0, 9)]); // Keep max 10 alerts

      // Auto-dismiss after duration
      if (alert.duration) {
        setTimeout(() => {
          clearAlert(alertWithId.id);
        }, alert.duration);
      }
    },
    [clearAlert],
  );

  // Update metrics helper
  const updateMetrics = useCallback((updates: Partial<BettingMetrics>) => {
    setMetrics((prev) => {
      const newMetrics = { ...prev, ...updates };

      // Recalculate derived metrics
      if (newMetrics.totalBets > 0) {
        newMetrics.winRate = (newMetrics.totalWins / newMetrics.totalBets) * 100;
        newMetrics.averageBetSize = newMetrics.totalWagered / newMetrics.totalBets;
      }
      newMetrics.netProfit = newMetrics.totalWinnings - newMetrics.totalWagered;

      return newMetrics;
    });
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      // Bet placement events
      subscribe(
        REDIS_CHANNELS.BET_PLACE,
        safeEventHandler(
          (payload: any) => {
            if (payload.userId === user.id) {
              console.log('[BettingEvents] Bet placed:', payload);

              addAlert({
                type: 'bet_placed',
                title: `🎯 Bet Placed`,
                description: `Bet of ${payload.amount.toLocaleString()} Musk Bucks placed successfully!`,
                amount: payload.amount,
                timestamp: payload.timestamp || new Date().toISOString(),
                severity: 'info',
                icon: '🎲',
                duration: 4000,
                predictionId: payload.predictionId,
                betId: payload.betId,
                actions: [
                  {
                    label: 'View Bet',
                    action: () => (window.location.href = `/dashboard?bet=${payload.betId}`),
                    variant: 'primary',
                  },
                ],
              });

              // Update metrics
              updateMetrics({
                totalBets: metrics.totalBets + 1,
                totalWagered: metrics.totalWagered + payload.amount,
              });

              // Note: Balance updates are handled by AuthContext via BALANCE_UPDATE events
            }
          },
          { eventType: 'BET_PLACE', userId: user.id },
        ),
      ),

      // NOTE: Removed REDIS_CHANNELS.BET_PLACED subscription to reduce duplicate listeners
      // This was only doing console logging which is redundant since:
      // - AuthContext handles balance updates
      // - PredictionContext handles prediction data updates
      // - User feedback is provided through UI notifications

      // Bet win events
      subscribe(REDIS_CHANNELS.BET_WON, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[BettingEvents] Bet won:', payload);

          addAlert({
            type: 'bet_won',
            title: `🎉 Bet Won!`,
            description: `Congratulations! You won ${payload.winnings.toLocaleString()} Musk Bucks!`,
            amount: payload.winnings,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: 'success',
            icon: '🏆',
            duration: 8000,
            betId: payload.betId,
            predictionId: payload.predictionId,
            actions: [
              {
                label: 'Place Another Bet',
                action: () => (window.location.href = '/dashboard'),
                variant: 'primary',
              },
              {
                label: 'View Winnings',
                action: () => (window.location.href = '/profile?tab=betting'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalWins: metrics.totalWins + 1,
            totalWinnings: metrics.totalWinnings + payload.winnings,
            currentWinStreak: metrics.currentWinStreak + 1,
            longestWinStreak: Math.max(metrics.longestWinStreak, metrics.currentWinStreak + 1),
            currentLossStreak: 0,
          });

          // Note: Balance updates are handled by AuthContext via BALANCE_UPDATE events
        }
      }),

      // Bet loss events
      subscribe(REDIS_CHANNELS.BET_LOST, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[BettingEvents] Bet lost:', payload);

          addAlert({
            type: 'bet_lost',
            title: `😔 Bet Lost`,
            description: `Better luck next time! You lost ${payload.amount.toLocaleString()} Musk Bucks.`,
            amount: payload.amount,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: 'error',
            icon: '💸',
            duration: 6000,
            betId: payload.betId,
            predictionId: payload.predictionId,
            actions: [
              {
                label: 'Try Again',
                action: () => (window.location.href = '/dashboard'),
                variant: 'primary',
              },
              {
                label: 'View Strategy Tips',
                action: () => console.log('Navigate to betting tips'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalLosses: metrics.totalLosses + 1,
            currentLossStreak: metrics.currentLossStreak + 1,
            longestLossStreak: Math.max(metrics.longestLossStreak, metrics.currentLossStreak + 1),
            currentWinStreak: 0,
          });
        }
      }),

      // Bet status change events
      subscribe(REDIS_CHANNELS.BET_STATUS_CHANGE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[BettingEvents] Bet status changed:', payload);

          let title = 'Bet Status Update';
          let description = `Your bet status has been updated to: ${payload.status}`;
          let severity: 'success' | 'warning' | 'error' | 'info' = 'info';
          let icon = '📊';

          switch (payload.status?.toLowerCase()) {
            case 'resolved':
              title = '✅ Bet Resolved';
              description = 'Your bet has been resolved. Check your results!';
              severity = 'success';
              icon = '✅';
              break;
            case 'cancelled':
              title = '❌ Bet Cancelled';
              description = 'Your bet has been cancelled. Funds will be refunded.';
              severity = 'warning';
              icon = '🔄';
              break;
            case 'pending':
              title = '⏳ Bet Pending';
              description = 'Your bet is awaiting prediction resolution.';
              severity = 'info';
              icon = '⏳';
              break;
          }

          addAlert({
            type: 'bet_status_change',
            title,
            description,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity,
            icon,
            duration: 5000,
            betId: payload.betId,
            predictionId: payload.predictionId,
            actions: [
              {
                label: 'View Details',
                action: () => (window.location.href = `/dashboard?bet=${payload.betId}`),
                variant: 'primary',
              },
            ],
          });
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, subscribe, addAlert, updateMetrics, metrics]);

  return {
    bettingAlerts,
    metrics,
    clearAlert,
    clearAllAlerts,
    addAlert, // For manual testing/debugging
  };
}
