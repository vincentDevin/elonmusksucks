import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type {
  Player,
  LobbyEntry,
  ActiveGameEntry,
  PlayerInput,
  ClientEvents,
  ServerEvents,
  WagerNegotiation,
  GameChatMessage,
} from '@ems/types';
import { PONG_PHYSICS } from '@ems/types';
import { useAuth } from '../contexts/AuthContext';
import { GameStateBuffer, type GameStateSnapshot } from '../types/pongInterpolation';
import env from '../config/env';

// Per-user socket management to prevent duplicate connections within same user session
const userSockets = new Map<number, Socket>(); // userId -> Socket
const userConnecting = new Set<number>(); // Set of userIds currently connecting

// Client-side game state (different from server GameState)
interface GameState {
  gameId: string;
  playerSlot: 0 | 1; // Which paddle the user controls
  players: [Player, Player | null];
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status:
    | 'waiting'
    | 'waiting_for_opponent'
    | 'lobby_negotiation'
    | 'waiting_for_ready'
    | 'countdown'
    | 'active'
    | 'paused'
    | 'ended';
  tick: number;
  timestamp: number;
  serverTick?: number; // For compatibility with interpolation hook
  countdown?: number; // For countdown display
  winner?: 0 | 1 | null; // Winner slot or null for draw
  payout?: number; // MuskBucks won
  readyStates?: [boolean, boolean]; // Ready status for each player
  wager?: number; // Wager amount per player
  pot?: number; // Total pot amount
  wagerNegotiation?: WagerNegotiation | null; // Negotiation state
  chatMessages?: GameChatMessage[]; // Chat messages
  negotiationStartedAt?: number | null; // When negotiation started
}

// Spectator-only game state (similar to GameState but for viewing only)
interface SpectatorGameState {
  gameId: string;
  player1: { id: number; name: string; paddleY: number; score: number } | null;
  player2: { id: number; name: string; paddleY: number; score: number } | null;
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status:
    | 'waiting'
    | 'waiting_for_opponent'
    | 'lobby_negotiation'
    | 'waiting_for_ready'
    | 'countdown'
    | 'active'
    | 'paused'
    | 'ended';
  tick: number;
  timestamp: number;
  countdown?: number;
  winner?: 0 | 1 | null;
  wager?: number;
  pot?: number;
  readyStates?: [boolean, boolean];
  wagerNegotiation?: WagerNegotiation | null;
  chatMessages?: GameChatMessage[];
  negotiationStartedAt?: number | null;
}

interface PongSocketState {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  currentGame: GameState | null;
  lobbies: LobbyEntry[];
  activeGames: ActiveGameEntry[];
  connectionError: string | null;
  lastPing: number;
  stats: {
    playersOnline: number;
    activeGames: number;
    availableMatches: number;
  };
  gameStateBuffer: GameStateBuffer;
  spectatingGameId: string | null;
  spectatorGameState: SpectatorGameState | null;
  shouldReturnToLobby: boolean;
  opponentDisconnected: boolean;
  negotiationTimeRemaining: number | null;
}

interface PongSocketActions {
  connect: () => void;
  disconnect: () => void;
  joinLobby: () => void;
  createMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
  joinMatch: (matchId: string) => void;
  sendInput: (input: PlayerInput) => void;
  setReady: (ready: boolean) => void;
  leaveMatch: () => void;
  spectateGame: (gameId: string) => void;
  leaveSpectating: () => void;
  proposeWager: (gameId: string, amount: number) => void;
  acceptWager: (gameId: string) => void;
  rejectWager: (gameId: string) => void;
  sendChatMessage: (gameId: string, message: string) => void;
}

interface PongSocketHook extends PongSocketState, PongSocketActions {}

