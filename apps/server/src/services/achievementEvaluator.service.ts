// Achievement Evaluation Engine
// Processes domain events and awards achievements based on comprehensive catalog

import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';
import { unifiedActivityService } from './unifiedActivity.service';
import {
  AchievementRepository,
  IAchievementRepository,
} from '../repositories/AchievementRepository';
import { UserRepository, IUserRepository } from '../repositories/UserRepository';

const prisma = new PrismaClient();

// Event types that can trigger achievements
export interface AchievementEvent {
  type:
    | 'bet_placed'
    | 'bet_won'
    | 'bet_lost'
    | 'parlay_won'
    | 'parlay_lost'
    | 'prediction_created'
    | 'prediction_approved'
    | 'prediction_resolved'
    | 'chat_message_sent'
    | 'post_created'
    | 'post_upvoted'
    | 'post_commented'
    | 'leaderboard_daily_closed'
    | 'leaderboard_weekly_closed'
    | 'user_joined'
    | 'user_banned'
    | 'user_balance_snapshot'
    | 'ai_tweet_posted'
    | 'ai_tweet_replied'
    | 'streak_updated';

  userId: number;
  timestamp: string;
  data: Record<string, any>;
}

// User aggregates maintained for achievement evaluation
interface UserAggregates {
  // Betting stats
  totalBets: number;
  betsWon: number;
  betsLost: number;
  currentStreak: number;
  longestStreak: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  streakType: 'win' | 'loss' | 'none';
  lastStreakUpdate?: string;
  totalWagered: number;
  totalWon: number;
  netProfit: number;
  biggestBet: number;
  biggestWin: number;
  parlaysWon: number;

  // Social stats
  chatMessages: number;
  postsCreated: number;
  commentsPosted: number;
  upvotesReceived: number;
  repliedToAI: number;

  // Prediction stats
  predictionsCreated: number;
  predictionsApproved: number;
  predictionsWithBets: number;

  // Daily stats
  consecutiveBettingDays: number;
  lastBetDate?: string;

  // Leaderboard stats
  weeklyRank?: number;
  dailyRank?: number;
  consecutiveDaysAtRank1: number;

  // Ban history
  banCount: number;
  currentlyBanned: boolean;

  // Meta
  joinDate: string;
  lastActive: string;
}

class AchievementEvaluatorService {
  private redis = redisClient;
  private achievementRepository: IAchievementRepository;
  private userRepository: IUserRepository;

  constructor(achievementRepository?: IAchievementRepository, userRepository?: IUserRepository) {
    this.achievementRepository = achievementRepository || new AchievementRepository(prisma);
    this.userRepository = userRepository || new UserRepository();
  }

  // Redis keys for user aggregates
  private getUserAggregateKey(userId: number): string {
    return `user_aggregates:${userId}`;
  }

  // Site launch date for early-adopter achievement
  private readonly SITE_LAUNCH_DATE = process.env.SITE_LAUNCH_DATE || '2024-01-01';

  /**
   * Main entry point - evaluate event and award achievements
   */
  async processAchievementEvent(event: AchievementEvent): Promise<string[]> {
    console.log(`[achievement-evaluator] Processing ${event.type} for user ${event.userId}`);

    try {
      // Update user aggregates based on event
      await this.updateUserAggregates(event);

      // Get updated aggregates
      const aggregates = await this.getUserAggregates(event.userId);

      // Evaluate all applicable achievements
      const awardedAchievements = await this.evaluateAchievements(event.userId, event, aggregates);

      return awardedAchievements;
    } catch (error) {
      console.error(`[achievement-evaluator] Error processing event:`, error);
      return [];
    }
  }

