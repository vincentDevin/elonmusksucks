import type {
  AdminUserView,
  AdminBetView,
  AdminTransactionView,
  AdminUserSearchResponse,
  AdminFinancialDataResponse,
  AdminFinancialAnalyticsResponse,
  AdminPredictionSearchResponse,
  AdminBulkPredictionsResponse,
  AdminAchievementView,
  AdminBulkOperationResponse,
  AdminUserAchievementView,
  AdminAchievementAnalyticsResponse,
  AdminBanHistoryView,
} from '@ems/types';

/**
 * Maps PublicUser data to standardized AdminUserView DTO
 * Handles BigInt → string conversion for muskBucks
 */
export const toAdminUserView = (user: {
  id: number;
  name: string;
  email: string;
  muskBucks: bigint;
  role: string;
  isEmailVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
}): AdminUserView => ({
  id: user.id,
  name: user.name,
  email: user.email,
  muskBucks: user.muskBucks.toString(),
  role: user.role,
  isEmailVerified: user.isEmailVerified ?? false,
  createdAt: user.createdAt.toISOString(),
  updatedAt: user.updatedAt ? user.updatedAt.toISOString() : user.createdAt.toISOString(),
});

/**
 * Maps AdminBet data to standardized AdminBetView DTO
 * Handles BigInt → string conversion for amounts
 */
export const toAdminBetView = (bet: {
  id: number;
  userId: number;
  userName?: string;
  predictionId: number;
  optionId: number | null;
  amount: bigint;
  potentialPayout: bigint | null;
  payout: bigint | null;
  status: string;
  createdAt: Date;
  prediction?: {
    title: string;
  };
}): AdminBetView => ({
  id: bet.id,
  userId: bet.userId,
  userName: bet.userName || 'Unknown',
  predictionId: bet.predictionId,
  predictionTitle: bet.prediction?.title || 'Unknown',
  optionId: bet.optionId,
  optionLabel: null,
  amount: bet.amount.toString(),
  potentialPayout: bet.potentialPayout ? bet.potentialPayout.toString() : null,
  payout: bet.payout ? bet.payout.toString() : null,
  status: bet.status,
  createdAt: bet.createdAt.toISOString(),
});

/**
 * Maps AdminTransaction data to standardized AdminTransactionView DTO
 * Handles BigInt/string conversion for amount and balanceAfter fields
 */
export const toAdminTransactionView = (transaction: {
  id: number;
  userId: number;
  userName?: string;
  type: string;
  amount: bigint | string;
  balanceAfter: bigint | string;
  relatedBetId: number | null;
  relatedParlayId: number | null;
  createdAt: Date;
}): AdminTransactionView => ({
  id: transaction.id,
  userId: transaction.userId,
  userName: transaction.userName || 'Unknown',
  type: transaction.type,
  amount:
    typeof transaction.amount === 'bigint' ? transaction.amount.toString() : transaction.amount,
  balanceAfter:
    typeof transaction.balanceAfter === 'bigint'
      ? transaction.balanceAfter.toString()
      : transaction.balanceAfter,
  relatedBetId: transaction.relatedBetId,
  relatedParlayId: transaction.relatedParlayId,
  createdAt: transaction.createdAt.toISOString(),
});

/**
 * Maps user search result to standardized AdminUserSearchResponse DTO
 * Handles BigInt → string conversion for user balances and pagination
 */
