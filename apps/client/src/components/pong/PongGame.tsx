import { useEffect, useState, useRef, useCallback } from 'react';
import { usePongSocket } from '../../hooks/usePongSocket';
import { usePongInput } from '../../hooks/usePongInput';
import { usePongEvents } from '../../hooks/usePongEvents';
import { PongCanvas } from './PongCanvas';
import { PongGamesList } from './PongGamesList';
import { PongHeader } from './PongHeader';
import { PongMatchCreatorModal } from './PongMatchCreatorModal';
import PongLobbyScreen from './PongLobbyScreen';
import { PONG_PHYSICS, REDIS_CHANNELS } from '@ems/types';
import { PongClientPhysics } from '../../utils/pongClientPhysics';
import { useAuth } from '../../contexts/AuthContext';
import { useEventBusCore } from '../../contexts/EventBusCoreContext';
import api from '../../api/axios';

export function PongGame() {
  const {
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
  } = usePongSocket();

  const { user } = useAuth();
  const { subscribe } = useEventBusCore();

  // Subscribe to Elo update events
  const { metrics } = usePongEvents();

  // Local state for user balance (updated in real-time via EventBusCore)
  const [userBalance, setUserBalance] = useState<number>(Number(user?.muskBucks || 0));

  // Local state for match creation modal and user stats
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [modalVariant, setModalVariant] = useState<'ai' | 'pvp' | null>(null);
  const [userElo, setUserElo] = useState<number | undefined>(undefined);
  const [userTier, setUserTier] = useState<string | undefined>(undefined);

  const { inputState, setSendInput } = usePongInput();

  // ✅ PHASE 2: Client-side physics simulation for smoother gameplay
  const shadowPhysicsRef = useRef<PongClientPhysics>(new PongClientPhysics());

  // Connect input system to socket
  useEffect(() => {
    setSendInput((input) => {
      sendInput(input as any);
    });
  }, [setSendInput, sendInput]);

  // Auto-connect on mount
  useEffect(() => {
    if (!isConnected && !socket) {
      connect();
    }
  }, [isConnected, socket, connect]);

  // Fetch user's Elo rating on mount (lightweight endpoint - only fetches elo and tier)
  useEffect(() => {
    const fetchUserElo = async () => {
      try {
        const response = await api.get('/api/users/me/pong-elo');
        setUserElo(response.data.eloRating);
        setUserTier(response.data.tier);
      } catch (error) {
        console.error('Failed to fetch user Elo:', error);
        setUserElo(1200); // Default
        setUserTier('SILVER'); // Default tier
      }
    };

    if (isAuthenticated) {
      fetchUserElo();
    }
  }, [isAuthenticated]);

  // Update local Elo state when event bus metrics change
  useEffect(() => {
    // Update from metrics whenever they change from their default values
    // This means an event was received with real Elo data
    if (metrics.currentElo !== 1000 || metrics.currentTier !== 'Bronze') {
      setUserElo(metrics.currentElo);
      setUserTier(metrics.currentTier);
      console.log(
        '[PongGame] Elo synced from event metrics:',
        metrics.currentElo,
        metrics.currentTier,
      );
    }
    // Note: Don't include userElo/userTier in deps to avoid update loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [metrics.currentElo, metrics.currentTier]);

  // Subscribe to real-time balance updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(REDIS_CHANNELS.BALANCE_UPDATE, (payload: any) => {
      if (payload.userId === user.id) {
        setUserBalance(payload.newBalance);
        console.log('[PongGame] Balance updated via EventBusCore:', payload.newBalance);
      }
    });

    return unsubscribe;
  }, [user?.id, subscribe]);

  // Sync userBalance with user.muskBucks when user object changes (e.g., on initial load)
  useEffect(() => {
    if (user?.muskBucks !== undefined) {
      setUserBalance(Number(user.muskBucks));
    }
  }, [user?.muskBucks]);

  // Cleanup on unmount - only disconnect when component actually unmounts (user leaves page)
  // NOT when user object updates (e.g., balance changes)
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on actual mount/unmount

  // Join lobby ONCE on initial authentication to get initial state
  // After that, server auto-broadcasts all updates (players never leave lobby room)
  const hasJoinedLobbyRef = useRef(false);
  useEffect(() => {
    if (!isConnected || !isAuthenticated || hasJoinedLobbyRef.current) return;

    // Join lobby once on initial auth - we stay in lobby room even during matches
    // Server broadcasts: active_games on game start/end, lobby_state on lobby changes, stats every 5s
    joinLobby();
    hasJoinedLobbyRef.current = true;
  }, [isConnected, isAuthenticated, joinLobby]);

  // ✅ PHASE 2: Initialize shadow physics when game becomes active
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') {
      // Clear shadow physics when not in active game
      shadowPhysicsRef.current.clear();
      return;
    }

    // Initialize shadow physics with current ball state
    // Note: Only initialize once when status changes to 'active', not on every ball update
    shadowPhysicsRef.current.initialize(currentGame.ball);
    console.log('🎮 Shadow physics initialized');
  }, [currentGame?.status]); // Only depend on status, not ball (ball updates every frame!)

  // ✅ PHASE 2: Reconcile shadow physics with server state
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') return;

    // Reconcile shadow state with server state
    const needsReconciliation = shadowPhysicsRef.current.reconcile(currentGame.ball);

    if (needsReconciliation && process.env.NODE_ENV === 'development') {
      const stats = shadowPhysicsRef.current.getStats();
      console.log(`🔄 Shadow reconciliation needed (divergence count: ${stats.divergenceCount})`);
    }
  }, [currentGame?.ball, currentGame?.status]);

  // ✅ PHASE 2: Hard reset shadow physics on score events
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') return;

    // Reset shadow physics when score changes (ball was reset)
    shadowPhysicsRef.current.reset(currentGame.ball);
  }, [currentGame?.scores]);

  const handleCreateMatch = (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => {
    createMatch(wager, type, aiDifficulty);
    setShowCreateModal(false); // Close modal after creating match
    setModalVariant(null); // Reset variant
  };

  const handlePlayAI = () => {
    setModalVariant('ai');
    setShowCreateModal(true);
  };

  const handleChallengePlayers = () => {
    setModalVariant('pvp');
    setShowCreateModal(true);
  };

  const handleQuickMatch = () => {
    // Auto-join first available lobby
    if (lobbies.length > 0) {
      joinMatch(lobbies[0].id);
    } else {
      // No lobbies available - could show a toast/notification here
      console.log('No matches available to join');
      // Optionally show a temporary message or toast
      alert('No matches available at the moment. Try creating one!');
    }
  };

  const handleCloseModal = () => {
    setShowCreateModal(false);
    setModalVariant(null);
  };

  const handleSpectateGame = (gameId: string) => {
    spectateGame(gameId);
  };

  const handleBackToLobby = useCallback(() => {
    console.log('🏓 handleBackToLobby called');

    // Check if we were spectating or playing
    const wasSpectating = spectatingGameId !== null;

    if (wasSpectating) {
      console.log('🏓 Leaving spectator mode');
      leaveSpectating();
    } else if (currentGame) {
      console.log('🏓 Leaving match (was playing)');
      leaveMatch();
    }

    // Note: Don't call joinLobby() here - the periodic refresh will handle it
    // This prevents duplicate lobby joins
  }, [spectatingGameId, currentGame, leaveSpectating, leaveMatch]);

  // Auto-return to lobby when spectating and match ends
  useEffect(() => {
    if (shouldReturnToLobby && spectatingGameId) {
      console.log('👁️ Auto-return to lobby triggered from shouldReturnToLobby flag');
      handleBackToLobby();
    }
  }, [shouldReturnToLobby, spectatingGameId, handleBackToLobby]);

  // Determine current mode for header
  const headerMode = spectatingGameId ? 'spectator' : currentGame ? 'game' : 'lobby';

  // Convert spectator game state to match currentGame format for header
  const displayGame =
    spectatingGameId && spectatorGameState
      ? {
          gameId: spectatorGameState.gameId,
          playerSlot: 0 as const,
          players: [
            spectatorGameState.player1
              ? {
                  id: spectatorGameState.player1.id,
                  name: spectatorGameState.player1.name,
                  paddleY: spectatorGameState.player1.paddleY,
                  score: spectatorGameState.player1.score,
                  ping: 0,
                  lastInputTime: Date.now(),
                }
              : null,
            spectatorGameState.player2
              ? {
                  id: spectatorGameState.player2.id,
                  name: spectatorGameState.player2.name,
                  paddleY: spectatorGameState.player2.paddleY,
                  score: spectatorGameState.player2.score,
                  ping: 0,
                  lastInputTime: Date.now(),
                }
              : null,
          ] as [any, any],
          ball: spectatorGameState.ball,
          scores: spectatorGameState.scores,
          status: spectatorGameState.status,
          tick: spectatorGameState.tick,
          timestamp: spectatorGameState.timestamp,
          countdown: spectatorGameState.countdown,
          winner: spectatorGameState.winner,
          readyStates: spectatorGameState.readyStates,
          wager: spectatorGameState.wager,
          pot: spectatorGameState.pot,
        }
      : currentGame;

  return (
    <div className="min-h-screen bg-background">
      {/* Unified Header - always in container */}
      <div className="container mx-auto px-4 py-6">
        <PongHeader
          mode={headerMode}
          isConnected={isConnected}
          isAuthenticated={isAuthenticated}
          connectionError={connectionError}
          stats={stats}
          onConnect={connect}
          userElo={userElo}
          userTier={userTier}
          currentGame={displayGame}
          lastPing={lastPing}
          onBackToLobby={handleBackToLobby}
          spectatingGameId={spectatingGameId}
        />
      </div>

      {/* Main Content - always in container with consistent max-width */}
      <div className="container mx-auto px-4 pb-32">
        {/* Show spectator if spectating */}
        {spectatingGameId && spectatorGameState ? (
          <div className="space-y-6">
            {/* Game Canvas - Spectator Mode */}
            <div className="flex justify-center">
              <PongCanvas
                gameState={{
                  gameId: spectatorGameState.gameId,
                  playerSlot: 0 as const,
                  players: [
                    spectatorGameState.player1
                      ? {
                          id: spectatorGameState.player1.id,
                          name: spectatorGameState.player1.name,
                          paddleY: spectatorGameState.player1.paddleY,
                          score: spectatorGameState.player1.score,
                          ping: 0,
                          lastInputTime: Date.now(),
                        }
                      : null,
                    spectatorGameState.player2
                      ? {
                          id: spectatorGameState.player2.id,
                          name: spectatorGameState.player2.name,
                          paddleY: spectatorGameState.player2.paddleY,
                          score: spectatorGameState.player2.score,
                          ping: 0,
                          lastInputTime: Date.now(),
                        }
                      : null,
                  ] as [any, any],
                  ball: spectatorGameState.ball,
                  scores: spectatorGameState.scores,
                  status: spectatorGameState.status,
                  tick: spectatorGameState.tick,
                  timestamp: spectatorGameState.timestamp,
                  countdown: spectatorGameState.countdown,
                  winner: spectatorGameState.winner,
                  readyStates: spectatorGameState.readyStates,
                  wager: spectatorGameState.wager,
                  pot: spectatorGameState.pot,
                }}
                ping={0}
                onSetReady={undefined}
                isSpectating={true}
                className="max-w-4xl w-full"
              />
            </div>

            {/* Spectator Info */}
            <div className="p-4 bg-surface border border-muted rounded-lg">
              <h3 className="font-semibold text-content mb-2">Spectator Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                <div>
                  <strong>Watch Only:</strong> You&apos;re viewing this game in real-time
                </div>
                <div>
                  <strong>No Input:</strong> Spectators cannot control paddles
                </div>
              </div>
            </div>

            {/* Game Stats */}
            {spectatorGameState.status === 'active' && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-accent">{spectatorGameState.tick}</div>
                  <div className="text-xs text-tertiary">Game Tick</div>
                </div>
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-warning">
                    {Math.round(
                      Math.sqrt(spectatorGameState.ball.vx ** 2 + spectatorGameState.ball.vy ** 2),
                    )}
                  </div>
                  <div className="text-xs text-tertiary">Ball Speed</div>
                </div>
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-info">👁️</div>
                  <div className="text-xs text-tertiary">Spectating</div>
                </div>
              </div>
            )}
          </div>
        ) : spectatingGameId && !spectatorGameState ? (
          <div className="flex items-center justify-center py-12">
            <div className="bg-surface border border-muted rounded-lg p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-secondary">Joining game as spectator...</p>
            </div>
          </div>
        ) : currentGame &&
          (currentGame.status === 'waiting_for_opponent' ||
            currentGame.status === 'lobby_negotiation') ? (
          /* Lobby/Negotiation Screen */
          <PongLobbyScreen
            gameId={currentGame.gameId}
            playerSlot={currentGame.playerSlot}
            players={currentGame.players}
            status={currentGame.status}
            wagerNegotiation={currentGame.wagerNegotiation || null}
            chatMessages={currentGame.chatMessages || []}
            negotiationTimeRemaining={negotiationTimeRemaining}
            balance={userBalance}
            opponentDisconnected={opponentDisconnected}
            onProposeWager={proposeWager}
            onAcceptWager={acceptWager}
            onRejectWager={rejectWager}
            onSendChatMessage={sendChatMessage}
            onCancelMatch={leaveMatch}
          />
        ) : currentGame ? (
          <div className="space-y-6">
            {/* Game Canvas */}
            <div className="flex justify-center">
              <PongCanvas
                gameState={currentGame}
                ping={lastPing}
                onSetReady={setReady}
                isSpectating={false}
                gameStateBuffer={gameStateBuffer}
                shadowPhysics={shadowPhysicsRef.current}
                className="max-w-4xl w-full"
              />
            </div>

            {/* Game Instructions */}
            <div className="p-4 bg-surface border border-muted rounded-lg">
              <h3 className="font-semibold text-content mb-2">Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
                <div>
                  <strong>Keyboard:</strong> W/S or Arrow Up/Down to move paddle
                </div>
                <div>
                  <strong>Mobile:</strong> Touch and drag on screen to move paddle
                </div>
              </div>
            </div>

            {/* Game Stats */}
            {currentGame.status === 'active' && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-accent">{currentGame.tick}</div>
                  <div className="text-xs text-tertiary">Game Tick</div>
                </div>
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-success">{lastPing}ms</div>
                  <div className="text-xs text-tertiary">Ping</div>
                </div>
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-warning">
                    {Math.round(Math.sqrt(currentGame.ball.vx ** 2 + currentGame.ball.vy ** 2))}
                  </div>
                  <div className="text-xs text-tertiary">Ball Speed</div>
                </div>
                <div className="p-3 bg-surface border border-muted rounded-lg text-center">
                  <div className="text-lg font-bold text-info">{PONG_PHYSICS.WINNING_SCORE}</div>
                  <div className="text-xs text-tertiary">First to Win</div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Lobby */
          <div className="space-y-6">
            <PongGamesList
              lobbies={lobbies}
              activeGames={activeGames.filter((game) => game.status !== 'ended')}
              onJoinMatch={joinMatch}
              onSpectateGame={handleSpectateGame}
              onPlayAI={handlePlayAI}
              onChallengePlayers={handleChallengePlayers}
              onQuickMatch={handleQuickMatch}
            />
          </div>
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-muted/20 border border-muted rounded-lg max-w-4xl mx-auto">
            <h3 className="font-semibold text-content mb-2">Debug Info</h3>
            <div className="text-xs text-tertiary space-y-1">
              <div>Connected: {isConnected ? '✅' : '❌'}</div>
              <div>Authenticated: {isAuthenticated ? '✅' : '❌'}</div>
              <div>Socket ID: {socket?.id || 'None'}</div>
              <div>Game ID: {currentGame?.gameId || 'None'}</div>
              <div>Player Slot: {currentGame?.playerSlot ?? 'None'}</div>
              <div>Spectating Game ID: {spectatingGameId || 'None'}</div>
              <div>Input State: {JSON.stringify(inputState)}</div>
              <div>Last Ping: {lastPing}ms</div>
              <div>Available Lobbies: {lobbies.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Match Creation Modal */}
      {modalVariant && (
        <PongMatchCreatorModal
          isOpen={showCreateModal}
          onClose={handleCloseModal}
          onCreateMatch={handleCreateMatch}
          variant={modalVariant}
        />
      )}
    </div>
  );
}
