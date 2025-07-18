// apps/client/src/contexts/PredictionMarketContext.tsx
import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { usePredictions } from '../hooks/usePredictions';
import { useBetting } from '../hooks/useBetting';
import type {
  PredictionFull,
  CreatePredictionPayload,
} from '../api/predictions';
import type { BetWithUser, PublicBet, PublicParlay } from '@ems/types';
import type {
  PlaceBetPayload,
  PlaceParlayPayload,
} from '../api/betting';

interface PredictionMarketContextType {
  predictions: PredictionFull[];
  predictionsLoading: boolean;
  predictionsError: Error | null;
  refresh: () => Promise<void>;
  createPrediction: (p: CreatePredictionPayload) => Promise<void>;
  addOptimisticBet: (b: BetWithUser) => void;

  placeBet: (p: PlaceBetPayload) => Promise<PublicBet>;
  placeParlay: (p: PlaceParlayPayload) => Promise<PublicParlay>;
  bettingLoading: boolean;
  bettingError: Error | null;
  latestBet: PublicBet | null;
  latestParlay: PublicParlay | null;
}

const PredictionMarketContext = createContext<PredictionMarketContextType | undefined>(undefined);

export function PredictionMarketProvider({ children }: { children: ReactNode }) {
  const predictions = usePredictions();
  const betting = useBetting();

  const value: PredictionMarketContextType = {
    predictions: predictions.predictions,
    predictionsLoading: predictions.loading,
    predictionsError: predictions.error,
    refresh: predictions.refresh,
    createPrediction: predictions.createPrediction,
    addOptimisticBet: predictions.addOptimisticBet,
    placeBet: betting.placeBet,
    placeParlay: betting.placeParlay,
    bettingLoading: betting.loading,
    bettingError: betting.error,
    latestBet: betting.latestBet,
    latestParlay: betting.latestParlay,
  };

  return (
    <PredictionMarketContext.Provider value={value}>
      {children}
    </PredictionMarketContext.Provider>
  );
}

export function usePredictionMarket() {
  const ctx = useContext(PredictionMarketContext);
  if (!ctx) throw new Error('usePredictionMarket must be used within PredictionMarketProvider');
  return ctx;
}
