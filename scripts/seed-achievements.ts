// Achievement-only seeding script
// Seeds comprehensive achievement catalog without affecting other data

import dotenv from 'dotenv';
dotenv.config();

import { PrismaClient } from '@prisma/client';
import { SEED_ACHIEVEMENTS } from '../prisma/achievement-catalog';

const prisma = new PrismaClient();

async function seedAchievements() {
  console.log('🏆 Seeding achievement catalog only...');
  console.log(`Upserting ${SEED_ACHIEVEMENTS.length} achievements by slug...`);
  
  let created = 0;
  let updated = 0;
  
  // Upsert all achievements by slug for idempotency
  for (const achievement of SEED_ACHIEVEMENTS) {
    try {
      const result = await prisma.achievement.upsert({
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
      
      // Check if this was a create or update by looking at the createdAt vs updatedAt
      if (result.createdAt.getTime() === result.updatedAt.getTime()) {
        created++;
      } else {
        updated++;
      }
      
      console.log(`✓ ${achievement.slug} (${achievement.rarity})`);
    } catch (error) {
      console.error(`✗ Failed to upsert ${achievement.slug}:`, error);
    }
  }
  
  console.log(`\n✅ Achievement seeding complete!`);
  console.log(`📊 Summary: ${created} created, ${updated} updated`);
  
  // Show breakdown by category
  const categories = [...new Set(SEED_ACHIEVEMENTS.map(a => a.category))];
  console.log(`\n📋 Categories seeded:`);
  for (const category of categories) {
    const count = SEED_ACHIEVEMENTS.filter(a => a.category === category).length;
    console.log(`   ${category}: ${count} achievements`);
  }
}

seedAchievements()
  .catch(e => { 
    console.error('Failed to seed achievements:', e); 
    process.exit(1); 
  })
  .finally(() => prisma.$disconnect());