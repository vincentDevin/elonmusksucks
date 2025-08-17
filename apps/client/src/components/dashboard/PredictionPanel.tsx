// apps/client/src/components/dashboard/PredictionPanel.tsx
import { useState } from 'react';
import { usePredictionDiscovery } from '../../hooks/usePredictionDiscovery';
import PredictionFilters from './discovery/PredictionFilters';
import PredictionSectionCard from './discovery/PredictionSectionCard';
import UnifiedPredictionCard from '../UnifiedPredictionCard';

type ViewMode = 'sections' | 'all';

export default function PredictionPanel() {
  const [viewMode, setViewMode] = useState<ViewMode>('sections');
  const {
    predictionSections,
    enhancedPredictions,
    filters,
    availableCategories,
    loading,
    error,
    updateFilters,
    clearFilters,
    toggleFavorite,
    markAsViewed,
  } = usePredictionDiscovery();

  if (loading) {
    return (
      <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-content">Smart Prediction Discovery</h2>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <span className="ml-3 text-tertiary">Loading predictions...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-content">Smart Prediction Discovery</h2>
        <div className="text-center py-8">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-500 mb-4">Error: {String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </section>
    );
  }

  const totalPredictions = enhancedPredictions.length;
  const activeSections = predictionSections.filter((section) => section.count > 0);

  return (
    <section className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-content flex items-center">
            <span className="mr-2">🎯</span>
            Smart Prediction Discovery
          </h2>
          <p className="text-sm text-tertiary mt-1">
            {totalPredictions} prediction{totalPredictions !== 1 ? 's' : ''} available
          </p>
        </div>

        <div className="flex bg-background rounded-lg p-1 border border-muted">
          <button
            onClick={() => setViewMode('sections')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'sections'
                ? 'bg-primary text-white shadow-sm'
                : 'text-tertiary hover:text-content'
            }`}
          >
            Sections
          </button>
          <button
            onClick={() => setViewMode('all')}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'all'
                ? 'bg-primary text-white shadow-sm'
                : 'text-tertiary hover:text-content'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <PredictionFilters
          filters={filters}
          availableCategories={availableCategories}
          onFiltersChange={updateFilters}
          onClearFilters={clearFilters}
        />
      </div>

      {/* Content */}
      <div className="space-y-6">
        {totalPredictions === 0 ? (
          <div className="text-center py-12 text-tertiary">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-content mb-2">No predictions found</h3>
            <p className="mb-4">
              Try adjusting your filters or check back later for new predictions.
            </p>
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Clear Filters
            </button>
          </div>
        ) : viewMode === 'sections' ? (
          /* Sections View */
          <div className="space-y-6">
            {activeSections.map((section) => (
              <PredictionSectionCard
                key={section.id}
                section={section}
                onFavoriteToggle={toggleFavorite}
                onMarkViewed={markAsViewed}
              />
            ))}
          </div>
        ) : (
          /* All Predictions View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-content">All Predictions ({totalPredictions})</h3>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 pr-2">
              {enhancedPredictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="bg-background/50 rounded-xl border border-muted overflow-hidden"
                >
                  <div className="p-4">
                    <UnifiedPredictionCard
                      prediction={prediction}
                      variant="compact"
                      showParlayActions={true}
                      showBetsList={false}
                      hideInlineParlaySelector={true}
                      className="shadow-sm hover:shadow-md transition-shadow"
                      onCardView={() => markAsViewed(prediction.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Quick Stats Footer */}
      {activeSections.length > 0 && viewMode === 'sections' && (
        <div className="mt-6 pt-6 border-t border-muted">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            {activeSections.slice(0, 4).map((section) => (
              <div key={section.id} className="space-y-1">
                <div className="text-lg">{section.icon}</div>
                <div className="text-sm font-medium text-content">{section.count}</div>
                <div className="text-xs text-tertiary">{section.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
