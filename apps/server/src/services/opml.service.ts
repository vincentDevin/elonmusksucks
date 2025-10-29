import { FeedService } from './feed.service';
import { parseOpmlString, generateOpmlXml, OPMLFeed, OPMLDocument } from '../utils/opml';
import type { OPMLImportResult } from '@ems/types';

// Define OPMLValidationResult locally since it's not in types yet
interface OPMLValidationResult {
  valid: boolean;
  message: string;
  feedCount: number;
  issues: string[];
  feeds: Array<{
    name: string;
    url: string;
    category?: string;
    isDuplicate: boolean;
    hasIssues: boolean;
  }>;
}

export class OPMLService {
  private feedService: FeedService;

  constructor() {
    this.feedService = new FeedService();
  }

  /**
   * Import feeds from OPML content
   */
  async importFromOPML(request: {
    content: string;
    overwriteExisting?: boolean;
    preserveCategories?: boolean;
  }): Promise<OPMLImportResult> {
    const { content, overwriteExisting = false } = request;
    // Note: preserveCategories will be used when feed categories are implemented

    try {
      // Parse OPML content
      const parsedFeeds = await parseOpmlString(content);

      if (parsedFeeds.length === 0) {
        return {
          totalFeeds: 0,
          importedFeeds: 0,
          skippedFeeds: 0,
          failedFeeds: 0,
          errors: [],
          importedFeedIds: [],
          processedAt: new Date().toISOString(),
        };
      }

      // Get existing feeds to check for duplicates
      const existingFeeds = await this.feedService.listFeeds();
      const existingUrls = new Set(existingFeeds.map((feed) => feed.url));

      const results: OPMLImportResult = {
        totalFeeds: parsedFeeds.length,
        importedFeeds: 0,
        skippedFeeds: 0,
        failedFeeds: 0,
        errors: [],
        importedFeedIds: [],
        processedAt: new Date().toISOString(),
      };

      // Process each feed
      for (const opmlFeed of parsedFeeds) {
        try {
          // Check if feed already exists
          if (existingUrls.has(opmlFeed.url) && !overwriteExisting) {
            results.skippedFeeds++;
            continue;
          }

          // Create or update feed
          const feedData = {
            name: opmlFeed.name,
            url: opmlFeed.url,
            siteUrl: opmlFeed.siteUrl || null,
            allowImages: true, // Default to allowing images
            // TODO: Add category support when we implement feed categories
          };

          const createdFeed = await this.feedService.createFeed(feedData);

          results.importedFeeds++;
          results.importedFeedIds.push(createdFeed.id);
        } catch (error) {
          results.failedFeeds++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          results.errors.push({
            feedUrl: opmlFeed.url,
            error: errorMessage,
          });
        }
      }

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        totalFeeds: 0,
        importedFeeds: 0,
        skippedFeeds: 0,
        failedFeeds: 0,
        errors: [{ feedUrl: 'unknown', error: errorMessage }],
        importedFeedIds: [],
        processedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Export current feeds to OPML format
   */
  async exportToOPML(): Promise<string> {
    try {
      const feeds = await this.feedService.listFeeds();

      // Convert feeds to OPML format
      const opmlFeeds: OPMLFeed[] = feeds.map((feed) => ({
        name: feed.name,
        url: feed.url,
        siteUrl: feed.siteUrl || undefined,
        // TODO: Add category when we implement feed categories
        category: undefined,
      }));

      // Create OPML document
      const opmlDocument: OPMLDocument = {
        title: 'Elon Musk Sucks - RSS Feeds',
        dateCreated: new Date(),
        feeds: opmlFeeds,
      };

      // Generate OPML XML
      const opmlXml = generateOpmlXml(opmlDocument);
      return opmlXml;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to export OPML: ${errorMessage}`);
    }
  }

  /**
   * Validate OPML content without importing
   */
  async validateOPML(content: string): Promise<OPMLValidationResult> {
    try {
      const parsedFeeds = await parseOpmlString(content);

      if (parsedFeeds.length === 0) {
        return {
          valid: false,
          message: 'No valid feeds found in OPML file',
          feedCount: 0,
          issues: ['No feeds found in OPML content'],
          feeds: [],
        };
      }

      // Get existing feeds to check for duplicates
      const existingFeeds = await this.feedService.listFeeds();
      const existingUrls = new Set(existingFeeds.map((feed) => feed.url));

      const issues: string[] = [];
      let duplicateCount = 0;

      // Check each feed for issues
      const feedSummary = parsedFeeds.map((feed) => {
        const isDuplicate = existingUrls.has(feed.url);
        if (isDuplicate) {
          duplicateCount++;
        }

        // Basic URL validation
        let hasIssues = false;
        if (!feed.url.startsWith('http://') && !feed.url.startsWith('https://')) {
          issues.push(`Invalid URL for feed "${feed.name}": ${feed.url}`);
          hasIssues = true;
        }

        return {
          name: feed.name,
          url: feed.url,
          category: feed.category,
          isDuplicate,
          hasIssues,
        };
      });

      if (duplicateCount > 0) {
        issues.push(`${duplicateCount} feeds already exist and would be skipped`);
      }

      return {
        valid: true,
        message: `Found ${parsedFeeds.length} feeds${duplicateCount > 0 ? ` (${duplicateCount} duplicates)` : ''}`,
        feedCount: parsedFeeds.length,
        issues,
        feeds: feedSummary,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        message: `Invalid OPML format: ${errorMessage}`,
        feedCount: 0,
        issues: [errorMessage],
        feeds: [],
      };
    }
  }
}
