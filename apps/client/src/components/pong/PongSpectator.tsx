import React from 'react';
import { usePongSpectator } from '../../hooks/usePongSpectator';
import { PongCanvas } from './PongCanvas';
import { PongHeader } from './PongHeader';

// Convert spectator state to the format expected by PongCanvasEnhanced
interface SpectatorCanvasProps {
  gameId: string;
  onBackToLobby: () => void;
}

export function PongSpectator({ gameId, onBackToLobby }: SpectatorCanvasProps) {
  const {
    isConnected,
    isAuthenticated,
    gameState,
    connectionError,
    shouldReturnToLobby,
    spectateGame,
    leaveSpectating,
  } = usePongSpectator();

  const hasInitiatedRef = React.useRef(false);

  // Auto-spectate when component mounts - only once per gameId
  React.useEffect(() => {
    if (gameId && !hasInitiatedRef.current) {
      console.log('👁️ PongSpectator mounting for game:', gameId);
      hasInitiatedRef.current = true;
      spectateGame(gameId);
    }

    // Cleanup function
    return () => {
      console.log('👁️ PongSpectator unmounting');
      hasInitiatedRef.current = false;
    };
  }, [gameId, spectateGame]);

  // Watch for return to lobby signal
  React.useEffect(() => {
    if (shouldReturnToLobby) {
      console.log('👁️ Spectator hook signaled return to lobby');
      handleBackToLobby();
    }
  }, [shouldReturnToLobby]);

  const handleBackToLobby = () => {
    console.log('👁️ PongSpectator handleBackToLobby called');
    hasInitiatedRef.current = false; // Prevent re-initialization
    leaveSpectating();
    onBackToLobby();
  };

  if (connectionError) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="bg-surface border border-error rounded-lg p-6 text-center">
          <h2 className="text-xl font-bold text-error mb-2">Connection Error</h2>
          <p className="text-error mb-4">{connectionError}</p>
          <button
            onClick={handleBackToLobby}
            className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-muted/80 cursor-pointer"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    );
  }

  if (!isConnected || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="bg-surface border border-muted rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-secondary">Connecting to spectate game...</p>
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="bg-surface border border-muted rounded-lg p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-secondary">Joining game as spectator...</p>
        </div>
      </div>
    );
  }

  // Convert spectator game state to canvas format
  const canvasGameState = {
    gameId: gameState.gameId,
    playerSlot: 0 as const, // Not used for spectators
    players: [
      gameState.player1
        ? {
            id: gameState.player1.id,
            name: gameState.player1.name,
            paddleY: gameState.player1.paddleY,
            score: gameState.player1.score,
            ping: 0,
            lastInputTime: Date.now(),
          }
        : null,
      gameState.player2
        ? {
            id: gameState.player2.id,
            name: gameState.player2.name,
            paddleY: gameState.player2.paddleY,
            score: gameState.player2.score,
            ping: 0,
            lastInputTime: Date.now(),
          }
        : null,
    ] as [any, any],
    ball: gameState.ball,
    scores: gameState.scores,
    status: gameState.status,
    tick: gameState.tick,
    timestamp: gameState.timestamp,
    countdown: gameState.countdown,
    winner: gameState.winner,
    readyStates: gameState.readyStates,
    wager: gameState.wager,
    pot: gameState.pot,
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Shared Header Component */}
        <PongHeader
          mode="spectator"
          isConnected={isConnected}
          isAuthenticated={isAuthenticated}
          connectionError={connectionError}
          stats={{
            playersOnline: 0,
            activeGames: 0,
            availableMatches: 0,
          }}
          onConnect={() => {}} // Not used in spectator mode
          currentGame={canvasGameState}
          lastPing={0}
          onBackToLobby={handleBackToLobby}
          spectatingGameId={gameId}
        />

        {/* Game Canvas */}
        <div className="flex justify-center mb-6">
          <PongCanvas
            gameState={canvasGameState}
            ping={0}
            onSetReady={undefined} // No ready button for spectators
            isSpectating={true}
            className="max-w-4xl w-full"
          />
        </div>

        {/* Spectator Info */}
        <div className="p-4 bg-surface border border-muted rounded-lg">
          <h3 className="font-semibold text-content mb-2">Spectator Mode</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-secondary">
            <div>
              <strong>Watch Only:</strong> You're viewing this game in real-time
            </div>
            <div>
              <strong>No Input:</strong> Spectators cannot control paddles
            </div>
          </div>
        </div>

        {/* Game Stats */}
        {gameState.status === 'active' && (
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-3 bg-surface border border-muted rounded-lg text-center">
              <div className="text-lg font-bold text-accent">{gameState.tick}</div>
              <div className="text-xs text-tertiary">Game Tick</div>
            </div>
            <div className="p-3 bg-surface border border-muted rounded-lg text-center">
              <div className="text-lg font-bold text-warning">
                {Math.round(Math.sqrt(gameState.ball.vx ** 2 + gameState.ball.vy ** 2))}
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
    </div>
  );
}
