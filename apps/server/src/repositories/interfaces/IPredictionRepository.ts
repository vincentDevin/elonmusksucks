// apps/server/src/repositories/IPredictionRepository.ts
import type {
  DbPrediction,
  DbPredictionOption,
  DbBet,
  DbUser,
  ParlayLegWithUser,
} from '@ems/types';
import type { PredictionType } from '@ems/types';

// Using the global ParlayLegWithUser type from @ems/types

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

  /** Get source links for a prediction */
  getSourceLinks(predictionId: number): Promise<
    Array<{
      id: number;
      predictionId: number;
      articleId: number | null;
      tweetId: string | null;
      url: string;
      title: string | null;
      publisher: string | null;
      capturedAt: Date;
      article: {
        id: number;
        title: string;
        url: string;
        leadImageUrl: string | null;
        feed: {
          name: string;
          siteUrl: string | null;
        };
      } | null;
      tweet: {
        id: string;
        text: string;
        permalink: string;
        authorHandle: string;
      } | null;
    }>
  >;
}
