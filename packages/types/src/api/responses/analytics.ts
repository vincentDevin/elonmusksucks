/**
 * Analytics Response DTOs
 *
 * Response types for analytics and metrics endpoints
 */

// ============================================================================
// Platform Health Metrics
// ============================================================================

export interface PlatformHealthMetricsResponse {
  systemHealth: {
    uptime: number;
    responseTime: number;
    errorRate: number;
    activeConnections: number;
  };
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsersToday: number;
    retentionRate: number;
  };
  predictionMetrics: {
    totalPredictions: number;
    activePredictions: number;
    resolvedToday: number;
    averageAccuracy: number;
  };
  financialMetrics: {
    totalVolume: number;
    volumeToday: number;
    averageBetSize: number;
    totalPayouts: number;
  };
  engagementMetrics: {
    dailyActiveUsers: number;
    averageSessionDuration: number;
    betsPerUser: number;
    commentsPerUser: number;
  };
}

// ============================================================================
// Trend Analysis
// ============================================================================

export interface TrendAnalysisResponse {
  userGrowth: {
    daily: Array<{ date: string; count: number; change: number }>;
    weekly: Array<{ date: string; count: number; change: number }>;
    monthly: Array<{ date: string; count: number; change: number }>;
  };
  volumeTrends: {
    daily: Array<{ date: string; volume: number; change: number }>;
    weekly: Array<{ date: string; volume: number; change: number }>;
    monthly: Array<{ date: string; volume: number; change: number }>;
  };
  categoryTrends: {
    trending: Array<{ category: string; growth: number; volume: number }>;
    declining: Array<{ category: string; decline: number; volume: number }>;
  };
  seasonality: {
    hourly: Array<{ hour: number; activity: number }>;
    daily: Array<{ day: string; activity: number }>;
  };
}

// ============================================================================
// Cross-Feature Analytics
// ============================================================================

export interface CrossFeatureAnalyticsResponse {
  userJourneys: {
    commonPaths: Array<{ path: string[]; count: number; conversionRate: number }>;
    dropoffPoints: Array<{ feature: string; dropoffRate: number }>;
  };
  featureAdoption: {
    predictions: { adoptionRate: number; activeUsers: number };
    parlays: { adoptionRate: number; activeUsers: number };
    pong: { adoptionRate: number; activeUsers: number };
    social: { adoptionRate: number; activeUsers: number };
  };
  crossSelling: {
    predictionToPong: number;
    pongToPrediction: number;
    socialToBetting: number;
  };
  retentionByFeature: {
    predictions: Array<{ cohort: string; retention: number }>;
    pong: Array<{ cohort: string; retention: number }>;
    social: Array<{ cohort: string; retention: number }>;
  };
}

// ============================================================================
// Content Analytics
// ============================================================================

export interface ContentAnalyticsResponse {
  timeline: {
    totalPosts: number;
    postsToday: number;
    averageEngagement: number;
    topAuthors: Array<{ userId: number; postCount: number; engagement: number }>;
  };
  articles: {
    totalArticles: number;
    approvedToday: number;
    pendingModeration: number;
    topSources: Array<{ source: string; articleCount: number }>;
  };
  engagement: {
    commentsPerPost: number;
    reactionsPerPost: number;
    sharesPerPost: number;
    topHashtags: Array<{ tag: string; count: number }>;
  };
}

// ============================================================================
// Comprehensive Dashboard
// ============================================================================

export interface ComprehensiveDashboardResponse {
  health: PlatformHealthMetricsResponse;
  trends: TrendAnalysisResponse;
  crossFeature: CrossFeatureAnalyticsResponse;
  content: ContentAnalyticsResponse;
  lastUpdated: string;
}

// ============================================================================
// Realtime Metrics
// ============================================================================

export interface RealtimeMetricsResponse {
  activeUsers: number;
  activeSessions: number;
  recentBets: Array<{
    id: number;
    userId: number;
    amount: number;
    predictionTitle: string;
    timestamp: string;
  }>;
  recentPredictions: Array<{
    id: number;
    title: string;
    category: string;
    createdAt: string;
  }>;
  systemLoad: {
    cpu: number;
    memory: number;
    connections: number;
  };
}

// ============================================================================
// Analytics Summary
// ============================================================================

export interface AnalyticsSummaryResponse {
  overview: {
    totalUsers: number;
    totalPredictions: number;
    totalVolume: number;
    totalBets: number;
  };
  growth: {
    userGrowth: number;
    volumeGrowth: number;
    predictionGrowth: number;
  };
  topMetrics: {
    topCategory: string;
    topUser: { id: number; name: string; volume: number };
    hotPrediction: { id: number; title: string; betCount: number };
  };
}
