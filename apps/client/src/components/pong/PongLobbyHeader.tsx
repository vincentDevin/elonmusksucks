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

  if (!isConnected) {
    return (
      <div className="bg-surface border border-muted rounded-xl p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl">🏓</div>
          <div className="text-2xl font-bold text-content">Pong Arena</div>
          <div className="text-lg text-secondary">Ready to play some Pong?</div>
          {connectionError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {connectionError}
            </div>
          )}
          <button
            onClick={onConnect}
            className="px-8 py-4 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-all transform hover:scale-105 font-semibold text-lg cursor-pointer"
          >
            🚀 Connect to Game Server
          </button>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-surface border border-muted rounded-xl p-8">
        <div className="text-center space-y-4">
          <div className="text-4xl">🔐</div>
          <div className="text-xl font-semibold text-content">Authenticating...</div>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
          {connectionError && (
            <div className="p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
              {connectionError}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-muted rounded-xl p-4">
      {/* Single Compact Row */}
      <div className="flex items-center justify-between">
        {/* Connection Status */}
        <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${status.bgColor}`}>
          <span className="text-lg">{status.icon}</span>
          <span className={`text-sm font-medium ${status.color}`}>{status.text}</span>
        </div>

        {/* Compact Stats */}
        <div className="flex items-center space-x-6 text-sm">
          <div className="flex items-center space-x-2">
            <span className="text-accent font-bold">{availableMatches}</span>
            <span className="text-tertiary">Matches</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-success font-bold">{stats.activeGames}</span>
            <span className="text-tertiary">Active</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-warning font-bold">{stats.playersOnline}</span>
            <span className="text-tertiary">Players</span>
          </div>
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          className="px-3 py-2 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors text-sm font-medium cursor-pointer"
          title="Refresh lobby data"
        >
          🔄 Refresh
        </button>
      </div>
    </div>
  );
}
