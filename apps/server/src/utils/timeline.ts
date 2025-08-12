// apps/server/src/utils/timeline.ts
/**
 * Timeline utility functions
 */

/**
 * Extract domain from URL for display purposes
 */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return 'Unknown';
  }
}

/**
 * Generate missing article excerpt from content
 */
export function generateExcerpt(content: string, maxLength: number = 200): string {
  if (!content) return '';
  
  // Strip HTML tags if present
  const plainText = content.replace(/<[^>]*>/g, '');
  
  if (plainText.length <= maxLength) {
    return plainText;
  }
  
  // Find the last complete word within the limit
  const truncated = plainText.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }
  
  return truncated + '...';
}

/**
 * Validate article ID parameter
 */
export function validateArticleId(id: string): number | null {
  const parsed = parseInt(id);
  return isNaN(parsed) ? null : parsed;
}