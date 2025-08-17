import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import {
  Player,
  GameState,
  LobbyEntry,
  PlayerInput,
  ClientEvents,
  MatchResult,
  PONG_PHYSICS,
} from '@ems/types';

// ——————————————————————————————————————————————————————————————————————————————————
// DATABASE MANAGER (Minimal DB usage)
// ——————————————————————————————————————————————————————————————————————————————————

class DatabaseManager {
  private prisma = new PrismaClient();

  async authenticateUser(token: string): Promise<Player | null> {
    try {
      const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
      if (!accessTokenSecret) return null;

      const decoded = jwt.verify(token, accessTokenSecret) as { userId: number };

      const user = await this.prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, name: true, muskBucks: true },
      });

      if (!user) return null;

      return {
        id: user.id,
        name: user.name,
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
      const user = await this.prisma.user.findUnique({
        where: { id: playerId },
        select: { muskBucks: true },
      });

      return user ? user.muskBucks >= BigInt(amount) : false;
    } catch (error) {
      console.error('Wager validation error:', error);
      return false;
    }
  }

  async recordMatchResult(result: MatchResult): Promise<void> {
    try {
      // Create match record
      await this.prisma.pongMatch.create({
        data: {
          id: result.matchId,
          playerOneId: result.playerOneId,
          playerTwoId: result.playerTwoId,
          winnerId: result.winnerId,
          playerOneScore: result.finalScores[0],
          playerTwoScore: result.finalScores[1],
          wagerAmount: BigInt(result.wagerAmount),
          status: result.reason === 'completed' ? 'COMPLETED' : 'ABANDONED',
          gameDuration: result.duration,
          completedAt: new Date(),
          startedAt: new Date(Date.now() - result.duration * 1000),
        },
      });

      // Handle payouts in a transaction
      if (result.winnerId && result.payoutAmount > 0) {
        await this.prisma.$transaction(async (tx) => {
          // Deduct wager from loser
          const loserId =
            result.winnerId === result.playerOneId ? result.playerTwoId : result.playerOneId;
          if (loserId) {
            await tx.user.update({
              where: { id: loserId },
              data: { muskBucks: { decrement: BigInt(result.wagerAmount) } },
            });
          }

          // Credit payout to winner
          if (result.winnerId) {
            await tx.user.update({
              where: { id: result.winnerId },
              data: { muskBucks: { increment: BigInt(result.payoutAmount) } },
            });
          }
        });
      }
    } catch (error) {
      console.error('Error recording match result:', error);
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

  constructor(
    private io: SocketIOServer,
    private db: DatabaseManager,
  ) {}

  startGame(gameId: string, players: [Player, Player | null], wager: number, isAI: boolean): void {
    const gameState: GameState = {
      id: gameId,
      players,
      ball: {
        x: PONG_PHYSICS.FIELD_WIDTH / 2,
        y: PONG_PHYSICS.FIELD_HEIGHT / 2,
        vx: 0,
        vy: 0,
      },
      status: 'countdown',
      tick: 0,
      wager,
      isAI,
      startTime: Date.now(),
    };

    this.games.set(gameId, gameState);
    this.playerGames.set(players[0].id, gameId);
    if (players[1]) {
      this.playerGames.set(players[1].id, gameId);
    }

    // Start countdown then game
    this.startCountdown(gameState);
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
    if (!ai) return;

    // Simple AI: move towards ball Y position
    const ballY = game.ball.y;
    const paddleCenter = ai.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
    const diff = ballY - paddleCenter;

    if (Math.abs(diff) > 5) {
      const moveSpeed = PONG_PHYSICS.PADDLE_SPEED / PONG_PHYSICS.TICK_RATE;
      const oldPaddleY = ai.paddleY;

      if (diff > 0) {
        ai.paddleY = Math.min(
          PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
          ai.paddleY + moveSpeed,
        );
      } else {
        ai.paddleY = Math.max(0, ai.paddleY - moveSpeed);
      }

      // Debug log if there's a big change
      if (Math.abs(oldPaddleY - ai.paddleY) > 50) {
        console.log(
          `🏓 AI paddle jump: ${oldPaddleY} -> ${ai.paddleY} (ball: ${ballY}, diff: ${diff})`,
        );
      }
    }
  }

  private updateBall(game: GameState): void {
    game.ball.x += game.ball.vx / PONG_PHYSICS.TICK_RATE;
    game.ball.y += game.ball.vy / PONG_PHYSICS.TICK_RATE;
  }

  private checkCollisions(game: GameState): void {
    // Wall collisions
    if (game.ball.y <= 0 || game.ball.y >= PONG_PHYSICS.FIELD_HEIGHT) {
      game.ball.vy = -game.ball.vy;
      game.ball.y = Math.max(0, Math.min(PONG_PHYSICS.FIELD_HEIGHT, game.ball.y));
    }

    // Paddle collisions
    const ballLeft = game.ball.x - PONG_PHYSICS.BALL_SIZE / 2;
    const ballRight = game.ball.x + PONG_PHYSICS.BALL_SIZE / 2;
    const ballTop = game.ball.y - PONG_PHYSICS.BALL_SIZE / 2;
    const ballBottom = game.ball.y + PONG_PHYSICS.BALL_SIZE / 2;

    // Left paddle (player 0)
    if (ballLeft <= PONG_PHYSICS.PADDLE_WIDTH && game.ball.vx < 0) {
      const paddle = game.players[0];
      if (ballBottom >= paddle.paddleY && ballTop <= paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT) {
        game.ball.vx = -game.ball.vx * 1.05; // Slight speed increase
        game.ball.x = PONG_PHYSICS.PADDLE_WIDTH + PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Right paddle (player 1)
    if (ballRight >= PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH && game.ball.vx > 0) {
      const paddle = game.players[1];
      if (
        paddle &&
        ballBottom >= paddle.paddleY &&
        ballTop <= paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT
      ) {
        game.ball.vx = -game.ball.vx * 1.05; // Slight speed increase
        game.ball.x =
          PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH - PONG_PHYSICS.BALL_SIZE / 2;
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
      // Reset ball for next serve
      game.ball.x = PONG_PHYSICS.FIELD_WIDTH / 2;
      game.ball.y = PONG_PHYSICS.FIELD_HEIGHT / 2;
      this.serveBall(game);
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

    // Debug log if there's a big change
    if (Math.abs(player.paddleY - validatedPaddleY) > 50) {
      console.log(
        `🏓 Player ${playerId} paddle jump: ${player.paddleY} -> ${validatedPaddleY} (input: ${input.paddleY}, max: ${maxPaddleY})`,
      );
    }

    player.paddleY = validatedPaddleY;

    // Update ping
    player.ping = Math.max(0, Date.now() - input.timestamp);
    player.lastInputTime = Date.now();
  }

  private broadcastGameState(game: GameState): void {
    // For now, use the simple room-based approach since we need access to auth
    this.io.to(`game:${game.id}`).emit('game_state', {
      ball: game.ball,
      opponentPaddleY: game.players[1]?.paddleY || 0, // Always send player 1's position (AI or human opponent)
      scores: [game.players[0].score, game.players[1]?.score || 0],
      tick: game.tick,
      timestamp: Date.now(),
    });
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

    // Broadcast result
    this.io.to(`game:${game.id}`).emit('match_end', {
      winner: winnerSlot || null,
      scores: result.finalScores,
      reason,
      duration,
      payout: result.payoutAmount,
    });

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

  getGame(gameId: string): GameState | null {
    return this.games.get(gameId) || null;
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
  private game = new GameManager(this.io, this.db);

  constructor() {
    this.setupMiddleware();
    this.setupSocketHandlers();
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
          socket.emit('auth_result', { success: true, player });
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

          socket.emit('match_joined', { gameId, playerSlot: 0, opponent: aiPlayer });

          this.game.startGame(gameId, [player, aiPlayer], data.wager, true);
          this.lobby.deleteLobby(lobbyId);
        } else {
          // Wait for opponent
          socket.emit('match_waiting', { gameId: lobbyId, message: 'Waiting for opponent...' });
          this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
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

        // Create game
        const gameId = `game-${Date.now()}`;
        const creator = this.auth.getPlayerByUserId(lobby.creatorId);

        if (creator) {
          const creatorSocketId = this.auth['playerSockets'].get(creator.id);
          if (creatorSocketId) {
            this.io.sockets.sockets.get(creatorSocketId)?.join(`game:${gameId}`);
          }
        }

        socket.join(`game:${gameId}`);

        // Notify both players
        socket.emit('match_joined', { gameId, playerSlot: 1, opponent: creator });
        if (creator) {
          this.io
            .to(`game:${gameId}`)
            .emit('match_joined', { gameId, playerSlot: 0, opponent: player });
        }

        // Start game
        this.game.startGame(gameId, [creator!, player], lobby.wager, false);
        this.lobby.deleteLobby(data.matchId);

        // Update lobby for others
        this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
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

        this.game.forfeitGame(player.id);
        this.lobby.leaveLobby(player.id);

        // Update lobby
        this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
      });

      // Disconnect
      socket.on('disconnect', () => {
        const player = this.auth.getPlayer(socket.id);
        if (player) {
          console.log(`🏓 Player ${player.name} disconnected`);
          this.game.forfeitGame(player.id);
          this.lobby.leaveLobby(player.id);
          this.auth.disconnectSocket(socket.id);

          // Update lobby
          this.io.to('lobby').emit('lobby_state', { lobbies: this.lobby.getAvailableLobbies() });
        }
      });
    });
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
    this.server.close();
    await this.db['prisma'].$disconnect();
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new PongGameServer();

  process.on('SIGTERM', () => server.stop());
  process.on('SIGINT', () => server.stop());

  server.start();
}
