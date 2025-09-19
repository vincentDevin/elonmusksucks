// apps/server/src/workers/article.worker.ts
import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import redisClient from '../lib/redis';

// Configurable concurrency to keep CPU saturation <70%
const ARTICLE_CONCURRENCY = parseInt(process.env.WORKER_ARTICLE_CONCURRENCY || '5');
import type { Job } from 'bullmq';
import type { ArticleProcessingJob } from '@ems/types';
import ogs from 'open-graph-scraper';

const prisma = new PrismaClient();

// Job data interfaces
interface ArticleEnrichmentData extends ArticleProcessingJob {
  articleId: number;
  extractImages?: boolean;
  generateTags?: boolean;
}

interface BulkTaggingData {
  articleIds: number[];
  rules: Array<{
    pattern: string;
    tags: string[];
    field: 'title' | 'excerpt' | 'url';
  }>;
}

/**
 * Article Processing Worker
 * Handles article enrichment, tagging, and metadata extraction
 */
const articleWorker = new Worker(
  'article',
  async (job: Job<ArticleEnrichmentData | BulkTaggingData>) => {
    console.log(`[article-worker] Processing job ${job.name} with ID ${job.id}`);

    try {
      switch (job.name) {
        case 'enrich':
          return await processArticleEnrichment(job as Job<ArticleEnrichmentData>);

        case 'bulk-tag':
          return await processBulkTagging(job as Job<BulkTaggingData>);

        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    } catch (error) {
      console.error(`[article-worker] Job ${job.id} failed:`, error);
      throw error;
    }
  },
  {
    connection: redisClient,
    concurrency: ARTICLE_CONCURRENCY, // Process articles with controlled concurrency
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
);

/**
 * Process article enrichment (OG extraction, image processing, tagging)
 */
async function processArticleEnrichment(job: Job<ArticleEnrichmentData>): Promise<{
  enriched: boolean;
  tagsAdded: string[];
  imageUrl?: string;
  errors: string[];
}> {
  const { articleId, extractImages, generateTags } = job.data;
  const errors: string[] = [];
  const tagsAdded: string[] = [];
  let imageUrl: string | undefined;
  let enriched = false;

  console.log(`[article-worker] Enriching article ${articleId}`);

  try {
    // 1. Fetch article from database
    const article = await prisma.article.findUnique({
      where: { id: articleId },
      include: { feed: true },
    });

    if (!article) {
      throw new Error(`Article ${articleId} not found`);
    }

    await job.updateProgress(10);

    // 2. Extract Open Graph metadata
    let ogData: any = null;
    if (extractImages || !article.leadImageUrl || !article.excerpt) {
      try {
        console.log(`[article-worker] Extracting OG data for: ${article.url}`);

        const ogResult = await ogs({
          url: article.url,
          timeout: 15000,
          fetchOptions: {
            headers: {
              'User-Agent': 'elonmusksucks.net/1.0 Article Enricher (+https://elonmusksucks.net)',
            },
          },
          onlyGetOpenGraphInfo: false,
          customMetaTags: [
            {
              multiple: false,
              property: 'article:published_time',
              fieldName: 'articlePublishedTime',
            },
            {
              multiple: false,
              property: 'twitter:image',
              fieldName: 'twitterImage',
            },
          ],
        });

        if (ogResult.result) {
          ogData = ogResult.result;
          console.log(`[article-worker] Extracted OG data:`, {
            title: ogData.ogTitle,
            description: ogData.ogDescription,
            image: ogData.ogImage?.[0]?.url,
            siteName: ogData.ogSiteName,
          });
        }
      } catch (ogError) {
        console.warn(`[article-worker] OG extraction failed for ${article.url}:`, ogError);
        errors.push(
          `OG extraction failed: ${ogError instanceof Error ? ogError.message : 'Unknown error'}`,
        );
      }
    }

    await job.updateProgress(40);

    // 3. Prepare updates
    const updates: any = {};
    let hasUpdates = false;

    // Update lead image if missing and we found one
    if (extractImages && !article.leadImageUrl && ogData?.ogImage?.[0]?.url) {
      updates.leadImageUrl = ogData.ogImage[0].url;
      imageUrl = updates.leadImageUrl;
      hasUpdates = true;
    }

    // Update excerpt if empty and we have OG description
    if (!article.excerpt && ogData?.ogDescription) {
      updates.excerpt = ogData.ogDescription.substring(0, 500); // Limit to 500 chars
      hasUpdates = true;
    }

    // Update canonical URL if we have a better one
    if (ogData?.ogUrl && ogData.ogUrl !== article.url) {
      updates.canonicalUrl = ogData.ogUrl;
      hasUpdates = true;
    }

    await job.updateProgress(60);

    // 4. Generate enhanced tags
    if (generateTags) {
      const existingTags = new Set(article.tags);
      const newTags = generateEnhancedTags(
        article.title,
        article.excerpt || updates.excerpt,
        article.url,
        ogData,
      );

      // Add only new tags
      for (const tag of newTags) {
        if (!existingTags.has(tag)) {
          tagsAdded.push(tag);
          existingTags.add(tag);
        }
      }

      if (tagsAdded.length > 0) {
        updates.tags = Array.from(existingTags);
        hasUpdates = true;
      }
    }

    await job.updateProgress(80);

    // 5. Update article record
    if (hasUpdates) {
      await prisma.article.update({
        where: { id: articleId },
        data: updates,
      });
      enriched = true;
      console.log(`[article-worker] Updated article ${articleId} with:`, Object.keys(updates));
    }

    await job.updateProgress(100);

    console.log(
      `[article-worker] Enriched article ${articleId}: ${tagsAdded.length} tags added, ${imageUrl ? 'image extracted' : 'no image'}`,
    );
  } catch (error) {
    console.error(`[article-worker] Error enriching article ${articleId}:`, error);
    errors.push(error instanceof Error ? error.message : 'Unknown enrichment error');
  }

  return {
    enriched,
    tagsAdded,
    imageUrl,
    errors,
  };
}

/**
 * Process bulk article tagging with regex rules
 */
async function processBulkTagging(job: Job<BulkTaggingData>): Promise<{
  processed: number;
  tagged: number;
  errors: string[];
}> {
  const { articleIds } = job.data;

  console.log(`[article-worker] Bulk tagging ${articleIds.length} articles`);

  // TODO: Implement bulk tagging
  // 1. Fetch articles by IDs
  // 2. Apply regex rules to title/excerpt/url
  // 3. Batch update articles with new tags
  // 4. Return statistics

  return {
    processed: 0,
    tagged: 0,
    errors: ['Bulk tagging not yet implemented'],
  };
}

// Log configured concurrency on startup
console.log(`[article-worker] Configured concurrency: ${ARTICLE_CONCURRENCY}`);

// Event handlers
articleWorker.on('completed', (job) => {
  console.log(`[article-worker] Job ${job.id} completed successfully`);
});

articleWorker.on('failed', (job, err) => {
  console.error(`[article-worker] Job ${job?.id} failed:`, err);
});

articleWorker.on('error', (err) => {
  console.error('[article-worker] Worker error:', err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[article-worker] Received SIGTERM, closing worker...');
  await articleWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[article-worker] Received SIGINT, closing worker...');
  await articleWorker.close();
  process.exit(0);
});

// ===============================================
// Helper Functions
// ===============================================

/**
 * Generate enhanced tags using article content and Open Graph data
 */
function generateEnhancedTags(
  title: string,
  excerpt?: string,
  url?: string,
  ogData?: any,
): string[] {
  const tags: string[] = [];
  const content =
    `${title} ${excerpt || ''} ${url || ''} ${ogData?.ogSiteName || ''}`.toLowerCase();

  // Tesla-related tags (more comprehensive)
  if (
    /tesla|model [3sxy]|cybertruck|supercharger|autopilot|fsd|full self.driving|gigafactory|powerwall|solar roof/i.test(
      content,
    )
  ) {
    tags.push('tesla');
  }

  // SpaceX-related tags (more comprehensive)
  if (/spacex|falcon|dragon|starship|starlink|raptor|mars|rocket|launch|satellite/i.test(content)) {
    tags.push('spacex');
  }

  // X/Twitter-related tags
  if (/twitter|\bx\.com|tweet|elon.*social|blue check|verification/i.test(content)) {
    tags.push('x-twitter');
  }

  // Neuralink tags
  if (/neuralink|brain.*chip|neural.*implant|bci|brain.*computer/i.test(content)) {
    tags.push('neuralink');
  }

  // Boring Company tags
  if (/boring company|tunnel|hyperloop|underground/i.test(content)) {
    tags.push('boring-company');
  }

  // Legal/regulatory tags
  if (/lawsuit|court|sec|settlement|judge|legal|regulation|ftc|doj/i.test(content)) {
    tags.push('legal');
  }

  // Market/financial tags
  if (/stock|shares|market|earnings|revenue|profit|loss|nasdaq|valuation/i.test(content)) {
    tags.push('markets');
  }

  // AI-related tags
  if (/artificial intelligence|\bai\b|neural|machine learning|grok|chatgpt|openai/i.test(content)) {
    tags.push('ai');
  }

  // Cryptocurrency tags
  if (/dogecoin|bitcoin|crypto|blockchain|doge/i.test(content)) {
    tags.push('crypto');
  }

  // Leadership/management tags
  if (/ceo|leadership|management|workplace|employees|layoffs|hiring/i.test(content)) {
    tags.push('leadership');
  }

  // Controversy/drama tags
  if (/controversy|scandal|drama|feud|backlash|criticism|protest/i.test(content)) {
    tags.push('controversy');
  }

  // Innovation/technology tags
  if (/innovation|breakthrough|technology|patent|research|development/i.test(content)) {
    tags.push('tech-innovation');
  }

  // Environmental tags
  if (/climate|environment|green|sustainable|carbon|emissions|renewable/i.test(content)) {
    tags.push('environment');
  }

  // Government/politics tags
  if (/government|politics|biden|trump|congress|senate|white house|policy/i.test(content)) {
    tags.push('politics');
  }

  // Site-specific tags based on publisher
  if (ogData?.ogSiteName) {
    const siteName = ogData.ogSiteName.toLowerCase();
    if (/electrek|teslarati|insideevs/i.test(siteName)) {
      tags.push('tesla-news');
    }
    if (/spacenews|nasa/i.test(siteName)) {
      tags.push('space-news');
    }
    if (/techcrunch|verge|ars technica|wired/i.test(siteName)) {
      tags.push('tech-news');
    }
  }

  // Sentiment analysis (basic)
  if (/positive|good|great|success|win|breakthrough|achievement/i.test(content)) {
    tags.push('positive');
  }
  if (/negative|bad|failure|problem|issue|concern|crisis/i.test(content)) {
    tags.push('negative');
  }

  // Priority/importance indicators
  if (/breaking|urgent|exclusive|first|major|significant/i.test(title.toLowerCase())) {
    tags.push('breaking');
  }

  // If no specific tags found, add general tag
  if (tags.length === 0) {
    tags.push('general');
  }

  return [...new Set(tags)]; // Remove duplicates
}

console.log('[article-worker] Worker started successfully');

export default articleWorker;
