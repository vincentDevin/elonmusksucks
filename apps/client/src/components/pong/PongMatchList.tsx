import type { LobbyEntry } from '@ems/types';

interface PongMatchListProps {
  lobbies: LobbyEntry[];
  onJoinMatch: (matchId: string) => void;
}

export function PongMatchList({ lobbies, onJoinMatch }: PongMatchListProps) {
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

  if (lobbies.length === 0) {
    return (
      <div className="bg-surface border border-muted rounded-xl p-8">
        <div className="text-center space-y-4">
          <div className="text-6xl opacity-50">🏓</div>
          <div className="text-xl font-semibold text-content">No Active Matches</div>
          <div className="text-secondary">
            Be the first to create a match! Use the buttons above to get started.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
            <div className="p-3 bg-accent/10 border border-accent/20 rounded-lg">
              <div className="font-medium text-accent">🤖 Play AI</div>
              <div className="text-tertiary">Practice your skills</div>
            </div>
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <div className="font-medium text-warning">👤 Challenge Players</div>
              <div className="text-tertiary">Create PVP lobby</div>
            </div>
            <div className="p-3 bg-info/10 border border-info/20 rounded-lg">
              <div className="font-medium text-info">🎯 Quick Match</div>
              <div className="text-tertiary">Join any available</div>
            </div>
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

      {/* Match List */}
      <div className="divide-y divide-muted">
        {lobbies.map((lobby, index) => {
          const wagerInfo = getWagerDisplay(lobby.wager);
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
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            lobby.status === 'waiting'
                              ? 'bg-success/20 text-success'
                              : 'bg-muted/20 text-tertiary'
                          }`}
                        >
                          {lobby.status.toUpperCase()}
                        </span>
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
                        ? 'bg-accent text-accent-foreground hover:bg-accent/90 hover:scale-105 group-hover:scale-110'
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

      {/* Footer Tip */}
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
  );
}