export function usePongSocket(): PongSocketHook {
  const { user, accessToken } = useAuth();

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentGame, setCurrentGame] = useState<GameState | null>(null);
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveGameEntry[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState(0);
  const [stats, setStats] = useState({
    playersOnline: 0,
    activeGames: 0,
    availableMatches: 0,
  });
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
  const [spectatorGameState, setSpectatorGameState] = useState<SpectatorGameState | null>(null);
  const [shouldReturnToLobby, setShouldReturnToLobby] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [negotiationTimeRemaining, setNegotiationTimeRemaining] = useState<number | null>(null);

  // Game state buffer for interpolation
  // Buffer size increased from 10 to 50 to handle higher latency (400ms history at 120fps)
  const [gameStateBuffer] = useState(() => new GameStateBuffer(50));

  // Refs for stable references
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const inputSequenceRef = useRef(0);
  const authenticatedPlayerRef = useRef<Player | null>(null);
  const serverTimeOffsetRef = useRef<number>(0); // Offset to add to Date.now() to get server time

  const connect = useCallback(() => {
    if (!user) {
      console.log('🏓 Cannot connect: missing user');
      return;
    }

    // Use per-user socket to prevent duplicate connections for same user
    const existingSocket = userSockets.get(user.id);
    if (existingSocket?.connected) {
      console.log(`🏓 Using existing connection for user ${user.id}`);
      setSocket(existingSocket);
      setIsConnected(true);
      return;
    }

    if (userConnecting.has(user.id)) {
      console.log(`🏓 Already connecting for user ${user.id}`);
      return;
    }

    // Close any existing socket before creating new one
    if (existingSocket) {
      console.log(`🏓 Closing existing socket for user ${user.id} before reconnect`);
      existingSocket.disconnect();
      userSockets.delete(user.id);
    }

    userConnecting.add(user.id);
    isConnectingRef.current = true;
    setConnectionError(null);

    console.log(`🏓 Connecting to Pong server for user ${user.id}...`);

    const newSocket = io(env.PONG_SERVER_URL, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      autoConnect: true,
      forceNew: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log(`✅ User ${user.id} connected to Pong server, authenticating...`);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      userConnecting.delete(user.id);
      isConnectingRef.current = false;

      // Authenticate immediately
      newSocket.emit('auth', { token: accessToken } as ClientEvents['auth']);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Pong server:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      setCurrentGame(null);
      authenticatedPlayerRef.current = null;
      serverTimeOffsetRef.current = 0; // Reset time sync on disconnect

      // Auto-reconnect logic
      if (reason !== 'io client disconnect' && reconnectAttemptsRef.current < 5) {
        reconnectAttemptsRef.current++;
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error(`❌ User ${user.id} connection error:`, error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
      userConnecting.delete(user.id);
      isConnectingRef.current = false;
    });

    // Authentication response
    newSocket.on('auth_result', (data: ServerEvents['auth_result']) => {
      if (data.success && data.player) {
        console.log(
          `✅ User ${user.id} authenticated as ${data.player.name} (Elo: ${data.player.elo})`,
        );
        setIsAuthenticated(true);
        authenticatedPlayerRef.current = data.player; // Store player data with Elo in ref
        setConnectionError(null);
      } else {
        console.error(`❌ User ${user.id} authentication failed:`, data.error);
        setConnectionError(data.error || 'Authentication failed');
        setIsAuthenticated(false);
        authenticatedPlayerRef.current = null;
      }
    });

    // Lobby events
    newSocket.on('lobby_state', (data: ServerEvents['lobby_state']) => {
      console.log('🏓 Lobby updated:', data.lobbies.length, 'available matches');
      setLobbies(data.lobbies);
    });

    // Stats events
    newSocket.on('stats_update', (data: ServerEvents['stats_update']) => {
      console.log('🏓 Stats updated:', data);
      setStats(data);
    });

    // Active games list
    newSocket.on('active_games', (data: ServerEvents['active_games']) => {
      console.log('🏓 Active games updated:', data.games.length, 'games');
      setActiveGames(data.games);
    });

    // Match events
    newSocket.on('match_joined', (data: ServerEvents['match_joined']) => {
      console.log(`🏓 User ${user.id} joined match:`, data.gameId, 'as player', data.playerSlot);
      // Create proper player objects with initial paddle positions
      const initialPaddleY = PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2;

      // Use authenticatedPlayer from pong server (includes elo), not user from main auth
      const authPlayer = authenticatedPlayerRef.current;
      if (!authPlayer) {
        console.error('❌ No authenticated player data available');
        return;
      }

      const userPlayer: Player = {
        ...authPlayer,
        paddleY: initialPaddleY,
        score: 0,
        ping: 0,
        lastInputTime: Date.now(),
      };

      setCurrentGame({
        gameId: data.gameId,
        playerSlot: data.playerSlot,
        players:
          data.playerSlot === 0
            ? [userPlayer, data.opponent || null]
            : [data.opponent as any, userPlayer],
        ball: {
          x: PONG_PHYSICS.FIELD_WIDTH / 2,
          y: PONG_PHYSICS.FIELD_HEIGHT / 2,
          vx: 0,
          vy: 0,
        },
        scores: [0, 0],
        status: data.wagerNegotiation
          ? 'lobby_negotiation'
          : data.opponent
            ? 'waiting_for_ready'
            : 'waiting_for_opponent',
        tick: 0,
        timestamp: Date.now(),
        readyStates: data.opponent ? [false, false] : undefined,
        wager: data.wager,
        pot: data.pot,
        wagerNegotiation: data.wagerNegotiation || null,
        chatMessages: data.chatHistory || [],
        negotiationStartedAt: data.wagerNegotiation ? Date.now() : null,
      });

      // Start negotiation countdown if we're in lobby_negotiation
      if (data.wagerNegotiation) {
        setNegotiationTimeRemaining(120); // 2 minutes in seconds
      }
    });

    newSocket.on('match_waiting', (data: ServerEvents['match_waiting']) => {
      console.log('🏓 Waiting for opponent:', data.message);
      // Could show a waiting indicator in UI
    });

    newSocket.on('opponent_joined', (data: ServerEvents['opponent_joined']) => {
      console.log('🏓 Opponent joined:', data.opponent.name);
      setCurrentGame((prev) => {
        if (!prev) return null;

        const updatedPlayers = [...prev.players] as [any, any];
        const opponentSlot = prev.playerSlot === 0 ? 1 : 0;
        updatedPlayers[opponentSlot] = data.opponent;

        return {
          ...prev,
          players: updatedPlayers,
          status: 'lobby_negotiation',
          readyStates: [false, false],
          wagerNegotiation: data.wagerNegotiation || null,
          chatMessages: data.chatMessages || [],
          negotiationStartedAt: Date.now(),
        };
      });

      // Start negotiation countdown (2 minutes)
      if (data.wagerNegotiation) {
        setNegotiationTimeRemaining(120); // 2 minutes in seconds
      }
    });

    // Wager negotiation events
    newSocket.on('wager_proposed', (data: ServerEvents['wager_proposed']) => {
      console.log('🏓 Wager proposed:', data.amount, 'by player', data.proposedBy);
      setCurrentGame((prev) => {
        if (!prev || !prev.wagerNegotiation) return prev;

        return {
          ...prev,
          wagerNegotiation: {
            ...prev.wagerNegotiation,
            currentOffer: data.amount,
            proposedBy: data.proposedBy,
            acceptedBy: [], // Reset acceptances for new offer
            roundCount: data.roundCount,
            history: [
              ...(prev.wagerNegotiation.history || []),
              {
                amount: data.amount,
                proposedBy: data.proposedBy,
                timestamp: Date.now(),
              },
            ],
          },
        };
      });
    });

    newSocket.on('wager_accepted', (data: ServerEvents['wager_accepted']) => {
      console.log('🏓 Wager accepted by:', data.acceptedBy);
      setCurrentGame((prev) => {
        if (!prev || !prev.wagerNegotiation) return prev;

        return {
          ...prev,
          wagerNegotiation: {
            ...prev.wagerNegotiation,
            acceptedBy: data.acceptedBy,
          },
        };
      });
    });

    newSocket.on('wager_rejected', (data: ServerEvents['wager_rejected']) => {
      console.log('🏓 Wager rejected by:', data.rejectedBy);
      setCurrentGame((prev) => {
        if (!prev || !prev.wagerNegotiation) return prev;

        return {
          ...prev,
          wagerNegotiation: {
            ...prev.wagerNegotiation,
            acceptedBy: [], // Reset acceptances
          },
        };
      });
    });

    newSocket.on('wager_locked', (data: ServerEvents['wager_locked']) => {
      console.log('🏓 Wager locked:', data.finalWager, 'pot:', data.pot);
      setCurrentGame((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          status: 'waiting_for_ready',
          wager: data.finalWager,
          pot: data.pot,
          wagerNegotiation: prev.wagerNegotiation
            ? { ...prev.wagerNegotiation, lockedIn: true }
            : null,
        };
      });
      setNegotiationTimeRemaining(null); // Clear countdown
    });

    newSocket.on('negotiation_timeout', (data: ServerEvents['negotiation_timeout']) => {
      console.log('🏓 Negotiation timeout:', data.message);
      setConnectionError(data.message);
      setNegotiationTimeRemaining(null);

      // Auto-clear game state after 3 seconds
      setTimeout(() => {
        setCurrentGame(null);
        setConnectionError(null);
      }, 3000);
    });

    newSocket.on('match_cancelled', (data: ServerEvents['match_cancelled']) => {
      console.log('🏓 Match cancelled:', data.reason);
      setConnectionError(`Match cancelled: ${data.reason}`);
      setNegotiationTimeRemaining(null);

      // Auto-clear game state after 3 seconds
      setTimeout(() => {
        setCurrentGame(null);
        setConnectionError(null);
      }, 3000);
    });

    // Chat events
    newSocket.on('game_chat_message', (data: ServerEvents['game_chat_message']) => {
      console.log('💬 Chat message:', data.username, ':', data.message);
      setCurrentGame((prev) => {
        if (!prev) return null;

        const messages = prev.chatMessages || [];
        return {
          ...prev,
          chatMessages: [...messages, data],
        };
      });

      // Also update spectator state if spectating
      setSpectatorGameState((prev) => {
        if (!prev) return null;

        const messages = prev.chatMessages || [];
        return {
          ...prev,
          chatMessages: [...messages, data],
        };
      });
    });

    newSocket.on('ready_state_update', (data: ServerEvents['ready_state_update']) => {
      console.log('🏓 Ready states updated:', data.readyStates);
      // Update current game if playing
      setCurrentGame((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          readyStates: data.readyStates,
        };
      });
      // Also update spectator state if spectating
      setSpectatorGameState((prev) => (prev ? { ...prev, readyStates: data.readyStates } : null));
    });

    // Game events
    newSocket.on('countdown', (data: ServerEvents['countdown']) => {
      console.log('🏓 Countdown:', data.seconds, data.message);
      // Update current game if playing
      setCurrentGame((prev) =>
        prev ? { ...prev, status: 'countdown', countdown: data.seconds } : null,
      );
      // Also update spectator state if spectating
      setSpectatorGameState((prev) =>
        prev ? { ...prev, status: 'countdown', countdown: data.seconds } : null,
      );
    });

    newSocket.on('game_state', (data: ServerEvents['game_state']) => {
      // ✅ CRITICAL: Validate gameId to prevent score contamination between games
      const incomingGameId = data.gameId;

      // Check if we're in spectator mode (spectator game_state has player1PaddleY/player2PaddleY)
      const isSpectatorUpdate = 'player1PaddleY' in data && 'player2PaddleY' in data;

      if (isSpectatorUpdate) {
        // Update spectator game state
        setSpectatorGameState((prev) => {
          if (!prev) return null;

          // ✅ Validate gameId matches current spectator game
          if (incomingGameId !== prev.gameId) {
            console.warn(
              `👁️ Ignoring spectator game_state for game ${incomingGameId} (currently spectating ${prev.gameId})`,
            );
            return prev; // Don't update
          }

          return {
            ...prev,
            ball: data.ball,
            scores: data.scores,
            status: 'active' as const,
            tick: data.tick,
            timestamp: data.timestamp,
            wager: data.wager,
            pot: data.pot,
            player1: prev.player1
              ? {
                  ...prev.player1,
                  paddleY: data.player1PaddleY ?? prev.player1.paddleY,
                  score: data.scores[0],
                }
              : null,
            player2: prev.player2
              ? {
                  ...prev.player2,
                  paddleY: data.player2PaddleY ?? prev.player2.paddleY,
                  score: data.scores[1],
                }
              : null,
          };
        });
      } else {
        // Update player game state (normal gameplay)
        setCurrentGame((prev) => {
          if (!prev) return null;

          // ✅ CRITICAL FIX: Validate gameId to prevent score contamination
          if (incomingGameId !== prev.gameId) {
            console.warn(
              `🏓 User ${user.id} ignoring game_state for game ${incomingGameId} (currently in ${prev.gameId})`,
            );
            return prev; // Don't update
          }

          // ✅ RACE CONDITION FIX: Accept game_state updates during countdown/active
          // Only ignore if we're truly waiting (before game has started)
          // This prevents desync during state transitions
          const shouldIgnore =
            prev.status === 'waiting_for_ready' || prev.status === 'waiting_for_opponent';

          if (shouldIgnore) {
            // Still update scores even during waiting to prevent desync
            // But don't update ball/paddles or populate buffer
            console.log(
              `🏓 User ${user.id} received game_state during waiting - updating scores only`,
            );
            return {
              ...prev,
              scores: data.scores,
            };
          }

          // Create updated player data with server paddle positions
          const updatedPlayers: [any, any] = [
            prev.players[0]
              ? {
                  ...prev.players[0],
                  paddleY:
                    prev.playerSlot === 0
                      ? prev.players[0].paddleY // Keep our own paddle unchanged
                      : (data.opponentPaddleY ?? prev.players[0].paddleY), // Use server data for opponent
                }
              : null,
            prev.players[1]
              ? {
                  ...prev.players[1],
                  paddleY:
                    prev.playerSlot === 1
                      ? prev.players[1].paddleY // Keep our own paddle unchanged
                      : (data.opponentPaddleY ?? prev.players[1].paddleY), // Use server data for opponent
                }
              : null,
          ];

          // ✅ Side effect: Update buffer directly (not through setState)
          // Note: Buffer is populated even during early game states for smooth interpolation
          const bufferSnapshot: GameStateSnapshot = {
            ball: data.ball,
            players: updatedPlayers,
            scores: data.scores,
            tick: data.tick,
            timestamp: data.timestamp,
            serverTime: data.timestamp,
            status: 'active',
          };
          gameStateBuffer.addState(bufferSnapshot);

          // Return updated state (single state update)
          return {
            ...prev,
            ball: data.ball,
            scores: data.scores,
            status: 'active' as const,
            tick: data.tick,
            timestamp: data.timestamp,
            serverTick: data.tick, // Add for compatibility
            wager: data.wager || prev.wager,
            pot: data.pot || prev.pot,
            players: updatedPlayers,
          };
        });

        // Note: Ping is now calculated via RTT ping_request/ping_response
        // See ping measurement setup below
      }
    });

    // ✅ RTT-based ping measurement AND server time synchronization
    newSocket.on('ping_response', (data: { clientTimestamp: number; serverTimestamp: number }) => {
      const now = Date.now();
      const rtt = now - data.clientTimestamp;
      const oneWayPing = Math.floor(rtt / 2); // Half of round-trip time
      setLastPing(Math.max(0, oneWayPing));

      // Calculate server time offset to synchronize timestamps
      // Server time was measured at approximately clientTimestamp + rtt/2
      const estimatedClientTimeAtServer = data.clientTimestamp + rtt / 2;
      const clockOffset = data.serverTimestamp - estimatedClientTimeAtServer;
      serverTimeOffsetRef.current = clockOffset;

      // Log significant clock drift (>1 second difference)
      if (Math.abs(clockOffset) > 1000) {
        console.warn(
          `🕐 Clock drift detected: ${(clockOffset / 1000).toFixed(1)}s (client ${clockOffset > 0 ? 'behind' : 'ahead of'} server)`,
        );
      }
    });

    newSocket.on('score_update', (data: ServerEvents['score_update']) => {
      console.log('🏓 Score update:', data.scores, 'scorer:', data.scorer);
      setCurrentGame((prev) => {
        if (!prev) return null;

        // ✅ CRITICAL: Validate gameId to prevent score contamination
        if (data.gameId !== prev.gameId) {
          console.warn(
            `🏓 Ignoring score_update for game ${data.gameId} (currently in ${prev.gameId})`,
          );
          return prev; // Don't update
        }

        return { ...prev, scores: data.scores };
      });
    });

    newSocket.on('match_end', (data: ServerEvents['match_end']) => {
      console.log('🏓 Match ended:', data);
      // Update current game if playing
      setCurrentGame((prev) =>
        prev
          ? {
              ...prev,
              status: 'ended',
              winner: data.winner,
              scores: data.scores,
              payout: data.payout,
            }
          : null,
      );
      // Also update spectator state if spectating
      setSpectatorGameState((prev) => {
        const wasSpectating = prev !== null;
        const updatedState = prev
          ? {
              ...prev,
              status: 'ended' as const,
              winner: data.winner,
              scores: data.scores,
            }
          : null;

        // If spectating, trigger auto-return to lobby after 3 seconds
        if (wasSpectating) {
          console.log('👁️ Spectated match ended, auto-return to lobby in 3s');
          setTimeout(() => {
            console.log('👁️ Spectator auto-return to lobby triggered');
            setShouldReturnToLobby(true);
          }, 3000);
        }

        return updatedState;
      });

      // Auto-clear game state after 5 seconds (gives time to see win screen and payout)
      setTimeout(() => {
        setCurrentGame(null);
      }, 5000);
    });

    newSocket.on('player_disconnected', (data: ServerEvents['player_disconnected']) => {
      console.log('🏓 Player disconnected:', data);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'paused' } : null));
      setOpponentDisconnected(true);
    });

    newSocket.on('player_reconnected', (data: ServerEvents['player_reconnected']) => {
      console.log('🏓 Player reconnected:', data);
      setCurrentGame((prev) => {
        if (!prev) return null;

        // Restore status based on game state
        const restoredStatus = prev.wagerNegotiation?.lockedIn
          ? 'waiting_for_ready'
          : prev.wagerNegotiation
            ? 'lobby_negotiation'
            : prev.status;

        return { ...prev, status: restoredStatus };
      });
      setOpponentDisconnected(false);
    });

    // Error handling
    newSocket.on('error', (data: ServerEvents['error']) => {
      console.error('🏓 Server error:', data);
      setConnectionError(data.message);
    });

    // Spectator events
    newSocket.on('spectator_joined', (data: ServerEvents['spectator_joined']) => {
      console.log('👁️ Joined as spectator for game:', data.gameId);
      console.log('👁️ Player 1:', data.player1?.name, 'Player 2:', data.player2?.name);
      setSpectatorGameState({
        gameId: data.gameId,
        player1: data.player1
          ? {
              id: data.player1.id,
              name: data.player1.name,
              paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
              score: 0,
            }
          : null,
        player2: data.player2
          ? {
              id: data.player2.id,
              name: data.player2.name,
              paddleY: PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
              score: 0,
            }
          : null,
        ball: { x: PONG_PHYSICS.FIELD_WIDTH / 2, y: PONG_PHYSICS.FIELD_HEIGHT / 2, vx: 0, vy: 0 },
        scores: [0, 0],
        status: data.status,
        tick: 0,
        timestamp: Date.now(),
        wager: data.wager,
        pot: data.pot,
        wagerNegotiation: data.wagerNegotiation || null,
        chatMessages: data.chatMessages || [],
        negotiationStartedAt: data.negotiationStartedAt || null,
      });
    });

    // Store as user-specific socket and local state
    userSockets.set(user.id, newSocket);
    setSocket(newSocket);
  }, [user, accessToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Disconnect user-specific socket if it exists
    if (user) {
      const userSocket = userSockets.get(user.id);
      if (userSocket) {
        console.log(`🏓 Disconnecting user ${user.id} from Pong server...`);
        userSocket.disconnect();
        userSockets.delete(user.id);
      }
      userConnecting.delete(user.id);
    }

    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setCurrentGame(null);
    setLobbies([]);
    setActiveGames([]);
    setStats({ playersOnline: 0, activeGames: 0, availableMatches: 0 });
    setConnectionError(null);
    isConnectingRef.current = false;
    authenticatedPlayerRef.current = null;
  }, [user]);

  const joinLobby = useCallback(() => {
    if (!socket || !isAuthenticated) {
      console.log('🏓 Cannot join lobby: not connected or authenticated');
      return;
    }

    console.log('🏓 Joining lobby...');
    socket.emit('join_lobby', {} as ClientEvents['join_lobby']);
  }, [socket, isAuthenticated]);

  const createMatch = useCallback(
    (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => {
      if (!socket || !isAuthenticated) {
        console.log('🏓 Cannot create match: not connected or authenticated');
        return;
      }

      console.log('🏓 Creating match:', { wager, type, aiDifficulty });
      socket.emit('create_match', {
        wager,
        type,
        ...(aiDifficulty && { aiDifficulty }),
      } as ClientEvents['create_match']);
    },
    [socket, isAuthenticated],
  );

  const joinMatch = useCallback(
    (matchId: string) => {
      if (!socket || !isAuthenticated) {
        console.log('🏓 Cannot join match: not connected or authenticated');
        return;
      }

      console.log('🏓 Joining match:', matchId);
      socket.emit('join_match', { matchId } as ClientEvents['join_match']);
    },
    [socket, isAuthenticated],
  );

  // Store latest input for client-side prediction
  const lastInputRef = useRef<{ up: boolean; down: boolean }>({ up: false, down: false });

  // Track initial drag state for 1:1 mouse movement
  const dragStateRef = useRef<{ initialPaddleY: number; initialDragDelta: number } | null>(null);

  const sendInput = useCallback(
    (input: Omit<PlayerInput, 'paddleY' | 'seq' | 'timestamp'>) => {
      if (!socket || !isAuthenticated || !currentGame) {
        return;
      }

      // Store input for prediction
      lastInputRef.current = { up: input.up, down: input.down };

      // Update local paddle position immediately for responsive feel
      // ✅ Allow paddle movement in lobby/waiting states for better UX
      let newPaddleY = 0;
      const allowPaddleMovement =
        currentGame.status === 'active' ||
        currentGame.status === 'waiting_for_ready' ||
        currentGame.status === 'waiting_for_opponent' ||
        currentGame.status === 'countdown';

      if (allowPaddleMovement) {
        const userPlayerSlot = currentGame.playerSlot;
        const userPlayer = currentGame.players[userPlayerSlot];

        if (userPlayer) {
          newPaddleY = userPlayer.paddleY;

          // Check if using mouse drag (1:1 movement)
          if (input.mouseDragDelta !== undefined) {
            // Get canvas for coordinate mapping
            const canvas = document.querySelector('canvas');
            if (canvas) {
              const rect = canvas.getBoundingClientRect();

              // Initialize drag state on first drag input
              if (dragStateRef.current === null) {
                dragStateRef.current = {
                  initialPaddleY: userPlayer.paddleY,
                  initialDragDelta: input.mouseDragDelta,
                };
              }

              // Convert screen-space delta to game-space delta
              const screenDeltaFromStart =
                input.mouseDragDelta - dragStateRef.current.initialDragDelta;
              const scaleY = PONG_PHYSICS.FIELD_HEIGHT / rect.height;
              const gameDelta = screenDeltaFromStart * scaleY;

              // Apply delta to initial paddle position for 1:1 tracking
              newPaddleY = Math.max(
                0,
                Math.min(
                  PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
                  dragStateRef.current.initialPaddleY + gameDelta,
                ),
              );
            }
          } else {
            // Reset drag state when not dragging
            dragStateRef.current = null;

            // Fallback to keyboard-style up/down movement
            const moveSpeed = PONG_PHYSICS.PADDLE_SPEED / PONG_PHYSICS.TICK_RATE;

            if (input.up && !input.down) {
              newPaddleY = Math.max(0, newPaddleY - moveSpeed);
            } else if (input.down && !input.up) {
              newPaddleY = Math.min(
                PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
                newPaddleY + moveSpeed,
              );
            }
          }

          // Update local state immediately
          setCurrentGame((prev) => {
            if (!prev) return null;

            const updatedPlayers = [...prev.players];
            if (updatedPlayers[userPlayerSlot]) {
              updatedPlayers[userPlayerSlot] = {
                ...updatedPlayers[userPlayerSlot],
                paddleY: newPaddleY,
              };
            }

            return {
              ...prev,
              players: updatedPlayers as [any, any],
            };
          });
        }
      }

      const fullInput: PlayerInput = {
        ...input,
        paddleY: newPaddleY, // Send client's authoritative paddle position
        seq: inputSequenceRef.current++,
        timestamp: Date.now() + serverTimeOffsetRef.current, // Use server-synchronized time
      };

      // Use volatile to prevent buffering stale inputs during brief disconnects
      socket.volatile.emit('player_input', fullInput as ClientEvents['player_input']);
    },
    [socket, isAuthenticated, currentGame],
  );

  const setReady = useCallback(
    (ready: boolean) => {
      if (!socket || !isAuthenticated || !currentGame) {
        console.log('🏓 Cannot set ready: not connected, authenticated, or in game');
        return;
      }

      console.log('🏓 Setting ready state:', ready);
      socket.emit('player_ready', { ready } as ClientEvents['player_ready']);
    },
    [socket, isAuthenticated, currentGame],
  );

  const leaveMatch = useCallback(() => {
    if (!socket || !isAuthenticated) {
      console.log('🏓 Cannot leave match: not connected or authenticated');
      return;
    }

    console.log('🏓 Leaving match...');
    socket.emit('leave_match', {} as ClientEvents['leave_match']);
    setCurrentGame(null);
    gameStateBuffer.clear();
  }, [socket, isAuthenticated, gameStateBuffer]);

  const spectateGame = useCallback(
    (gameId: string) => {
      if (!socket || !isAuthenticated) {
        console.log('👁️ Cannot spectate: not connected or authenticated');
        return;
      }

      console.log('👁️ Spectating game:', gameId);
      setSpectatingGameId(gameId);
      socket.emit('spectate_match', { gameId } as ClientEvents['spectate_match']);
    },
    [socket, isAuthenticated],
  );

  const leaveSpectating = useCallback(() => {
    if (!socket || !isAuthenticated) {
      console.log('👁️ Cannot leave spectating: not connected or authenticated');
      return;
    }

    console.log('👁️ Leaving spectator mode');
    socket.emit('leave_match', {} as ClientEvents['leave_match']);
    setSpectatingGameId(null);
    setSpectatorGameState(null);
    setShouldReturnToLobby(false); // Reset the flag
  }, [socket, isAuthenticated]);

  const proposeWager = useCallback(
    (gameId: string, amount: number) => {
      if (!socket || !isAuthenticated) {
        console.log('🏓 Cannot propose wager: not connected or authenticated');
        return;
      }

      console.log('🏓 Proposing wager:', amount, 'for game:', gameId);
      socket.emit('propose_wager', { gameId, amount } as ClientEvents['propose_wager']);
    },
    [socket, isAuthenticated],
  );

  const acceptWager = useCallback(
    (gameId: string) => {
      if (!socket || !isAuthenticated) {
        console.log('🏓 Cannot accept wager: not connected or authenticated');
        return;
      }

      console.log('🏓 Accepting wager for game:', gameId);
      socket.emit('accept_wager', { gameId } as ClientEvents['accept_wager']);
    },
    [socket, isAuthenticated],
  );

  const rejectWager = useCallback(
    (gameId: string) => {
      if (!socket || !isAuthenticated) {
        console.log('🏓 Cannot reject wager: not connected or authenticated');
        return;
      }

      console.log('🏓 Rejecting wager for game:', gameId);
      socket.emit('reject_wager', { gameId } as ClientEvents['reject_wager']);
    },
    [socket, isAuthenticated],
  );

  const sendChatMessage = useCallback(
    (gameId: string, message: string) => {
      if (!socket || !isAuthenticated) {
        console.log('💬 Cannot send chat message: not connected or authenticated');
        return;
      }

      console.log('💬 Sending chat message for game:', gameId);
      socket.emit('game_chat_message', {
        gameId,
        message,
      } as ClientEvents['game_chat_message']);
    },
    [socket, isAuthenticated],
  );

  // Auto-connect when user is available
  useEffect(() => {
    if (user && !userSockets.has(user.id) && !userConnecting.has(user.id)) {
      console.log(`🏓 Auto-connecting user ${user.id} to Pong server...`);
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, connect]);

  // Cleanup on unmount - only depends on user.id to prevent unnecessary cleanups
  useEffect(() => {
    return () => {
      console.log('🏓 Cleaning up socket on unmount');
      if (user) {
        userConnecting.delete(user.id); // Reset user connecting flag
      }
      isConnectingRef.current = false; // Reset local connecting flag
      // Note: We don't disconnect the user socket on unmount
      // as other components might still be using it
    };
  }, [user?.id]); // Only depend on user ID, not the whole user object

  // Periodic health check to clean up disconnected sockets
  useEffect(() => {
    if (!user) return;

    const healthCheckInterval = setInterval(() => {
      // Clean up stale entries from userSockets map
      for (const [userId, userSocket] of userSockets.entries()) {
        if (!userSocket.connected) {
          console.log(`🏓 Cleaning up disconnected socket for user ${userId}`);
          userSocket.disconnect();
          userSockets.delete(userId);
          userConnecting.delete(userId);

          // If it's the current user, reconnect
          if (userId === user.id && accessToken) {
            console.log(`🏓 Current user's socket was disconnected, reconnecting...`);
            setTimeout(() => connect(), 1000);
          }
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [user, accessToken, connect]);

  // ✅ Periodic RTT ping measurement (every 2 seconds during active game)
  useEffect(() => {
    if (!socket || !isConnected || !currentGame) return;

    const pingInterval = setInterval(() => {
      socket.emit('ping_request', { clientTimestamp: Date.now() });
    }, 2000); // Every 2 seconds

    return () => clearInterval(pingInterval);
  }, [socket, isConnected, currentGame]);

  // Negotiation countdown timer (updates every second)
  useEffect(() => {
    if (negotiationTimeRemaining === null || negotiationTimeRemaining <= 0) return;

    const countdownInterval = setInterval(() => {
      setNegotiationTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return null;
        return prev - 1;
      });
    }, 1000); // Every second

    return () => clearInterval(countdownInterval);
  }, [negotiationTimeRemaining]);

  return {
    socket,
    isConnected,
    isAuthenticated,
    currentGame,
    lobbies,
    activeGames,
    connectionError,
    lastPing,
    stats,
    gameStateBuffer,
    spectatingGameId,
    spectatorGameState,
    shouldReturnToLobby,
    opponentDisconnected,
    negotiationTimeRemaining,
    connect,
    disconnect,
    joinLobby,
    createMatch,
    joinMatch,
    sendInput,
    setReady,
    leaveMatch,
    spectateGame,
    leaveSpectating,
    proposeWager,
    acceptWager,
    rejectWager,
    sendChatMessage,
  };
}
