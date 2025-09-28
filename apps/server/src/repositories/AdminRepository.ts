// apps/server/src/repositories/PrismaAdminRepository.ts
import {
  PrismaClient,
  Role,
  User,
  Prediction,
  Bet,
  Transaction,
  Badge,
  UserBadge,
  UserStats,
  AITweet,
  UserPost,
} from '@prisma/client';
import type {
  QueryParams,
  IAdminRepository,
  UserSearchParams,
  PaginatedUsers,
  DetailedUser,
  BulkUserOperation,
  BulkOperationResult,
  PredictionSearchParams,
  PaginatedPredictions,
  DetailedPrediction,
  BulkPredictionOperation,
  BulkPredictionResult,
  FinancialSearchParams,
  PaginatedFinancialData,
  DetailedBet,
  DetailedTransaction,
  FinancialAnalyticsParams,
  FinancialAnalytics,
  BulkFinancialOperation,
  BulkFinancialResult,
  FinancialExportParams,
  BadgeSearchParams,
  PaginatedBadges,
  DetailedBadge,
  CreateBadgeData,
  UpdateBadgeData,
  BadgeAnalytics,
  BulkBadgeOperation,
  BulkBadgeResult,
  BadgeCategory,
  CreateBadgeCategoryData,
  AnalyticsParams,
  ExecutiveDashboardData,
  UserBehaviorAnalytics,
  PredictiveAnalytics,
  CustomReportData,
  RealtimeMetrics,
} from './interfaces/IAdminRepository';

export class PrismaAdminRepository implements IAdminRepository {
  private prisma = new PrismaClient();

  // -- Enhanced User Management --
  async findAllUsers(): Promise<User[]> {
    // Legacy method - kept for backward compatibility
    return this.prisma.user.findMany();
  }

  async searchUsers(params: UserSearchParams): Promise<PaginatedUsers> {
    const {
      search,
      role,
      active,
      bannedOnly,
      page,
      limit: requestedLimit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Limit results per page to prevent performance issues
    const limit = Math.min(requestedLimit, 100);
    const offset = page * limit;

    // Build where clause
    const whereClause: any = {};

    // Text search on name and email
    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role && role.length > 0) {
      whereClause.role = { in: role };
    }

    // Active status filter
    if (active !== undefined) {
      whereClause.active = active;
    }

    // Ban status filter (if banned users table exists)
    if (bannedOnly) {
      // This would require a UserBan table - placeholder for now
      // whereClause.bans = { some: { isActive: true } };
    }

    // Build order by clause
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

    // Execute queries in parallel for performance
    const [users, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          userBadges: {
            include: {
              badge: true,
            },
          },
        },
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    // Transform to DetailedUser format with additional information
    const detailedUsers: DetailedUser[] = users.map((user) => {
      const detailedUser: DetailedUser = {
        ...user,
        badges: user.userBadges?.map((ub: any) => ub.badge) || [],
        stats: {
          totalBets: 0,
          totalWagered: 0,
          totalWon: 0,
          winRate: 0,
        },
        recentActivity: {
          totalLogins: 0, // Would need to track this separately
        },
        banStatus: {
          isBanned: false, // Would need UserBan table integration
          banType: undefined,
          reason: undefined,
          expiresAt: undefined,
        },
      };

      return detailedUser;
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      users: detailedUsers,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
    };
  }

  async getUserWithDetails(userId: number): Promise<DetailedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: {
          include: {
            badge: true,
          },
        },
      },
    });

    if (!user) return null;

    const detailedUser: DetailedUser = {
      ...user,
      badges: user.userBadges?.map((ub: any) => ub.badge) || [],
      stats: {
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        winRate: 0,
      },
      recentActivity: {
        totalLogins: 0, // Would need login tracking
      },
      banStatus: {
        isBanned: false, // Would need UserBan integration
      },
    };

    return detailedUser;
  }

  async bulkUpdateUsers(operation: BulkUserOperation): Promise<BulkOperationResult> {
    const { userIds, operation: op, params } = operation;
    const results: BulkOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      updatedUsers: [],
    };

    // Process users in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);

      for (const userId of batch) {
        try {
          let updatedUser: User | null = null;

          switch (op) {
            case 'activate':
              updatedUser = await this.updateUserActive(userId, true);
              break;
            case 'deactivate':
              updatedUser = await this.updateUserActive(userId, false);
              break;
            case 'changeRole':
              if (params?.role) {
                updatedUser = await this.updateUserRole(userId, params.role);
              }
              break;
            case 'adjustBalance':
              if (params?.amount !== undefined) {
                updatedUser = await this.updateUserBalance(userId, params.amount);
              }
              break;
            case 'assignBadge':
              if (params?.badgeId) {
                await this.addBadgeToUser(userId, params.badgeId);
                updatedUser = await this.prisma.user.findUnique({ where: { id: userId } });
              }
              break;
            case 'revokeBadge':
              if (params?.badgeId) {
                await this.removeBadgeFromUser(userId, params.badgeId);
                updatedUser = await this.prisma.user.findUnique({ where: { id: userId } });
              }
              break;
          }

          if (updatedUser) {
            const detailedUser = await this.getUserWithDetails(userId);
            if (detailedUser) {
              results.updatedUsers.push(detailedUser);
            }
            results.successCount++;
          }
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            userId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  async updateUserRole(userId: number, role: Role): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { role },
    });
  }

  async updateUserActive(userId: number, active: boolean): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { active },
    });
  }

  async updateUserBalance(userId: number, amount: number): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { muskBucks: amount },
    });
  }

  // -- Enhanced Prediction Management --
  async findPredictions(_filters?: QueryParams): Promise<Prediction[]> {
    // Legacy method - include the options so the admin UI can render them
    return this.prisma.prediction.findMany({
      include: { options: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async searchPredictions(params: PredictionSearchParams): Promise<PaginatedPredictions> {
    const {
      search,
      category,
      status,
      creatorId,
      dateRange,
      bettingVolume: _bettingVolume,
      page,
      limit: requestedLimit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    // Limit results per page to prevent performance issues
    const limit = Math.min(requestedLimit, 100);
    const offset = page * limit;

    // Build where clause
    const whereClause: any = {};

    // Text search on title and description
    if (search && search.trim()) {
      whereClause.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Category filter
    if (category && category.length > 0) {
      whereClause.category = { in: category };
    }

    // Creator filter
    if (creatorId) {
      whereClause.creatorId = creatorId;
    }

    // Date range filter
    if (dateRange) {
      const dateFilter: any = {};
      if (dateRange.start) dateFilter.gte = dateRange.start;
      if (dateRange.end) dateFilter.lte = dateRange.end;
      if (Object.keys(dateFilter).length > 0) {
        whereClause.createdAt = dateFilter;
      }
    }

    // Status filter (approved, rejected, etc.)
    if (status && status.length > 0) {
      const statusConditions: any[] = [];

      if (status.includes('pending')) {
        // For pending, we need to check based on business logic - could be newly created or unresolved
        statusConditions.push({ approved: false, resolved: false });
      }
      if (status.includes('approved')) {
        statusConditions.push({ approved: true, resolved: false });
      }
      if (status.includes('rejected')) {
        statusConditions.push({ approved: false });
      }
      if (status.includes('resolved')) {
        statusConditions.push({ resolved: true });
      }

      if (statusConditions.length > 0) {
        whereClause.OR = whereClause.OR
          ? [...whereClause.OR, ...statusConditions]
          : statusConditions;
      }
    }

    // Build order by clause
    const orderBy: any = {};
    if (sortBy === 'bettingVolume') {
      // We'll need to add this as a computed field or separate query
      orderBy.createdAt = sortOrder; // Fallback for now
    } else {
      orderBy[sortBy] = sortOrder;
    }

    // Execute queries in parallel for performance
    const [predictions, totalCount, analytics] = await Promise.all([
      this.prisma.prediction.findMany({
        where: whereClause,
        orderBy,
        skip: offset,
        take: limit,
        include: {
          options: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          bets: {
            select: {
              id: true,
              amount: true,
              userId: true,
            },
          },
        },
      }),
      this.prisma.prediction.count({ where: whereClause }),
      this.getPredictionAnalytics(),
    ]);

    // Transform to DetailedPrediction format with analytics
    const detailedPredictions: DetailedPrediction[] = predictions.map((prediction) => {
      const bets = (prediction as any).bets || [];
      const uniqueBettors = new Set(bets.map((bet: any) => bet.userId)).size;
      const totalVolume = bets.reduce((sum: number, bet: any) => sum + Number(bet.amount), 0);

      return {
        ...prediction,
        analytics: {
          totalBets: bets.length,
          totalVolume,
          uniqueBettors,
          controversyScore: this.calculateControversyScore(bets),
          popularityScore: this.calculatePopularityScore(bets.length, uniqueBettors),
        },
        qualityFlags: {
          isDuplicate: false, // Would need separate logic to detect
          hasOffensiveContent: false, // Would need content moderation
          hasSuspiciousActivity: false, // Would need fraud detection
          needsReview: bets.length === 0 && this.isOlderThan(prediction.createdAt, 24), // No bets after 24h
        },
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      predictions: detailedPredictions,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
      analytics,
    };
  }

  async getPredictionWithDetails(predictionId: number): Promise<DetailedPrediction | null> {
    const prediction = await this.prisma.prediction.findUnique({
      where: { id: predictionId },
      include: {
        options: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        bets: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!prediction) return null;

    const bets = (prediction as any).bets || [];
    const uniqueBettors = new Set(bets.map((bet: any) => bet.userId)).size;
    const totalVolume = bets.reduce((sum: number, bet: any) => sum + Number(bet.amount), 0);

    return {
      ...prediction,
      analytics: {
        totalBets: bets.length,
        totalVolume,
        uniqueBettors,
        controversyScore: this.calculateControversyScore(bets),
        popularityScore: this.calculatePopularityScore(bets.length, uniqueBettors),
      },
      qualityFlags: {
        isDuplicate: false,
        hasOffensiveContent: false,
        hasSuspiciousActivity: false,
        needsReview: bets.length === 0 && this.isOlderThan(prediction.createdAt, 24),
      },
    };
  }

  async bulkUpdatePredictions(operation: BulkPredictionOperation): Promise<BulkPredictionResult> {
    const { predictionIds, operation: op, params } = operation;
    const results: BulkPredictionResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      updatedPredictions: [],
    };

    // Process predictions in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < predictionIds.length; i += batchSize) {
      const batch = predictionIds.slice(i, i + batchSize);

      for (const predictionId of batch) {
        try {
          let updatedPrediction: Prediction | null = null;

          switch (op) {
            case 'approve':
              updatedPrediction = await this.updatePredictionStatus(predictionId, 'approved');
              break;
            case 'reject':
              updatedPrediction = await this.updatePredictionStatus(predictionId, 'rejected');
              break;
            case 'resolve':
              if (params?.winningOptionId) {
                updatedPrediction = await this.resolvePredictionWithDetails(
                  predictionId,
                  params.winningOptionId,
                  params.evidence,
                );
              }
              break;
            case 'delete':
              await this.prisma.prediction.delete({ where: { id: predictionId } });
              break;
            case 'feature':
              // Would need to add featured field to schema
              break;
          }

          if (updatedPrediction || op === 'delete') {
            const detailedPrediction = updatedPrediction
              ? await this.getPredictionWithDetails(predictionId)
              : null;
            if (detailedPrediction) {
              results.updatedPredictions.push(detailedPrediction);
            }
            results.successCount++;
          }
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            predictionId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }

    return results;
  }

  async updatePredictionStatus(
    predictionId: number,
    status: 'approved' | 'rejected',
  ): Promise<Prediction> {
    return this.prisma.prediction.update({
      where: { id: predictionId },
      data: { approved: status === 'approved' },
    });
  }

  async resolvePredictionWithDetails(
    predictionId: number,
    winningOptionId: number,
    evidence?: string,
  ): Promise<DetailedPrediction> {
    const resolved = await this.prisma.prediction.update({
      where: { id: predictionId },
      data: {
        resolved: true,
        winningOptionId,
        resolvedAt: new Date(),
      },
    });

    const detailed = await this.getPredictionWithDetails(predictionId);
    if (!detailed) throw new Error('Failed to fetch resolved prediction details');

    return {
      ...detailed,
      resolutionData: {
        resolvedAt: resolved.resolvedAt || new Date(),
        evidence,
        winningOptionId,
      },
    };
  }

  // Helper methods for analytics
  private async getPredictionAnalytics() {
    const [totalPending, totalApproved, totalResolved, totalRejected] = await Promise.all([
      this.prisma.prediction.count({ where: { approved: false, resolved: false } }),
      this.prisma.prediction.count({ where: { approved: true, resolved: false } }),
      this.prisma.prediction.count({ where: { resolved: true } }),
      this.prisma.prediction.count({ where: { approved: false, resolved: true } }),
    ]);

    return {
      totalPending,
      totalApproved,
      totalResolved,
      totalRejected,
      avgResolutionTime: 72, // Placeholder - would need actual calculation
    };
  }

  private calculateControversyScore(bets: any[]): number {
    // Simple controversy calculation based on bet distribution
    if (bets.length < 2) return 0;

    const optionTotals: Record<number, number> = {};
    bets.forEach((bet) => {
      optionTotals[bet.optionId] = (optionTotals[bet.optionId] || 0) + Number(bet.amount);
    });

    const values = Object.values(optionTotals);
    const total = values.reduce((sum, val) => sum + val, 0);
    const normalized = values.map((val) => val / total);

    // Higher controversy when bets are more evenly distributed
    const entropy = -normalized.reduce((sum, p) => sum + p * Math.log2(p), 0);
    return Math.min(100, entropy * 50); // Scale to 0-100
  }

  private calculatePopularityScore(totalBets: number, uniqueBettors: number): number {
    // Simple popularity calculation
    const betScore = Math.min(50, totalBets * 2);
    const userScore = Math.min(50, uniqueBettors * 5);
    return betScore + userScore;
  }

  private isOlderThan(date: Date, hours: number): boolean {
    const now = new Date();
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    return diffHours > hours;
  }

  // -- Bet & Transaction Oversight --
  async findBets(_filters?: QueryParams): Promise<Bet[]> {
    return this.prisma.bet.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
        prediction: {
          select: {
            id: true,
            title: true,
            category: true,
            expiresAt: true,
            approved: true,
            resolved: true,
            creatorId: true,
          },
        },
        optionOption: {
          select: {
            id: true,
            label: true,
          },
        },
      },
    });
  }

  async refundBet(betId: number): Promise<Bet> {
    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: 'REFUNDED' },
    });
  }

  async findTransactions(_filters?: QueryParams): Promise<Transaction[]> {
    return this.prisma.transaction.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  // -- Enhanced Financial Operations Dashboard --
  async searchFinancialData(params: FinancialSearchParams): Promise<PaginatedFinancialData> {
    const {
      search,
      userId,
      predictionId,
      betType,
      status,
      transactionType,
      transactionSubtype,
      includePongTransactions = false,
      includeMetadata = false,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      suspiciousOnly: _suspiciousOnly,
      page,
      limit: requestedLimit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const limit = Math.min(requestedLimit, 100);
    const offset = page * limit;

    // Build where clauses for bets and transactions
    const betWhere: any = {};
    const transactionWhere: any = {};

    // Common filters
    if (userId) {
      betWhere.userId = userId;
      transactionWhere.userId = userId;
    }

    if (predictionId) {
      betWhere.predictionId = predictionId;
    }

    if (minAmount) {
      betWhere.amount = { ...betWhere.amount, gte: minAmount };
      transactionWhere.amount = { ...transactionWhere.amount, gte: Math.abs(minAmount) };
    }

    if (maxAmount) {
      betWhere.amount = { ...betWhere.amount, lte: maxAmount };
      transactionWhere.amount = { ...transactionWhere.amount, lte: Math.abs(maxAmount) };
    }

    if (startDate) {
      const start = new Date(startDate);
      betWhere.createdAt = { ...betWhere.createdAt, gte: start };
      transactionWhere.createdAt = { ...transactionWhere.createdAt, gte: start };
    }

    if (endDate) {
      const end = new Date(endDate);
      betWhere.createdAt = { ...betWhere.createdAt, lte: end };
      transactionWhere.createdAt = { ...transactionWhere.createdAt, lte: end };
    }

    // Bet-specific filters
    if (betType && betType.length > 0) {
      // This would need to be adjusted based on how parlay bets are distinguished
      // For now, assume single bets are those without parlay legs
    }

    if (status && status.length > 0) {
      const prismaStatuses = status.map((s) => {
        switch (s) {
          case 'pending':
            return 'PENDING';
          case 'won':
            return 'WON';
          case 'lost':
            return 'LOST';
          case 'refunded':
            return 'REFUNDED';
          default:
            return 'PENDING'; // fallback to PENDING
        }
      });
      betWhere.status = { in: prismaStatuses };
    }

    // Transaction-specific filters
    if (transactionType && transactionType.length > 0) {
      transactionWhere.type = { in: transactionType };
    }

    // New subtype filtering
    if (transactionSubtype && transactionSubtype.length > 0) {
      transactionWhere.subtype = { in: transactionSubtype };
    }

    // Filter pong transactions if requested
    if (includePongTransactions) {
      if (!transactionSubtype) {
        // Include pong subtypes if not already filtered
        transactionWhere.OR = [
          ...(transactionWhere.OR || []),
          { subtype: { in: ['PONG_WAGER', 'PONG_PAYOUT'] } },
        ];
      }
    } else {
      // Exclude pong transactions by default unless specifically requested
      transactionWhere.subtype = {
        ...transactionWhere.subtype,
        notIn: ['PONG_WAGER', 'PONG_PAYOUT'],
      };
    }

    // Search across user names and prediction titles
    if (search && search.trim()) {
      const searchTerm = search.trim();
      betWhere.OR = [
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { prediction: { title: { contains: searchTerm, mode: 'insensitive' } } },
      ];
      transactionWhere.OR = [
        { user: { name: { contains: searchTerm, mode: 'insensitive' } } },
        { user: { email: { contains: searchTerm, mode: 'insensitive' } } },
      ];
    }

    // Execute queries in parallel
    const [bets, totalBets, transactions, totalTransactions] = await Promise.all([
      this.prisma.bet.findMany({
        where: betWhere,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
          prediction: { select: { id: true, title: true, category: true, resolved: true } },
          optionOption: { select: { id: true, label: true } },
        },
      }),
      this.prisma.bet.count({ where: betWhere }),
      this.prisma.transaction.findMany({
        where: transactionWhere,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
        include: {
          user: { select: { name: true, email: true } },
        },
      }),
      this.prisma.transaction.count({ where: transactionWhere }),
    ]);

    // Transform to detailed format
    const detailedBets: DetailedBet[] = bets.map((bet) => ({
      ...bet,
      userName: bet.user.name,
      userEmail: bet.user.email,
      prediction: bet.prediction
        ? {
            id: bet.prediction.id,
            title: bet.prediction.title,
            category: bet.prediction.category,
            resolved: bet.prediction.resolved,
          }
        : undefined,
      option: bet.optionOption
        ? {
            id: bet.optionOption.id,
            label: bet.optionOption.label,
          }
        : undefined,
      analytics: {
        riskScore: 0, // Placeholder - would implement fraud detection logic
        profitability: bet.payout ? Number(bet.payout - bet.amount) / Number(bet.amount) : 0,
        suspiciousPatterns: [], // Placeholder
      },
    }));

    const detailedTransactions: DetailedTransaction[] = transactions.map((tx) => {
      return {
        ...tx,
        userName: tx.user.name,
        userEmail: tx.user.email,
        ...(includeMetadata && {
          subtype: tx.subtype,
          description: tx.description,
          metadata: tx.metadata,
        }),
        // For pong transactions, we'll rely on the relatedPongMatchId field
        // and can optionally fetch pong match data separately if needed
      };
    });

    const totalPages = Math.ceil(Math.max(totalBets, totalTransactions) / limit);

    return {
      bets: detailedBets,
      transactions: detailedTransactions,
      totalBets,
      totalTransactions,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
    };
  }

  async getFinancialAnalytics(params?: FinancialAnalyticsParams): Promise<FinancialAnalytics> {
    const { startDate, endDate } = params || {};

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter = {
        createdAt: {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        },
      };
    }

    // Category filtering could be implemented here if needed

    // Get overview metrics
    const [bets, transactions] = await Promise.all([
      this.prisma.bet.findMany({
        where: dateFilter,
        include: { prediction: true },
      }),
      this.prisma.transaction.findMany({
        where: dateFilter,
      }),
    ]);

    const totalBettingVolume = bets.reduce((sum, bet) => sum + Number(bet.amount), 0);
    const totalPayouts = transactions
      .filter((tx) => tx.type === 'CREDIT') // CREDIT represents payouts
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const totalRefunds = transactions
      .filter((tx) => tx.type === 'CREDIT' && tx.relatedBetId) // Credits related to bets are refunds
      .reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Category breakdown
    const categoryMap = new Map();
    bets.forEach((bet) => {
      const cat = bet.prediction?.category || 'Unknown';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { volume: 0, betCount: 0 });
      }
      const data = categoryMap.get(cat);
      data.volume += Number(bet.amount); // Convert BigInt to number
      data.betCount += 1;
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      volume: data.volume,
      betCount: data.betCount,
      profitMargin:
        data.volume > 0
          ? (data.volume - (totalPayouts * data.betCount) / bets.length) / data.volume
          : 0,
    }));

    // Simplified analytics - in production would be more sophisticated
    const analytics: FinancialAnalytics = {
      overview: {
        totalBettingVolume,
        totalPayouts,
        totalRefunds,
        netRevenue: totalBettingVolume - totalPayouts - totalRefunds,
        activeBettors: new Set(bets.map((b) => b.userId)).size,
        avgBetSize: bets.length > 0 ? totalBettingVolume / bets.length : 0,
      },
      timeSeriesData: [], // Would implement daily/weekly aggregation
      categoryBreakdown,
      userSegments: [], // Would implement user segmentation
      fraudDetection: {
        suspiciousBets: 0, // Placeholder
        flaggedUsers: 0,
        riskPatterns: [],
      },
    };

    return analytics;
  }

  // NEW: Unified Analytics with enhanced transaction insights
  async getUnifiedAnalytics(params?: any): Promise<any> {
    const {
      startDate,
      endDate,
      includeHourlyTrends = false,
      includeRiskMetrics = false,
      topUsersLimit = 10,
    } = params || {};

    const dateFilter = this.buildDateFilter(startDate, endDate);
    const generatedAt = new Date().toISOString();

    // Get all transactions with enhanced categorization
    const [transactions, users] = await Promise.all([
      this.prisma.transaction.findMany({
        where: dateFilter,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.findMany({
        where: {
          transactions: {
            some: dateFilter,
          },
        },
        select: { id: true, name: true },
      }),
    ]);

    // Categorize transactions by subtype
    const bettingTransactions = transactions.filter(
      (tx) => tx.subtype?.includes('BET') && !tx.subtype?.includes('PARLAY'),
    );
    const parlayTransactions = transactions.filter((tx) => tx.subtype?.includes('PARLAY'));
    const pongTransactions = transactions.filter((tx) => tx.subtype?.includes('PONG'));

    // Calculate overview metrics
    const totalVolume = transactions.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    const totalWagers = transactions
      .filter((tx) => tx.subtype?.includes('WAGER'))
      .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
    const totalPayouts = transactions
      .filter((tx) => tx.subtype?.includes('PAYOUT'))
      .reduce((sum, tx) => sum + Number(tx.amount), 0);
    const platformRevenue = totalWagers - totalPayouts;

    // Calculate metrics by transaction type
    const calculateMetrics = (
      txs: typeof transactions,
      wagerSubtype: string,
      payoutSubtype: string,
    ) => {
      const wagers = txs.filter((tx) => tx.subtype === wagerSubtype);
      const payouts = txs.filter((tx) => tx.subtype === payoutSubtype);

      const totalWagers = wagers.reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0);
      const totalPayouts = payouts.reduce((sum, tx) => sum + Number(tx.amount), 0);
      const netRevenue = totalWagers - totalPayouts;
      const avgWagerSize = wagers.length > 0 ? totalWagers / wagers.length : 0;
      const winRate = wagers.length > 0 ? payouts.length / wagers.length : 0;

      return {
        totalWagers: totalWagers.toString(),
        totalPayouts: totalPayouts.toString(),
        netRevenue: netRevenue.toString(),
        transactionCount: wagers.length + payouts.length,
        avgWagerSize: avgWagerSize.toString(),
        winRate,
      };
    };

    const bettingMetrics = calculateMetrics(bettingTransactions, 'BET_WAGER', 'BET_PAYOUT');
    const parlayMetrics = calculateMetrics(parlayTransactions, 'PARLAY_WAGER', 'PARLAY_PAYOUT');
    const pongMetrics = calculateMetrics(pongTransactions, 'PONG_WAGER', 'PONG_PAYOUT');

    // Pong-specific breakdown (PVP vs PVE)
    const pongPvpTxs = pongTransactions.filter(
      (tx) =>
        tx.metadata &&
        typeof tx.metadata === 'object' &&
        'matchType' in tx.metadata &&
        (tx.metadata as any).matchType === 'PVP',
    );
    const pongPveTxs = pongTransactions.filter(
      (tx) =>
        tx.metadata &&
        typeof tx.metadata === 'object' &&
        'matchType' in tx.metadata &&
        (tx.metadata as any).matchType === 'PVE_AI',
    );

    const pvpVsPveBreakdown = {
      pvp: {
        wagers: pongPvpTxs
          .filter((tx) => tx.subtype === 'PONG_WAGER')
          .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
          .toString(),
        payouts: pongPvpTxs
          .filter((tx) => tx.subtype === 'PONG_PAYOUT')
          .reduce((sum, tx) => sum + Number(tx.amount), 0)
          .toString(),
        matches: Math.floor(pongPvpTxs.filter((tx) => tx.subtype === 'PONG_WAGER').length),
      },
      pve: {
        wagers: pongPveTxs
          .filter((tx) => tx.subtype === 'PONG_WAGER')
          .reduce((sum, tx) => sum + Math.abs(Number(tx.amount)), 0)
          .toString(),
        payouts: pongPveTxs
          .filter((tx) => tx.subtype === 'PONG_PAYOUT')
          .reduce((sum, tx) => sum + Number(tx.amount), 0)
          .toString(),
        matches: Math.floor(pongPveTxs.filter((tx) => tx.subtype === 'PONG_WAGER').length),
      },
    };

    // Daily trends
    const dailyTrends = this.calculateDailyTrends(transactions);

    // Hourly trends (if requested)
    let hourlyTrends: any[] = [];
    if (includeHourlyTrends) {
      hourlyTrends = this.calculateHourlyTrends(transactions);
    }

    // User insights
    const userInsights = this.calculateUserInsights(transactions, topUsersLimit);

    // Risk metrics (if requested)
    let riskMetrics: any = {
      largeTransactions: [],
      suspitiousPatterns: {
        rapidTransactions: 0,
        unusualAmounts: 0,
        potentialArbitrage: 0,
      },
    };
    if (includeRiskMetrics) {
      riskMetrics = this.calculateRiskMetrics(transactions);
    }

    return {
      overview: {
        totalVolume: totalVolume.toString(),
        totalTransactions: transactions.length,
        totalUsers: users.length,
        platformRevenue: platformRevenue.toString(),
        generatedAt,
      },
      byTransactionType: {
        betting: bettingMetrics,
        parlays: parlayMetrics,
        pong: {
          ...pongMetrics,
          pvpVsPveBreakdown,
        },
      },
      trends: {
        daily: dailyTrends,
        hourly: hourlyTrends,
      },
      userInsights,
      riskMetrics,
    };
  }

  private buildDateFilter(startDate?: string, endDate?: string) {
    if (!startDate && !endDate) return {};

    return {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    };
  }

  private calculateDailyTrends(transactions: any[]) {
    const dailyMap = new Map();

    transactions.forEach((tx) => {
      const date = tx.createdAt.toISOString().split('T')[0];
      if (!dailyMap.has(date)) {
        dailyMap.set(date, {
          date,
          betting: { volume: 0, transactions: 0 },
          parlays: { volume: 0, transactions: 0 },
          pong: { volume: 0, transactions: 0 },
        });
      }

      const day = dailyMap.get(date);
      const amount = Math.abs(Number(tx.amount));

      if (tx.subtype?.includes('BET') && !tx.subtype?.includes('PARLAY')) {
        day.betting.volume += amount;
        day.betting.transactions += 1;
      } else if (tx.subtype?.includes('PARLAY')) {
        day.parlays.volume += amount;
        day.parlays.transactions += 1;
      } else if (tx.subtype?.includes('PONG')) {
        day.pong.volume += amount;
        day.pong.transactions += 1;
      }
    });

    return Array.from(dailyMap.values())
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((day) => ({
        ...day,
        betting: {
          volume: day.betting.volume.toString(),
          transactions: day.betting.transactions,
        },
        parlays: {
          volume: day.parlays.volume.toString(),
          transactions: day.parlays.transactions,
        },
        pong: {
          volume: day.pong.volume.toString(),
          transactions: day.pong.transactions,
        },
      }));
  }

  private calculateHourlyTrends(transactions: any[]) {
    const hourlyMap = new Map();

    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, { hour, volume: 0, transactionCount: 0 });
    }

    transactions.forEach((tx) => {
      const hour = tx.createdAt.getHours();
      const hourData = hourlyMap.get(hour);
      hourData.volume += Math.abs(Number(tx.amount));
      hourData.transactionCount += 1;
    });

    return Array.from(hourlyMap.values()).map((hour) => ({
      ...hour,
      volume: hour.volume.toString(),
    }));
  }

  private calculateUserInsights(transactions: any[], limit: number) {
    const userMap = new Map();

    transactions.forEach((tx) => {
      const userId = tx.userId;
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: tx.user?.name || 'Unknown',
          totalSpent: 0,
          totalWon: 0,
          betting: 0,
          parlays: 0,
          pong: 0,
        });
      }

      const user = userMap.get(userId);
      const amount = Math.abs(Number(tx.amount));

      if (tx.subtype?.includes('WAGER')) {
        user.totalSpent += amount;
      } else if (tx.subtype?.includes('PAYOUT')) {
        user.totalWon += amount;
      }

      // Categorize spending by activity
      if (tx.subtype?.includes('BET') && !tx.subtype?.includes('PARLAY')) {
        user.betting += amount;
      } else if (tx.subtype?.includes('PARLAY')) {
        user.parlays += amount;
      } else if (tx.subtype?.includes('PONG')) {
        user.pong += amount;
      }
    });

    const users = Array.from(userMap.values());

    // Top spenders
    const topSpenders = users
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, limit)
      .map((user) => {
        const preferredActivity =
          user.betting >= user.parlays && user.betting >= user.pong
            ? 'betting'
            : user.parlays >= user.pong
              ? 'parlays'
              : 'pong';

        return {
          userId: user.userId,
          userName: user.userName,
          totalSpent: user.totalSpent.toString(),
          preferredActivity: preferredActivity as 'betting' | 'parlays' | 'pong',
          activityBreakdown: {
            betting: user.betting.toString(),
            parlays: user.parlays.toString(),
            pong: user.pong.toString(),
          },
        };
      });

    // Top winners
    const topWinners = users
      .map((user) => ({
        ...user,
        netProfit: user.totalWon - user.totalSpent,
      }))
      .sort((a, b) => b.totalWon - a.totalWon)
      .slice(0, limit)
      .map((user) => {
        const primarySource =
          user.betting >= user.parlays && user.betting >= user.pong
            ? 'betting'
            : user.parlays >= user.pong
              ? 'parlays'
              : 'pong';

        return {
          userId: user.userId,
          userName: user.userName,
          totalWon: user.totalWon.toString(),
          netProfit: user.netProfit.toString(),
          primarySource: primarySource as 'betting' | 'parlays' | 'pong',
        };
      });

    return { topSpenders, topWinners };
  }

  private calculateRiskMetrics(transactions: any[]) {
    // Large transactions (>1000 MuskBucks)
    const largeTransactions = transactions
      .filter((tx) => Math.abs(Number(tx.amount)) > 1000)
      .map((tx) => ({
        transactionId: tx.id.toString(),
        userId: tx.userId,
        amount: tx.amount.toString(),
        type: tx.type,
        subtype: tx.subtype || 'unknown',
        riskScore: this.calculateRiskScore(tx),
        flags: this.generateRiskFlags(tx),
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 20);

    // Suspicious patterns
    const userTransactionCounts = new Map();
    const unusualAmounts = new Set();

    transactions.forEach((tx) => {
      const userId = tx.userId;
      const count = userTransactionCounts.get(userId) || 0;
      userTransactionCounts.set(userId, count + 1);

      // Flag unusual amounts (multiples of 9999, very round numbers)
      const amount = Math.abs(Number(tx.amount));
      if (amount % 9999 === 0 || amount % 10000 === 0) {
        unusualAmounts.add(tx.id);
      }
    });

    const rapidTransactions = Array.from(userTransactionCounts.values()).filter(
      (count) => count > 50,
    ).length;

    return {
      largeTransactions,
      suspitiousPatterns: {
        rapidTransactions,
        unusualAmounts: unusualAmounts.size,
        potentialArbitrage: 0, // Would implement arbitrage detection
      },
    };
  }

  private calculateRiskScore(transaction: any): number {
    let score = 0;
    const amount = Math.abs(Number(transaction.amount));

    // Amount-based risk
    if (amount > 10000) score += 3;
    else if (amount > 5000) score += 2;
    else if (amount > 1000) score += 1;

    // Pattern-based risk
    if (amount % 9999 === 0) score += 2;
    if (amount % 10000 === 0) score += 1;

    // Time-based risk (transactions at unusual hours)
    const hour = transaction.createdAt.getHours();
    if (hour < 6 || hour > 23) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  private generateRiskFlags(transaction: any): string[] {
    const flags: string[] = [];
    const amount = Math.abs(Number(transaction.amount));

    if (amount > 10000) flags.push('LARGE_AMOUNT');
    if (amount % 9999 === 0) flags.push('SUSPICIOUS_PATTERN');
    if (amount % 10000 === 0) flags.push('ROUND_NUMBER');

    const hour = transaction.createdAt.getHours();
    if (hour < 6 || hour > 23) flags.push('OFF_HOURS');

    return flags;
  }

  async bulkFinancialOperation(operation: BulkFinancialOperation): Promise<BulkFinancialResult> {
    const { betIds = [], userIds = [], operation: op } = operation;

    let successCount = 0;
    let failureCount = 0;
    let totalRefunded = 0;
    const errors: Array<{ id: number; error: string }> = [];

    try {
      if (op === 'refund' && betIds.length > 0) {
        // Bulk refund bets
        for (const betId of betIds) {
          try {
            const bet = await this.prisma.bet.findUnique({ where: { id: betId } });
            if (!bet) {
              errors.push({ id: betId, error: 'Bet not found' });
              failureCount++;
              continue;
            }

            await this.prisma.$transaction(async (tx) => {
              // Update bet status
              await tx.bet.update({
                where: { id: betId },
                data: { status: 'REFUNDED' },
              });

              // Create refund transaction
              await tx.transaction.create({
                data: {
                  userId: bet.userId,
                  type: 'CREDIT', // Using CREDIT for refunds
                  amount: bet.amount,
                  balanceAfter: 0, // Would calculate properly
                  relatedBetId: betId,
                },
              });

              // Update user balance
              await tx.user.update({
                where: { id: bet.userId },
                data: {
                  muskBucks: { increment: bet.amount },
                },
              });
            });

            totalRefunded += Number(bet.amount);
            successCount++;
          } catch (error) {
            errors.push({ id: betId, error: (error as Error).message });
            failureCount++;
          }
        }
      }

      // Additional bulk operations would be implemented here
    } catch (error) {
      failureCount = betIds.length + userIds.length;
      errors.push({ id: 0, error: (error as Error).message });
    }

    return {
      successCount,
      failureCount,
      totalProcessed: betIds.length + userIds.length,
      totalRefunded,
      errors,
    };
  }

  async exportFinancialData(params: FinancialExportParams): Promise<string> {
    const { format, dataType } = params;
    // filters could be applied here for more specific exports

    let data: any[] = [];
    let headers: string[] = [];

    if (dataType === 'bets') {
      const bets = await this.prisma.bet.findMany({
        include: {
          user: { select: { name: true, email: true } },
          prediction: { select: { title: true, category: true } },
        },
      });

      headers = ['ID', 'User', 'Email', 'Prediction', 'Amount', 'Status', 'Created At'];
      data = bets.map((bet) => [
        bet.id,
        bet.user.name,
        bet.user.email,
        bet.prediction?.title || 'Unknown',
        bet.amount,
        bet.status,
        bet.createdAt.toISOString(),
      ]);
    } else if (dataType === 'transactions') {
      const transactions = await this.prisma.transaction.findMany({
        include: {
          user: { select: { name: true, email: true } },
        },
      });

      headers = ['ID', 'User', 'Email', 'Type', 'Amount', 'Balance After', 'Created At'];
      data = transactions.map((tx) => [
        tx.id,
        tx.user.name,
        tx.user.email,
        tx.type,
        tx.amount,
        tx.balanceAfter,
        tx.createdAt.toISOString(),
      ]);
    }

    if (format === 'csv') {
      const csvRows = [headers.join(','), ...data.map((row) => row.join(','))];
      return csvRows.join('\n');
    } else {
      // For Excel format, would use a library like xlsx
      // For now, return CSV format
      const csvRows = [headers.join(','), ...data.map((row) => row.join(','))];
      return csvRows.join('\n');
    }
  }

  // -- Enhanced Badge & Achievement System --
  async searchBadges(params: BadgeSearchParams): Promise<PaginatedBadges> {
    const {
      search,
      categoryId,
      isActive,
      rarity: _rarity,
      userCount: _userCount,
      page,
      limit: requestedLimit,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = params;

    const limit = Math.min(requestedLimit, 100);
    const offset = page * limit;

    // Build where clause for badges
    const whereClause: any = {};

    if (search && search.trim()) {
      whereClause.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      // Note: This would require a categoryId field in the Badge model
      // For now, we'll skip this filter
    }

    if (isActive !== undefined) {
      // Note: This would require an isActive field in the Badge model
      // For now, we'll skip this filter
    }

    // Execute queries in parallel
    const [badges, totalCount] = await Promise.all([
      this.prisma.badge.findMany({
        where: whereClause,
        orderBy: { [sortBy]: sortOrder },
        skip: offset,
        take: limit,
        include: {
          users: {
            include: {
              user: { select: { name: true } },
            },
            orderBy: { awardedAt: 'desc' },
            take: 5, // Recent awards
          },
        },
      }),
      this.prisma.badge.count({ where: whereClause }),
    ]);

    // Transform to detailed badges
    const detailedBadges: DetailedBadge[] = badges.map((badge) => {
      const totalUsers = badge.users.length;
      const thisMonth = new Date();
      thisMonth.setMonth(thisMonth.getMonth() - 1);

      const awardedThisMonth = badge.users.filter((ub) => ub.awardedAt >= thisMonth).length;

      return {
        ...badge,
        analytics: {
          totalUsers,
          awardedThisMonth,
          popularityScore: totalUsers, // Simple popularity score
          rarityLevel:
            totalUsers > 100
              ? 'common'
              : totalUsers > 50
                ? 'rare'
                : totalUsers > 10
                  ? 'epic'
                  : 'legendary',
        },
        recentAwards: badge.users.slice(0, 5).map((ub) => ({
          userId: ub.userId,
          userName: ub.user.name,
          awardedAt: ub.awardedAt,
          reason: ub.reason || undefined,
        })),
      };
    });

    const totalPages = Math.ceil(totalCount / limit);

    return {
      badges: detailedBadges,
      totalCount,
      totalPages,
      currentPage: page,
      hasNextPage: page < totalPages - 1,
      hasPreviousPage: page > 0,
      categoryBreakdown: [], // Would implement with actual categories
    };
  }

  async getBadgeWithDetails(badgeId: number): Promise<DetailedBadge | null> {
    const badge = await this.prisma.badge.findUnique({
      where: { id: badgeId },
      include: {
        users: {
          include: {
            user: { select: { name: true } },
          },
          orderBy: { awardedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!badge) return null;

    const totalUsers = badge.users.length;
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const awardedThisMonth = badge.users.filter((ub) => ub.awardedAt >= thisMonth).length;

    return {
      ...badge,
      analytics: {
        totalUsers,
        awardedThisMonth,
        popularityScore: totalUsers,
        rarityLevel:
          totalUsers > 100
            ? 'common'
            : totalUsers > 50
              ? 'rare'
              : totalUsers > 10
                ? 'epic'
                : 'legendary',
      },
      recentAwards: badge.users.map((ub) => ({
        userId: ub.userId,
        userName: ub.user.name,
        awardedAt: ub.awardedAt,
        reason: ub.reason || undefined,
      })),
    };
  }

  async createBadgeWithCategories(data: CreateBadgeData): Promise<DetailedBadge> {
    const badge = await this.prisma.badge.create({
      data: {
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        // Note: categoryId, rarity, etc. would need to be added to schema
      },
      include: {
        users: {
          include: {
            user: { select: { name: true } },
          },
          take: 5,
        },
      },
    });

    return {
      ...badge,
      analytics: {
        totalUsers: 0,
        awardedThisMonth: 0,
        popularityScore: 0,
        rarityLevel: data.rarity || 'common',
      },
      recentAwards: [],
    };
  }

  async updateBadge(badgeId: number, data: UpdateBadgeData): Promise<DetailedBadge> {
    const badge = await this.prisma.badge.update({
      where: { id: badgeId },
      data: {
        name: data.name,
        description: data.description,
        iconUrl: data.iconUrl,
        // Note: Additional fields would need schema updates
      },
      include: {
        users: {
          include: {
            user: { select: { name: true } },
          },
          take: 5,
        },
      },
    });

    const totalUsers = badge.users.length;
    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    const awardedThisMonth = badge.users.filter((ub) => ub.awardedAt >= thisMonth).length;

    return {
      ...badge,
      analytics: {
        totalUsers,
        awardedThisMonth,
        popularityScore: totalUsers,
        rarityLevel:
          totalUsers > 100
            ? 'common'
            : totalUsers > 50
              ? 'rare'
              : totalUsers > 10
                ? 'epic'
                : 'legendary',
      },
      recentAwards: badge.users.map((ub) => ({
        userId: ub.userId,
        userName: ub.user.name,
        awardedAt: ub.awardedAt,
        reason: ub.reason || undefined,
      })),
    };
  }

  async deleteBadge(badgeId: number): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Delete all user badge assignments first
      await tx.userBadge.deleteMany({
        where: { badgeId },
      });

      // Delete the badge
      await tx.badge.delete({
        where: { id: badgeId },
      });
    });
  }

  async getBadgeAnalytics(badgeId?: number): Promise<BadgeAnalytics> {
    const whereClause = badgeId ? { id: badgeId } : {};

    const [badges, userBadges, users] = await Promise.all([
      this.prisma.badge.findMany({
        where: whereClause,
        include: {
          users: {
            include: {
              user: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.userBadge.findMany({
        include: {
          badge: { select: { name: true } },
          user: { select: { name: true } },
        },
        orderBy: { awardedAt: 'desc' },
        take: 20,
      }),
      this.prisma.user.findMany({
        include: {
          userBadges: {
            include: {
              badge: true,
            },
          },
        },
      }),
    ]);

    // Calculate most popular badge
    const badgeUserCounts = badges
      .map((badge) => ({
        id: badge.id,
        name: badge.name,
        userCount: badge.users.length,
      }))
      .sort((a, b) => b.userCount - a.userCount);

    const mostPopularBadge = badgeUserCounts[0] || { id: 0, name: 'None', userCount: 0 };

    // Calculate top performers
    const topPerformers = users
      .map((user) => ({
        userId: user.id,
        userName: user.name,
        badgeCount: user.userBadges.length,
        rareCount: user.userBadges.filter((ub) => {
          const totalUsers = badges.find((b) => b.id === ub.badgeId)?.users.length || 0;
          return totalUsers <= 50; // Consider rare if less than 50 users have it
        }).length,
      }))
      .sort((a, b) => b.badgeCount - a.badgeCount)
      .slice(0, 10);

    return {
      overview: {
        totalBadges: badges.length,
        totalCategories: 0, // Would implement with actual categories
        totalAwards: userBadges.length,
        activeUsers: new Set(userBadges.map((ub) => ub.userId)).size,
        mostPopularBadge,
      },
      categoryDistribution: [], // Would implement with actual categories
      rarityDistribution: [
        {
          rarity: 'common',
          count: badgeUserCounts.filter((b) => b.userCount > 100).length,
          percentage: 0,
        },
        {
          rarity: 'rare',
          count: badgeUserCounts.filter((b) => b.userCount <= 100 && b.userCount > 50).length,
          percentage: 0,
        },
        {
          rarity: 'epic',
          count: badgeUserCounts.filter((b) => b.userCount <= 50 && b.userCount > 10).length,
          percentage: 0,
        },
        {
          rarity: 'legendary',
          count: badgeUserCounts.filter((b) => b.userCount <= 10).length,
          percentage: 0,
        },
      ],
      recentActivity: userBadges.map((ub) => ({
        badgeId: ub.badgeId,
        badgeName: ub.badge.name,
        userId: ub.userId,
        userName: ub.user.name,
        awardedAt: ub.awardedAt,
      })),
      topPerformers,
    };
  }

  async bulkBadgeOperation(operation: BulkBadgeOperation): Promise<BulkBadgeResult> {
    const { badgeIds = [], userIds = [], operation: op, params } = operation;

    let successCount = 0;
    let failureCount = 0;
    const errors: Array<{ id: number; error: string }> = [];
    const updatedBadges: DetailedBadge[] = [];
    const updatedUsers: Array<{ userId: number; badgeCount: number }> = [];

    try {
      if (op === 'award' && badgeIds.length > 0 && params?.targetUserIds) {
        // Award badges to users
        for (const badgeId of badgeIds) {
          for (const userId of params.targetUserIds) {
            try {
              await this.prisma.userBadge.create({
                data: {
                  userId,
                  badgeId,
                  reason: params.reason,
                  awardedAt: new Date(),
                },
              });
              successCount++;
            } catch (error) {
              errors.push({
                id: badgeId,
                error: `Failed to award badge ${badgeId} to user ${userId}: ${(error as Error).message}`,
              });
              failureCount++;
            }
          }
        }
      } else if (op === 'revoke' && badgeIds.length > 0 && userIds.length > 0) {
        // Revoke badges from users
        for (const badgeId of badgeIds) {
          for (const userId of userIds) {
            try {
              await this.prisma.userBadge.deleteMany({
                where: { badgeId, userId },
              });
              successCount++;
            } catch (error) {
              errors.push({
                id: badgeId,
                error: `Failed to revoke badge ${badgeId} from user ${userId}: ${(error as Error).message}`,
              });
              failureCount++;
            }
          }
        }
      } else if (op === 'delete' && badgeIds.length > 0) {
        // Delete badges
        for (const badgeId of badgeIds) {
          try {
            await this.deleteBadge(badgeId);
            successCount++;
          } catch (error) {
            errors.push({
              id: badgeId,
              error: `Failed to delete badge ${badgeId}: ${(error as Error).message}`,
            });
            failureCount++;
          }
        }
      }

      // Get updated user badge counts
      if (userIds.length > 0 && (op === 'award' || op === 'revoke')) {
        for (const userId of userIds) {
          const badgeCount = await this.prisma.userBadge.count({ where: { userId } });
          updatedUsers.push({ userId, badgeCount });
        }
      }
    } catch (error) {
      failureCount = badgeIds.length + userIds.length;
      errors.push({ id: 0, error: (error as Error).message });
    }

    return {
      successCount,
      failureCount,
      totalProcessed: badgeIds.length + userIds.length,
      errors,
      updatedBadges,
      updatedUsers,
    };
  }

  async getBadgeCategories(): Promise<BadgeCategory[]> {
    // Note: This would require a BadgeCategory table in the schema
    // For now, return empty array
    return [];
  }

  async createBadgeCategory(data: CreateBadgeCategoryData): Promise<BadgeCategory> {
    // Note: This would require a BadgeCategory table in the schema
    // For now, return a mock category
    return {
      id: 1,
      name: data.name,
      description: data.description,
      color: data.color,
      iconUrl: data.iconUrl,
      badgeCount: 0,
      createdAt: new Date(),
    };
  }

  // -- Legacy Badge & Content Moderation (deprecated) --
  async findPosts(_filters?: QueryParams): Promise<UserPost[]> {
    return this.prisma.userPost.findMany();
  }

  async deletePost(postId: number): Promise<void> {
    await this.prisma.userPost.delete({ where: { id: postId } });
  }

  async findAllBadges(): Promise<Badge[]> {
    return this.prisma.badge.findMany();
  }

  async insertBadge(data: {
    name: string;
    description?: string;
    iconUrl?: string;
  }): Promise<Badge> {
    return this.prisma.badge.create({ data });
  }

  async addBadgeToUser(userId: number, badgeId: number): Promise<UserBadge> {
    return this.prisma.userBadge.create({
      data: { userId, badgeId, awardedAt: new Date() },
    });
  }

  async removeBadgeFromUser(userId: number, badgeId: number): Promise<void> {
    await this.prisma.userBadge.delete({
      where: { userId_badgeId: { userId, badgeId } },
    });
  }

  // -- Advanced Analytics & Reporting --
  async getExecutiveDashboard(params: AnalyticsParams): Promise<ExecutiveDashboardData> {
    const { startDate, endDate } = params;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const currentPeriodStart = startDate || thirtyDaysAgo;
    const currentPeriodEnd = endDate || now;
    const previousPeriodStart = new Date(
      currentPeriodStart.getTime() - (currentPeriodEnd.getTime() - currentPeriodStart.getTime()),
    );
    const previousPeriodEnd = currentPeriodStart;

    // Overview metrics
    const [totalUsers, totalPredictions, totalBets] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.prediction.count(),
      this.prisma.bet.count(),
    ]);

    // Active users based on recent activity (simplified - users with recent bets)
    const activeUsers = await this.prisma.user.count({
      where: {
        bets: {
          some: {
            createdAt: { gte: thirtyDaysAgo },
          },
        },
      },
    });

    // Financial metrics
    const totalRevenue = await this.prisma.bet.aggregate({
      _sum: { amount: true },
    });

    // Calculate payouts from bets that have been resolved
    const totalPayouts = await this.prisma.bet.aggregate({
      where: { payout: { not: null } },
      _sum: { payout: true },
    });

    const avgUserValue = totalUsers > 0 ? Number(totalRevenue._sum.amount || 0) / totalUsers : 0;
    const netProfit = Number(totalRevenue._sum.amount || 0) - Number(totalPayouts._sum.payout || 0);

    // Current period metrics
    const currentNewUsers = await this.prisma.user.count({
      where: { createdAt: { gte: currentPeriodStart, lte: currentPeriodEnd } },
    });

    const currentRevenue = await this.prisma.bet.aggregate({
      where: { createdAt: { gte: currentPeriodStart, lte: currentPeriodEnd } },
      _sum: { amount: true },
    });

    const currentBets = await this.prisma.bet.count({
      where: { createdAt: { gte: currentPeriodStart, lte: currentPeriodEnd } },
    });

    // Previous period metrics for comparison
    const previousNewUsers = await this.prisma.user.count({
      where: { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
    });

    const previousRevenue = await this.prisma.bet.aggregate({
      where: { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
      _sum: { amount: true },
    });

    const previousBets = await this.prisma.bet.count({
      where: { createdAt: { gte: previousPeriodStart, lte: previousPeriodEnd } },
    });

    // Calculate growth rates
    const userGrowthRate =
      previousNewUsers > 0 ? ((currentNewUsers - previousNewUsers) / previousNewUsers) * 100 : 0;
    const revenueGrowthRate =
      Number(previousRevenue._sum.amount || 0) > 0
        ? ((Number(currentRevenue._sum.amount || 0) - Number(previousRevenue._sum.amount || 0)) /
            Number(previousRevenue._sum.amount || 0)) *
          100
        : 0;
    const engagementGrowthRate =
      previousBets > 0 ? ((currentBets - previousBets) / previousBets) * 100 : 0;

    // Retention rate (simplified - users who bet in current period and existed before)
    const retainedUsers = await this.prisma.user.count({
      where: {
        AND: [
          { createdAt: { lt: currentPeriodStart } },
          {
            bets: {
              some: {
                createdAt: { gte: currentPeriodStart, lte: currentPeriodEnd },
              },
            },
          },
        ],
      },
    });

    const eligibleUsers = await this.prisma.user.count({
      where: { createdAt: { lt: currentPeriodStart } },
    });

    const retentionRate = eligibleUsers > 0 ? (retainedUsers / eligibleUsers) * 100 : 0;

    return {
      overview: {
        totalUsers,
        activeUsers,
        totalPredictions,
        totalBets,
        totalRevenue: Number(totalRevenue._sum.amount || 0),
        totalPayouts: Number(totalPayouts._sum.payout || 0),
        netProfit,
        avgUserValue,
      },
      growthMetrics: {
        userGrowthRate,
        revenueGrowthRate,
        engagementGrowthRate,
        retentionRate,
      },
      currentPeriodComparison: {
        newUsers: {
          current: currentNewUsers,
          previous: previousNewUsers,
          change: userGrowthRate,
        },
        revenue: {
          current: Number(currentRevenue._sum.amount || 0),
          previous: Number(previousRevenue._sum.amount || 0),
          change: revenueGrowthRate,
        },
        bets: {
          current: currentBets,
          previous: previousBets,
          change: engagementGrowthRate,
        },
        engagement: {
          current: currentBets,
          previous: previousBets,
          change: engagementGrowthRate,
        },
      },
    };
  }

  async getUserBehaviorAnalytics(params: AnalyticsParams): Promise<UserBehaviorAnalytics> {
    const { startDate, endDate } = params;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const periodStart = startDate || thirtyDaysAgo;
    const periodEnd = endDate || now;

    // Betting patterns
    const avgBetsResult = await this.prisma.bet.aggregate({
      _avg: { amount: true },
      _count: true,
    });

    const avgBetsPerUser =
      avgBetsResult._count > 0 ? avgBetsResult._count / (await this.prisma.user.count()) : 0;

    // Category preferences - using Prisma queries instead of raw SQL
    const betsWithPredictions = await this.prisma.bet.findMany({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      include: {
        prediction: {
          select: { category: true },
        },
      },
    });

    // Group by category and calculate stats
    const categoryMap = new Map<string, { count: number; volume: number }>();
    betsWithPredictions.forEach((bet) => {
      const category = bet.prediction.category;
      const existing = categoryMap.get(category) || { count: 0, volume: 0 };
      categoryMap.set(category, {
        count: existing.count + 1,
        volume: existing.volume + Number(bet.amount),
      });
    });

    const categoryStats = Array.from(categoryMap.entries())
      .map(([category, stats]) => ({
        category,
        bet_count: BigInt(stats.count),
        volume: BigInt(stats.volume),
      }))
      .sort((a, b) => Number(b.bet_count - a.bet_count))
      .slice(0, 10);

    // Time patterns - using Prisma queries
    const betsInPeriod = await this.prisma.bet.findMany({
      where: {
        createdAt: { gte: periodStart, lte: periodEnd },
      },
      select: {
        createdAt: true,
        amount: true,
      },
    });

    // Group by hour
    const hourMap = new Map<number, { count: number; volume: number }>();
    betsInPeriod.forEach((bet) => {
      const hour = bet.createdAt.getHours();
      const existing = hourMap.get(hour) || { count: 0, volume: 0 };
      hourMap.set(hour, {
        count: existing.count + 1,
        volume: existing.volume + Number(bet.amount),
      });
    });

    const timePatterns = Array.from({ length: 24 }, (_, hour) => {
      const stats = hourMap.get(hour) || { count: 0, volume: 0 };
      return {
        hour,
        bet_count: BigInt(stats.count),
        volume: BigInt(stats.volume),
      };
    });

    return {
      demographics: {
        ageDistribution: [
          { ageRange: '18-25', count: 0, percentage: 0 },
          { ageRange: '26-35', count: 0, percentage: 0 },
          { ageRange: '36-45', count: 0, percentage: 0 },
          { ageRange: '46+', count: 0, percentage: 0 },
        ],
        activityLevels: [
          { level: 'Low', count: 0, avgValue: 0 },
          { level: 'Medium', count: 0, avgValue: 0 },
          { level: 'High', count: 0, avgValue: 0 },
        ],
        retentionCohorts: [],
      },
      bettingPatterns: {
        avgBetsPerUser,
        avgBetAmount: avgBetsResult._avg.amount || 0,
        preferredCategories: categoryStats.map((stat) => ({
          category: stat.category,
          count: Number(stat.bet_count),
          volume: Number(stat.volume),
        })),
        winRateBySegment: [],
        timePatterns: timePatterns.map((pattern) => ({
          hour: pattern.hour,
          betCount: Number(pattern.bet_count),
          volume: Number(pattern.volume),
        })),
      },
      engagement: {
        sessionMetrics: { avgLength: 0, avgActions: 0 },
        featureUsage: [],
        churnRisk: [],
      },
    };
  }

  async getPredictiveAnalytics(_params: AnalyticsParams): Promise<PredictiveAnalytics> {
    // Simplified predictive analytics - in a real system this would use ML models
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Users with low recent activity (churn risk) - users without recent bets
    const inactiveUsers = await this.prisma.user.findMany({
      where: {
        NOT: {
          bets: {
            some: {
              createdAt: { gte: thirtyDaysAgo },
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
      },
      take: 50,
    });

    const userChurnPrediction = inactiveUsers.map((user) => ({
      userId: user.id,
      userName: user.name,
      churnProbability: 0.5, // Placeholder - ML implementation pending
      riskFactors: ['Low activity', 'No recent bets', 'Long time since last activity'],
      recommendations: [
        'Send engagement email',
        'Offer bonus',
        'Personalized prediction suggestions',
      ],
    }));

    // Engagement forecasting (simplified)
    const engagementForecasting = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
      return {
        date: date.toISOString().split('T')[0],
        predictedUsers: 75, // Placeholder - ML implementation pending
        predictedRevenue: 7500, // Placeholder - ML implementation pending
        confidence: 0.85, // Placeholder - ML implementation pending
      };
    });

    return {
      userChurnPrediction,
      engagementForecasting,
      trendAnalysis: {
        emergingCategories: [
          { category: 'Tech', growthRate: 15.5, potential: 8.2 },
          { category: 'Sports', growthRate: 12.3, potential: 7.8 },
          { category: 'Politics', growthRate: -5.2, potential: 6.1 },
        ],
        seasonalPatterns: [
          { period: 'Weekend', trend: 'increase', impact: 23.5 },
          { period: 'Holiday', trend: 'decrease', impact: -12.8 },
        ],
        marketSentiment: {
          score: 7.2,
          factors: [
            'High user engagement',
            'Positive revenue trends',
            'Growing prediction categories',
          ],
        },
      },
    };
  }

  async generateCustomReport(
    reportType: string,
    params: Record<string, any>,
  ): Promise<CustomReportData> {
    // Simplified custom report generation
    const reportId = `report_${Date.now()}_${Date.now().toString(36)}`;

    let data: Array<Record<string, any>> = [];

    switch (reportType) {
      case 'user_activity':
        const users = await this.prisma.user.findMany({
          include: {
            bets: { take: 5 },
            Prediction: { take: 5 },
          },
          take: 100,
        });
        data = users.map((user) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          totalBets: user.bets.length,
          totalPredictions: user.Prediction.length,
          balance: user.muskBucks,
          createdAt: user.createdAt,
        }));
        break;

      case 'financial_summary':
        const bets = await this.prisma.bet.findMany({
          include: {
            user: { select: { name: true } },
            prediction: { select: { title: true, category: true } },
          },
          take: 1000,
          orderBy: { createdAt: 'desc' },
        });
        data = bets.map((bet) => ({
          id: bet.id,
          amount: bet.amount,
          userName: bet.user.name,
          predictionTitle: bet.prediction.title,
          category: bet.prediction.category,
          createdAt: bet.createdAt,
        }));
        break;

      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }

    return {
      reportId,
      title: `${reportType.replace('_', ' ').toUpperCase()} Report`,
      data,
      metadata: {
        totalRows: data.length,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const [activeBets, recentTransactions] = await Promise.all([
      this.prisma.bet.count({ where: { createdAt: { gte: fiveMinutesAgo } } }),
      this.prisma.transaction.count({ where: { createdAt: { gte: fiveMinutesAgo } } }),
    ]);

    // Active users approximated by users with recent bets
    const activeUsers = await this.prisma.user.count({
      where: {
        bets: {
          some: {
            createdAt: { gte: fiveMinutesAgo },
          },
        },
      },
    });

    return {
      activeUsers,
      activeBets,
      recentTransactions,
      systemHealth: {
        responseTime: 75, // Placeholder - metrics integration pending
        errorRate: 0.01, // Placeholder - metrics integration pending
        uptime: 99.9, // Simulated
      },
      alerts: [],
    };
  }

  async exportAnalyticsData(params: {
    reportType: string;
    format: 'csv' | 'excel' | 'pdf';
    filters?: Record<string, any>;
  }): Promise<Buffer> {
    // Simplified export - in reality would generate actual files
    const reportData = await this.generateCustomReport(params.reportType, params.filters || {});
    const csvContent = this.convertToCSV(reportData.data);
    return Buffer.from(csvContent, 'utf-8');
  }

  private convertToCSV(data: Array<Record<string, any>>): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvHeaders = headers.join(',');
    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return String(value || '');
        })
        .join(','),
    );

    return [csvHeaders, ...csvRows].join('\n');
  }

  // -- Leaderboard & Stats --
  async recalculateLeaderboard(): Promise<void> {
    // Note: leaderboard_view is now a regular table updated by triggers
    // No need to refresh materialized view anymore
    // The table is automatically updated via database triggers on bet/payout events
  }

  async findUserStats(userId: number): Promise<UserStats | null> {
    return this.prisma.userStats.findUnique({ where: { userId } });
  }

  // -- Miscellaneous --
  async triggerAITweet(): Promise<AITweet> {
    return this.prisma.aITweet.create({
      data: {
        content: 'Placeholder AI tweet',
      },
    });
  }
}
