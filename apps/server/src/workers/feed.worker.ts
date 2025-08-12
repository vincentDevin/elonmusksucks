// apps/server/src/workers/feed.worker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';
import type { Job } from 'bullmq';
import type { FeedFetchJob } from '@ems/types';
import * as FeedParser from 'feedparser';
import { createHash } from 'crypto';
import { Readable } from 'stream';

const prisma = new PrismaClient();

// Job data interfaces
interface FeedFetchJobData extends FeedFetchJob {
  feedId: number;
  url: string;
  forceRefresh?: boolean;
}

interface FeedHealthCheckData {
  feedId: number;
  checkConnectivity?: boolean;
}

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
    removeOnComplete: 50, // Keep last 50 successful jobs
    removeOnFail: 100, // Keep last 100 failed jobs for debugging
  }
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
        fetchCount: { increment: 1 }
      }
    });

    await job.updateProgress(10);

    // Fetch feed XML with proper headers
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'elonmusksucks.net/1.0 RSS Reader (+https://elonmusksucks.net)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
        'Cache-Control': forceRefresh ? 'no-cache' : 'max-age=300'
      },
      timeout: 30000 // 30 second timeout
    });

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
            OR: [
              { url: articleData.url },
              { hash: contentHash }
            ]
          }
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
            tags: generateBasicTags(articleData.title, articleData.excerpt)
          }
        });

        articlesCreated++;

        // Publish event for admin moderation queue
        await redisClient.publish('feed:article:new', JSON.stringify({
          articleId: article.id,
          title: article.title,
          publisher: await getFeedName(feedId)
        }));

        // Queue article enrichment job
        // TODO: Add to article enrichment queue
        // await articleQueue.add('enrich', { 
        //   articleId: article.id,
        //   extractImages: true,
        //   generateTags: true 
        // });

      } catch (articleError) {
        console.error(`[feed-worker] Error processing article:`, articleError);
        errors.push(`Article processing error: ${articleError instanceof Error ? articleError.message : 'Unknown error'}`);
      }

      // Update progress
      await job.updateProgress(50 + (i / articles.length) * 40);
    }

    // Update feed success metrics
    await prisma.feedSource.update({
      where: { id: feedId },
      data: {
        lastSuccessAt: new Date(),
        errorCount: 0 // Reset error count on success
      }
    });

    await job.updateProgress(100);

    console.log(`[feed-worker] Completed feed ${feedId}: ${articlesCreated} created, ${duplicatesSkipped} duplicates`);

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
        errorCount: { increment: 1 }
      }
    });
  }
  
  return {
    articlesCreated,
    duplicatesSkipped,
    errors
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
  const { feedId, checkConnectivity } = job.data;
  
  console.log(`[feed-worker] Health check for feed ${feedId}`);
  
  // TODO: Implement feed health checking
  // 1. Test feed URL connectivity
  // 2. Validate feed XML structure
  // 3. Check for feed updates
  // 4. Update FeedSource health metrics
  
  return {
    isHealthy: false,
    responseTime: 0,
    errors: ['Health check not yet implemented']
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
 * Parse RSS/Atom feed content using FeedParser
 */
async function parseFeedContent(feedXml: string): Promise<ParsedArticle[]> {
  return new Promise((resolve, reject) => {
    const articles: ParsedArticle[] = [];
    const feedParser = new FeedParser({});

    feedParser.on('error', (error) => {
      reject(new Error(`Feed parsing error: ${error.message}`));
    });

    feedParser.on('readable', function() {
      let item;
      while (item = this.read()) {
        try {
          const article: ParsedArticle = {
            guid: item.guid,
            url: item.link || item.url,
            title: item.title || 'Untitled',
            excerpt: item.description || item.summary || undefined,
            publishedAt: item.pubdate || item.date || undefined
          };

          // Extract canonical URL if different from link
          if (item.origlink && item.origlink !== article.url) {
            article.canonicalUrl = item.origlink;
          }

          // Extract lead image from various sources
          if (item.image && item.image.url) {
            article.leadImageUrl = item.image.url;
          } else if (item.enclosures && item.enclosures.length > 0) {
            const imageEnclosure = item.enclosures.find(enc => 
              enc.type && enc.type.startsWith('image/')
            );
            if (imageEnclosure) {
              article.leadImageUrl = imageEnclosure.url;
            }
          }

          // Clean and validate article data
          if (article.url && article.title) {
            articles.push(article);
          }
        } catch (itemError) {
          console.warn(`[feed-worker] Error parsing feed item:`, itemError);
        }
      }
    });

    feedParser.on('end', () => {
      resolve(articles);
    });

    // Create readable stream from XML string
    const stream = new Readable();
    stream.push(feedXml);
    stream.push(null);
    stream.pipe(feedParser);
  });
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
 * Get feed name for notifications
 */
async function getFeedName(feedId: number): Promise<string> {
  try {
    const feed = await prisma.feedSource.findUnique({
      where: { id: feedId },
      select: { name: true }
    });
    return feed?.name || `Feed ${feedId}`;
  } catch {
    return `Feed ${feedId}`;
  }
}

console.log('[feed-worker] Worker started successfully');

export default feedWorker;