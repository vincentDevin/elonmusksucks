// apps/client/src/components/pong/PongLobbyScreen.tsx
// -----------------------------------------------------------------------------
// Main lobby screen container for PVP pong matches
// Integrates: WagerNegotiationPanel, GameRoomChat, LobbyEloPreview
// Handles: waiting for opponent, negotiation phase, disconnect states
// -----------------------------------------------------------------------------

import WagerNegotiationPanel from './WagerNegotiationPanel';
import GameRoomChat from './GameRoomChat';
import LobbyEloPreview from './LobbyEloPreview';
import OpponentDisconnectBanner from './OpponentDisconnectBanner';
import type { WagerNegotiation, GameChatMessage, Player } from '@ems/types';

interface PongLobbyScreenProps {
  gameId: string;
  playerSlot: 0 | 1;
  players: [Player, Player | null];
  status: 'waiting_for_opponent' | 'lobby_negotiation';
  wagerNegotiation: WagerNegotiation | null;
  chatMessages: GameChatMessage[];
  negotiationTimeRemaining: number | null;
  balance: number;
  opponentDisconnected: boolean;
  onProposeWager: (gameId: string, amount: number) => void;
  onAcceptWager: (gameId: string) => void;
  onRejectWager: (gameId: string) => void;
  onSendChatMessage: (gameId: string, message: string) => void;
  onCancelMatch: () => void;
}

export default function PongLobbyScreen({
  gameId,
  playerSlot,
  players,
  status,
  wagerNegotiation,
  chatMessages,
  negotiationTimeRemaining,
  balance,
  opponentDisconnected,
  onProposeWager,
  onAcceptWager,
  onRejectWager,
  onSendChatMessage,
  onCancelMatch,
}: PongLobbyScreenProps) {
  const [player1, player2] = players;
  const isWaitingForOpponent = status === 'waiting_for_opponent' || !player2;
  const isNegotiating = status === 'lobby_negotiation' && player2 && wagerNegotiation;

  // Get player Elo from player objects (server includes this now)
  const player1Elo = player1?.elo || 1200;
  const player2Elo = player2?.elo || 1200;

  return (
    <div className="w-full space-y-6">
      {/* Disconnect banner */}
      {opponentDisconnected && (
        <OpponentDisconnectBanner
          onCancel={onCancelMatch}
          reconnectTime={10} // Server gives 10s grace period
        />
      )}

      {/* Desktop layout: Simple two-column fractional grid */}
      <div className="hidden lg:grid lg:grid-cols-[7fr_5fr] xl:grid-cols-[2fr_1fr] gap-6 items-stretch">
        {/* Left column: Chat only */}
        <GameRoomChat
          messages={chatMessages}
          onSendMessage={(message) => onSendChatMessage(gameId, message)}
          gameId={gameId}
          className="rounded-lg"
        />

        {/* Right column: Responsive sidebar */}
        <div className="flex flex-col space-y-4 self-stretch">
          {/* Waiting state info */}
          {isWaitingForOpponent && (
            <div className="bg-surface border border-border rounded-lg p-6">
              <h3 className="text-lg font-semibold text-content mb-4">Match Lobby</h3>
              <div className="space-y-3 text-sm text-secondary">
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>Your match is open and waiting for an opponent to join</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>Once they join, you'll negotiate the wager amount</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-accent mt-0.5">•</span>
                  <span>Practice with your paddle while you wait!</span>
                </div>
              </div>
            </div>
          )}

          {/* Elo preview (visible when negotiating) */}
          {isNegotiating && player1 && player2 && wagerNegotiation && (
            <LobbyEloPreview
              player1={{ id: player1.id, name: player1.name, elo: player1Elo }}
              player2={{ id: player2.id, name: player2.name, elo: player2Elo }}
              currentWager={wagerNegotiation.currentOffer}
              playerSlot={playerSlot}
            />
          )}

          {/* Negotiation panel */}
          {isNegotiating && wagerNegotiation && (
            <WagerNegotiationPanel
              negotiation={wagerNegotiation}
              playerSlot={playerSlot}
              balance={balance}
              opponentBalance={(playerSlot === 0 ? player2?.balance : player1?.balance) || 0}
              timeRemaining={negotiationTimeRemaining}
              onPropose={(amount) => onProposeWager(gameId, amount)}
              onAccept={() => onAcceptWager(gameId)}
              onReject={() => onRejectWager(gameId)}
            />
          )}
        </div>
      </div>

      {/* Mobile/Tablet layout: Stacked */}
      <div className="lg:hidden flex flex-col h-full">
        {/* Waiting state */}
        {isWaitingForOpponent && (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center space-y-4 max-w-md">
              <div className="text-xl font-bold text-content animate-pulse">
                Waiting for opponent...
              </div>
              <div className="text-sm text-tertiary">
                Your lobby is open and ready for players to join
              </div>
              <button
                onClick={onCancelMatch}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
              >
                Cancel Match
              </button>
            </div>
          </div>
        )}

        {/* Negotiation state */}
        {isNegotiating && wagerNegotiation && player1 && player2 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {/* Negotiation panel */}
            <WagerNegotiationPanel
              negotiation={wagerNegotiation}
              playerSlot={playerSlot}
              balance={balance}
              opponentBalance={(playerSlot === 0 ? player2?.balance : player1?.balance) || 0}
              timeRemaining={negotiationTimeRemaining}
              onPropose={(amount) => onProposeWager(gameId, amount)}
              onAccept={() => onAcceptWager(gameId)}
              onReject={() => onRejectWager(gameId)}
            />

            {/* Elo preview */}
            <LobbyEloPreview
              player1={{ id: player1.id, name: player1.name, elo: player1Elo }}
              player2={{ id: player2.id, name: player2.name, elo: player2Elo }}
              currentWager={wagerNegotiation.currentOffer}
              playerSlot={playerSlot}
            />

            {/* Chat panel */}
            <GameRoomChat
              messages={chatMessages}
              onSendMessage={(message) => onSendChatMessage(gameId, message)}
              gameId={gameId}
              className="min-h-[200px]"
            />
          </div>
        )}
      </div>
    </div>
  );
}
