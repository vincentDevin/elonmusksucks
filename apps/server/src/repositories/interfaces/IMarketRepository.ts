export interface IMarketRepository {
  getTotalVolume(): Promise<bigint>;
  getActiveMarketsCount(): Promise<number>;
  getTotalUsersCount(): Promise<number>;
  getTrendingPredictions(limit: number): Promise<
    Array<{
      id: number;
      title: string;
      category: string | null;
      betCount: number;
      expiresAt: Date;
    }>
  >;
}
