// apps/client/src/components/dashboard/discovery/PredictionSectionCard.tsx
import { useState } from 'react';
import type { PredictionSection, EnhancedPrediction } from '../../../hooks/usePredictionDiscovery';
import UnifiedPredictionCard from '../../UnifiedPredictionCard';

interface PredictionSectionCardProps {
  section: PredictionSection;
  onFavoriteToggle: (predictionId: number) => void;
  onMarkViewed: (predictionId: number) => void;
  className?: string;
}

export default function PredictionSectionCard({
  section,
  onFavoriteToggle,
  onMarkViewed,
  className = '',
}: PredictionSectionCardProps) {
  const [isExpanded, setIsExpanded] = useState(
    section.id === 'personalized' || section.id === 'all',
  );
  const [showAll, setShowAll] = useState(false);

  const displayedPredictions = showAll ? section.predictions : section.predictions.slice(0, 3);
  const hasMore = section.predictions.length > 3;

  if (section.predictions.length === 0) {
    return null;
  }

  const getRecommendationBadge = (prediction: EnhancedPrediction) => {
    if (!prediction.recommendation) return null;

    const { score, reasons: _reasons } = prediction.recommendation;

    if (score >= 80) {
      return (
        <div className="flex items-center space-x-1 text-xs">
          <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
            🎯 Perfect Match
          </span>
        </div>
      );
    } else if (score >= 60) {
      return (
        <div className="flex items-center space-x-1 text-xs">
          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full">⭐ Great Pick</span>
        </div>
      );
    } else if (score >= 40) {
      return (
        <div className="flex items-center space-x-1 text-xs">
          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full">
            📈 Good Option
          </span>
        </div>
      );
    }

    return null;
  };

  const getUrgencyIndicator = (prediction: EnhancedPrediction) => {
    if (!prediction.recommendation?.timing) return null;

    const { urgency, timeRemaining } = prediction.recommendation.timing;
    const hoursLeft = timeRemaining / (1000 * 60 * 60);

    if (urgency === 'high') {
      return (
        <div className="flex items-center space-x-1 text-xs text-red-600">
          <span>⚡</span>
          <span>Ending in {Math.ceil(hoursLeft)}h</span>
        </div>
      );
    } else if (urgency === 'medium') {
      return (
        <div className="flex items-center space-x-1 text-xs text-orange-600">
          <span>⏰</span>
          <span>{Math.ceil(hoursLeft)}h left</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`bg-background/50 rounded-xl border border-muted overflow-hidden ${className}`}>
      {/* Section Header */}
      <div className="p-4 border-b border-muted">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-xl">{section.icon}</span>
            <div>
              <h3 className="font-semibold text-content">{section.title}</h3>
              <p className="text-sm text-tertiary">
                {section.count} prediction{section.count !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 hover:bg-surface rounded-lg transition-colors"
          >
            <span className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
        </div>

        {/* Section Description */}
        {section.id === 'personalized' && (
          <p className="text-xs text-tertiary mt-2">
            Tailored recommendations based on your betting history and preferences
          </p>
        )}
        {section.id === 'trending' && (
          <p className="text-xs text-tertiary mt-2">
            Predictions with rapidly increasing betting activity
          </p>
        )}
        {section.id === 'ending_soon' && (
          <p className="text-xs text-tertiary mt-2">
            Time-sensitive predictions closing within hours
          </p>
        )}
        {section.id === 'hot' && (
          <p className="text-xs text-tertiary mt-2">
            High-activity predictions with lots of engagement
          </p>
        )}
      </div>

      {/* Predictions List */}
      {isExpanded && (
        <div className="p-4">
          <div className="space-y-4">
            {displayedPredictions.map((prediction) => (
              <div key={prediction.id} className="relative">
                {/* Enhancement Badges */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {prediction.isNew && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        ✨ New
                      </span>
                    )}
                    {getRecommendationBadge(prediction)}
                  </div>

                  <div className="flex items-center space-x-2">
                    {getUrgencyIndicator(prediction)}
                    <button
                      onClick={() => onFavoriteToggle(prediction.id)}
                      className={`p-1 rounded transition-colors ${
                        prediction.isFavorited
                          ? 'text-red-500 hover:text-red-600'
                          : 'text-tertiary hover:text-red-500'
                      }`}
                    >
                      {prediction.isFavorited ? '❤️' : '🤍'}
                    </button>
                  </div>
                </div>

                {/* Prediction Card */}
                <div
                  className="transform transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => onMarkViewed(prediction.id)}
                >
                  <UnifiedPredictionCard
                    prediction={prediction}
                    variant="compact"
                    showParlayActions={true}
                    showBetsList={false}
                    className="shadow-sm hover:shadow-md transition-shadow"
                  />
                </div>

                {/* Recommendation Reasons */}
                {prediction.recommendation && prediction.recommendation.reasons.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {prediction.recommendation.reasons.map((reason, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-surface text-tertiary text-xs rounded border border-muted"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                )}

                {/* Social Proof Indicators */}
                {prediction.recommendation && (
                  <div className="mt-2 flex items-center space-x-4 text-xs text-tertiary">
                    <div className="flex items-center space-x-1">
                      <span>📊</span>
                      <span>
                        Activity: {prediction.recommendation.socialProof.popularityScore}%
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span>⚡</span>
                      <span>
                        Velocity: {prediction.recommendation.socialProof.bettingVelocity}%
                      </span>
                    </div>
                    {prediction.recommendation.socialProof.controversyLevel > 50 && (
                      <div className="flex items-center space-x-1">
                        <span>🗯️</span>
                        <span>Controversial</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Show More/Less Button */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-4 py-2 bg-surface border border-muted rounded-lg text-content hover:bg-surface/80 transition-colors"
              >
                {showAll ? 'Show Less' : `Show ${section.predictions.length - 3} More`}
              </button>
            </div>
          )}

          {/* Empty State */}
          {displayedPredictions.length === 0 && (
            <div className="text-center py-8 text-tertiary">
              <div className="text-4xl mb-2">🔍</div>
              <p>No predictions match your current filters</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
