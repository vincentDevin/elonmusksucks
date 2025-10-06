// Financial event notification handlers (balance milestones, bankruptcy, etc.)
import { useCallback } from 'react';
import { useSocketEvent } from '../../../contexts/EventBusCoreContext';
import { useAuth } from '../../../contexts/AuthContext';
import { useNotificationSystem } from '../NotificationContext';
import { REDIS_CHANNELS } from '@ems/types';

// Backend emits achievement-format events with wrapped payloads
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

export function useFinancialNotifications() {
  const { user } = useAuth();
  const { addNotification } = useNotificationSystem();

  // Format currency from string (BigInt serialized)
  const formatMB = (amountStr: string) => {
    const num = Number(amountStr);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  // Handle balance milestone reached
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

  // Handle bankruptcy
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

  // Handle rags to riches
  const handleRagsToRiches = useCallback(
    (data: RagsToRichesEvent) => {
      if (!user || data.userId !== user.id) return;

      addNotification(
        'rags-to-riches',
        'Rags to Riches! 🚀',
        `From ${formatMB(data.payload.startBalance)} to ${formatMB(data.payload.endBalance)} MB!`,
        {
          priority: 'high',
          duration: 15000, // Longer for big achievements
          data: data.payload,
        },
      );
    },
    [user, addNotification],
  );

  // Handle massive loss
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
    [user, addNotification],
  );

  // Handle massive gain
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
    [user, addNotification],
  );

  // Handle comeback
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
    [user, addNotification],
  );

  // Subscribe to financial events via EventBusCore
  useSocketEvent(REDIS_CHANNELS.BALANCE_MILESTONE_REACHED, handleBalanceMilestone);
  useSocketEvent(REDIS_CHANNELS.BANKRUPTCY_DETECTED, handleBankruptcy);
  useSocketEvent(REDIS_CHANNELS.RAGS_TO_RICHES, handleRagsToRiches);
  useSocketEvent(REDIS_CHANNELS.MASSIVE_LOSS_DETECTED, handleMassiveLoss);
  useSocketEvent(REDIS_CHANNELS.MASSIVE_GAIN_DETECTED, handleMassiveGain);
  useSocketEvent(REDIS_CHANNELS.COMEBACK_DETECTED, handleComeback);
}
