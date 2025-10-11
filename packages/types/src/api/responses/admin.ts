/**
 * Admin Response DTOs
 *
 * Response types for admin endpoints
 */

import type { BanType } from '../../domain/moderation';

// ============================================================================
// Admin User View
// ============================================================================

export interface AdminUserView {
  id: number;
  name: string;
  email: string;
  muskBucks: string;
  role: string;
  isEmailVerified: boolean;
  active: boolean;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  banStatus?: {
    isBanned: boolean;
    reason?: string;
    expiresAt?: string;
  } | null;
}

// ============================================================================
// Admin User Search Response
// ============================================================================

export interface AdminUserSearchResponse {
  users: AdminUserView[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Admin Bet View
// ============================================================================

export interface AdminBetView {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  predictionId: number;
  predictionTitle: string;
  optionId: number | null;
  optionLabel: string | null;
  amount: string;
  potentialPayout: string | null;
  payout: string | null;
  status: string;
  createdAt: string;
}

// ============================================================================
// Admin Transaction View
// ============================================================================

export interface AdminTransactionView {
  id: number;
  userId: number;
  userName: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  type: string;
  amount: string;
  balanceAfter: string;
  relatedBetId: number | null;
  relatedParlayId: number | null;
  createdAt: string;
  // Enhanced transaction fields
  subtype: string | null;
  description: string | null;
  relatedPongMatchId: string | null;
  metadata?: any;
}

// ============================================================================
// Admin Financial Data Response
// ============================================================================

export interface AdminFinancialDataResponse {
  transactions: AdminTransactionView[];
  bets: AdminBetView[];
  totalTransactions: number;
  totalBets: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  summary: {
    totalTransactions: number;
    totalBets: number;
    totalVolume: string; // BigInt → string
    totalPayouts: string; // BigInt → string
    netRevenue: string; // BigInt → string
  };
  pagination?: {
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
}

// ============================================================================
// Admin Prediction Search Response
// ============================================================================

export interface AdminPredictionSearchResponse {
  predictions: Array<{
    id: number;
    title: string;
    status: string;
    totalBets: number;
    totalVolume: string; // BigInt → string
    expectedPayout: string; // BigInt → string
    createdAt: string; // Date → ISO string
    closesAt: string | null; // Date → ISO string
    resolvedAt: string | null; // Date → ISO string
  }>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// ============================================================================
// Admin Bulk Operations Response
// ============================================================================

export interface AdminBulkOperationResponse {
  successCount: number;
  failureCount: number;
  errors: Array<{
    userId: number;
    error: string;
  }>;
  updatedUsers: AdminUserView[];
}

export interface AdminBulkPredictionsResponse {
  updated: number;
  failed: number;
  errors: Array<{
    id: number;
    error: string;
  }>;
  summary: {
    totalProcessed: number;
    successRate: number;
  };
  processedAt: string; // Date → ISO string
}

// ============================================================================
// Admin Achievement View
// ============================================================================

export interface AdminAchievementView {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  rarity: string;
  targetValue: number;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string; // Date → ISO string
  updatedAt: string; // Date → ISO string
  totalUsers?: number;
  completedUsers?: number;
  completionRate?: number;
  recentUnlocks?: Array<{
    userId: number;
    userName: string;
    completedAt: string; // Date → ISO string
  }>;
}

export interface AdminUserAchievementView {
  userId: number;
  userName: string;
  progress: number;
  completedAt: string | null; // Date → ISO string
}

export interface AdminAchievementAnalyticsResponse {
  overview: {
    totalAchievements: number;
    totalCategories: number;
    totalUnlocks: number;
    activeUsers: number;
    averageCompletion: number;
  };
  categoryBreakdown: Array<{
    category: string;
    achievementCount: number;
    totalUnlocks: number;
    averageCompletion: number;
  }>;
  topAchievements: Array<{
    id: number;
    name: string;
    title: string;
    completedUsers: number;
    completionRate: number;
  }>;
  recentActivity: Array<{
    achievementId: number;
    achievementTitle: string;
    userId: number;
    userName: string;
    completedAt: string; // Date → ISO string
  }>;
}

// ============================================================================
// Admin Ban History View
// ============================================================================

export interface AdminBanHistoryView {
  id: number;
  userId: number;
  userName: string;
  banType: BanType;
  reason: string;
  startDate: string; // Date → ISO string
  endDate?: string; // Date → ISO string
  isActive: boolean;
  moderatorName: string;
  shameAchievementsAwarded: string[];
}

// ============================================================================
// Shame Wall Response DTOs
// ============================================================================

export interface ShameWallEntryView {
  id: number;
  userId: number;
  userName: string;
  avatarUrl?: string | null;
  reason: string;
  startDate: string; // Date → ISO
  endDate: string | null; // Date → ISO (null for permanent)
  isActive: boolean;
  banCount: number;
  moderatorId: number;
  moderatorName: string;
  shameAchievements: Array<{
    title: string;
    description: string;
    icon: string;
  }>;
}

export interface ShameWallStatsView {
  totalBanned: number;
  permanentBans: number;
  temporaryBans: number;
  mostCommonReasons: Array<{
    reason: string;
    count: number;
  }>;
  shameAchievementCounts: Array<{
    slug: string;
    title: string;
    count: number;
  }>;
}

// ============================================================================
// Admin Financial Analytics Response
// ============================================================================

export interface AdminFinancialAnalyticsResponse {
  totalRevenue: string; // BigInt → string
  totalVolume: string; // BigInt → string
  totalPayouts: string; // BigInt → string
  netRevenue: string; // BigInt → string
  totalTransactions: number;
  totalBets: number;
  avgBetAmount: string; // BigInt → string
  profitMargin: number;
  revenueByDay: Array<{
    date: string; // Date → ISO string
    revenue: string; // BigInt → string
    volume: string; // BigInt → string
    bets: number;
  }>;
  topUsers: Array<{
    userId: number;
    userName: string;
    totalWagered: string; // BigInt → string
    totalWon: string; // BigInt → string
    netLoss: string; // BigInt → string
  }>;
  generatedAt: string; // Date → ISO string
}

// ============================================================================
// Unified Analytics Response
// ============================================================================

export interface UnifiedAnalyticsResponse {
  overview: {
    totalVolume: string; // Total across all transaction types
    totalTransactions: number;
    totalUsers: number;
    platformRevenue: string; // Net revenue across all activities
    generatedAt: string;
  };
  byTransactionType: {
    betting: {
      totalWagers: string;
      totalPayouts: string;
      netRevenue: string;
      transactionCount: number;
      avgWagerSize: string;
      winRate: number;
    };
    parlays: {
      totalWagers: string;
      totalPayouts: string;
      netRevenue: string;
      transactionCount: number;
      avgWagerSize: string;
      winRate: number;
    };
    pong: {
      totalWagers: string;
      totalPayouts: string;
      netRevenue: string;
      transactionCount: number;
      avgWagerSize: string;
      winRate: number;
      pvpVsPveBreakdown: {
        pvp: { wagers: string; payouts: string; matches: number };
        pve: { wagers: string; payouts: string; matches: number };
      };
    };
  };
  trends: {
    daily: Array<{
      date: string;
      betting: { volume: string; transactions: number };
      parlays: { volume: string; transactions: number };
      pong: { volume: string; transactions: number };
    }>;
    hourly: Array<{
      hour: number;
      volume: string;
      transactionCount: number;
    }>;
  };
  userInsights: {
    topSpenders: Array<{
      userId: number;
      userName: string;
      totalSpent: string;
      preferredActivity: 'betting' | 'parlays' | 'pong';
      activityBreakdown: {
        betting: string;
        parlays: string;
        pong: string;
      };
    }>;
    topWinners: Array<{
      userId: number;
      userName: string;
      totalWon: string;
      netProfit: string;
      primarySource: 'betting' | 'parlays' | 'pong';
    }>;
  };
  riskMetrics: {
    largeTransactions: Array<{
      transactionId: string;
      userId: number;
      amount: string;
      type: string;
      subtype: string;
      riskScore: number;
      flags: string[];
    }>;
    suspitiousPatterns: {
      rapidTransactions: number;
      unusualAmounts: number;
      potentialArbitrage: number;
    };
  };
}

// ============================================================================
// Market Overview View
// ============================================================================

export interface MarketOverviewView {
  cached: boolean;
  totalVolume: number;
  activeMarkets: number;
  totalUsers: number;
  volumeChange: number;
  trending: Array<{
    category: string;
    icon: string;
    growth: number;
  }>;
}

// ============================================================================
// Monitoring Response DTOs
// ============================================================================

export interface DatabaseStatus {
  connected: boolean;
  timestamp: string; // Date → ISO string
}

export interface RedisStatus {
  connected: boolean;
  memory?: string;
  error?: string;
}

export interface DatabaseMetricsResponse {
  database: {
    totalQueries: number;
    averageExecutionTime: number;
    slowQueries: Array<{
      query: string;
      duration: number;
      timestamp: string;
    }>;
    status: DatabaseStatus;
  };
  redis: RedisStatus;
  timestamp: string; // Date → ISO string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  checks: {
    database: boolean;
    redis: boolean;
  };
  timestamp: string; // Date → ISO string
}

export interface ClearMetricsResponse {
  success: boolean;
  message: string;
  clearedAt: string; // Date → ISO string
}

// ============================================================================
// Feed Management Response DTOs
// ============================================================================

export interface FeedView {
  id: number;
  name: string;
  url: string;
  siteUrl: string | null;
  status: import('../../shared/enums').FeedStatus;
  allowImages: boolean;
  lastFetchedAt: string | null; // Date → ISO string
  lastSuccessAt: string | null; // Date → ISO string
  lastErrorAt: string | null; // Date → ISO string
  lastErrorMsg: string | null;
  fetchCount: number;
  errorCount: number;
  createdAt: string; // Date → ISO string
  updatedAt: string; // Date → ISO string
}

export interface FeedsListResponse {
  feeds: FeedView[];
}

// ============================================================================
// Generic API Response
// ============================================================================

export interface APIResponse<T = unknown> {
  success?: boolean;
  message?: string;
  data?: T;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}
