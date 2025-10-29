import { useState, useEffect, startTransition } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useEventBusCore } from '../../contexts/EventBusCoreContext';
import { formatMuskBucks } from '../../utils/formatting';
import BaseModal from '../BaseModal';
import EloPredictionCard from './EloPredictionCard';
import {
  PONG_PAYOUT_CONSTANTS,
  PONG_WAGER_LIMITS,
  AI_PLAYER_IDS,
  REDIS_CHANNELS,
} from '@ems/types';
import type { AIDifficulty, BalanceUpdatePayload } from '@ems/types';
import api from '../../api/axios';

// Helper to convert string/number to number
const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

interface PongMatchCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateMatch: (wager: number, type: 'ai' | 'pvp', aiDifficulty?: AIDifficulty) => void;
  variant: 'ai' | 'pvp';
}

interface AIPlayerData {
  id: number;
  name: string;
  avatarUrl: string | null;
}

export function PongMatchCreatorModal({
  isOpen,
  onClose,
  onCreateMatch,
  variant,
}: PongMatchCreatorModalProps) {
  const { user } = useAuth();
  const { subscribe } = useEventBusCore();
  const [balance, setBalance] = useState(() => asNum(user?.muskBucks || 0));

  // AI player data from database
  const [aiPlayers, setAiPlayers] = useState<Record<AIDifficulty, AIPlayerData>>({
    EASY: { id: AI_PLAYER_IDS.EASY, name: 'AI Easy', avatarUrl: null },
    MEDIUM: { id: AI_PLAYER_IDS.MEDIUM, name: 'AI Medium', avatarUrl: null },
    HARD: { id: AI_PLAYER_IDS.HARD, name: 'AI Hard', avatarUrl: null },
    IMPOSSIBLE: { id: AI_PLAYER_IDS.IMPOSSIBLE, name: 'AI Impossible', avatarUrl: null },
  });

  // Smart defaults based on user balance
  const getSmartDefaultWager = () => {
    if (balance <= 100) return 0; // Free practice for low balance
    if (balance <= 500) return Math.floor(balance * 0.1); // 10% for small balance
    if (balance <= 2000) return Math.floor(balance * 0.05); // 5% for medium balance
    return Math.floor(balance * 0.025); // 2.5% for large balance
  };

  // Step management - AI has 3 steps, PVP has 2 steps
  const totalSteps = variant === 'ai' ? 3 : 2;
  const [currentStep, setCurrentStep] = useState(1);
  const [aiWager, setAiWager] = useState(() => getSmartDefaultWager());
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>(() => {
    // Remember user's last difficulty preference (with migration from lowercase to UPPERCASE)
    const saved = localStorage.getItem('pong_last_difficulty');

    // Migration: convert old lowercase values to UPPERCASE
    if (saved) {
      const normalized = saved.toUpperCase() as AIDifficulty;
      // Validate it's a valid difficulty
      if (['EASY', 'MEDIUM', 'HARD', 'IMPOSSIBLE'].includes(normalized)) {
        return normalized;
      }
    }

    return 'MEDIUM';
  });
  const [pvpWager, setPvpWager] = useState(() => {
    // Smart default for PVP - slightly higher than AI
    const smart = getSmartDefaultWager();
    return Math.max(smart, 100); // Minimum 100 for PVP to attract players
  });

  // Auto-unlock wager when settings change and enforce max wager limits
  useEffect(() => {
    // Enforce max wager limit for selected AI difficulty
    const maxWager = aiDifficultyInfo[aiDifficulty].maxWager;
    if (maxWager !== null && aiWager > maxWager) {
      setAiWager(maxWager);
    }
  }, [aiWager, aiDifficulty]);

  // Fetch AI player data from database (cached on server, fetched once per session)
  useEffect(() => {
    const fetchAIPlayers = async () => {
      try {
        // Fetch all AI players in one request (server-side cached)
        const response = await api.get('/api/pong/ai-players');
        const players = response.data as Array<{
          id: number;
          name: string;
          avatarUrl: string | null;
        }>;

        // Map players to difficulties
        const newAiPlayers = { ...aiPlayers };
        players.forEach((player) => {
          // Find difficulty by matching ID
          const difficulty = (Object.keys(AI_PLAYER_IDS) as AIDifficulty[]).find(
            (key) => AI_PLAYER_IDS[key] === player.id,
          );
          if (difficulty) {
            newAiPlayers[difficulty] = player;
          }
        });

        setAiPlayers(newAiPlayers);
      } catch (error) {
        console.error('Failed to fetch AI player data:', error);
        // Keep fallback values if fetch fails
      }
    };

    // Only fetch once when modal first opens
    if (isOpen && aiPlayers.EASY.name === 'AI Easy') {
      fetchAIPlayers();
    }
  }, [isOpen]);

  // Fetch fresh balance from API when modal opens (lightweight endpoint - same pattern as PongGame Elo fetch)
  useEffect(() => {
    const fetchUserBalance = async () => {
      try {
        const response = await api.get('/api/auth/balance');
        const freshBalance = asNum(response.data.muskBucks);
        console.log('[Modal] Fresh balance fetched from API:', freshBalance);
        setBalance(freshBalance);
      } catch (error) {
        console.error('Failed to fetch user balance:', error);
        // Fallback to user object if API fails
        if (user?.muskBucks !== undefined) {
          setBalance(asNum(user.muskBucks));
        }
      }
    };

    if (isOpen && user?.id) {
      fetchUserBalance();
    }
  }, [isOpen, user?.id, user?.muskBucks]);

  // Subscribe to real-time balance updates
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribe(
      REDIS_CHANNELS.BALANCE_UPDATE,
      (payload: BalanceUpdatePayload) => {
        if (payload.userId === user.id) {
          startTransition(() => {
            setBalance(payload.newBalance);
          });
        }
      },
    );

    return unsubscribe;
  }, [user?.id, subscribe]);

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
    // Reset to step 1
    setCurrentStep(1);
    // Reset to smart defaults instead of hardcoded values
    setAiWager(getSmartDefaultWager());
    setPvpWager(Math.max(getSmartDefaultWager(), 100));
    onClose();
  };

  // Step navigation
  const goToNextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const aiDifficultyInfo: Record<
    AIDifficulty,
    {
      multiplier: string;
      maxWager: number | null;
      color: string;
    }
  > = {
    EASY: {
      multiplier: `${PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER.EASY}x`,
      maxWager: PONG_WAGER_LIMITS.AI_MAX_WAGERS.EASY,
      color: 'border-success bg-success/10',
    },
    MEDIUM: {
      multiplier: `${PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER.MEDIUM}x`,
      maxWager: PONG_WAGER_LIMITS.AI_MAX_WAGERS.MEDIUM,
      color: 'border-info bg-info/10',
    },
    HARD: {
      multiplier: `${PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER.HARD}x`,
      maxWager: PONG_WAGER_LIMITS.AI_MAX_WAGERS.HARD,
      color: 'border-warning bg-warning/10',
    },
    IMPOSSIBLE: {
      multiplier: `${PONG_PAYOUT_CONSTANTS.AI_PAYOUT_MULTIPLIER.IMPOSSIBLE}x`,
      maxWager: PONG_WAGER_LIMITS.AI_MAX_WAGERS.IMPOSSIBLE,
      color: 'border-error bg-error/10',
    },
  };

  // Get current wager and risk level
  const currentWager = variant === 'ai' ? aiWager : pvpWager;
  const currentRiskLevel = getRiskLevel(currentWager);

  // Percentage buttons for quick wager selection
  const renderWagerButtons = (
    wager: number,
    setWager: (v: number) => void,
    showFree: boolean = false,
  ) => {
    const buttons = [];

    // Get effective max (for AI mode, respect max wager limits)
    const effectiveMax =
      variant === 'ai' && aiDifficultyInfo[aiDifficulty].maxWager !== null
        ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
        : balance;

    // Add Free button for AI mode
    if (showFree) {
      buttons.push(
        <button
          key="free"
          onClick={() => setWager(0)}
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
      const amount = Math.floor(effectiveMax * percent);
      buttons.push(
        <button
          key={percent}
          onClick={() => setWager(amount)}
          className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
            wager === amount
              ? 'bg-primary text-white shadow-lg'
              : 'bg-muted/20 text-content hover:bg-primary hover:text-white hover:shadow-xl hover:shadow-primary/50'
          }`}
        >
          {percent === 1.0 ? '🚀 MAX' : `${percent * 100}%`}
        </button>,
      );
    });

    return <div className="flex space-x-2">{buttons}</div>;
  };

  // Get step title based on variant and current step
  const getStepTitle = () => {
    if (variant === 'ai') {
      if (currentStep === 1) return '🤖 Select AI Opponent';
      if (currentStep === 2) return '💰 Choose Wager';
      return '🏆 Confirm Match';
    } else {
      if (currentStep === 1) return '💰 Set Match Stakes';
      return '🏆 Confirm Lobby';
    }
  };

  // Render wager controls (shared by AI step 2 and PVP step 1)
  const renderWagerControls = (isAI: boolean) => {
    const wager = isAI ? aiWager : pvpWager;
    const setWager = isAI ? setAiWager : setPvpWager;
    const riskLevel = getRiskLevel(wager);

    return (
      <div className="bg-surface p-4 rounded-lg border border-muted space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-content">
            {isAI ? 'Wager Amount' : 'Match Stakes'}
          </h3>
          {isAI && <span className="text-sm text-tertiary">vs {aiPlayers[aiDifficulty].name}</span>}
        </div>

        {/* Balance */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-tertiary">Balance</span>
          <span className="font-bold text-content">{formatMuskBucks(balance)} 🪙</span>
        </div>

        {/* Max Wager Limit Warning (AI only) */}
        {isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null && (
          <div className="bg-warning/10 border border-warning/20 rounded p-2">
            <div className="flex items-center text-xs text-warning">
              <span className="mr-1">⚠️</span>
              Max wager for {aiDifficulty} difficulty:{' '}
              {formatMuskBucks(aiDifficultyInfo[aiDifficulty].maxWager!)} 🪙
            </div>
          </div>
        )}

        {/* Smart Suggestion */}
        {wager === (isAI ? getSmartDefaultWager() : Math.max(getSmartDefaultWager(), 100)) &&
          wager > 0 && (
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
            {wager > 0 && (
              <div
                className={`px-1.5 py-0.5 rounded text-xs font-medium ${riskLevel.bgColor} ${riskLevel.color}`}
              >
                {riskLevel.level}
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={wager}
              onChange={(e) => {
                const maxWager = isAI ? aiDifficultyInfo[aiDifficulty].maxWager : null;
                const effectiveMax = maxWager !== null ? Math.min(balance, maxWager) : balance;
                const value = Math.max(0, Math.min(effectiveMax, parseInt(e.target.value) || 0));
                setWager(value);
              }}
              min="0"
              max={
                isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null
                  ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
                  : balance
              }
              step={isAI ? '10' : '50'}
              placeholder={isAI ? '0' : '100'}
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
            max={
              isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null
                ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
                : balance
            }
            step={isAI ? '10' : '50'}
            value={wager}
            onChange={(e) => setWager(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, var(--color-accent) 0%, var(--color-accent) ${
                (wager /
                  (isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null
                    ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
                    : balance)) *
                100
              }%, var(--color-muted) ${
                (wager /
                  (isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null
                    ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
                    : balance)) *
                100
              }%, var(--color-muted) 100%)`,
            }}
          />
          <div className="flex justify-between text-xs text-tertiary mt-1">
            <span>0</span>
            <span className="text-accent font-medium">{formatMuskBucks(wager)}</span>
            <span>
              {formatMuskBucks(
                isAI && aiDifficultyInfo[aiDifficulty].maxWager !== null
                  ? Math.min(balance, aiDifficultyInfo[aiDifficulty].maxWager!)
                  : balance,
              )}
            </span>
          </div>
        </div>

        {/* Percentage Buttons */}
        {renderWagerButtons(wager, setWager, isAI)}

        {/* Popular Stakes */}
        <div className="pt-2 border-t border-muted">
          <div className="text-xs text-tertiary mb-2">Popular Stakes</div>
          <div className="grid grid-cols-4 gap-1">
            {(isAI ? [50, 100, 250, 500] : [100, 500, 1000, 2500]).map((amount) => {
              const maxWager = isAI ? aiDifficultyInfo[aiDifficulty].maxWager : null;
              const effectiveMax = maxWager !== null ? Math.min(balance, maxWager) : balance;
              const isDisabled = amount > effectiveMax;
              return (
                <button
                  key={amount}
                  onClick={() => setWager(Math.min(amount, effectiveMax))}
                  disabled={isDisabled}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    isDisabled
                      ? 'opacity-60 cursor-not-allowed bg-muted/20 text-tertiary'
                      : wager === amount
                        ? 'bg-accent text-white'
                        : 'bg-muted/20 text-content hover:bg-accent hover:text-white hover:shadow-lg hover:shadow-accent/50 cursor-pointer'
                  }`}
                >
                  {formatMuskBucks(amount)}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={`🏓 ${variant === 'ai' ? 'Play vs AI' : 'Create PVP Lobby'}`}
      size="xl"
      className="max-w-4xl [&>div:first-child]:p-4 [&>div:first-child]:pb-3 [&>div:nth-child(2)]:p-4"
      headerContent={
        <div className="mt-3">
          {/* Step Indicator */}
          <div className="flex items-center justify-center space-x-3">
            <div className="text-sm text-tertiary">
              Step {currentStep} of {totalSteps}
            </div>
            <div className="flex items-center space-x-2">
              {Array.from({ length: totalSteps }).map((_, index) => (
                <div
                  key={index}
                  className={`h-2 w-8 rounded-full transition-all ${
                    index + 1 === currentStep
                      ? 'bg-primary'
                      : index + 1 < currentStep
                        ? 'bg-success'
                        : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="text-center mt-2 text-lg font-semibold text-content">
            {getStepTitle()}
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ============================================ */}
        {/* AI VARIANT - STEP 1: Select AI Opponent    */}
        {/* ============================================ */}
        {variant === 'ai' && currentStep === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-secondary text-center">
              Choose your AI opponent. Higher difficulties offer better multipliers but are harder
              to beat!
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(
                Object.entries(aiDifficultyInfo) as [
                  AIDifficulty,
                  (typeof aiDifficultyInfo)[AIDifficulty],
                ][]
              ).map(([level, info]) => {
                const player = aiPlayers[level];
                return (
                  <button
                    key={level}
                    onClick={() => setAiDifficulty(level)}
                    className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      aiDifficulty === level
                        ? `${info.color} shadow-lg scale-105`
                        : 'border-muted bg-surface hover:border-accent hover:shadow-lg hover:bg-accent/5'
                    }`}
                  >
                    {/* Avatar + AI Name */}
                    <div className="flex items-center justify-center mb-2">
                      <span className="text-2xl">{player.avatarUrl || '🤖'}</span>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-content text-sm mb-1">{player.name}</div>
                      <div className="text-xs text-tertiary mb-2">{level}</div>
                      <div className="px-2 py-1 bg-accent/20 text-accent text-xs font-bold rounded">
                        {info.multiplier} payout
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================ */}
        {/* AI VARIANT - STEP 2: Choose Wager          */}
        {/* ============================================ */}
        {variant === 'ai' && currentStep === 2 && renderWagerControls(true)}

        {/* ============================================ */}
        {/* AI VARIANT - STEP 3: Elo Preview + Confirm */}
        {/* ============================================ */}
        {variant === 'ai' && currentStep === 3 && (
          <div className="space-y-4">
            {/* Match Summary */}
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-3">Match Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-tertiary">Opponent:</span>
                  <span className="ml-2 font-medium text-content">
                    {aiPlayers[aiDifficulty].name}
                  </span>
                </div>
                <div>
                  <span className="text-tertiary">Difficulty:</span>
                  <span className="ml-2 font-medium text-content">{aiDifficulty}</span>
                </div>
                <div>
                  <span className="text-tertiary">Wager:</span>
                  <span className="ml-2 font-medium text-accent">{formatMuskBucks(aiWager)}</span>
                </div>
                <div>
                  <span className="text-tertiary">Payout Multiplier:</span>
                  <span className="ml-2 font-medium text-success">
                    {aiDifficultyInfo[aiDifficulty].multiplier}
                  </span>
                </div>
              </div>
            </div>

            {/* Elo Impact */}
            <EloPredictionCard
              wagerAmount={aiWager}
              opponentType="ai"
              aiDifficulty={aiDifficulty}
              hideInfoFooter={false}
              hideLockButton={true}
            />
          </div>
        )}

        {/* ============================================ */}
        {/* PVP VARIANT - STEP 1: Choose Wager         */}
        {/* ============================================ */}
        {variant === 'pvp' && currentStep === 1 && (
          <div className="space-y-3">
            {/* PVP Info */}
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

            {/* Wager Controls */}
            {renderWagerControls(false)}
          </div>
        )}

        {/* ============================================ */}
        {/* PVP VARIANT - STEP 2: Elo Preview + Confirm */}
        {/* ============================================ */}
        {variant === 'pvp' && currentStep === 2 && (
          <div className="space-y-4">
            {/* Match Summary */}
            <div className="bg-surface p-4 rounded-lg border border-muted">
              <h3 className="text-lg font-semibold text-content mb-3">Lobby Summary</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-tertiary">Match Type:</span>
                  <span className="ml-2 font-medium text-content">Player vs Player</span>
                </div>
                <div>
                  <span className="text-tertiary">Entry Fee:</span>
                  <span className="ml-2 font-medium text-accent">{formatMuskBucks(pvpWager)}</span>
                </div>
                <div>
                  <span className="text-tertiary">Total Pot:</span>
                  <span className="ml-2 font-medium text-success">
                    {formatMuskBucks(pvpWager * 2)}
                  </span>
                </div>
                <div>
                  <span className="text-tertiary">Status:</span>
                  <span className="ml-2 font-medium text-warning">Waiting for opponent</span>
                </div>
              </div>
            </div>

            {/* Elo Impact */}
            <EloPredictionCard
              wagerAmount={pvpWager}
              opponentType="pvp"
              hideInfoFooter={false}
              hideLockButton={true}
            />
          </div>
        )}

        {/* ============================================ */}
        {/* Navigation Buttons                          */}
        {/* ============================================ */}
        <div className="flex justify-between items-center pt-2 border-t border-muted">
          {/* Back Button */}
          {currentStep > 1 ? (
            <button
              onClick={goToPreviousStep}
              className="px-4 py-2 bg-muted/20 text-content rounded-lg hover:bg-muted/30 transition-all cursor-pointer"
            >
              ← Back
            </button>
          ) : (
            <div></div>
          )}

          {/* Next / Confirm Button */}
          {currentStep < totalSteps ? (
            <button
              onClick={goToNextStep}
              disabled={variant === 'ai' && currentStep === 2 && aiWager === 0}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={variant === 'ai' ? handleCreateAI : handleCreatePVP}
              className="px-6 py-2 bg-gradient-to-r from-primary to-accent text-white rounded-lg transition-all font-bold cursor-pointer hover:shadow-lg"
            >
              {variant === 'ai' ? '🚀 Start AI Match' : '🎯 Create PVP Lobby'}
            </button>
          )}
        </div>
      </div>
    </BaseModal>
  );
}