  /**
   * Update user aggregates based on incoming event
   */
  private async updateUserAggregates(event: AchievementEvent): Promise<void> {
    const key = this.getUserAggregateKey(event.userId);
    const current = await this.getUserAggregates(event.userId);

    let updated = { ...current };

    switch (event.type) {
      case 'bet_placed':
        updated.totalBets += 1;
        updated.totalWagered += event.data.amount || 0;
        updated.biggestBet = Math.max(updated.biggestBet, event.data.amount || 0);

        // Update consecutive betting days
        const today = new Date().toISOString().split('T')[0];
        if (updated.lastBetDate !== today) {
          if (this.isConsecutiveDay(updated.lastBetDate, today)) {
            updated.consecutiveBettingDays += 1;
          } else {
            updated.consecutiveBettingDays = 1;
          }
          updated.lastBetDate = today;
        }
        break;

      case 'bet_won':
        updated.betsWon += 1;
        updated.totalWon += event.data.payout || 0;
        updated.biggestWin = Math.max(updated.biggestWin, event.data.payout || 0);

        // Enhanced streak tracking
        updated.currentStreak = updated.currentStreak >= 0 ? updated.currentStreak + 1 : 1;
        updated.longestStreak = Math.max(updated.longestStreak, Math.abs(updated.currentStreak));
        updated.longestWinStreak = Math.max(updated.longestWinStreak, updated.currentStreak);
        updated.streakType = 'win';
        updated.lastStreakUpdate = event.timestamp;
        break;

      case 'bet_lost':
        updated.betsLost += 1;

        // Enhanced streak tracking
        updated.currentStreak = updated.currentStreak <= 0 ? updated.currentStreak - 1 : -1;
        updated.longestStreak = Math.max(updated.longestStreak, Math.abs(updated.currentStreak));
        updated.longestLoseStreak = Math.max(
          updated.longestLoseStreak,
          Math.abs(updated.currentStreak),
        );
        updated.streakType = 'loss';
        updated.lastStreakUpdate = event.timestamp;
        break;

      case 'parlay_won':
        updated.parlaysWon += 1;
        break;

      case 'chat_message_sent':
        updated.chatMessages += 1;
        break;

      case 'post_created':
        updated.postsCreated += 1;
        break;

      case 'post_commented':
        updated.commentsPosted += 1;
        break;

      case 'post_upvoted':
        // This would be called when a user's post receives upvotes
        updated.upvotesReceived += event.data.voteCount || 1;
        break;

      case 'prediction_created':
        updated.predictionsCreated += 1;
        break;

      case 'prediction_approved':
        updated.predictionsApproved += 1;
        break;

      case 'ai_tweet_replied':
        updated.repliedToAI += 1;
        break;

      case 'user_banned':
        updated.banCount += 1;
        updated.currentlyBanned = true;
        break;

      case 'leaderboard_weekly_closed':
        updated.weeklyRank = event.data.rank;
        if (event.data.rank === 1) {
          updated.consecutiveDaysAtRank1 += 7;
        } else {
          updated.consecutiveDaysAtRank1 = 0;
        }
        break;

      case 'streak_updated':
        // Update streak data from external source (like payout resolution)
        if (typeof event.data.currentStreak === 'number') {
          updated.currentStreak = event.data.currentStreak;
        }
        if (typeof event.data.longestStreak === 'number') {
          updated.longestStreak = event.data.longestStreak;
        }
        break;
    }

    // Calculate net profit
    updated.netProfit = updated.totalWon - updated.totalWagered;
    updated.lastActive = event.timestamp;

    // Store updated aggregates
    await this.redis.set(key, JSON.stringify(updated), 'EX', 86400 * 7); // 7 day TTL
  }

  /**
   * Get user aggregates from Redis or initialize defaults
   */
  private async getUserAggregates(userId: number): Promise<UserAggregates> {
    const key = this.getUserAggregateKey(userId);
    const cached = await this.redis.get(key);

    if (cached) {
      return JSON.parse(cached);
    }

    // Initialize from database if not cached
    const user = await this.userRepository.findById(userId);
    const stats = await this.userRepository.getUserStats(userId);

    const defaults: UserAggregates = {
      totalBets: stats?.totalBets || 0,
      betsWon: stats?.betsWon || 0,
      betsLost: stats?.betsLost || 0,
      currentStreak: stats?.currentStreak || 0,
      longestStreak: stats?.longestStreak || 0,
      longestWinStreak: stats?.longestStreak && stats.currentStreak > 0 ? stats.longestStreak : 0,
      longestLoseStreak:
        stats?.longestStreak && stats.currentStreak < 0 ? Math.abs(stats.longestStreak) : 0,
      streakType: stats?.currentStreak ? (stats.currentStreak > 0 ? 'win' : 'loss') : 'none',
      lastStreakUpdate: undefined,
      totalWagered: Number(stats?.totalWagered || 0),
      totalWon: Number(stats?.totalWon || 0),
      netProfit: Number(stats?.profit || 0),
      biggestBet: 0,
      biggestWin: Number(stats?.biggestWin || 0),
      parlaysWon: stats?.parlaysWon || 0,
      chatMessages: 0,
      postsCreated: 0,
      commentsPosted: 0,
      upvotesReceived: 0,
      repliedToAI: 0,
      predictionsCreated: 0,
      predictionsApproved: 0,
      predictionsWithBets: 0,
      consecutiveBettingDays: 0,
      consecutiveDaysAtRank1: 0,
      banCount: 0,
      currentlyBanned: false,
      joinDate: user?.createdAt.toISOString() || new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };

    await this.redis.set(key, JSON.stringify(defaults), 'EX', 86400 * 7);
    return defaults;
  }

