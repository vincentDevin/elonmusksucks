import type { ActiveGameEntry } from '@ems/types';

interface PongActiveGamesListProps {
  activeGames: ActiveGameEntry[];
  onSpectateGame: (gameId: string) => void;
}

export function PongActiveGamesList({ activeGames, onSpectateGame }: PongActiveGamesListProps) {
  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const getWagerDisplay = (wager: number) => {
    if (wager === 0) return { text: 'Free Play', color: 'text-success', bg: 'bg-success/10' };
    if (wager < 100) return { text: `${wager} MB`, color: 'text-info', bg: 'bg-info/10' };
    if (wager < 1000) return { text: `${wager} MB`, color: 'text-warning', bg: 'bg-warning/10' };
    return { text: `${wager} MB`, color: 'text-error', bg: 'bg-error/10' };
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'active':
        return { text: 'LIVE', color: 'text-error', bg: 'bg-error/20', icon: '🔴' };
      case 'countdown':
        return { text: 'STARTING', color: 'text-warning', bg: 'bg-warning/20', icon: '⏰' };
      case 'waiting_for_ready':
        return { text: 'READY UP', color: 'text-accent', bg: 'bg-accent/20', icon: '⚡' };
      default:
        return {
          text: status.toUpperCase(),
          color: 'text-tertiary',
          bg: 'bg-muted/20',
          icon: '🎮',
        };
    }
  };

  if (activeGames.length === 0) {
    return (
      <div className="bg-surface border border-muted rounded-xl p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-50">👁️</div>
          <div className="text-xl font-semibold text-content">No Active Games</div>
          <div className="text-secondary">
            Check back soon or create your own match to get the action started!
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-muted rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-muted bg-muted/20">
        <div className="flex items-center space-x-3">
          <div className="text-xl">👁️</div>
          <div>
            <h3 className="text-lg font-semibold text-content">Live Games</h3>
            <p className="text-sm text-secondary">Spectate ongoing matches</p>
          </div>
        </div>
        <div className="text-sm text-tertiary">
          {activeGames.length} game{activeGames.length !== 1 ? 's' : ''} active
        </div>
      </div>

      {/* Games List */}
      <div className="divide-y divide-muted">
        {activeGames.map((game) => {
          const wagerInfo = getWagerDisplay(game.wager);
          const statusInfo = getStatusDisplay(game.status);
          const isLive = game.status === 'active';

          return (
            <div
              key={game.id}
              className={`p-4 hover:bg-accent/5 transition-all duration-200 group ${
                isLive ? 'bg-error/5 border-l-4 border-l-error' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Game Info */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center space-x-3">
                    {/* VS Display */}
                    <div className="flex items-center space-x-2">
                      <div className="font-semibold text-content">{game.player1Name}</div>
                      <span className="text-tertiary text-sm">vs</span>
                      <div className="font-semibold text-content">
                        {game.player2Name || 'AI'}
                        {game.type === 'ai' && <span className="text-accent ml-1">🤖</span>}
                      </div>
                    </div>

                    {/* Live indicator */}
                    {isLive && (
                      <span className="px-2 py-1 text-xs bg-error/20 text-error rounded-full animate-pulse flex items-center space-x-1">
                        <span className="w-2 h-2 bg-error rounded-full animate-ping"></span>
                        <span>LIVE</span>
                      </span>
                    )}
                  </div>

                  {/* Game Details */}
                  <div className="flex items-center space-x-4 text-sm text-secondary">
                    <div className="flex items-center space-x-1">
                      <span>🏆</span>
                      <span>
                        {game.scores[0]} - {game.scores[1]}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>💰</span>
                      <span className={`font-medium ${wagerInfo.color}`}>Pot: {game.pot} MB</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>👁️</span>
                      <span>{game.spectatorCount} watching</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>⏰</span>
                      <span>Started {formatTimeAgo(game.startedAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex items-center space-x-3">
                  {/* Status Badge */}
                  <div
                    className={`px-3 py-2 rounded-lg text-sm font-medium ${statusInfo.bg} ${statusInfo.color} flex items-center space-x-2`}
                  >
                    <span>{statusInfo.icon}</span>
                    <span>{statusInfo.text}</span>
                  </div>

                  {/* Spectate Button */}
                  <button
                    onClick={() => onSpectateGame(game.id)}
                    disabled={!game.canSpectate}
                    className={`px-6 py-3 rounded-lg font-semibold transition-all transform ${
                      game.canSpectate
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-105 group-hover:scale-110'
                        : 'bg-muted/20 text-tertiary cursor-not-allowed'
                    }`}
                  >
                    {game.canSpectate ? '👁️ Watch' : '🚫 Ended'}
                  </button>
                </div>
              </div>

              {/* Additional info for AI games */}
              {game.type === 'ai' && (
                <div className="mt-2 text-xs text-tertiary bg-accent/10 px-3 py-2 rounded border-l-2 border-accent/30">
                  <span className="font-medium text-accent">🤖 AI Match:</span> Watch how players
                  handle different AI difficulties
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Tip */}
      <div className="p-4 bg-muted/10 border-t border-muted">
        <div className="flex items-center space-x-2 text-sm text-secondary">
          <span>💡</span>
          <span>
            <strong>Spectator mode:</strong> Watch live games to learn strategies and see epic
            matches unfold!
          </span>
        </div>
      </div>
    </div>
  );
}
