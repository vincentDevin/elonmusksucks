import { PrismaClient } from '@prisma/client';
import { eventBus } from './eventBus.service';
import type { IEventBus } from '@ems/types';

const prisma = new PrismaClient();

/**
 * FinancialTracker Service
 *
 * Tracks financial milestones and scenarios for achievements like:
 * - "Rags to Riches" - Go from <1000 to >1M balance
 * - "Bankrupt Billionaire" - Go from 1B to 0
 * - "Burnt a Billion" - Lose 1B+ lifetime
 * - "Comeback King" - Recover from -90% to profit
 * - Balance milestones (1M, 1B, etc.)
 */
export class FinancialTracker {
  constructor(private eventBus: IEventBus) {}

  /**
   * Check balance milestones when user balance changes
   * @param userId - User ID
   * @param oldBalance - Previous balance
   * @param newBalance - New balance
   */
  async checkBalanceMilestone(
    userId: number,
    oldBalance: bigint,
    newBalance: bigint,
  ): Promise<void> {
    const milestones = [
      { threshold: BigInt(100000), name: '100k', displayName: '100K' }, // 100K
      { threshold: BigInt(1000000), name: '1m', displayName: '1M' }, // 1M
      { threshold: BigInt(10000000), name: '10m', displayName: '10M' }, // 10M
      { threshold: BigInt(100000000), name: '100m', displayName: '100M' }, // 100M
      { threshold: BigInt(1000000000), name: '1b', displayName: '1B' }, // 1B
      { threshold: BigInt(10000000000), name: '10b', displayName: '10B' }, // 10B
    ];

    for (const milestone of milestones) {
      // Check if user crossed this milestone (upward)
      if (oldBalance < milestone.threshold && newBalance >= milestone.threshold) {
        await this.eventBus.publish('balance:milestone:reached', {
          key: 'balance:milestone:reached',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `balance:milestone:${userId}:${milestone.name}:${Date.now()}`,
          payload: {
            milestone: milestone.name,
            milestoneDisplay: milestone.displayName,
            threshold: milestone.threshold.toString(),
            newBalance: newBalance.toString(),
            oldBalance: oldBalance.toString(),
            direction: 'reached',
          },
        });

        console.log(
          `[financial] User ${userId} reached ${milestone.displayName} balance milestone`,
        );
      }
    }

    // Check for bankruptcy (balance = 0 from positive amount)
    if (oldBalance > 0 && newBalance === BigInt(0)) {
      await this.eventBus.publish('bankruptcy:detected', {
        key: 'bankruptcy:detected',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `bankruptcy:${userId}:${Date.now()}`,
        payload: {
          lostAmount: oldBalance.toString(),
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`[financial] User ${userId} went bankrupt, lost ${oldBalance.toString()}`);
    }

    // Check for rags to riches (< 1000 to > 1M)
    if (oldBalance < BigInt(1000) && newBalance > BigInt(1000000)) {
      await this.eventBus.publish('rags:to:riches', {
        key: 'rags:to:riches',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `rags:to:riches:${userId}:${Date.now()}`,
        payload: {
          startBalance: oldBalance.toString(),
          endBalance: newBalance.toString(),
          multiplier: Number(newBalance / BigInt(Math.max(Number(oldBalance), 1))),
        },
      });

      console.log(
        `[financial] User ${userId} achieved rags to riches: ${oldBalance} -> ${newBalance}`,
      );
    }
  }

  /**
   * Track profit/loss changes and detect scenarios
   * @param userId - User ID
   * @param profitChange - Change in profit (can be negative for losses)
   */
  async trackProfitLoss(userId: number, profitChange: bigint): Promise<void> {
    try {
      // Get user's current stats
      const userStats = await prisma.userStats.findUnique({
        where: { userId },
      });

      if (!userStats) return;

      const currentProfit = userStats.profit;
      const newProfit = currentProfit + profitChange;

      // Check for massive loss milestones
      const lossAmount = profitChange < 0 ? -profitChange : BigInt(0);

      if (lossAmount >= BigInt(1000000000)) {
        // Lost 1B+
        await this.eventBus.publish('massive:loss:detected', {
          key: 'massive:loss:detected',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `massive:loss:${userId}:${lossAmount.toString()}:${Date.now()}`,
          payload: {
            lossAmount: lossAmount.toString(),
            oldProfit: currentProfit.toString(),
            newProfit: newProfit.toString(),
            milestone: lossAmount >= BigInt(10000000000) ? '10b_loss' : '1b_loss',
          },
        });

        console.log(
          `[financial] User ${userId} lost ${lossAmount.toString()} in single transaction`,
        );
      }

      // Check for massive gain milestones
      if (profitChange >= BigInt(1000000000)) {
        // Gained 1B+
        await this.eventBus.publish('massive:gain:detected', {
          key: 'massive:gain:detected',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `massive:gain:${userId}:${profitChange.toString()}:${Date.now()}`,
          payload: {
            gainAmount: profitChange.toString(),
            oldProfit: currentProfit.toString(),
            newProfit: newProfit.toString(),
            milestone: profitChange >= BigInt(10000000000) ? '10b_gain' : '1b_gain',
          },
        });

        console.log(
          `[financial] User ${userId} gained ${profitChange.toString()} in single transaction`,
        );
      }
    } catch (error) {
      console.error('[financial] Error tracking profit/loss:', error);
    }
  }

  /**
   * Detect comeback scenarios using Transaction history (more accurate than UserActivity)
   * @param userId - User ID
   * @returns Promise<boolean> - True if comeback scenario detected
   */
  async detectComebackScenario(userId: number): Promise<boolean> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          stats: true,
        },
      });

      if (!user?.stats) return false;

      const currentBalance = user.muskBucks;

      // Get user's transaction history to track actual balance changes
      const transactions = await prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 500, // Last 500 transactions should cover significant history
      });

      if (transactions.length < 20) return false; // Need sufficient transaction history

      // Find the minimum balance point in their history
      let minBalance = Number(currentBalance);
      let maxBalance = Number(currentBalance);

      for (const transaction of transactions) {
        const balanceAtTime = Number(transaction.balanceAfter);
        minBalance = Math.min(minBalance, balanceAtTime);
        maxBalance = Math.max(maxBalance, balanceAtTime);
      }

      // Check for comeback: hit very low point, then recovered significantly
      const recoveryRatio = Number(currentBalance) / Math.max(minBalance, 1);
      const isAtLowPoint = minBalance <= maxBalance * 0.1; // Was down to 10% or less of peak
      const hasRecovered = recoveryRatio >= 10; // Now 10x higher than lowest point
      const isProfitable = user.stats.profit > 0;

      if (isAtLowPoint && hasRecovered && isProfitable) {
        await this.eventBus.publish('comeback:detected', {
          key: 'comeback:detected',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `comeback:${userId}:${Date.now()}`,
          payload: {
            minBalance: minBalance.toString(),
            maxBalance: maxBalance.toString(),
            currentBalance: currentBalance.toString(),
            recoveryMultiplier: recoveryRatio,
            currentProfit: user.stats.profit.toString(),
            scenario: 'major_comeback',
            transactionCount: transactions.length,
          },
        });

        console.log(
          `[financial] User ${userId} achieved major comeback: ${minBalance} -> ${Number(currentBalance)} (${recoveryRatio.toFixed(2)}x)`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error('[financial] Error detecting comeback scenario:', error);
      return false;
    }
  }

  /**
   * Process transaction for financial tracking (call this when transactions are created)
   * @param userId - User ID
   * @param transaction - Transaction data
   */
  async processTransaction(
    userId: number,
    transaction: {
      type: 'DEBIT' | 'CREDIT';
      amount: bigint;
      balanceAfter: bigint;
      relatedBetId?: number;
      relatedParlayId?: number;
    },
  ): Promise<void> {
    try {
      // Calculate balance before this transaction
      const balanceBefore =
        transaction.type === 'DEBIT'
          ? transaction.balanceAfter + transaction.amount
          : transaction.balanceAfter - transaction.amount;

      // Check for balance milestones on credits (winnings)
      if (transaction.type === 'CREDIT') {
        await this.checkBalanceMilestone(userId, balanceBefore, transaction.balanceAfter);
      }

      // Track profit/loss changes
      if (transaction.relatedBetId || transaction.relatedParlayId) {
        const profitChange =
          transaction.type === 'CREDIT'
            ? transaction.amount // Winning = profit
            : -transaction.amount; // Losing = negative profit

        await this.trackProfitLoss(userId, profitChange);
      }

      // Check for bankruptcy (balance = 0 after debit)
      if (
        transaction.type === 'DEBIT' &&
        transaction.balanceAfter === BigInt(0) &&
        balanceBefore > 0
      ) {
        await this.eventBus.publish('bankruptcy:detected', {
          key: 'bankruptcy:detected',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `bankruptcy:${userId}:${Date.now()}`,
          payload: {
            lostAmount: balanceBefore.toString(),
            finalTransaction: {
              type: transaction.type,
              amount: transaction.amount.toString(),
            },
          },
        });
      }

      // Check for rags to riches on large balance increases
      if (
        transaction.type === 'CREDIT' &&
        balanceBefore < BigInt(1000) &&
        transaction.balanceAfter > BigInt(1000000)
      ) {
        await this.eventBus.publish('rags:to:riches', {
          key: 'rags:to:riches',
          userId,
          occurredAt: new Date().toISOString(),
          idempotencyKey: `rags:to:riches:${userId}:${Date.now()}`,
          payload: {
            startBalance: balanceBefore.toString(),
            endBalance: transaction.balanceAfter.toString(),
            winningAmount: transaction.amount.toString(),
            multiplier: Number(
              transaction.balanceAfter / BigInt(Math.max(Number(balanceBefore), 1)),
            ),
          },
        });
      }
    } catch (error) {
      console.error('[financial] Error processing transaction:', error);
    }
  }

  /**
   * Create daily profit/loss snapshot for trending analysis
   * @param userId - User ID
   */
  async createDailySnapshot(userId: number): Promise<void> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          stats: true,
        },
      });

      if (!user?.stats) return;

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      await this.eventBus.publish('profit:snapshot:daily', {
        key: 'profit:snapshot:daily',
        userId,
        occurredAt: new Date().toISOString(),
        idempotencyKey: `profit:snapshot:${userId}:${today}`,
        payload: {
          balance: user.muskBucks.toString(),
          profit: user.stats.profit.toString(),
          totalWagered: user.stats.totalWagered.toString(),
          winRate: user.stats.winRate,
          roi: user.stats.roi,
          date: today,
          totalBets: user.stats.totalBets,
        },
      });
    } catch (error) {
      console.error('[financial] Error creating daily snapshot:', error);
    }
  }

  /**
   * Analyze user's financial health and risk profile
   * @param userId - User ID
   * @returns Promise<object> - Financial analysis
   */
  async analyzeFinancialHealth(userId: number): Promise<{
    riskLevel: 'low' | 'medium' | 'high' | 'extreme';
    trend: 'improving' | 'stable' | 'declining';
    warnings: string[];
    achievements: string[];
  }> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          stats: true,
        },
      });

      if (!user?.stats) {
        return {
          riskLevel: 'low',
          trend: 'stable',
          warnings: [],
          achievements: [],
        };
      }

      const balance = Number(user.muskBucks);
      const profit = Number(user.stats.profit);
      const totalWagered = Number(user.stats.totalWagered);
      const winRate = user.stats.winRate;
      const roi = user.stats.roi;

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' | 'extreme' = 'low';
      if (balance < 1000 && totalWagered > 10000) riskLevel = 'extreme';
      else if (profit < -totalWagered * 0.5) riskLevel = 'high';
      else if (winRate < 0.3) riskLevel = 'medium';

      // Determine trend
      const trend =
        profit > 0 ? 'improving' : profit < -totalWagered * 0.1 ? 'declining' : 'stable';

      // Generate warnings
      const warnings = [];
      if (riskLevel === 'extreme')
        warnings.push('Critical: Low balance with high wagering history');
      if (winRate < 0.25) warnings.push('Low win rate - consider adjusting strategy');
      if (roi < -0.5) warnings.push('Significant losses - take a break');

      // Potential achievements
      const achievements = [];
      if (balance > 1000000) achievements.push('Millionaire status');
      if (winRate > 0.7) achievements.push('High win rate expert');
      if (roi > 2.0) achievements.push('Investment genius');

      return {
        riskLevel,
        trend,
        warnings,
        achievements,
      };
    } catch (error) {
      console.error('[financial] Error analyzing financial health:', error);
      return {
        riskLevel: 'low',
        trend: 'stable',
        warnings: ['Analysis error'],
        achievements: [],
      };
    }
  }
}

// Export singleton instance for dependency injection
export const financialTracker = new FinancialTracker(eventBus);
