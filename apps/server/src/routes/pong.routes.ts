import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import {
  recordMatch,
  getEloDistribution,
  getPlayerEloHistory,
  predictEloChange,
  authenticateUser,
  processWager,
  validateWager,
  healthCheck,
  getAIPlayerById,
  getAllAIPlayers,
} from '../controllers/pong.controller';

const router = Router();

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

// POST /api/pong/auth - Authenticate user for game server
router.post('/auth', verifyGameServerAuth, requireAuth, authenticateUser);

// POST /api/pong/validate-wager - Check if user can afford wager
router.post('/validate-wager', verifyGameServerAuth, validateWager);

// POST /api/pong/process-wager - Process wager transaction atomically
router.post('/process-wager', verifyGameServerAuth, processWager);

// POST /api/pong/record-match - Record match result and process payouts
router.post('/record-match', verifyGameServerAuth, recordMatch);

// GET /api/pong/health - Health check for game servers
router.get('/health', verifyGameServerAuth, healthCheck);

// GET /api/pong/ai-players - Get all AI players (cached, public) - MUST come before /:id route
router.get('/ai-players', getAllAIPlayers);

// GET /api/pong/ai-players/:id - Fetch AI player data from database (for pong-server)
router.get('/ai-players/:id', verifyGameServerAuth, getAIPlayerById);

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
