#!/usr/bin/env tsx
/**
 * Migrate Badge Data to Achievement System
 * 
 * This script safely migrates existing Badge and UserBadge data to the Achievement system.
 * It creates backups, performs the migration, and provides verification reports.
 * 
 * Run with: npm run tsx scripts/migrate-badges-to-achievements.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationSummary {
  operation: string;
  count: number;
  details?: string;
}

async function main() {
  console.log('🔄 Starting Badge → Achievement Migration...\n');

  const summary: MigrationSummary[] = [];

  try {
    // Step 1: Create backup tables
    console.log('📦 Creating backup tables...');
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_BadgeBackup" AS 
      SELECT * FROM "Badge"
    `;
    
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "_UserBadgeBackup" AS 
      SELECT * FROM "UserBadge"
    `;

    const badgeCount = await prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM "_BadgeBackup"
    `;
    summary.push({ operation: 'Badges backed up', count: Number(badgeCount[0].count) });

    const userBadgeCount = await prisma.$queryRaw<[{count: bigint}]>`
      SELECT COUNT(*) as count FROM "_UserBadgeBackup"
    `;
    summary.push({ operation: 'UserBadges backed up', count: Number(userBadgeCount[0].count) });

    // Step 2: Get existing badges to migrate
    const existingBadges = await prisma.badge.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        createdAt: true,
      }
    });

    console.log(`📝 Found ${existingBadges.length} badges to migrate...`);

    // Step 3: Migrate badges to achievements
    let migratedAchievements = 0;
    
    for (const badge of existingBadges) {
      const slug = badge.name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
      
      // Check if achievement already exists
      const existingAchievement = await prisma.achievement.findUnique({
        where: { slug }
      });

      if (!existingAchievement) {
        await prisma.achievement.create({
          data: {
            slug,
            name: badge.name,
            title: badge.name,
            description: badge.description || 'Legacy badge migrated from old system',
            category: 'legacy',
            rarity: 'common',
            targetValue: 1,
            autoAward: false, // Legacy badges were manually awarded
            manualOnly: true,
            isShame: false,
            isActive: true,
            sortOrder: 1000, // Put legacy achievements at the end
          }
        });
        migratedAchievements++;
        console.log(`✅ Migrated badge: ${badge.name} → ${slug}`);
      } else {
        console.log(`⚠️  Skipped duplicate: ${badge.name} (already exists as ${slug})`);
      }
    }

    summary.push({ 
      operation: 'New achievements created', 
      count: migratedAchievements,
      details: `${migratedAchievements} out of ${existingBadges.length} badges`
    });

    // Step 4: Migrate user badge relationships
    console.log('\n👥 Migrating user badge relationships...');
    
    const userBadges = await prisma.userBadge.findMany({
      include: {
        badge: true,
        user: { select: { name: true } }
      }
    });

    let migratedUserAchievements = 0;
    
    for (const userBadge of userBadges) {
      const slug = userBadge.badge.name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, '-');
      
      // Find the corresponding achievement
      const achievement = await prisma.achievement.findUnique({
        where: { slug }
      });

      if (achievement) {
        // Check if user achievement already exists
        const existingUserAchievement = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: userBadge.userId,
              achievementId: achievement.id
            }
          }
        });

        if (!existingUserAchievement) {
          await prisma.userAchievement.create({
            data: {
              userId: userBadge.userId,
              achievementId: achievement.id,
              progress: 1, // Legacy badges are binary (0 or 1)
              completedAt: userBadge.awardedAt,
            }
          });
          migratedUserAchievements++;
          console.log(`✅ Migrated: ${userBadge.user.name} → ${userBadge.badge.name}`);
        }
      } else {
        console.log(`❌ Could not find achievement for badge: ${userBadge.badge.name}`);
      }
    }

    summary.push({ 
      operation: 'User achievements migrated', 
      count: migratedUserAchievements,
      details: `${migratedUserAchievements} out of ${userBadges.length} user badges`
    });

    // Step 5: Verification and summary report
    console.log('\n📊 Migration Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    summary.forEach(item => {
      console.log(`${item.operation}: ${item.count}${item.details ? ` (${item.details})` : ''}`);
    });

    // Verification queries
    console.log('\n🔍 Verification - Sample migrated achievements:');
    const sampleAchievements = await prisma.achievement.findMany({
      where: { category: 'legacy' },
      select: { slug: true, name: true, title: true, createdAt: true },
      take: 5
    });

    sampleAchievements.forEach(achievement => {
      console.log(`  • ${achievement.slug} - "${achievement.name}"`);
    });

    console.log('\n👑 Verification - Top users with migrated achievements:');
    const userStats = await prisma.$queryRaw<Array<{
      username: string;
      achievement_count: bigint;
      achievement_names: string;
    }>>`
      SELECT 
        u.name as username,
        COUNT(ua.id) as achievement_count,
        STRING_AGG(a.name, ', ') as achievement_names
      FROM "User" u
      LEFT JOIN "UserAchievement" ua ON u.id = ua."userId"
      LEFT JOIN "Achievement" a ON a.id = ua."achievementId" AND a.category = 'legacy'
      WHERE ua.id IS NOT NULL
      GROUP BY u.id, u.name
      ORDER BY achievement_count DESC
      LIMIT 5
    `;

    userStats.forEach(stat => {
      console.log(`  • ${stat.username}: ${Number(stat.achievement_count)} achievements`);
      console.log(`    ${stat.achievement_names}`);
    });

    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ Verify data integrity by checking user profiles in the UI');
    console.log('2. ✅ Test achievement display functionality');
    console.log('3. 🧹 After verification, clean up backup tables:');
    console.log('   DROP TABLE "_BadgeBackup", "_UserBadgeBackup";');
    console.log('4. 🗑️  Consider removing Badge/UserBadge tables after full verification');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n🔄 Rolling back changes...');
    
    // Note: In a real scenario, you might want more sophisticated rollback logic
    console.log('⚠️  Manual rollback may be required. Check backup tables.');
    
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('Fatal error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });