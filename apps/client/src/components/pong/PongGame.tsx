import { useEffect, useState } from 'react';
import { usePongSocket } from '../../hooks/usePongSocket';
import { usePongInput } from '../../hooks/usePongInput';
import { PongCanvas } from './PongCanvas';
import { PongGamesList } from './PongGamesList';
import { PongSpectator } from './PongSpectator';
import { PongHeader } from './PongHeader';
import { PongMatchCreatorModal } from './PongMatchCreatorModal';
import { PONG_PHYSICS } from '@ems/types';

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

  // Local state for spectator mode and match creation modal
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { inputState, setSendInput } = usePongInput();

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

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

  const handleCreateMatch = (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => {
    createMatch(wager, type, aiDifficulty);
    setShowCreateModal(false); // Close modal after creating match
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
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
            onCreateMatch={handleOpenCreateModal}
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
            />
          </div>
        )}

        {/* Match Creation Modal */}
        <PongMatchCreatorModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateMatch={handleCreateMatch}
        />

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
