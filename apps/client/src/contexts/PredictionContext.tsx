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
  startTransition,
  useOptimistic,
  type ReactNode,
} from 'react';
import {
  getPredictions,
  getPredictionById,
  createPrediction as createPredictionApi,
  type PredictionView,
  type CreatePredictionPayload,
} from '../api/predictions';
import type { BetWithUser, ParlayLegWithUser, PublicPredictionOption } from '@ems/types';
import { REDIS_CHANNELS } from '@ems/types';
import { socketRequest } from '../lib/socketRequest';
import { useEventBusCore } from './EventBusCoreContext';
import type {
  PredictionCreatedPayload,
  PredictionResolvedPayload,
  BetPlacedPayload,
  ParlayPlacedPayload,
} from '@ems/types';

// Extended option type with client-side properties
type ExtendedOption = PublicPredictionOption & {
  userBet?: any;
  totalBets?: number;
};
import { useAuth } from './AuthContext';

// ---- Source data type for modal ----
export interface PredictionSourceData {
  type: 'article' | 'tweet';
  id: string;
  title: string;
  url: string;
  publisher: string;
}

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

  /* Create Modal State */
  createModalOpen: boolean;
  createModalSourceData: PredictionSourceData | null;
  openCreateModal: (sourceData?: PredictionSourceData) => void;
  closeCreateModal: () => void;
}

const PredictionCtx = createContext<Ctx | undefined>(undefined);

