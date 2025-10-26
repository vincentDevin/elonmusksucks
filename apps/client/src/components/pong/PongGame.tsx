import { useEffect, useState, useRef } from 'react';
import { usePongSocket } from '../../hooks/usePongSocket';
import { usePongInput } from '../../hooks/usePongInput';
import { usePongEvents } from '../../hooks/usePongEvents';
import { PongCanvas } from './PongCanvas';
import { PongGamesList } from './PongGamesList';
import { PongSpectator } from './PongSpectator';
import { PongHeader } from './PongHeader';
import { PongMatchCreatorModal } from './PongMatchCreatorModal';
import { PONG_PHYSICS } from '@ems/types';
import { PongClientPhysics } from '../../utils/pongClientPhysics';
import api from '../../api/axios';
import { getTierFromElo } from './PongTierBadge';

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
    connect,
    disconnect,
    joinLobby,
    createMatch,
    joinMatch,
    sendInput,
    setReady,
    leaveMatch,
  } = usePongSocket();

  // Subscribe to Elo update events
  const { metrics } = usePongEvents();

  // Local state for spectator mode and match creation modal
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
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

  // Fetch user's Elo rating on mount
  useEffect(() => {
    const fetchUserElo = async () => {
      try {
        const response = await api.get('/api/users/me/pong-stats');
        const elo = response.data.eloRating || 1200;
        setUserElo(elo);
        setUserTier(getTierFromElo(elo));
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

  // Cleanup on unmount - only disconnect when component actually unmounts (user leaves page)
  // NOT when user object updates (e.g., balance changes)
  useEffect(() => {
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run on actual mount/unmount

  // Auto-refresh lobby when in lobby mode (not in game or spectating)
  useEffect(() => {
    // Only refresh when we're in lobby mode (not in a game or spectating)
    if (currentGame || spectatingGameId || !isConnected || !isAuthenticated) return;

    // Initial lobby join when entering lobby mode
    joinLobby();

    // Set up periodic refresh every 15 seconds
    const refreshInterval = setInterval(() => {
      joinLobby();
    }, 15000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isConnected, isAuthenticated, currentGame, spectatingGameId, joinLobby]);

  // ✅ PHASE 2: Initialize shadow physics when game becomes active
  useEffect(() => {
    if (!currentGame || currentGame.status !== 'active') {
      // Clear shadow physics when not in active game
      shadowPhysicsRef.current.clear();
      return;
    }

    // Initialize shadow physics with current ball state
    shadowPhysicsRef.current.initialize(currentGame.ball);
    console.log('🎮 Shadow physics initialized');
  }, [currentGame?.status, currentGame?.ball]);

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
    setSpectatingGameId(gameId);
  };

  const handleBackToLobby = () => {
    console.log('🏓 Main handleBackToLobby called, clearing spectatingGameId');
    setSpectatingGameId(null);
    leaveMatch();
    joinLobby();
  };

  // Determine current mode for header
  const headerMode = spectatingGameId ? 'spectator' : currentGame ? 'game' : 'lobby';

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Unified Header */}
        <div className="mb-6">
          <PongHeader
            mode={headerMode}
            isConnected={isConnected}
            isAuthenticated={isAuthenticated}
            connectionError={connectionError}
            stats={stats}
            onConnect={connect}
            userElo={userElo}
            userTier={userTier}
            currentGame={currentGame}
            lastPing={lastPing}
            onBackToLobby={handleBackToLobby}
            spectatingGameId={spectatingGameId}
          />
        </div>

        {/* Show spectator if spectating */}
        {spectatingGameId ? (
          <>
            {console.log('🏓 Rendering PongSpectator for gameId:', spectatingGameId)}
            <PongSpectator gameId={spectatingGameId} onBackToLobby={handleBackToLobby} />
          </>
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
              activeGames={activeGames}
              onJoinMatch={joinMatch}
              onSpectateGame={handleSpectateGame}
              onPlayAI={handlePlayAI}
              onChallengePlayers={handleChallengePlayers}
              onQuickMatch={handleQuickMatch}
            />
          </div>
        )}

        {/* Match Creation Modal */}
        {modalVariant && (
          <PongMatchCreatorModal
            isOpen={showCreateModal}
            onClose={handleCloseModal}
            onCreateMatch={handleCreateMatch}
            variant={modalVariant}
          />
        )}

        {/* Debug Info (development only) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 p-4 bg-muted/20 border border-muted rounded-lg">
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
    </div>
  );
}
