import { useState } from 'react';
import { formatMuskBucks } from '../../utils/formatting';
import EloPredictionCard from './EloPredictionCard';

interface PongMatchCreatorProps {
  onCreateMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
}

type MatchMode = 'ai' | 'pvp' | null;

export function PongMatchCreator({ onCreateMatch }: PongMatchCreatorProps) {
  const [selectedMode, setSelectedMode] = useState<MatchMode>(null);
  const [aiWager, setAiWager] = useState(0);
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [pvpWager, setPvpWager] = useState(100);
  const [isAiWagerLocked, setIsAiWagerLocked] = useState(false);
  const [isPvpWagerLocked, setIsPvpWagerLocked] = useState(false);

  const handleCreateAI = () => {
    if (aiWager > 0 && !isAiWagerLocked) {
      // Don't allow creation if wager isn't locked
      return;
    }
    onCreateMatch(aiWager, 'ai', aiDifficulty);
    setSelectedMode(null); // Collapse after creation
    setIsAiWagerLocked(false); // Reset lock state
  };

  const handleCreatePVP = () => {
    if (pvpWager > 0 && !isPvpWagerLocked) {
      // Don't allow creation if wager isn't locked
      return;
    }
    onCreateMatch(pvpWager, 'pvp');
    setSelectedMode(null); // Collapse after creation
    setIsPvpWagerLocked(false); // Reset lock state
  };

  const aiDifficultyInfo = {
    easy: {
      emoji: '🎹',
      name: "Grimes' Laptop",
      desc: 'Just a MacBook Pro making techno beats',
      multiplier: '1.2x',
    },
    medium: {
      emoji: '🥽',
      name: "Zuck's Metaverse",
      desc: 'No legs, moderate Pong skills',
      multiplier: '1.5x',
    },
    hard: {
      emoji: '🚀',
      name: "Bezos' Rocket",
      desc: 'Compensating with superior skills',
      multiplier: '2.0x',
    },
    impossible: {
      emoji: '🤖',
      name: 'X Æ A-XII',
      desc: "Elon's child has chosen violence",
      multiplier: '3.0x',
    },
  };

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* AI Button */}
        <button
          onClick={() => setSelectedMode(selectedMode === 'ai' ? null : 'ai')}
          className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
            selectedMode === 'ai'
              ? 'border-accent bg-accent/10 shadow-lg scale-105'
              : 'border-muted bg-surface hover:border-accent/50 hover:shadow-md hover:scale-102'
          }`}
        >
          <div className="flex items-center justify-center space-x-4">
            <div className="text-3xl">🤖</div>
            <div className="text-left flex-1">
              <div className="text-lg font-bold text-content">Play the AI</div>
              <div className="text-sm text-secondary">
                Test your skills • Quick Start • Skill Building
              </div>
            </div>
          </div>
          {selectedMode === 'ai' && (
            <div className="absolute top-2 right-2 text-accent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </div>
          )}
        </button>

        {/* PVP Button */}
        <button
          onClick={() => setSelectedMode(selectedMode === 'pvp' ? null : 'pvp')}
          className={`group relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer ${
            selectedMode === 'pvp'
              ? 'border-accent bg-accent/10 shadow-lg scale-105'
              : 'border-muted bg-surface hover:border-accent/50 hover:shadow-md hover:scale-102'
          }`}
        >
          <div className="flex items-center justify-center space-x-4">
            <div className="text-3xl">👤</div>
            <div className="text-left flex-1">
              <div className="text-lg font-bold text-content">Play vs Player</div>
              <div className="text-sm text-secondary">
                Challenge real players • Competitive • High Stakes
              </div>
            </div>
          </div>
          {selectedMode === 'pvp' && (
            <div className="absolute top-2 right-2 text-accent">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </div>
          )}
        </button>
      </div>

      {/* AI Configuration Form */}
      {selectedMode === 'ai' && (
        <div className="bg-surface border border-muted rounded-xl p-6 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">🤖</div>
            <div>
              <h3 className="text-lg font-semibold text-content">AI Match Setup</h3>
              <p className="text-sm text-secondary">Choose your difficulty and optional wager</p>
            </div>
          </div>

          {/* AI Difficulty Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-secondary">AI Difficulty</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(aiDifficultyInfo).map(([level, info]) => (
                <button
                  key={level}
                  onClick={() => setAiDifficulty(level)}
                  className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                    aiDifficulty === level
                      ? 'border-accent bg-accent/10'
                      : 'border-muted bg-background hover:border-accent/50'
                  }`}
                >
                  <div className="text-left">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-lg">{info.emoji}</span>
                      <span className="font-medium text-content">{info.name}</span>
                    </div>
                    <div className="text-xs text-secondary mb-1">{info.desc}</div>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded">
                        {info.multiplier}
                      </span>
                      <span className="text-xs text-tertiary capitalize">({level})</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* AI Wager */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-secondary">
              Optional Wager (Leave 0 for free practice)
            </label>
            <div className="flex space-x-3">
              <input
                type="number"
                value={aiWager}
                onChange={(e) => {
                  setAiWager(Math.max(0, parseInt(e.target.value) || 0));
                  setIsAiWagerLocked(false); // Unlock when wager changes
                }}
                min="0"
                max="1000"
                step="10"
                placeholder="0"
                disabled={isAiWagerLocked}
                className={`flex-1 px-4 py-3 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${
                  isAiWagerLocked ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              <div className="flex space-x-2">
                {[0, 50, 100, 250].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setAiWager(amount);
                      setIsAiWagerLocked(false); // Unlock when preset is selected
                    }}
                    disabled={isAiWagerLocked}
                    className={`px-3 py-3 text-sm bg-muted/20 text-content rounded-lg hover:bg-muted/40 transition-colors cursor-pointer ${
                      isAiWagerLocked ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {amount === 0 ? 'Free' : formatMuskBucks(amount)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Elo Prediction */}
          <EloPredictionCard
            wagerAmount={aiWager}
            opponentType="ai"
            aiDifficulty={aiDifficulty}
            onWagerLocked={(locked) => setIsAiWagerLocked(locked)}
          />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCreateAI}
              disabled={aiWager > 0 && !isAiWagerLocked}
              className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold cursor-pointer ${
                aiWager > 0 && !isAiWagerLocked
                  ? 'bg-muted/40 text-tertiary cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
              title={aiWager > 0 && !isAiWagerLocked ? 'Please lock your wager first' : ''}
            >
              {aiWager > 0 && !isAiWagerLocked ? '🔓 Lock Wager First' : '🚀 Start AI Match'}
            </button>
            <button
              onClick={() => setSelectedMode(null)}
              className="px-6 py-3 bg-muted/20 text-content rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* PVP Configuration Form */}
      {selectedMode === 'pvp' && (
        <div className="bg-surface border border-muted rounded-xl p-6 space-y-6 animate-in slide-in-from-top duration-300">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">👤</div>
            <div>
              <h3 className="text-lg font-semibold text-content">PVP Match Setup</h3>
              <p className="text-sm text-secondary">
                Set your wager and create a lobby for others to join
              </p>
            </div>
          </div>

          {/* PVP Wager */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-secondary">
              Wager Amount (Both players must have this amount)
            </label>
            <div className="flex space-x-3">
              <input
                type="number"
                value={pvpWager}
                onChange={(e) => {
                  setPvpWager(Math.max(0, parseInt(e.target.value) || 0));
                  setIsPvpWagerLocked(false); // Unlock when wager changes
                }}
                min="0"
                max="10000"
                step="50"
                placeholder="100"
                disabled={isPvpWagerLocked}
                className={`flex-1 px-4 py-3 bg-background border border-muted rounded-lg focus:ring-2 focus:ring-accent focus:border-accent ${
                  isPvpWagerLocked ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              <div className="flex space-x-2">
                {[0, 100, 500, 1000, 2500].map((amount) => (
                  <button
                    key={amount}
                    onClick={() => {
                      setPvpWager(amount);
                      setIsPvpWagerLocked(false); // Unlock when preset is selected
                    }}
                    disabled={isPvpWagerLocked}
                    className={`px-3 py-3 text-sm bg-muted/20 text-content rounded-lg hover:bg-muted/40 transition-colors cursor-pointer ${
                      isPvpWagerLocked ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                  >
                    {amount === 0 ? 'Free' : formatMuskBucks(amount)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* PVP Info */}
          <div className="bg-info/10 border border-info/20 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <div className="text-info text-lg">ℹ️</div>
              <div className="text-sm text-info">
                <div className="font-medium mb-1">How PVP Works:</div>
                <ul className="space-y-1 text-xs">
                  <li>• You'll enter the game screen and wait for an opponent</li>
                  <li>• Both players must ready up before the match begins</li>
                  <li>• Winner takes all - loser loses their wager</li>
                  <li>• Free matches (0 wager) are great for practice!</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Elo Prediction */}
          <EloPredictionCard
            wagerAmount={pvpWager}
            opponentType="pvp"
            onWagerLocked={(locked) => setIsPvpWagerLocked(locked)}
          />

          {/* Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleCreatePVP}
              disabled={pvpWager > 0 && !isPvpWagerLocked}
              className={`flex-1 px-6 py-3 rounded-lg transition-colors font-semibold cursor-pointer ${
                pvpWager > 0 && !isPvpWagerLocked
                  ? 'bg-muted/40 text-tertiary cursor-not-allowed'
                  : 'bg-accent text-accent-foreground hover:bg-accent/90'
              }`}
              title={pvpWager > 0 && !isPvpWagerLocked ? 'Please lock your wager first' : ''}
            >
              {pvpWager > 0 && !isPvpWagerLocked ? '🔓 Lock Wager First' : '🎯 Create PVP Lobby'}
            </button>
            <button
              onClick={() => setSelectedMode(null)}
              className="px-6 py-3 bg-muted/20 text-content rounded-lg hover:bg-muted/40 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
