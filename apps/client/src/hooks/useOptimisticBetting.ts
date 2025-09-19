// apps/client/src/hooks/useOptimisticBetting.ts
// Optimistic updates for betting operations with React 19
// Provides instant UI feedback for bet placement and resolution

import { useCallback } from 'react';
import { useOptimisticUpdate, useOptimisticList } from './useOptimisticUpdate';
import { useAuth } from '../contexts/AuthContext';
import { REDIS_CHANNELS } from '../types/events';
import api from '../api/axios';

interface BetData {
  id?: number;
  predictionId: number;
  optionId: number;
  amount: number;
  odds: number;
  potentialWinnings: number;
  status: 'pending' | 'won' | 'lost' | 'cancelled';
  timestamp?: string;
}

interface OptimisticBetState {
  balance: number;
  activeBets: BetData[];
  recentBet: BetData | null;
}

/**
 * Hook for optimistic betting operations
 * Provides instant balance updates and bet placement feedback
 */
export function useOptimisticBetting() {
  const { user, updateUser } = useAuth();
  const currentBalance = user?.muskBucks || 0;

  // Optimistic balance updates
  const {
    value: optimisticBalance,
    isPending: isBalanceUpdating,
    error: balanceError,
    updateOptimistically: updateBalance,
  } = useOptimisticUpdate(currentBalance, {
    successEvent: REDIS_CHANNELS.BALANCE_UPDATE,
    failureEvent: REDIS_CHANNELS.BET_FAILED,
    timeout: 3000,
    autoRollback: true,
    onSuccess: (newBalance) => {
      // Update auth context with confirmed balance
      if (updateUser && user) {
        updateUser({ ...user, muskBucks: newBalance });
      }
    },
  });

  // Optimistic active bets list
  const {
    items: activeBets,
    isPending: isBetsUpdating,
    addItem: addBet,
    removeItem: removeBet,
    updateItem: updateBet,
  } = useOptimisticList<BetData>([], {
    successEvent: REDIS_CHANNELS.BET_PLACED,
    failureEvent: REDIS_CHANNELS.BET_FAILED,
    timeout: 5000,
  });

  /**
   * Place a bet with optimistic updates
   */
  const placeBetOptimistically = useCallback(
    async (betData: Omit<BetData, 'id' | 'status' | 'timestamp'>) => {
      // Validate sufficient balance
      if (betData.amount > optimisticBalance) {
        throw new Error('Insufficient balance');
      }

      // Create optimistic bet object
      const optimisticBet: BetData = {
        ...betData,
        id: Date.now(), // Temporary ID
        status: 'pending',
        timestamp: new Date().toISOString(),
      };

      // Update balance optimistically (deduct bet amount)
      const newBalance = optimisticBalance - betData.amount;

      // Start both optimistic updates
      const balancePromise = updateBalance(
        newBalance,
        async () => {
          // This will be confirmed by the server response
          return newBalance;
        },
        { updateId: `bet-${optimisticBet.id}` },
      );

      const betPromise = addBet(optimisticBet, async () => {
        // Make actual API call
        const response = await api.post('/api/bets', betData);

        // Update with real bet ID
        optimisticBet.id = response.data.id;

        // Return updated bets list
        return [...activeBets, { ...optimisticBet, ...response.data }];
      });

      // Wait for both updates
      try {
        await Promise.all([balancePromise, betPromise]);
        return optimisticBet;
      } catch (error) {
        console.error('[OptimisticBetting] Bet placement failed:', error);
        throw error;
      }
    },
    [optimisticBalance, activeBets, updateBalance, addBet],
  );

  /**
   * Cancel a bet with optimistic updates
   */
  const cancelBetOptimistically = useCallback(
    async (betId: number) => {
      const bet = activeBets.find((b) => b.id === betId);
      if (!bet) {
        throw new Error('Bet not found');
      }

      // Refund the bet amount optimistically
      const newBalance = optimisticBalance + bet.amount;

      // Update balance and remove bet
      const balancePromise = updateBalance(
        newBalance,
        async () => {
          const response = await api.post(`/api/bets/${betId}/cancel`);
          return response.data.newBalance;
        },
        { updateId: `cancel-${betId}` },
      );

      const betPromise = removeBet(betId, async () => {
        // Bet removal confirmed by API
        return activeBets.filter((b) => b.id !== betId);
      });

      await Promise.all([balancePromise, betPromise]);
    },
    [optimisticBalance, activeBets, updateBalance, removeBet],
  );

  /**
   * Cash out a winning bet early
   */
  const cashOutOptimistically = useCallback(
    async (betId: number, cashOutAmount: number) => {
      const bet = activeBets.find((b) => b.id === betId);
      if (!bet) {
        throw new Error('Bet not found');
      }

      // Add cash out amount to balance
      const newBalance = optimisticBalance + cashOutAmount;

      // Update balance and bet status
      const balancePromise = updateBalance(
        newBalance,
        async () => {
          const response = await api.post(`/api/bets/${betId}/cashout`, {
            amount: cashOutAmount,
          });
          return response.data.newBalance;
        },
        { updateId: `cashout-${betId}` },
      );

      const betPromise = updateBet(
        betId,
        { status: 'won', potentialWinnings: cashOutAmount },
        async () => {
          // Return updated bets list
          return activeBets.map((b) =>
            b.id === betId ? { ...b, status: 'won' as const, potentialWinnings: cashOutAmount } : b,
          );
        },
      );

      await Promise.all([balancePromise, betPromise]);
    },
    [optimisticBalance, activeBets, updateBalance, updateBet],
  );

  return {
    // Current values
    balance: optimisticBalance,
    activeBets,

    // Pending states
    isBalanceUpdating,
    isBetsUpdating,

    // Errors
    balanceError,

    // Actions
    placeBet: placeBetOptimistically,
    cancelBet: cancelBetOptimistically,
    cashOut: cashOutOptimistically,

    // Computed values
    totalExposure: activeBets.reduce((sum, bet) => sum + bet.amount, 0),
    potentialWinnings: activeBets.reduce((sum, bet) => sum + bet.potentialWinnings, 0),
    canPlaceBet: (amount: number) => optimisticBalance >= amount && !isBalanceUpdating,
  };
}

