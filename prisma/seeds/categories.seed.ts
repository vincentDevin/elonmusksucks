import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    name: 'Custom',
    slug: 'custom',
    icon: '✨',
    color: '#8b5cf6',
    sortOrder: 0,
    description: 'General and custom predictions',
    isActive: true,
  },
  {
    name: 'Sports',
    slug: 'sports',
    icon: '⚽',
    color: '#22c55e',
    sortOrder: 1,
    description: 'Sporting events and competitions',
    isActive: true,
  },
  {
    name: 'Politics',
    slug: 'politics',
    icon: '🗳️',
    color: '#3b82f6',
    sortOrder: 2,
    description: 'Political outcomes and elections',
    isActive: true,
  },
  {
    name: 'Technology',
    slug: 'technology',
    icon: '📱',
    color: '#06b6d4',
    sortOrder: 3,
    description: 'Tech announcements and innovations',
    isActive: true,
  },
  {
    name: 'Entertainment',
    slug: 'entertainment',
    icon: '🎬',
    color: '#f59e0b',
    sortOrder: 4,
    description: 'Movies, TV, music, and pop culture',
    isActive: true,
  },
  {
    name: 'Finance',
    slug: 'finance',
    icon: '📈',
    color: '#10b981',
    sortOrder: 5,
    description: 'Stock markets and economic events',
    isActive: true,
  },
  {
    name: 'Weather',
    slug: 'weather',
    icon: '🌤️',
    color: '#f97316',
    sortOrder: 6,
    description: 'Weather patterns and climate events',
    isActive: true,
  },
  {
    name: 'Social Media',
    slug: 'social-media',
    icon: '📱',
    color: '#ec4899',
    sortOrder: 7,
    description: 'Social trends and viral content',
    isActive: true,
  },
];

async function seedCategories() {
  console.log('🌱 Seeding categories...');

  for (const category of categories) {
    // Check if category exists by slug
    const existing = await prisma.category.findUnique({
      where: { slug: category.slug },
    });

    if (existing) {
      // Update existing category
      const result = await prisma.category.update({
        where: { slug: category.slug },
        data: {
          name: category.name,
          icon: category.icon,
          color: category.color,
          sortOrder: category.sortOrder,
          description: category.description,
          isActive: category.isActive,
        },
      });
      console.log(`  ✓ Updated: ${result.icon} ${result.name} (ID: ${result.id})`);
    } else {
      // Create new category (without specifying ID, let DB auto-increment)
      const result = await prisma.category.create({
        data: category,
      });
      console.log(`  ✓ Created: ${result.icon} ${result.name} (ID: ${result.id})`);
    }
  }

  console.log(`✅ Successfully seeded ${categories.length} categories`);
}

seedCategories()
  .catch((e) => {
    console.error('❌ Error seeding categories:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
