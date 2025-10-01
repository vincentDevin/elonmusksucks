// apps/server/src/repositories/IPredictionRepository.ts
import type {
  PrismaPredictionOption,
  PrismaPredictionSourceLink,
  ParlayLegWithUser,
  PredictionType,
  BetWithUser,
  DbPredictionActivity,
  PredictionWithRelations,
  PredictionWithCategory,
} from '@ems/types';

export interface IPredictionRepository {
  /** Create a prediction along with its options */
  createPrediction(data: {
    title: string;
    description: string;
    categoryId: number;
    expiresAt: Date;
    creatorId: number;
    options: Array<{ label: string }>;
    type: PredictionType;
    threshold?: number;
  }): Promise<PredictionWithCategory & { bets: BetWithUser[] }>;

  /** List all predictions, including options, bets, and parlay legs */
  listAllPredictions(): Promise<PredictionWithRelations[]>;

  /** Find a single prediction by ID, including options, bets, and parlay legs */
  findPredictionById(id: number): Promise<PredictionWithRelations | null>;

  /** Find multiple predictions by IDs, including options, bets, and parlay legs */
  findPredictionsByIds(ids: number[]): Promise<PredictionWithRelations[]>;

  /** Find basic prediction data by ID (minimal fields for validation) */
  findPredictionBasicById(id: number): Promise<{
    id: number;
    creatorId: number;
    resolved: boolean;
  } | null>;

  /** Find existing source link for a prediction */
  findExistingSourceLink(
    predictionId: number,
    articleId?: number,
    tweetId?: string,
  ): Promise<PrismaPredictionSourceLink | null>;

  /** Create a new source link for a prediction */
  createSourceLink(
    predictionId: number,
    articleId: number | null,
    tweetId: string | null,
    url: string,
    title: string | null,
    publisher: string | null,
  ): Promise<PrismaPredictionSourceLink>;

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
    }>
  >;

  /** Increment the view count for a prediction */
  incrementViewCount(predictionId: number): Promise<void>;

  /** Check if a user has already viewed a specific prediction */
  hasUserViewedPrediction(predictionId: number, userId: number): Promise<boolean>;

  /** Get the total number of unique user views for a prediction */
  getUserViewCount(predictionId: number): Promise<number>;

  /** Get user activity log for recommendation analysis */
  getUserActivityLog(
    userId: number,
    activityTypes: string[],
    limit?: number,
  ): Promise<DbPredictionActivity[]>;
}
