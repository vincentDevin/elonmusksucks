import express from 'express';
import { createServer as createViteServer, ViteDevServer } from 'vite';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import morgan from 'morgan';
import env from './src/config/env.js';
import {
  IPBanningService,
  createIPBanMiddleware,
  create404TrackerMiddleware,
  createRateLimitTrackerMiddleware,
} from './src/middleware/ipBanning.js';
import type {
  PredictionView,
  LeaderboardEntryView,
  UnifiedActivityEvent,
  PongLeaderboardView,
  PublicArticle,
  PublicPostView,
} from '@ems/types';

// ServerData interface for public site
interface ServerData {
  trendingData: PredictionView[] | null;
  leaderboardData: LeaderboardEntryView[] | null;
  pongLeaderboardData: PongLeaderboardView[] | null;
  activityData: UnifiedActivityEvent[] | null;
  articlesData: PublicArticle[] | null;
  postsData: PublicPostView[] | null;
  predictionsData: PredictionView[] | null;
  fullLeaderboardData: LeaderboardEntryView[] | null;
  clientAppUrl: string;
  currentPath: string;
  is404?: boolean;
}

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ══════════════════════════════════════════════════════════════════════════════
// Security Helper Functions
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Safely serialize data for injection into HTML
 * Prevents XSS attacks through proper JSON escaping
 */
