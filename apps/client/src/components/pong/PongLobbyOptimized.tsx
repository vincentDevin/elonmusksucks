import { useEffect } from 'react';
import type { LobbyEntry, ActiveGameEntry } from '@ems/types';
import { PongLobbyHeader } from './PongLobbyHeader';
import { PongMatchCreator } from './PongMatchCreator';
import { PongGamesList } from './PongGamesList';

interface PongLobbyOptimizedProps {
  lobbies: LobbyEntry[];
  activeGames: ActiveGameEntry[];
  isConnected: boolean;
  isAuthenticated: boolean;
  connectionError: string | null;
  stats: {
    playersOnline: number;
    activeGames: number;
    availableMatches: number;
  };
  onConnect: () => void;
  onJoinLobby: () => void;
  onCreateMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
  onJoinMatch: (matchId: string) => void;
  onSpectateGame: (gameId: string) => void;
}

export function PongLobbyOptimized({
  lobbies,
  activeGames,
  isConnected,
  isAuthenticated,
  connectionError,
  stats,
  onConnect,
  onJoinLobby,
  onCreateMatch,
  onJoinMatch,
  onSpectateGame,
}: PongLobbyOptimizedProps) {
  // Auto-refresh lobby every 15 seconds when connected and authenticated
  useEffect(() => {
    if (!isConnected || !isAuthenticated) return;

    // Initial lobby join when component becomes active
    onJoinLobby();

    // Set up periodic refresh
    const refreshInterval = setInterval(() => {
      onJoinLobby();
    }, 15000); // Refresh every 15 seconds

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isConnected, isAuthenticated, onJoinLobby]);

  const handleCreateMatch = (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => {
    if (type === 'ai') {
      onCreateMatch(wager, 'ai', aiDifficulty);
    } else {
      // For PvP, ensure we're in lobby room BEFORE creating match
      onJoinLobby(); // Join lobby first to see match appear
      // Small delay to ensure lobby join completes before creating match
      setTimeout(() => {
        onCreateMatch(wager, 'pvp');
      }, 100);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Status & Stats */}
      <PongLobbyHeader
        isConnected={isConnected}
        isAuthenticated={isAuthenticated}
        connectionError={connectionError}
        availableMatches={lobbies.length}
        stats={stats}
        onConnect={onConnect}
        onRefresh={onJoinLobby}
      />

      {/* Match Creation */}
      <PongMatchCreator onCreateMatch={handleCreateMatch} />

      {/* Unified Games List (Available Matches + Active Games) */}
      <PongGamesList
        lobbies={lobbies}
        activeGames={activeGames}
        onJoinMatch={onJoinMatch}
        onSpectateGame={onSpectateGame}
      />
    </div>
  );
}
