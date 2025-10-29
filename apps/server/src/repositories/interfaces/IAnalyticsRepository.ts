export interface IAnalyticsRepository {
  // Platform health metrics
  getActiveUserCounts(
    last24h: Date,
    last7d: Date,
    last30d: Date,
    previous30d: Date,
  ): Promise<{
    last24h: number;
    last7d: number;
    last30d: number;
    previous30d: number;
  }>;

  getPredictionMetrics(): Promise<{
    total: number;
    active: number;
    resolved: number;
    createdLast24h: number;
    resolutionRate: number;
  }>;

  getBettingMetrics(last24h: Date): Promise<{
    totalVolume: string;
    volumeLast24h: string;
    uniqueBettors: number;
    averageBetSize: string;
    winRate: number;
  }>;

  getEngagementMetrics(last24h: Date): Promise<{
    totalComments: number;
    averageCommentsPerPrediction: number;
    mostActiveUsers: number;
    pongMatchesLast24h: number;
  }>;

  getPerformanceMetrics(): Promise<{
    avgBetResolutionTime: number;
    avgPredictionAccuracy: number;
    platformUptime: number;
    avgLoadTime: number;
  }>;

  // Trend analysis
  getUserRegistrations(dateRange: string[]): Promise<
    Array<{
      date: string;
      count: number;
      cumulativeCount: number;
    }>
  >;

  getPredictionCreations(dateRange: string[]): Promise<
    Array<{
      date: string;
      count: number;
      cumulativeCount: number;
    }>
  >;

  getBettingVolume(dateRange: string[]): Promise<
    Array<{
      date: string;
      volume: string;
      cumulativeVolume: string;
    }>
  >;

  getEngagementData(dateRange: string[]): Promise<
    Array<{
      date: string;
      comments: number;
      likes: number;
      views: number;
      pongMatches: number;
    }>
  >;

  // Cross-feature analytics
  getUserSegmentation(): Promise<{
    highValueUsers: number;
    activeUsers: number;
    newUsers: number;
    dormantUsers: number;
  }>;

  getFeatureCorrelations(): Promise<
    Array<{
      feature1: string;
      feature2: string;
      correlation: number;
      significance: number;
    }>
  >;

  getUserJourney(): Promise<
    Array<{
      step: string;
      users: number;
      conversionRate: number;
    }>
  >;

  // Content analytics
  getCategoryPerformance(): Promise<
    Array<{
      category: string;
      totalPredictions: number;
      avgAccuracy: number;
      totalVolume: string;
      participationRate: number;
    }>
  >;

  getTopCreators(): Promise<
    Array<{
      userId: number;
      username: string;
      totalPredictions: number;
      avgAccuracy: number;
      totalFollowers: number;
    }>
  >;

  getContentMetrics(): Promise<{
    totalArticles: number;
    articlesLast24h: number;
    avgEngagementPerPost: number;
    topSources: Array<{ source: string; articles: number }>;
  }>;

  // Retention metrics
  getUserRetention(): Promise<{
    day1: number;
    day7: number;
    day30: number;
  }>;

  // Daily content creation trends
  getDailyCreationCounts(
    startDate: Date,
    endDate: Date,
  ): Promise<
    Array<{
      date: string;
      articles: number;
      posts: number;
      predictions: number;
      total: number;
    }>
  >;

  // Top content authors
  getTopAuthors(limit: number): Promise<
    Array<{
      userId: number;
      username: string;
      contentCount: number;
    }>
  >;
}