  /**
   * Evaluate all achievements for a user based on event and aggregates
   */
  private async evaluateAchievements(
    userId: number,
    event: AchievementEvent,
    aggregates: UserAggregates,
  ): Promise<string[]> {
    const awarded: string[] = [];

    // Get all auto-award achievements that user doesn't have yet
    const achievements = await this.achievementRepository.findMany({
      where: {
        autoAward: true,
        isActive: true,
        NOT: {
          userProgress: {
            some: {
              userId,
              completedAt: { not: null },
            },
          },
        },
      },
    });

    for (const achievement of achievements) {
      const shouldAward = await this.checkAchievementCriteria(achievement.slug!, event, aggregates);

      if (shouldAward) {
        await this.awardAchievement(userId, achievement.slug!, {
          trigger: event.type,
          eventData: event.data,
        });
        awarded.push(achievement.slug!);
      }
    }

    return awarded;
  }

  /**
   * Check if specific achievement criteria are met
   */
  private async checkAchievementCriteria(
    slug: string,
    event: AchievementEvent,
    aggregates: UserAggregates,
  ): Promise<boolean> {
    switch (slug) {
      // === BETTING ACHIEVEMENTS ===
      case 'muskbucks-millionaire':
        return aggregates.netProfit >= 1000000;

      case 'big-spender':
        return event.type === 'bet_placed' && event.data.amount >= 100000;

      case 'yolo-all-in':
        return event.type === 'bet_won' && event.data.wasAllIn === true;

      case 'paper-hands':
        return (
          (Math.abs(aggregates.currentStreak) >= 5 && aggregates.currentStreak < 0) ||
          aggregates.longestLoseStreak >= 5
        );

      case 'diamond-hands':
        return aggregates.currentStreak >= 10 || aggregates.longestWinStreak >= 10;

      case 'parlay-prodigy':
        return event.type === 'parlay_won' && event.data.legCount >= 3;

      case 'the-long-shot':
        return event.type === 'bet_won' && event.data.odds > 10; // >10x = <10% implied

      case 'bankrupt-billionaire':
        return event.type === 'user_balance_snapshot' && event.data.balance === 0;

      case 'rags-to-riches':
        return (
          event.type === 'user_balance_snapshot' &&
          event.data.previousBalance < 100 &&
          event.data.balance >= 50000
        );

      // === LEADERBOARD ACHIEVEMENTS ===
      case 'high-roller':
        return aggregates.consecutiveDaysAtRank1 >= 7;

      case 'chief-musk-whisperer':
        return event.type === 'leaderboard_weekly_closed' && event.data.rank === 1;

      case 'rocket-fumbler':
        return (
          event.type === 'leaderboard_weekly_closed' &&
          event.data.rank === event.data.totalActiveUsers
        );

      case 'whale-of-wall-street':
        return (
          event.type === 'leaderboard_daily_closed' &&
          event.data.rank === 1 &&
          event.data.category === 'daily_profit'
        );

      case 'clown-of-the-week':
        return event.type === 'leaderboard_weekly_closed' && event.data.biggestLoser === true;

      // === PREDICTION ACHIEVEMENTS ===
      case 'prophet-of-mars':
        return event.type === 'prediction_resolved' && event.data.betCount >= 100;

      case 'chaos-agent':
        return aggregates.predictionsApproved >= 10;

      case 'cursed-predictor':
        return (
          event.type === 'prediction_resolved' &&
          event.data.creatorId === event.userId &&
          aggregates.predictionsWithBets >= 5
        ); // Would need more complex tracking

      case 'musk-whisperer':
        return (
          event.type === 'prediction_resolved' &&
          event.data.category?.toLowerCase().includes('elon') &&
          event.data.resolvedWithin24h === true
        );

      // === CHAT & SOCIAL ACHIEVEMENTS ===
      case 'keyboard-warrior':
        return aggregates.chatMessages >= 1000;

      case 'chief-shitposter':
        return event.type === 'post_upvoted' && event.data.totalUpvotes >= 50;

      case 'reply-guy':
        return aggregates.commentsPosted >= 50;

      case 'community-meme-lord':
        return (
          event.type === 'post_upvoted' &&
          event.data.totalUpvotes >= 100 &&
          event.data.postType === 'meme'
        );

      case 'elon-reply-intern':
        return event.type === 'ai_tweet_replied' && event.data.wasFirst === true;

      case 'free-speech-absolutist':
        return event.type === 'chat_message_sent' && event.data.threadMessageCount >= 100;

      // === PARTICIPATION ACHIEVEMENTS ===
      case 'consistent-gambler':
        return aggregates.consecutiveBettingDays >= 30;

      case 'late-stage-capitalist':
        return aggregates.totalWon >= 5000000;

      case 'early-adopter':
        const daysSinceLaunch = Math.floor(
          (new Date(aggregates.joinDate).getTime() - new Date(this.SITE_LAUNCH_DATE).getTime()) /
            (1000 * 60 * 60 * 24),
        );
        return daysSinceLaunch <= 30;

      case 'conspiracy-theorist':
        return aggregates.totalBets >= 50; // Simplified - betting on 50+ different predictions

      case 'ultimate-degenerate':
        return aggregates.totalBets >= 500;

      // === EVENT-BASED ACHIEVEMENTS ===
      case 'dogefather-believer':
        return (
          event.type === 'prediction_resolved' &&
          event.data.category?.toLowerCase().includes('doge') &&
          event.data.userWon === true
        );

      case 'mars-colony-ceo':
        return (
          event.type === 'prediction_resolved' &&
          event.data.category?.toLowerCase().includes('mars') &&
          event.data.userWon === true
        );

      case 'tesla-stonk-hodler':
        return (
          event.type === 'prediction_resolved' &&
          event.data.category?.toLowerCase().includes('tsla') &&
          event.data.userWon === true
        );

      case 'xtreme-x-user':
        // Would need to track consecutive wins in X/Twitter category
        return (
          event.type === 'bet_won' &&
          event.data.category?.toLowerCase().includes('twitter') &&
          event.data.consecutiveXWins >= 10
        );

      // === SHAME ACHIEVEMENTS ===
      case 'perma-banned-legend':
        return event.type === 'user_banned' && event.data.banType === 'PERMANENT';

      case 'one-week-timeout':
        return event.type === 'user_banned' && event.data.durationDays === 7;

      case 'community-menace':
        return aggregates.banCount >= 3;

      // === STREAK ACHIEVEMENTS ===
      case 'billionaire-on-paper':
        return aggregates.netProfit >= 1000000000;

      case 'daily-visit-streak':
        // This would need to be triggered by login tracking
        return event.type === 'user_joined' && event.data.consecutiveLoginDays >= 7;

      case 'hot-streak':
        return (
          (aggregates.currentStreak >= 5 && aggregates.currentStreak < 10) ||
          (aggregates.longestWinStreak >= 5 && aggregates.longestWinStreak < 10)
        );

      case 'legendary-streak':
        return aggregates.currentStreak >= 20 || aggregates.longestWinStreak >= 20;

      case 'comeback-king':
        // Triggered when someone recovers from a losing streak
        return (
          event.type === 'bet_won' &&
          event.data.previousStreak <= -5 &&
          aggregates.currentStreak >= 1
        );

      default:
        return false;
    }
  }

