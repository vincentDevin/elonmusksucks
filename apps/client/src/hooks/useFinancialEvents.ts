// apps/client/src/hooks/useFinancialEvents.ts
// -----------------------------------------------------------------------------
// Financial events integration with real-time UI updates and user feedback
// Handles balance milestones, bankruptcy detection, massive gains/losses
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBus } from '../contexts/EventBusContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';

// Financial alert interface
export interface FinancialAlert {
  id: string;
  type: 'milestone' | 'bankruptcy' | 'massive_gain' | 'massive_loss' | 'comeback' | 'payout';
  title: string;
  description: string;
  amount?: number;
  timestamp: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  duration?: number; // Auto-dismiss time in ms
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
}

// Financial metrics interface
export interface FinancialMetrics {
  totalGains: number;
  totalLosses: number;
  netProfit: number;
  largestWin: number;
  largestLoss: number;
  milestonesReached: number;
  bankruptcyCount: number;
  comebackCount: number;
}

export function useFinancialEvents() {
  const { subscribe } = useEventBus();
  const { user, updateUser } = useAuth();
  const [financialAlerts, setFinancialAlerts] = useState<FinancialAlert[]>([]);
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalGains: 0,
    totalLosses: 0,
    netProfit: 0,
    largestWin: 0,
    largestLoss: 0,
    milestonesReached: 0,
    bankruptcyCount: 0,
    comebackCount: 0,
  });

  // Clear alert by ID
  const clearAlert = useCallback((alertId: string) => {
    setFinancialAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setFinancialAlerts([]);
  }, []);

  // Add alert with auto-dismiss
  const addAlert = useCallback(
    (alert: Omit<FinancialAlert, 'id'>) => {
      const alertWithId: FinancialAlert = {
        ...alert,
        id: `${alert.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setFinancialAlerts((prev) => [alertWithId, ...prev.slice(0, 9)]); // Keep max 10 alerts

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
  const updateMetrics = useCallback((updates: Partial<FinancialMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...updates }));
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      // Balance milestone tracking
      subscribe(REDIS_CHANNELS.BALANCE_MILESTONE_REACHED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Balance milestone reached:', payload);

          addAlert({
            type: 'milestone',
            title: `🎉 Balance Milestone Reached!`,
            description: `You've reached ${payload.milestone.toLocaleString()} Musk Bucks!`,
            amount: payload.milestone,
            timestamp: payload.timestamp,
            severity: 'success',
            icon: '🏆',
            duration: 8000,
            actions: [
              {
                label: 'View Profile',
                action: () => (window.location.href = '/profile'),
                variant: 'primary',
              },
            ],
          });

          // Update user balance optimistically
          if (updateUser) {
            updateUser({ ...user, muskBucks: payload.currentBalance });
          }

          // Update metrics
          updateMetrics({
            milestonesReached: metrics.milestonesReached + 1,
          });
        }
      }),

      // Bankruptcy detection
      subscribe(REDIS_CHANNELS.BANKRUPTCY_DETECTED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Bankruptcy detected:', payload);

          addAlert({
            type: 'bankruptcy',
            title: '⚠️ Low Balance Alert',
            description: 'Your balance is critically low. Consider smaller bets or take a break.',
            timestamp: payload.timestamp,
            severity: 'warning',
            icon: '📉',
            duration: 12000,
            actions: [
              {
                label: 'View Betting Tips',
                action: () => console.log('Navigate to betting tips'),
                variant: 'secondary',
              },
              {
                label: 'Take a Break',
                action: () => console.log('Enable responsible gambling mode'),
                variant: 'primary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            bankruptcyCount: metrics.bankruptcyCount + 1,
          });
        }
      }),

      // Massive gains detection
      subscribe(REDIS_CHANNELS.MASSIVE_GAIN_DETECTED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Massive gain detected:', payload);

          addAlert({
            type: 'massive_gain',
            title: `🚀 Massive Win!`,
            description: `Incredible! You just won ${payload.amount.toLocaleString()} Musk Bucks!`,
            amount: payload.amount,
            timestamp: payload.timestamp,
            severity: 'success',
            icon: '💰',
            duration: 10000,
            actions: [
              {
                label: 'Share Win',
                action: () => console.log('Share on social media'),
                variant: 'primary',
              },
              {
                label: 'Place Another Bet',
                action: () => (window.location.href = '/dashboard'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalGains: metrics.totalGains + payload.amount,
            largestWin: Math.max(metrics.largestWin, payload.amount),
            netProfit: metrics.netProfit + payload.amount,
          });
        }
      }),

      // Massive losses detection
      subscribe(REDIS_CHANNELS.MASSIVE_LOSS_DETECTED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Massive loss detected:', payload);

          addAlert({
            type: 'massive_loss',
            title: `😔 Major Loss`,
            description: `You lost ${payload.amount.toLocaleString()} Musk Bucks. Consider taking a break or reducing bet sizes.`,
            amount: payload.amount,
            timestamp: payload.timestamp,
            severity: 'error',
            icon: '📉',
            duration: 15000,
            actions: [
              {
                label: 'View Loss Analysis',
                action: () => console.log('Navigate to loss analysis'),
                variant: 'secondary',
              },
              {
                label: 'Set Betting Limits',
                action: () => console.log('Open betting limits modal'),
                variant: 'primary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalLosses: metrics.totalLosses + payload.amount,
            largestLoss: Math.max(metrics.largestLoss, payload.amount),
            netProfit: metrics.netProfit - payload.amount,
          });
        }
      }),

      // Comeback detection
      subscribe(REDIS_CHANNELS.COMEBACK_DETECTED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Comeback detected:', payload);

          addAlert({
            type: 'comeback',
            title: `🔥 Epic Comeback!`,
            description: `Amazing recovery! You've bounced back from your losses!`,
            timestamp: payload.timestamp,
            severity: 'success',
            icon: '🎯',
            duration: 8000,
            actions: [
              {
                label: 'Keep the Momentum',
                action: () => (window.location.href = '/dashboard'),
                variant: 'primary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            comebackCount: metrics.comebackCount + 1,
          });
        }
      }),

      // Payout completed
      subscribe(REDIS_CHANNELS.PAYOUT_COMPLETED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Payout completed:', payload);

          addAlert({
            type: 'payout',
            title: `💳 Payout Completed`,
            description: `You received ${payload.amount.toLocaleString()} Musk Bucks from your winning bet!`,
            amount: payload.amount,
            timestamp: payload.timestamp,
            severity: 'success',
            icon: '✅',
            duration: 6000,
          });

          // Update user balance optimistically
          if (updateUser && payload.newBalance) {
            updateUser({ ...user, muskBucks: payload.newBalance });
          }
        }
      }),

      // Daily profit snapshot
      subscribe(REDIS_CHANNELS.PROFIT_SNAPSHOT_DAILY, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[FinancialEvents] Daily profit snapshot:', payload);

          const isProfit = payload.dailyProfit > 0;
          addAlert({
            type: 'payout',
            title: `📊 Daily Summary`,
            description: isProfit
              ? `Great day! You're up ${payload.dailyProfit.toLocaleString()} Musk Bucks today.`
              : `Today you're down ${Math.abs(payload.dailyProfit).toLocaleString()} Musk Bucks. Tomorrow's a new day!`,
            amount: payload.dailyProfit,
            timestamp: payload.timestamp,
            severity: isProfit ? 'success' : 'info',
            icon: isProfit ? '📈' : '📊',
            duration: 10000,
          });
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, subscribe, addAlert, updateUser, updateMetrics, metrics]);

  return {
    financialAlerts,
    metrics,
    clearAlert,
    clearAllAlerts,
    addAlert, // For manual testing/debugging
  };
}
