// apps/client/src/components/EventHandlers.tsx
// -----------------------------------------------------------------------------
// Central event handler component - Single source of truth for all event subscriptions
// Routes notification-worthy events to the notification system
// State management is handled by dedicated contexts (Chat, Predictions, Achievements, etc.)
// -----------------------------------------------------------------------------

import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocketEvent } from '../contexts/EventBusCoreContext';
import { useNotificationSystem } from './notifications/NotificationContext';
import { REDIS_CHANNELS, type AchievementUnlockedPayload } from '@ems/types';
import { EventHandlerErrorBoundary } from './ErrorBoundary';

// ============================================================================
// Type Definitions for Event Payloads
// ============================================================================

interface BetEventPayload {
  userId: number;
  payload: {
    betId: string;
    predictionId: string;
    amount: number;
    payout: number;
    won: boolean;
    category: string | null;
    odds: number;
    wasAllIn: boolean;
  };
}

interface ParlayEventPayload {
  userId: number;
  payload: {
    parlayId: string;
    legCount: number;
    legsWon: number;
    amount: number;
    payout: number;
    won: boolean;
    odds: number;
  };
}

interface BalanceMilestoneEvent {
  userId: number;
  payload: {
    milestone: string;
    milestoneDisplay: string;
    threshold: string;
    newBalance: string;
    oldBalance: string;
    direction: string;
  };
}

interface BankruptcyEvent {
  userId: number;
  payload: {
    lostAmount: string;
    timestamp: string;
  };
}

interface RagsToRichesEvent {
  userId: number;
  payload: {
    startBalance: string;
    endBalance: string;
    multiplier: number;
  };
}

interface MassiveLossEvent {
  userId: number;
  payload: {
    lossAmount: string;
    balanceBefore: string;
    balanceAfter: string;
    timestamp: string;
  };
}

interface MassiveGainEvent {
  userId: number;
  payload: {
    gainAmount: string;
    balanceBefore: string;
    balanceAfter: string;
    timestamp: string;
  };
}

interface ComebackEvent {
  userId: number;
  payload: {
    recoveryAmount: string;
    lowPoint: string;
    currentBalance: string;
    timestamp: string;
  };
}

interface PongEloUpdatePayload {
  userId: number;
  oldRating: number;
  newRating: number;
  change: number;
  tier: string;
  matchId: string;
}

interface PongTierChangePayload {
  userId: number;
  oldTier: string;
  newTier: string;
  eloRating: number;
  isPromotion: boolean;
}

interface PongAchievementPayload {
  userId: number;
  achievementId: string;
  title: string;
  description: string;
  type: 'pong_streak' | 'pong_skill' | 'pong_earnings' | 'pong_milestone';
}

// ============================================================================
// Main Event Handlers Component
// ============================================================================

