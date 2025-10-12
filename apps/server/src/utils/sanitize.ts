// apps/server/src/utils/sanitize.ts
// -----------------------------------------------------------------------------
// XSS Protection - HTML/Content Sanitization Utilities
// -----------------------------------------------------------------------------

import DOMPurify from 'isomorphic-dompurify';
import type { Config } from 'dompurify';

/**
 * Sanitization configuration profiles
 */
const SANITIZE_CONFIG: Record<string, Config> = {
  // Strict: Only plain text, no HTML allowed
  PLAIN_TEXT: {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Basic: Allow simple text formatting
  BASIC_HTML: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  },

  // Rich: Allow links and formatted text
  RICH_HTML: {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'b', 'i', 'u', 'a', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
    KEEP_CONTENT: true,
    // Force safe link handling
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  },
};

/**
 * Sanitize user input to prevent XSS attacks
 * Default: Plain text only (strictest)
 */
export function sanitizeContent(
  content: string,
  options: {
    profile?: keyof typeof SANITIZE_CONFIG;
    customConfig?: Parameters<typeof DOMPurify.sanitize>[1];
  } = {},
): string {
  if (!content) return '';

  const { profile = 'PLAIN_TEXT', customConfig } = options;

  // Get base configuration from profile
  const config = customConfig || SANITIZE_CONFIG[profile];

  // Sanitize the content
  const sanitized = DOMPurify.sanitize(content, config);

  // Additional protection: Remove any remaining script event handlers
  // (DOMPurify should handle this, but defense in depth)
  return sanitized
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers like onclick
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
}

/**
 * Sanitize post/comment content
 * Allows basic HTML formatting but no scripts or dangerous content
 */
export function sanitizePostContent(content: string): string {
  return sanitizeContent(content, {
    profile: 'BASIC_HTML',
  });
}

/**
 * Sanitize chat messages
 * Plain text only, no HTML
 */
export function sanitizeChatMessage(content: string): string {
  return sanitizeContent(content, {
    profile: 'PLAIN_TEXT',
  });
}

/**
 * Sanitize username (very strict)
 * Alphanumeric, spaces, underscores, hyphens only
 */
export function sanitizeUsername(username: string): string {
  // First sanitize with DOMPurify
  const sanitized = sanitizeContent(username, { profile: 'PLAIN_TEXT' });

  // Then apply additional restrictions
  return sanitized
    .replace(/[^a-zA-Z0-9 _-]/g, '') // Only allow alphanumeric, space, underscore, hyphen
    .trim()
    .substring(0, 50); // Max length
}

/**
 * Sanitize email (validation + sanitization)
 */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeContent(email, { profile: 'PLAIN_TEXT' });
  return sanitized.toLowerCase().trim();
}

/**
 * Batch sanitize multiple items
 */
export function sanitizeBatch<T extends Record<string, any>>(
  items: T[],
  fieldMap: Record<keyof T, 'post' | 'chat' | 'username' | 'plain'>,
): T[] {
  return items.map((item) => {
    const sanitized = { ...item };

    for (const [field, type] of Object.entries(fieldMap) as [keyof T, string][]) {
      const value = item[field];
      if (typeof value !== 'string') continue;

      switch (type) {
        case 'post':
          sanitized[field] = sanitizePostContent(value) as any;
          break;
        case 'chat':
          sanitized[field] = sanitizeChatMessage(value) as any;
          break;
        case 'username':
          sanitized[field] = sanitizeUsername(value) as any;
          break;
        case 'plain':
        default:
          sanitized[field] = sanitizeContent(value) as any;
      }
    }

    return sanitized;
  });
}

/**
 * Check if content contains potentially dangerous patterns
 * Returns true if content looks suspicious (for logging/monitoring)
 */
export function containsSuspiciousContent(content: string): boolean {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i,
    /vbscript:/i,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(content));
}

/**
 * Sanitize with logging for suspicious content
 * Useful for detecting attack attempts
 */
export function sanitizeWithMonitoring(content: string, userId?: number, context?: string): string {
  // Check for suspicious content before sanitization
  if (containsSuspiciousContent(content)) {
    console.warn('[SECURITY] Suspicious content detected', {
      userId,
      context,
      contentPreview: content.substring(0, 100),
      timestamp: new Date().toISOString(),
    });
  }

  return sanitizePostContent(content);
}

// Export configuration for reference
export { SANITIZE_CONFIG };
