import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import axios from 'axios';
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
// API CLIENT (Replaces direct database access)
// ——————————————————————————————————————————————————————————————————————————————————

class ApiClient {
  private baseUrl: string;
  private gameServerSecret: string;

  constructor() {
    this.baseUrl = process.env.API_BASE_URL || 'http://localhost:5000/api/pong';
    this.gameServerSecret = process.env.GAME_SERVER_SECRET || 'pong-internal-secret-2024';
  }

  private async request<T>(endpoint: string, method: string = 'GET', data?: any): Promise<T> {
    try {
      const response = await axios({
        method,
        url: `${this.baseUrl}${endpoint}`,
        data,
        headers: {
          'Content-Type': 'application/json',
          'x-game-server-secret': this.gameServerSecret,
        },
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      console.error(`API request failed: ${endpoint}`, error.response?.data || error.message);
      throw error;
    }
  }

  async authenticateUser(token: string): Promise<Player | null> {
    try {
      const userData = await this.request<{
        id: number;
        name: string;
        muskBucks: number;
      }>('/auth', 'POST', { token });

      return {
        id: userData.id,
        name: userData.name,
        paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
        score: 0,
        ping: 0,
        lastInputTime: Date.now(),
      };
    } catch (error) {
      return null;
    }
  }

  async validateWager(playerId: number, amount: number): Promise<boolean> {
    try {
      const result = await this.request<{
        valid: boolean;
        currentBalance: number;
      }>('/validate-wager', 'POST', { userId: playerId, amount });

      return result.valid;
    } catch (error) {
      return false;
    }
  }

  async processWagerTransaction(
    playerOneId: number,
    playerTwoId: number | null,
    wagerAmount: number,
    isAI: boolean,
  ): Promise<{ success: boolean; transactionId: string } | null> {
    try {
      const result = await this.request<{
        success: boolean;
        transactionId: string;
      }>('/process-wager', 'POST', {
        playerOneId,
        playerTwoId,
        wagerAmount,
        isAI,
      });

      return result;
    } catch (error) {
      console.error('Failed to process wager:', error);
      return null;
    }
  }

  async recordMatchResult(result: MatchResult): Promise<void> {
    try {
      await this.request('/record-match', 'POST', {
        matchId: result.matchId,
        winnerId: result.winnerId,
        loserId: result.loserId,
        wagerAmount: result.wagerAmount,
        payoutAmount: result.payoutAmount,
        duration: result.duration,
        isAI: result.isAI,
      });
    } catch (error) {
      console.error('Failed to record match result:', error);
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.request<{ status: string }>('/health', 'GET');
      return result.status === 'healthy';
    } catch (error) {
      return false;
    }
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// AUTH MANAGER (Uses API instead of database)
// ——————————————————————————————————————————————————————————————————————————————————

class AuthManager {
  private authenticatedPlayers = new Map<string, Player>(); // socketId -> Player

  constructor(private api: ApiClient) {}

  async authenticateSocket(socketId: string, token: string): Promise<Player | null> {
    const player = await this.api.authenticateUser(token);
    if (player) {
      this.authenticatedPlayers.set(socketId, player);
    }
    return player;
  }

  getPlayer(socketId: string): Player | undefined {
    return this.authenticatedPlayers.get(socketId);
  }

  removePlayer(socketId: string): void {
    this.authenticatedPlayers.delete(socketId);
  }

  updatePlayer(socketId: string, updates: Partial<Player>): void {
    const player = this.authenticatedPlayers.get(socketId);
    if (player) {
      Object.assign(player, updates);
    }
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// LOBBY MANAGER
// ——————————————————————————————————————————————————————————————————————————————————

class LobbyManager {
  private lobbies = new Map<string, LobbyEntry>();
  private playerLobbies = new Map<number, string>(); // playerId -> lobbyId

  createLobby(host: Player, wager: number, isAI: boolean): LobbyEntry {
    const lobbyId = `lobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const lobby: LobbyEntry = {
      id: lobbyId,
      host,
      opponent: null,
      wager,
      isAI,
      createdAt: Date.now(),
    };

    this.lobbies.set(lobbyId, lobby);
    this.playerLobbies.set(host.id, lobbyId);

    return lobby;
  }

  joinLobby(lobbyId: string, player: Player): boolean {
    const lobby = this.lobbies.get(lobbyId);
    if (!lobby || lobby.opponent !== null || lobby.isAI) {
      return false;
    }

    lobby.opponent = player;
    this.playerLobbies.set(player.id, lobbyId);
    return true;
  }

  getLobby(lobbyId: string): LobbyEntry | undefined {
    return this.lobbies.get(lobbyId);
  }

  removeLobby(lobbyId: string): void {
    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      this.playerLobbies.delete(lobby.host.id);
      if (lobby.opponent) {
        this.playerLobbies.delete(lobby.opponent.id);
      }
      this.lobbies.delete(lobbyId);
    }
  }

  removePlayerFromLobby(playerId: number): string | null {
    const lobbyId = this.playerLobbies.get(playerId);
    if (!lobbyId) return null;

    const lobby = this.lobbies.get(lobbyId);
    if (lobby) {
      if (lobby.host.id === playerId) {
        this.removeLobby(lobbyId);
      } else if (lobby.opponent?.id === playerId) {
        lobby.opponent = null;
        this.playerLobbies.delete(playerId);
      }
    }

    return lobbyId;
  }

  getAvailableLobbies(): LobbyEntry[] {
    return Array.from(this.lobbies.values()).filter((lobby) => !lobby.isAI && !lobby.opponent);
  }

  getLobbyByPlayerId(playerId: number): LobbyEntry | undefined {
    const lobbyId = this.playerLobbies.get(playerId);
    return lobbyId ? this.lobbies.get(lobbyId) : undefined;
  }

  getPlayerLobbyId(playerId: number): string | undefined {
    return this.playerLobbies.get(playerId);
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// STATISTICS MANAGER
// ——————————————————————————————————————————————————————————————————————————————————

class StatisticsManager {
  private activeGames = 0;
  private totalPlayers = 0;
  private matchesCompleted = 0;
  private totalWagered = 0;

  incrementActiveGames(): void {
    this.activeGames++;
  }

  decrementActiveGames(): void {
    this.activeGames = Math.max(0, this.activeGames - 1);
  }

  setTotalPlayers(count: number): void {
    this.totalPlayers = count;
  }

  recordMatch(wagerAmount: number): void {
    this.matchesCompleted++;
    this.totalWagered += wagerAmount;
  }

  getStats(lobbyCount: number) {
    return {
      activeGames: this.activeGames,
      totalPlayers: this.totalPlayers,
      availableLobbies: lobbyCount,
      matchesCompleted: this.matchesCompleted,
      totalWagered: this.totalWagered,
    };
  }
}

// ——————————————————————————————————————————————————————————————————————————————————
// GAME MANAGER
// ——————————————————————————————————————————————————————————————————————————————————

class GameManager {
  private games = new Map<string, GameState>();
  private playerGames = new Map<number, string>(); // playerId -> gameId
  private gameIntervals = new Map<string, NodeJS.Timeout>();
  private gameSpectators = new Map<string, Set<string>>(); // gameId -> Set<socketId>
  private spectatorGames = new Map<string, string>(); // socketId -> gameId

  constructor(
    private io: SocketIOServer,
    private api: ApiClient,
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
    // Process wager transaction if there's a wager (only for AI games or PVP with both players)
    if (wager > 0 && (isAI || players[1] !== null)) {
      const transaction = await this.api.processWagerTransaction(
        players[0].id,
        players[1]?.id || null,
        wager,
        isAI,
      );

      if (!transaction?.success) {
        return { success: false, error: 'Transaction failed' };
      }
    }

    const game: GameState = {
      id: gameId,
      players: [
        players[0],
        players[1] || this.createAIPlayer(players[0].id + 1000, aiDifficulty || 'medium'),
      ],
      ball: {
        x: PONG_PHYSICS.FIELD_WIDTH / 2,
        y: PONG_PHYSICS.FIELD_HEIGHT / 2,
        velocityX: PONG_PHYSICS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
        velocityY: PONG_PHYSICS.BALL_SPEED * (Math.random() - 0.5) * 0.5,
      },
      status: 'starting',
      wager,
      isAI,
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      lastNetworkBroadcast: Date.now(),
    };

    this.games.set(gameId, game);
    this.playerGames.set(players[0].id, gameId);
    if (!isAI && players[1]) {
      this.playerGames.set(players[1].id, gameId);
    }

    this.gameSpectators.set(gameId, new Set());

    // Notify players and broadcast game starting
    const gameInfo = this.getGameInfo(game);
    this.io.to(`game:${gameId}`).emit('game_starting', gameInfo);

    // Start countdown
    this.startCountdown(game);

    this.stats.incrementActiveGames();

    return { success: true };
  }

  private createAIPlayer(id: number, difficulty: keyof typeof AI_DIFFICULTIES): Player {
    return {
      id,
      name: `AI (${difficulty})`,
      paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
      score: 0,
      ping: 0,
      lastInputTime: Date.now(),
    };
  }

  private startCountdown(game: GameState): void {
    let countdown = 3;

    const countdownInterval = setInterval(() => {
      this.io.to(`game:${game.id}`).emit('countdown', {
        seconds: countdown,
        message: countdown > 0 ? countdown.toString() : 'GO!',
      });

      if (countdown <= 0) {
        clearInterval(countdownInterval);
        game.status = 'active';
        this.startGameLoop(game);
      }

      countdown--;
    }, 1000);
  }

  private startGameLoop(game: GameState): void {
    const interval = setInterval(() => {
      if (game.status !== 'active') {
        clearInterval(interval);
        return;
      }

      const currentTime = Date.now();
      const deltaTime = (currentTime - game.lastUpdateTime) / 1000;
      game.lastUpdateTime = currentTime;

      // Update physics
      this.updatePhysics(game, deltaTime);

      // Update AI if needed
      if (game.isAI && game.players[1]) {
        this.updateAI(game);
      }

      // Check for winner
      const winner = this.checkWinner(game);
      if (winner !== null) {
        this.endGame(game, winner);
        clearInterval(interval);
        return;
      }

      // Network broadcast at lower rate
      if (currentTime - game.lastNetworkBroadcast >= 1000 / PONG_PHYSICS.NETWORK_UPDATE_RATE) {
        this.broadcastGameState(game);
        game.lastNetworkBroadcast = currentTime;
      }
    }, 1000 / PONG_PHYSICS.TICK_RATE);

    this.gameIntervals.set(game.id, interval);
  }

  private updatePhysics(game: GameState, deltaTime: number): void {
    const ball = game.ball;

    // Update ball position
    ball.x += ball.velocityX * deltaTime * 60;
    ball.y += ball.velocityY * deltaTime * 60;

    // Top/bottom wall collision
    if (
      ball.y - PONG_PHYSICS.BALL_SIZE / 2 <= 0 ||
      ball.y + PONG_PHYSICS.BALL_SIZE / 2 >= PONG_PHYSICS.FIELD_HEIGHT
    ) {
      ball.velocityY = -ball.velocityY;
      ball.y = Math.max(
        PONG_PHYSICS.BALL_SIZE / 2,
        Math.min(PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.BALL_SIZE / 2, ball.y),
      );
    }

    // Paddle collisions
    const paddleHitZone = PONG_PHYSICS.PADDLE_HEIGHT + PONG_PHYSICS.BALL_SIZE;

    // Left paddle (player 1)
    if (
      ball.x - PONG_PHYSICS.BALL_SIZE / 2 <= PONG_PHYSICS.PADDLE_WIDTH &&
      ball.x - PONG_PHYSICS.BALL_SIZE / 2 > 0 &&
      ball.velocityX < 0
    ) {
      const paddle1Y = game.players[0].paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
      const distance = Math.abs(ball.y - paddle1Y);

      if (distance < paddleHitZone / 2) {
        ball.velocityX = Math.abs(ball.velocityX) * PONG_PHYSICS.SPEED_INCREASE_FACTOR;
        const relativeIntersectY = (ball.y - paddle1Y) / (paddleHitZone / 2);
        ball.velocityY = relativeIntersectY * PONG_PHYSICS.BALL_SPEED * 0.75;
        ball.x = PONG_PHYSICS.PADDLE_WIDTH + PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Right paddle (player 2)
    if (
      ball.x + PONG_PHYSICS.BALL_SIZE / 2 >= PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH &&
      ball.x + PONG_PHYSICS.BALL_SIZE / 2 < PONG_PHYSICS.FIELD_WIDTH &&
      ball.velocityX > 0
    ) {
      const paddle2Y = game.players[1].paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
      const distance = Math.abs(ball.y - paddle2Y);

      if (distance < paddleHitZone / 2) {
        ball.velocityX = -Math.abs(ball.velocityX) * PONG_PHYSICS.SPEED_INCREASE_FACTOR;
        const relativeIntersectY = (ball.y - paddle2Y) / (paddleHitZone / 2);
        ball.velocityY = relativeIntersectY * PONG_PHYSICS.BALL_SPEED * 0.75;
        ball.x = PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH - PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Scoring
    if (ball.x < 0) {
      game.players[1].score++;
      this.resetBall(game);
    } else if (ball.x > PONG_PHYSICS.FIELD_WIDTH) {
      game.players[0].score++;
      this.resetBall(game);
    }

    // Clamp ball speed
    const speed = Math.sqrt(ball.velocityX ** 2 + ball.velocityY ** 2);
    if (speed > PONG_PHYSICS.MAX_BALL_SPEED) {
      const scale = PONG_PHYSICS.MAX_BALL_SPEED / speed;
      ball.velocityX *= scale;
      ball.velocityY *= scale;
    }
  }

  private updateAI(game: GameState): void {
    const ai = game.players[1];
    const ball = game.ball;

    // Simple AI: track ball Y position with some lag
    const targetY = ball.y - PONG_PHYSICS.PADDLE_HEIGHT / 2;
    const currentY = ai.paddleY;
    const maxSpeed = PONG_PHYSICS.PADDLE_SPEED * 0.8; // AI is slightly slower

    if (Math.abs(targetY - currentY) > 5) {
      const direction = targetY > currentY ? 1 : -1;
      ai.paddleY = Math.max(
        0,
        Math.min(
          PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
          currentY + direction * maxSpeed,
        ),
      );
    }

    ai.lastInputTime = Date.now();
  }

  private resetBall(game: GameState): void {
    game.ball.x = PONG_PHYSICS.FIELD_WIDTH / 2;
    game.ball.y = PONG_PHYSICS.FIELD_HEIGHT / 2;
    game.ball.velocityX = PONG_PHYSICS.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1);
    game.ball.velocityY = PONG_PHYSICS.BALL_SPEED * (Math.random() - 0.5) * 0.5;
  }

  private checkWinner(game: GameState): number | null {
    for (let i = 0; i < game.players.length; i++) {
      if (game.players[i].score >= PONG_PHYSICS.WINNING_SCORE) {
        return i;
      }
    }
    return null;
  }

  private async endGame(game: GameState, winnerIndex: number): Promise<void> {
    const interval = this.gameIntervals.get(game.id);
    if (interval) {
      clearInterval(interval);
      this.gameIntervals.delete(game.id);
    }

    game.status = 'completed';
    const winner = game.players[winnerIndex];
    const loser = game.players[1 - winnerIndex];
    const duration = Math.floor((Date.now() - game.startTime) / 1000);

    // Calculate payout
    let payoutAmount = 0;
    if (game.wager > 0) {
      payoutAmount = game.isAI ? game.wager * 2 : game.wager * 2;
    }

    const result: MatchResult = {
      matchId: game.id,
      winnerId: winner.id < 1000 ? winner.id : null, // Don't record AI as winner
      loserId: loser.id < 1000 ? loser.id : null, // Don't record AI as loser
      wagerAmount: game.wager,
      payoutAmount: winner.id < 1000 ? payoutAmount : 0, // Only pay out to real players
      duration,
      isAI: game.isAI,
    };

    await this.api.recordMatchResult(result);

    // Send individual match_end events to each player with correct payout info
    const spectators = this.gameSpectators.get(game.id) || new Set();
    spectators.forEach((socketId) => {
      this.io.to(socketId).emit('match_end', {
        winner: winner.name,
        loser: loser.name,
        finalScore: [winner.score, loser.score],
        duration,
        wagerAmount: game.wager,
        payoutAmount: 0, // Spectators don't get payouts
      });
    });

    // Notify player 1
    const player1SocketId = this.findSocketByPlayerId(game.players[0].id);
    if (player1SocketId) {
      const isPlayer1Winner = winnerIndex === 0;
      this.io.to(player1SocketId).emit('match_end', {
        winner: winner.name,
        loser: loser.name,
        finalScore: [winner.score, loser.score],
        duration,
        wagerAmount: game.wager,
        payoutAmount: isPlayer1Winner ? payoutAmount : 0,
      });
    }

    // Notify player 2 (if not AI)
    if (!game.isAI && game.players[1]) {
      const player2SocketId = this.findSocketByPlayerId(game.players[1].id);
      if (player2SocketId) {
        const isPlayer2Winner = winnerIndex === 1;
        this.io.to(player2SocketId).emit('match_end', {
          winner: winner.name,
          loser: loser.name,
          finalScore: [winner.score, loser.score],
          duration,
          wagerAmount: game.wager,
          payoutAmount: isPlayer2Winner ? payoutAmount : 0,
        });
      }
    }

    // Clean up
    this.playerGames.delete(game.players[0].id);
    if (!game.isAI && game.players[1]) {
      this.playerGames.delete(game.players[1].id);
    }
    this.games.delete(game.id);
    this.gameSpectators.delete(game.id);

    // Update stats
    this.stats.decrementActiveGames();
    this.stats.recordMatch(game.wager);
  }

  private findSocketByPlayerId(playerId: number): string | null {
    for (const [socketId, player] of this.auth['authenticatedPlayers'].entries()) {
      if (player.id === playerId) {
        return socketId;
      }
    }
    return null;
  }

  private broadcastGameState(game: GameState): void {
    const gameState = this.getGameInfo(game);
    this.io.to(`game:${game.id}`).emit('game_state', gameState);
  }

  private getGameInfo(game: GameState) {
    return {
      id: game.id,
      players: game.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        paddleY: p.paddleY,
        ping: p.ping,
      })),
      ball: game.ball,
      status: game.status,
      wager: game.wager,
    };
  }

  handlePlayerInput(playerId: number, input: PlayerInput): void {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game || game.status !== 'active') return;

    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    const player = game.players[playerIndex];
    const currentTime = Date.now();

    // Update paddle position
    const newY = Math.max(
      0,
      Math.min(PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT, input.paddleY),
    );

    player.paddleY = newY;
    player.lastInputTime = currentTime;

    // Calculate ping
    if (input.timestamp) {
      player.ping = currentTime - input.timestamp;
    }
  }

  async handleDelayedJoin(game: GameState, joiningPlayer: Player): Promise<void> {
    if (!game.players[1] || game.players[1].id >= 1000) {
      // Replace AI with real player
      game.players[1] = joiningPlayer;
      game.isAI = false;

      // Process wager transaction now that both players are committed
      if (game.wager > 0 && !game.isAI && game.players[0] && game.players[1]) {
        const transaction = await this.api.processWagerTransaction(
          game.players[0].id,
          game.players[1].id,
          game.wager,
          false,
        );

        if (!transaction?.success) {
          // Handle transaction failure - end game
          this.endGame(game, 0); // Player 1 wins by default
          return;
        }
      }

      // Update player mapping
      this.playerGames.set(joiningPlayer.id, game.id);

      // Notify all parties
      this.io.to(`game:${game.id}`).emit('player_joined', {
        player: joiningPlayer,
        gameInfo: this.getGameInfo(game),
      });
    }
  }

  getGame(gameId: string): GameState | undefined {
    return this.games.get(gameId);
  }

  getGameByPlayerId(playerId: number): GameState | undefined {
    const gameId = this.playerGames.get(playerId);
    return gameId ? this.games.get(gameId) : undefined;
  }

  getActiveGames(): ActiveGameEntry[] {
    return Array.from(this.games.values())
      .filter((game) => game.status === 'active')
      .map((game) => ({
        id: game.id,
        players: game.players.map((p) => p.name),
        wager: game.wager,
        scores: game.players.map((p) => p.score),
        spectatorCount: this.gameSpectators.get(game.id)?.size || 0,
      }));
  }

  addSpectator(gameId: string, socketId: string): boolean {
    const game = this.games.get(gameId);
    if (!game) return false;

    let spectators = this.gameSpectators.get(gameId);
    if (!spectators) {
      spectators = new Set();
      this.gameSpectators.set(gameId, spectators);
    }

    spectators.add(socketId);
    this.spectatorGames.set(socketId, gameId);

    return true;
  }

  removeSpectator(socketId: string): void {
    const gameId = this.spectatorGames.get(socketId);
    if (gameId) {
      const spectators = this.gameSpectators.get(gameId);
      if (spectators) {
        spectators.delete(socketId);
      }
      this.spectatorGames.delete(socketId);
    }
  }

  handleDisconnect(playerId: number): void {
    const gameId = this.playerGames.get(playerId);
    if (!gameId) return;

    const game = this.games.get(gameId);
    if (!game) return;

    // Find the disconnected player
    const playerIndex = game.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return;

    // If game is active, end it with the other player as winner
    if (game.status === 'active') {
      const winnerIndex = playerIndex === 0 ? 1 : 0;
      this.endGame(game, winnerIndex);

      // Notify remaining player
      this.io.to(`game:${game.id}`).emit('opponent_disconnected', {
        disconnectedPlayer: game.players[playerIndex].name,
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

  private api = new ApiClient();
  private auth = new AuthManager(this.api);
  private lobby = new LobbyManager();
  private stats = new StatisticsManager();
  private game = new GameManager(this.io, this.api, this.auth, this.stats);
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
    this.app.get('/health', async (_req, res) => {
      const apiHealthy = await this.api.checkHealth();
      res.json({
        status: apiHealthy ? 'ok' : 'degraded',
        api: apiHealthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      socket.on('authenticate', async (data: { token: string }) => {
        const player = await this.auth.authenticateSocket(socket.id, data.token);

        if (player) {
          socket.emit('authenticated', { player });
          socket.join('lobby');

          // Update player count
          this.stats.setTotalPlayers(this.io.sockets.sockets.size);

          // Send current game stats
          const stats = this.stats.getStats(this.lobby.getAvailableLobbies().length);
          socket.emit('stats_update', stats);

          // Send available lobbies
          socket.emit('lobbies_update', this.lobby.getAvailableLobbies());

          // Send active games for spectating
          socket.emit('active_games', this.game.getActiveGames());

          // Broadcast updated stats to all lobby users
          this.broadcastStatsUpdate();
        } else {
          console.log(`❌ Authentication failed for socket ${socket.id}`);
          socket.emit('error', { code: 'AUTH_FAILED', message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      socket.on('create_game', async (data: ClientEvents['create_game']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) {
          socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' });
          return;
        }

        // Validate wager (skip validation for free games)
        if (data.wager > 0) {
          const canAfford = await this.api.validateWager(player.id, data.wager);
          if (!canAfford) {
            socket.emit('error', { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient MuskBucks' });
            return;
          }
        }

        // Leave lobby room
        socket.leave('lobby');

        // Create lobby
        const lobby = this.lobby.createLobby(player, data.wager, data.isAI);

        if (data.isAI) {
          // Start AI game immediately
          const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          socket.join(`game:${gameId}`);

          const result = await this.game.startGame(
            gameId,
            [player, null],
            data.wager,
            true,
            data.aiDifficulty,
          );

          if (result.success) {
            socket.emit('game_created', { gameId, lobby });
          } else {
            socket.emit('error', {
              code: 'GAME_START_FAILED',
              message: result.error || 'Failed to start game',
            });
            this.lobby.removeLobby(lobby.id);
          }
        } else {
          // Create PVP lobby and wait for opponent
          socket.emit('lobby_created', lobby);
          this.io.to('lobby').emit('lobby_available', lobby);
        }
      });

      socket.on('join_lobby', async (data: ClientEvents['join_lobby']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) {
          socket.emit('error', { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' });
          return;
        }

        const lobby = this.lobby.getLobby(data.lobbyId);
        if (!lobby) {
          socket.emit('error', { code: 'LOBBY_NOT_FOUND', message: 'Lobby not found' });
          return;
        }

        // Validate wager (skip validation for free games)
        if (lobby.wager > 0) {
          const canAfford = await this.api.validateWager(player.id, lobby.wager);
          if (!canAfford) {
            socket.emit('error', { code: 'INSUFFICIENT_FUNDS', message: 'Insufficient MuskBucks' });
            return;
          }
        }

        if (this.lobby.joinLobby(data.lobbyId, player)) {
          // Leave lobby room
          socket.leave('lobby');

          // Start PVP game
          const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // Find host socket
          const hostSocketId = this.findSocketByPlayerId(lobby.host.id);
          if (hostSocketId) {
            this.io.sockets.sockets.get(hostSocketId)?.join(`game:${gameId}`);
            this.io.sockets.sockets.get(hostSocketId)?.leave('lobby');
          }

          socket.join(`game:${gameId}`);

          const result = await this.game.startGame(
            gameId,
            [lobby.host, player],
            lobby.wager,
            false,
          );

          if (result.success) {
            // Notify both players
            this.io.to(`game:${gameId}`).emit('game_created', { gameId, lobby });

            // Remove lobby
            this.lobby.removeLobby(data.lobbyId);

            // Update lobby list for others
            this.io.to('lobby').emit('lobbies_update', this.lobby.getAvailableLobbies());
          } else {
            socket.emit('error', {
              code: 'GAME_START_FAILED',
              message: result.error || 'Failed to start game',
            });
          }
        } else {
          socket.emit('error', { code: 'JOIN_FAILED', message: 'Failed to join lobby' });
        }
      });

      socket.on('player_input', (data: ClientEvents['player_input']) => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        this.game.handlePlayerInput(player.id, data);
      });

      socket.on('spectate_game', (data: ClientEvents['spectate_game']) => {
        const game = this.game.getGame(data.gameId);
        if (!game) {
          socket.emit('error', { code: 'GAME_NOT_FOUND', message: 'Game not found' });
          return;
        }

        // Leave any existing game rooms
        socket.rooms.forEach((room) => {
          if (room.startsWith('game:')) {
            socket.leave(room);
          }
        });

        // Remove from previous spectator status
        this.game.removeSpectator(socket.id);

        // Join as spectator
        if (this.game.addSpectator(data.gameId, socket.id)) {
          socket.join(`game:${data.gameId}`);
          socket.emit('spectating', {
            gameId: data.gameId,
            gameInfo: this.game['getGameInfo'](game),
          });
        }
      });

      socket.on('leave_game', () => {
        const player = this.auth.getPlayer(socket.id);
        if (!player) return;

        // Handle player leaving
        this.game.handleDisconnect(player.id);

        // Remove from lobby if in one
        this.lobby.removePlayerFromLobby(player.id);

        // Leave all game rooms
        socket.rooms.forEach((room) => {
          if (room.startsWith('game:')) {
            socket.leave(room);
          }
        });

        // Rejoin lobby
        socket.join('lobby');
      });

      socket.on('disconnect', () => {
        const player = this.auth.getPlayer(socket.id);

        if (player) {
          // Handle game disconnection
          this.game.handleDisconnect(player.id);

          // Remove from lobby
          const lobbyId = this.lobby.removePlayerFromLobby(player.id);
          if (lobbyId) {
            this.io.to('lobby').emit('lobbies_update', this.lobby.getAvailableLobbies());
          }
        }

        // Remove as spectator
        this.game.removeSpectator(socket.id);

        // Clean up auth
        this.auth.removePlayer(socket.id);

        // Update player count
        this.stats.setTotalPlayers(this.io.sockets.sockets.size);

        // Broadcast updated stats
        this.broadcastStatsUpdate();
      });
    });
  }

  private findSocketByPlayerId(playerId: number): string | null {
    for (const [socketId, player] of this.auth['authenticatedPlayers'].entries()) {
      if (player.id === playerId) {
        return socketId;
      }
    }
    return null;
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
      console.log(`🏓 API-Based Pong Game Server running on port ${port}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(
        `🔗 API Base URL: ${process.env.API_BASE_URL || 'http://localhost:5000/api/pong'}`,
      );
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
