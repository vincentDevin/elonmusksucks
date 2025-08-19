interface PongLobbyHeaderProps {
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  availableMatches: number;
  stats: {
    playersOnline: number;
    activeGames: number;
    availableMatches: number;
  };
  onConnect: () => void;
  onRefresh: () => void;
}

export function PongLobbyHeader({
  isConnected,
  isAuthenticated,
  connectionError,
  availableMatches,
  stats,
  onConnect,
  onRefresh,
}: PongLobbyHeaderProps) {
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
    <div className="bg-surface border border-muted rounded-xl p-4">
      {/* Single Compact Row */}
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
              <span className="text-accent font-bold">{availableMatches}</span>
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

        {/* Refresh/Connect Button */}
        {isConnected && isAuthenticated ? (
          <button
            onClick={onRefresh}
            className="px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium cursor-pointer"
            title="Refresh lobby data"
          >
            🔄 Refresh
          </button>
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
  );
}