function serializeForHTML(data: unknown): string {
  const json = JSON.stringify(data);
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function createServer(): Promise<express.Application> {
  const app = express();

  // ──────────────────────────────────────────────────────────────────────────
  // IP Banning Service Setup
  // ──────────────────────────────────────────────────────────────────────────

  // Parse IP whitelist from environment (comma-separated)
  const whitelistedIPs = env.IP_WHITELIST
    ? env.IP_WHITELIST.split(',')
        .map((ip) => ip.trim())
        .filter((ip) => ip)
    : [];

  const ipBanService = new IPBanningService(env.REDIS_URL, whitelistedIPs);

  // Cleanup on shutdown
  process.on('SIGTERM', async () => {
    console.log('[IP_BAN] Disconnecting from Redis...');
    await ipBanService.disconnect();
  });

  process.on('SIGINT', async () => {
    console.log('[IP_BAN] Disconnecting from Redis...');
    await ipBanService.disconnect();
    process.exit(0);
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Security Middleware
  // ──────────────────────────────────────────────────────────────────────────

  // Request logging (before other middleware)
  if (env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('dev'));
  }

  // Health check endpoint (early in chain)
  app.get('/health', (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Static Assets (MUST be before CORS to avoid blocking)
  // ──────────────────────────────────────────────────────────────────────────

  if (env.NODE_ENV === 'production') {
    // Production: Serve pre-built static assets with no CORS restrictions
    const sirv = (await import('sirv')).default;

    // Serve hashed JS/CSS assets with long-term cache
    app.use(
      '/assets',
      sirv(path.resolve(__dirname, 'dist/client/assets'), {
        maxAge: 31536000, // 1 year cache for hashed assets
        immutable: true,
        setHeaders: (res) => {
          // Allow assets to be loaded from any origin
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET');
        },
      }),
    );

    // Serve specific SEO files (favicon, robots.txt, sitemap.xml, manifest.json)
    // Using express.static with specific routes to avoid interfering with SSR
    const staticOptions = {
      maxAge: '1d', // 24 hours cache
      immutable: false,
    };

    const distClientPath = path.resolve(__dirname, 'dist/client');

    // Favicon files
    app.get('/favicon.ico', express.static(distClientPath, staticOptions));
    app.get('/favicon-16x16.png', express.static(distClientPath, staticOptions));
    app.get('/favicon-32x32.png', express.static(distClientPath, staticOptions));
    app.get('/favicon-96x96.png', express.static(distClientPath, staticOptions));
    app.get('/favicon-192x192.png', express.static(distClientPath, staticOptions));
    app.get('/favicon-512x512.png', express.static(distClientPath, staticOptions));
    app.get('/favicon.svg', express.static(distClientPath, staticOptions));
    app.get('/apple-touch-icon.png', express.static(distClientPath, staticOptions));

    // SEO files
    app.get('/robots.txt', express.static(distClientPath, staticOptions));
    app.get('/sitemap.xml', express.static(distClientPath, staticOptions));
    app.get('/manifest.json', express.static(distClientPath, staticOptions));

    console.log(`[STATIC] Serving assets from: ${path.resolve(__dirname, 'dist/client/assets')}`);
    console.log(`[STATIC] Serving SEO files (favicon, robots, sitemap, manifest)`);
  }

  // HTTPS redirect for production (exclude health check, assets, and SEO files)
  if (env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
      // Allow health check, assets, and static SEO files to work over HTTP
      if (
        req.path === '/health' ||
        req.path.startsWith('/assets') ||
        req.path.endsWith('.ico') ||
        req.path.endsWith('.png') ||
        req.path.endsWith('.xml') ||
        req.path.endsWith('.txt') ||
        req.path.endsWith('.json')
      ) {
        return next();
      }
      if (req.header('x-forwarded-proto') !== 'https') {
        console.warn('[SECURITY] HTTP request redirected to HTTPS', {
          url: req.url,
          ip: req.ip,
        });
        return res.redirect(`https://${req.header('host')}${req.url}`);
      }
      next();
    });
  }

  // Helmet security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for SSR hydration
          scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for __SERVER_DATA__
          imgSrc: ["'self'", 'data:', 'https:'], // Allow all HTTPS images (articles from external sources)
          connectSrc:
            env.NODE_ENV === 'development'
              ? ["'self'", env.API_BASE_URL, env.CLIENT_APP_URL, 'ws:', 'wss:'] // Allow WebSocket for Vite HMR in dev
              : ["'self'", env.API_BASE_URL, env.CLIENT_APP_URL],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      hsts:
        env.NODE_ENV === 'production'
          ? {
              maxAge: 31536000, // 1 year
              includeSubDomains: true,
              preload: true,
            }
          : false,
      frameguard: { action: 'deny' },
      xssFilter: true,
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }),
  );

  // CORS configuration
  const allowedOrigins = env.ALLOWED_ORIGINS
    ? env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
    : [env.CLIENT_APP_URL];

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) {
          return callback(null, true);
        }

        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow localhost and 127.0.0.1 in development (macOS compatibility)
        if (
          env.NODE_ENV === 'development' &&
          (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))
        ) {
          return callback(null, true);
        }

        console.warn('[CORS] Rejected origin:', origin);
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      maxAge: 86400, // 24 hours
    }),
  );

  // Request body parsing with size limit
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // General rate limiter (60 requests per minute per IP)
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => {
      // Skip rate limiting in development
      return env.NODE_ENV === 'development';
    },
  });

  app.use(generalLimiter);

  // ──────────────────────────────────────────────────────────────────────────
  // IP Banning Middleware (Applied to ALL routes)
  // ──────────────────────────────────────────────────────────────────────────

  // Check if IP is banned (early rejection)
  app.use(createIPBanMiddleware(ipBanService));

  // Track 404s for auto-banning
  app.use(create404TrackerMiddleware(ipBanService));

  // Track rate limit violations for auto-banning
  app.use(createRateLimitTrackerMiddleware(ipBanService));

  // ──────────────────────────────────────────────────────────────────────────
  // Vite Dev Server (Development Only)
  // ──────────────────────────────────────────────────────────────────────────

  let vite: ViteDevServer | undefined;

  if (env.NODE_ENV === 'development') {
    // Development: Use Vite dev server
    vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  }

  // API proxy rate limiter (stricter - 30 requests per minute)
  const apiProxyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (_req) => env.NODE_ENV === 'development',
  });

  // ──────────────────────────────────────────────────────────────────────────
  // API Proxy Middleware (with security enhancements)
  // ──────────────────────────────────────────────────────────────────────────

  app.use(
    '/api',
    apiProxyLimiter,
    async (req: express.Request, res: express.Response, _next: express.NextFunction) => {
      try {
        // Construct target API URL using environment variable
        const apiUrl = `${env.API_BASE_URL}${req.originalUrl}`;

        // Filter headers to only forward necessary ones (security best practice)
        const allowedHeaders = [
          'content-type',
          'authorization',
          'user-agent',
          'accept',
          'accept-language',
        ];

        const filteredHeaders: Record<string, string> = {};
        for (const header of allowedHeaders) {
          const value = req.headers[header];
          if (value) {
            filteredHeaders[header] = Array.isArray(value) ? value[0] : value;
          }
        }

        // Set timeout for API requests (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
          // Use native fetch (Node.js 18+)
          const response = await fetch(apiUrl, {
            method: req.method,
            headers: filteredHeaders,
            body:
              req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          // Get response data with size limit check
          const contentLength = response.headers.get('content-length');
          if (contentLength && parseInt(contentLength) > 5 * 1024 * 1024) {
            // 5MB limit
            console.warn('[API_PROXY] Response too large:', contentLength);
            return res.status(413).json({ error: 'Response payload too large' });
          }

          const data = await response.text();

          // Forward relevant response headers
          const responseType = response.headers.get('content-type');
          if (responseType) {
            res.setHeader('content-type', responseType);
          }

          res.status(response.status).send(data);
        } catch (fetchError: unknown) {
          clearTimeout(timeoutId);

          if ((fetchError as Error).name === 'AbortError') {
            console.error('[API_PROXY] Request timeout:', apiUrl);
            return res.status(504).json({ error: 'Gateway timeout' });
          }

          throw fetchError;
        }
      } catch (error) {
        console.error('[API_PROXY] Proxy error:', {
          url: req.originalUrl,
          method: req.method,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        res.status(502).json({ error: 'Bad gateway' });
      }
    },
  );

  // ──────────────────────────────────────────────────────────────────────────
  // SSR Handler (catch-all for single landing page)
  // ──────────────────────────────────────────────────────────────────────────

  app.use(async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;

    try {
      // Valid routes for public site (only landing page)
      const validRoutes = ['/'];
      const is404 = !validRoutes.includes(req.path);

      // Fetch all server data (single page, no routing)
      const serverData = await fetchServerData();

      // Add 404 flag and current path
      serverData.is404 = is404;
      serverData.currentPath = req.path;

      let render: (serverData: ServerData) => string;
      let template: string;

      if (env.NODE_ENV === 'production') {
        // Production: Load pre-built SSR bundle
        // @ts-expect-error - Build artifact, type definitions not available at compile time
        const module = await import('./dist/server/entry-server.js');
        // Handle both default and named exports
        render = (module.default as any)?.render || module.render || module.default;

        if (typeof render !== 'function') {
          throw new Error(
            `Invalid render function: ${typeof render}. Module keys: ${Object.keys(module)}`,
          );
        }

        // Load pre-built HTML template
        template = await fs.readFile(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
      } else {
        // Development: Use Vite dev server
        const { render: renderFn } = (await vite!.ssrLoadModule('/src/entry-server.tsx')) as {
          render: (serverData: ServerData) => string;
        };
        render = renderFn;

        // Load and transform template with Vite
        template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite!.transformIndexHtml(url, template);
      }

      // Render the app HTML
      const appHtml = render(serverData);

      // Inject the app HTML and server data with XSS-safe serialization
      const html = template
        .replace(`<!--ssr-outlet-->`, appHtml)
        .replace(
          `<!--server-data-->`,
          `<script>window.__SERVER_DATA__ = ${serializeForHTML(serverData)}</script>`,
        );

      // Different caching strategy for 404 vs landing page
      const statusCode = is404 ? 404 : 200;
      const cacheControlValue = is404
        ? 'public, max-age=300' // 5 minutes for 404 pages
        : 'public, max-age=30, stale-while-revalidate=60'; // 30s cache for landing page

      res
        .status(statusCode)
        .set({
          'Content-Type': 'text/html',
          'Cache-Control': cacheControlValue,
          'X-Cache-Status': serverData ? 'HIT' : 'MISS', // Indicate if data was cached
        })
        .end(html);
    } catch (e) {
      if (vite) {
        vite.ssrFixStacktrace(e as Error);
      }
      console.error('[SSR] Rendering error:', {
        url,
        error: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined,
      });

      // Send error response
      if (env.NODE_ENV === 'production') {
        // Production: Generic error page
        const errorHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Error</title>
              <meta charset="utf-8">
            </head>
            <body>
              <h1>Something went wrong</h1>
              <p>We're sorry, but something went wrong. Please try again later.</p>
              <a href="/">Return to homepage</a>
            </body>
          </html>
        `;
        res.status(500).set({ 'Content-Type': 'text/html' }).end(errorHtml);
      } else {
        // Development: Pass to error handler for detailed error
        next(e);
      }
    }
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Global Error Handler
  // ──────────────────────────────────────────────────────────────────────────

  app.use(
    (err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
      console.error('[ERROR]', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
      });

      if (env.NODE_ENV === 'production') {
        res.status(500).json({ error: 'Internal server error' });
      } else {
        res.status(500).json({
          error: err.message,
          stack: err.stack,
        });
      }
    },
  );

  return app;
}

// ══════════════════════════════════════════════════════════════════════════════
// In-Memory Cache (Edge-like Caching)
// ══════════════════════════════════════════════════════════════════════════════

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SimpleCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  set<T>(key: string, data: T, ttlSeconds: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000, // Convert to milliseconds
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if expired
    if (age > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      const age = now - entry.timestamp;
      if (age > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Global cache instance
const serverDataCache = new SimpleCache();

// Run cleanup every 5 minutes
setInterval(
  () => {
    serverDataCache.cleanup();
    console.log('[CACHE] Cleanup completed');
  },
  5 * 60 * 1000,
);

// Cache TTL (in seconds) - single page cache strategy
const CACHE_TTL = 30; // 30 seconds - balanced between freshness and performance

// ══════════════════════════════════════════════════════════════════════════════
// Server Data Fetching
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all server-side data for the single landing page
 * Uses environment variables for API endpoints
 * Implements caching to reduce load on API server
 */
async function fetchServerData(): Promise<ServerData> {
  const clientAppUrl = env.CLIENT_APP_URL;
  const apiBaseUrl = `${env.API_BASE_URL}/api`;

  // Single cache key for landing page
  const cacheKey = 'server-data:landing';

  // Check cache first
  const cachedData = serverDataCache.get<ServerData>(cacheKey);
  if (cachedData) {
    console.log('[CACHE] HIT for landing page');
    return cachedData;
  }

  console.log('[CACHE] MISS for landing page - fetching from API');

  // Base server data structure
  const baseData: ServerData = {
    trendingData: null,
    leaderboardData: null,
    pongLeaderboardData: null,
    activityData: null,
    articlesData: null,
    postsData: null,
    predictionsData: null,
    fullLeaderboardData: null,
    clientAppUrl,
    currentPath: '/',
  };

  try {
    // Fetch ALL data in parallel with proper limits for ultra-compact UI
    const [predictionsRes, leaderboardRes, pongLeaderboardRes, activityRes, articlesRes, postsRes] =
      await Promise.allSettled([
        fetch(`${apiBaseUrl}/predictions`), // Get all predictions, filter to 8 approved
        fetch(`${apiBaseUrl}/leaderboard`), // Get leaderboard, slice to 25
        fetch(`${apiBaseUrl}/leaderboard/pong/elo`), // Get pong leaderboard, slice to 20
        fetch(`${apiBaseUrl}/activity/recent?limit=30`), // 30 activities
        fetch(`${apiBaseUrl}/timeline/articles?limit=10`), // 10 articles
        fetch(`${apiBaseUrl}/posts?limit=10`), // 10 posts
      ]);

    // Get predictions data - filter for APPROVED status only, take first 8
    if (predictionsRes.status === 'fulfilled' && predictionsRes.value.ok) {
      const response = (await predictionsRes.value.json()) as { predictions: PredictionView[] };
      const predictions = response.predictions;
      if (Array.isArray(predictions)) {
        const approvedPredictions = predictions.filter((p) => p.status === 'APPROVED');
        baseData.trendingData = approvedPredictions.slice(0, 8);
        // Also store full predictions data (for potential future use)
        baseData.predictionsData = approvedPredictions;
      }
    }

    // Get market leaderboard data - take top 25
    if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
      const leaderboard = (await leaderboardRes.value.json()) as LeaderboardEntryView[];
      if (Array.isArray(leaderboard)) {
        baseData.leaderboardData = leaderboard.slice(0, 25);
        baseData.fullLeaderboardData = leaderboard; // Store full for reference
      }
    }

    // Get pong leaderboard data - take top 20
    if (pongLeaderboardRes.status === 'fulfilled' && pongLeaderboardRes.value.ok) {
      const pongLeaderboard = (await pongLeaderboardRes.value.json()) as PongLeaderboardView[];
      if (Array.isArray(pongLeaderboard)) {
        baseData.pongLeaderboardData = pongLeaderboard.slice(0, 20);
      }
    }

    // Get activity data (already limited to 30 by query param)
    if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
      const activityResponse = (await activityRes.value.json()) as {
        success: boolean;
        activities: UnifiedActivityEvent[];
        count: number;
        cached: boolean;
      };
      baseData.activityData = activityResponse.success ? activityResponse.activities : null;
    }

    // Get articles data (already limited to 10 by query param)
    if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
      const articlesResponse = (await articlesRes.value.json()) as {
        items: PublicArticle[];
        pagination: { cursor?: string; hasMore: boolean };
      };
      baseData.articlesData = Array.isArray(articlesResponse.items) ? articlesResponse.items : null;
    }

    // Get posts data (already limited to 10 by query param)
    if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
      const postsResponse = (await postsRes.value.json()) as {
        items: PublicPostView[];
        nextCursor?: number;
        hasMore: boolean;
      };
      baseData.postsData = Array.isArray(postsResponse.items) ? postsResponse.items : null;
    }

    // Cache all data with single TTL
    serverDataCache.set(cacheKey, baseData, CACHE_TTL);
  } catch (error) {
    console.error('[SERVER_DATA] Error fetching data:', error);
    // Return base data with nulls if API calls fail
    // Don't cache errors - let it retry on next request
  }

  return baseData;
}

// ══════════════════════════════════════════════════════════════════════════════
// Server Bootstrap
// ══════════════════════════════════════════════════════════════════════════════

createServer()
  .then((app) => {
    const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

    const server = app.listen(env.PORT, host, () => {
      console.log(`\n✅ Public site SSR server running (${env.NODE_ENV} mode)`);
      console.log(`   🌐 Server: http://${host}:${env.PORT}`);
      console.log(`   📡 API Base: ${env.API_BASE_URL}`);
      console.log(`   🔗 Client App: ${env.CLIENT_APP_URL}`);
      console.log(`   💾 Cache: Enabled (TTL: 30s, cleanup: 5min)`);
      console.log(`   🛡️  IP Banning: Active (Redis-backed auto-ban)`);
      console.log(`   📄 Single landing page - all data fetched in parallel`);
      console.log(`   🚀 CDN-ready with stale-while-revalidate\n`);
    });

    // Enhanced error handling for port conflicts
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error('\n❌ ERROR: Port already in use!');
        console.error(`   Port ${env.PORT} is already being used by another process.`);
        console.error('\n💡 Solutions:');
        console.error('   1. Run cleanup script: npm run cleanup');
        console.error(`   2. Kill the process manually: lsof -ti:${env.PORT} | xargs kill -9`);
        console.error(
          `   3. Find what's using the port: lsof -i :${env.PORT} -sTCP:LISTEN -P -n -F pn | head -2\n`,
        );
        process.exit(1);
      } else {
        console.error('\n❌ Server error:', error);
        process.exit(1);
      }
    });
  })
  .catch((error) => {
    console.error('\n❌ Failed to start public-site server:');
    console.error(error);
    process.exit(1);
  });
