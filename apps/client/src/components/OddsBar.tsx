// apps/client/src/components/OddsBar.tsx
import { useState, useEffect } from 'react';
import type { PublicPredictionOption, PublicBet } from '@ems/types';
import { PredictionType } from '@ems/types';
import { useSocket } from '../contexts/SocketContext';

// match your flattened shape
interface FlattenedParlayLeg {
  parlayId: number;
  user: { id: number; name: string };
  stake: number;
  optionId: number;
  createdAt: string;
}

interface OddsBarProps {
  type: PredictionType;
  options: PublicPredictionOption[];
  bets?: PublicBet[];
  parlayLegs?: FlattenedParlayLeg[];
  predictionId?: number;
  expiresAt?: string;
}

export default function OddsBar({ type, options, bets = [], parlayLegs = [], predictionId, expiresAt }: OddsBarProps) {
  const { socket } = useSocket();
  const [currentOptions, setCurrentOptions] = useState(options);
  const [oddsAnimations, setOddsAnimations] = useState<Record<number, 'up' | 'down' | null>>({});
  const [hotMarket, setHotMarket] = useState(false);
  // 🎧 Listen for enhanced odds updates
  useEffect(() => {
    if (!socket || !predictionId) return;

    const handleEnhancedOddsUpdate = (data: { 
      predictionId: number; 
      hotMarket: boolean; 
      options: Array<{ id: number; odds: number; label: string; change: number; changePercent: number }> 
    }) => {
      if (data.predictionId === predictionId) {
        // Update options with new odds
        const updatedOptions = currentOptions.map(option => {
          const updated = data.options.find(opt => opt.id === option.id);
          if (updated) {
            // Track animation direction
            if (updated.odds !== option.odds) {
              setOddsAnimations(prev => ({
                ...prev,
                [option.id]: updated.odds > option.odds ? 'up' : 'down'
              }));
              
              // Clear animation after 2 seconds
              setTimeout(() => {
                setOddsAnimations(prev => ({ ...prev, [option.id]: null }));
              }, 2000);
            }
            
            return { ...option, odds: updated.odds };
          }
          return option;
        });
        
        setCurrentOptions(updatedOptions);
        setHotMarket(data.hotMarket || false);
      }
    };

    socket.on('oddsUpdatedEnhanced', handleEnhancedOddsUpdate);
    return () => socket.off('oddsUpdatedEnhanced', handleEnhancedOddsUpdate);
  }, [socket, predictionId, currentOptions]);

  // 🔥 Calculate excitement level based on various factors
  const getExcitementLevel = () => {
    const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0) + 
                      parlayLegs.reduce((sum, leg) => sum + leg.stake, 0);
    const timeLeft = expiresAt ? (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60) : 24;
    const recentActivity = bets.filter(bet => 
      new Date(bet.createdAt).getTime() > Date.now() - 10 * 60 * 1000
    ).length + parlayLegs.filter(leg => 
      new Date(leg.createdAt).getTime() > Date.now() - 10 * 60 * 1000
    ).length;

    if (hotMarket || (recentActivity >= 5 && timeLeft <= 2)) return 'blazing'; // 🔥🔥🔥
    if ((hotMarket && recentActivity >= 2) || (recentActivity >= 3 && timeLeft <= 6) || totalPool > 2000) return 'hot'; // 🔥🔥
    if (recentActivity >= 2 || timeLeft <= 24 || totalPool > 500) return 'warm'; // 🔥
    return 'normal';
  };

  const excitementLevel = getExcitementLevel();

  // define three palettes with excitement-based styling
  const palettes: Record<PredictionType, string[]> = {
    [PredictionType.BINARY]: ['bg-green-600', 'bg-red-600'],
    [PredictionType.OVER_UNDER]: ['bg-purple-600', 'bg-indigo-600'],
    [PredictionType.MULTIPLE]: ['bg-blue-600', 'bg-green-600', 'bg-yellow-600', 'bg-red-600'],
  };

  // pick the right palette (or fall back to multiple)
  const palette = palettes[type] ?? palettes[PredictionType.MULTIPLE];

  // compute total staked
  const totalStaked =
    bets.reduce((sum, b) => sum + b.amount, 0) + parlayLegs.reduce((sum, l) => sum + l.stake, 0);

  if (totalStaked === 0 || currentOptions.length === 0) {
    return (
      <div className="mt-3">
        <p className="text-sm italic text-tertiary mb-2">No bets placed yet!</p>
        {/* Show default odds for new predictions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {currentOptions.map((option) => (
            <div
              key={option.id}
              className="relative p-3 rounded-lg border-2 border-muted bg-surface hover:shadow-md transition-all duration-300"
            >
              <div className="font-semibold text-lg">{option.label}</div>
              <div className="text-2xl font-bold text-blue-600">
                {option.odds.toFixed(2)}x
              </div>
              <div className="text-xs text-tertiary mt-1">🎯 Early Bird Bonus Available!</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // build the slices for the pool visualization
  let cumPct = 0;
  const pools = currentOptions.slice(0, palette.length).map((opt, i) => {
    const singles = bets.filter((b) => b.optionId === opt.id).reduce((s, b) => s + b.amount, 0);
    const parlays = parlayLegs
      .filter((l) => l.optionId === opt.id)
      .reduce((s, l) => s + l.stake, 0);
    const stake = singles + parlays;
    const pct = stake / totalStaked;
    const left = cumPct;
    cumPct += pct;
    return { label: opt.label, pct, left, color: palette[i], odds: opt.odds };
  });

  return (
    <div className={`mt-3 transition-all duration-300 ${
      excitementLevel === 'blazing' ? 'ring-2 ring-red-600 ring-opacity-50 bg-red-600/5' :
      excitementLevel === 'hot' ? 'ring-2 ring-orange-600 ring-opacity-50 bg-orange-600/5' :
      excitementLevel === 'warm' ? 'ring-2 ring-yellow-600 ring-opacity-50 bg-yellow-600/5' :
      ''
    } p-3 rounded-lg`}>
      
      {/* 🔥 Market Heat Indicator */}
      {excitementLevel !== 'normal' && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-lg animate-pulse">
              {excitementLevel === 'blazing' ? '🔥🔥🔥' : 
               excitementLevel === 'hot' ? '🔥🔥' : '🔥'}
            </span>
            <span className={`text-sm font-semibold ${
              excitementLevel === 'blazing' ? 'text-red-600' :
              excitementLevel === 'hot' ? 'text-orange-600' :
              'text-yellow-600'
            }`}>
              {excitementLevel === 'blazing' ? 'BLAZING HOT MARKET!' :
               excitementLevel === 'hot' ? 'HOT MARKET!' :
               'WARMING UP!'}
            </span>
          </div>
          {hotMarket && (
            <span className="px-2 py-1 bg-red-600/20 text-red-600 text-xs rounded-full font-semibold animate-pulse">
              🚀 LIVE ODDS CHANGING
            </span>
          )}
        </div>
      )}

      {/* Enhanced Odds Display Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {currentOptions.map((option) => {
          const animation = oddsAnimations[option.id];
          const optionStake = bets.filter(b => b.optionId === option.id).reduce((s, b) => s + b.amount, 0) +
                             parlayLegs.filter(l => l.optionId === option.id).reduce((s, l) => s + l.stake, 0);
          const marketShare = optionStake / totalStaked;
          
          return (
            <div
              key={option.id}
              className={`relative p-3 rounded-lg border-2 transition-all duration-300 ${
                excitementLevel === 'blazing' ? 'border-red-600 bg-red-600/5 shadow-lg shadow-red-600/20' :
                excitementLevel === 'hot' ? 'border-orange-600 bg-orange-600/5 shadow-md shadow-orange-600/20' :
                excitementLevel === 'warm' ? 'border-yellow-600 bg-yellow-600/5 shadow-sm shadow-yellow-600/20' :
                'border-muted bg-surface'
              } hover:scale-105`}
            >
              
              {/* Option Label */}
              <div className="font-semibold text-lg">{option.label}</div>
              
              {/* Animated Odds Display */}
              <div className={`text-2xl font-bold transition-all duration-500 ${
                animation === 'up' ? 'text-green-600 scale-110' :
                animation === 'down' ? 'text-red-600 scale-110' :
                'text-blue-600'
              }`}>
                {option.odds.toFixed(2)}x
                
                {/* 📈 Change Indicator */}
                {animation && (
                  <span className={`ml-2 text-sm ${
                    animation === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {animation === 'up' ? '↗️' : '↘️'}
                  </span>
                )}
              </div>
              
              {/* Market Share */}
              <div className="text-xs text-tertiary mt-1">
                {(marketShare * 100).toFixed(1)}% of pool
              </div>
              
              {/* 🎯 Excitement Badges */}
              <div className="flex gap-1 mt-2 flex-wrap">
                {option.odds > 5.0 && (
                  <span className="px-2 py-1 bg-purple-600/20 text-purple-600 text-xs rounded-full font-semibold">
                    🎯 UNDERDOG
                  </span>
                )}
                {marketShare < 0.1 && option.odds > 3.0 && (
                  <span className="px-2 py-1 bg-yellow-600/20 text-yellow-600 text-xs rounded-full font-semibold">
                    ⚡ HERO BONUS
                  </span>
                )}
                {excitementLevel === 'blazing' && (
                  <span className="px-2 py-1 bg-red-600/20 text-red-600 text-xs rounded-full font-semibold animate-pulse">
                    🔥 HOT
                  </span>
                )}
                {/* 🚀 ALL-IN BONUS */}
                {option.odds > 10 && (
                  <span className="px-2 py-1 bg-gradient-to-r from-red-500 to-yellow-500 text-white text-xs rounded-full font-semibold animate-pulse">
                    🚀 ALL-IN BONUS
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Traditional Pool Bar (smaller now) */}
      <div className="mt-2">
        <div className="text-xs text-tertiary mb-1">Pool Distribution</div>
        <div className="relative w-full h-2 bg-muted rounded-full overflow-hidden">
          {pools.map((p) => (
            <div
              key={p.label}
              className={`absolute top-0 h-full ${p.color}`}
              style={{ left: `${p.left * 100}%`, width: `${p.pct * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
