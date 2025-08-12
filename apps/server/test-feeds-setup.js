// Test script to add some feeds and articles for Timeline testing
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const testFeeds = [
  {
    name: 'Electrek',
    url: 'https://electrek.co/feed/',
    siteUrl: 'https://electrek.co',
    allowImages: true,
    status: 'ACTIVE'
  },
  {
    name: 'TechCrunch',
    url: 'https://techcrunch.com/feed/',
    siteUrl: 'https://techcrunch.com',
    allowImages: true,
    status: 'ACTIVE'
  },
  {
    name: 'The Verge',
    url: 'https://www.theverge.com/rss/index.xml',
    siteUrl: 'https://www.theverge.com',
    allowImages: true,
    status: 'ACTIVE'
  }
];

const testArticles = [
  {
    title: 'Tesla Model 3 Gets New Update with Enhanced Autopilot Features',
    excerpt: 'Tesla has rolled out a new software update that brings significant improvements to Autopilot functionality for Model 3 owners.',
    url: 'https://electrek.co/test-article-1',
    canonicalUrl: 'https://electrek.co/test-article-1',
    leadImageUrl: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
    status: 'APPROVED',
    tags: ['tesla', 'autopilot', 'tech-innovation'],
    hash: 'test-hash-1'
  },
  {
    title: 'SpaceX Prepares for Next Starship Launch Test',
    excerpt: 'SpaceX is gearing up for another Starship test flight as the company continues to refine its Mars colonization vehicle.',
    url: 'https://techcrunch.com/test-article-2',
    canonicalUrl: 'https://techcrunch.com/test-article-2',
    leadImageUrl: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=800',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
    status: 'APPROVED',
    tags: ['spacex', 'starship', 'space-news'],
    hash: 'test-hash-2'
  },
  {
    title: 'X Platform Implements New Content Moderation Features',
    excerpt: 'The social media platform formerly known as Twitter rolls out updated moderation tools in response to user feedback.',
    url: 'https://theverge.com/test-article-3',
    canonicalUrl: 'https://theverge.com/test-article-3',
    leadImageUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 6), // 6 hours ago
    status: 'APPROVED',
    tags: ['x-twitter', 'moderation', 'tech-news'],
    hash: 'test-hash-3'
  },
  {
    title: 'Neuralink Patient Shows Remarkable Progress in Brain-Computer Interface Trial',
    excerpt: 'The first human patient in Neuralinks brain implant trial demonstrates significant improvements in controlling devices with thought.',
    url: 'https://electrek.co/test-article-4',
    canonicalUrl: 'https://electrek.co/test-article-4',
    leadImageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 8), // 8 hours ago
    status: 'APPROVED',
    tags: ['neuralink', 'ai', 'tech-innovation'],
    hash: 'test-hash-4'
  },
  {
    title: 'Dogecoin Spikes After Elon Musk Tweet',
    excerpt: 'The meme cryptocurrency saw a 15% increase following a cryptic social media post from the Tesla CEO.',
    url: 'https://techcrunch.com/test-article-5',
    canonicalUrl: 'https://techcrunch.com/test-article-5',
    leadImageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
    publishedAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
    status: 'APPROVED',
    tags: ['crypto', 'dogecoin', 'markets'],
    hash: 'test-hash-5'
  }
];

async function setupTestData() {
  console.log('Setting up test feeds and articles...');
  
  try {
    // Clear existing test data
    await prisma.article.deleteMany({
      where: {
        hash: {
          startsWith: 'test-hash-'
        }
      }
    });
    
    console.log('Cleared existing test articles');

    // Create feeds
    const feeds = [];
    for (const feedData of testFeeds) {
      const existingFeed = await prisma.feedSource.findFirst({
        where: { url: feedData.url }
      });
      
      if (!existingFeed) {
        const feed = await prisma.feedSource.create({
          data: feedData
        });
        feeds.push(feed);
        console.log(`Created feed: ${feed.name}`);
      } else {
        feeds.push(existingFeed);
        console.log(`Feed already exists: ${existingFeed.name}`);
      }
    }

    // Create articles
    for (let i = 0; i < testArticles.length; i++) {
      const articleData = testArticles[i];
      const feed = feeds[i % feeds.length]; // Distribute articles across feeds
      
      const article = await prisma.article.create({
        data: {
          ...articleData,
          feedId: feed.id
        }
      });
      
      console.log(`Created article: ${article.title}`);
    }

    console.log('Test data setup completed!');
    console.log(`Created ${feeds.length} feeds and ${testArticles.length} articles`);
    
  } catch (error) {
    console.error('Error setting up test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupTestData();