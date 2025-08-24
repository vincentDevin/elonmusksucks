// apps/server/src/workers/feed.worker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import { FeedFetchJobData, FeedHealthCheckData } from '@ems/types';
import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';
import type { Job } from 'bullmq';
import Parser from 'rss-parser';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

// Note: Job data interfaces now imported from @ems/types

/**
 * RSS/Atom Feed Worker
 * Handles feed fetching, parsing, and article creation with deduplication
 */
const feedWorker = new Worker(
  'feed',
  async (job: Job<FeedFetchJobData | FeedHealthCheckData>) => {
    console.log(`[feed-worker] Processing job ${job.name} with ID ${job.id}`);

    try {
      switch (job.name) {
        case 'fetch':
          return await processFeedFetch(job as Job<FeedFetchJobData>);

        case 'health-check':
          return await processFeedHealthCheck(job as Job<FeedHealthCheckData>);

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`[feed-worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: 5, // Process up to 5 feeds simultaneously
    removeOnComplete: { count: 50 }, // Keep last 50 successful jobs
    removeOnFail: { count: 100 }, // Keep last 100 failed jobs for debugging
  },
);

/**
 * Process RSS/Atom feed fetching
 */
async function processFeedFetch(job: Job<FeedFetchJobData>): Promise<{
  articlesCreated: number;
  duplicatesSkipped: number;
  errors: string[];
}> {
  const { feedId, url, forceRefresh } = job.data;
  const errors: string[] = [];
  let articlesCreated = 0;
  let duplicatesSkipped = 0;

  console.log(`[feed-worker] Fetching feed ${feedId}: ${url}`);

  try {
    // Update feed fetch attempt
    await prisma.feedSource.update({
      where: { id: feedId },
      data: {
        lastFetchedAt: new Date(),
        fetchCount: { increment: 1 },
      },
    });

    await job.updateProgress(10);

    // Fetch feed XML with proper headers
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'elonmusksucks.net/1.0 RSS Reader (+https://elonmusksucks.net)',
        Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    await job.updateProgress(25);

    // Parse the feed
    const feedData = await response.text();
    const articles = await parseFeedContent(feedData);

    await job.updateProgress(50);

    console.log(`[feed-worker] Parsed ${articles.length} items from feed ${feedId}`);

    // Process each article
    for (let i = 0; i < articles.length; i++) {
      const articleData = articles[i];

      try {
        // Generate content hash for deduplication
        const contentHash = generateArticleHash(articleData);

        // Check if article already exists
        const existingArticle = await prisma.article.findFirst({
          where: {
            OR: [{ url: articleData.url }, { hash: contentHash }],
          },
        });

        if (existingArticle) {
          duplicatesSkipped++;
          continue;
        }

        // Create new article
        const article = await prisma.article.create({
          data: {
            feedId,
            guid: articleData.guid,
            url: articleData.url,
            canonicalUrl: articleData.canonicalUrl || articleData.url,
            title: articleData.title,
            excerpt: articleData.excerpt,
            leadImageUrl: articleData.leadImageUrl,
            publishedAt: articleData.publishedAt,
            hash: contentHash,
            status: 'PENDING', // Requires moderation
            tags: generateBasicTags(articleData.title, articleData.excerpt),
          },
        });

        articlesCreated++;

        // Publish event for admin moderation queue
        await redisClient.publish(
          'feed:article:new',
          JSON.stringify({
            articleId: article.id,
            title: article.title,
            publisher: await getFeedName(feedId),
          }),
        );

        // Queue article enrichment job
        // TODO: Add to article enrichment queue
        // await articleQueue.add('enrich', {
        //   articleId: article.id,
        //   extractImages: true,
        //   generateTags: true
        // });
      } catch (articleError) {
        console.error(`[feed-worker] Error processing article:`, articleError);
        errors.push(
          `Article processing error: ${articleError instanceof Error ? articleError.message : 'Unknown error'}`,
        );
      }

      // Update progress
      await job.updateProgress(50 + (i / articles.length) * 40);
    }

    // Update feed success metrics
    await prisma.feedSource.update({
      where: { id: feedId },
      data: {
        lastSuccessAt: new Date(),
        errorCount: 0, // Reset error count on success
      },
    });

    await job.updateProgress(100);

    console.log(
      `[feed-worker] Completed feed ${feedId}: ${articlesCreated} created, ${duplicatesSkipped} duplicates`,
    );
  } catch (error) {
    console.error(`[feed-worker] Error fetching feed ${feedId}:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    errors.push(errorMessage);

    // Update feed error metrics
    await prisma.feedSource.update({
      where: { id: feedId },
      data: {
        lastErrorAt: new Date(),
        lastErrorMsg: errorMessage,
        errorCount: { increment: 1 },
      },
    });
  }

  return {
    articlesCreated,
    duplicatesSkipped,
    errors,
  };
}

/**
 * Process feed health check
 */
async function processFeedHealthCheck(job: Job<FeedHealthCheckData>): Promise<{
  isHealthy: boolean;
  responseTime: number;
  errors: string[];
}> {
  const { feedId } = job.data;

  console.log(`[feed-worker] Health check for feed ${feedId}`);

  // TODO: Implement feed health checking
  // 1. Test feed URL connectivity
  // 2. Validate feed XML structure
  // 3. Check for feed updates
  // 4. Update FeedSource health metrics

  return {
    isHealthy: false,
    responseTime: 0,
    errors: ['Health check not yet implemented'],
  };
}

// Error handling
feedWorker.on('completed', (job) => {
  console.log(`[feed-worker] Job ${job.id} completed successfully`);
});

feedWorker.on('failed', (job, err) => {
  console.error(`[feed-worker] Job ${job?.id} failed:`, err);
});

feedWorker.on('error', (err) => {
  console.error('[feed-worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[feed-worker] Received SIGTERM, closing worker...');
  await feedWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[feed-worker] Received SIGINT, closing worker...');
  await feedWorker.close();
  process.exit(0);
});

// ===============================================
// Helper Functions
// ===============================================

interface ParsedArticle {
  guid?: string;
  url: string;
  canonicalUrl?: string;
  title: string;
  excerpt?: string;
  leadImageUrl?: string;
  publishedAt?: Date;
}

/**
 * Parse RSS/Atom feed content using rss-parser
 */
async function parseFeedContent(feedXml: string): Promise<ParsedArticle[]> {
  const parser = new Parser({
    customFields: {
      item: [
        ['media:content', 'media'],
        ['media:thumbnail', 'media:thumbnail'],
        ['content:encoded', 'contentEncoded'],
        ['dc:creator', 'creator'],
        ['dc:image', 'dc:image'],
        ['itunes:image', 'itunes:image'],
        ['wp:featuredmedia', 'wp:featuredmedia'],
        ['featured_image', 'featured_image'],
      ],
    },
  });

  try {
    const feed = await parser.parseString(feedXml);
    const articles: ParsedArticle[] = [];

    for (const item of feed.items || []) {
      try {
        const article: ParsedArticle = {
          guid: item.guid,
          url: item.link || '',
          title: item.title || 'Untitled',
          excerpt: item.contentSnippet || item.content || undefined,
          publishedAt: item.pubDate ? new Date(item.pubDate) : undefined,
        };

        // Extract canonical URL if different from link
        if (item.link && item.guid && item.guid !== item.link) {
          article.canonicalUrl = item.guid;
        }

        // Extract lead image from various sources
        article.leadImageUrl = extractLeadImage(item);

        // Debug logging for image extraction (remove after testing)
        if (!article.leadImageUrl) {
          console.log(`[feed-worker] No image found for article: ${article.title}`);
          console.log(`[feed-worker] Available item keys:`, Object.keys(item));
          if (item.contentEncoded) {
            console.log(`[feed-worker] Content encoded length:`, item.contentEncoded.length);
            console.log(`[feed-worker] Content sample:`, item.contentEncoded.substring(0, 200));
          }
        } else {
          console.log(
            `[feed-worker] Found image for article: ${article.title} -> ${article.leadImageUrl}`,
          );
        }

        // Clean and validate article data
        if (article.url && article.title) {
          articles.push(article);
        }
      } catch (itemError) {
        console.warn(`[feed-worker] Error parsing feed item:`, itemError);
      }
    }

    return articles;
  } catch (error) {
    throw new Error(
      `Feed parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Generate content hash for deduplication
 */
function generateArticleHash(article: ParsedArticle): string {
  const content = `${article.title}|${article.url}|${article.publishedAt?.toISOString() || ''}`;
  return createHash('sha256').update(content).digest('hex');
}

/**
 * Generate basic tags based on content
 */
function generateBasicTags(title: string, excerpt?: string): string[] {
  const tags: string[] = [];
  const content = `${title} ${excerpt || ''}`.toLowerCase();

  // Tesla-related tags
  if (/tesla|model [3sxy]|cybertruck|supercharger|autopilot|fsd|full self.driving/i.test(content)) {
    tags.push('tesla');
  }

  // SpaceX-related tags
  if (/spacex|falcon|dragon|starship|starlink|raptor/i.test(content)) {
    tags.push('spacex');
  }

  // X/Twitter-related tags
  if (/twitter|\bx\.com|tweet|elon.*social/i.test(content)) {
    tags.push('x-twitter');
  }

  // Legal/court tags
  if (/lawsuit|court|sec|settlement|judge|legal/i.test(content)) {
    tags.push('legal');
  }

  // Market/financial tags
  if (/stock|shares|market|earnings|revenue|profit|loss/i.test(content)) {
    tags.push('markets');
  }

  // AI-related tags
  if (/artificial intelligence|\bai\b|neural|machine learning|grok/i.test(content)) {
    tags.push('ai');
  }

  // If no specific tags found, add general tag
  if (tags.length === 0) {
    tags.push('general');
  }

  return tags;
}

/**
 * Extract lead image from RSS feed item using multiple strategies
 */
function extractLeadImage(item: any): string | undefined {
  // Strategy 1: RSS enclosure (most common)
  if (item.enclosure && item.enclosure.url && item.enclosure.type?.startsWith('image/')) {
    return item.enclosure.url;
  }

  // Strategy 2: Media RSS namespace (media:content)
  if (item.media && item.media.$ && item.media.$.url) {
    return item.media.$.url;
  }

  // Strategy 3: Media thumbnail (media:thumbnail)
  if (item['media:thumbnail'] && item['media:thumbnail'].$ && item['media:thumbnail'].$.url) {
    return item['media:thumbnail'].$.url;
  }

  // Strategy 4: iTunes image (itunes:image)
  if (item['itunes:image'] && item['itunes:image'].href) {
    return item['itunes:image'].href;
  }

  // Strategy 5: Extract from HTML content using regex
  if (item.content || item.contentEncoded || item['content:encoded'] || item.description) {
    const htmlContent =
      item.content || item.contentEncoded || item['content:encoded'] || item.description;
    if (typeof htmlContent === 'string') {
      // Try multiple img tag patterns
      const imgPatterns = [
        /<img[^>]+src=["']([^"']+)["'][^>]*>/i,
        /<img[^>]+src=([^>\s]+)[^>]*>/i,
        /<figure[^>]*>.*?<img[^>]+src=["']([^"']+)["'][^>]*>.*?<\/figure>/is,
      ];

      for (const pattern of imgPatterns) {
        const imgMatch = htmlContent.match(pattern);
        if (imgMatch && imgMatch[1]) {
          const imageUrl = imgMatch[1].trim();
          // More lenient validation - accept URLs that look like images
          if (
            imageUrl.startsWith('http') &&
            (imageUrl.match(/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i) ||
              imageUrl.includes('/wp-content/uploads/') ||
              imageUrl.includes('image') ||
              imageUrl.includes('photo') ||
              imageUrl.includes('picture'))
          ) {
            return imageUrl;
          }
        }
      }
    }
  }

  // Strategy 6: Look for featured image in custom fields
  if (item['wp:featuredmedia'] || item['featured_image']) {
    const featuredImage = item['wp:featuredmedia'] || item['featured_image'];
    if (typeof featuredImage === 'string' && featuredImage.startsWith('http')) {
      return featuredImage;
    }
  }

  // Strategy 7: Dublin Core image metadata
  if (item['dc:image']) {
    return item['dc:image'];
  }

  // Strategy 8: Extract from summary/description
  if (item.summary) {
    const imgMatch = item.summary.match(/<img[^>]+src=["']([^"']+)["'][^>]*>/i);
    if (imgMatch && imgMatch[1]) {
      const imageUrl = imgMatch[1];
      if (imageUrl.match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i)) {
        return imageUrl;
      }
    }
  }

  return undefined;
}

/**
 * Get feed name for notifications
 */
async function getFeedName(feedId: number): Promise<string> {
  try {
    const feed = await prisma.feedSource.findUnique({
      where: { id: feedId },
      select: { name: true },
    });
    return feed?.name || `Feed ${feedId}`;
  } catch {
    return `Feed ${feedId}`;
  }
}

console.log('[feed-worker] Worker started successfully');

export default feedWorker;
