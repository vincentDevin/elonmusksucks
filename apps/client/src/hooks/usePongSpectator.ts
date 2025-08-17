import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerEvents, ClientEvents } from '@ems/types';
import { PONG_PHYSICS } from '@ems/types';
import { useAuth } from './useAuth';

// Spectator-only game state (no player slot, no input)
interface SpectatorGameState {
  gameId: string;
  player1: { id: number; name: string; paddleY: number; score: number } | null;
  player2: { id: number; name: string; paddleY: number; score: number } | null;
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status:
    | 'waiting'
    | 'waiting_for_opponent'
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
}

interface SpectatorState {
  socket: Socket | null;
  isConnected: boolean;
  isAuthenticated: boolean;
  gameState: SpectatorGameState | null;
  connectionError: string | null;
  spectatorCount: number;
  shouldReturnToLobby: boolean;
}

interface SpectatorActions {
  spectateGame: (gameId: string) => void;
  leaveSpectating: () => void;
}

interface SpectatorHook extends SpectatorState, SpectatorActions {}

export function usePongSpectator(): SpectatorHook {
  const { user, accessToken } = useAuth();

  // State
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [gameState, setGameState] = useState<SpectatorGameState | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [shouldReturnToLobby, setShouldReturnToLobby] = useState(false);

  const cleanupRef = useRef<() => void>();
  const currentGameIdRef = useRef<string | null>(null);

  const connect = useCallback(() => {
    if (!user || !accessToken) {
      console.log('👁️ Cannot connect spectator: missing user or token');
      return null;
    }

    console.log('👁️ Connecting spectator to Pong server...');

    const spectatorSocket = io('http://127.0.0.1:5001', {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      autoConnect: true,
      forceNew: true,
    });

    // Connection events
    spectatorSocket.on('connect', () => {
      console.log('👁️ Spectator connected, authenticating...');
      setIsConnected(true);
      spectatorSocket.emit('auth', { token: accessToken } as ClientEvents['auth']);
    });

    spectatorSocket.on('disconnect', () => {
      console.log('👁️ Spectator disconnected');
      setIsConnected(false);
      setIsAuthenticated(false);
      setGameState(null);
    });

    spectatorSocket.on('connect_error', (error) => {
      console.error('👁️ Spectator connection error:', error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);
    });

    // Authentication
    spectatorSocket.on('auth_result', (data: ServerEvents['auth_result']) => {
      if (data.success) {
        console.log('👁️ Spectator authenticated');
        setIsAuthenticated(true);
        setConnectionError(null);
      } else {
        console.error('👁️ Spectator authentication failed:', data.error);
        setConnectionError(data.error || 'Authentication failed');
        setIsAuthenticated(false);
      }
    });

    // Spectator-specific events
    spectatorSocket.on('spectator_joined', (data: ServerEvents['spectator_joined']) => {
      console.log('👁️ Joined as spectator for game:', data.gameId);
      setGameState({
        gameId: data.gameId,
        player1: null,
        player2: null,
        ball: { x: PONG_PHYSICS.FIELD_WIDTH / 2, y: PONG_PHYSICS.FIELD_HEIGHT / 2, vx: 0, vy: 0 },
        scores: [0, 0],
        status: 'waiting',
        tick: 0,
        timestamp: Date.now(),
      });
    });

    // Game state updates (spectator version)
    spectatorSocket.on('game_state', (data: ServerEvents['game_state']) => {
      setGameState((prev) => {
        if (!prev) return null;

        return {
          ...prev,
          ball: data.ball,
          scores: data.scores,
          status: 'active',
          tick: data.tick,
          timestamp: data.timestamp,
          wager: data.wager,
          pot: data.pot,
          player1: prev.player1
            ? {
                ...prev.player1,
                paddleY: data.player1PaddleY || prev.player1.paddleY,
                score: data.scores[0],
              }
            : {
                id: 1,
                name: 'Player 1',
                paddleY: data.player1PaddleY || 200,
                score: data.scores[0],
              },
          player2: prev.player2
            ? {
                ...prev.player2,
                paddleY: data.player2PaddleY || prev.player2.paddleY,
                score: data.scores[1],
              }
            : {
                id: 2,
                name: 'Player 2',
                paddleY: data.player2PaddleY || 200,
                score: data.scores[1],
              },
        };
      });
    });

    // Ready state updates
    spectatorSocket.on('ready_state_update', (data: ServerEvents['ready_state_update']) => {
      setGameState((prev) => (prev ? { ...prev, readyStates: data.readyStates } : null));
    });

    // Countdown
    spectatorSocket.on('countdown', (data: ServerEvents['countdown']) => {
      setGameState((prev) =>
        prev ? { ...prev, status: 'countdown', countdown: data.seconds } : null,
      );
    });

    // Match end
    spectatorSocket.on('match_end', (data: ServerEvents['match_end']) => {
      console.log('👁️ Spectated match ended');
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              status: 'ended',
              winner: data.winner,
              scores: data.scores,
            }
          : null,
      );

      // Signal return to lobby after 3 seconds
      setTimeout(() => {
        console.log('👁️ Spectator auto-return to lobby triggered');
        setShouldReturnToLobby(true);
      }, 3000);
    });

    // Error handling
    spectatorSocket.on('error', (data: ServerEvents['error']) => {
      console.error('👁️ Spectator error:', data);
      setConnectionError(data.message);
    });

    setSocket(spectatorSocket);
    return spectatorSocket;
  }, [user, accessToken]);

  const spectateGame = useCallback(
    (gameId: string) => {
      console.log('👁️ Spectate request for game:', gameId);

      // Prevent duplicate spectate calls for the same game
      if (currentGameIdRef.current === gameId) {
        console.log('👁️ Already spectating this game, ignoring duplicate call');
        return;
      }

      currentGameIdRef.current = gameId;

      // If we already have an authenticated socket, use it
      if (socket && socket.connected && isAuthenticated) {
        console.log('👁️ Using existing authenticated socket to spectate:', gameId);
        socket.emit('spectate_match', { gameId } as ClientEvents['spectate_match']);
        return;
      }

      // Create a fresh connection for spectator
      const newSocket = connect();
      if (!newSocket) {
        console.error('👁️ Failed to connect spectator socket');
        return;
      }

      // Set up a one-time listener for when auth completes
      const handleAuthResult = (data: any) => {
        if (data.success) {
          console.log('👁️ Spectator authenticated, now spectating game:', gameId);
          newSocket.emit('spectate_match', { gameId } as ClientEvents['spectate_match']);
          newSocket.off('auth_result', handleAuthResult); // Remove listener
        } else {
          console.error('👁️ Spectator authentication failed:', data.error);
          setConnectionError(data.error || 'Authentication failed');
          newSocket.off('auth_result', handleAuthResult);
        }
      };

      newSocket.on('auth_result', handleAuthResult);
    },
    [socket, isAuthenticated, connect],
  );

  const leaveSpectating = useCallback(() => {
    if (socket) {
      console.log('👁️ Leaving spectator mode');
      socket.emit('leave_match', {} as ClientEvents['leave_match']);
      socket.disconnect();
    }
    setSocket(null);
    setGameState(null);
    setIsConnected(false);
    setIsAuthenticated(false);
    setShouldReturnToLobby(false);
    currentGameIdRef.current = null; // Clear the current game ID
  }, [socket]);

  // Cleanup on unmount
  useEffect(() => {
    cleanupRef.current = () => {
      if (socket) {
        socket.disconnect();
      }
    };

    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
      }
    };
  }, [socket]);

  return {
    socket,
    isConnected,
    isAuthenticated,
    gameState,
    connectionError,
    spectatorCount,
    shouldReturnToLobby,
    spectateGame,
    leaveSpectating,
  };
}
