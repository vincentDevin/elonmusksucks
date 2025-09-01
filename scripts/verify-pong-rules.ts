#!/usr/bin/env tsx
/**
 * Verify Pong Achievement Rules
 * 
 * Quick verification that the rules were properly stored in the database
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying Pong Achievement Rules...\n');

  const pongAchievements = await prisma.achievement.findMany({
    where: {
      category: 'pong'
    },
    select: {
      slug: true,
      name: true,
      ruleData: true,
    },
    orderBy: {
      sortOrder: 'asc'
    }
  });

  console.log(`Found ${pongAchievements.length} Pong achievements:\n`);

  let withRules = 0;
  let withoutRules = 0;

  for (const achievement of pongAchievements) {
    const hasRules = achievement.ruleData !== null;
    const indicator = hasRules ? '✅' : '❌';
    const ruleInfo = hasRules 
      ? `(${JSON.stringify(achievement.ruleData).length} chars)`
      : '(no rules)';
    
    console.log(`${indicator} ${achievement.slug} - ${achievement.name} ${ruleInfo}`);
    
    if (hasRules) {
      withRules++;
    } else {
      withoutRules++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✅ With rules: ${withRules}`);
  console.log(`❌ Without rules: ${withoutRules}`);
  console.log(`📝 Total: ${pongAchievements.length}`);

  if (withoutRules === 0) {
    console.log(`\n🎉 All Pong achievements have rules! Ready for auto-awards.`);
  } else {
    console.log(`\n⚠️  ${withoutRules} achievements still need rules.`);
  }

  // Show example rule for verification
  if (pongAchievements.length > 0 && pongAchievements[0].ruleData) {
    console.log(`\n🔧 Example rule (${pongAchievements[0].slug}):`);
    console.log(JSON.stringify(pongAchievements[0].ruleData, null, 2));
  }
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });