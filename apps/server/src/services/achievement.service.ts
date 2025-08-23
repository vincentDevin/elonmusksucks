import { PrismaClient } from '@prisma/client';
import { StatisticsEventEmitter } from '../handlers/statisticsSocketHandlers';
import { unifiedActivityService } from './unifiedActivity.service';
import { bettingStatsService } from './bettingStats.service';
import { socialStatsService } from './socialStats.service';
import { AchievementRepository } from '../repositories/AchievementRepository';

export interface AchievementTrigger {
  type:
    | 'bet_placed'
    | 'bet_won'
    | 'bet_lost'
    | 'parlay_completed'
    | 'prediction_created'
    | 'user_followed'
    | 'streak_updated'
    | 'accuracy_updated'
    | 'volume_updated'
    | 'profit_updated'
    | 'ranking_updated';
  userId: number;
  data: Record<string, any>;
}

export interface AchievementProgress {
  id: string; // Changed to string for frontend compatibility
  achievementId: number;
  name: string;
  title: string;
  description: string;
  category: string;
  progress: number;
  targetValue: number;
  isCompleted: boolean;
  completedAt?: string;
}

export interface Achievement {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  iconUrl?: string;
  isActive: boolean;
  sortOrder: number;
}

export class AchievementService {
  private prisma: PrismaClient;
  private achievementRepository: AchievementRepository;

  constructor() {
    this.prisma = new PrismaClient();
    this.achievementRepository = new AchievementRepository(this.prisma);
  }

  /**
   * Main entry point for achievement checking
   */
  async checkAndUpdateAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const unlockedAchievements: Achievement[] = [];

