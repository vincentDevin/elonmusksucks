import { PONG_PAYOUT_CONSTANTS } from '@ems/types';
import type { AIDifficulty } from '@ems/types';
import { formatMuskBucks } from '../../utils/formatting';
import PongTierBadge from './PongTierBadge';

interface PongHeaderProps {
  mode: 'lobby' | 'game' | 'spectator';

  // Connection & lobby props (from PongLobbyHeader)
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  stats: {
    playersOnline: number;
    activeGames: number;
    availableMatches: number;
  };
  onConnect: () => void;
  userElo?: number;
  userTier?: string;

  // Game-specific props (from PongGame header)
  currentGame?: any; // GameState type
  lastPing?: number;
  onBackToLobby?: () => void;
  spectatingGameId?: string | null;
}

export function PongHeader({
  mode,
  isConnected,
  isAuthenticated,
  connectionError,
  stats,
  onConnect,
  userElo,
  userTier,
  currentGame,
  lastPing = 0,
  onBackToLobby,
  spectatingGameId,
}: PongHeaderProps) {
  // Connection status indicator
  const getStatusIndicator = () => {
    if (!isConnected) {
      return {
        icon: '🔴',
        text: 'Disconnected',
        color: 'text-error',
        bgColor: 'bg-error/10',
      };
    }
    if (!isAuthenticated) {
      return {
        icon: '🟡',
        text: 'Connecting...',
        color: 'text-warning',
        bgColor: 'bg-warning/10',
      };
    }
    return {
      icon: '🟢',
      text: 'Connected',
      color: 'text-success',
      bgColor: 'bg-success/10',
    };
  };

  const status = getStatusIndicator();

  return (
    <div className="space-y-6">
      {/* Page Title - Always shown */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-3xl font-bold text-content">🏓 Elon Musk Sucks Pong</h1>
        <p className="text-secondary text-sm">
          {mode === 'lobby' && 'Real-time multiplayer Pong with MuskBucks wagering'}
          {mode === 'game' && 'Game in progress - may the best player win!'}
          {mode === 'spectator' && `Spectating Game ${spectatingGameId?.slice(-8)}`}
        </p>
      </div>

      {/* Mode-specific Headers */}
      {mode === 'lobby' ? (
        /* Lobby Header */
        <div className="bg-surface border border-muted rounded-xl p-4">
          <div className="flex items-center justify-between">
            {/* Connection Status */}
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
              <span className="text-lg">{status.icon}</span>
              <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
              {!isConnected && connectionError && (
                <span className="text-xs text-error ml-2" title={connectionError}>
                  ⚠️
                </span>
              )}
            </div>

            {/* Compact Stats */}
            <div className="flex items-center space-x-6 text-sm">
              <div className="flex items-center space-x-2">
                {isConnected && isAuthenticated ? (
                  <span className="text-accent font-bold">{stats.availableMatches}</span>
                ) : (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-accent"></div>
                )}
                <span className="text-tertiary">Matches</span>
              </div>
              <div className="flex items-center space-x-2">
                {isConnected && isAuthenticated ? (
                  <span className="text-success font-bold">{stats.activeGames}</span>
                ) : (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-success"></div>
                )}
                <span className="text-tertiary">Active</span>
              </div>
              <div className="flex items-center space-x-2">
                {isConnected && isAuthenticated ? (
                  <span className="text-warning font-bold">{stats.playersOnline}</span>
                ) : (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-warning"></div>
                )}
                <span className="text-tertiary">Players</span>
              </div>
            </div>

            {/* Action Buttons / Elo Display */}
            <div className="flex items-center space-x-2">
              {isConnected && isAuthenticated ? (
                <>
                  {userElo !== undefined && userTier && (
                    <div className="flex items-center space-x-3 px-4 py-2 bg-surface border border-border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">🏆</span>
                        <div className="flex flex-col">
                          <span className="text-xs text-tertiary">Your Elo</span>
                          <span className="text-sm font-bold text-content">
                            {userElo.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="border-l border-border pl-3">
                        <PongTierBadge tier={userTier} size="sm" />
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button
                  onClick={onConnect}
                  className="px-3 py-2 bg-error/10 text-error rounded-lg hover:bg-error/20 transition-colors text-sm font-medium cursor-pointer"
                  title="Connect to game server"
                >
                  🚀 Connect
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Game/Spectator Header */
        <div className="flex items-center justify-between p-4 bg-surface border border-muted rounded-lg">
          <div className="flex items-center space-x-6">
            <div>
              <h2 className="text-xl font-semibold">
                {mode === 'spectator' ? (
                  // Spectator mode - both players white
                  <span className="text-content">
                    Spectating: {currentGame?.players[0]?.name || 'Player 1'} vs{' '}
                    {currentGame?.players[1]?.name || 'Player 2'}
                  </span>
                ) : (
                  // Player mode - user green, opponent red
                  <span>
                    <span className={currentGame?.playerSlot === 0 ? 'text-success' : 'text-error'}>
                      {currentGame?.players[0]?.name}
                    </span>
                    <span className="text-content"> vs </span>
                    <span className={currentGame?.playerSlot === 1 ? 'text-success' : 'text-error'}>
                      {currentGame?.players[1]?.name || 'AI'}
                    </span>
                  </span>
                )}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-tertiary">
                <span>Game: {currentGame?.gameId?.slice(-8)}</span>
                {mode === 'spectator' && <span>👁️ Spectator Mode</span>}
              </div>
            </div>
            <div className="text-center">
              {/* Score Display */}
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-accent">
                  {currentGame?.scores[0] || 0}
                </span>
                <span className="text-tertiary">-</span>
                <span className="text-2xl font-bold text-accent">
                  {currentGame?.scores[1] || 0}
                </span>
              </div>
              {/* Wager/Pot Display */}
              {currentGame?.wager !== undefined &&
                (() => {
                  let potValue: number;

                  if (currentGame.pot) {
                    // Use explicit pot if provided
                    potValue = currentGame.pot;
                  } else if (currentGame.isAI && currentGame.aiDifficulty) {
                    // AI match: wager + (wager * multiplier)
                    const multiplier =
                      PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER[
                        currentGame.aiDifficulty.toUpperCase() as AIDifficulty
                      ];
                    potValue = currentGame.wager + currentGame.wager * multiplier;
                  } else {
                    // PVP match: wager * 2
                    potValue = currentGame.wager * 2;
                  }

                  return (
                    <div className="mt-1 text-sm text-warning">
                      💰 Pot: {formatMuskBucks(potValue)}
                    </div>
                  );
                })()}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Ping indicator */}
            {lastPing > 0 && (
              <div
                className={`text-sm ${
                  lastPing < 50 ? 'text-success' : lastPing < 100 ? 'text-warning' : 'text-error'
                }`}
              >
                {lastPing}ms
              </div>
            )}

            {/* Status indicator */}
            <div
              className={`px-3 py-1 rounded text-sm font-medium ${
                currentGame?.status === 'active'
                  ? 'bg-success/20 text-success'
                  : currentGame?.status === 'countdown'
                    ? 'bg-warning/20 text-warning'
                    : currentGame?.status === 'ended'
                      ? 'bg-info/20 text-info'
                      : currentGame?.status === 'waiting_for_opponent'
                        ? 'bg-secondary/20 text-secondary'
                        : currentGame?.status === 'waiting_for_ready'
                          ? 'bg-accent/20 text-accent'
                          : 'bg-muted/20 text-tertiary'
              }`}
            >
              {currentGame?.status === 'waiting_for_opponent'
                ? 'WAITING FOR OPPONENT'
                : currentGame?.status === 'waiting_for_ready'
                  ? 'WAITING FOR READY'
                  : (currentGame?.status || 'waiting').toUpperCase()}
            </div>

            {onBackToLobby && (
              <button
                onClick={onBackToLobby}
                className="px-4 py-2 bg-muted text-content rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
              >
                Back to Lobby
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
