// apps/client/src/contexts/PredictionContext.tsx
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
  type ReactNode,
} from 'react';
import {
  getPredictions,
  createPrediction as createPredictionApi,
  type PredictionFull,
  type CreatePredictionPayload,
} from '../api/predictions';
import type { BetWithUser, ParlayLegWithUser } from '@ems/types';
import { socketRequest } from '../lib/socketRequest';
import { useSocket } from './SocketContext';

// ---- Context shape ----
interface Ctx {
  predictions: PredictionFull[];
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
  const [predictions, setPredictions] = useState<PredictionFull[]>([]);
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
    const onCreated = (p: PredictionFull) => setPredictions((prev) => [p, ...prev]);
    const onResolved = (p: PredictionFull) =>
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

    socket.on('predictionCreated', onCreated);
    socket.on('predictionResolved', onResolved);
    socket.on('betPlaced', onBet);
    socket.on('parlayPlaced', onParlay);

    return () => {
      socket.off('predictionCreated', onCreated);
      socket.off('predictionResolved', onResolved);
      socket.off('betPlaced', onBet);
      socket.off('parlayPlaced', onParlay);
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
  const placeBet = useCallback(async (payload: { optionId: number; amount: number }) => {
    await socketRequest('bet:place', payload);
  }, []);

  const placeParlay = useCallback(
    async (payload: { legs: { optionId: number }[]; amount: number }) => {
      await socketRequest('parlay:place', payload);
    },
    [],
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