export const toAdminUserSearchResponse = (searchResult: {
  users: Array<any>;
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): AdminUserSearchResponse => ({
  users: searchResult.users.map(toAdminUserView),
  totalCount: searchResult.totalCount,
  totalPages: searchResult.totalPages,
  currentPage: searchResult.currentPage,
  hasNextPage: searchResult.hasNextPage,
  hasPreviousPage: searchResult.hasPreviousPage,
});

/**
 * Maps financial search data to standardized AdminFinancialDataResponse DTO
 * Handles BigInt → string conversion for financial amounts
 */
export const toAdminFinancialDataResponse = (financialData: {
  transactions: Array<any>;
  bets: Array<any>;
  totalTransactions: number;
  totalBets: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): AdminFinancialDataResponse => {
  // Calculate summary data from the transactions and bets
  const totalVolume = financialData.bets.reduce((sum, bet) => {
    const amount = bet.amount || bet.amount === 0 ? bet.amount : 0;
    return sum + (typeof amount === 'bigint' ? amount : BigInt(amount));
  }, BigInt(0));

  const totalPayouts = financialData.bets.reduce((sum, bet) => {
    const payout = bet.payout || bet.payout === 0 ? bet.payout : 0;
    return sum + (typeof payout === 'bigint' ? payout : BigInt(payout));
  }, BigInt(0));

  const netRevenue = totalVolume - totalPayouts;

  return {
    transactions: financialData.transactions.map(toAdminTransactionView),
    bets: financialData.bets.map(toAdminBetView),
    summary: {
      totalTransactions: financialData.totalTransactions,
      totalBets: financialData.totalBets,
      totalVolume: totalVolume.toString(),
      totalPayouts: totalPayouts.toString(),
      netRevenue: netRevenue.toString(),
    },
    pagination: {
      page: financialData.currentPage,
      limit: Math.ceil(financialData.totalBets / financialData.totalPages) || 25,
      totalPages: financialData.totalPages,
      hasMore: financialData.hasNextPage,
    },
  };
};

/**
 * Maps financial analytics to standardized AdminFinancialAnalyticsResponse DTO
 * Matches the actual FinancialAnalytics structure from repository
 */
export const toAdminFinancialAnalyticsResponse = (analytics: {
  overview: {
    totalBettingVolume: number;
    totalPayouts: number;
    totalRefunds: number;
    netRevenue: number;
    activeBettors: number;
    avgBetSize: number;
  };
  timeSeriesData: Array<{
    date: string;
    volume: number;
    payouts: number;
    profit: number;
    betCount: number;
  }>;
}): AdminFinancialAnalyticsResponse => ({
  totalRevenue: (
    analytics.overview.totalBettingVolume - analytics.overview.totalPayouts
  ).toString(),
  totalVolume: analytics.overview.totalBettingVolume.toString(),
  totalPayouts: analytics.overview.totalPayouts.toString(),
  netRevenue: analytics.overview.netRevenue.toString(),
  totalTransactions: 0, // Not provided by current analytics
  totalBets: analytics.overview.activeBettors,
  avgBetAmount: analytics.overview.avgBetSize.toString(),
  profitMargin:
    analytics.overview.totalBettingVolume > 0
      ? (analytics.overview.netRevenue / analytics.overview.totalBettingVolume) * 100
      : 0,
  revenueByDay: analytics.timeSeriesData.map((day) => ({
    date: day.date,
    revenue: day.profit.toString(),
    volume: day.volume.toString(),
    bets: day.betCount,
  })),
  topUsers: [], // Not provided by current analytics
  generatedAt: new Date().toISOString(),
});

/**
 * Maps prediction search result to standardized AdminPredictionSearchResponse DTO
 * Matches the actual PaginatedPredictions structure from repository
 */
export const toAdminPredictionSearchResponse = (searchResult: {
  predictions: Array<any>; // DetailedPrediction from repository
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}): AdminPredictionSearchResponse => ({
  predictions: searchResult.predictions.map((pred) => ({
    id: pred.id,
    title: pred.title,
    status: pred.status || 'pending',
    totalBets: 0, // Not available in DetailedPrediction
    totalVolume: '0', // Not available in DetailedPrediction
    expectedPayout: '0', // Not available in DetailedPrediction
    createdAt: pred.createdAt ? pred.createdAt.toISOString() : new Date().toISOString(),
    closesAt: pred.expiresAt ? pred.expiresAt.toISOString() : null,
    resolvedAt: pred.resolvedAt ? pred.resolvedAt.toISOString() : null,
  })),
  totalCount: searchResult.totalCount,
  totalPages: searchResult.totalPages,
  currentPage: searchResult.currentPage,
  hasNextPage: searchResult.hasNextPage,
  hasPreviousPage: searchResult.hasPreviousPage,
});

/**
 * Maps bulk predictions response to standardized AdminBulkPredictionsResponse DTO
 * Matches the actual BulkPredictionResult structure from repository
 */
export const toAdminBulkPredictionsResponse = (bulkResult: {
  successCount: number;
  failureCount: number;
  errors: Array<{ predictionId: number; error: string }>;
  updatedPredictions: Array<any>;
}): AdminBulkPredictionsResponse => ({
  updated: bulkResult.successCount,
  failed: bulkResult.failureCount,
  errors: bulkResult.errors.map((err) => ({
    id: err.predictionId,
    error: err.error,
  })),
  summary: {
    totalProcessed: bulkResult.successCount + bulkResult.failureCount,
    successRate:
      bulkResult.successCount + bulkResult.failureCount > 0
        ? (bulkResult.successCount / (bulkResult.successCount + bulkResult.failureCount)) * 100
        : 0,
  },
  processedAt: new Date().toISOString(),
});

/**
 * Maps achievement data to standardized AdminAchievementView DTO
 * Handles Date → ISO string conversion
 */
export const toAdminAchievementView = (achievement: {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  totalUsers?: number;
  completedUsers?: number;
  completionRate?: number;
  recentUnlocks?: Array<{
    userId: number;
    userName: string;
    completedAt: Date;
  }>;
}): AdminAchievementView => ({
  id: achievement.id,
  name: achievement.name,
  title: achievement.title,
  description: achievement.description,
  category: achievement.category,
  targetValue: achievement.targetValue,
  iconUrl: achievement.iconUrl,
  isActive: achievement.isActive,
  sortOrder: achievement.sortOrder,
  createdAt: achievement.createdAt.toISOString(),
  updatedAt: achievement.updatedAt.toISOString(),
  totalUsers: achievement.totalUsers,
  completedUsers: achievement.completedUsers,
  completionRate: achievement.completionRate,
  recentUnlocks: achievement.recentUnlocks?.map((unlock) => ({
    userId: unlock.userId,
    userName: unlock.userName,
    completedAt: unlock.completedAt.toISOString(),
  })),
});

/**
 * Maps bulk operation result to standardized AdminBulkOperationResponse DTO
 * Handles Date → ISO string conversion for user data
 */
export const toAdminBulkOperationResponse = (result: {
  successCount: number;
  failureCount: number;
  errors: Array<{ userId: number; error: string }>;
  updatedUsers: Array<{
    id: number;
    name: string;
    email: string;
    muskBucks: bigint;
    role: string;
    isEmailVerified?: boolean;
    createdAt: Date;
    updatedAt?: Date;
  }>;
}): AdminBulkOperationResponse => ({
  successCount: result.successCount,
  failureCount: result.failureCount,
  errors: result.errors,
  updatedUsers: result.updatedUsers.map(toAdminUserView),
});

/**
 * Maps user achievement data to standardized AdminUserAchievementView DTO
 * Handles Date → ISO string conversion for completedAt
 */
export const toAdminUserAchievementView = (userAchievement: {
  userId: number;
  userName: string;
  progress: number;
  completedAt: Date | null;
}): AdminUserAchievementView => ({
  userId: userAchievement.userId,
  userName: userAchievement.userName,
  progress: userAchievement.progress,
  completedAt: userAchievement.completedAt ? userAchievement.completedAt.toISOString() : null,
});

/**
 * Maps achievement analytics to standardized AdminAchievementAnalyticsResponse DTO
 * Handles Date → ISO string conversion for recent activity
 */
export const toAdminAchievementAnalyticsResponse = (analytics: {
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
    completedAt: Date;
  }>;
}): AdminAchievementAnalyticsResponse => ({
  overview: analytics.overview,
  categoryBreakdown: analytics.categoryBreakdown,
  topAchievements: analytics.topAchievements,
  recentActivity: analytics.recentActivity.map((activity) => ({
    achievementId: activity.achievementId,
    achievementTitle: activity.achievementTitle,
    userId: activity.userId,
    userName: activity.userName,
    completedAt: activity.completedAt.toISOString(),
  })),
});

/**
 * Maps ban history data to standardized AdminBanHistoryView DTO
 * The service already handles Date → ISO string conversion
 */
export const toAdminBanHistoryView = (banHistory: {
  id: number;
  userId: number;
  userName: string;
  banType: any; // BanType enum from Prisma
  reason: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  moderatorName: string;
  shameAchievementsAwarded: string[];
}): AdminBanHistoryView => ({
  id: banHistory.id,
  userId: banHistory.userId,
  userName: banHistory.userName,
  banType: banHistory.banType,
  reason: banHistory.reason,
  startDate: banHistory.startDate,
  endDate: banHistory.endDate,
  isActive: banHistory.isActive,
  moderatorName: banHistory.moderatorName,
  shameAchievementsAwarded: banHistory.shameAchievementsAwarded,
});
