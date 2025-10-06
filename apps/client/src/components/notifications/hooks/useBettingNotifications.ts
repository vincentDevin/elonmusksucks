// Betting and Parlay notification event handlers
import { useCallback } from 'react';
import { useSocketEvent } from '../../../contexts/EventBusCoreContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationSystem } from '../NotificationContext';
import { REDIS_CHANNELS } from '@ems/types';

// Backend emits achievement-format events with wrapped payloads
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

export function useBettingNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotificationSystem();

  // Handle bet won events
  const handleBetWon = useCallback(
    (data: BetEventPayload) => {
      // Security: Only show notifications for the current user
      if (!user || data.userId !== user.id) return;

      const profit = data.payload.payout - data.payload.amount;
      const profitAmount = profit.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

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
    [user, addNotification],
  );

  // Handle bet lost events
  const handleBetLost = useCallback(
    (data: BetEventPayload) => {
      // Security: Only show notifications for the current user
      if (!user || data.userId !== user.id) return;

      const lossAmount = data.payload.amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      addNotification(
        'bet-lost',
        'Bet Lost',
        `-${lossAmount} MB`,
        {
          priority: 'normal',
          duration: 8000,
          data: data.payload,
        },
      );
    },
    [user, addNotification],
  );

  // Handle parlay won events
  const handleParlayWon = useCallback(
    (data: ParlayEventPayload) => {
      // Security: Only show notifications for the current user
      if (!user || data.userId !== user.id) return;

      const profit = data.payload.payout - data.payload.amount;
      const profitAmount = profit.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

      addNotification(
        'parlay-won',
        `${data.payload.legCount}-Leg Parlay Won! 🏆`,
        `+${profitAmount} MB (${data.payload.odds.toFixed(2)}x odds)`,
        {
          priority: 'high',
          duration: 12000, // Longer for parlays
          data: data.payload,
        },
      );
    },
    [user, addNotification],
  );

  // Handle parlay lost events
  const handleParlayLost = useCallback(
    (data: ParlayEventPayload) => {
      // Security: Only show notifications for the current user
      if (!user || data.userId !== user.id) return;

      const lossAmount = data.payload.amount.toLocaleString('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });

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
    [user, addNotification],
  );

  // Subscribe to betting events via EventBusCore
  useSocketEvent(REDIS_CHANNELS.BET_WON, handleBetWon);
  useSocketEvent(REDIS_CHANNELS.BET_LOST, handleBetLost);
  useSocketEvent(REDIS_CHANNELS.PARLAY_WON, handleParlayWon);
  useSocketEvent(REDIS_CHANNELS.PARLAY_LOST, handleParlayLost);
}