function EventHandlersCore() {
  const { user } = useAuth();
  const { addNotification } = useNotificationSystem();

  // Helper to format currency
  const formatMB = useCallback((amountStr: string | number) => {
    const num = typeof amountStr === 'string' ? Number(amountStr) : amountStr;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }, []);

  // ============================================================================
  // Achievement Event Handlers
  // ============================================================================

  const handleAchievementUnlocked = useCallback(
    (payload: AchievementUnlockedPayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification(
        'achievement',
        'Achievement Unlocked! 🎉',
        `${payload.achievement.title}: ${payload.achievement.description}`,
        {
          priority: 'high',
          duration: 12000,
          data: payload,
        },
      );
    },
    [user, addNotification],
  );

  // ============================================================================
  // Betting Event Handlers
  // ============================================================================

  const handleBetWon = useCallback(
    (data: BetEventPayload) => {
      if (!user || data.userId !== user.id) return;

      const profit = data.payload.payout - data.payload.amount;
      const profitAmount = formatMB(profit);

      addNotification(
        'bet-won',
        'Bet Won! 🎉',
        `+${profitAmount} MB profit (${data.payload.odds.toFixed(2)}x odds)`,
        {
          priority: 'high',
          duration: 10000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  const handleBetLost = useCallback(
    (data: BetEventPayload) => {
      if (!user || data.userId !== user.id) return;

      const lossAmount = formatMB(data.payload.amount);

      addNotification('bet-lost', 'Bet Lost', `-${lossAmount} MB`, {
        priority: 'normal',
        duration: 8000,
        data: data.payload,
      });
    },
    [user, addNotification, formatMB],
  );

  const handleParlayWon = useCallback(
    (data: ParlayEventPayload) => {
      if (!user || data.userId !== user.id) return;

      const profit = data.payload.payout - data.payload.amount;
      const profitAmount = formatMB(profit);

      addNotification(
        'parlay-won',
        `${data.payload.legCount}-Leg Parlay Won! 🏆`,
        `+${profitAmount} MB (${data.payload.odds.toFixed(2)}x odds)`,
        {
          priority: 'high',
          duration: 12000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  const handleParlayLost = useCallback(
    (data: ParlayEventPayload) => {
      if (!user || data.userId !== user.id) return;

      const lossAmount = formatMB(data.payload.amount);
      const failedLegs = data.payload.legCount - data.payload.legsWon;

      addNotification(
        'parlay-lost',
        'Parlay Lost',
        `-${lossAmount} MB (${failedLegs}/${data.payload.legCount} legs failed)`,
        {
          priority: 'normal',
          duration: 8000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  // ============================================================================
  // Financial Event Handlers
  // ============================================================================

  const handleBalanceMilestone = useCallback(
    (data: BalanceMilestoneEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'balance-milestone',
        'Balance Milestone! 💰',
        `You've reached ${data.payload.milestoneDisplay}!`,
        {
          priority: 'high',
          duration: 10000,
          data: data.payload,
        },
      );
    },
    [user, addNotification],
  );

  const handleBankruptcy = useCallback(
    (data: BankruptcyEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'bankruptcy',
        'Bankruptcy Detected 📉',
        'You ran out of MuskBucks! Time to start fresh.',
        {
          priority: 'high',
          duration: 12000,
          data: data.payload,
        },
      );
    },
    [user, addNotification],
  );

  const handleRagsToRiches = useCallback(
    (data: RagsToRichesEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'rags-to-riches',
        'Rags to Riches! 🚀',
        `From ${formatMB(data.payload.startBalance)} to ${formatMB(data.payload.endBalance)} MB!`,
        {
          priority: 'high',
          duration: 15000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  const handleMassiveLoss = useCallback(
    (data: MassiveLossEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'massive-loss',
        'Massive Loss 📉',
        `Lost ${formatMB(data.payload.lossAmount)} MuskBucks in a single event`,
        {
          priority: 'normal',
          duration: 10000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  const handleMassiveGain = useCallback(
    (data: MassiveGainEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'massive-gain',
        'Massive Win! 💸',
        `Gained ${formatMB(data.payload.gainAmount)} MuskBucks in a single event!`,
        {
          priority: 'high',
          duration: 12000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  const handleComeback = useCallback(
    (data: ComebackEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'comeback',
        'Epic Comeback! 🔥',
        `Recovered ${formatMB(data.payload.recoveryAmount)} MB from rock bottom!`,
        {
          priority: 'high',
          duration: 12000,
          data: data.payload,
        },
      );
    },
    [user, addNotification, formatMB],
  );

  // ============================================================================
  // Pong Event Handlers
  // ============================================================================

  const handlePongEloUpdate = useCallback(
    (payload: PongEloUpdatePayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification('pong-elo', 'Elo Update', '', {
        priority: payload.change > 0 ? 'high' : 'normal',
        duration: 8000,
        data: payload,
      });
    },
    [user, addNotification],
  );

  const handlePongTierChange = useCallback(
    (payload: PongTierChangePayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification('pong-tier', 'Tier Promotion!', '', {
        priority: 'high',
        duration: 12000,
        data: payload,
      });
    },
    [user, addNotification],
  );

  const handlePongAchievement = useCallback(
    (payload: PongAchievementPayload) => {
      if (!user || payload.userId !== user.id) return;

      addNotification('pong-achievement', 'Pong Achievement!', '', {
        priority: 'high',
        duration: 12000,
        data: payload,
      });
    },
    [user, addNotification],
  );

  // ============================================================================
  // Event Subscriptions (Single source of truth via EventBusCore)
  // ============================================================================

  // Achievement events
  useSocketEvent(REDIS_CHANNELS.ACHIEVEMENT_UNLOCKED, handleAchievementUnlocked);

  // Betting events
  useSocketEvent(REDIS_CHANNELS.BET_WON, handleBetWon);
  useSocketEvent(REDIS_CHANNELS.BET_LOST, handleBetLost);
  useSocketEvent(REDIS_CHANNELS.PARLAY_WON, handleParlayWon);
  useSocketEvent(REDIS_CHANNELS.PARLAY_LOST, handleParlayLost);

  // Financial events
  useSocketEvent(REDIS_CHANNELS.BALANCE_MILESTONE_REACHED, handleBalanceMilestone);
  useSocketEvent(REDIS_CHANNELS.BANKRUPTCY_DETECTED, handleBankruptcy);
  useSocketEvent(REDIS_CHANNELS.RAGS_TO_RICHES, handleRagsToRiches);
  useSocketEvent(REDIS_CHANNELS.MASSIVE_LOSS_DETECTED, handleMassiveLoss);
  useSocketEvent(REDIS_CHANNELS.MASSIVE_GAIN_DETECTED, handleMassiveGain);
  useSocketEvent(REDIS_CHANNELS.COMEBACK_DETECTED, handleComeback);

  // Pong events
  useSocketEvent(REDIS_CHANNELS.PONG_ELO_UPDATE, handlePongEloUpdate);
  useSocketEvent(REDIS_CHANNELS.PONG_TIER_CHANGE, handlePongTierChange);
  useSocketEvent(REDIS_CHANNELS.PONG_ACHIEVEMENT_UNLOCKED, handlePongAchievement);

  // No UI needed - this is a pure event orchestrator
  return null;
}

// Export wrapped with error boundary
export default function EventHandlers() {
  return (
    <EventHandlerErrorBoundary eventType="EventHandlers">
      <EventHandlersCore />
    </EventHandlerErrorBoundary>
  );
}
