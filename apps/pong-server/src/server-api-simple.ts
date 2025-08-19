import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { PongApiClient } from './api-client';
import {
  Player,
  GameState,
  LobbyEntry,
  ActiveGameEntry,
  PlayerInput,
  ClientEvents,
  MatchResult,
  PONG_PHYSICS,
  AI_DIFFICULTIES,
} from '@ems/types';

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

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const isAI = playerTwoId === null || playerTwoId === 0;
      const result = await this.api.processWagerTransaction(
        playerOneId,
        isAI ? null : playerTwoId,
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
        scores: result.finalScores,
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
    console.log(`📊 Player ${playerId} connected. Total online: ${this.connectedPlayers.size}`);
  }

  removeConnectedPlayer(playerId: number): void {
    this.connectedPlayers.delete(playerId);
    console.log(`📊 Player ${playerId} disconnected. Total online: ${this.connectedPlayers.size}`);
  }

  addActiveGame(gameId: string): void {
    this.activeGames.add(gameId);
    console.log(`📊 Game ${gameId} started. Total active: ${this.activeGames.size}`);
  }

  removeActiveGame(gameId: string): void {
    this.activeGames.delete(gameId);
    console.log(`📊 Game ${gameId} ended. Total active: ${this.activeGames.size}`);
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
    aiDifficulty?: keyof typeof AI_DIFFICULTIES,
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
      aiDifficulty: isAI ? aiDifficulty || 'medium' : undefined,
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
      }
      countdown--;
    }, 1000);
  }

  private serveBall(game: GameState): void {
    const angle = ((Math.random() - 0.5) * Math.PI) / 3; // -30 to 30 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;

    game.ball.vx = Math.cos(angle) * PONG_PHYSICS.BALL_SPEED_INITIAL * direction;
    game.ball.vy = Math.sin(angle) * PONG_PHYSICS.BALL_SPEED_INITIAL;
  }

  private startGameLoop(game: GameState): void {
    const interval = setInterval(() => {
      if (game.status !== 'active') {
        clearInterval(interval);
        return;
      }

      this.updateGame(game);

      // Broadcast based on network update rate
      const broadcastInterval = Math.max(
        1,
        Math.round(PONG_PHYSICS.TICK_RATE / PONG_PHYSICS.NETWORK_UPDATE_RATE),
      );
      if (game.tick % broadcastInterval === 0) {
        this.broadcastGameState(game);
      }
    }, 1000 / PONG_PHYSICS.TICK_RATE);

    this.gameIntervals.set(game.id, interval);
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
        easy: 0.15, // Loses 15% effectiveness per 5 hits
        medium: 0.08, // Loses 8% effectiveness per 5 hits
        hard: 0.04, // Loses 4% effectiveness per 5 hits
        impossible: 0.02, // Loses 2% effectiveness per 5 hits
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
        easy: 0.15,
        medium: 0.08,
        hard: 0.04,
        impossible: 0.02,
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

      // Debug log for significant changes
      if (Math.abs(oldPaddleY - ai.paddleY) > 50) {
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
    if (game.ball.x <= 0) {
      // Player 1 scored
      game.players[1]!.score++;
      this.onScore(game, 1);
    } else if (game.ball.x >= PONG_PHYSICS.FIELD_WIDTH) {
      // Player 0 scored
      game.players[0].score++;
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

    // Debug log for paddle updates
    if (Math.abs(player.paddleY - validatedPaddleY) > 10) {
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
    game.status = 'ended';

    // Clear game loop
    const interval = this.gameIntervals.get(game.id);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(game.id);
    }

    const duration = Math.floor((Date.now() - game.startTime) / 1000);
    const winnerPlayer = winnerSlot !== undefined ? game.players[winnerSlot] : null;
    const winnerId = winnerPlayer?.id === 0 ? null : winnerPlayer?.id || null; // AI wins (id: 0) become null

    // Record result in database
    const result: MatchResult = {
      matchId: game.id,
      winnerId,
      winnerSlot: winnerSlot ?? null,
      playerOneId: game.players[0].id,
      playerTwoId: game.players[1]?.id === 0 ? null : game.players[1]?.id || null, // AI players (id: 0) become null
      finalScores: [game.players[0].score, game.players[1]?.score || 0],
      duration,
      wagerAmount: game.wager,
      payoutAmount: winnerId ? game.wager * 2 : 0,
      reason: reason as any,
    };

    await this.db.recordMatchResult(result);

    // Send individual match_end events to each player with correct payout info
    if (game.players[0]) {
      const player1SocketId = this.auth.getSocketId(game.players[0].id);
      if (player1SocketId) {
        const player1Payout =
          winnerSlot === 0 ? result.payoutAmount : game.wager > 0 ? -game.wager : 0;
        this.io.to(player1SocketId).emit('match_end', {
          winner: winnerSlot !== undefined ? winnerSlot : null,
          scores: result.finalScores,
          reason,
          duration,
          payout: player1Payout,
        });
      }
    }

    if (game.players[1]) {
      const player2SocketId = this.auth.getSocketId(game.players[1].id);
      if (player2SocketId) {
        const player2Payout =
          winnerSlot === 1 ? result.payoutAmount : game.wager > 0 ? -game.wager : 0;
        this.io.to(player2SocketId).emit('match_end', {
          winner: winnerSlot !== undefined ? winnerSlot : null,
          scores: result.finalScores,
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
          scores: result.finalScores,
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

  forfeitGame(playerId: number): void {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game) return;

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
    console.log(
      `🏓 Player ${playerId} ready: ${ready} (${game.readyStates[0] ? '✅' : '❌'}, ${game.readyStates[1] ? '✅' : '❌'})`,
    );

    // Broadcast ready state update
    this.io.to(`game:${gameId}`).emit('ready_state_update', { readyStates: game.readyStates });

    // Check if both players are ready
    if (game.readyStates[0] && game.readyStates[1] && game.status === 'waiting_for_ready') {
      console.log(
        `🏓 Both players ready in game ${gameId}, processing wagers and starting countdown!`,
      );

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

  // ——————————————————————————————————————————————————————————————————————————————————
  // SPECTATOR FUNCTIONALITY
  // ——————————————————————————————————————————————————————————————————————————————————

  private broadcastActiveGamesUpdate(): void {
    const activeGames = this.getActiveGames();
    this.io.to('lobby').emit('active_games', { games: activeGames });
    console.log(`📡 Broadcasting ${activeGames.length} active games to lobby`);
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

    // Clear all game data
    this.games.clear();
    this.playerGames.clear();
    this.gameSpectators.clear();
    this.spectatorGames.clear();

    console.log('🧹 Game manager cleanup complete');
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// MAIN PONG GAME SERVER
// ——————————————————————————————————————————————————————————————————————————————————

export class PongGameServer {
  private app = express();
  private server = createServer(this.app);
  private io = new SocketIOServer(this.server, {
    cors: {
      origin:
        process.env.NODE_ENV === 'production'
          ? process.env.CLIENT_URL || 'https://elonmusksucks.net'
          : ['http://localhost:3000', 'http://127.0.0.1:3000'],
      credentials: true,
    },
  });

  private db = new DatabaseManager();
  private auth = new AuthManager(this.db);
  private lobby = new LobbyManager();
  private stats = new StatisticsManager();
  private game = new GameManager(this.io, this.db, this.auth, this.stats);
  private statsInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.setupMiddleware();
    this.setupSocketHandlers();
    this.setupStatsBroadcasting();
  }

  private setupMiddleware(): void {
    this.app.use(cors());
    this.app.use(express.json());

    // Health check
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`🏓 Socket ${socket.id} connected`);

      // Authentication
      socket.on('auth', async (data: ClientEvents['auth']) => {
        const player = await this.auth.authenticateSocket(socket.id, data.token);
        if (player) {
          console.log(`✅ Player ${player.name} (${player.id}) authenticated`);

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
      socket.on('create_match', async (data: ClientEvents['create_match']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Validate wager (skip validation for free games)
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
          // Start AI game immediately
          const aiPlayer: Player = {
            id: 0, // Use 0 to indicate AI player (will be filtered out for database)
            name: 'AI',
            paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
            score: 0,
            ping: 0,
            lastInputTime: Date.now(),
          };

          const gameId = `game-${Date.now()}`;
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
            data.aiDifficulty as keyof typeof AI_DIFFICULTIES,
          );
          if (!gameResult.success) {
            socket.emit('error', {
              code: 'GAME_START_FAILED',
              message: gameResult.error || 'Failed to start game',
            });
            return;
          }
          this.lobby.deleteLobby(lobbyId);
        } else {
          // PvP: Create game immediately and put creator in waiting state
          const gameId = `game-${Date.now()}`;
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
          console.log(`🏓 Broadcasting ${availableLobbies.length} available lobbies to lobby room`);
          this.io.to('lobby').emit('lobby_state', { lobbies: availableLobbies });
        }
      });

      // Join match
      socket.on('join_match', async (data: ClientEvents['join_match']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

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

        // Notify creator that opponent joined
        this.io.to(`game:${existingGameId}`).emit('opponent_joined', { opponent: player });

        // Remove lobby and update lobby list
        this.lobby.deleteLobby(data.matchId);
        this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
      });

      // Player ready
      socket.on('player_ready', async (data: ClientEvents['player_ready']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        await this.game.setPlayerReady(player.id, data.ready);
      });

      // Player input
      socket.on('player_input', (data: ClientEvents['player_input']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        this.game.processInput(player.id, data);
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
      socket.on('spectate_match', (data: ClientEvents['spectate_match']) => {
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
    this.server.listen(port, () => {
      console.log(`🏓 Optimized Pong Game Server running on port ${port}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `🎯 Performance: ${PONG_PHYSICS.TICK_RATE}fps game loop, ${PONG_PHYSICS.NETWORK_UPDATE_RATE}fps network`,
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
