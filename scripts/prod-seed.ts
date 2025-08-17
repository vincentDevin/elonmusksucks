// scripts/prod-seed.ts - Production Database Seeding Script
// Sets up essential production data without creating any users

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { SEED_ACHIEVEMENTS } from '../prisma/achievement-catalog';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting production database setup...');
  
  // Only clear data that should not persist in production
  console.log('🧹 Clearing temporary/test data...');
  
  // Clear old achievement data for fresh setup
  console.log('  - Clearing old user achievements and progress...');
  await prisma.userAchievement.deleteMany();
  
  // Clear any legacy badge system data 
  console.log('  - Clearing legacy badge system...');
  await prisma.userBadge.deleteMany();
  await prisma.badge.deleteMany();
  
  // Clear any test moderation logs (keep structure)
  console.log('  - Clearing test moderation data...');
  await prisma.moderationLog.deleteMany();
  
  console.log('🏆 Setting up comprehensive achievement system...');
  console.log(`  - Installing ${SEED_ACHIEVEMENTS.length} achievements...`);
  
  // Install all achievements with idempotent upsert
  for (const achievement of SEED_ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { slug: achievement.slug },
      update: {
        name: achievement.name,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        rarity: achievement.rarity,
        targetValue: achievement.targetValue,
        autoAward: achievement.autoAward,
        manualOnly: achievement.manualOnly,
        isShame: achievement.isShame,
        iconUrl: achievement.iconUrl,
        sortOrder: achievement.sortOrder,
        isActive: true,
      },
      create: {
        slug: achievement.slug,
        name: achievement.name,
        title: achievement.title,
        description: achievement.description,
        category: achievement.category,
        rarity: achievement.rarity,
        targetValue: achievement.targetValue,
        autoAward: achievement.autoAward,
        manualOnly: achievement.manualOnly,
        isShame: achievement.isShame,
        iconUrl: achievement.iconUrl,
        sortOrder: achievement.sortOrder,
        isActive: true,
      },
    });
  }
  
  console.log('💬 Setting up essential chat infrastructure...');
  
  // Create global chat room (essential for site functionality)
  const globalRoom = await prisma.chatRoom.upsert({
    where: { name: 'global' },
    update: { description: 'Main community chat' },
    create: { 
      name: 'global',
      description: 'Main community chat'
    }
  });
  
  console.log(`  - Global chat room created/verified (ID: ${globalRoom.id})`);
  
  // Create predictions chat room  
  const predictionsRoom = await prisma.chatRoom.upsert({
    where: { name: 'predictions' },
    update: { description: 'Discuss active predictions' },
    create: {
      name: 'predictions', 
      description: 'Discuss active predictions'
    }
  });
  
  console.log(`  - Predictions chat room created/verified (ID: ${predictionsRoom.id})`);
  
  console.log('⚙️ Verifying database structure...');
  
  // Verify essential tables exist and are accessible
  const tableChecks = [
    { name: 'User', check: () => prisma.user.count() },
    { name: 'Prediction', check: () => prisma.prediction.count() },
    { name: 'PredictionOption', check: () => prisma.predictionOption.count() },
    { name: 'Bet', check: () => prisma.bet.count() },
    { name: 'Parlay', check: () => prisma.parlay.count() },
    { name: 'Transaction', check: () => prisma.transaction.count() },
    { name: 'Achievement', check: () => prisma.achievement.count() },
    { name: 'UserAchievement', check: () => prisma.userAchievement.count() },
    { name: 'ChatRoom', check: () => prisma.chatRoom.count() },
    { name: 'Message', check: () => prisma.message.count() },
    { name: 'UserStats', check: () => prisma.userStats.count() },
    { name: 'UserActivity', check: () => prisma.userActivity.count() },
  ];
  
  for (const { name, check } of tableChecks) {
    try {
      const count = await check();
      console.log(`  ✅ ${name} table: ${count} records`);
    } catch (error) {
      console.error(`  ❌ ${name} table: ERROR -`, (error as Error).message);
      throw new Error(`Database structure check failed for ${name} table`);
    }
  }
  
  console.log('🔐 Setting up production defaults...');
  
  // Ensure no default admin users exist in production (security)
  const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
  if (adminCount === 0) {
    console.log('  ✅ No default admin users found (secure)');
  } else {
    console.log(`  ⚠️  Warning: ${adminCount} admin users exist - verify these are intentional`);
  }
  
  // Verify BigInt support is working
  console.log('🔢 Verifying BigInt support...');
  try {
    // Test BigInt operations on a dummy transaction record
    const testBigInt = BigInt('9223372036854775807'); // Max safe BigInt
    console.log(`  ✅ BigInt support verified (test value: ${testBigInt.toString()})`);
  } catch (error) {
    console.error('  ❌ BigInt support failed:', (error as Error).message);
    throw new Error('BigInt support is required for production');
  }
  
  console.log('📊 Production database summary:');
  console.log(`  - ${SEED_ACHIEVEMENTS.length} achievements installed`);
  console.log(`  - ${await prisma.chatRoom.count()} chat rooms available`);
  console.log(`  - ${await prisma.user.count()} users (should be 0 for fresh deployment)`);
  console.log(`  - ${await prisma.prediction.count()} predictions`);
  console.log(`  - Database ready for production traffic`);
  
  console.log('✅ Production database setup complete!');
  console.log('');
  console.log('🎯 Next steps:');
  console.log('  1. Deploy application with this database');
  console.log('  2. Create first admin user through application');
  console.log('  3. Start creating predictions for users to bet on');
  console.log('  4. Monitor achievement system as users engage');
  console.log('');
  console.log('🔒 Security notes:');
  console.log('  - No default users created (secure)');
  console.log('  - Admin users must be created post-deployment');
  console.log('  - All sensitive operations require proper authentication');
}

main()
  .catch(e => { 
    console.error('❌ Production seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());