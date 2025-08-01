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
  BulkPredictionResult
} from './IAdminRepository';

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
      sortOrder = 'desc'
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
        { email: { contains: search.trim(), mode: 'insensitive' } }
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
              badge: true
            }
          }
        }
      }),
      this.prisma.user.count({ where: whereClause })
    ]);

    // Transform to DetailedUser format with additional information
    const detailedUsers: DetailedUser[] = users.map(user => {
      const detailedUser: DetailedUser = {
        ...user,
        badges: user.userBadges?.map((ub: any) => ub.badge) || [],
        stats: {
          totalBets: 0,
          totalWagered: 0,
          totalWon: 0,
          winRate: 0
        },
        recentActivity: {
          totalLogins: 0, // Would need to track this separately
        },
        banStatus: {
          isBanned: false, // Would need UserBan table integration
          banType: undefined,
          reason: undefined,
          expiresAt: undefined
        }
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
      hasPreviousPage: page > 0
    };
  }

  async getUserWithDetails(userId: number): Promise<DetailedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userBadges: {
          include: {
            badge: true
          }
        }
      }
    });

    if (!user) return null;

    const detailedUser: DetailedUser = {
      ...user,
      badges: user.userBadges?.map((ub: any) => ub.badge) || [],
      stats: {
        totalBets: 0,
        totalWagered: 0,
        totalWon: 0,
        winRate: 0
      },
      recentActivity: {
        totalLogins: 0, // Would need login tracking
      },
      banStatus: {
        isBanned: false, // Would need UserBan integration
      }
    };

    return detailedUser;
  }

  async bulkUpdateUsers(operation: BulkUserOperation): Promise<BulkOperationResult> {
    const { userIds, operation: op, params } = operation;
    const results: BulkOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      updatedUsers: []
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
            error: error instanceof Error ? error.message : 'Unknown error'
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
      sortOrder = 'desc'
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
        { description: { contains: search.trim(), mode: 'insensitive' } }
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
        whereClause.OR = whereClause.OR ? 
          [...whereClause.OR, ...statusConditions] : statusConditions;
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
              email: true
            }
          },
          bets: {
            select: {
              id: true,
              amount: true,
              userId: true
            }
          }
        }
      }),
      this.prisma.prediction.count({ where: whereClause }),
      this.getPredictionAnalytics()
    ]);

    // Transform to DetailedPrediction format with analytics
    const detailedPredictions: DetailedPrediction[] = predictions.map(prediction => {
      const bets = (prediction as any).bets || [];
      const uniqueBettors = new Set(bets.map((bet: any) => bet.userId)).size;
      const totalVolume = bets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

      return {
        ...prediction,
        analytics: {
          totalBets: bets.length,
          totalVolume,
          uniqueBettors,
          controversyScore: this.calculateControversyScore(bets),
          popularityScore: this.calculatePopularityScore(bets.length, uniqueBettors)
        },
        qualityFlags: {
          isDuplicate: false, // Would need separate logic to detect
          hasOffensiveContent: false, // Would need content moderation
          hasSuspiciousActivity: false, // Would need fraud detection
          needsReview: bets.length === 0 && this.isOlderThan(prediction.createdAt, 24) // No bets after 24h
        }
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
      analytics
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
            email: true
          }
        },
        bets: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    if (!prediction) return null;

    const bets = (prediction as any).bets || [];
    const uniqueBettors = new Set(bets.map((bet: any) => bet.userId)).size;
    const totalVolume = bets.reduce((sum: number, bet: any) => sum + bet.amount, 0);

    return {
      ...prediction,
      analytics: {
        totalBets: bets.length,
        totalVolume,
        uniqueBettors,
        controversyScore: this.calculateControversyScore(bets),
        popularityScore: this.calculatePopularityScore(bets.length, uniqueBettors)
      },
      qualityFlags: {
        isDuplicate: false,
        hasOffensiveContent: false,
        hasSuspiciousActivity: false,
        needsReview: bets.length === 0 && this.isOlderThan(prediction.createdAt, 24)
      }
    };
  }

  async bulkUpdatePredictions(operation: BulkPredictionOperation): Promise<BulkPredictionResult> {
    const { predictionIds, operation: op, params } = operation;
    const results: BulkPredictionResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      updatedPredictions: []
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
                  params.evidence
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
            const detailedPrediction = updatedPrediction ? 
              await this.getPredictionWithDetails(predictionId) : null;
            if (detailedPrediction) {
              results.updatedPredictions.push(detailedPrediction);
            }
            results.successCount++;
          }
        } catch (error) {
          results.failureCount++;
          results.errors.push({
            predictionId,
            error: error instanceof Error ? error.message : 'Unknown error'
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
    evidence?: string
  ): Promise<DetailedPrediction> {
    const resolved = await this.prisma.prediction.update({
      where: { id: predictionId },
      data: { 
        resolved: true,
        winningOptionId,
        resolvedAt: new Date()
      }
    });

    const detailed = await this.getPredictionWithDetails(predictionId);
    if (!detailed) throw new Error('Failed to fetch resolved prediction details');

    return {
      ...detailed,
      resolutionData: {
        resolvedAt: resolved.resolvedAt || new Date(),
        evidence,
        winningOptionId
      }
    };
  }

  // Helper methods for analytics
  private async getPredictionAnalytics() {
    const [totalPending, totalApproved, totalResolved, totalRejected] = await Promise.all([
      this.prisma.prediction.count({ where: { approved: false, resolved: false } }),
      this.prisma.prediction.count({ where: { approved: true, resolved: false } }),
      this.prisma.prediction.count({ where: { resolved: true } }),
      this.prisma.prediction.count({ where: { approved: false, resolved: true } })
    ]);

    return {
      totalPending,
      totalApproved,
      totalResolved,
      totalRejected,
      avgResolutionTime: 72 // Placeholder - would need actual calculation
    };
  }

  private calculateControversyScore(bets: any[]): number {
    // Simple controversy calculation based on bet distribution
    if (bets.length < 2) return 0;
    
    const optionTotals: Record<number, number> = {};
    bets.forEach(bet => {
      optionTotals[bet.optionId] = (optionTotals[bet.optionId] || 0) + bet.amount;
    });

    const values = Object.values(optionTotals);
    const total = values.reduce((sum, val) => sum + val, 0);
    const normalized = values.map(val => val / total);
    
    // Higher controversy when bets are more evenly distributed
    const entropy = -normalized.reduce((sum, p) => sum + (p * Math.log2(p)), 0);
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
    return this.prisma.bet.findMany();
  }

  async refundBet(betId: number): Promise<Bet> {
    return this.prisma.bet.update({
      where: { id: betId },
      data: { status: 'REFUNDED' },
    });
  }

  async findTransactions(_filters?: QueryParams): Promise<Transaction[]> {
    return this.prisma.transaction.findMany();
  }

  // -- Badge & Content Moderation --
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

  // -- Leaderboard & Stats --
  async recalculateLeaderboard(): Promise<void> {
    // refresh the materialized view
    await this.prisma.$executeRawUnsafe('REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_view;');
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
