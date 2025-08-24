// apps/server/src/middleware/csrf.ts
// -----------------------------------------------------------------------------
// CSRF Protection Middleware - SPA Token-Based Stance
// -----------------------------------------------------------------------------

import type { Request, Response, NextFunction } from 'express';
import type { CSRFConfig } from '@ems/types';

// Default CSRF configuration (currently disabled for SPA token-based approach)
const defaultCSRFConfig: CSRFConfig = {
  enabled: false, // Disabled: SPA uses JWT Bearer tokens which provide CSRF protection
  tokenHeader: 'X-CSRF-Token',
  cookieName: 'csrf-token',
  exemptPaths: ['/api/auth/login', '/api/auth/register', '/api/health'],
};

/**
 * CSRF Protection Middleware (Currently Disabled)
 *
 * This application uses a SPA (Single Page Application) architecture with JWT Bearer tokens
 * in Authorization headers, which provides inherent CSRF protection because:
 *
 * 1. Bearer tokens in Authorization headers cannot be sent by malicious sites
 *    via simple form submissions or XMLHttpRequest from different origins
 * 2. The Same-Origin Policy prevents malicious sites from reading tokens
 * 3. CORS policies restrict cross-origin requests to our API
 *
 * Traditional CSRF tokens are primarily needed for cookie-based authentication
 * where browsers automatically include cookies in cross-origin requests.
 */
export function csrfProtection(config: CSRFConfig = defaultCSRFConfig) {
  return (_req: Request, _res: Response, next: NextFunction) => {
    if (!config.enabled) {
      // CSRF protection disabled - relying on JWT Bearer token security model
      return next();
    }

    // Future implementation: CSRF token validation would go here
    // This is a placeholder for potential future CSRF requirements
    next();
  };
}
