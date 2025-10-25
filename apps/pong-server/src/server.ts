import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from root .env file
dotenvConfig({ path: resolve(__dirname, '../../../.env') });

// Validate environment variables immediately (fail fast if misconfigured)
import env from './config/env';

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import { PongApiClient } from './api-client';
import { SocketRateLimiter } from './middleware/socketRateLimiter';
import { validatePayload } from './middleware/payloadValidator';
import {
  validateCreateMatch,
  validateJoinMatch,
  validatePlayerInput,
  validatePlayerReady,
  validateSpectateMatch,
  validateAuth,
} from './validation/socketValidation';
import { securityLogger } from './utils/securityLogger';
import {
  Player,
  GameState,
  LobbyEntry,
  ActiveGameEntry,
  PlayerInput,
  MatchResult,
  PONG_PHYSICS,
  AI_DIFFICULTIES,
  AI_PLAYER_IDS,
  AIDifficulty,
  MatchType,
  PONG_PAYOUT_CONSTANTS,
  PONG_WAGER_LIMITS,
} from '@ems/types';

// AI Player ID mapping - matches our database seed
// Note: AI_PLAYER_IDS now imported from @ems/types for consistency
// AI player names are fetched from the database (see createAIPlayer function)

// AI Player cache - refresh every 5 minutes to match server cache
const AI_PLAYER_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const aiPlayerCache = new Map<
  number,
  {
    data: { id: number; name: string; avatarUrl?: string | null };
    timestamp: number;
  }
>();

// ——————————————————————————————————————————————————————————————————————————————————
// VALIDATION HELPERS (Type guards and input validation)
// ——————————————————————————————————————————————————————————————————————————————————

/**
 * Type guard: Validates AI difficulty from user input
 */
function isValidAIDifficulty(difficulty: unknown): difficulty is AIDifficulty {
  return (
    typeof difficulty === 'string' &&
    (difficulty === 'EASY' ||
      difficulty === 'MEDIUM' ||
      difficulty === 'HARD' ||
      difficulty === 'IMPOSSIBLE')
  );
}

/**
 * Fetches AI player data from database by difficulty (with caching)
 * Returns Player object with name from database or fallback name
 */
async function createAIPlayer(difficulty: AIDifficulty, apiClient: PongApiClient): Promise<Player> {
  const aiPlayerId = AI_PLAYER_IDS[difficulty];
  let aiPlayerName = `AI-${difficulty}`; // Fallback name

  try {
    // Check cache first
    const cached = aiPlayerCache.get(aiPlayerId);
    const now = Date.now();

    if (cached && now - cached.timestamp < AI_PLAYER_CACHE_TTL) {
      aiPlayerName = cached.data.name;
    } else {
      // Fetch AI player from database to get current name
      const aiUser = await apiClient.getUserById(aiPlayerId);
      if (aiUser && aiUser.name) {
        aiPlayerName = aiUser.name;

        // Update cache
        aiPlayerCache.set(aiPlayerId, {
          data: aiUser,
          timestamp: now,
        });
      }
    }
  } catch (error) {
    console.warn(`Failed to fetch AI player ${aiPlayerId} from database, using fallback name`);
  }

  return {
    id: aiPlayerId,
    name: aiPlayerName,
    paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
    score: 0,
    ping: 0,
    lastInputTime: Date.now(),
  };
}

/**
 * Validates wager amount based on match type and AI difficulty
 * Returns error message if invalid, null if valid
 */
function validateWager(
  wager: number,
  matchType: MatchType,
  aiDifficulty?: AIDifficulty,
): string | null {
  // Check minimum wager
  if (wager < PONG_WAGER_LIMITS.MIN_WAGER) {
    return `Wager must be at least ${PONG_WAGER_LIMITS.MIN_WAGER} MuskBucks`;
  }

  // Check for negative or invalid wager
  if (wager < 0 || !Number.isFinite(wager)) {
    return 'Invalid wager amount';
  }

  // For AI matches, check difficulty-specific max wager
  if (matchType === 'ai' && aiDifficulty) {
    const maxWager = PONG_WAGER_LIMITS.AI_MAX_WAGERS[aiDifficulty];

    if (maxWager !== null && wager > maxWager) {
      return `Maximum wager for ${aiDifficulty} difficulty is ${maxWager} MuskBucks`;
    }
  }

  // PVP matches have no max wager, only balance check
  return null;
}

// ——————————————————————————————————————————————————————————————————————————————————
// DATABASE MANAGER (Minimal DB usage)
// ——————————————————————————————————————————————————————————————————————————————————

class DatabaseManager {
  private api = new PongApiClient();

  async authenticateUser(token: string): Promise<Player | null> {
    try {
      const userData = await this.api.authenticateUser(token);
      if (!userData) return null;

      return {
        id: userData.id,
        name: userData.name,
        paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
        score: 0,
        ping: 0,
        lastInputTime: Date.now(),
      };
    } catch (error) {
      console.error('Auth error:', error);
      return null;
    }
  }

  async validateWager(playerId: number, amount: number): Promise<boolean> {
    try {
      return await this.api.validateWager(playerId, amount);
    } catch (error) {
      console.error('Wager validation error:', error);
      return false;
    }
  }

  async createAIPlayer(difficulty: AIDifficulty): Promise<Player> {
    return await createAIPlayer(difficulty, this.api);
  }

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if player two is an AI player (negative ID)
      const isAI = playerTwoId !== null && playerTwoId < 0;
      const result = await this.api.processWagerTransaction(
        playerOneId,
        isAI ? playerTwoId : playerTwoId, // Pass the actual AI player ID
        wagerAmount,
        isAI,
      );

