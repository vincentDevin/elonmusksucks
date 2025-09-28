import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { formatMuskBucks } from '../../utils/formatting';
import BaseModal from '../BaseModal';
import EloPredictionCard from './EloPredictionCard';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

interface PongMatchCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: string) => void;
}

type MatchMode = 'ai' | 'pvp' | null;

export function PongMatchCreatorModal({
  isOpen,
  onClose,
  onCreateMatch,
}: PongMatchCreatorModalProps) {
  const { user } = useAuth();
  const balance = asNum(user?.muskBucks || 0);

  // Smart defaults based on user balance
  const getSmartDefaultWager = () => {
    if (balance <= 100) return 0; // Free practice for low balance
    if (balance <= 500) return Math.floor(balance * 0.1); // 10% for small balance
    if (balance <= 2000) return Math.floor(balance * 0.05); // 5% for medium balance
    return Math.floor(balance * 0.025); // 2.5% for large balance
  };

  const [selectedMode, setSelectedMode] = useState<MatchMode>('ai'); // Default to AI mode
  const [aiWager, setAiWager] = useState(() => getSmartDefaultWager());
  const [aiDifficulty, setAiDifficulty] = useState(() => {
    // Remember user's last difficulty preference
    return localStorage.getItem('pong_last_difficulty') || 'medium';
  });
  const [pvpWager, setPvpWager] = useState(() => {
    // Smart default for PVP - slightly higher than AI
    const smart = getSmartDefaultWager();
    return Math.max(smart, 100); // Minimum 100 for PVP to attract players
  });
  const [isAiWagerLocked, setIsAiWagerLocked] = useState(false);
  const [isPvpWagerLocked, setIsPvpWagerLocked] = useState(false);

  // Auto-unlock wager when settings change
  useEffect(() => {
    setIsAiWagerLocked(false);
  }, [aiWager, aiDifficulty]);

  useEffect(() => {
    setIsPvpWagerLocked(false);
  }, [pvpWager]);

  // Auto-unlock when switching tabs
  useEffect(() => {
    setIsAiWagerLocked(false);
    setIsPvpWagerLocked(false);
  }, [selectedMode]);

  // Update defaults when balance changes
  useEffect(() => {
    if (balance > 0) {
      setAiWager(getSmartDefaultWager());
      setPvpWager(Math.max(getSmartDefaultWager(), 100));
    }
  }, [balance]);

  // Save difficulty preference
  useEffect(() => {
    localStorage.setItem('pong_last_difficulty', aiDifficulty);
  }, [aiDifficulty]);

  // Calculate risk level based on wager percentage
  const getRiskLevel = (wager: number) => {
    const percentage = wager / balance;
    if (percentage > 0.8) return { level: 'YOLO 🔥', color: 'text-error', bgColor: 'bg-error/10' };
    if (percentage > 0.5)
      return { level: 'High Risk 🟠', color: 'text-warning', bgColor: 'bg-warning/10' };
    if (percentage > 0.3)
      return { level: 'Aggressive 🟡', color: 'text-warning', bgColor: 'bg-warning/10' };
    if (percentage > 0.1)
      return { level: 'Moderate 🔵', color: 'text-info', bgColor: 'bg-info/10' };
    return { level: 'Conservative 🟢', color: 'text-success', bgColor: 'bg-success/10' };
  };

  const handleCreateAI = () => {
    onCreateMatch(aiWager, 'ai', aiDifficulty);
    handleClose();
  };

  const handleCreatePVP = () => {
    onCreateMatch(pvpWager, 'pvp');
    handleClose();
  };

  const handleClose = () => {
    setSelectedMode('ai'); // Reset to AI mode instead of null
    // Reset to smart defaults instead of hardcoded values
    setAiWager(getSmartDefaultWager());
    setPvpWager(Math.max(getSmartDefaultWager(), 100));
    setIsAiWagerLocked(false);
    setIsPvpWagerLocked(false);
    onClose();
  };

  const aiDifficultyInfo = {
    easy: {
      emoji: '🎹',
      name: "Grimes' Laptop",
      desc: 'Just a MacBook Pro making techno beats',
      multiplier: '1.2x',
      color: 'border-success bg-success/10',
    },
    medium: {
      emoji: '🥽',
      name: "Zuck's Metaverse",
      desc: 'No legs, moderate Pong skills',
      multiplier: '1.5x',
      color: 'border-info bg-info/10',
    },
    hard: {
      emoji: '🚀',
      name: "Bezos' Rocket",
      desc: 'Compensating with superior skills',
      multiplier: '2.0x',
      color: 'border-warning bg-warning/10',
    },
    impossible: {
      emoji: '🤖',
      name: 'X Æ A-XII',
      desc: "Elon's child has chosen violence",
      multiplier: '3.0x',
      color: 'border-error bg-error/10',
    },
  };

  // Get current wager and risk level
  const currentWager = selectedMode === 'ai' ? aiWager : pvpWager;
  const currentRiskLevel = getRiskLevel(currentWager);

  // Percentage buttons for quick wager selection
  const renderWagerButtons = (
    wager: number,
    setWager: (v: number) => void,
    showFree: boolean = false,
  ) => {
    const buttons = [];

    // Add Free button for AI mode
    if (showFree) {
      buttons.push(
        <button
          key="free"
          onClick={() => {
            setWager(0);
            if (selectedMode === 'ai') setIsAiWagerLocked(false);
            else setIsPvpWagerLocked(false);
          }}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            wager === 0
              ? 'bg-success text-white shadow-lg'
              : 'bg-success/10 text-success hover:bg-success hover:text-white hover:shadow-xl hover:shadow-success/50'
          }`}
        >
          Free
        </button>,
      );
    }

    // Add percentage buttons
    [0.1, 0.25, 0.5, 1.0].forEach((percent) => {
      buttons.push(
        <button
          key={percent}
          onClick={() => {
            const amount = Math.floor(balance * percent);
            setWager(amount);
            if (selectedMode === 'ai') setIsAiWagerLocked(false);
            else setIsPvpWagerLocked(false);
          }}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            wager === Math.floor(balance * percent)
              ? 'bg-primary text-white shadow-lg'
              : 'bg-muted/20 text-content hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/50'
          }`}
        >
          {percent === 1.0 ? '🚀 ALL IN' : `${percent * 100}%`}
        </button>,
      );
    });

    return <div className="flex space-x-2">{buttons}</div>;
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="🏓 Create Pong Match"
      size="xl"
      className="max-w-6xl [&>div:first-child]:p-4 [&>div:first-child]:pb-3 [&>div:nth-child(2)]:p-4"
      headerContent={
        <div className="mt-3">
          {/* Tab-Style Mode Selection in Header */}
          <div className="flex bg-muted/20 p-0.5 rounded-lg">
            <button
              onClick={() => setSelectedMode('ai')}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all cursor-pointer border-2 ${
                selectedMode === 'ai'
                  ? 'bg-surface text-content shadow-lg font-medium border-accent'
                  : 'text-tertiary hover:text-content hover:bg-surface hover:shadow-lg border-muted hover:border-accent'
              }`}
            >
              <span className="text-base">🤖</span>
              <span className="text-sm">Play the AI</span>
              <div className="text-xs text-accent bg-accent/10 px-1.5 py-0.5 rounded-full">
                Practice
              </div>
            </button>
            <button
              onClick={() => setSelectedMode('pvp')}
              className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md transition-all cursor-pointer border-2 ${
                selectedMode === 'pvp'
                  ? 'bg-surface text-content shadow-lg font-medium border-accent'
                  : 'text-tertiary hover:text-content hover:bg-surface hover:shadow-lg border-muted hover:border-accent'
              }`}
            >
              <span className="text-base">👤</span>
              <span className="text-sm">Play vs Player</span>
              <div className="text-xs text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                Competitive
              </div>
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {/* Content Based on Selected Mode */}
        {selectedMode === 'ai' ? (
          <div className="space-y-3">
            {/* AI Difficulty Selection - Full Width Row */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-content">Select AI Difficulty</h3>
              <div className="grid grid-cols-4 gap-3">
                {Object.entries(aiDifficultyInfo).map(([level, info]) => (
                  <button
                    key={level}
                    onClick={() => setAiDifficulty(level)}
                    className={`p-2 rounded-lg border-2 transition-all cursor-pointer ${
                      aiDifficulty === level
                        ? `${info.color} shadow-lg`
                        : 'border-muted bg-surface hover:border-accent hover:shadow-lg hover:bg-accent/5'
                    }`}
                  >
                    {/* First Row: Emoji + Name + Multiplier */}
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-1">
                        <span className="text-lg">{info.emoji}</span>
                        <span className="font-bold text-content text-sm">{info.name}</span>
                      </div>
                      <div className="px-1.5 py-0.5 bg-accent/20 text-accent text-xs font-bold rounded">
                        {info.multiplier}
                      </div>
                    </div>
                    {/* Second Row: Description */}
                    <div className="text-xs text-tertiary">{info.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 2-Column Layout: Wager Amount + ELO Impact */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column: Wager Controls */}
              <div className="space-y-3">
                <div className="bg-surface p-3 rounded-lg border border-muted space-y-3">
                  {/* Header inside container */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-content">Wager Amount</h3>
                  </div>
                  {/* Balance & Smart Suggestion */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-tertiary">Balance</span>
                    <span className="font-bold text-content">{formatMuskBucks(balance)} 🪙</span>
                  </div>

                  {aiWager === getSmartDefaultWager() && aiWager > 0 && (
                    <div className="bg-accent/10 border border-accent/20 rounded p-2">
                      <div className="flex items-center text-xs text-accent">
                        <span className="mr-1">💡</span>
                        Recommended amount
                      </div>
                    </div>
                  )}

                  {/* Wager Input */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-tertiary">Your Wager</span>
                      {aiWager > 0 && (
                        <div
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${currentRiskLevel.bgColor} ${currentRiskLevel.color}`}
                        >
                          {currentRiskLevel.level}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={aiWager}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            Math.min(balance, parseInt(e.target.value) || 0),
                          );
                          setAiWager(value);
                          setIsAiWagerLocked(false);
                        }}
                        min="0"
                        max={balance}
                        step="10"
                        placeholder="0"
                        className="w-32 px-3 py-2 bg-background border border-muted rounded text-right font-bold text-content focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                      <span className="font-bold text-content">🪙</span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max={balance}
                      step="10"
                      value={aiWager}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setAiWager(value);
                        setIsAiWagerLocked(false);
                      }}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(aiWager / balance) * 100}%, var(--color-muted) ${(aiWager / balance) * 100}%, var(--color-muted) 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-tertiary mt-1">
                      <span>0</span>
                      <span className="text-accent font-medium">{formatMuskBucks(aiWager)}</span>
                      <span>{formatMuskBucks(balance)}</span>
                    </div>
                  </div>

                  {/* Percentage Buttons */}
                  {renderWagerButtons(aiWager, setAiWager, true)}

                  {/* Popular Stakes for AI */}
                  <div className="pt-2 border-t border-muted">
                    <div className="text-xs text-tertiary mb-2">Popular Stakes</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[50, 100, 250, 500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setAiWager(Math.min(amount, balance));
                            setIsAiWagerLocked(false);
                          }}
                          disabled={amount > balance}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            amount > balance
                              ? 'opacity-60 cursor-not-allowed bg-muted/20 text-tertiary'
                              : aiWager === amount
                                ? 'bg-accent text-white'
                                : 'bg-muted/20 text-content hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/50 cursor-pointer'
                          }`}
                        >
                          {formatMuskBucks(amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: ELO Impact Preview */}
              <div className="space-y-3">
                <EloPredictionCard
                  wagerAmount={aiWager}
                  opponentType="ai"
                  aiDifficulty={aiDifficulty}
                  onWagerLocked={(locked) => setIsAiWagerLocked(locked)}
                  hideInfoFooter={false}
                  hideLockButton={true}
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex space-x-3">
              {aiWager > 0 && !isAiWagerLocked ? (
                <button
                  onClick={() => setIsAiWagerLocked(true)}
                  className="flex-1 px-6 py-3 bg-accent text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow-lg border-2 border-accent hover:border-primary hover:bg-primary"
                >
                  🔒 Lock Wager ({formatMuskBucks(aiWager)})
                </button>
              ) : (
                <button
                  onClick={handleCreateAI}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow-lg border-2 border-primary hover:border-success hover:bg-success"
                >
                  🚀 Start AI Match
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* PVP Info - Full Width Row */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-content">How PVP Works</h3>
              <div className="bg-info/10 border border-info/20 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4">
                  <ul className="space-y-1 text-sm text-info">
                    <li>• Create a match lobby and wait for an opponent</li>
                    <li>• Both players must ready up before match begins</li>
                  </ul>
                  <ul className="space-y-1 text-sm text-info">
                    <li>• Winner takes all - loser loses their wager</li>
                    <li>• Higher wagers attract skilled players seeking rewards</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* 2-Column Layout: Match Stakes + ELO Impact */}
            <div className="grid grid-cols-2 gap-4">
              {/* Left Column: Wager Controls */}
              <div className="space-y-3">
                <div className="bg-surface p-3 rounded-lg border border-muted space-y-3">
                  {/* Header inside container */}
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-content">Match Stakes</h3>
                  </div>
                  {/* Balance & Smart Suggestion */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-tertiary">Balance</span>
                    <span className="font-bold text-content">{formatMuskBucks(balance)} 🪙</span>
                  </div>

                  {pvpWager === Math.max(getSmartDefaultWager(), 100) && (
                    <div className="bg-accent/10 border border-accent/20 rounded p-2">
                      <div className="flex items-center text-xs text-accent">
                        <span className="mr-1">💡</span>
                        Recommended competitive amount
                      </div>
                    </div>
                  )}

                  {/* Wager Input */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-tertiary">Your Wager</span>
                      {pvpWager > 0 && (
                        <div
                          className={`px-1.5 py-0.5 rounded text-xs font-medium ${currentRiskLevel.bgColor} ${currentRiskLevel.color}`}
                        >
                          {currentRiskLevel.level}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        value={pvpWager}
                        onChange={(e) => {
                          const value = Math.max(
                            0,
                            Math.min(balance, parseInt(e.target.value) || 0),
                          );
                          setPvpWager(value);
                          setIsPvpWagerLocked(false);
                        }}
                        min="0"
                        max={balance}
                        step="50"
                        placeholder="100"
                        className="w-32 px-3 py-2 bg-background border border-muted rounded text-right font-bold text-content focus:ring-2 focus:ring-accent focus:border-accent"
                      />
                      <span className="font-bold text-content">🪙</span>
                    </div>
                  </div>

                  {/* Slider */}
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max={balance}
                      step="50"
                      value={pvpWager}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setPvpWager(value);
                        setIsPvpWagerLocked(false);
                      }}
                      className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${(pvpWager / balance) * 100}%, var(--color-muted) ${(pvpWager / balance) * 100}%, var(--color-muted) 100%)`,
                      }}
                    />
                    <div className="flex justify-between text-xs text-tertiary mt-1">
                      <span>0</span>
                      <span className="text-accent font-medium">{formatMuskBucks(pvpWager)}</span>
                      <span>{formatMuskBucks(balance)}</span>
                    </div>
                  </div>

                  {/* Percentage Buttons */}
                  {renderWagerButtons(pvpWager, setPvpWager, true)}

                  {/* Popular Stakes */}
                  <div className="pt-2 border-t border-muted">
                    <div className="text-xs text-tertiary mb-2">Popular Stakes</div>
                    <div className="grid grid-cols-4 gap-1">
                      {[100, 500, 1000, 2500].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setPvpWager(Math.min(amount, balance));
                            setIsPvpWagerLocked(false);
                          }}
                          disabled={amount > balance}
                          className={`px-2 py-1 text-xs rounded transition-all ${
                            amount > balance
                              ? 'opacity-60 cursor-not-allowed bg-muted/20 text-tertiary'
                              : pvpWager === amount
                                ? 'bg-accent text-white'
                                : 'bg-muted/20 text-content hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/50 cursor-pointer'
                          }`}
                        >
                          {formatMuskBucks(amount)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: ELO Impact Preview */}
              <div className="space-y-3">
                <EloPredictionCard
                  wagerAmount={pvpWager}
                  opponentType="pvp"
                  onWagerLocked={(locked) => setIsPvpWagerLocked(locked)}
                  hideInfoFooter={false}
                  hideLockButton={true}
                />
              </div>
            </div>

            {/* Action Button */}
            <div className="flex space-x-3">
              {pvpWager > 0 && !isPvpWagerLocked ? (
                <button
                  onClick={() => setIsPvpWagerLocked(true)}
                  className="flex-1 px-6 py-3 bg-accent text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow-lg border-2 border-accent hover:border-primary hover:bg-primary"
                >
                  🔒 Lock Wager ({formatMuskBucks(pvpWager)})
                </button>
              ) : (
                <button
                  onClick={handleCreatePVP}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow-lg border-2 border-primary hover:border-success hover:bg-success"
                >
                  🎯 Create PVP Lobby
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
}
