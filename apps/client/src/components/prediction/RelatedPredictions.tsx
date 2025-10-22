import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatMuskBucks } from '../../utils/formatting';
import type { PredictionFull } from '@ems/types';
import { useParlay } from '../../contexts/ParlayContext';
import {
  ArrowTrendingUpIcon as TrendingUp,
  ClockIcon as Clock,
  UsersIcon as Users,
  CurrencyDollarIcon as DollarSign,
  ArrowRightIcon as ArrowRight,
  EyeIcon as Target,
  Squares2X2Icon as Layers,
  StarIcon as Star,
  ChevronRightIcon as ChevronRight,
} from '@heroicons/react/24/outline';
import PredictionCard from './PredictionCard';

interface RelatedPredictionsProps {
  currentPrediction: PredictionFull;
  allPredictions?: PredictionFull[];
  className?: string;
  maxSuggestions?: number;
  showCompactView?: boolean;
}

interface RelatedPrediction extends PredictionFull {
  relationReason: 'category' | 'creator' | 'trending' | 'parlay' | 'timeframe' | 'similar';
  relationScore: number;
  relationText: string;
}

const asNum = (v: string | number | bigint | undefined | null) => Number(v ?? 0);

export default function RelatedPredictions({
  currentPrediction,
  allPredictions = [],
  className = '',
  maxSuggestions = 6,
  showCompactView = false,
}: RelatedPredictionsProps) {
  const navigate = useNavigate();
  const { state: parlayState, dispatch: parlayDispatch } = useParlay();
  const [activeTab, setActiveTab] = useState<'suggested' | 'category' | 'trending' | 'parlay'>(
    'suggested',
  );

  // Calculate related predictions
  const relatedPredictions = useMemo(() => {
    const now = Date.now();
    const currentExpires = new Date(currentPrediction.expiresAt).getTime();

    const suggestions: RelatedPrediction[] = [];

    allPredictions.forEach((prediction) => {
      if (prediction.id === currentPrediction.id) return;

      let relationScore = 0;
      let relationReason: RelatedPrediction['relationReason'] = 'similar';
      let relationText = '';

      // Skip resolved predictions unless specified
      if (prediction.resolved && activeTab !== 'trending') return;

      // Same category (high score)
      if (prediction.categoryId === currentPrediction.categoryId) {
        relationScore += 40;
        relationReason = 'category';
        relationText = `Same category: ${prediction.category?.name || prediction.categoryId}`;
      }

      // Same creator (medium score)
      if (prediction.creatorId === currentPrediction.creatorId) {
        relationScore += 30;
        relationReason = 'creator';
        relationText = 'Same creator';
      }

      // Similar timeframe (low score)
      const predExpires = new Date(prediction.expiresAt).getTime();
      const timeDiff = Math.abs(predExpires - currentExpires);
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      if (daysDiff <= 7) {
        relationScore += 20;
        if (relationScore < 40) {
          relationReason = 'timeframe';
          relationText = `Expires within ${Math.ceil(daysDiff)} days`;
        }
      }

      // High activity (trending)
      const predBets = prediction.bets.length + (prediction.parlayLegs?.length || 0);
      const currentBets =
        currentPrediction.bets.length + (currentPrediction.parlayLegs?.length || 0);
      if (predBets > currentBets && predBets > 10) {
        relationScore += 25;
        if (relationScore < 40) {
          relationReason = 'trending';
          relationText = `${predBets} total bets`;
        }
      }

      // Good parlay candidate
      const isInParlay = parlayState.legs.some((leg) => leg.predictionId === prediction.id);
      const currentInParlay = parlayState.legs.some(
        (leg) => leg.predictionId === currentPrediction.id,
      );
      if (!isInParlay && currentInParlay) {
        relationScore += 35;
        relationReason = 'parlay';
        relationText = 'Great for your parlay';
      }

      // Recent activity bonus
      const recentBets = prediction.bets.filter(
        (bet) => new Date(bet.createdAt).getTime() > now - 24 * 60 * 60 * 1000,
      );
      if (recentBets.length > 0) {
        relationScore += 15;
      }

      // Only include if above threshold
      if (relationScore >= 20) {
        suggestions.push({
          ...prediction,
          relationReason,
          relationScore,
          relationText,
        });
      }
    });

    // Sort by relation score and limit
    return suggestions.sort((a, b) => b.relationScore - a.relationScore).slice(0, maxSuggestions);
  }, [allPredictions, currentPrediction, activeTab, parlayState.legs, maxSuggestions]);

  // Filter by active tab
  const filteredPredictions = useMemo(() => {
    switch (activeTab) {
      case 'category':
        return relatedPredictions.filter((p) => p.relationReason === 'category');
      case 'trending':
        return relatedPredictions.filter((p) => p.relationReason === 'trending');
      case 'parlay':
        return relatedPredictions.filter((p) => p.relationReason === 'parlay');
      default:
        return relatedPredictions;
    }
  }, [relatedPredictions, activeTab]);

  const handlePredictionClick = (predictionId: number) => {
    navigate(`/predictions/${predictionId}`);
  };

  const handleAddToParlay = (prediction: PredictionFull, optionId: number) => {
    const option = prediction.options.find((o) => o.id === optionId);
    if (!option) return;

    parlayDispatch({
      type: 'ADD_LEG',
      leg: {
        predictionId: prediction.id,
        optionId,
        label: option.label,
        predictionTitle: prediction.title,
        odds: option.odds,
      },
    });
  };

  const getRelationIcon = (reason: RelatedPrediction['relationReason']) => {
    switch (reason) {
      case 'category':
        return <Target className="w-4 h-4 text-primary" />;
      case 'creator':
        return <Users className="w-4 h-4 text-secondary" />;
      case 'trending':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'parlay':
        return <Layers className="w-4 h-4 text-warning" />;
      case 'timeframe':
        return <Clock className="w-4 h-4 text-info" />;
      default:
        return <Star className="w-4 h-4 text-tertiary" />;
    }
  };

  const getRelationColor = (reason: RelatedPrediction['relationReason']) => {
    switch (reason) {
      case 'category':
        return 'bg-primary/10 text-primary border-primary/20';
      case 'creator':
        return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'trending':
        return 'bg-success/10 text-success border-success/20';
      case 'parlay':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'timeframe':
        return 'bg-info/10 text-info border-info/20';
      default:
        return 'bg-muted/10 text-tertiary border-muted/20';
    }
  };

  if (relatedPredictions.length === 0) {
    return (
      <div className={`bg-surface border border-border rounded-xl p-6 text-center ${className}`}>
        <div className="text-4xl mb-3">🔍</div>
        <h3 className="text-lg font-semibold text-content mb-2">No Related Predictions</h3>
        <p className="text-tertiary">
          We couldn't find any related predictions at the moment. Check back later!
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-surface border border-border rounded-xl ${className}`}>
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-content flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Related Predictions
          </h3>
          <button
            onClick={() => navigate('/predictions')}
            className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
          >
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex overflow-x-auto pb-2">
          {[
            { id: 'suggested', label: 'Suggested', icon: <Star className="w-4 h-4" /> },
            { id: 'category', label: 'Category', icon: <Target className="w-4 h-4" /> },
            { id: 'trending', label: 'Trending', icon: <TrendingUp className="w-4 h-4" /> },
            { id: 'parlay', label: 'For Parlay', icon: <Layers className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium
                whitespace-nowrap transition-colors mr-2
                ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-tertiary hover:text-content hover:bg-muted/50'
                }
              `}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {showCompactView ? (
          // Compact grid view
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPredictions.slice(0, 4).map((prediction) => {
              const totalBets = prediction.bets.length + (prediction.parlayLegs?.length || 0);
              const totalVolume =
                prediction.bets.reduce((sum, bet) => sum + asNum(bet.amount), 0) +
                (prediction.parlayLegs?.reduce((sum, leg) => sum + asNum(leg.stake), 0) || 0);

              return (
                <div
                  key={prediction.id}
                  className="border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => handlePredictionClick(prediction.id)}
                >
                  {/* Relation Badge */}
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border mb-3 ${getRelationColor(prediction.relationReason)}`}
                  >
                    {getRelationIcon(prediction.relationReason)}
                    {prediction.relationText}
                  </div>

                  <h4 className="font-medium text-content line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {prediction.title}
                  </h4>

                  <div className="flex items-center gap-4 text-sm text-tertiary mb-3">
                    <div className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {totalBets}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      {formatMuskBucks(totalVolume)} 🪙
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    {prediction.category && (
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs inline-flex items-center gap-1">
                        {prediction.category.icon && <span>{prediction.category.icon}</span>}
                        <span>{prediction.category.name}</span>
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-tertiary group-hover:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // Full card view
          <div className="space-y-4">
            {filteredPredictions.map((prediction) => (
              <div key={prediction.id} className="relative">
                {/* Relation Badge */}
                <div
                  className={`absolute top-4 left-4 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getRelationColor(prediction.relationReason)}`}
                >
                  {getRelationIcon(prediction.relationReason)}
                  {prediction.relationText}
                </div>

                <PredictionCard
                  prediction={prediction}
                  variant="list"
                  showActions={true}
                  showParlayActions={true}
                  onCardView={() => handlePredictionClick(prediction.id)}
                  onAddToParlay={handleAddToParlay}
                  className="hover:shadow-lg transition-shadow pl-32"
                />
              </div>
            ))}
          </div>
        )}

        {filteredPredictions.length === 0 && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">
              {activeTab === 'category' && '🏷️'}
              {activeTab === 'trending' && '📈'}
              {activeTab === 'parlay' && '🎯'}
              {activeTab === 'suggested' && '💡'}
            </div>
            <p className="text-tertiary">
              {activeTab === 'category' && 'No predictions in the same category'}
              {activeTab === 'trending' && 'No trending predictions right now'}
              {activeTab === 'parlay' && 'No good parlay candidates available'}
              {activeTab === 'suggested' && 'No suggestions available'}
            </p>
          </div>
        )}
      </div>

      {/* Footer with action */}
      {filteredPredictions.length > 0 && (
        <div className="p-4 border-t border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="text-sm text-tertiary">
              Showing {filteredPredictions.length} of {relatedPredictions.length} related
              predictions
            </div>
            <button
              onClick={() =>
                navigate('/predictions', {
                  state: {
                    categoryId: currentPrediction.categoryId,
                    excludeId: currentPrediction.id,
                  },
                })
              }
              className="text-sm text-primary hover:text-primary-hover flex items-center gap-1"
            >
              Explore More
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
