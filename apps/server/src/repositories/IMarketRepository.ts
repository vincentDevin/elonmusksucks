export interface IMarketRepository {
  getTotalVolume(): Promise<bigint>;
  getActiveMarketsCount(): Promise<number>;
  getTotalUsersCount(): Promise<number>;
  getTrendingPredictions(limit: number): Promise<
    Array<{
      id: number;
      title: string;
      category: string;
      betCount: number;
      expiresAt: Date;
    }>
  >;
}
