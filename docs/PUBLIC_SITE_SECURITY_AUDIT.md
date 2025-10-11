# Public Site Security Audit Report

**Date:** January 11, 2025
**Auditor:** Security Review
**Scope:** Public Marketing Site (`apps/public-site`)
**Environment:** Production Pre-Deployment

---

## Executive Summary

This security audit examines the Public Marketing Site before production deployment. The public-site is a server-side rendered (SSR) marketing site that:
- Serves public content (no authentication required)
- Fetches data from the main API server
- Proxies API requests to the main server
- Renders React components server-side with Vite

### Overall Security Posture: ⚠️ **REQUIRES IMMEDIATE ATTENTION**

**Critical Issues Found:** 3
**High Priority Issues:** 2
**Medium Priority Issues:** 3

---

## Critical Findings Summary

| Issue | Severity | Status | Location |
|-------|----------|--------|----------|
| Hardcoded URLs (no environment variables) | CRITICAL | ❌ | server.ts:30, 90-91, 219 |
| Missing security headers (no helmet) | CRITICAL | ❌ | server.ts:13 |
| No SSR XSS escaping | CRITICAL | ❌ | server.ts:74 |
| No rate limiting | HIGH | ❌ | Throughout |
| API proxy security issues | HIGH | ❌ | server.ts:25-45 |
| No error handling for SSR | MEDIUM | ⚠️ | server.ts:78-82 |
| No request logging | MEDIUM | ❌ | Throughout |
| No CORS configuration | MEDIUM | ⚠️ | server.ts:13 |

---

## 1. Architecture Overview

### Public Site Architecture

```
Client Request
     ↓
Express Server (port 5173)
     ↓
  ┌─────────────────┐
  │ Vite SSR        │
  │ Middleware      │
  └─────────────────┘
     ↓
  ┌─────────────────┐
  │ API Proxy       │ → Main Server (port 5000)
  │ /api/*          │
  └─────────────────┘
     ↓
  ┌─────────────────┐
  │ SSR Handler     │ → Fetch data from Main Server
  │ /*              │ → Render React components
  └─────────────────┘ → Return HTML
```

**Key Characteristics:**
- ✅ No authentication (public content only)
- ❌ No environment variables (hardcoded URLs)
- ❌ No security headers
- ❌ No rate limiting
- ⚠️ SSR with data injection

---

## 2. Critical Security Issues

### ❌ **CRITICAL** - Hardcoded URLs (No Environment Variables)

**Location:** `server.ts:30, 90-91, 219`

```typescript
// Line 30: API proxy - HARDCODED
const apiUrl = `http://127.0.0.1:5000${req.originalUrl}`;

// Line 90-91: Data fetching - HARDCODED
const clientAppUrl = 'http://127.0.0.1:3000';
const apiBaseUrl = 'http://127.0.0.1:5000/api';

// Line 219: Server port - HARDCODED
app.listen(5173, '127.0.0.1', () => {
  console.log('SSR server running at http://127.0.0.1:5173');
});
```

**Risk:**
- Cannot deploy to production without code changes
- Hardcoded localhost URLs won't work in production
- No way to configure different environments (dev/staging/prod)
- No port configuration flexibility

**Required Fix:**
```typescript
// Create apps/public-site/src/config/env.ts
interface EnvironmentConfig {
  NODE_ENV: string;
  PORT: number;
  API_BASE_URL: string;
  CLIENT_APP_URL: string;
}

function validateEnvironment(): EnvironmentConfig {
  const errors: string[] = [];

  const getRequired = (key: string): string => {
    const value = process.env[key];
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
      return '';
    }
    return value;
  };

  const config: EnvironmentConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5173', 10),
    API_BASE_URL: getRequired('API_BASE_URL'),
    CLIENT_APP_URL: getRequired('CLIENT_APP_URL'),
  };

  if (errors.length > 0) {
    console.error('\n❌ ENVIRONMENT VALIDATION FAILED:\n');
    errors.forEach((error) => console.error(`   ❌ ${error}`));
    throw new Error('Environment validation failed');
  }

  console.log(`✅ Public site environment validated (${config.NODE_ENV} mode)`);
  return config;
}

export const env = validateEnvironment();
export default env;
```

Then use:
```typescript
import env from './src/config/env.js';

// API proxy
const apiUrl = `${env.API_BASE_URL}${req.originalUrl}`;

// Data fetching
const clientAppUrl = env.CLIENT_APP_URL;
const apiBaseUrl = env.API_BASE_URL;

// Server port
app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`SSR server running at http://0.0.0.0:${env.PORT}`);
});
```

**Impact:** CRITICAL - Site cannot be deployed to production

---

### ❌ **CRITICAL** - Missing Security Headers

**Location:** `server.ts:13` (no middleware configured)

```typescript
async function createServer(): Promise<express.Application> {
  const app = express();
  // ❌ No security headers configured

  const vite: ViteDevServer = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  app.use(vite.middlewares);
  // ...
}
```

**Missing Headers:**
- ❌ `Content-Security-Policy` - Vulnerable to XSS
- ❌ `X-Frame-Options` - Vulnerable to clickjacking
- ❌ `X-Content-Type-Options` - Vulnerable to MIME sniffing
- ❌ `Strict-Transport-Security` - No HTTPS enforcement
- ❌ `Referrer-Policy` - Leaks referrer information

**Note:** Helmet is NOT installed in `package.json`!

**Required Fix:**
```bash
# Install helmet
npm install helmet --workspace=apps/public-site
```

```typescript
import helmet from 'helmet';
import env from './src/config/env.js';

async function createServer(): Promise<express.Application> {
  const app = express();

  // ✅ Add helmet configuration
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // React inline styles
        scriptSrc: ["'self'", "'unsafe-inline'"], // SSR inline scripts
        imgSrc: ["'self'", 'data:', 'https://fly.storage.tigris.dev'],
        connectSrc: ["'self'", env.API_BASE_URL],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: env.NODE_ENV === 'production',
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  }));

  // HTTPS redirect for production
  if (env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      if (req.header('x-forwarded-proto') !== 'https') {
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }

  // ... rest of middleware
}
```

**Impact:** CRITICAL - Exposes site to XSS, clickjacking, and other attacks

---

### ❌ **CRITICAL** - No SSR XSS Escaping

**Location:** `server.ts:74`

```typescript
// Inject the app HTML and server data
const html = template
  .replace(`<!--ssr-outlet-->`, appHtml)
  .replace(
    `<!--server-data-->`,
    `<script>window.__SERVER_DATA__ = ${JSON.stringify(serverData).replace(/</g, '\\<')}</script>`,
    // ❌ Only escapes <, but not other XSS vectors
  );
```

**Risk:**
The code only escapes `<` characters, but XSS can occur through:
- `</script>` tag injection
- Unicode escapes
- JSON injection
- Special characters in strings

**Example Attack:**
```typescript
// If API returns malicious data:
const maliciousData = {
  title: '</script><script>alert("XSS")</script><script>'
};

// Current code:
JSON.stringify(maliciousData).replace(/</g, '\\<')
// Result: '{"title":"\\</script>\\<script>alert(\\"XSS\\")\\</script>\\<script>"}'
// Still vulnerable! The closing </script> tags are escaped but the second one is not properly handled
```

**Required Fix:**
```typescript
// Proper serialization for script injection
function serializeServerData(data: ServerData): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/\//g, '\\u002f')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

// In SSR handler:
const html = template
  .replace(`<!--ssr-outlet-->`, appHtml)
  .replace(
    `<!--server-data-->`,
    `<script>window.__SERVER_DATA__ = ${serializeServerData(serverData)}</script>`,
  );
```

**Impact:** CRITICAL - Stored XSS via API data injection

---

## 3. High Priority Issues

### ❌ **HIGH** - No Rate Limiting

**Location:** Throughout (no rate limiting middleware)

**Missing Protection:**
```typescript
async function createServer(): Promise<express.Application> {
  const app = express();
  // ❌ No rate limiting

  // API proxy - no rate limiting
  app.use('/api/*', async (req, res, next) => {
    // Attacker can spam API requests
  });

  // SSR handler - no rate limiting
  app.use('*', async (req, res, next) => {
    // Attacker can spam SSR requests (expensive)
  });
}
```

**Attack Vectors:**
1. **SSR Flooding** - Spam SSR requests to exhaust server CPU
2. **API Proxy Flooding** - Spam proxied API requests
3. **Data Fetching DoS** - Trigger expensive data fetching operations

**SSR Performance Impact:**
- SSR is expensive (data fetching + React rendering + HTML serialization)
- No caching of rendered pages
- Each request triggers multiple API calls

**Required Fix:**

Install rate limiting:
```bash
npm install express-rate-limit --workspace=apps/public-site
```

Configure rate limiting:
```typescript
import rateLimit from 'express-rate-limit';