      if (result?.success) {
        console.log(`💰 Wager transaction processed via API: ${wagerAmount} MuskBucks`);
        return { success: true };
      } else {
        return { success: false, error: 'Transaction failed' };
      }
    } catch (error: any) {
      console.error('Wager transaction error:', error);
      return { success: false, error: error.message || 'Transaction failed' };
    }
  }

  async recordMatchResult(result: MatchResult): Promise<void> {
    try {
      console.log(`📊 Recording match result via API:`, {
        matchId: result.matchId,
        winner: result.winnerId,
        winnerScore: result.winnerScore,
        loserScore: result.loserScore,
        wager: result.wagerAmount,
        payout: result.payoutAmount,
      });

      await this.api.recordMatchResult(result);
      console.log(`✅ Match result recorded successfully via API`);
    } catch (error) {
      console.error('Error recording match result via API:', error);
    }
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// AUTH MANAGER (Token verification and player sessions)
// ——————————————————————————————————————————————————————————————————————————————————

class AuthManager {
  private authenticatedPlayers = new Map<string, Player>(); // socketId -> Player
  private playerSockets = new Map<number, string>(); // playerId -> socketId

  constructor(private db: DatabaseManager) {}

  async authenticateSocket(socketId: string, token: string): Promise<Player | null> {
    const player = await this.db.authenticateUser(token);
    if (player) {
      this.authenticatedPlayers.set(socketId, player);
      this.playerSockets.set(player.id, socketId);
    }
    return player;
  }

  getPlayer(socketId: string): Player | null {
    return this.authenticatedPlayers.get(socketId) || null;
  }

  getSocketId(playerId: number): string | null {
    return this.playerSockets.get(playerId) || null;
  }

  getPlayerByUserId(userId: number): Player | null {
    const socketId = this.playerSockets.get(userId);
    return socketId ? this.authenticatedPlayers.get(socketId) || null : null;
  }

  disconnectSocket(socketId: string): void {
    const player = this.authenticatedPlayers.get(socketId);
    if (player) {
      this.playerSockets.delete(player.id);
      this.authenticatedPlayers.delete(socketId);
    }
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// STATISTICS MANAGER (Real-time stats tracking)
// ——————————————————————————————————————————————————————————————————————————————————

class StatisticsManager {
  private connectedPlayers = new Set<number>(); // Track unique connected player IDs
  private activeGames = new Set<string>(); // Track active game IDs

  addConnectedPlayer(playerId: number): void {
    this.connectedPlayers.add(playerId);
    // Only log in development (verbose)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Player ${playerId} connected. Total online: ${this.connectedPlayers.size}`);
    }
  }

  removeConnectedPlayer(playerId: number): void {
    this.connectedPlayers.delete(playerId);
    // Only log in development (verbose)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `📊 Player ${playerId} disconnected. Total online: ${this.connectedPlayers.size}`,
      );
    }
  }

  addActiveGame(gameId: string): void {
    this.activeGames.add(gameId);
    // Keep this log for production (important event)
    console.log(`📊 Game started. Total active: ${this.activeGames.size}`);
  }

  removeActiveGame(gameId: string): void {
    this.activeGames.delete(gameId);
    // Keep this log for production (important event)
    console.log(`📊 Game ended. Total active: ${this.activeGames.size}`);
  }

  getStats(availableMatches: number) {
    return {
      playersOnline: this.connectedPlayers.size,
      activeGames: this.activeGames.size,
      availableMatches,
    };
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// LOBBY MANAGER (In-memory lobby state)
// ——————————————————————————————————————————————————————————————————————————————————

class LobbyManager {
  private lobbies = new Map<string, LobbyEntry>();
  private playerLobbies = new Map<number, string>(); // playerId -> lobbyId

  createLobby(player: Player, wager: number, type: 'ai' | 'pvp'): string {
    const lobbyId = `lobby-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const lobby: LobbyEntry = {
      id: lobbyId,
      creatorId: player.id,
      creatorName: player.name,
      wager,
      type,
      status: 'waiting',
      createdAt: Date.now(),
    };

    this.lobbies.set(lobbyId, lobby);
    this.playerLobbies.set(player.id, lobbyId);

    return lobbyId;
  }

  joinLobby(lobbyId: string, player: Player): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.status !== 'waiting' || lobby.creatorId === player.id) {
      return false;
    }

    lobby.status = 'full';
    this.playerLobbies.set(player.id, lobbyId);

    return true;
  }

  leaveLobby(playerId: number): string | null {
    const lobbyId = this.playerLobbies.get(playerId);
    if (!lobbyId) return null;

    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      if (lobby.creatorId === playerId) {
        // Creator left, delete lobby
        this.lobbies.delete(lobbyId);
      } else {
        // Other player left, reset to waiting
        lobby.status = 'waiting';
      }
    }

    this.playerLobbies.delete(playerId);
    return lobbyId;
  }

  getAvailableLobbies(): LobbyEntry[] {
    return Array.from(this.lobbies.values())
      .filter((lobby) => lobby.status === 'waiting')
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20); // Limit to 20 recent lobbies
  }

  getLobby(lobbyId: string): LobbyEntry | null {
    return this.lobbies.get(lobbyId) || null;
  }

  deleteLobby(lobbyId: string): void {
    this.lobbies.delete(lobbyId);
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// GAME MANAGER (Real-time game logic)
// ——————————————————————————————————————————————————————————————————————————————————

class GameManager {
  private games = new Map<string, GameState>();
  private playerGames = new Map<number, string>(); // playerId -> gameId
  private gameIntervals = new Map<string, NodeJS.Timeout>();
  private gameSpectators = new Map<string, Set<string>>(); // gameId -> Set<socketId>
  private spectatorGames = new Map<string, string>(); // socketId -> gameId
  private lastEmitTime = new Map<string, number>(); // Track last emit time per game
  private droppedFrames = new Map<string, number>(); // Track dropped frames per game
  private countdownInProgress = new Map<string, boolean>(); // Track active countdowns to prevent duplicates
  private lastScoreTime = new Map<string, number>(); // Track last score time to prevent rapid scoring
  private disconnectionGracePeriods = new Map<
    number,
    { gameId: string; timer: NodeJS.Timeout; disconnectedAt: number }
  >(); // playerId -> grace period info
  private readonly RECONNECTION_GRACE_PERIOD_MS = 10000; // 10 seconds to reconnect

  constructor(
    private io: SocketIOServer,
    private db: DatabaseManager,
    private auth: AuthManager,
    private stats: StatisticsManager,
  ) {}

  async startGame(
    gameId: string,
    players: [Player, Player | null],
    wager: number,
    isAI: boolean,
    aiDifficulty?: AIDifficulty,
  ): Promise<{ success: boolean; error?: string }> {
    // Reset player scores for new game
    players[0].score = 0;
    if (players[1]) {
      players[1].score = 0;
    }

    // Process wager transaction if there's a wager (only for AI games or PVP with both players)
    if (wager > 0 && (isAI || players[1] !== null)) {
      const transaction = await this.db.processWagerTransaction(
        players[0].id,
        players[1]?.id || null,
        wager,
      );

      if (!transaction.success) {
        console.error(`💸 Wager transaction failed for game ${gameId}: ${transaction.error}`);
        return { success: false, error: transaction.error };
      }
    } else if (wager > 0 && !isAI && players[1] === null) {
      console.log(
        `💰 Deferring wager transaction for PVP game ${gameId} until second player joins`,
      );
    }

    const gameState: GameState = {
      id: gameId,
      players,
      ball: {
        x: PONG_PHYSICS.FIELD_WIDTH / 2,
        y: PONG_PHYSICS.FIELD_HEIGHT / 2,
        vx: 0,
        vy: 0,
      },
      status: isAI
        ? 'waiting_for_ready'
        : players[1]
          ? 'waiting_for_ready'
          : 'waiting_for_opponent',
      tick: 0,
      wager,
      isAI,
      aiDifficulty: isAI ? aiDifficulty || 'MEDIUM' : undefined,
      aiState: isAI
        ? {
            targetY: PONG_PHYSICS.FIELD_HEIGHT / 2,
            lastReactionTime: 0,
            errorBias: (Math.random() - 0.5) * 50, // Random bias between -25 and +25 pixels
          }
        : undefined,
      readyStates: isAI ? [false, true] : [false, false], // AI is always ready
      startTime: Date.now(),
    };

    this.games.set(gameId, gameState);
    this.playerGames.set(players[0].id, gameId);
    if (players[1]) {
      this.playerGames.set(players[1].id, gameId);
    }

    // Track active game in statistics (add to stats when created)
    this.stats.addActiveGame(gameId);

    // Broadcast active games update when game is created
    this.broadcastActiveGamesUpdate();

    return { success: true };
  }

  private startCountdown(game: GameState): void {
    // Guard: Prevent duplicate countdowns
    if (this.countdownInProgress.get(game.id)) {
      if (process.env.NODE_ENV === 'development') {
        console.warn(
          `⚠️ Countdown already in progress for game ${game.id}, ignoring duplicate request`,
        );
      }
      return;
    }

    // Mark countdown as in progress
    this.countdownInProgress.set(game.id, true);
    let countdown = 3;

    const countdownInterval = setInterval(() => {
      this.io.to(`game:${game.id}`).emit('countdown', {
        seconds: countdown,
        message: countdown > 0 ? countdown.toString() : 'GO!',
      });

      if (countdown === 0) {
        clearInterval(countdownInterval);
        game.status = 'active';
        this.serveBall(game);
        this.startGameLoop(game);
        // Clear countdown guard when countdown completes
        this.countdownInProgress.delete(game.id);
      }
      countdown--;
    }, 1000);
  }

  private serveBall(game: GameState): void {
    // Validation: Ensure game is in valid state before serving
    if (!game.players[0] || !game.players[1]) {
      console.error(`❌ Cannot serve ball in game ${game.id}: missing players`);
      return;
    }

    // Check if ball is already moving (prevent double-serve)
    const ballSpeed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
    if (ballSpeed > 0) {
      console.warn(
        `⚠️ Cannot serve ball in game ${game.id}: ball already moving (speed: ${ballSpeed})`,
      );
      return;
    }

    // Only serve if game is active (called from countdown or after score)
    if (game.status !== 'active') {
      console.warn(`⚠️ Cannot serve ball in game ${game.id}: invalid status (${game.status})`);
      return;
    }

    const angle = ((Math.random() - 0.5) * Math.PI) / 3; // -30 to 30 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;

    game.ball.vx = Math.cos(angle) * PONG_PHYSICS.BALL_SPEED_INITIAL * direction;
    game.ball.vy = Math.sin(angle) * PONG_PHYSICS.BALL_SPEED_INITIAL;

    // Only log ball serve details in development
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🏓 Ball served in game ${game.id} (angle: ${((angle * 180) / Math.PI).toFixed(1)}°, direction: ${direction > 0 ? 'right' : 'left'})`,
      );
    }
  }

  private startGameLoop(game: GameState): void {
    // Initialize frame tracking for this game
    this.lastEmitTime.set(game.id, 0);
    this.droppedFrames.set(game.id, 0);

    const interval = setInterval(() => {
      // ✅ Keep loop running during waiting states to broadcast paddle movements
      // Only stop when game ends
      if (game.status === 'ended') {
        clearInterval(interval);
        this.cleanupGameTracking(game.id);
        return;
      }

      // Only update physics/ball during active gameplay
      if (game.status === 'active') {
        this.updateGame(game);
      }

      // Adaptive frequency governor: 120Hz during active gameplay, 60Hz otherwise
      const now = Date.now();
      const lastEmit = this.lastEmitTime.get(game.id) || 0;
      const timeSinceLastEmit = now - lastEmit;

      // Use higher update rate during active gameplay for smoother experience
      const updateRate =
        game.status === 'active'
          ? PONG_PHYSICS.ACTIVE_NETWORK_UPDATE_RATE // 120 Hz during active play
          : PONG_PHYSICS.NETWORK_UPDATE_RATE; // 60 Hz during waiting/countdown
      const minEmitInterval = 1000 / updateRate;

      if (timeSinceLastEmit >= minEmitInterval) {
        this.broadcastGameState(game);
        this.lastEmitTime.set(game.id, now);
      } else {
        // Frame dropped due to frequency governor
        const dropped = this.droppedFrames.get(game.id) || 0;
        this.droppedFrames.set(game.id, dropped + 1);
      }

      // Log dropped frames every 5 seconds for monitoring (development only)
      if (
        process.env.NODE_ENV === 'development' &&
        game.tick % (PONG_PHYSICS.TICK_RATE * 5) === 0
      ) {
        const dropped = this.droppedFrames.get(game.id) || 0;
        if (dropped > 0) {
          const currentRate =
            game.status === 'active'
              ? PONG_PHYSICS.ACTIVE_NETWORK_UPDATE_RATE
              : PONG_PHYSICS.NETWORK_UPDATE_RATE;
          console.log(
            `[pong-freq] Game ${game.id}: ${dropped} frames dropped in 5s (${currentRate}Hz ${game.status} governor)`,
          );
          this.droppedFrames.set(game.id, 0); // Reset counter
        }
      } else if (game.tick % (PONG_PHYSICS.TICK_RATE * 5) === 0) {
        // Still reset counter in production to avoid memory growth
        this.droppedFrames.set(game.id, 0);
      }
    }, 1000 / PONG_PHYSICS.TICK_RATE);

    this.gameIntervals.set(game.id, interval);
  }

  private cleanupGameTracking(gameId: string): void {
    this.lastEmitTime.delete(gameId);
    this.droppedFrames.delete(gameId);
  }

  private updateGame(game: GameState): void {
    game.tick++;

    // Handle AI input
    if (game.isAI && game.players[1]) {
      this.updateAI(game);
    }

    // Update ball physics
    this.updateBall(game);

    // Check collisions
    this.checkCollisions(game);

    // Check for goals
    this.checkGoals(game);
  }

  private updateAI(game: GameState): void {
    const ai = game.players[1];
    if (!ai || !game.aiDifficulty || !game.aiState) return;

    const difficulty = AI_DIFFICULTIES[game.aiDifficulty];
    const currentTime = Date.now();

    // Check if it's time for AI to react (reaction time delay)
    if (currentTime - game.aiState.lastReactionTime < difficulty.reactionTime) {
      // AI hasn't "seen" the ball change yet, don't update target
    } else {
      // AI can react now - update target position with accuracy errors
      const ballY = game.ball.y;

      // HIT COUNT SCALING: AI gets worse as rally continues (gets "tired" or loses focus)
      // Use ball speed as proxy for rally length since faster ball = more hits
      const currentSpeed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
      const baseSpeed = PONG_PHYSICS.BALL_SPEED_INITIAL;
      const speedIncrements = Math.max(
        0,
        (currentSpeed - baseSpeed) / PONG_PHYSICS.BALL_SPEED_INCREMENT,
      );
      const rallyLength = Math.min(speedIncrements, 15); // Cap at 15 increments for scaling

      // Difficulty degrades over time - easier AI degrades faster
      const difficultyDropoff = {
        EASY: 0.15, // Loses 15% effectiveness per 5 hits
        MEDIUM: 0.08, // Loses 8% effectiveness per 5 hits
        HARD: 0.04, // Loses 4% effectiveness per 5 hits
        IMPOSSIBLE: 0.02, // Loses 2% effectiveness per 5 hits
      };

      const degradationFactor = Math.max(
        0.3,
        1 - (rallyLength / 5) * difficultyDropoff[game.aiDifficulty],
      );

      // Apply degraded difficulty
      const adjustedAccuracy = difficulty.accuracy * degradationFactor;

      // Early rally bonus - first few hits are more accurate to avoid embarrassing misses
      const earlyGameBonus = rallyLength < 3 ? 1.3 : 1.0; // 30% bonus for first 3 exchanges
      const finalAccuracy = Math.min(0.95, adjustedAccuracy * earlyGameBonus);

      // Apply accuracy error based on adjusted difficulty
      const accuracyError = (1 - finalAccuracy) * 80; // Max error in pixels
      const randomError = (Math.random() - 0.5) * 2 * accuracyError;

      // On easier difficulties, AI sometimes "loses track" of the ball (but not in early game)
      let targetY = ballY;
      if (finalAccuracy < 0.8 && rallyLength > 2 && Math.random() < 0.05) {
        // 5% chance on easier difficulties to target old position (only after rally starts)
        targetY = game.aiState.targetY;
      }

      // Target the ball position with error and bias
      game.aiState.targetY = targetY + randomError + game.aiState.errorBias;
      game.aiState.lastReactionTime = currentTime;

      // Occasionally update error bias for more realistic play
      if (Math.random() < 0.03) {
        // 3% chance per update
        game.aiState.errorBias = (Math.random() - 0.5) * 60;
      }

      // On easier difficulties, sometimes AI "hesitates"
      if (difficulty.speed < 0.7 && Math.random() < 0.02) {
        game.aiState.lastReactionTime = currentTime + 100; // Add extra delay
      }
    }

    // Move paddle toward target with speed modifier
    const paddleCenter = ai.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
    const diff = game.aiState.targetY - paddleCenter;

    if (Math.abs(diff) > 5) {
      const basePaddleSpeed = PONG_PHYSICS.PADDLE_SPEED / PONG_PHYSICS.TICK_RATE;

      // Use adjusted speed based on rally length
      const currentBallSpeed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
      const baseBallSpeed = PONG_PHYSICS.BALL_SPEED_INITIAL;
      const speedIncrements = Math.max(
        0,
        (currentBallSpeed - baseBallSpeed) / PONG_PHYSICS.BALL_SPEED_INCREMENT,
      );
      const rallyLength = Math.min(speedIncrements, 15);

      const difficultyDropoff = {
        EASY: 0.15,
        MEDIUM: 0.08,
        HARD: 0.04,
        IMPOSSIBLE: 0.02,
      };
      const degradationFactor = Math.max(
        0.5,
        1 - (rallyLength / 5) * difficultyDropoff[game.aiDifficulty],
      );
      const adjustedSpeed = difficulty.speed * degradationFactor;

      const aiSpeed = basePaddleSpeed * adjustedSpeed;

      const oldPaddleY = ai.paddleY;

      if (diff > 0) {
        ai.paddleY = Math.min(
          PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
          ai.paddleY + aiSpeed,
        );
      } else {
        ai.paddleY = Math.max(0, ai.paddleY - aiSpeed);
      }

      // Debug log for significant changes (development only)
      if (process.env.NODE_ENV === 'development' && Math.abs(oldPaddleY - ai.paddleY) > 50) {
        console.log(
          `🏓 AI (${game.aiDifficulty}) paddle: ${oldPaddleY.toFixed(1)} -> ${ai.paddleY.toFixed(1)} (target: ${game.aiState.targetY.toFixed(1)}, ball: ${game.ball.y.toFixed(1)})`,
        );
      }
    }
  }

  private updateBall(game: GameState): void {
    game.ball.x += game.ball.vx / PONG_PHYSICS.TICK_RATE;
    game.ball.y += game.ball.vy / PONG_PHYSICS.TICK_RATE;
  }

  private checkCollisions(game: GameState): void {
    // Calculate ball boundaries once
    const ballTop = game.ball.y - PONG_PHYSICS.BALL_SIZE / 2;
    const ballBottom = game.ball.y + PONG_PHYSICS.BALL_SIZE / 2;
    const ballLeft = game.ball.x - PONG_PHYSICS.BALL_SIZE / 2;
    const ballRight = game.ball.x + PONG_PHYSICS.BALL_SIZE / 2;

    // Wall collisions - Fixed to use ball edges instead of center
    if (ballTop <= 0 || ballBottom >= PONG_PHYSICS.FIELD_HEIGHT) {
      game.ball.vy = -game.ball.vy;
      // Keep ball within bounds accounting for its radius
      if (ballTop <= 0) {
        game.ball.y = PONG_PHYSICS.BALL_SIZE / 2;
      } else {
        game.ball.y = PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Hitbox extension for better game feel (more forgiving at paddle edges)
    const PADDLE_HITBOX_EXTENSION = 5; // Extends paddle hitbox by 5px on top and bottom

    // Left paddle (player 0) - Simple X check at paddle front edge
    if (ballLeft <= PONG_PHYSICS.PADDLE_WIDTH && game.ball.vx < 0) {
      const paddle = game.players[0];
      // Check Y collision with extended hitbox
      // The visual paddle is 80px, but the hitbox is 90px (5px extra on each end)
      const paddleTop = paddle.paddleY - PADDLE_HITBOX_EXTENSION;
      const paddleBottom = paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT + PADDLE_HITBOX_EXTENSION;

      if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
        // Calculate hit position relative to paddle center (-1 to 1)
        const paddleCenter = paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
        const hitPosition = (game.ball.y - paddleCenter) / (PONG_PHYSICS.PADDLE_HEIGHT / 2);
        const clampedHit = Math.max(-1, Math.min(1, hitPosition));

        // Calculate angle modification (up to ±60 degrees for easier angled shots)
        const maxAngle = Math.PI / 3; // 60 degrees (increased from 45 degrees)
        const angleModifier = clampedHit * maxAngle;

        // Current ball speed
        const currentSpeed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
        const newSpeed = currentSpeed * 1.05; // Speed increase

        // Apply angle-based bounce - ensure ball always goes back to the right
        game.ball.vx = Math.abs(Math.cos(angleModifier)) * newSpeed; // Always positive (going right)
        game.ball.vy = Math.sin(angleModifier) * newSpeed;

        // Position ball just outside the paddle to prevent multiple collisions
        game.ball.x = PONG_PHYSICS.PADDLE_WIDTH + PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Right paddle (player 1) - Simple X check at paddle front edge
    if (ballRight >= PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH && game.ball.vx > 0) {
      const paddle = game.players[1];
      // Check Y collision with extended hitbox
      // The visual paddle is 80px, but the hitbox is 90px (5px extra on each end)
      if (paddle) {
        const paddleTop = paddle.paddleY - PADDLE_HITBOX_EXTENSION;
        const paddleBottom = paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT + PADDLE_HITBOX_EXTENSION;

        if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
          // Calculate hit position relative to paddle center (-1 to 1)
          const paddleCenter = paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
          const hitPosition = (game.ball.y - paddleCenter) / (PONG_PHYSICS.PADDLE_HEIGHT / 2);
          const clampedHit = Math.max(-1, Math.min(1, hitPosition));

          // Calculate angle modification (up to ±60 degrees for easier angled shots)
          const maxAngle = Math.PI / 3; // 60 degrees (increased from 45 degrees)
          const angleModifier = clampedHit * maxAngle;

          // Current ball speed
          const currentSpeed = Math.sqrt(game.ball.vx ** 2 + game.ball.vy ** 2);
          const newSpeed = currentSpeed * 1.05; // Speed increase

          // Apply angle-based bounce - ensure ball always goes back to the left
          game.ball.vx = -Math.abs(Math.cos(angleModifier)) * newSpeed; // Always negative (going left)
          game.ball.vy = Math.sin(angleModifier) * newSpeed;

          // Position ball just outside the paddle to prevent multiple collisions
          game.ball.x =
            PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH - PONG_PHYSICS.BALL_SIZE / 2;
        }
      }
    }
  }

  private checkGoals(game: GameState): void {
    // Score cooldown guard: Prevent rapid scoring (500ms minimum between scores)
    const now = Date.now();
    const lastScore = this.lastScoreTime.get(game.id) || 0;
    const timeSinceLastScore = now - lastScore;
    const SCORE_COOLDOWN_MS = 500;

    if (timeSinceLastScore < SCORE_COOLDOWN_MS) {
      // Too soon since last score, ignore to prevent rapid scoring
      return;
    }

    if (game.ball.x <= 0) {
      // Player 1 scored
      game.players[1]!.score++;
      this.lastScoreTime.set(game.id, now);
      this.onScore(game, 1);
    } else if (game.ball.x >= PONG_PHYSICS.FIELD_WIDTH) {
      // Player 0 scored
      game.players[0].score++;
      this.lastScoreTime.set(game.id, now);
      this.onScore(game, 0);
    }
  }

  private onScore(game: GameState, scorer: 0 | 1): void {
    this.io.to(`game:${game.id}`).emit('score_update', {
      scores: [game.players[0].score, game.players[1]?.score || 0],
      scorer,
    });

    // Check for game end
    const scoringPlayer = game.players[scorer];
    if (scoringPlayer && scoringPlayer.score >= PONG_PHYSICS.WINNING_SCORE) {
      this.endGame(game, 'completed', scorer);
    } else {
      // Stop ball movement immediately
      game.ball.vx = 0;
      game.ball.vy = 0;

      // Reset ball position to center
      game.ball.x = PONG_PHYSICS.FIELD_WIDTH / 2;
      game.ball.y = PONG_PHYSICS.FIELD_HEIGHT / 2;

      // Add 2-second delay before serving again
      setTimeout(() => {
        // Check if game still exists and is active
        const currentGame = this.games.get(game.id);
        if (currentGame && currentGame.status === 'active') {
          this.serveBall(currentGame);
        }
      }, 2000); // 2 second pause
    }
  }

  processInput(playerId: number, input: PlayerInput): void {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') return;

    // Find player slot
    let playerSlot: 0 | 1 | null = null;
    if (game.players[0].id === playerId) {
      playerSlot = 0;
    } else if (game.players[1]?.id === playerId) {
      playerSlot = 1;
    }

    if (playerSlot === null) return;

    // Use client's authoritative paddle position (with validation)
    const player = game.players[playerSlot];
    if (!player) return;

    // Validate paddle position is within bounds
    const maxPaddleY = PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT;
    const validatedPaddleY = Math.max(0, Math.min(maxPaddleY, input.paddleY));

    // Debug log for paddle updates (development only)
    if (
      process.env.NODE_ENV === 'development' &&
      Math.abs(player.paddleY - validatedPaddleY) > 10
    ) {
      console.log(
        `🏓 Player ${playerId} (slot ${playerSlot}) paddle: ${player.paddleY.toFixed(1)} -> ${validatedPaddleY.toFixed(1)}`,
      );
    }

    player.paddleY = validatedPaddleY;

    // Update ping
    player.ping = Math.max(0, Date.now() - input.timestamp);
    player.lastInputTime = Date.now();
  }

  private async endGame(game: GameState, reason: string, winnerSlot?: 0 | 1): Promise<void> {
    // Capture status BEFORE changing it (needed for match recording logic)
    const previousStatus = game.status;
    game.status = 'ended';

    // Clear game loop and cleanup tracking
    const interval = this.gameIntervals.get(game.id);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(game.id);
    }
    this.cleanupGameTracking(game.id);

    // Clear countdown guard if game ends during countdown
    this.countdownInProgress.delete(game.id);

    const duration = Math.floor((Date.now() - game.startTime) / 1000);
    const winnerPlayer = winnerSlot !== undefined ? game.players[winnerSlot] : null;
    const winnerId = winnerPlayer?.id || null; // Keep the actual ID (including negative AI IDs)

    // Calculate correct payout amount based on match type
    let payoutAmount = 0;
    if (winnerId) {
      if (game.isAI) {
        // AI match: difficulty-based payout multipliers
        // Winner gets: wager + (wager * multiplier)
        if (winnerId > 0 && game.aiDifficulty) {
          // Human won - apply difficulty multiplier
          const multiplier = PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER[game.aiDifficulty];
          payoutAmount = Math.floor(game.wager + game.wager * multiplier);
          console.log(
            `💰 AI payout (${game.aiDifficulty}): ${game.wager} + (${game.wager} * ${multiplier}) = ${payoutAmount}`,
          );
        } else {
          // AI won - no payout
          payoutAmount = 0;
        }
      } else {
        // PVP match: winner gets the full pot (2x stake total)
        payoutAmount = game.wager * 2;
      }
    }

    // Determine winner and loser based on actual winner ID
    const player1 = game.players[0];
    const player2 = game.players[1];
    const isPlayer1Winner = winnerId === player1.id;
    const isPlayer2Winner = winnerId === player2?.id;

    let winnerUserId = winnerId;
    let winnerName = isPlayer1Winner ? player1.name : isPlayer2Winner ? player2?.name : null;
    let winnerScore = isPlayer1Winner ? player1.score : isPlayer2Winner ? player2?.score : 0;

    let loserUserId: number | null = null;
    let loserName: string | null = null;
    let loserScore = 0;

    if (isPlayer1Winner && player2) {
      loserUserId = player2.id;
      loserName = player2.name;
      loserScore = player2.score;
    } else if (isPlayer2Winner) {
      loserUserId = player1.id;
      loserName = player1.name;
      loserScore = player1.score;
    }

    // Record result in database - simplified data structure
    // IMPORTANT: Determine if match should be recorded
    //
    // RECORD matches where:
    // 1. Game completed normally (reached winning score)
    // 2. Game reached a state where both players were present (ragequit/forfeit after joining)
    // 3. AI matches (always record)
    //
    // SKIP matches where:
    // 1. Game never started (wager_failed, early disconnect in lobby before 2nd player joined)
    // 2. No clear winner/loser (both players didn't exist)

    const hasValidPlayers = winnerUserId !== null && loserUserId !== null;
    const gameCompleted = reason === 'completed';

    // Game "started" if both players were present and ready
    // This includes: waiting_for_ready, countdown, active, paused
    // Excludes: waiting_for_opponent (only 1 player)
    const gameHadBothPlayers =
      previousStatus === 'waiting_for_ready' ||
      previousStatus === 'countdown' ||
      previousStatus === 'active' ||
      previousStatus === 'paused';

    const shouldRecordMatch = game.isAI || gameCompleted || (gameHadBothPlayers && hasValidPlayers);

    if (shouldRecordMatch && hasValidPlayers) {
      const result: MatchResult = {
        matchId: game.id,
        winnerId: winnerUserId,
        winnerName: winnerName || 'Unknown',
        winnerScore,
        loserId: loserUserId,
        loserName: loserName || null,
        loserScore,
        duration,
        wagerAmount: game.wager,
        payoutAmount,
        isAI: game.isAI,
        reason: reason as any,
      };

      await this.db.recordMatchResult(result);
    } else {
      console.log(
        `[endGame] Skipping match recording for ${game.id} - reason: ${reason}, winnerId: ${winnerUserId}, loserId: ${loserUserId}, status: ${game.status}, gameHadBothPlayers: ${gameHadBothPlayers}, hasValidPlayers: ${hasValidPlayers}`,
      );
    }

    // Send individual match_end events to each player with correct payout info
    if (game.players[0]) {
      const player1SocketId = this.auth.getSocketId(game.players[0].id);
      if (player1SocketId) {
        const player1Payout = winnerSlot === 0 ? payoutAmount : game.wager > 0 ? -game.wager : 0;
        this.io.to(player1SocketId).emit('match_end', {
          winner: winnerSlot !== undefined ? winnerSlot : null,
          scores: [winnerScore, loserScore],
          reason,
          duration,
          payout: player1Payout,
        });
      }
    }

    if (game.players[1]) {
      const player2SocketId = this.auth.getSocketId(game.players[1].id);
      if (player2SocketId) {
        const player2Payout = winnerSlot === 1 ? payoutAmount : game.wager > 0 ? -game.wager : 0;
        this.io.to(player2SocketId).emit('match_end', {
          winner: winnerSlot !== undefined ? winnerSlot : null,
          scores: [winnerScore, loserScore],
          reason,
          duration,
          payout: player2Payout,
        });
      }
    }

    // Send to spectators (they don't get payout info)
    const spectators = this.gameSpectators.get(game.id);
    if (spectators && spectators.size > 0) {
      const spectatorSocketIds = Array.from(spectators);
      spectatorSocketIds.forEach((socketId) => {
        this.io.to(socketId).emit('match_end', {
          winner: winnerSlot !== undefined ? winnerSlot : null,
          scores: [winnerScore, loserScore],
          reason,
          duration,
          payout: 0, // Spectators don't get payout info
        });
      });
    }

    // Remove from active games tracking
    this.stats.removeActiveGame(game.id);

    // Broadcast active games update when game ends
    this.broadcastActiveGamesUpdate();

    // Cleanup
    this.playerGames.delete(game.players[0].id);
    if (game.players[1]) {
      this.playerGames.delete(game.players[1].id);
    }

    setTimeout(() => {
      this.games.delete(game.id);
    }, 5000); // Keep game data for 5 seconds for final broadcasts
  }

  /**
   * Handle player reconnection during grace period
   * Returns true if player was reconnecting and game was resumed
   */
  handlePlayerReconnection(playerId: number): boolean {
    const graceInfo = this.disconnectionGracePeriods.get(playerId);
    if (!graceInfo) return false;

    console.log(`🔄 Player ${playerId} reconnected during grace period!`);

    // Clear the grace period timer
    clearTimeout(graceInfo.timer);
    this.disconnectionGracePeriods.delete(playerId);

    // Resume the game if it was paused
    const game = this.games.get(graceInfo.gameId);
    if (game && game.status === 'paused') {
      console.log(`▶️ Resuming game ${graceInfo.gameId} after reconnection`);
      game.status = 'active';

      // Notify all players that the game has resumed
      this.io.to(`game:${graceInfo.gameId}`).emit('game_resumed', {
        message: 'Player reconnected, game resumed',
      });
    }

    return true;
  }

  forfeitGame(playerId: number, immediate: boolean = false): void {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game) return;

    // ✅ RECONNECTION GRACE PERIOD: Don't immediately forfeit
    // Give player 10 seconds to reconnect for temporary network issues
    if (!immediate && game.status === 'active' && !game.isAI) {
      // Only apply grace period for active PVP games (not AI games)
      console.log(
        `⏳ Player disconnected - ${this.RECONNECTION_GRACE_PERIOD_MS / 1000}s grace period`,
      );

      // Pause the game
      game.status = 'paused';

      // Notify opponent that player disconnected
      this.io.to(`game:${gameId}`).emit('player_disconnected', {
        playerId,
        message: `Opponent disconnected. Waiting ${this.RECONNECTION_GRACE_PERIOD_MS / 1000} seconds for reconnection...`,
      });

      // Start grace period timer
      const timer = setTimeout(() => {
        console.log(`⏰ Grace period expired - forfeiting game`);
        this.disconnectionGracePeriods.delete(playerId);

        // Forfeit the game immediately (skip grace period this time)
        this.forfeitGame(playerId, true);
      }, this.RECONNECTION_GRACE_PERIOD_MS);

      // Store grace period info
      this.disconnectionGracePeriods.set(playerId, {
        gameId,
        timer,
        disconnectedAt: Date.now(),
      });

      return; // Don't forfeit yet
    }

    // Immediate forfeit (or grace period expired)
    console.log(`❌ Player forfeited game${immediate ? ' (immediate)' : ''}`);

    // Determine winner (opponent)
    const winnerSlot = game.players[0].id === playerId ? 1 : 0;
    this.endGame(game, 'forfeit', winnerSlot as 0 | 1);
  }

  async setPlayerReady(playerId: number, ready: boolean): Promise<void> {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game || !game.readyStates) return;

    // Find player slot
    let playerSlot: 0 | 1 | null = null;
    if (game.players[0]?.id === playerId) {
      playerSlot = 0;
    } else if (game.players[1]?.id === playerId) {
      playerSlot = 1;
    }

    if (playerSlot === null) return;

    // Update ready state
    game.readyStates[playerSlot] = ready;

    // Log ready state (development only)
    if (process.env.NODE_ENV === 'development') {
      console.log(
        `🏓 Player ${playerId} ready: ${ready} (${game.readyStates[0] ? '✅' : '❌'}, ${game.readyStates[1] ? '✅' : '❌'})`,
      );
    }

    // Broadcast ready state update
    this.io.to(`game:${gameId}`).emit('ready_state_update', { readyStates: game.readyStates });

    // Check if both players are ready
    if (game.readyStates[0] && game.readyStates[1] && game.status === 'waiting_for_ready') {
      // Log countdown start (keep in production for important event)
      console.log(`🏓 Both players ready in game ${gameId}, starting countdown`);

      // Process wager transaction now that both players are committed
      if (game.wager > 0 && !game.isAI && game.players[0] && game.players[1]) {
        const transaction = await this.db.processWagerTransaction(
          game.players[0].id,
          game.players[1].id,
          game.wager,
        );

        if (!transaction.success) {
          console.error(
            `💸 Wager transaction failed when both players ready: ${transaction.error}`,
          );
          // Notify both players of the failure and return them to lobby
          this.io.to(`game:${gameId}`).emit('error', {
            code: 'WAGER_FAILED',
            message: transaction.error || 'Wager transaction failed',
          });

          // End the game due to wager failure
          this.endGame(game, 'wager_failed');
          return;
        }
        console.log(
          `💸 Both players committed - wagers processed: ${game.wager} MB deducted from each`,
        );
      }

      game.status = 'countdown';
      this.startCountdown(game);
      // Broadcast active games update when game starts countdown
      this.broadcastActiveGamesUpdate();
    }
  }

  getGame(gameId: string): GameState | null {
    return this.games.get(gameId) || null;
  }

  /**
   * Check if a player is currently in an active game (not ended)
   * Used to prevent players from joining multiple games simultaneously
   */
  isPlayerInGame(playerId: number): boolean {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return false;

    const game = this.games.get(gameId);
    // Player is considered "in game" if game exists and hasn't ended
    return game !== undefined && game.status !== 'ended';
  }

  // ——————————————————————————————————————————————————————————————————————————————————
  // SPECTATOR FUNCTIONALITY
  // ——————————————————————————————————————————————————————————————————————————————————

  private broadcastActiveGamesUpdate(): void {
    const activeGames = this.getActiveGames();
    this.io.to('lobby').emit('active_games', { games: activeGames });

    // Only log in development (very verbose)
    if (process.env.NODE_ENV === 'development') {
      console.log(`📡 Broadcasting ${activeGames.length} active games to lobby`);
    }
  }

  addSpectator(gameId: string, socketId: string): boolean {
    const game = this.games.get(gameId);
    if (!game || game.status === 'ended') {
      return false;
    }

    // Initialize spectators set if it doesn't exist
    if (!this.gameSpectators.has(gameId)) {
      this.gameSpectators.set(gameId, new Set());
    }

    // Add spectator
    this.gameSpectators.get(gameId)!.add(socketId);
    this.spectatorGames.set(socketId, gameId);

    console.log(
      `👁️ Spectator ${socketId} joined game ${gameId}. Total spectators: ${this.gameSpectators.get(gameId)!.size}`,
    );

    // Broadcast active games update when spectator joins
    this.broadcastActiveGamesUpdate();

    return true;
  }

  removeSpectator(socketId: string): void {
    const gameId = this.spectatorGames.get(socketId);
    if (gameId) {
      const spectators = this.gameSpectators.get(gameId);
      if (spectators) {
        spectators.delete(socketId);
        if (spectators.size === 0) {
          this.gameSpectators.delete(gameId);
        }
      }
      this.spectatorGames.delete(socketId);
      console.log(`👁️ Spectator ${socketId} left game ${gameId}`);

      // Broadcast active games update when spectator leaves
      this.broadcastActiveGamesUpdate();
    }
  }

  getSpectatorCount(gameId: string): number {
    return this.gameSpectators.get(gameId)?.size || 0;
  }

  getSpectatorGameId(socketId: string): string | undefined {
    return this.spectatorGames.get(socketId);
  }

  getActiveGames(): ActiveGameEntry[] {
    const activeGames: ActiveGameEntry[] = [];

    for (const [gameId, game] of this.games.entries()) {
      // Only include games that have started or are about to start
      if (game.status === 'waiting_for_opponent') {
        continue; // Skip games waiting for players
      }

      const pot = game.isAI ? game.wager : game.wager * 2; // AI games: wager, PvP: double wager

      activeGames.push({
        id: gameId,
        player1Name: game.players[0]?.name || 'Unknown',
        player2Name: game.isAI ? 'AI' : game.players[1]?.name || 'Waiting...',
        type: game.isAI ? 'ai' : 'pvp',
        wager: game.wager,
        pot,
        scores: [game.players[0]?.score || 0, game.players[1]?.score || 0],
        status: game.status,
        spectatorCount: this.getSpectatorCount(gameId),
        startedAt: game.startTime,
        canSpectate:
          game.status === 'active' ||
          game.status === 'countdown' ||
          game.status === 'waiting_for_ready',
      });
    }

    return activeGames.sort((a, b) => b.startedAt - a.startedAt);
  }

  // Broadcast game state to both players and spectators
  broadcastGameState(game: GameState): void {
    // Get player paddle positions
    const player1PaddleY = game.players[0]?.paddleY || 0;
    const player2PaddleY = game.players[1]?.paddleY || 0;
    const pot = game.isAI ? game.wager : game.wager * 2;

    // Broadcast to each player individually (they only see opponent paddle)
    if (game.players[0]) {
      const player1SocketId = this.auth.getSocketId(game.players[0].id);
      if (player1SocketId) {
        this.io.to(player1SocketId).emit('game_state', {
          ball: game.ball,
          opponentPaddleY: player2PaddleY,
          scores: [game.players[0].score, game.players[1]?.score || 0],
          tick: game.tick,
          timestamp: Date.now(),
          wager: game.wager,
          pot,
        });
      }
    }

    if (game.players[1]) {
      const player2SocketId = this.auth.getSocketId(game.players[1].id);
      if (player2SocketId) {
        this.io.to(player2SocketId).emit('game_state', {
          ball: game.ball,
          opponentPaddleY: player1PaddleY,
          scores: [game.players[0]?.score || 0, game.players[1].score],
          tick: game.tick,
          timestamp: Date.now(),
          wager: game.wager,
          pot,
        });
      }
    }

    // Broadcast to spectators (they see both paddles)
    const spectators = this.gameSpectators.get(game.id);
    if (spectators && spectators.size > 0) {
      const spectatorSocketIds = Array.from(spectators);
      spectatorSocketIds.forEach((socketId) => {
        this.io.to(socketId).emit('game_state', {
          ball: game.ball,
          player1PaddleY,
          player2PaddleY,
          scores: [game.players[0]?.score || 0, game.players[1]?.score || 0],
          tick: game.tick,
          timestamp: Date.now(),
          wager: game.wager,
          pot,
        });
      });
    }
  }

  cleanup(): void {
    // Clear all game intervals
    this.gameIntervals.forEach((interval) => clearInterval(interval));
    this.gameIntervals.clear();

    // Clear all reconnection grace period timers
    this.disconnectionGracePeriods.forEach((graceInfo) => clearTimeout(graceInfo.timer));
    this.disconnectionGracePeriods.clear();

    // Clear all game data
    this.games.clear();
    this.playerGames.clear();
    this.gameSpectators.clear();
    this.spectatorGames.clear();
    this.countdownInProgress.clear();
    this.lastScoreTime.clear();

    console.log('🧹 Game manager cleanup complete');
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN PONG GAME SERVER
// ——————————————————————————————————————————————————————————————————————————————————

export class PongGameServer {
  private app = express();
  private server = createServer(this.app);

  // Allowed origins - strict whitelist for production security
  private allowedOrigins = [env.CLIENT_APP_URL, env.BASE_URL_CLIENT].filter(Boolean);

  private io = new SocketIOServer(this.server, {
    cors: {
      origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, curl)
        if (!origin) return callback(null, true);

        // Check against whitelist
        if (this.allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Development: Allow localhost on any port
        if (env.NODE_ENV === 'development') {
          if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
          }
        }

        // Reject all other origins
        console.warn(`[CORS] Rejected Socket.IO origin: ${origin}`);
        securityLogger.log({
          type: 'cors_violation',
          socketId: 'unknown',
          details: { origin, protocol: 'socket.io' },
        });
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    },
  });

  private db = new DatabaseManager();
  private auth = new AuthManager(this.db);
  private lobby = new LobbyManager();
  private stats = new StatisticsManager();
  private game = new GameManager(this.io, this.db, this.auth, this.stats);
  private rateLimiter = new SocketRateLimiter();
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMiddleware();
    this.setupSocketHandlers();
    this.setupStatsBroadcasting();
  }

  private setupMiddleware(): void {
    // ════════════════════════════════════════════════════════════════════════════
    // Trust Proxy - Required for Fly.io deployment
    // ════════════════════════════════════════════════════════════════════════════
    // Set to 1 to trust only the first proxy (Fly.io's proxy) for security
    this.app.set('trust proxy', 1);

    // ════════════════════════════════════════════════════════════════════════════
    // Security Middleware - Configure First
    // ════════════════════════════════════════════════════════════════════════════

    // Helmet - Security headers protection
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Allow inline styles for React
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
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

    // HTTPS redirect for production (exclude health check)
    if (env.NODE_ENV === 'production') {
      this.app.use((req, res, next) => {
        // Allow health check to work over HTTP (internal Fly proxy check)
        if (req.path === '/health') {
          return next();
        }
        if (req.header('x-forwarded-proto') !== 'https') {
          return res.redirect(`https://${req.header('host')}${req.url}`);
        }
        next();
      });
    }

    // ════════════════════════════════════════════════════════════════════════════
    // CORS Configuration
    // ════════════════════════════════════════════════════════════════════════════

    this.app.use(
      cors({
        origin: (origin, callback) => {
          // Allow requests with no origin (mobile apps, Postman, curl)
          if (!origin) return callback(null, true);

          // Check against whitelist
          if (this.allowedOrigins.includes(origin)) {
            return callback(null, true);
          }

          // Development: Allow localhost on any port
          if (env.NODE_ENV === 'development') {
            if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
              return callback(null, true);
            }
          }

          // Reject all other origins
          console.warn(`[CORS] Rejected HTTP origin: ${origin}`);
          securityLogger.log({
            type: 'cors_violation',
            socketId: 'unknown',
            details: { origin, protocol: 'http' },
          });
          callback(new Error('Not allowed by CORS'));
        },
        credentials: true,
      }),
    );

    // ════════════════════════════════════════════════════════════════════════════
    // Body Parsing Middleware
    // ════════════════════════════════════════════════════════════════════════════

    this.app.use(express.json({ limit: '100kb' })); // Prevent large payload attacks

    // ════════════════════════════════════════════════════════════════════════════
    // Health Check Endpoint
    // ════════════════════════════════════════════════════════════════════════════

    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🏓 Socket ${socket.id} connected`);

      // Authentication
      socket.on('auth', async (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'auth')) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many auth attempts' });
          securityLogger.log({
            type: 'rate_limit',
            socketId: socket.id,
            details: { event: 'auth' },
          });
          return;
        }

        // Payload validation
        if (!validatePayload(data, 'auth')) {
          socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid auth payload' });
          securityLogger.log({
            type: 'invalid_payload',
            socketId: socket.id,
            details: { event: 'auth' },
          });
          return;
        }

        // Input validation
        if (!validateAuth(data)) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid auth data' });
          securityLogger.log({
            type: 'invalid_input',
            socketId: socket.id,
            details: { event: 'auth' },
          });
          return;
        }

        const player = await this.auth.authenticateSocket(socket.id, data.token);
        if (player) {
          console.log(`✅ Player ${player.name} (${player.id}) authenticated`);

          // ✅ RECONNECTION GRACE PERIOD: Check if player is reconnecting
          const wasReconnecting = this.game.handlePlayerReconnection(player.id);
          if (wasReconnecting) {
            console.log(`🔄 Player ${player.name} (${player.id}) reconnected to ongoing game`);
            // Re-join the game room
            const gameId = this.game['playerGames'].get(player.id);
            if (gameId) {
              socket.join(`game:${gameId}`);
              const game = this.game.getGame(gameId);
              if (game) {
                // Send current game state to reconnected player
                const playerSlot = game.players[0].id === player.id ? 0 : 1;
                socket.emit('match_joined', {
                  gameId,
                  playerSlot,
                  opponent: game.players[playerSlot === 0 ? 1 : 0],
                  wager: game.wager,
                  pot: game.isAI ? game.wager : game.wager * 2,
                });
              }
            }
          }

          // Auto-join lobby room for PvP lobby updates
          socket.join('lobby');
          console.log(`🏓 Player ${player.name} auto-joined lobby room`);

          socket.emit('auth_result', { success: true, player });

          // Track connected player in statistics
          this.stats.addConnectedPlayer(player.id);

          // Send current lobby state immediately
          socket.emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });

          // Broadcast updated stats to all lobby users
          this.broadcastStatsUpdate();
        } else {
          console.log(`❌ Authentication failed for socket ${socket.id}`);
          socket.emit('auth_result', { success: false, error: 'Invalid token' });
          securityLogger.log({
            type: 'auth_failed',
            socketId: socket.id,
            details: {},
          });
        }
      });

      // Join lobby
      socket.on('join_lobby', () => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        socket.join('lobby');
        socket.emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
        socket.emit('active_games', { games: this.game.getActiveGames() });
      });

      // Create match
      socket.on('create_match', async (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'create_match')) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many match creation attempts' });
          return;
        }

        // Payload validation
        if (!validatePayload(data, 'create_match')) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid create_match payload',
          });
          securityLogger.log({
            type: 'invalid_payload',
            socketId: socket.id,
            details: { event: 'create_match' },
          });
          return;
        }

        // Input validation
        if (!validateCreateMatch(data)) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid match data' });
          securityLogger.log({
            type: 'invalid_input',
            socketId: socket.id,
            details: { event: 'create_match' },
          });
          return;
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Game membership validation: Prevent player from creating multiple games
        if (this.game.isPlayerInGame(player.id)) {
          socket.emit('error', {
            code: 'ALREADY_IN_GAME',
            message:
              'You are already in an active game. Please finish or leave your current game first.',
          });
          console.warn(
            `⚠️ Player ${player.name} (${player.id}) attempted to create a game while already in one`,
          );
          return;
        }

        // Validate AI difficulty for AI matches
        let validatedDifficulty: AIDifficulty = 'MEDIUM'; // default
        if (data.type === 'ai') {
          if (!data.aiDifficulty || !isValidAIDifficulty(data.aiDifficulty)) {
            socket.emit('error', { code: 'INVALID_DIFFICULTY', message: 'Invalid AI difficulty' });
            return;
          }
          validatedDifficulty = data.aiDifficulty as AIDifficulty;
        }

        // Validate wager amount
        const wagerError = validateWager(data.wager, data.type, validatedDifficulty);
        if (wagerError) {
          socket.emit('error', { code: 'INVALID_WAGER', message: wagerError });
          return;
        }

        // Validate user has sufficient balance (skip for free games)
        if (data.wager > 0) {
          const canAfford = await this.db.validateWager(player.id, data.wager);
          if (!canAfford) {
            socket.emit('error', { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient MuskBucks' });
            return;
          }
        }

        // Create lobby
        const lobbyId = this.lobby.createLobby(player, data.wager, data.type);
        console.log(
          `🏓 Created ${data.type} lobby ${lobbyId} by ${player.name} with wager ${data.wager}`,
        );

        if (data.type === 'ai') {
          // Start AI game immediately with comprehensive error handling
          try {
            const difficulty = validatedDifficulty;
            const aiPlayer = await this.db.createAIPlayer(difficulty);

            const gameId = `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            socket.join(`game:${gameId}`);

            socket.emit('match_joined', {
              gameId,
              playerSlot: 0,
              opponent: aiPlayer,
              wager: data.wager,
              pot: data.wager,
            });

            const gameResult = await this.game.startGame(
              gameId,
              [player, aiPlayer],
              data.wager,
              true,
              validatedDifficulty,
            );
            if (!gameResult.success) {
              socket.emit('error', {
                code: 'GAME_START_FAILED',
                message: gameResult.error || 'Failed to start game',
              });
              // Cleanup lobby on game start failure
              this.lobby.deleteLobby(lobbyId);
              return;
            }
            this.lobby.deleteLobby(lobbyId);
          } catch (error) {
            // Comprehensive error handling for AI player creation/game start
            console.error(`❌ AI game creation failed for player ${player.name}:`, error);
            socket.emit('error', {
              code: 'AI_GAME_CREATION_FAILED',
              message: 'Failed to create AI game. Please try again.',
            });
            // Cleanup lobby on error
            this.lobby.deleteLobby(lobbyId);
            // Note: Not a security event, just operational error (already logged via console.error)
            return;
          }
        } else {
          // PvP: Create game immediately and put creator in waiting state
          const gameId = `game-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          socket.join(`game:${gameId}`);

          // Notify creator they've joined the match
          socket.emit('match_joined', {
            gameId,
            playerSlot: 0,
            opponent: undefined,
            wager: data.wager,
            pot: data.wager * 2,
          });

          // Start game in waiting_for_opponent state (no wager deduction yet for PVP)
          const gameResult = await this.game.startGame(gameId, [player, null], data.wager, false);
          if (!gameResult.success) {
            socket.emit('error', {
              code: 'GAME_START_FAILED',
              message: gameResult.error || 'Failed to create lobby',
            });
            return;
          }

          // Keep lobby available for others to join
          const availableLobbies = this.lobby.getAvailableLobbies();
          // Only log in development (verbose)
          if (process.env.NODE_ENV === 'development') {
            console.log(
              `🏓 Broadcasting ${availableLobbies.length} available lobbies to lobby room`,
            );
          }
          this.io.to('lobby').emit('lobby_state', { lobbies: availableLobbies });
        }
      });

      // Join match
      socket.on('join_match', async (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'join_match')) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many join attempts' });
          return;
        }

        // Payload validation
        if (!validatePayload(data, 'join_match')) {
          socket.emit('error', { code: 'INVALID_PAYLOAD', message: 'Invalid join_match payload' });
          return;
        }

        // Input validation
        if (!validateJoinMatch(data)) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid match ID' });
          return;
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Game membership validation: Prevent player from joining multiple games
        if (this.game.isPlayerInGame(player.id)) {
          socket.emit('error', {
            code: 'ALREADY_IN_GAME',
            message:
              'You are already in an active game. Please finish or leave your current game first.',
          });
          console.warn(
            `⚠️ Player ${player.name} (${player.id}) attempted to join a game while already in one`,
          );
          return;
        }

        const lobby = this.lobby.getLobby(data.matchId);
        if (!lobby) {
          socket.emit('error', { code: 'MATCH_NOT_FOUND', message: 'Match not found' });
          return;
        }

        // Validate wager (skip validation for free games)
        if (lobby.wager > 0) {
          const canAfford = await this.db.validateWager(player.id, lobby.wager);
          if (!canAfford) {
            socket.emit('error', { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient MuskBucks' });
            return;
          }
        }

        // Join lobby
        if (!this.lobby.joinLobby(data.matchId, player)) {
          socket.emit('error', { code: 'CANNOT_JOIN', message: 'Cannot join this match' });
          return;
        }

        // Find existing game for this lobby
        const creator = this.auth.getPlayerByUserId(lobby.creatorId);
        if (!creator) {
          socket.emit('error', { code: 'CREATOR_NOT_FOUND', message: 'Match creator not found' });
          return;
        }

        // Find the game created by the lobby creator
        const existingGameId = this.game['playerGames'].get(creator.id);
        if (!existingGameId) {
          socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
          return;
        }

        const game = this.game.getGame(existingGameId);
        if (!game || game.players[1] !== null) {
          socket.emit('error', { code: 'GAME_FULL', message: 'Game is already full' });
          return;
        }

        // Don't process wager yet - wait until both players are ready

        // Join the existing game
        socket.join(`game:${existingGameId}`);

        // Update game state with second player
        game.players[1] = player;
        game.status = 'waiting_for_ready';
        this.game['playerGames'].set(player.id, existingGameId);

        // Notify joiner
        const pot = lobby.wager * 2;
        socket.emit('match_joined', {
          gameId: existingGameId,
          playerSlot: 1,
          opponent: creator,
          wager: lobby.wager,
          pot,
        });

        // Notify creator that opponent joined (but NOT the joiner themselves!)
        socket.to(`game:${existingGameId}`).emit('opponent_joined', { opponent: player });

        // Remove lobby and update lobby list
        this.lobby.deleteLobby(data.matchId);
        this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
      });

      // Player ready
      socket.on('player_ready', async (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'player_ready')) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many ready toggles' });
          return;
        }

        // Payload validation
        if (!validatePayload(data, 'player_ready')) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid player_ready payload',
          });
          return;
        }

        // Input validation
        if (!validatePlayerReady(data)) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid ready state' });
          return;
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        await this.game.setPlayerReady(player.id, data.ready);
      });

      // Player input
      socket.on('player_input', (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'player_input')) {
          // Don't emit error for input rate limiting - just drop the input silently
          // (emitting errors would slow down the game loop)
          return;
        }

        // Payload validation (lightweight for performance)
        if (!validatePayload(data, 'player_input')) {
          return; // Silently drop invalid payloads for performance
        }

        // Input validation
        if (!validatePlayerInput(data)) {
          return; // Silently drop invalid input for performance
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        this.game.processInput(player.id, data as PlayerInput);
      });

      // Ping request (for accurate ping measurement)
      socket.on('ping_request', (data: unknown) => {
        // Rate limiting (allow frequent ping requests)
        if (!this.rateLimiter.checkLimit(socket.id, 'ping_request')) {
          return; // Silently drop excessive ping requests
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Type guard
        if (
          !data ||
          typeof data !== 'object' ||
          !('clientTimestamp' in data) ||
          typeof data.clientTimestamp !== 'number'
        ) {
          return; // Silently drop invalid ping requests
        }

        // Send back the client timestamp and server timestamp
        socket.emit('ping_response', {
          clientTimestamp: data.clientTimestamp,
          serverTimestamp: Date.now(),
        });
      });

      // Leave match
      socket.on('leave_match', () => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Check if this is a spectator leaving
        const spectatorGameId = this.game.getSpectatorGameId(socket.id);
        if (spectatorGameId) {
          console.log(`👁️ Spectator ${socket.id} leaving game ${spectatorGameId}`);
          socket.leave(`game:${spectatorGameId}`);
          this.game.removeSpectator(socket.id);
        } else {
          // Regular player leaving
          this.game.forfeitGame(player.id);
        }

        this.lobby.leaveLobby(player.id);

        // Update lobby
        this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
      });

      // Spectate match
      socket.on('spectate_match', (data: unknown) => {
        // Rate limiting
        if (!this.rateLimiter.checkLimit(socket.id, 'spectate_match')) {
          socket.emit('error', { code: 'RATE_LIMIT', message: 'Too many spectate attempts' });
          return;
        }

        // Payload validation
        if (!validatePayload(data, 'spectate_match')) {
          socket.emit('error', {
            code: 'INVALID_PAYLOAD',
            message: 'Invalid spectate_match payload',
          });
          return;
        }

        // Input validation
        if (!validateSpectateMatch(data)) {
          socket.emit('error', { code: 'INVALID_INPUT', message: 'Invalid game ID' });
          return;
        }

        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        const gameId = data.gameId;
        const success = this.game.addSpectator(gameId, socket.id);

        if (success) {
          const game = this.game.getGame(gameId);
          if (game) {
            // Join the game room so spectator receives match_end events
            socket.join(`game:${gameId}`);
            console.log(`👁️ Spectator ${socket.id} joined room game:${gameId}`);

            socket.emit('spectator_joined', {
              gameId,
              spectatorCount: this.game.getSpectatorCount(gameId),
            });

            // Send initial game state for spectators immediately
            if (
              game.status === 'active' ||
              game.status === 'countdown' ||
              game.status === 'waiting_for_ready'
            ) {
              // Force a game state update to the new spectator
              setTimeout(() => {
                this.game.broadcastGameState(game);
              }, 100); // Small delay to ensure spectator is properly set up
            }
          }
        } else {
          socket.emit('error', {
            code: 'SPECTATE_FAILED',
            message: 'Cannot spectate this game',
          });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        const player = this.auth.getPlayer(socket.id);
        if (player) {
          console.log(`🏓 Player ${player.name} disconnected`);

          // Handle game forfeit
          this.game.forfeitGame(player.id);

          // Handle spectator cleanup
          this.game.removeSpectator(socket.id);

          // Handle lobby cleanup
          const leftLobbyId = this.lobby.leaveLobby(player.id);
          if (leftLobbyId) {
            console.log(`🏓 Player ${player.name} left lobby ${leftLobbyId}`);
          }

          // Track disconnected player in statistics
          this.stats.removeConnectedPlayer(player.id);

          // Clean up rate limiting data
          this.rateLimiter.resetSocket(socket.id);

          // Clean up authentication
          this.auth.disconnectSocket(socket.id);

          // Update lobby for remaining players
          this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });

          // Broadcast updated stats
          this.broadcastStatsUpdate();
        }
      });
    });
  }

  private setupStatsBroadcasting(): void {
    // Broadcast stats every 5 seconds to all lobby users
    this.statsInterval = setInterval(() => {
      const stats = this.stats.getStats(this.lobby.getAvailableLobbies().length);
      this.io.to('lobby').emit('stats_update', stats);
    }, 5000);
  }

  private broadcastStatsUpdate(): void {
    const stats = this.stats.getStats(this.lobby.getAvailableLobbies().length);
    this.io.to('lobby').emit('stats_update', stats);
  }

  start(port: number = 5001): void {
    // Enhanced error handling for port conflicts
    this.server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        console.error('\n❌ ERROR: Port already in use!');
        console.error(`   Port ${port} is already being used by another process.`);
        console.error('\n💡 Solutions:');
        console.error('   1. Run cleanup script: npm run cleanup');
        console.error(`   2. Kill the process manually: lsof -ti:${port} | xargs kill -9`);
        console.error(
          `   3. Find what's using the port: lsof -i :${port} -sTCP:LISTEN -P -n -F pn | head -2\n`,
        );
        process.exit(1);
      } else {
        console.error('Server error:', error);
        process.exit(1);
      }
    });

    this.server.listen(port, () => {
      console.log(`✅ Optimized Pong Game Server running on port ${port}`);
      console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `   Performance: ${PONG_PHYSICS.TICK_RATE}fps game loop, ${PONG_PHYSICS.ACTIVE_NETWORK_UPDATE_RATE}fps active/${PONG_PHYSICS.NETWORK_UPDATE_RATE}fps idle network\n`,
      );
    });
  }

  async stop(): Promise<void> {
    console.log('🛑 Shutting down Pong Game Server...');

    // Clear the stats broadcasting interval
    if (this.statsInterval) {
      clearInterval(this.statsInterval);
      this.statsInterval = null;
    }

    // Clear all game intervals and data
    this.game.cleanup();

    // Disconnect all sockets
    this.io.disconnectSockets();

    // Close the HTTP server with callback
    await new Promise<void>((resolve) => {
      this.server.close(() => {
        console.log('🔌 HTTP server closed');
        resolve();
      });
    });

    console.log('🗄️ API client shutdown complete');

    console.log('✅ Pong Game Server shutdown complete');
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new PongGameServer();
  let isShuttingDown = false;

  const gracefulShutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n📡 Received ${signal}, starting graceful shutdown...`);
    try {
      await server.stop();
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', async () => {
    await gracefulShutdown('SIGTERM');
  });
  process.on('SIGINT', async () => {
    await gracefulShutdown('SIGINT');
  });

  server.start();
}
