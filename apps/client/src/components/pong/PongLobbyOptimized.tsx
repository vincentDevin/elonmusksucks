import { useState } from 'react';
import type { LobbyEntry } from '@ems/types';

interface PongLobbyOptimizedProps {
  lobbies: LobbyEntry[];
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  onConnect: () => void;
  onJoinLobby: () => void;
  onCreateMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
  onJoinMatch: (matchId: string) => void;
}

export function PongLobbyOptimized({
  lobbies,
  isConnected,
  isAuthenticated,
  connectionError,
  onConnect,
  onJoinLobby,
  onCreateMatch,
  onJoinMatch,
}: PongLobbyOptimizedProps) {
  const [wager, setWager] = useState(0);
  const [matchType, setMatchType] = useState<'ai' | 'pvp'>('ai');
  const [aiDifficulty, setAiDifficulty] = useState('medium');

  // Connection status display
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-xl font-semibold text-content">Not Connected</div>
        {connectionError && <div className="text-error text-center">{connectionError}</div>}
        <button
          onClick={onConnect}
          className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
        >
          Connect to Pong Server
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-4">
        <div className="text-xl font-semibold text-content">Authenticating...</div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
        {connectionError && <div className="text-error text-center">{connectionError}</div>}
      </div>
    );
  }

  const handleCreateMatch = () => {
    if (matchType === 'ai') {
      onCreateMatch(wager, 'ai', aiDifficulty);
    } else {
      onCreateMatch(wager, 'pvp');
      onJoinLobby(); // Join lobby to see match appear
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <div className="flex items-center justify-between p-4 bg-surface border border-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-success rounded-full animate-pulse"></div>
          <span className="text-content">Connected to Pong Server</span>
        </div>
        <button
          onClick={onJoinLobby}
          className="px-4 py-2 text-sm bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
        >
          Refresh Lobbies
        </button>
      </div>

      {/* Create Match Section */}
      <div className="p-6 bg-surface border border-muted rounded-lg">
        <h2 className="text-xl font-semibold text-content mb-4">Create New Match</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Wager Amount */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">
              Wager Amount (MuskBucks) - 0 for Free Play
            </label>
            <input
              type="number"
              value={wager}
              onChange={(e) => setWager(Math.max(0, parseInt(e.target.value) || 0))}
              min="0"
              max="10000"
              step="10"
              placeholder="0"
              className="w-full px-3 py-2 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          {/* Match Type */}
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">Match Type</label>
            <select
              value={matchType}
              onChange={(e) => setMatchType(e.target.value as 'ai' | 'pvp')}
              className="w-full px-3 py-2 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="ai">vs AI</option>
              <option value="pvp">vs Player</option>
            </select>
          </div>
        </div>

        {/* AI Difficulty (only show for AI matches) */}
        {matchType === 'ai' && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-secondary mb-2">AI Difficulty</label>
            <select
              value={aiDifficulty}
              onChange={(e) => setAiDifficulty(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-accent focus:border-accent"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
              <option value="impossible">Impossible</option>
            </select>
          </div>
        )}

        <button
          onClick={handleCreateMatch}
          className="w-full px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors font-medium"
        >
          {matchType === 'ai' ? 'Start AI Match' : 'Create PvP Match'}
        </button>
      </div>

      {/* Available Matches */}
      <div className="p-6 bg-surface border border-muted rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-content">Available Matches</h2>
          <span className="text-sm text-tertiary">
            {lobbies.length} match{lobbies.length !== 1 ? 'es' : ''} waiting
          </span>
        </div>

        {lobbies.length === 0 ? (
          <div className="text-center py-8 text-tertiary">
            <div className="text-4xl mb-2">🏓</div>
            <div className="text-lg mb-2">No matches available</div>
            <div className="text-sm">Create a match to get started!</div>
          </div>
        ) : (
          <div className="space-y-3">
            {lobbies.map((lobby) => (
              <div
                key={lobby.id}
                className="flex items-center justify-between p-4 bg-background border border-muted rounded-lg hover:border-accent/50 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium text-content">{lobby.creatorName}</span>
                    <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded">
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
                  <div className="text-sm text-secondary">
                    Wager: {lobby.wager === 0 ? 'Free Play' : `${lobby.wager} MuskBucks`} • Created{' '}
                    {formatTimeAgo(lobby.createdAt)}
                  </div>
                </div>

                <button
                  onClick={() => onJoinMatch(lobby.id)}
                  disabled={lobby.status !== 'waiting'}
                  className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Join Match
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-surface border border-muted rounded-lg text-center">
          <div className="text-2xl font-bold text-accent">{lobbies.length}</div>
          <div className="text-sm text-tertiary">Available Matches</div>
        </div>
        <div className="p-4 bg-surface border border-muted rounded-lg text-center">
          <div className="text-2xl font-bold text-success">0</div>
          <div className="text-sm text-tertiary">Active Games</div>
        </div>
        <div className="p-4 bg-surface border border-muted rounded-lg text-center">
          <div className="text-2xl font-bold text-warning">0</div>
          <div className="text-sm text-tertiary">Players Online</div>
        </div>
      </div>
    </div>
  );
}
