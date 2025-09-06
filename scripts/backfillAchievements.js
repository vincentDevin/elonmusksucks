#!/usr/bin/env node

/**
 * Achievement Backfill Script
 * 
 * This script syncs achievement progress with actual user stats from the database.
 * It's needed because the original stats tracking was REST-based and achievement
 * progress got out of sync with real stats.
 * 
 * Usage: node scripts/backfillAchievements.js [userId]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillUserAchievements(userId) {
  console.log(`\n🔄 Backfilling achievements for user ${userId}...`);
  
  try {
    // Get actual user stats
    const userStats = await prisma.userStats.findUnique({
      where: { userId: parseInt(userId) }
    });
    
    const pongStats = await prisma.pongStats.findUnique({
      where: { userId: parseInt(userId) }
    });
    
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      console.log(`❌ User ${userId} not found`);
      return;
    }

    console.log(`📊 User Stats:`, {
      betting: userStats ? {
        totalBets: userStats.totalBets,
        betsWon: userStats.betsWon,
        totalParlays: userStats.totalParlays,
        parlaysWon: userStats.parlaysWon,
        longestStreak: userStats.longestStreak,
        currentStreak: userStats.currentStreak,
        totalWagered: userStats.totalWagered.toString(),
        totalWon: userStats.totalWon.toString(),
        biggestWin: userStats.biggestWin.toString()
      } : 'No betting stats',
      pong: pongStats ? {
        totalMatches: pongStats.totalMatches,
        wins: pongStats.wins,
        losses: pongStats.losses,
        eloRating: pongStats.eloRating,
        bestWinStreak: pongStats.bestWinStreak,
        perfectGames: pongStats.perfectGames,
        tier: pongStats.tier
      } : 'No pong stats'
    });

    // Get all achievements that should be auto-evaluated
    const achievements = await prisma.achievement.findMany({
      where: {
        isActive: true,
        autoAward: true,
        manualOnly: false
      }
    });

    console.log(`\n📈 Processing ${achievements.length} achievements...`);

    let unlocked = 0;
    let updated = 0;

    for (const achievement of achievements) {
      const progress = calculateProgress(achievement, userStats, pongStats, user);
      const shouldBeUnlocked = progress >= achievement.targetValue;
      
      // Get current user achievement record
      const existingUA = await prisma.userAchievement.findUnique({
        where: {
          userId_achievementId: {
            userId: parseInt(userId),
            achievementId: achievement.id
          }
        }
      });

      const currentlyUnlocked = existingUA?.completedAt !== null;
      const currentProgress = existingUA?.progress || 0;

      // Only update if progress has changed or should be unlocked but isn't
      if (progress !== currentProgress || (shouldBeUnlocked && !currentlyUnlocked)) {
        await prisma.userAchievement.upsert({
          where: {
            userId_achievementId: {
              userId: parseInt(userId),
              achievementId: achievement.id
            }
          },
          update: {
            progress: progress,
            completedAt: shouldBeUnlocked ? new Date() : existingUA?.completedAt || null
          },
          create: {
            userId: parseInt(userId),
            achievementId: achievement.id,
            progress: progress,
            completedAt: shouldBeUnlocked ? new Date() : null
          }
        });

        const statusChange = shouldBeUnlocked && !currentlyUnlocked ? '🎉 UNLOCKED' : '📊 Updated';
        console.log(`  ${statusChange} ${achievement.name}: ${currentProgress} → ${progress}/${achievement.targetValue}`);
        
        updated++;
        if (shouldBeUnlocked && !currentlyUnlocked) {
          unlocked++;
        }
      }
    }

    console.log(`\n✅ Backfill complete:`);
    console.log(`  📊 ${updated} achievements updated`);
    console.log(`  🎉 ${unlocked} new achievements unlocked`);

  } catch (error) {
    console.error('❌ Error during backfill:', error);
  }
}

/**
 * Calculate achievement progress based on actual stats
 */
function calculateProgress(achievement, userStats, pongStats, user) {
  const category = achievement.category.toLowerCase();
  const name = achievement.name.toLowerCase();
  
  // Pong achievements
  if (category === 'pong' && pongStats) {
    if (name.includes('first blood')) return pongStats.wins >= 1 ? 1 : 0;
    if (name.includes('table regular')) return pongStats.wins; // Win 10 matches
    if (name.includes('spin doctor')) return pongStats.wins; // Win 50 matches  
    if (name.includes('arcade royalty')) return pongStats.wins; // Win 100 matches
    if (name.includes('grinder') && achievement.targetValue === 100) return pongStats.totalMatches; // Play 100
    if (name.includes('marathoner')) return pongStats.totalMatches; // Play 500
    if (name.includes('endless rally')) return pongStats.totalMatches; // Play 1000
    if (name.includes('hot hands i')) return pongStats.bestWinStreak >= 3 ? pongStats.bestWinStreak : 0;
    if (name.includes('hot hands ii')) return pongStats.bestWinStreak >= 5 ? pongStats.bestWinStreak : 0;
    if (name.includes('inferno')) return pongStats.bestWinStreak >= 10 ? pongStats.bestWinStreak : 0;
    if (name.includes('unstoppable')) return pongStats.bestWinStreak >= 20 ? pongStats.bestWinStreak : 0;
    if (name.includes('perfect game')) return pongStats.perfectGames >= 1 ? 1 : 0;
    if (name.includes('grandmaster')) return pongStats.eloRating >= 3000 ? 1 : 0;
    if (name.includes('master threshold')) return pongStats.eloRating >= 2600 ? pongStats.eloRating : 0;
    if (name.includes('diamond threshold')) return pongStats.eloRating >= 2200 ? pongStats.eloRating : 0;
    if (name.includes('platinum threshold')) return pongStats.eloRating >= 1800 ? pongStats.eloRating : 0;
    if (name.includes('gold threshold')) return pongStats.eloRating >= 1400 ? pongStats.eloRating : 0;
  }
  
  // Betting achievements
  if (category === 'betting' && userStats) {
    if (name.includes('first timer') || name.includes('first bet')) return userStats.totalBets >= 1 ? 1 : 0;
    if (name.includes('action junkie') || name.includes('betting machine')) return userStats.totalBets;
    if (name.includes('hot hand') && achievement.targetValue === 5) return userStats.longestStreak >= 5 ? userStats.longestStreak : 0;
    if (name.includes('diamond hands')) return userStats.longestStreak >= 10 ? userStats.longestStreak : 0;
    if (name.includes('parlay prodigy')) return userStats.parlaysWon >= 1 ? userStats.parlaysWon : 0;
    if (name.includes('grinder 500')) return userStats.totalBets;
  }
  
  // For achievements we can't map, keep existing progress
  return 0;
}

// Run the script
async function main() {
  const userId = process.argv[2];
  
  if (!userId) {
    console.log('Usage: node scripts/backfillAchievements.js <userId>');
    console.log('Example: node scripts/backfillAchievements.js 5');
    process.exit(1);
  }
  
  await backfillUserAchievements(userId);
  await prisma.$disconnect();
}

// Run the script if called directly
main().catch(console.error);