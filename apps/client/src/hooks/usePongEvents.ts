// apps/client/src/hooks/usePongEvents.ts
// -----------------------------------------------------------------------------
// Pong events integration with real-time UI updates and user feedback
// Handles pong ELO updates, tier changes, match completions, and stats
// -----------------------------------------------------------------------------

import { useState, useCallback, useEffect } from 'react';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';

// Pong alert interface
export interface PongAlert {
  id: string;
  type:
    | 'elo_update'
    | 'tier_change'
    | 'match_completed'
    | 'match_lost'
    | 'elo_milestone'
    | 'stats_update';
  title: string;
  description: string;
  timestamp: string;
  severity: 'success' | 'warning' | 'error' | 'info';
  icon: string;
  duration?: number;
  eloChange?: number;
  newElo?: number;
  tier?: string;
  matchId?: string;
  opponentName?: string;
  actions?: Array<{
    label: string;
    action: () => void;
    variant: 'primary' | 'secondary';
  }>;
}

// Pong metrics interface
export interface PongMetrics {
  currentElo: number;
  currentTier: string;
  totalMatches: number;
  wins: number;
  losses: number;
  winRate: number;
  winStreak: number;
  bestWinStreak: number;
  lossStreak: number;
  worstLossStreak: number;
  averageGameDuration: number;
  totalPlayTime: number;
  highestElo: number;
  eloProgress: number; // Progress to next tier (0-100)
}

