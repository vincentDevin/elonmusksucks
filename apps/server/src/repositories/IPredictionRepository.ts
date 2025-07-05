// apps/server/src/repositories/IPredictionRepository.ts
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  DbLeaderboardEntry,
} from '@ems/types';
import type { PredictionType } from '@ems/types';

/** A single leg in a parlay, with its user and stake info */
export type ParlayLegWithUser = {
  parlayId: number;
  user: Pick<DbUser, 'id' | 'name'>;
  stake: number;
  optionId: number;
  createdAt: Date;
};

export interface IPredictionRepository {
  /** Create a prediction along with its options */
  createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
    }
  >;

  /** List all predictions, including options, bets, and parlay legs */
  listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      }
    >
  >;

  /** Find a single prediction by ID, including options, bets, and parlay legs */
  findPredictionById(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
        parlayLegs: ParlayLegWithUser[];
      })
    | null
  >;

  /** Retrieve the top users by MuskBucks balance (leaderboard) */
  getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]>;
}
