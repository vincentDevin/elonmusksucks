import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { Player, LobbyEntry, PlayerInput, ClientEvents, ServerEvents } from '@ems/types';
import { PONG_PHYSICS } from '@ems/types';
import { useAuth } from './useAuth';

// Global singleton to prevent multiple connections
let globalSocket: Socket | null = null;
let globalIsConnecting = false;

// Client-side game state (different from server GameState)
interface OptimizedGameState {
  gameId: string;
  playerSlot: 0 | 1; // Which paddle the user controls
  players: [Player, Player | null];
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status: 'waiting' | 'countdown' | 'active' | 'paused' | 'ended';
  tick: number;
  timestamp: number;
  serverTick?: number; // For compatibility with interpolation hook
  countdown?: number; // For countdown display
  winner?: 0 | 1 | null; // Winner slot or null for draw
  payout?: number; // MuskBucks won
}

interface PongSocketState {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  currentGame: OptimizedGameState | null;
  lobbies: LobbyEntry[];
  connectionError: string | null;
  lastPing: number;
}

interface PongSocketActions {
  connect: () => void;
  disconnect: () => void;
  joinLobby: () => void;
  createMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
  joinMatch: (matchId: string) => void;
  sendInput: (input: PlayerInput) => void;
  leaveMatch: () => void;
}

interface PongSocketHook extends PongSocketState, PongSocketActions {}

export function usePongSocketOptimized(): PongSocketHook {
  const { user, accessToken } = useAuth();

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentGame, setCurrentGame] = useState<OptimizedGameState | null>(null);
  const [lobbies, setLobbies] = useState<LobbyEntry[]>([]);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastPing, setLastPing] = useState(0);

  // Refs for stable references
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const inputSequenceRef = useRef(0);

  const connect = useCallback(() => {
    if (!user || !accessToken) {
      console.log('🏓 Cannot connect: missing user or token');
      return;
    }

    // Use global singleton to prevent duplicate connections
    if (globalSocket?.connected) {
      console.log('🏓 Using existing global connection');
      setSocket(globalSocket);
      setIsConnected(true);
      return;
    }

    if (globalIsConnecting) {
      console.log('🏓 Already connecting globally');
      return;
    }

    // Close any existing socket before creating new one
    if (globalSocket) {
      console.log('🏓 Closing existing global socket before reconnect');
      globalSocket.disconnect();
      globalSocket = null;
    }

    globalIsConnecting = true;
    isConnectingRef.current = true;
    setConnectionError(null);

    console.log('🏓 Connecting to optimized Pong server...');

    const newSocket = io('http://127.0.0.1:5001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      autoConnect: true,
      forceNew: true,
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Connected to Pong server, authenticating...');
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      globalIsConnecting = false;
      isConnectingRef.current = false;

      // Authenticate immediately
      newSocket.emit('auth', { token: accessToken } as ClientEvents['auth']);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Disconnected from Pong server:', reason);
      setIsConnected(false);
      setIsAuthenticated(false);
      setCurrentGame(null);

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
      console.error('❌ Connection error:', error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
      globalIsConnecting = false;
      isConnectingRef.current = false;
    });

    // Authentication response
    newSocket.on('auth_result', (data: ServerEvents['auth_result']) => {
      if (data.success && data.player) {
        console.log(`✅ Authenticated as ${data.player.name}`);
        setIsAuthenticated(true);
        setConnectionError(null);
      } else {
        console.error('❌ Authentication failed:', data.error);
        setConnectionError(data.error || 'Authentication failed');
        setIsAuthenticated(false);
      }
    });

    // Lobby events
    newSocket.on('lobby_state', (data: ServerEvents['lobby_state']) => {
      console.log('🏓 Lobby updated:', data.lobbies.length, 'available matches');
      setLobbies(data.lobbies);
    });

    // Match events
    newSocket.on('match_joined', (data: ServerEvents['match_joined']) => {
      console.log('🏓 Joined match:', data.gameId, 'as player', data.playerSlot);
      // Create proper player objects with initial paddle positions
      const initialPaddleY = PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2;
      const userPlayer = {
        ...user,
        paddleY: initialPaddleY,
        score: 0,
        ping: 0,
        lastInputTime: Date.now(),
      } as any;

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
        status: 'waiting',
        tick: 0,
        timestamp: Date.now(),
      });
    });

    newSocket.on('match_waiting', (data: ServerEvents['match_waiting']) => {
      console.log('🏓 Waiting for opponent:', data.message);
      // Could show a waiting indicator in UI
    });

    // Game events
    newSocket.on('countdown', (data: ServerEvents['countdown']) => {
      console.log('🏓 Countdown:', data.seconds, data.message);
      setCurrentGame((prev) =>
        prev ? { ...prev, status: 'countdown', countdown: data.seconds } : null,
      );
    });

    newSocket.on('game_state', (data: ServerEvents['game_state']) => {
      setCurrentGame((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          ball: data.ball,
          scores: data.scores,
          status: 'active' as const,
          tick: data.tick,
          timestamp: data.timestamp,
          serverTick: data.tick, // Add for compatibility
          players:
            prev.playerSlot === 0
              ? ([
                  prev.players[0], // Keep our own paddle position unchanged
                  prev.players[1] ? { ...prev.players[1], paddleY: data.opponentPaddleY } : null,
                ] as [any, any])
              : ([
                  prev.players[0] ? { ...prev.players[0], paddleY: data.opponentPaddleY } : null,
                  prev.players[1], // Keep our own paddle position unchanged
                ] as [any, any]),
        };
      });

      // Update ping
      const ping = Date.now() - data.timestamp;
      setLastPing(ping);
    });

    newSocket.on('score_update', (data: ServerEvents['score_update']) => {
      console.log('🏓 Score update:', data.scores, 'scorer:', data.scorer);
      setCurrentGame((prev) => {
        if (!prev) return null;

        return { ...prev, scores: data.scores };
      });
    });

    newSocket.on('match_end', (data: ServerEvents['match_end']) => {
      console.log('🏓 Match ended:', data);
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

      // Auto-clear game state after 5 seconds
      setTimeout(() => {
        setCurrentGame(null);
      }, 5000);
    });

    newSocket.on('player_disconnected', (data: ServerEvents['player_disconnected']) => {
      console.log('🏓 Player disconnected:', data);
      setCurrentGame((prev) => (prev ? { ...prev, status: 'paused' } : null));
    });

    // Error handling
    newSocket.on('error', (data: ServerEvents['error']) => {
      console.error('🏓 Server error:', data);
      setConnectionError(data.message);
    });

    // Store as global singleton and local state
    globalSocket = newSocket;
    setSocket(newSocket);
  }, [user, accessToken]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Disconnect global socket if it exists
    if (globalSocket) {
      console.log('🏓 Disconnecting from Pong server...');
      globalSocket.disconnect();
      globalSocket = null;
    }

    setSocket(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setCurrentGame(null);
    setLobbies([]);
    setConnectionError(null);
    globalIsConnecting = false;
    isConnectingRef.current = false;
  }, []);

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

  const sendInput = useCallback(
    (input: Omit<PlayerInput, 'paddleY' | 'seq' | 'timestamp'>) => {
      if (!socket || !isAuthenticated || !currentGame) {
        return;
      }

      // Store input for prediction
      lastInputRef.current = { up: input.up, down: input.down };

      // Update local paddle position immediately for responsive feel
      let newPaddleY = 0;
      if (currentGame.status === 'active') {
        const userPlayerSlot = currentGame.playerSlot;
        const userPlayer = currentGame.players[userPlayerSlot];

        if (userPlayer) {
          const moveSpeed = PONG_PHYSICS.PADDLE_SPEED / PONG_PHYSICS.TICK_RATE;
          newPaddleY = userPlayer.paddleY;

          if (input.up && !input.down) {
            newPaddleY = Math.max(0, newPaddleY - moveSpeed);
          } else if (input.down && !input.up) {
            newPaddleY = Math.min(
              PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
              newPaddleY + moveSpeed,
            );
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
        timestamp: Date.now(),
      };

      socket.emit('player_input', fullInput as ClientEvents['player_input']);
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
  }, [socket, isAuthenticated]);

  // Auto-connect when user and token are available
  useEffect(() => {
    if (user && accessToken && !globalSocket && !globalIsConnecting) {
      console.log('🏓 Auto-connecting to Pong server...');
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [user, accessToken, connect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🏓 Cleaning up socket on unmount');
      globalIsConnecting = false; // Reset global connecting flag
      isConnectingRef.current = false; // Reset local connecting flag
      // Note: We don't disconnect the global socket on unmount
      // as other components might still be using it
    };
  }, []);

  return {
    socket,
    isConnected,
    isAuthenticated,
    currentGame,
    lobbies,
    connectionError,
    lastPing,
    connect,
    disconnect,
    joinLobby,
    createMatch,
    joinMatch,
    sendInput,
    leaveMatch,
  };
}