export function usePongEvents() {
  const { subscribe } = useEventBusCore();
  const { user } = useAuth();
  const [pongAlerts, setPongAlerts] = useState<PongAlert[]>([]);
  const [metrics, setMetrics] = useState<PongMetrics>({
    currentElo: 1000,
    currentTier: 'Bronze',
    totalMatches: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    winStreak: 0,
    bestWinStreak: 0,
    lossStreak: 0,
    worstLossStreak: 0,
    averageGameDuration: 0,
    totalPlayTime: 0,
    highestElo: 1000,
    eloProgress: 0,
  });

  // Clear alert by ID
  const clearAlert = useCallback((alertId: string) => {
    setPongAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Clear all alerts
  const clearAllAlerts = useCallback(() => {
    setPongAlerts([]);
  }, []);

  // Add alert with auto-dismiss
  const addAlert = useCallback(
    (alert: Omit<PongAlert, 'id'>) => {
      const alertWithId: PongAlert = {
        ...alert,
        id: `${alert.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      };

      setPongAlerts((prev) => [alertWithId, ...prev.slice(0, 9)]); // Keep max 10 alerts

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
  const updateMetrics = useCallback((updates: Partial<PongMetrics>) => {
    setMetrics((prev) => {
      const newMetrics = { ...prev, ...updates };

      // Recalculate derived metrics
      if (newMetrics.totalMatches > 0) {
        newMetrics.winRate = (newMetrics.wins / newMetrics.totalMatches) * 100;
      }
      if (newMetrics.totalMatches > 0 && newMetrics.totalPlayTime > 0) {
        newMetrics.averageGameDuration = newMetrics.totalPlayTime / newMetrics.totalMatches;
      }

      return newMetrics;
    });
  }, []);

  // Get tier color and icon
  const getTierInfo = useCallback((tier: string) => {
    switch (tier?.toLowerCase()) {
      case 'bronze':
        return { color: '#CD7F32', icon: '🥉' };
      case 'silver':
        return { color: '#C0C0C0', icon: '🥈' };
      case 'gold':
        return { color: '#FFD700', icon: '🥇' };
      case 'platinum':
        return { color: '#E5E4E2', icon: '💎' };
      case 'diamond':
        return { color: '#B9F2FF', icon: '💠' };
      case 'master':
        return { color: '#FF6B35', icon: '🔥' };
      case 'grandmaster':
        return { color: '#FF1744', icon: '👑' };
      default:
        return { color: '#888888', icon: '🏓' };
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubscribers = [
      // ELO update events
      subscribe(REDIS_CHANNELS.PONG_ELO_UPDATE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] ELO update:', payload);

          const eloChange = payload.newElo - payload.oldElo;
          const isPositive = eloChange > 0;
          const tierInfo = getTierInfo(payload.tier);

          addAlert({
            type: 'elo_update',
            title: `🏓 ELO ${isPositive ? 'Gained' : 'Lost'}`,
            description: `${isPositive ? '+' : ''}${eloChange} ELO (${payload.newElo}) ${tierInfo.icon} ${payload.tier}`,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: isPositive ? 'success' : 'error',
            icon: isPositive ? '📈' : '📉',
            duration: 6000,
            eloChange,
            newElo: payload.newElo,
            tier: payload.tier,
            matchId: payload.matchId,
            opponentName: payload.opponentName,
            actions: [
              {
                label: 'Play Again',
                action: () => (window.location.href = '/pong'),
                variant: 'primary',
              },
              {
                label: 'View Stats',
                action: () => (window.location.href = '/profile?tab=pong'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            currentElo: payload.newElo,
            currentTier: payload.tier,
            highestElo: Math.max(metrics.highestElo, payload.newElo),
          });
        }
      }),

      // Tier change events
      subscribe(REDIS_CHANNELS.PONG_TIER_CHANGE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] Tier change:', payload);

          const isPromotion = payload.direction === 'up';
          const tierInfo = getTierInfo(payload.newTier);

          addAlert({
            type: 'tier_change',
            title: `${tierInfo.icon} Tier ${isPromotion ? 'Promotion' : 'Demotion'}!`,
            description: `${isPromotion ? 'Congratulations!' : 'Keep practicing!'} You're now in ${payload.newTier} tier!`,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: isPromotion ? 'success' : 'warning',
            icon: isPromotion ? '🎉' : '😔',
            duration: isPromotion ? 12000 : 8000,
            newElo: payload.elo,
            tier: payload.newTier,
            actions: [
              {
                label: isPromotion ? 'Keep Climbing!' : 'Bounce Back!',
                action: () => (window.location.href = '/pong'),
                variant: 'primary',
              },
              {
                label: 'View Leaderboard',
                action: () => (window.location.href = '/pong?tab=leaderboard'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            currentTier: payload.newTier,
            currentElo: payload.elo,
          });
        }
      }),

      // Match completed events
      subscribe(REDIS_CHANNELS.PONG_MATCH_COMPLETED, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] Match completed (won):', payload);

          addAlert({
            type: 'match_completed',
            title: `🏆 Match Won!`,
            description: `Victory against ${payload.opponentName || 'Unknown Player'}! Score: ${payload.playerScore}-${payload.opponentScore}`,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: 'success',
            icon: '🎯',
            duration: 8000,
            matchId: payload.matchId,
            opponentName: payload.opponentName,
            actions: [
              {
                label: 'Play Another Match',
                action: () => (window.location.href = '/pong'),
                variant: 'primary',
              },
              {
                label: 'View Match Details',
                action: () => (window.location.href = `/pong/match/${payload.matchId}`),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalMatches: metrics.totalMatches + 1,
            wins: metrics.wins + 1,
            winStreak: metrics.winStreak + 1,
            bestWinStreak: Math.max(metrics.bestWinStreak, metrics.winStreak + 1),
            lossStreak: 0,
            totalPlayTime: metrics.totalPlayTime + (payload.gameDuration || 0),
          });
        }
      }),

      // Match lost events
      subscribe(REDIS_CHANNELS.PONG_MATCH_LOST, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] Match lost:', payload);

          addAlert({
            type: 'match_lost',
            title: `💔 Match Lost`,
            description: `Lost to ${payload.opponentName || 'Unknown Player'}. Score: ${payload.playerScore}-${payload.opponentScore}. Better luck next time!`,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: 'error',
            icon: '😞',
            duration: 6000,
            matchId: payload.matchId,
            opponentName: payload.opponentName,
            actions: [
              {
                label: 'Rematch',
                action: () => (window.location.href = '/pong'),
                variant: 'primary',
              },
              {
                label: 'Practice Mode',
                action: () => (window.location.href = '/pong?mode=practice'),
                variant: 'secondary',
              },
            ],
          });

          // Update metrics
          updateMetrics({
            totalMatches: metrics.totalMatches + 1,
            losses: metrics.losses + 1,
            lossStreak: metrics.lossStreak + 1,
            worstLossStreak: Math.max(metrics.worstLossStreak, metrics.lossStreak + 1),
            winStreak: 0,
            totalPlayTime: metrics.totalPlayTime + (payload.gameDuration || 0),
          });
        }
      }),

      // ELO milestone events
      subscribe(REDIS_CHANNELS.PONG_ELO_MILESTONE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] ELO milestone:', payload);

          addAlert({
            type: 'elo_milestone',
            title: `🌟 ELO Milestone!`,
            description: `Incredible! You've reached ${payload.milestone} ELO! ${payload.message || ''}`,
            timestamp: payload.timestamp || new Date().toISOString(),
            severity: 'success',
            icon: '🎖️',
            duration: 10000,
            newElo: payload.milestone,
            actions: [
              {
                label: 'Keep Going!',
                action: () => (window.location.href = '/pong'),
                variant: 'primary',
              },
              {
                label: 'Share Achievement',
                action: () => console.log('Share ELO milestone'),
                variant: 'secondary',
              },
            ],
          });
        }
      }),

      // Stats update events
      subscribe(REDIS_CHANNELS.PONG_STATS_UPDATE, (payload: any) => {
        if (payload.userId === user.id) {
          console.log('[PongEvents] Stats update:', payload);

          // Update metrics with new stats
          updateMetrics({
            totalMatches: payload.totalMatches || metrics.totalMatches,
            wins: payload.wins || metrics.wins,
            losses: payload.losses || metrics.losses,
            currentElo: payload.elo || metrics.currentElo,
            currentTier: payload.tier || metrics.currentTier,
            winStreak: payload.winStreak || metrics.winStreak,
            lossStreak: payload.lossStreak || metrics.lossStreak,
            totalPlayTime: payload.totalPlayTime || metrics.totalPlayTime,
          });
        }
      }),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, subscribe, addAlert, updateMetrics, metrics, getTierInfo]);

  return {
    pongAlerts,
    metrics,
    clearAlert,
    clearAllAlerts,
    addAlert, // For manual testing/debugging
  };
}