  /**
   * Award achievement to user (idempotent)
   */
  async awardAchievement(
    userId: number,
    slug: string,
    _meta?: Record<string, any>,
  ): Promise<boolean> {
    try {
      // Get achievement by slug
      const achievement = await this.achievementRepository.findBySlug(slug);

      if (!achievement) {
        console.warn(`[achievement-evaluator] Achievement not found: ${slug}`);
        return false;
      }

      // Attempt to create user achievement (will fail if already exists due to unique constraint)
      await this.achievementRepository.updateUserAchievement({
        where: {
          userId_achievementId: {
            userId,
            achievementId: achievement.id,
          },
        },
        create: {
          userId,
          achievementId: achievement.id,
          progress: achievement.targetValue,
          completedAt: new Date(),
        },
        update: {
          progress: achievement.targetValue,
          completedAt: new Date(),
        },
      });

      // Get user info for activity
      const user = await this.userRepository.findById(userId);

      if (user) {
        // Create activity event
        await unifiedActivityService.createAchievementActivity(
          {
            id: user.id,
            name: user.name,
            avatarUrl: user.avatarUrl,
          },
          {
            id: achievement.id,
            name: achievement.name,
            description: achievement.description,
          },
        );
      }

      console.log(`[achievement-evaluator] Awarded "${achievement.title}" to user ${userId}`);
      return true;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Unique constraint')) {
        // Already has achievement - not an error
        return false;
      }
      console.error(`[achievement-evaluator] Error awarding achievement:`, error);
      return false;
    }
  }

  /**
   * Helper: Check if two dates are consecutive days
   */
  private isConsecutiveDay(lastDate?: string, currentDate?: string): boolean {
    if (!lastDate || !currentDate) return false;

    const last = new Date(lastDate);
    const current = new Date(currentDate);
    const diffTime = current.getTime() - last.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays === 1;
  }
}

export const achievementEvaluatorService = new AchievementEvaluatorService();