/**
 * Hook for optimistic parlay operations
 */
export function useOptimisticParlay() {
  const { user, updateUser } = useAuth();
  const currentBalance = user?.muskBucks || 0;

  const {
    value: parlayLegs,
    isPending,
    error,
    updateOptimistically,
    reset,
  } = useOptimisticUpdate<
    Array<{
      predictionId: number;
      optionId: number;
      odds: number;
    }>
  >([], {
    timeout: 0, // No timeout for parlay building
    autoRollback: false,
  });

  const addLeg = useCallback(
    (leg: (typeof parlayLegs)[0]) => {
      // Check for duplicates
      if (parlayLegs.some((l) => l.predictionId === leg.predictionId)) {
        throw new Error('Prediction already in parlay');
      }

      return updateOptimistically([...parlayLegs, leg], async () => [...parlayLegs, leg]);
    },
    [parlayLegs, updateOptimistically],
  );

  const removeLeg = useCallback(
    (predictionId: number) => {
      return updateOptimistically(
        parlayLegs.filter((l) => l.predictionId !== predictionId),
        async () => parlayLegs.filter((l) => l.predictionId !== predictionId),
      );
    },
    [parlayLegs, updateOptimistically],
  );

  const calculateOdds = useCallback(() => {
    return parlayLegs.reduce((total, leg) => total * leg.odds, 1);
  }, [parlayLegs]);

  const placeParlayOptimistically = useCallback(
    async (amount: number) => {
      if (amount > currentBalance) {
        throw new Error('Insufficient balance');
      }

      const totalOdds = calculateOdds();
      const potentialWinnings = amount * totalOdds;

      // Make API call with optimistic UI update
      const response = await api.post('/api/parlays', {
        legs: parlayLegs,
        amount,
        totalOdds,
        potentialWinnings,
      });

      // Clear parlay after successful placement
      reset();

      return response.data;
    },
    [parlayLegs, currentBalance, calculateOdds, reset],
  );

  return {
    legs: parlayLegs,
    isPending,
    error,
    addLeg,
    removeLeg,
    clearParlay: reset,
    totalOdds: calculateOdds(),
    canAddLeg: (predictionId: number) => !parlayLegs.some((l) => l.predictionId === predictionId),
    placeParlay: placeParlayOptimistically,
  };
}
