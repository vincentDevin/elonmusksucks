import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.middleware';
import {
  recordMatch,
  getEloDistribution,
  getPlayerEloHistory,
  predictEloChange,
} from '../controllers/pong.controller';

const router = Router();
const prisma = new PrismaClient();

// Internal auth middleware - verify requests from game servers
const verifyGameServerAuth = (req: any, res: any, next: any) => {
  const gameServerSecret = req.headers['x-game-server-secret'];
  const expectedSecret = process.env.GAME_SERVER_SECRET || 'pong-internal-secret-2024';

  if (gameServerSecret !== expectedSecret) {
    res.status(401).json({ error: 'Unauthorized game server request' });
    return;
  }

  next();
};

// Schemas for validation
const authSchema = z.object({
  token: z.string(),
});

const validateWagerSchema = z.object({
  userId: z.number(),
  amount: z.number().min(0),
});

const processWagerSchema = z.object({
  playerOneId: z.number(),
  playerTwoId: z.number().nullable(),
  wagerAmount: z.number().min(0),
  isAI: z.boolean(),
});

const recordMatchSchema = z.object({
  matchId: z.string(),
  winnerId: z.number().nullable(),
  loserId: z.number().nullable(),
  wagerAmount: z.number().min(0),
  payoutAmount: z.number().min(0),
  duration: z.number(),
  isAI: z.boolean(),
});

// POST /api/pong/auth - Authenticate user for game server
router.post('/auth', verifyGameServerAuth, async (req, res) => {
  try {
    const { token } = authSchema.parse(req.body);

    const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
    if (!accessTokenSecret) {
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    const decoded = jwt.verify(token, accessTokenSecret) as { userId: number };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, name: true, muskBucks: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({
      id: user.id,
      name: user.name,
      muskBucks: Number(user.muskBucks),
    });
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }
    console.error('Pong auth error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pong/validate-wager - Check if user can afford wager
router.post('/validate-wager', verifyGameServerAuth, async (req, res) => {
  try {
    const { userId, amount } = validateWagerSchema.parse(req.body);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { muskBucks: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const currentBalance = Number(user.muskBucks);
    const valid = currentBalance >= amount;

    res.json({
      valid,
      currentBalance,
    });
  } catch (error) {
    console.error('Pong validate wager error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/pong/process-wager - Process wager transaction atomically
router.post('/process-wager', verifyGameServerAuth, async (req, res) => {
  try {
    const { playerOneId, playerTwoId, wagerAmount, isAI } = processWagerSchema.parse(req.body);

    if (wagerAmount === 0) {
      res.json({ success: true, transactionId: 'free-play' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Deduct from player one
      const playerOneUpdate = await tx.user.update({
        where: { id: playerOneId },
        data: { muskBucks: { decrement: BigInt(wagerAmount) } },
        select: { muskBucks: true },
      });

      if (playerOneUpdate.muskBucks < 0) {
        throw new Error('Insufficient funds for player one');
      }

      // Deduct from player two if not AI
      if (!isAI && playerTwoId) {
        const playerTwoUpdate = await tx.user.update({
          where: { id: playerTwoId },
          data: { muskBucks: { decrement: BigInt(wagerAmount) } },
          select: { muskBucks: true },
        });

        if (playerTwoUpdate.muskBucks < 0) {
          throw new Error('Insufficient funds for player two');
        }
      }

      // Create transaction record
      const transaction = await tx.transaction.create({
        data: {
          userId: playerOneId,
          type: 'DEBIT',
          amount: BigInt(-wagerAmount),
          balanceAfter: playerOneUpdate.muskBucks,
        },
      });

      if (!isAI && playerTwoId) {
        await tx.transaction.create({
          data: {
            userId: playerTwoId,
            type: 'DEBIT',
            amount: BigInt(-wagerAmount),
            balanceAfter: BigInt(0), // Will be updated with actual balance
          },
        });
      }

      return { transactionId: transaction.id };
    });

    res.json({ success: true, transactionId: result.transactionId });
  } catch (error: any) {
    console.error('Pong process wager error:', error);

    if (error.message?.includes('Insufficient funds')) {
      res.status(400).json({ error: error.message });
      return;
    }

    res.status(500).json({ error: 'Failed to process wager' });
  }
});

// POST /api/pong/record-match - Record match result and process payouts
router.post(
  '/record-match',
  verifyGameServerAuth,
  (req, res, next) => {
    try {
      req.body = recordMatchSchema.parse(req.body);
      next();
    } catch (error) {
      res.status(400).json({ error: 'Invalid request data' });
    }
  },
  recordMatch,
);

// GET /api/pong/health - Health check for game servers
router.get('/health', verifyGameServerAuth, async (_req, res) => {
  try {
    // Quick DB check
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'Database connection failed',
    });
  }
});

// ============================================
// PONG STATS & ELO ENDPOINTS
// ============================================

// Note: Pong leaderboards are handled by leaderboard.routes.ts at /api/leaderboard/pong/*
// Note: User Pong stats are handled by user.routes.ts at /api/users/:userId/pong-stats

// GET /api/pong/elo-distribution - Global tier distribution
router.get('/elo-distribution', getEloDistribution);

// GET /api/pong/elo-history/:userId - Player's Elo progression
router.get('/elo-history/:userId', requireAuth, getPlayerEloHistory);

// GET /api/pong/predict-elo - Predict Elo change for potential wager
router.get('/predict-elo', requireAuth, predictEloChange);

export default router;