// General rate limit
const generalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for API proxy
const apiProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // 30 proxied requests per minute
  message: 'Too many API requests, please try again later',
});

async function createServer(): Promise<express.Application> {
  const app = express();

  // ... helmet setup ...

  // Apply rate limiting
  app.use(generalLimiter);

  // ... vite middleware ...

  // API proxy with stricter rate limit
  app.use('/api/*', apiProxyLimiter, async (req, res, next) => {
    // ... proxy logic ...
  });
}
```

**Impact:** HIGH - Server vulnerable to DoS attacks

---

### ⚠️ **HIGH** - API Proxy Security Issues

**Location:** `server.ts:25-45`

```typescript
app.use(
  '/api/*',
  async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      // ❌ ISSUE 1: Hardcoded API URL
      const apiUrl = `http://127.0.0.1:5000${req.originalUrl}`;

      const fetch = (await import('node-fetch')).default;

      // ❌ ISSUE 2: Headers forwarded without validation
      const response = await fetch(apiUrl, {
        method: req.method,
        headers: req.headers as Record<string, string>,
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        // ❌ ISSUE 3: No timeout configured
      });

      // ❌ ISSUE 4: No response size limit
      const data = await response.text();

      res.status(response.status).send(data);
    } catch (error) {
      console.error('API proxy error:', error);
      next(); // ❌ ISSUE 5: Silent failure, continues to next middleware
    }
  },
);
```

**Security Issues:**

1. **No Timeout** - Proxy requests can hang forever
2. **No Response Size Limit** - Can receive huge responses (memory exhaustion)
3. **Headers Not Filtered** - Forwards all headers including sensitive ones
4. **No Request Body Parsing** - `req.body` is undefined (Express not configured)
5. **Silent Error Handling** - Errors don't return proper responses

**Required Fix:**
```typescript
import express from 'express';

