// apps/server/src/utils/opml.ts
import { parseString } from 'xml2js';
import { promisify } from 'util';

const parseXml = promisify(parseString);

/**
 * OPML Parser and Generator utilities
 */

export interface OPMLFeed {
  name: string;
  url: string;
  siteUrl?: string;
  category?: string;
}

export interface OPMLDocument {
  title: string;
  dateCreated: Date;
  feeds: OPMLFeed[];
}

/**
 * Parse OPML XML string and extract feed information
 */
export async function parseOpmlString(opmlXml: string): Promise<OPMLFeed[]> {
  try {
    const result = await parseXml(opmlXml, {
      explicitArray: false,
      ignoreAttrs: false,
      mergeAttrs: true,
    });

    if (!result.opml || !result.opml.body || !result.opml.body.outline) {
      throw new Error('Invalid OPML structure');
    }

    const outlines = Array.isArray(result.opml.body.outline)
      ? result.opml.body.outline
      : [result.opml.body.outline];

    const feeds: OPMLFeed[] = [];

    // Recursively extract feeds from outline structure
    function extractFeeds(outline: any, category?: string) {
      if (Array.isArray(outline)) {
        outline.forEach((item) => extractFeeds(item, category));
        return;
      }

      // If outline has xmlUrl, it's a feed
      if (outline.xmlUrl) {
        feeds.push({
          name: outline.title || outline.text || 'Unnamed Feed',
          url: outline.xmlUrl,
          siteUrl: outline.htmlUrl,
          category,
        });
      }

      // If outline has children, recursively process them
      if (outline.outline) {
        const childCategory = outline.title || outline.text || category;
        extractFeeds(outline.outline, childCategory);
      }
    }

    extractFeeds(outlines);

    return feeds.filter((feed) => feed.url); // Only return feeds with valid URLs
  } catch (error) {
    console.error('[opml] Error parsing OPML:', error);
    throw new Error(
      `Failed to parse OPML: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Generate OPML XML from feed data
 */
export function generateOpmlXml(document: OPMLDocument): string {
  const { title, dateCreated, feeds } = document;

  // Group feeds by category
  const categorized = new Map<string, OPMLFeed[]>();
  const uncategorized: OPMLFeed[] = [];

  feeds.forEach((feed) => {
    if (feed.category) {
      if (!categorized.has(feed.category)) {
        categorized.set(feed.category, []);
      }
      categorized.get(feed.category)!.push(feed);
    } else {
      uncategorized.push(feed);
    }
  });

  // Build outline elements
  let outlineXml = '';

  // Add categorized feeds
  for (const [category, categoryFeeds] of categorized.entries()) {
    outlineXml += `    <outline text="${escapeXml(category)}" title="${escapeXml(category)}">\n`;

    categoryFeeds.forEach((feed) => {
      outlineXml += `      <outline text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" type="rss" xmlUrl="${escapeXml(feed.url)}"`;
      if (feed.siteUrl) {
        outlineXml += ` htmlUrl="${escapeXml(feed.siteUrl)}"`;
      }
      outlineXml += '/>\n';
    });

    outlineXml += '    </outline>\n';
  }

  // Add uncategorized feeds
  uncategorized.forEach((feed) => {
    outlineXml += `    <outline text="${escapeXml(feed.name)}" title="${escapeXml(feed.name)}" type="rss" xmlUrl="${escapeXml(feed.url)}"`;
    if (feed.siteUrl) {
      outlineXml += ` htmlUrl="${escapeXml(feed.siteUrl)}"`;
    }
    outlineXml += '/>\n';
  });

  // Generate full OPML document
  const opmlXml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>${escapeXml(title)}</title>
    <dateCreated>${dateCreated.toUTCString()}</dateCreated>
    <dateModified>${new Date().toUTCString()}</dateModified>
    <ownerName>elonmusksucks.net</ownerName>
    <ownerEmail>admin@elonmusksucks.net</ownerEmail>
  </head>
  <body>
${outlineXml}  </body>
</opml>`;

  return opmlXml;
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