    try {
      console.log(`[achievement] Processing trigger: ${trigger.type} for user ${trigger.userId}`);

      // Process different trigger types
      switch (trigger.type) {
        case 'bet_placed':
          unlockedAchievements.push(...(await this.checkBettingAchievements(trigger)));
          break;
        case 'bet_won':
          unlockedAchievements.push(...(await this.checkWinAchievements(trigger)));
          break;
        case 'parlay_completed':
          unlockedAchievements.push(...(await this.checkParlayAchievements(trigger)));
          break;
        case 'prediction_created':
          unlockedAchievements.push(...(await this.checkPredictionAchievements(trigger)));
          break;
        case 'user_followed':
          unlockedAchievements.push(...(await this.checkSocialAchievements(trigger)));
          break;
        case 'streak_updated':
          unlockedAchievements.push(...(await this.checkStreakAchievements(trigger)));
          break;
        case 'volume_updated':
          unlockedAchievements.push(...(await this.checkVolumeAchievements(trigger)));
          break;
        case 'profit_updated':
          unlockedAchievements.push(...(await this.checkProfitAchievements(trigger)));
          break;
        case 'ranking_updated':
          unlockedAchievements.push(...(await this.checkRankingAchievements(trigger)));
          break;
      }

      // Emit notifications for newly unlocked achievements
      for (const achievement of unlockedAchievements) {
        await this.notifyAchievementUnlocked(trigger.userId, achievement);
      }

      return unlockedAchievements;
    } catch (error) {
      console.error('[achievement] Error processing trigger:', error);
      return [];
    }
  }

  /**
   * Get user's achievement progress
   */
  async getUserAchievementProgress(userId: number): Promise<AchievementProgress[]> {
    const userAchievements = await this.prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true,
      },
      orderBy: [{ achievement: { category: 'asc' } }, { achievement: { sortOrder: 'asc' } }],
    });

    return userAchievements.map((ua) => ({
      id: ua.achievement.name, // Use achievement name as string ID for frontend compatibility
      achievementId: ua.achievementId,
      name: ua.achievement.name,
      title: ua.achievement.title,
      description: ua.achievement.description,
      category: ua.achievement.category,
      progress: ua.progress,
      targetValue: ua.achievement.targetValue,
      isCompleted: !!ua.completedAt,
      completedAt: ua.completedAt?.toISOString(),
    }));
  }

  /**
   * Get all available achievements
   */
  async getAllAchievements(): Promise<Achievement[]> {
    const achievements = await this.prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    });

    return achievements.map((a) => ({
      id: a.id,
      name: a.name,
      title: a.title,
      description: a.description,
      category: a.category,
      targetValue: a.targetValue,
      iconUrl: a.iconUrl || undefined,
      isActive: a.isActive,
      sortOrder: a.sortOrder,
    }));
  }

  /**
   * Initialize user achievements (called when user signs up)
   */
  async initializeUserAchievements(userId: number): Promise<void> {
    const achievements = await this.getAllAchievements();

    const userAchievements = achievements.map((achievement) => ({
      userId,
      achievementId: achievement.id,
      progress: 0,
    }));

    await this.prisma.userAchievement.createMany({
      data: userAchievements,
      skipDuplicates: true,
    });

    // Check for immediate achievements (like early_adopter)
    await this.checkAndUpdateAchievements({
      type: 'user_followed', // Use as general trigger
      userId,
      data: { action: 'signup' },
    });
  }

  /**
   * Update achievement progress
   */
  private async updateProgress(
    userId: number,
    achievementName: string,
    newProgress: number,
  ): Promise<Achievement | null> {
    const achievement = await this.prisma.achievement.findUnique({
      where: { name: achievementName },
    });

    if (!achievement) return null;

    const userAchievement = await this.achievementRepository.updateUserAchievement({
      where: {
        userId_achievementId: {
          userId,
          achievementId: achievement.id,
        },
      },
      update: {
        progress: Math.max(newProgress, 0), // Ensure progress doesn't go negative
        completedAt: newProgress >= achievement.targetValue ? new Date() : undefined,
      },
      create: {
        userId,
        achievementId: achievement.id,
        progress: Math.max(newProgress, 0),
        completedAt: newProgress >= achievement.targetValue ? new Date() : undefined,
      },
    });

    // Return achievement if it was just completed
    if (newProgress >= achievement.targetValue && !userAchievement.completedAt) {
      return {
        id: achievement.id,
        name: achievement.name,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        targetValue: achievement.targetValue,
        iconUrl: achievement.iconUrl || undefined,
        isActive: achievement.isActive,
        sortOrder: achievement.sortOrder,
      };
    }

    return null;
  }

  /**
   * Check betting-related achievements
   */
  private async checkBettingAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    // First bet achievement
    const firstBet = await this.updateProgress(userId, 'first_bet', 1);
    if (firstBet) achievements.push(firstBet);

    // Get user's total bet count
    const totalBets = await this.getUserTotalBets(userId);

    // Volume achievements
    const consistentTrader = await this.updateProgress(userId, 'consistent_trader', totalBets);
    if (consistentTrader) achievements.push(consistentTrader);

    const bettingMachine = await this.updateProgress(userId, 'betting_machine', totalBets);
    if (bettingMachine) achievements.push(bettingMachine);

    // Single bet volume achievements
    if (data.amount) {
      const whale = await this.updateProgress(userId, 'whale', data.amount >= 5000 ? 1 : 0);
      if (whale) achievements.push(whale);
    }

    return achievements;
  }

  /**
   * Check win-related achievements
   */
  private async checkWinAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    // First win achievement
    const firstWin = await this.updateProgress(userId, 'first_win', 1);
    if (firstWin) achievements.push(firstWin);

    // Category expertise achievements
    if (data.category) {
      const categoryWins = await this.getCategoryWins(userId, data.category);
      const categoryAchievements = {
        Sports: 'sports_expert',
        Politics: 'politics_expert',
        Technology: 'tech_expert',
        Entertainment: 'entertainment_expert',
      };

      const achievementName =
        categoryAchievements[data.category as keyof typeof categoryAchievements];
      if (achievementName) {
        const expertAchievement = await this.updateProgress(userId, achievementName, categoryWins);
        if (expertAchievement) achievements.push(expertAchievement);
      }
    }

    return achievements;
  }

  /**
   * Check streak achievements
   */
  private async checkStreakAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    if (data.streakCount && data.streakType === 'win') {
      const streakCount = data.streakCount;

      const streakStarter = await this.updateProgress(
        userId,
        'streak_starter',
        streakCount >= 3 ? 1 : 0,
      );
      if (streakStarter) achievements.push(streakStarter);

      const streakMaster = await this.updateProgress(
        userId,
        'streak_master',
        streakCount >= 10 ? 1 : 0,
      );
      if (streakMaster) achievements.push(streakMaster);

      const streakLegend = await this.updateProgress(
        userId,
        'streak_legend',
        streakCount >= 25 ? 1 : 0,
      );
      if (streakLegend) achievements.push(streakLegend);
    }

    return achievements;
  }

  /**
   * Check volume achievements
   */
  private async checkVolumeAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    if (data.totalWagered) {
      const totalWagered = data.totalWagered;

      const smallSpender = await this.updateProgress(
        userId,
        'small_spender',
        totalWagered >= 1000 ? 1 : 0,
      );
      if (smallSpender) achievements.push(smallSpender);

      const bigSpender = await this.updateProgress(
        userId,
        'big_spender',
        totalWagered >= 10000 ? 1 : 0,
      );
      if (bigSpender) achievements.push(bigSpender);

      const highRoller = await this.updateProgress(
        userId,
        'high_roller',
        totalWagered >= 50000 ? 1 : 0,
      );
      if (highRoller) achievements.push(highRoller);
    }

    return achievements;
  }

  /**
   * Check profit achievements
   */
  private async checkProfitAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    if (data.profit && data.profit >= 10000) {
      const profitMaker = await this.updateProgress(userId, 'profit_maker', 1);
      if (profitMaker) achievements.push(profitMaker);
    }

    return achievements;
  }

  /**
   * Check parlay achievements
   */
  private async checkParlayAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    // First parlay
    const parlayStarter = await this.updateProgress(userId, 'parlay_starter', 1);
    if (parlayStarter) achievements.push(parlayStarter);

    // Parlay wins
    if (data.won) {
      const parlayWins = await this.getUserParlayWins(userId);
      const parlayMaster = await this.updateProgress(userId, 'parlay_master', parlayWins);
      if (parlayMaster) achievements.push(parlayMaster);

      // Lucky seven (7-leg parlay win)
      if (data.legCount >= 7) {
        const luckySeven = await this.updateProgress(userId, 'lucky_seven', 1);
        if (luckySeven) achievements.push(luckySeven);
      }
    }

    return achievements;
  }

  /**
   * Check social achievements
   */
  private async checkSocialAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId } = trigger;

    // Following count
    const followingCount = await this.getUserFollowingCount(userId);
    const socialButterfly = await this.updateProgress(userId, 'social_butterfly', followingCount);
    if (socialButterfly) achievements.push(socialButterfly);

    // Followers count
    const followersCount = await this.getUserFollowersCount(userId);
    const popularPredictor = await this.updateProgress(userId, 'popular_predictor', followersCount);
    if (popularPredictor) achievements.push(popularPredictor);

    return achievements;
  }

  /**
   * Check prediction creation achievements
   */
  private async checkPredictionAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId } = trigger;

    const predictionCount = await this.getUserPredictionCount(userId);
    const communityLeader = await this.updateProgress(userId, 'community_leader', predictionCount);
    if (communityLeader) achievements.push(communityLeader);

    return achievements;
  }

  /**
   * Check ranking achievements
   */
  private async checkRankingAchievements(trigger: AchievementTrigger): Promise<Achievement[]> {
    const achievements: Achievement[] = [];
    const { userId, data } = trigger;

    if (data.rank && data.rank <= 100) {
      const leaderboardClimber = await this.updateProgress(userId, 'leaderboard_climber', 1);
      if (leaderboardClimber) achievements.push(leaderboardClimber);
    }

    return achievements;
  }

  /**
   * Notify achievement unlocked
   */
  private async notifyAchievementUnlocked(userId: number, achievement: Achievement): Promise<void> {
    try {
      // Emit Socket.IO event
      await StatisticsEventEmitter.emitAchievementUnlocked(
        userId,
        {
          id: achievement.name,
          title: achievement.title,
          description: achievement.description,
          category: achievement.category,
        },
        {
          previous: achievement.targetValue - 1,
          current: achievement.targetValue,
          target: achievement.targetValue,
        },
      );

      // Publish achievement activity through unified system
      await unifiedActivityService.publishActivity({
        type: 'achievement_unlocked',
        userId,
        userName: (await this.prisma.user.findUnique({ where: { id: userId } }))?.name || 'Someone',
        title: `Achievement unlocked: ${achievement.title}`,
        description: achievement.description,
        icon: '🏅',
        color: 'text-yellow-500',
        priority: 'high',
        category: achievement.category,
        isPersonal: false, // Achievement unlocks are public
        isHighValue: true, // Achievements are high-value activities
        meta: {
          achievementId: achievement.name,
          achievementTitle: achievement.title,
        },
      });

      console.log(`[achievement] Achievement unlocked for user ${userId}: ${achievement.title}`);
    } catch (error) {
      console.error('[achievement] Error notifying achievement unlock:', error);
    }
  }

  // Helper methods for data retrieval
  private async getUserTotalBets(userId: number): Promise<number> {
    return bettingStatsService.getUserTotalBets(userId);
  }

  private async getCategoryWins(userId: number, category: string): Promise<number> {
    return bettingStatsService.getCategoryWins(userId, category);
  }

  private async getUserParlayWins(userId: number): Promise<number> {
    return bettingStatsService.getUserParlayWins(userId);
  }

  private async getUserFollowingCount(userId: number): Promise<number> {
    return socialStatsService.getUserFollowingCount(userId);
  }

  private async getUserFollowersCount(userId: number): Promise<number> {
    return socialStatsService.getUserFollowersCount(userId);
  }

  private async getUserPredictionCount(userId: number): Promise<number> {
    return bettingStatsService.getUserPredictionCount(userId);
  }
}

export const achievementService = new AchievementService();
