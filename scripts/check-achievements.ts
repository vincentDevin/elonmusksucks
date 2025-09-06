#!/usr/bin/env npx tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAchievements() {
  console.log('📋 Checking existing achievements...\n');

  // First, check what categories exist
  const categories = await prisma.achievement.groupBy({
    by: ['category'],
    _count: { category: true },
  });

  console.log('🏷️  CATEGORIES FOUND:');
  categories.forEach(cat => {
    console.log(`   ${cat.category}: ${cat._count.category} achievements`);
  });
  console.log('');

  // Get all achievements to see the real data
  const allAchievements = await prisma.achievement.findMany({
    select: {
      id: true,
      title: true,
      slug: true,
      category: true,
      ruleData: true,
    },
    orderBy: [{ category: 'asc' }, { title: 'asc' }]
  });

  // Group by category
  const byCategory = allAchievements.reduce((acc, achievement) => {
    if (!acc[achievement.category]) {
      acc[achievement.category] = [];
    }
    acc[achievement.category].push(achievement);
    return acc;
  }, {} as Record<string, typeof allAchievements>);

  // Show all achievements by category
  for (const [category, achievements] of Object.entries(byCategory)) {
    const withRules = achievements.filter(a => a.ruleData !== null).length;
    const withoutRules = achievements.length - withRules;
    
    console.log(`🎯 ${category} ACHIEVEMENTS (${achievements.length} found, ${withRules} with rules):`);
    console.log('='.repeat(60));
    
    for (const achievement of achievements) {
      const hasRules = achievement.ruleData !== null;
      console.log(`${hasRules ? '✅' : '❌'} ${achievement.title} (slug: ${achievement.slug})`);
    }
    
    if (withoutRules > 0) {
      console.log(`\n🔄 ${withoutRules} achievements in ${category} need migration\n`);
    } else {
      console.log(`\n✅ All ${category} achievements have rules\n`);
    }
  }

  const totalWithoutRules = allAchievements.filter(a => a.ruleData === null).length;
  console.log(`\n📊 OVERALL SUMMARY:`);
  console.log(`   Total achievements: ${allAchievements.length}`);
  console.log(`   With rules: ${allAchievements.length - totalWithoutRules}`);
  console.log(`   Without rules: ${totalWithoutRules}`);
}

checkAchievements()
  .catch(console.error)
  .finally(() => prisma.$disconnect());