export function PredictionProvider({ children }: { children: ReactNode }) {
  const { subscribe } = useEventBusCore();
  const { refreshUser } = useAuth();
  const [basePredictions, setBasePredictions] = useState<PredictionView[]>([]);
  const [predictions, optimisticUpdatePredictions] = useOptimistic(
    basePredictions,
    (
      current: PredictionView[],
      action: {
        type:
          | 'placeBet'
          | 'placeParlay'
          | 'revertBet'
          | 'revertParlay'
          | 'createPrediction'
          | 'revertPrediction';
        payload: any;
      },
    ) => {
      switch (action.type) {
        case 'placeBet':
          return current.map((pred) => ({
            ...pred,
            options:
              pred.options?.map((opt) =>
                opt.id === action.payload.optionId
                  ? {
                      ...opt,
                      userBet: action.payload.optimisticBet,
                      totalBets: ((opt as ExtendedOption).totalBets || 0) + 1,
                    }
                  : opt,
              ) || [],
          }));
        case 'revertBet':
          return current.map((pred) => ({
            ...pred,
            options:
              pred.options?.map((opt) =>
                opt.id === action.payload.optionId && (opt as ExtendedOption).userBet?.isOptimistic
                  ? {
                      ...opt,
                      userBet: undefined,
                      totalBets: Math.max(0, ((opt as ExtendedOption).totalBets || 0) - 1),
                    }
                  : opt,
              ) || [],
          }));
        case 'placeParlay':
          // Optimistically update all prediction legs with parlay data
          // Note: PredictionView doesn't have parlayLegs, this is client-side UI state only
          const { parlay } = action.payload;
          return current.map((pred) => {
            const hasLegInPrediction = parlay.legs.some((leg: { optionId: number }) =>
              pred.options?.some((opt) => opt.id === leg.optionId),
            );
            if (hasLegInPrediction) {
              return {
                ...pred,
                // Adding parlayLegs as client-side extension
                parlayLegs: [...((pred as any).parlayLegs ?? []), parlay],
              } as any;
            }
            return pred;
          });
        case 'revertParlay':
          // Remove optimistic parlay legs on error
          return current.map((pred) => ({
            ...pred,
            parlayLegs: (pred as any).parlayLegs?.filter((leg: any) => !leg.isOptimistic) ?? [],
          }));
        case 'createPrediction':
          // Add optimistic prediction to the beginning of the list
          const { prediction } = action.payload;
          return [prediction, ...current];
        case 'revertPrediction':
          // Remove optimistic prediction on error
          const { predictionId } = action.payload;
          return current.filter((pred) => !(pred as any).isOptimistic || pred.id !== predictionId);
        default:
          return current;
      }
    },
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const [latestBet] = useState<BetWithUser | null>(null);
  const [latestParlay, setLatestParlay] = useState<ParlayLegWithUser | null>(null);

  // ── Create Modal State ────────────────────────────────────────────────────
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createModalSourceData, setCreateModalSourceData] = useState<PredictionSourceData | null>(
    null,
  );

  const openCreateModal = useCallback((sourceData?: PredictionSourceData) => {
    setCreateModalSourceData(sourceData || null);
    setCreateModalOpen(true);
  }, []);

  const closeCreateModal = useCallback(() => {
    setCreateModalOpen(false);
    setCreateModalSourceData(null);
  }, []);

  // ── Fetch deduplication ───────────────────────────────────────────────────
  const fetchInProgressRef = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ── Initial fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async (options?: { debounce?: boolean }) => {
    // Debounce if requested (for rapid socket events)
    if (options?.debounce) {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      return new Promise<void>((resolve) => {
        debounceTimerRef.current = setTimeout(async () => {
          await fetchAll({ debounce: false });
          resolve();
        }, 300);
      });
    }

    // Prevent duplicate fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Mark fetch as in progress
    fetchInProgressRef.current = true;

    setLoading(true);
    setError(null);

    try {
      // Fetch only 'open' predictions by default with reasonable limit
      // This dramatically reduces data transfer compared to fetching all predictions
      const response = await getPredictions({
        status: 'open',
        limit: 50,
        offset: 0,
      });

      setBasePredictions(response.predictions || []);
      setError(null);
    } catch (err: any) {
      console.error('[PredictionContext] Failed to fetch predictions:', err);
      setError(err);
      // Keep existing predictions on error
    } finally {
      setLoading(false);
      fetchInProgressRef.current = false;
    }
  }, []);

  // Initial fetch on mount
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Cleanup on unmount: clear timers
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ── Refresh specific prediction ──────────────────────────────────────────
  const refreshPrediction = useCallback(async (predictionId: number) => {
    try {
      const updatedPrediction = await getPredictionById(predictionId);

      // Update the specific prediction in state
      setBasePredictions((prev) =>
        prev.map((p) => (p.id === predictionId ? updatedPrediction : p)),
      );
    } catch (err) {
      console.error('[PredictionContext] Failed to refresh prediction:', predictionId, err);
      // Don't throw - this is a non-critical enhancement
    }
  }, []);

  // ── Live EventBusCore updates ─────────────────────────────────────────────
  useEffect(() => {
    const unsubscribers = [
      // Prediction created events
      subscribe(REDIS_CHANNELS.PREDICTION_CREATED, (p: PredictionCreatedPayload) => {
        // Debounced refresh to get full prediction data from server
        // This is necessary because we need the full prediction object with all relationships
        fetchAll({ debounce: true });
      }),

      // Prediction resolved events
      subscribe(REDIS_CHANNELS.PREDICTION_RESOLVE, (p: PredictionResolvedPayload) => {
        setBasePredictions((prev) =>
          prev.map((x) =>
            x.id === p.predictionId
              ? {
                  ...x,
                  resolvedAt: p.resolvedAt,
                  winningOptionId: p.winningOptionId,
                }
              : x,
          ),
        );
      }),

      // Bet placed events - NO REFETCH, optimistic updates handle this
      subscribe(REDIS_CHANNELS.BET_PLACED, (betPayload: BetPlacedPayload) => {
        // Optimistic updates already handle bet placement via useOptimistic
        // No need to refetch all predictions for a single bet
        // The ODDS_UPDATE_ENHANCED event will handle odds changes if needed
      }),

      // Parlay placed events - NO REFETCH, optimistic updates handle this
      subscribe(REDIS_CHANNELS.PARLAY_PLACED, (parlayPayload: ParlayPlacedPayload) => {
        // Optimistic updates already handle parlay placement via useOptimistic
        // No need to refetch all predictions for a single parlay
        // The ODDS_UPDATE_ENHANCED event will handle odds changes if needed
      }),

      // Enhanced odds updates
      subscribe(
        REDIS_CHANNELS.ODDS_UPDATE_ENHANCED,
        (data: {
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
          // Update the specific prediction with new odds and market status
          setBasePredictions((prev) =>
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
        },
      ),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, fetchAll]);

  // ── Create prediction via REST (admin tool) ───────────────────────────────
  const createPrediction = useCallback(
    async (input: CreatePredictionPayload) => {
      setLoading(true);

      // Create optimistic prediction for immediate UI feedback
      const optimisticPredictionId = Math.floor(Date.now() / 1000); // Temporary ID

      // Determine final options based on type (matching server logic)
      // Note: CreatePredictionPayload.type could be lowercase or uppercase
      let finalOptions: Array<{ label: string }> = [];
      const typeUpper = (input.type as string).toUpperCase();
      if (typeUpper === 'BINARY') {
        finalOptions = [{ label: 'Yes' }, { label: 'No' }];
      } else if (typeUpper === 'OVER_UNDER') {
        if (input.threshold != null) {
          finalOptions = [
            { label: `Over ${input.threshold}` },
            { label: `Under ${input.threshold}` },
          ];
        }
      } else {
        // For 'MULTIPLE' type, use provided options
        finalOptions = input.options || [];
      }

      const optimisticPrediction: PredictionView = {
        id: optimisticPredictionId,
        title: input.title,
        description: input.description,
        categoryId: (input as any).categoryId || null,
        categoryName: (input as any).category,
        status: 'pending',
        type: input.type as string,
        threshold: input.threshold,
        expiresAt:
          typeof input.expiresAt === 'string'
            ? input.expiresAt
            : new Date(input.expiresAt).toISOString(),
        resolvedAt: null,
        creatorUserId: 0, // Will be set by server
        winningOptionId: null,
        createdAt: new Date().toISOString(),
        options: finalOptions.map((opt, index) => ({
          id: optimisticPredictionId * 10 + index, // Temporary ID
          label: opt.label,
          odds: 2.0, // Default odds
          predictionId: optimisticPredictionId,
        })),
        bets: [],
        sourceLinks: [],
        isOptimistic: true, // Mark as optimistic for potential rollback
      } as any;

      // Apply optimistic update within startTransition
      startTransition(() => {
        optimisticUpdatePredictions({
          type: 'createPrediction',
          payload: {
            prediction: optimisticPrediction,
          },
        });
      });

      try {
        await createPredictionApi(input);
        // Use non-debounced fetch for immediate feedback on user action
        await fetchAll({ debounce: false }); // This will replace optimistic prediction with real data
      } catch (err: any) {
        setError(err);
        // Revert optimistic prediction on error
        startTransition(() => {
          optimisticUpdatePredictions({
            type: 'revertPrediction',
            payload: {
              predictionId: optimisticPredictionId,
            },
          });
        });
      } finally {
        setLoading(false);
      }
    },
    [fetchAll, optimisticUpdatePredictions],
  );

  // ── Bet/parlay helpers via socketRequest ──────────────────────────────────
  const placeBet = useCallback(
    async (payload: { optionId: number; amount: number }) => {
      // Find the predictionId for this option so we can refresh it after bet placement
      const predictionId = basePredictions
        .flatMap((p) => p.options?.map((opt) => ({ predictionId: p.id, optionId: opt.id })) || [])
        .find((mapping) => mapping.optionId === payload.optionId)?.predictionId;

      // Create optimistic bet for immediate UI feedback using React 19 useOptimistic
      const optimisticBetId = `optimistic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const optimisticBet = {
        id: optimisticBetId,
        amount: payload.amount,
        status: 'pending' as const,
        createdAt: new Date().toISOString(),
        optionId: payload.optionId,
        isOptimistic: true,
      };

      // Apply optimistic update using React 19's useOptimistic within startTransition
      startTransition(() => {
        optimisticUpdatePredictions({
          type: 'placeBet',
          payload: {
            optionId: payload.optionId,
            optimisticBet,
          },
        });
      });

      try {
        const result = await socketRequest(REDIS_CHANNELS.BET_PLACE, payload);

        // Replace optimistic bet with real bet data if available
        if (result && typeof result === 'object' && 'bet' in result) {
          setBasePredictions((prev) =>
            prev.map((pred) => ({
              ...pred,
              options:
                pred.options?.map((opt) =>
                  opt.id === payload.optionId ? { ...opt, userBet: result.bet } : opt,
                ) || [],
            })),
          );
        }
        // Otherwise the optimistic bet will be replaced when socket events arrive

        // Refresh the specific prediction to show the new bet and updated data
        if (predictionId) {
          startTransition(() => {
            refreshPrediction(predictionId);
          });
        }

        // React 19 Optimization: Use startTransition for non-blocking user refresh
        // Note: AuthContext already handles optimistic updates via Socket.IO events
        startTransition(() => {
          refreshUser();
        });
      } catch (error) {
        console.error('PredictionContext placeBet error', error);

        // Revert optimistic update on error using React 19's useOptimistic
        startTransition(() => {
          optimisticUpdatePredictions({
            type: 'revertBet',
            payload: {
              optionId: payload.optionId,
            },
          });
        });

        throw error;
      }
    },
    [refreshUser, optimisticUpdatePredictions, basePredictions, refreshPrediction],
  );

  const placeParlay = useCallback(
    async (payload: { legs: { optionId: number }[]; amount: number }) => {
      // Find all predictionIds for parlay legs so we can refresh them after placement
      const affectedPredictionIds = Array.from(
        new Set(
          payload.legs
            .map((leg) => {
              return basePredictions
                .flatMap(
                  (p) => p.options?.map((opt) => ({ predictionId: p.id, optionId: opt.id })) || [],
                )
                .find((mapping) => mapping.optionId === leg.optionId)?.predictionId;
            })
            .filter((id): id is number => id !== undefined),
        ),
      );

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

      // Apply optimistic update using React 19's useOptimistic within startTransition
      startTransition(() => {
        optimisticUpdatePredictions({
          type: 'placeParlay',
          payload: {
            parlay: optimisticParlay,
          },
        });
      });

      // Set latest parlay optimistically
      setLatestParlay(optimisticParlay as any);

      try {
        const result = await socketRequest(REDIS_CHANNELS.PARLAY_PLACE, payload);

        // Replace with real parlay data if available
        if (result && typeof result === 'object' && 'parlay' in result) {
          setLatestParlay((result as any).parlay);
        }

        // Refresh all affected predictions to show the new parlay and updated data
        if (affectedPredictionIds.length > 0) {
          startTransition(() => {
            affectedPredictionIds.forEach((predictionId) => {
              refreshPrediction(predictionId);
            });
          });
        }

        // React 19 Optimization: Use startTransition for non-blocking user refresh
        // Note: AuthContext already handles optimistic updates via Socket.IO events
        startTransition(() => {
          refreshUser();
        });
      } catch (error) {
        console.error('PredictionContext placeParlay error', error);

        // Revert optimistic update on error using React 19's useOptimistic
        startTransition(() => {
          optimisticUpdatePredictions({
            type: 'revertParlay',
            payload: {},
          });
        });

        setLatestParlay(null);
        throw error;
      }
    },
    [refreshUser, optimisticUpdatePredictions, basePredictions, refreshPrediction],
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
      createModalOpen,
      createModalSourceData,
      openCreateModal,
      closeCreateModal,
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
      createModalOpen,
      createModalSourceData,
      openCreateModal,
      closeCreateModal,
    ],
  );

  return <PredictionCtx.Provider value={value}>{children}</PredictionCtx.Provider>;
}

export function usePredictionMarket() {
  const ctx = useContext(PredictionCtx);
  if (!ctx) throw new Error('usePredictionMarket must be used within PredictionProvider');
  return ctx;
}
