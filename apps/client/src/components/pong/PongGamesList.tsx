import type { LobbyEntry, ActiveGameEntry } from '@ems/types';

interface PongGamesListProps {
  lobbies: LobbyEntry[];
  activeGames: ActiveGameEntry[];
  onJoinMatch: (matchId: string) => void;
  onSpectateGame: (gameId: string) => void;
  onPlayAI: () => void;
  onChallengePlayers: () => void;
  onQuickMatch: () => void;
}

export function PongGamesList({
  lobbies,
  activeGames,
  onJoinMatch,
  onSpectateGame,
  onPlayAI,
  onChallengePlayers,
  onQuickMatch,
}: PongGamesListProps) {
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
      case 'waiting':
        return { text: 'WAITING', color: 'text-success', bg: 'bg-success/20', icon: '⏳' };
      default:
        return {
          text: status.toUpperCase(),
          color: 'text-tertiary',
          bg: 'bg-muted/20',
          icon: '🎮',
        };
    }
  };

  const hasAvailableMatches = lobbies.length > 0;
  const hasActiveGames = activeGames.length > 0;

  if (!hasAvailableMatches && !hasActiveGames) {
    return (
      <div className="bg-surface border border-muted rounded-xl p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-50">🏓</div>
          <div className="text-xl font-semibold text-content">No Games Available</div>
          <div className="text-secondary">
            Be the first to create a match! Use the buttons below to get started.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <button
              onClick={onPlayAI}
              className="p-3 bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/20 hover:border-accent/30 transition-all cursor-pointer hover:shadow-lg"
            >
              <div className="font-medium text-accent">🤖 Play AI</div>
              <div className="text-tertiary">Practice your skills</div>
            </button>
            <button
              onClick={onChallengePlayers}
              className="p-3 bg-warning/10 border border-warning/20 rounded-lg hover:bg-warning/20 hover:border-warning/30 transition-all cursor-pointer hover:shadow-lg"
            >
              <div className="font-medium text-warning">👤 Challenge Players</div>
              <div className="text-tertiary">Create PVP lobby</div>
            </button>
            <button
              onClick={onQuickMatch}
              className="p-3 bg-info/10 border border-info/20 rounded-lg hover:bg-info/20 hover:border-info/30 transition-all cursor-pointer hover:shadow-lg"
            >
              <div className="font-medium text-info">🎯 Quick Match</div>
              <div className="text-tertiary">Join any available</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons - Always visible when games exist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={onPlayAI}
          className="p-4 bg-accent/10 border-2 border-accent/20 rounded-lg hover:bg-accent/20 hover:border-accent/30 transition-all cursor-pointer hover:shadow-lg hover:scale-105"
        >
          <div className="font-semibold text-accent text-lg">🤖 Play AI</div>
          <div className="text-tertiary text-sm">Practice your skills</div>
        </button>
        <button
          onClick={onChallengePlayers}
          className="p-4 bg-warning/10 border-2 border-warning/20 rounded-lg hover:bg-warning/20 hover:border-warning/30 transition-all cursor-pointer hover:shadow-lg hover:scale-105"
        >
          <div className="font-semibold text-warning text-lg">👤 Challenge Players</div>
          <div className="text-tertiary text-sm">Create PVP lobby</div>
        </button>
        <button
          onClick={onQuickMatch}
          className="p-4 bg-info/10 border-2 border-info/20 rounded-lg hover:bg-info/20 hover:border-info/30 transition-all cursor-pointer hover:shadow-lg hover:scale-105"
        >
          <div className="font-semibold text-info text-lg">🎯 Quick Match</div>
          <div className="text-tertiary text-sm">Join any available</div>
        </button>
      </div>

      {/* Available Matches Section */}
      {hasAvailableMatches && (
        <div className="bg-surface border border-muted rounded-xl overflow-hidden">
          {/* Available Matches Header */}
          <div className="flex items-center justify-between p-4 border-b border-muted bg-muted/20">
            <div className="flex items-center space-x-3">
              <div className="text-xl">🎮</div>
              <div>
                <h3 className="text-lg font-semibold text-content">Available Matches</h3>
                <p className="text-sm text-secondary">Join any match to start playing</p>
              </div>
            </div>
            <div className="text-sm text-tertiary">
              {lobbies.length} match{lobbies.length !== 1 ? 'es' : ''} waiting
            </div>
          </div>

          {/* Available Matches List */}
          <div className="divide-y divide-muted">
            {lobbies.map((lobby) => {
              const wagerInfo = getWagerDisplay(lobby.wager);
              const statusInfo = getStatusDisplay(lobby.status);
              const isRecentlyCreated = Date.now() - lobby.createdAt < 30000; // 30 seconds

              return (
                <div
                  key={lobby.id}
                  className={`p-4 hover:bg-accent/5 transition-all duration-200 group ${
                    isRecentlyCreated ? 'bg-accent/5 border-l-4 border-l-accent' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {/* Match Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center space-x-3">
                        {/* Player Avatar/Icon */}
                        <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                          <span className="text-lg font-semibold text-accent">
                            {lobby.creatorName[0].toUpperCase()}
                          </span>
                        </div>

                        {/* Player Name & Match Type */}
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-content">{lobby.creatorName}</span>
                            {isRecentlyCreated && (
                              <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded-full animate-pulse">
                                NEW
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-sm">
                            <span className="px-2 py-1 text-xs bg-info/20 text-info rounded">
                              {lobby.type.toUpperCase()}
                            </span>
                            <div
                              className={`px-2 py-1 text-xs rounded ${statusInfo.bg} ${statusInfo.color} flex items-center space-x-1`}
                            >
                              <span>{statusInfo.icon}</span>
                              <span>{statusInfo.text}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="flex items-center space-x-4 text-sm text-secondary ml-13">
                        <div className="flex items-center space-x-1">
                          <span>💰</span>
                          <span className={`font-medium ${wagerInfo.color}`}>{wagerInfo.text}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>⏰</span>
                          <span>Created {formatTimeAgo(lobby.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Join Button */}
                    <div className="flex items-center space-x-3">
                      {/* Wager Badge */}
                      <div
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${wagerInfo.bg} ${wagerInfo.color}`}
                      >
                        {wagerInfo.text}
                      </div>

                      {/* Join Button */}
                      <button
                        onClick={() => onJoinMatch(lobby.id)}
                        disabled={lobby.status !== 'waiting'}
                        className={`px-6 py-3 rounded-lg font-semibold transition-all transform ${
                          lobby.status === 'waiting'
                            ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-105 group-hover:scale-110 cursor-pointer'
                            : 'bg-muted/20 text-tertiary cursor-not-allowed'
                        }`}
                      >
                        {lobby.status === 'waiting' ? '⚡ Join Match' : '🔒 Full'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Available Matches Footer */}
          <div className="p-4 bg-muted/10 border-t border-muted">
            <div className="flex items-center space-x-2 text-sm text-secondary">
              <span>💡</span>
              <span>
                <strong>Pro tip:</strong> Free matches are perfect for warming up before high-stakes
                games!
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Active Games Section */}
      {hasActiveGames && (
        <div className="bg-surface border border-muted rounded-xl overflow-hidden">
          {/* Active Games Header */}
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

          {/* Active Games List */}
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
                          <span className={`font-medium ${wagerInfo.color}`}>
                            Pot: {game.pot} MB
                          </span>
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
                            ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-105 group-hover:scale-110 cursor-pointer'
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
                      <span className="font-medium text-accent">🤖 AI Match:</span> Watch how
                      players handle different AI difficulties
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Games Footer */}
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
      )}
    </div>
  );
}
