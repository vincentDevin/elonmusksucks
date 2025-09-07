export interface IStatsRepository {
  getUserCounters(userId: number): Promise<Record<string, number>>;
  updateUserCounters(userId: number, updates: Record<string, number>): Promise<void>;
  getCounter(userId: number, counterName: string): Promise<number>;
  incrementCounter(userId: number, counterName: string, amount?: number): Promise<number>;
  getMonthlyProfitLoss(userId: number): Promise<
    Array<{
      date: string;
      profit: bigint;
    }>
  >;
  getWeeklyVolume(userId: number): Promise<
    Array<{
      date: string;
      volume: bigint;
    }>
  >;
  getCategoryAccuracy(userId: number): Promise<
    Array<{
      category: string;
      totalBets: bigint;
      wins: bigint;
      accuracy: number;
    }>
  >;
}
