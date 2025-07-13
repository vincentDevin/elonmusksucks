import dotenv from 'dotenv';
import path from 'path';

// Load environment variables based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../..', envFile) });

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import http from 'http';
import { initSocket } from './socket';
import authRoutes from './routes/auth.routes';
import predictionRoutes from './routes/predictions.routes';
import userRoutes from './routes/user.routes';
import bettingRoutes from './routes/betting.routes';
import payoutRoutes from './routes/payout.routes';
import adminRoutes from './routes/admin.routes';
import leaderboardRoutes from './routes/leaderboard.routes';

const app = express();

// Dynamically reflect request origin for development
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use(express.json());
app.use(cookieParser());

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ ok: true });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/betting', bettingRoutes);
app.use('/api/payout', payoutRoutes);
app.use('/api/leaderboard', leaderboardRoutes);

// Global error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server only if this file is run directly
if (require.main === module) {
  const PORT = parseInt(process.env.PORT ?? '5000', 10);
  // Create HTTP server and bind Express app
  const server = http.createServer(app);

  // Initialize Socket.IO
  initSocket(server).catch((err) => {
    console.error('[socket] failed to initialize:', err);
  });

  server.listen(PORT, '127.0.0.1', () => {
    console.log(`Server & socket running on http://127.0.0.1:${PORT}`);
  });
}

export default app;
