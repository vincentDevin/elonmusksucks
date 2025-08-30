import { useEffect, useState } from 'react';
import { usePongSocket } from '../../hooks/usePongSocket';
import { usePongInput } from '../../hooks/usePongInput';
import { PongCanvas } from './PongCanvas';
import { PongLobby } from './PongLobby';
import { PongSpectator } from './PongSpectator';
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

  // Local state for spectator mode
  const [spectatingGameId, setSpectatingGameId] = useState<string | null>(null);

  const { inputState, setSendInput, isInputActive } = usePongInput();

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

  const handleCreateMatch = (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => {
    createMatch(wager, type, aiDifficulty);
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

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-content mb-2">🏓 Elon Musk Sucks Pong</h1>
          <p className="text-secondary">Real-time multiplayer Pong with MuskBucks wagering</p>
        </div>

        {/* Show spectator if spectating */}
        {spectatingGameId ? (
          <>
            {console.log('🏓 Rendering PongSpectator for gameId:', spectatingGameId)}
            <PongSpectator gameId={spectatingGameId} onBackToLobby={handleBackToLobby} />
          </>
        ) : currentGame ? (
          <div className="space-y-6">
            {/* Game Header */}
            <div className="flex items-center justify-between p-4 bg-surface border border-muted rounded-lg">
              <div className="flex items-center space-x-6">
                <div>
                  <h2 className="text-xl font-semibold text-content">
                    {currentGame.players[0]?.name} vs {currentGame.players[1]?.name || 'AI'}
                  </h2>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-tertiary">
                    <span>Game: {currentGame.gameId?.slice(-8)}</span>
                    <span>You: Player {(currentGame.playerSlot || 0) + 1}</span>
                  </div>
                </div>
                <div className="text-center">
                  {/* Score Display */}
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl font-bold text-accent">{currentGame.scores[0]}</span>
                    <span className="text-tertiary">-</span>
                    <span className="text-2xl font-bold text-accent">{currentGame.scores[1]}</span>
                  </div>
                  {/* Wager/Pot Display */}
                  {currentGame.wager !== undefined && (
                    <div className="mt-1 text-sm text-warning">
                      💰 Pot:{' '}
                      {currentGame.pot ||
                        (currentGame.players[1]?.name === 'AI'
                          ? currentGame.wager
                          : currentGame.wager * 2)}{' '}
                      MB
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {/* Input indicator */}
                {isInputActive && (
                  <div className="flex items-center space-x-2 text-success">
                    <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
                    <span className="text-sm">Input Active</span>
                  </div>
                )}
                {/* Ping indicator */}
                {lastPing > 0 && (
                  <div
                    className={`text-sm ${
                      lastPing < 50
                        ? 'text-success'
                        : lastPing < 100
                          ? 'text-warning'
                          : 'text-error'
                    }`}
                  >
                    {lastPing}ms
                  </div>
                )}
                {/* Status indicator */}
                <div
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    currentGame.status === 'active'
                      ? 'bg-success/20 text-success'
                      : currentGame.status === 'countdown'
                        ? 'bg-warning/20 text-warning'
                        : currentGame.status === 'ended'
                          ? 'bg-info/20 text-info'
                          : currentGame.status === 'waiting_for_opponent'
                            ? 'bg-secondary/20 text-secondary'
                            : currentGame.status === 'waiting_for_ready'
                              ? 'bg-accent/20 text-accent'
                              : 'bg-muted/20 text-tertiary'
                  }`}
                >
                  {currentGame.status === 'waiting_for_opponent'
                    ? 'WAITING FOR OPPONENT'
                    : currentGame.status === 'waiting_for_ready'
                      ? 'WAITING FOR READY'
                      : (currentGame.status || 'waiting').toUpperCase()}
                </div>

                <button
                  onClick={handleBackToLobby}
                  className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  Back to Lobby
                </button>
              </div>
            </div>

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
          <>
            {console.log('🏓 Rendering PongLobby')}
            <PongLobby
              lobbies={lobbies}
              activeGames={activeGames}
              isConnected={isConnected}
              isAuthenticated={isAuthenticated}
              connectionError={connectionError}
              stats={stats}
              onConnect={connect}
              onJoinLobby={joinLobby}
              onCreateMatch={handleCreateMatch}
              onJoinMatch={joinMatch}
              onSpectateGame={handleSpectateGame}
            />
          </>
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
