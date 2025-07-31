// apps/client/src/components/CompactOddsBar.tsx
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

interface CompactOddsBarProps {
  type: PredictionType;
  options: PublicPredictionOption[];
  bets?: PublicBet[];
  parlayLegs?: FlattenedParlayLeg[];
  predictionId?: number;
  expiresAt?: string;
}

export default function CompactOddsBar({ type, options, bets = [], parlayLegs = [], predictionId, expiresAt }: CompactOddsBarProps) {
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
              
              // Clear animation after 1.5 seconds (faster for compact)
              setTimeout(() => {
                setOddsAnimations(prev => ({ ...prev, [option.id]: null }));
              }, 1500);
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

  // compute total staked
  const totalStaked =
    bets.reduce((sum, b) => sum + b.amount, 0) + parlayLegs.reduce((sum, l) => sum + l.stake, 0);

  if (totalStaked === 0 || currentOptions.length === 0) {
    return (
      <div className="mt-2">
        <p className="text-xs italic text-tertiary mb-2">No bets yet</p>
        {/* Compact grid for new predictions */}
        <div className="grid grid-cols-2 gap-2">
          {currentOptions.map((option) => (
            <div
              key={option.id}
              className="relative p-2 rounded-md border border-muted bg-surface hover:shadow-sm transition-all duration-300"
            >
              <div className="text-sm font-semibold truncate text-content">{option.label}</div>
              <div className="text-lg font-bold text-primary">
                {option.odds.toFixed(1)}x
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`mt-2 transition-all duration-300 ${
      excitementLevel === 'blazing' ? 'ring-1 ring-red-500 bg-red-500/10' :
      excitementLevel === 'hot' ? 'ring-1 ring-orange-500 bg-orange-500/10' :
      excitementLevel === 'warm' ? 'ring-1 ring-yellow-500 bg-yellow-500/10' :
      ''
    } p-2 rounded-md`}>
      
      {/* 🔥 Compact Market Heat Indicator */}
      {excitementLevel !== 'normal' && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm animate-pulse">
            {excitementLevel === 'blazing' ? '🔥🔥' : 
             excitementLevel === 'hot' ? '🔥' : '🟡'}
          </span>
          {hotMarket && (
            <span className="px-1 py-0.5 bg-red-600/20 text-red-600 text-xs rounded font-semibold animate-pulse">
              LIVE
            </span>
          )}
        </div>
      )}

      {/* Compact Odds Display - Horizontal Row */}
      <div className="grid grid-cols-2 gap-2">
        {currentOptions.map((option) => {
          const animation = oddsAnimations[option.id];
          const optionStake = bets.filter(b => b.optionId === option.id).reduce((s, b) => s + b.amount, 0) +
                             parlayLegs.filter(l => l.optionId === option.id).reduce((s, l) => s + l.stake, 0);
          const marketShare = optionStake / totalStaked;
          
          return (
            <div
              key={option.id}
              className={`relative p-2 rounded-md border transition-all duration-300 ${
                excitementLevel === 'blazing' ? 'border-red-300 bg-red-500/5' :
                excitementLevel === 'hot' ? 'border-orange-300 bg-orange-500/5' :
                excitementLevel === 'warm' ? 'border-yellow-300 bg-yellow-500/5' :
                'border-muted bg-surface'
              } hover:scale-102`}
            >
              
              {/* Option Label */}
              <div className="text-sm font-semibold truncate text-content">{option.label}</div>
              
              {/* Compact Odds Display */}
              <div className="flex items-center justify-between">
                <div className={`text-lg font-bold transition-all duration-500 ${
                  animation === 'up' ? 'text-green-600 scale-110' :
                  animation === 'down' ? 'text-red-600 scale-110' :
                  'text-primary'
                }`}>
                  {option.odds.toFixed(1)}x
                  
                  {/* 📈 Compact Change Indicator */}
                  {animation && (
                    <span className={`ml-1 text-xs ${
                      animation === 'up' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {animation === 'up' ? '↗' : '↘'}
                    </span>
                  )}
                </div>
                
                {/* Market Share */}
                <div className="text-xs text-tertiary">
                  {(marketShare * 100).toFixed(0)}%
                </div>
              </div>
              
              {/* 🎯 Compact Excitement Badges */}
              <div className="flex gap-1 mt-1">
                {option.odds > 5.0 && (
                  <span className="px-1 py-0.5 bg-purple-600/20 text-purple-600 text-xs rounded font-semibold">
                    🎯
                  </span>
                )}
                {marketShare < 0.1 && option.odds > 3.0 && (
                  <span className="px-1 py-0.5 bg-yellow-600/20 text-yellow-600 text-xs rounded font-semibold">
                    ⚡
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}