async function createServer(): Promise<express.Application> {
  const app = express();

  // ✅ Parse JSON bodies for API proxy
  app.use('/api/*', express.json({ limit: '100kb' }));

  // ... helmet and rate limiting ...

  // API proxy with security improvements
  app.use('/api/*', async (req, res, next) => {
    try {
      const apiUrl = `${env.API_BASE_URL}${req.originalUrl}`;

      // Filter sensitive headers
      const allowedHeaders = [
        'content-type',
        'accept',
        'accept-language',
        'user-agent',
        'authorization', // If auth is needed for API
      ];

      const filteredHeaders: Record<string, string> = {};
      for (const key of allowedHeaders) {
        if (req.headers[key]) {
          filteredHeaders[key] = req.headers[key] as string;
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      try {
        const response = await fetch(apiUrl, {
          method: req.method,
          headers: filteredHeaders,
          body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        // Check content length
        const contentLength = response.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
          return res.status(413).json({ error: 'Response too large' });
        }

        const data = await response.text();
        res.status(response.status)
          .set('Content-Type', response.headers.get('content-type') || 'application/json')
          .send(data);
      } catch (fetchError) {
        clearTimeout(timeout);
        if (fetchError.name === 'AbortError') {
          return res.status(504).json({ error: 'Gateway timeout' });
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('API proxy error:', error);
      res.status(502).json({ error: 'Bad gateway' });
    }
  });
}
```

**Impact:** HIGH - Proxy can be abused for DoS, information disclosure

---

## 4. Medium Priority Issues

### ⚠️ **MEDIUM** - No Error Handling for SSR

**Location:** `server.ts:78-82`

```typescript
} catch (e) {
  vite.ssrFixStacktrace(e as Error);
  console.error('SSR error:', e);
  next(e); // ❌ Passes error to Express error handler (which doesn't exist)
}
```

**Issues:**
1. No custom error handler defined
2. Errors exposed to users (stack traces in development)
3. No error logging/monitoring
4. No fallback HTML for SSR failures

**Required Fix:**
```typescript
async function createServer(): Promise<express.Application> {
  const app = express();

  // ... middleware ...

  // SSR handler with better error handling
  app.use('*', async (req, res, next) => {
    const url = req.originalUrl;

    try {
      // ... SSR logic ...
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      console.error('SSR error:', e);

      // Return error page instead of crashing
      if (env.NODE_ENV === 'production') {
        // Production: Return generic error page
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head><title>Error</title></head>
            <body>
              <h1>Something went wrong</h1>
              <p>Please try again later.</p>
            </body>
          </html>
        `);
      } else {
        // Development: Show error details
        res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head><title>SSR Error</title></head>
            <body>
              <h1>SSR Error</h1>
              <pre>${(e as Error).stack}</pre>
            </body>
          </html>
        `);
      }
    }
  });

  // Global error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}
```

**Impact:** MEDIUM - Poor user experience, potential information disclosure

---

### ⚠️ **MEDIUM** - No Request Logging

**Location:** Throughout

**Missing Features:**
- No access logs
- No error logs
- No performance monitoring
- No security event tracking

**Required Fix:**
```bash
npm install morgan --workspace=apps/public-site
```

```typescript
import morgan from 'morgan';

async function createServer(): Promise<express.Application> {
  const app = express();

  // Request logging
  if (env.NODE_ENV === 'production') {
    app.use(morgan('combined')); // Apache combined format
  } else {
    app.use(morgan('dev')); // Colored dev format
  }

  // ... rest of middleware ...
}
```

**Impact:** MEDIUM - Difficult to debug issues, detect attacks

---

### ⚠️ **MEDIUM** - No CORS Configuration

**Location:** `server.ts:13` (relies on Vite's default CORS)

**Current State:**
- Vite middleware handles CORS automatically
- Permissive in development
- Not explicitly configured

**Issue:**
While Vite provides some CORS protection, it's better to explicitly configure it for the API proxy and production use.

**Required Fix:**
```bash
npm install cors --workspace=apps/public-site
```

```typescript
import cors from 'cors';

async function createServer(): Promise<express.Application> {
  const app = express();

  // ... helmet ...

  // Explicit CORS configuration
  app.use(cors({
    origin: env.NODE_ENV === 'production'
      ? [env.CLIENT_APP_URL, env.ALLOWED_ORIGINS].filter(Boolean)
      : true, // Allow all in development
    credentials: true,
  }));

  // ... rest of middleware ...
}
```

**Impact:** MEDIUM - Potential for CORS-based attacks in production

---

## 5. Additional Security Concerns

### ⚠️ SSR Data Fetching Performance

**Location:** `server.ts:89-214`

**Concerns:**
1. **No Caching** - Every request fetches fresh data from API
2. **Multiple API Calls** - Landing page makes 5+ parallel API calls
3. **No Timeout** - Data fetching can hang
4. **No Circuit Breaker** - If API is down, all SSR requests fail

**Recommendation:**
```typescript
// Add simple in-memory cache
const dataCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute

async function fetchServerData(url: string): Promise<ServerData> {
  // Check cache
  const cached = dataCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    // Fetch data with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // ... fetch logic with signal: controller.signal ...

    clearTimeout(timeout);

    // Cache result
    dataCache.set(url, { data: baseData, timestamp: Date.now() });

    return baseData;
  } catch (error) {
    // Return cached data if available, even if stale
    if (cached) {
      console.warn('Using stale cache due to fetch error');
      return cached.data;
    }
    throw error;
  }
}
```

---

## 6. Positive Security Findings

### ✅ No Authentication System

- ✅ Site is intentionally public (correct for marketing site)
- ✅ No session management vulnerabilities
- ✅ No authentication bypass risks

### ✅ No User Input Processing

- ✅ Site only displays data (read-only)
- ✅ No form submissions
- ✅ No user-generated content
- ✅ Limited injection attack surface

### ✅ SSR Architecture

- ✅ SEO-friendly
- ✅ Fast initial page load
- ✅ No client-side routing vulnerabilities

---

## 7. Recommendations

### Immediate Actions (Before Production)

1. **Add Environment Variables** ❌ CRITICAL
   - Create `apps/public-site/src/config/env.ts`
   - Remove all hardcoded URLs
   - Fail fast if configuration missing

2. **Install and Configure Helmet** ❌ CRITICAL
   - Install helmet package
   - Configure comprehensive security headers
   - Add HTTPS redirect for production

3. **Fix SSR XSS** ❌ CRITICAL
   - Implement proper JSON serialization
   - Escape all special characters
   - Test with malicious data

4. **Add Rate Limiting** ❌ HIGH
   - Install express-rate-limit
   - Configure limits for SSR and API proxy
   - Add monitoring

5. **Secure API Proxy** ❌ HIGH
   - Add timeout configuration
   - Filter headers
   - Add response size limits
   - Parse request bodies
   - Proper error handling

6. **Add Request Logging** ⚠️ MEDIUM
   - Install morgan
   - Log all requests
   - Monitor errors

### Post-Launch Improvements

1. **Add Caching** (MEDIUM priority)
   - In-memory cache for SSR data
   - Cache-Control headers
   - CDN integration

2. **Add Monitoring** (MEDIUM priority)
   - Error tracking (Sentry)
   - Performance monitoring (DataDog)
   - Uptime monitoring

3. **Add Health Checks** (LOW priority)
   - `/health` endpoint
   - Dependency checks
   - Kubernetes probes

---

## 8. Security Checklist

### Environment & Configuration
- [ ] Create environment validation module
- [ ] Remove all hardcoded URLs
- [ ] Add PORT configuration
- [ ] Add API_BASE_URL configuration
- [ ] Add CLIENT_APP_URL configuration

### Security Headers & HTTPS
- [ ] Install helmet package
- [ ] Configure helmet middleware
- [ ] Add CSP headers
- [ ] Add HTTPS redirect in production

### SSR Security
- [ ] Fix JSON serialization for XSS prevention
- [ ] Add error handling for SSR failures
- [ ] Add fallback HTML for errors

### API Proxy Security
- [ ] Add request body parsing
- [ ] Add timeout configuration
- [ ] Filter forwarded headers
- [ ] Add response size limits
- [ ] Improve error handling

### Rate Limiting & DoS Protection
- [ ] Install express-rate-limit
- [ ] Add general rate limiter
- [ ] Add API proxy rate limiter
- [ ] Add request logging

### Monitoring & Logging
- [ ] Install morgan for access logs
- [ ] Add error logging
- [ ] Add performance monitoring

---

## 9. Testing Recommendations

### Security Testing Checklist

1. **Environment Validation Testing**
   ```bash
   # Test: Start without environment variables
   unset API_BASE_URL
   npm -w apps/public-site run dev

   # Expected: Server crashes with clear error
   ```

2. **Security Headers Testing**
   ```bash
   # Test: Check headers in production mode
   NODE_ENV=production npm -w apps/public-site run dev

   curl -I http://localhost:5173/

   # Expected: See helmet headers
   ```

3. **XSS Testing**
   ```bash
   # Test: Inject malicious data via API mock
   # Check that script tags are properly escaped
   ```

4. **Rate Limiting Testing**
   ```bash
   # Test: Spam requests
   for i in {1..100}; do
     curl http://localhost:5173/ &
   done

   # Expected: Rate limit errors after threshold
   ```

---

## Appendix A: Environment Variables Required

```bash
# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC SITE ENVIRONMENT VARIABLES (REQUIRED)
# ══════════════════════════════════════════════════════════════════════════════

# Application Configuration
NODE_ENV=development  # or 'production'
PORT=5173

# API Configuration (REQUIRED - NO FALLBACK)
API_BASE_URL=http://localhost:5000

# Client App URL (REQUIRED - NO FALLBACK)
CLIENT_APP_URL=http://localhost:3000

# Optional: Additional allowed CORS origins
# ALLOWED_ORIGINS=https://example.com,https://www.example.com
```

---

## Appendix B: Files Requiring Changes

| File | Changes Required | Priority |
|------|-----------------|----------|
| `apps/public-site/src/config/env.ts` | NEW - Environment validation | CRITICAL |
| `apps/public-site/server.ts` | Add helmet, rate limiting, fix XSS, use env vars | CRITICAL |
| `apps/public-site/package.json` | Install helmet, express-rate-limit, cors, morgan | CRITICAL |
| `.env.example` | Add public-site configuration section | HIGH |

---

**Report Generated:** January 11, 2025
**Next Review:** Recommended after implementation of all CRITICAL fixes

**Security Contact:** Report any security issues immediately.

---

**END OF REPORT**
