import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../..', envFile) });

// Validate environment variables immediately (fail fast if misconfigured)
import env from './config/env';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import http from 'http';
import { initSocket } from './socket';
import authRoutes from './routes/auth.routes';
import predictionRoutes from './routes/predictions.routes';
// import predictionCommentRoutes from './routes/predictionComment.routes'; // Deprecated - comments now in unified Content system
import userRoutes from './routes/user.routes';
import payoutRoutes from './routes/payout.routes';
import adminRoutes from './routes/admin.routes';
import leaderboardRoutes from './routes/leaderboard.routes';
import moderationRoutes from './routes/moderation.routes';
import activityRoutes from './routes/activity.routes';
import marketRoutes from './routes/market.routes';
import dashboardAnalyticsRoutes from './routes/dashboardAnalytics.routes';
import shameWallRoutes from './routes/shameWall.routes';
import monitoringRoutes from './routes/monitoring.routes';
import timelineRoutes from './routes/timeline.routes';
import pongRoutes from './routes/pong.routes';
import postRoutes from './routes/post.routes';

const app = express();

// ══════════════════════════════════════════════════════════════════════════════
// Security Middleware - Configure First
// ══════════════════════════════════════════════════════════════════════════════

// Helmet - Security headers protection
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://fly.storage.tigris.dev'],
        connectSrc: [
          "'self'",
          env.BASE_URL_SERVER,
          env.BASE_URL_CLIENT,
          env.BASE_URL_PUBLIC,
          'ws://localhost:*',
          'wss://*', // WebSocket connections
        ],
        fontSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: env.NODE_ENV === 'production',
    },
    frameguard: {
      action: 'deny', // Prevent clickjacking
    },
    noSniff: true, // Prevent MIME sniffing
    xssFilter: true, // Enable XSS filter
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  }),
);

// HTTPS redirect for production
if (env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// CORS Configuration
// ══════════════════════════════════════════════════════════════════════════════

// Allowed origins - strict whitelist for production security
const allowedOrigins = [env.CLIENT_APP_URL, env.BASE_URL_CLIENT, env.BASE_URL_PUBLIC].filter(
  (url): url is string => Boolean(url),
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // Check against whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Development: Allow localhost on any port
      if (env.NODE_ENV === 'development') {
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
          return callback(null, true);
        }
      }

      // Reject all other origins
      console.warn(`[CORS] Rejected origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

// ══════════════════════════════════════════════════════════════════════════════
// Body Parsing Middleware
// ══════════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: '1mb' })); // Prevent large payload attacks
app.use(cookieParser());

// Health check endpoint (legacy - kept for backwards compatibility)
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/predictions', predictionRoutes);
// app.use('/api', predictionCommentRoutes); // Deprecated - comments now in unified Content system (predictions.controller handles this)
app.use('/api/users', userRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/analytics', dashboardAnalyticsRoutes);
app.use('/api/shame-wall', shameWallRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/timeline', timelineRoutes);
app.use('/api/pong', pongRoutes);
app.use('/api/posts', postRoutes);

// Note: feedsRoutes are mounted under /api/admin/feeds and already include requireAdmin middleware

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if this file is run directly
if (require.main === module) {
  // Create HTTP server and bind Express app
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server).catch((err) => {
    console.error('[socket] failed to initialize:', err);
  });

  server.listen(env.PORT, '127.0.0.1', () => {
    console.log(`Server & socket running on http://127.0.0.1:${env.PORT}`);
  });
}

export default app;
