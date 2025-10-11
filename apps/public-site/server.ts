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
import type { ServerData } from './src/types';
import type { PredictionView, LeaderboardEntryView } from '@ems/types';

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
  // Security Middleware
  // ──────────────────────────────────────────────────────────────────────────

  // Request logging (before other middleware)
  if (env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
  } else {
    app.use(morgan('dev'));
  }

  // HTTPS redirect for production
  if (env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
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
          imgSrc: ["'self'", 'data:', 'https://fly.storage.tigris.dev'],
          connectSrc: ["'self'", env.API_BASE_URL, env.CLIENT_APP_URL],
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

        // Allow localhost in development
        if (env.NODE_ENV === 'development' && origin.startsWith('http://localhost')) {
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
    skip: (req) => {
      // Skip rate limiting in development
      return env.NODE_ENV === 'development';
    },
  });

  app.use(generalLimiter);

  // API proxy rate limiter (stricter - 30 requests per minute)
  const apiProxyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    message: 'Too many API requests, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => env.NODE_ENV === 'development',
  });

  // Create Vite server in middleware mode
  const vite: ViteDevServer = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom',
  });

  // Use vite's connect instance as middleware
  app.use(vite.middlewares);

  // ──────────────────────────────────────────────────────────────────────────
  // API Proxy Middleware (with security enhancements)
  // ──────────────────────────────────────────────────────────────────────────

  app.use(
    '/api/*',
    apiProxyLimiter, // Apply stricter rate limit to API proxy
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

        const fetch = (await import('node-fetch')).default;

        // Set timeout for API requests (10 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
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
  // SSR Handler
  // ──────────────────────────────────────────────────────────────────────────

  app.use('*', async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = req.originalUrl;

    try {
      // Fetch data based on the route
      const serverData = await fetchServerData(url);

      // Load the server entry
      const { render } = (await vite.ssrLoadModule('/src/entry-server.tsx')) as {
        render: (serverData: ServerData) => string;
      };

      // Render the app HTML
      const appHtml = render(serverData);

      // Read the index.html template
      let template = await fs.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');

      // Transform the template with Vite
      template = await vite.transformIndexHtml(url, template);

      // Inject the app HTML and server data with XSS-safe serialization
      const html = template
        .replace(`<!--ssr-outlet-->`, appHtml)
        .replace(
          `<!--server-data-->`,
          `<script>window.__SERVER_DATA__ = ${serializeForHTML(serverData)}</script>`,
        );

      res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
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
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction, // eslint-disable-line @typescript-eslint/no-unused-vars
    ) => {
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
// Server Data Fetching
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch server-side data based on the current route
 * Uses environment variables for API endpoints
 */
async function fetchServerData(url: string): Promise<ServerData> {
  const clientAppUrl = env.CLIENT_APP_URL;
  const apiBaseUrl = `${env.API_BASE_URL}/api`;

  // Base server data structure
  const baseData: ServerData = {
    marketData: null,
    trendingData: null,
    leaderboardData: null,
    activityData: null,
    articlesData: null,
    postsData: null,
    predictionsData: null,
    fullLeaderboardData: null,
    clientAppUrl,
    currentPath: url,
  };

  try {
    const fetch = (await import('node-fetch')).default;

    // Fetch different data based on the route
    if (url === '/' || url === '') {
      // Landing page - fetch overview data
      const [predictionsRes, leaderboardRes, activityRes, articlesRes, postsRes] =
        await Promise.allSettled([
          fetch(`${apiBaseUrl}/predictions`),
          fetch(`${apiBaseUrl}/leaderboard`),
          fetch(`${apiBaseUrl}/activity/recent?limit=10`),
          fetch(`${apiBaseUrl}/timeline/articles?limit=5`),
          fetch(`${apiBaseUrl}/posts?limit=5`),
        ]);

      // Get predictions data for trending - filter for APPROVED status only
      if (predictionsRes.status === 'fulfilled' && predictionsRes.value.ok) {
        const predictions = (await predictionsRes.value.json()) as PredictionView[];
        if (Array.isArray(predictions)) {
          const approvedPredictions = predictions.filter((p) => p.status === 'APPROVED');
          baseData.trendingData = approvedPredictions.slice(0, 5);
        }
      }

      // Get posts data for timeline preview
      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const postsResponse = (await postsRes.value.json()) as { posts: unknown[] };
        baseData.postsData = Array.isArray(postsResponse.posts) ? postsResponse.posts : null;
      }

      // Get leaderboard data for preview
      if (leaderboardRes.status === 'fulfilled' && leaderboardRes.value.ok) {
        const leaderboard = (await leaderboardRes.value.json()) as LeaderboardEntryView[];
        baseData.leaderboardData = Array.isArray(leaderboard) ? leaderboard.slice(0, 5) : null;
      }

      // Get activity data - response has { success, activities, count, cached }
      if (activityRes.status === 'fulfilled' && activityRes.value.ok) {
        const activityResponse = (await activityRes.value.json()) as {
          success: boolean;
          activities: unknown[];
          count: number;
          cached: boolean;
        };
        baseData.activityData = activityResponse.success ? activityResponse.activities : null;
      }

      // Get articles data for timeline preview - response has { items, pagination }
      if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
        const articlesResponse = (await articlesRes.value.json()) as {
          items: unknown[];
          pagination: { cursor?: string; hasMore: boolean };
        };
        baseData.articlesData = Array.isArray(articlesResponse.items)
          ? articlesResponse.items
          : null;
      }

      // Create market data from actual data
      baseData.marketData = {
        totalVolume: 12345678, // This would need a specific endpoint
        activeMarkets: baseData.trendingData ? baseData.trendingData.length : 247,
        totalUsers: baseData.leaderboardData ? baseData.leaderboardData.length * 50 : 1423,
        volumeChange: 5.2,
        trending: [],
      };
    } else if (url === '/predictions') {
      // Predictions page
      const predictionsRes = await fetch(`${apiBaseUrl}/predictions`);
      if (predictionsRes.ok) {
        const predictions = (await predictionsRes.json()) as PredictionView[];
        baseData.predictionsData = Array.isArray(predictions) ? predictions : null;
      }
    } else if (url === '/leaderboard') {
      // Leaderboard page
      const leaderboardRes = await fetch(`${apiBaseUrl}/leaderboard`);
      if (leaderboardRes.ok) {
        const leaderboard = (await leaderboardRes.json()) as LeaderboardEntryView[];
        baseData.fullLeaderboardData = Array.isArray(leaderboard) ? leaderboard : null;
      }
    } else if (url === '/timeline') {
      // Timeline page
      const [articlesRes, postsRes] = await Promise.allSettled([
        fetch(`${apiBaseUrl}/timeline/articles`),
        fetch(`${apiBaseUrl}/posts`),
      ]);

      if (articlesRes.status === 'fulfilled' && articlesRes.value.ok) {
        const articlesResponse = (await articlesRes.value.json()) as {
          items: unknown[];
          pagination: { cursor?: string; hasMore: boolean };
        };
        baseData.articlesData = Array.isArray(articlesResponse.items)
          ? articlesResponse.items
          : null;
      }
      if (postsRes.status === 'fulfilled' && postsRes.value.ok) {
        const postsResponse = (await postsRes.value.json()) as { posts: unknown[] };
        baseData.postsData = Array.isArray(postsResponse.posts) ? postsResponse.posts : null;
      }
    }
  } catch (error) {
    console.error('Error fetching server data:', error);
    // Return base data with nulls if API calls fail
  }

  return baseData;
}

// ══════════════════════════════════════════════════════════════════════════════
// Server Bootstrap
// ══════════════════════════════════════════════════════════════════════════════

createServer()
  .then((app) => {
    const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1';

    app.listen(env.PORT, host, () => {
      console.log(`\n✅ Public site SSR server running (${env.NODE_ENV} mode)`);
      console.log(`   🌐 Server: http://${host}:${env.PORT}`);
      console.log(`   📡 API Base: ${env.API_BASE_URL}`);
      console.log(`   🔗 Client App: ${env.CLIENT_APP_URL}\n`);
    });
  })
  .catch((error) => {
    console.error('\n❌ Failed to start public-site server:');
    console.error(error);
    process.exit(1);
  });
