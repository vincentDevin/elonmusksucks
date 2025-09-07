// apps/client/src/contexts/PredictionContext.tsx
// Rollback: Remove optimistic UI updates and restore original bet placement behavior
// -----------------------------------------------------------------------------
// Unified context for predictions list + live betting/parlay actions.
// Replaces previous usePredictions / useBetting hooks.
// -----------------------------------------------------------------------------

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  getPredictions,
  createPrediction as createPredictionApi,
  type PredictionView,
  type CreatePredictionPayload,
} from '../api/predictions';
import type { BetWithUser, ParlayLegWithUser, PublicPredictionOption } from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import { socketRequest } from '../lib/socketRequest';

// Extended option type with client-side properties
type ExtendedOption = PublicPredictionOption & {
  userBet?: any;
  totalBets?: number;
};
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

// ---- Context shape ----
interface Ctx {
  predictions: PredictionView[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  createPrediction: (p: CreatePredictionPayload) => Promise<void>;

  /* Betting */
  placeBet: (payload: { optionId: number; amount: number }) => Promise<void>;
  placeParlay: (payload: { legs: { optionId: number }[]; amount: number }) => Promise<void>;
  latestBet: BetWithUser | null;
  latestParlay: ParlayLegWithUser | null;
}

const PredictionCtx = createContext<Ctx | undefined>(undefined);

export function PredictionProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { refreshUser } = useAuth();
  const optimisticBetsRef = useRef<Map<string, any>>(new Map());
  const [predictions, setPredictions] = useState<PredictionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [latestBet, setLatestBet] = useState<BetWithUser | null>(null);
  const [latestParlay, setLatestParlay] = useState<ParlayLegWithUser | null>(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPredictions();
      setPredictions(data);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── Live socket updates ───────────────────────────────────────────────────
  useEffect(() => {
    const onCreated = (p: PredictionView) => setPredictions((prev) => [p, ...prev]);
    const onResolved = (p: PredictionView) =>
      setPredictions((prev) => prev.map((x) => (x.id === p.id ? p : x)));

    const onBet = (bet: BetWithUser) => {
      setLatestBet(bet);
      setPredictions((prev) =>
        prev.map((pred) =>
          pred.id === bet.predictionId ? { ...pred, bets: [...(pred.bets ?? []), bet] } : pred,
        ),
      );
    };

    const onParlay = (leg: ParlayLegWithUser & { predictionId: number }) => {
      setLatestParlay(leg);
      setPredictions((prev) =>
        prev.map((p) =>
          p.id === leg.predictionId ? { ...p, parlayLegs: [...(p.parlayLegs ?? []), leg] } : p,
        ),
      );
    };

    // 🎮 Enhanced odds updates with excitement data
    const onEnhancedOddsUpdate = (data: {
      predictionId: number;
      hotMarket: boolean;
      options: Array<{
        id: number;
        odds: number;
        label: string;
        change: number;
        changePercent: number;
      }>;
    }) => {
      console.log('🎯 Enhanced odds updated for prediction:', data.predictionId, data);

      // Update the specific prediction with new odds and market status
      setPredictions((prev) =>
        prev.map((p) => {
          if (p.id === data.predictionId) {
            const updatedOptions = p.options.map((option: any) => {
              const updatedOption = data.options.find((opt: any) => opt.id === option.id);
              return updatedOption ? { ...option, odds: updatedOption.odds } : option;
            });
            return { ...p, options: updatedOptions, hotMarket: data.hotMarket };
          }
          return p;
        }),
      );
    };

    socket.on('predictionCreated', onCreated);
    socket.on('predictionResolved', onResolved);
    socket.on('betPlaced', onBet);
    socket.on('parlayPlaced', onParlay);
    socket.on('oddsUpdatedEnhanced', onEnhancedOddsUpdate);

    return () => {
      socket.off('predictionCreated', onCreated);
      socket.off('predictionResolved', onResolved);
      socket.off('betPlaced', onBet);
      socket.off('parlayPlaced', onParlay);
      socket.off('oddsUpdatedEnhanced', onEnhancedOddsUpdate);
    };
  }, [socket]);

  // ── Create prediction via REST (admin tool) ───────────────────────────────
  const createPrediction = useCallback(
    async (input: CreatePredictionPayload) => {
      setLoading(true);
      try {
        await createPredictionApi(input); // if you have helper, else call fetch.
        await fetchAll();
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
    [fetchAll],
  );

  // ── Bet/parlay helpers via socketRequest ──────────────────────────────────
  const placeBet = useCallback(
    async (payload: { optionId: number; amount: number }) => {
      console.log('PredictionContext placeBet called', payload);

      // Create optimistic bet for immediate UI feedback
      const optimisticBetId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticBet = {
        id: optimisticBetId,
        amount: payload.amount,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        optionId: payload.optionId,
        isOptimistic: true,
      };

      // Store optimistic bet for rollback if needed
      optimisticBetsRef.current.set(optimisticBetId, optimisticBet);

      // Optimistically update predictions state
      setPredictions((prev) =>
        prev.map((pred) => ({
          ...pred,
          options:
            pred.options?.map((opt) =>
              opt.id === payload.optionId
                ? {
                    ...opt,
                    userBet: optimisticBet,
                    totalBets: ((opt as ExtendedOption).totalBets || 0) + 1,
                  }
                : opt,
            ) || [],
        })),
      );

      try {
        const result = await socketRequest(REDIS_CHANNELS.BET_PLACE, payload);
        console.log('PredictionContext placeBet success', result);

        // Clean up optimistic bet and replace with real data
        optimisticBetsRef.current.delete(optimisticBetId);

        // Replace optimistic bet with real bet data if available
        if (result && typeof result === 'object' && 'bet' in result) {
          setPredictions((prev) =>
            prev.map((pred) => ({
              ...pred,
              options:
                pred.options?.map((opt) =>
                  opt.id === payload.optionId ? { ...opt, userBet: result.bet } : opt,
                ) || [],
            })),
          );
        }

        // Trigger user refresh to update balance and stats
        // Note: AuthContext already handles optimistic updates via Socket.IO events
        setTimeout(() => refreshUser(), 100);
      } catch (error) {
        console.error('PredictionContext placeBet error', error);

        // Clean up optimistic bet and rollback optimistic update on error
        optimisticBetsRef.current.delete(optimisticBetId);
        setPredictions((prev) =>
          prev.map((pred) => ({
            ...pred,
            options:
              pred.options?.map((opt) =>
                opt.id === payload.optionId && (opt as ExtendedOption).userBet?.isOptimistic
                  ? {
                      ...opt,
                      userBet: undefined,
                      totalBets: Math.max(0, ((opt as ExtendedOption).totalBets || 0) - 1),
                    }
                  : opt,
              ) || [],
          })),
        );

        throw error;
      }
    },
    [refreshUser],
  );

  const placeParlay = useCallback(
    async (payload: { legs: { optionId: number }[]; amount: number }) => {
      // Create optimistic parlay for immediate UI feedback
      const optimisticParlayId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticParlay = {
        id: optimisticParlayId,
        legs: payload.legs,
        totalAmount: payload.amount,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        isOptimistic: true,
      };

      // Store for potential rollback
      optimisticBetsRef.current.set(optimisticParlayId, optimisticParlay);

      // Set latest parlay optimistically
      setLatestParlay(optimisticParlay as any);

      try {
        const result = await socketRequest(REDIS_CHANNELS.PARLAY_PLACE, payload);

        // Clean up optimistic parlay
        optimisticBetsRef.current.delete(optimisticParlayId);

        // Replace with real parlay data if available
        if (result && typeof result === 'object' && 'parlay' in result) {
          setLatestParlay((result as any).parlay);
        }

        // Trigger user refresh to update balance and stats
        // Note: AuthContext already handles optimistic updates via Socket.IO events
        setTimeout(() => refreshUser(), 100);
      } catch (error) {
        console.error('PredictionContext placeParlay error', error);

        // Clean up optimistic parlay and rollback
        optimisticBetsRef.current.delete(optimisticParlayId);
        setLatestParlay(null);

        throw error;
      }
    },
    [refreshUser],
  );

  const value = useMemo<Ctx>(
    () => ({
      predictions,
      loading,
      error,
      refresh: fetchAll,
      createPrediction,
      placeBet,
      placeParlay,
      latestBet,
      latestParlay,
    }),
    [
      predictions,
      loading,
      error,
      fetchAll,
      createPrediction,
      placeBet,
      placeParlay,
      latestBet,
      latestParlay,
    ],
  );

  return <PredictionCtx.Provider value={value}>{children}</PredictionCtx.Provider>;
}

export function usePredictionMarket() {
  const ctx = useContext(PredictionCtx);
  if (!ctx) throw new Error('usePredictionMarket must be used within PredictionProvider');
  return ctx;
}
