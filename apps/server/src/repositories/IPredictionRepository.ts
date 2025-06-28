// apps/server/src/repositories/IPredictionRepository.ts
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  DbLeaderboardEntry,
} from '@ems/types';

export interface IPredictionRepository {
  /** create + record options */
  createPrediction(data: {
    title: string;
    description: string;
    category: string;
    expiresAt: Date;
    options: Array<{ label: string }>;
  }): Promise<
    DbPrediction & {
      options: DbPredictionOption[];
      bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
    }
  >;

  /** list & include options + bets */
  listAllPredictions(): Promise<
    Array<
      DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      }
    >
  >;

  /** single find + include options + bets */
  findPredictionById(id: number): Promise<
    | (DbPrediction & {
        options: DbPredictionOption[];
        bets: Array<DbBet & { user: Pick<DbUser, 'id' | 'name'> }>;
      })
    | null
  >;
  /**
   * Retrieve the top users by MuskBucks balance (leaderboard).
   */
  getLeaderboard(limit: number): Promise<DbLeaderboardEntry[]>;
}
