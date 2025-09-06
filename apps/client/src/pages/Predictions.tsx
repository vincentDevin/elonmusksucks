// apps/client/src/pages/Predictions.tsx
// -----------------------------------------------------------------------------
// Modern AI-powered predictions marketplace with advanced discovery system.
// Uses sophisticated filtering, personalized recommendations, and smart sections.
// Replaces basic tab system with AI-driven prediction organization.
// -----------------------------------------------------------------------------

import { useState, useEffect, useCallback } from 'react';

import CreatePredictionForm from '../components/CreatePredictionForm';
import PredictionCard from '../components/PredictionCard';
import PredictionFilters from '../components/dashboard/discovery/PredictionFilters';
import PredictionSectionCard from '../components/dashboard/discovery/PredictionSectionCard';

import { usePredictionDiscovery } from '../hooks/usePredictionDiscovery';
import { usePredictionMarket } from '../contexts/PredictionContext';
import { useSocket } from '../contexts/SocketContext';

type ViewMode = 'sections' | 'list' | 'grid';

export default function Predictions() {
  const { createPrediction } = usePredictionMarket();
  const socket = useSocket();

  // AI-powered discovery system
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
    favorites,
  } = usePredictionDiscovery();

  const [creating, setCreating] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('sections');
  const [liveUpdates, setLiveUpdates] = useState<{ [key: string]: any }>({});
  const [newPredictionCount, setNewPredictionCount] = useState(0);
  const [hotMarketAlerts, setHotMarketAlerts] = useState<number[]>([]);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Real-time event handlers
  const handleNewPrediction = useCallback((data: { id: number; title: string }) => {
    console.log('New prediction created:', data);
    setNewPredictionCount((prev) => prev + 1);

    // Show notification for new predictions
    const notification = {
      type: 'new_prediction',
      title: '🎯 New Prediction Available!',
      message: `"${data.title}" just added to the marketplace`,
      timestamp: Date.now(),
    };

    // Add to live updates
    setLiveUpdates((prev) => ({
      ...prev,
      [`new_${data.id}`]: notification,
    }));

    // Remove notification after 10 seconds
    setTimeout(() => {
      setLiveUpdates((prev) => {
        const updated = { ...prev };
        delete updated[`new_${data.id}`];
        return updated;
      });
    }, 10000);
  }, []);

  const handleHotMarket = useCallback(
    (data: { predictionId: number; title: string }) => {
      console.log('Hot market detected:', data);

      if (!hotMarketAlerts.includes(data.predictionId)) {
        setHotMarketAlerts((prev) => [...prev, data.predictionId]);

        const notification = {
          type: 'hot_market',
          title: '🔥 Hot Market Alert!',
          message: `"${data.title}" is trending with rapid betting activity`,
          predictionId: data.predictionId,
          timestamp: Date.now(),
        };

        setLiveUpdates((prev) => ({
          ...prev,
          [`hot_${data.predictionId}`]: notification,
        }));

        // Remove alert after 30 seconds
        setTimeout(() => {
          setHotMarketAlerts((prev) => prev.filter((id) => id !== data.predictionId));
          setLiveUpdates((prev) => {
            const updated = { ...prev };
            delete updated[`hot_${data.predictionId}`];
            return updated;
          });
        }, 30000);
      }
    },
    [hotMarketAlerts],
  );

  const handleBetPlaced = useCallback((data: { predictionId: number; amount: number }) => {
    console.log('Bet placed:', data);

    // Update betting velocity indicators
    setLiveUpdates((prev) => ({
      ...prev,
      [`bet_${data.predictionId}_${Date.now()}`]: {
        type: 'bet_activity',
        predictionId: data.predictionId,
        amount: data.amount,
        timestamp: Date.now(),
      },
    }));
  }, []);

  const handleOddsUpdate = useCallback((data: { predictionId: number; excitement: number }) => {
    console.log('Odds updated:', data);

    // Show visual indicator for odds changes
    if (data.excitement && data.excitement > 70) {
      setLiveUpdates((prev) => ({
        ...prev,
        [`odds_${data.predictionId}`]: {
          type: 'odds_change',
          predictionId: data.predictionId,
          excitement: data.excitement,
          timestamp: Date.now(),
        },
      }));

      // Remove after 5 seconds
      setTimeout(() => {
        setLiveUpdates((prev) => {
          const updated = { ...prev };
          delete updated[`odds_${data.predictionId}`];
          return updated;
        });
      }, 5000);
    }
  }, []);

  // Socket.IO event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on('predictionCreated', handleNewPrediction);
    socket.on('hotMarketDetected', handleHotMarket);
    socket.on('betPlaced', handleBetPlaced);
    socket.on('parlayPlaced', handleBetPlaced);
    socket.on('oddsUpdatedEnhanced', handleOddsUpdate);

    return () => {
      socket.off('predictionCreated', handleNewPrediction);
      socket.off('hotMarketDetected', handleHotMarket);
      socket.off('betPlaced', handleBetPlaced);
      socket.off('parlayPlaced', handleBetPlaced);
      socket.off('oddsUpdatedEnhanced', handleOddsUpdate);
    };
  }, [socket, handleNewPrediction, handleHotMarket, handleBetPlaced, handleOddsUpdate]);

  // Clear new prediction count when user scrolls or interacts
  const clearNewPredictionCount = useCallback(() => {
    setNewPredictionCount(0);
  }, []);

  // Helper function to get prediction status info
  const getPredictionStatus = useCallback(
    (prediction: { status: string; resolved: boolean; expiresAt: string }) => {
      const now = Date.now();
      const expires = new Date(prediction.expiresAt).getTime();

      if (prediction.status === 'PENDING') {
        return {
          status: 'pending',
          label: 'Awaiting Approval',
          icon: '⏳',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          description: 'This prediction is under review by moderators',
        };
      } else if (prediction.resolved) {
        return {
          status: 'resolved',
          label: 'Resolved & Closed',
          icon: '🏁',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'This prediction has been resolved and payouts completed',
        };
      } else if (prediction.status === 'APPROVED' && now > expires) {
        return {
          status: 'expired',
          label: 'Expired - Resolving',
          icon: '⏰',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          description: 'This prediction has expired and awaits final resolution',
        };
      } else if (prediction.status === 'APPROVED' && now <= expires) {
        return {
          status: 'open',
          label: 'Live & Bettable',
          icon: '🎯',
          color: 'bg-green-100 text-green-800 border-green-200',
          description: 'You can place bets on this prediction',
        };
      } else {
        return {
          status: 'unknown',
          label: 'Unknown Status',
          icon: '❓',
          color: 'bg-gray-100 text-gray-800 border-gray-200',
          description: 'Status unclear',
        };
      }
    },
    [],
  );

  // Calculate active filters count for display (status is treated as a view, not a filter)
  const activeFiltersCount =
    filters.categories.length +
    filters.difficulties.length +
    (filters.timeRemaining !== 'all' ? 1 : 0) +
    (filters.activity !== 'all' ? 1 : 0) +
    (filters.search.length > 0 ? 1 : 0);

  // Render functions for different view modes
  const renderSectionsView = useCallback(
    () => (
      <div className="space-y-6">
        {predictionSections.map((section) => (
          <PredictionSectionCard
            key={section.id}
            section={section}
            onFavoriteToggle={toggleFavorite}
            onMarkViewed={markAsViewed}
            className="bg-surface border border-muted shadow-sm hover:shadow-md transition-shadow"
          />
        ))}

        {predictionSections.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-content mb-2">No predictions found</h3>
            <p className="text-tertiary mb-6">
              Try adjusting your filters or check back later for new predictions.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    ),
    [predictionSections, toggleFavorite, markAsViewed, clearFilters],
  );

  const renderListView = useCallback(
    () => (
      <div className="space-y-4">
        {enhancedPredictions.map((prediction) => {
          const statusInfo = getPredictionStatus(prediction);
          return (
            <div key={prediction.id} className="relative">
              {/* Prediction metadata */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {/* Status Badge */}
                  <span
                    className={`px-3 py-1 text-xs rounded-full font-semibold border ${statusInfo.color}`}
                    title={statusInfo.description}
                  >
                    {statusInfo.icon} {statusInfo.label}
                  </span>
                  {prediction.isNew && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      ✨ New
                    </span>
                  )}
                  {prediction.recommendation && prediction.recommendation.score >= 70 && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      🎯 Recommended
                    </span>
                  )}
                </div>

                <button
                  onClick={() => toggleFavorite(prediction.id)}
                  className={`p-2 rounded transition-colors ${
                    prediction.isFavorited
                      ? 'text-red-500 hover:text-red-600'
                      : 'text-tertiary hover:text-red-500'
                  }`}
                >
                  {prediction.isFavorited ? '❤️' : '🤍'}
                </button>
              </div>

              <PredictionCard
                prediction={prediction}
                variant="full"
                showActions={true}
                showBetsList={true}
                showParlayActions={false}
                onCardView={() => markAsViewed(prediction.id)}
                className="shadow-sm hover:shadow-md transition-shadow"
                addOptimisticBet={(bet) => {
                  console.log('Optimistic bet placed:', bet);
                }}
              />

              {/* AI Recommendation reasons */}
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
            </div>
          );
        })}

        {enhancedPredictions.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-content mb-2">No predictions found</h3>
            <p className="text-tertiary mb-6">
              Try adjusting your filters or check back later for new predictions.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    ),
    [enhancedPredictions, toggleFavorite, markAsViewed, clearFilters, getPredictionStatus],
  );

  const renderGridView = useCallback(
    () => (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {enhancedPredictions.map((prediction) => {
          const statusInfo = getPredictionStatus(prediction);
          return (
            <div key={prediction.id} className="relative">
              <PredictionCard
                prediction={prediction}
                variant="compact"
                showActions={true}
                showBetsList={false}
                showParlayActions={false}
                onCardView={() => markAsViewed(prediction.id)}
                className="h-full shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                addOptimisticBet={(bet) => {
                  console.log('Optimistic bet placed:', bet);
                }}
              />

              {/* Overlay badges */}
              <div className="absolute top-3 left-3 flex flex-wrap gap-1 max-w-[calc(100%-4rem)]">
                {/* Status Badge */}
                <span
                  className={`px-3 py-1 text-xs rounded-full font-semibold shadow-lg border-2 border-white/30 ${statusInfo.color}`}
                  title={statusInfo.description}
                >
                  {statusInfo.icon} {statusInfo.label}
                </span>
                {prediction.isNew && (
                  <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full shadow-lg border border-white/20">
                    ✨ New
                  </span>
                )}
                {prediction.isFavorited && (
                  <span className="px-2 py-1 bg-red-500 text-white text-xs rounded-full shadow-lg border border-white/20">
                    ❤️
                  </span>
                )}
              </div>

              <button
                onClick={() => toggleFavorite(prediction.id)}
                className="absolute top-3 right-3 p-2 bg-black/20 backdrop-blur-sm rounded-full text-white hover:bg-black/40 transition-colors"
              >
                {prediction.isFavorited ? '❤️' : '🤍'}
              </button>
            </div>
          );
        })}

        {enhancedPredictions.length === 0 && (
          <div className="col-span-full text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-content mb-2">No predictions found</h3>
            <p className="text-tertiary mb-6">
              Try adjusting your filters or check back later for new predictions.
            </p>
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    ),
    [enhancedPredictions, toggleFavorite, markAsViewed, clearFilters, getPredictionStatus],
  );

  /* ---------- Render ---------- */
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <p className="text-xl text-content">Loading AI recommendations...</p>
          <p className="text-tertiary mt-2">Analyzing predictions and preferences</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <p className="text-xl text-content mb-2">Something went wrong</p>
          <p className="text-tertiary mb-6">Error: {String(error)}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Live Notifications */}
      {Object.keys(liveUpdates).length > 0 && (
        <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
          <div className="container mx-auto">
            <div className="flex items-center space-x-4 overflow-x-auto">
              {Object.entries(liveUpdates).map(([key, update]) => (
                <div
                  key={key}
                  className="flex items-center space-x-2 whitespace-nowrap bg-primary/20 px-3 py-1 rounded-full text-sm"
                >
                  {update.type === 'new_prediction' && (
                    <>
                      <span>🎯</span>
                      <span>New prediction available!</span>
                    </>
                  )}
                  {update.type === 'hot_market' && (
                    <>
                      <span>🔥</span>
                      <span>Hot market detected!</span>
                    </>
                  )}
                  {update.type === 'bet_activity' && (
                    <>
                      <span>⚡</span>
                      <span>Live betting activity</span>
                    </>
                  )}
                  {update.type === 'odds_change' && (
                    <>
                      <span>📊</span>
                      <span>Odds changing rapidly</span>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-surface border-b border-muted">
        <div className="container mx-auto px-4 py-4">
          {/* Mobile Header */}
          {isMobile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <div>
                      <h1 className="text-xl font-bold text-content">
                        Predictions{' '}
                        <span className="text-sm font-normal text-tertiary">
                          {filters.status === 'open' && '• Live'}
                          {filters.status === 'pending' && '• Review Queue'}
                          {filters.status === 'expired' && '• Action Needed'}
                          {filters.status === 'resolved' && '• Historical'}
                          {filters.status === 'all' && '• All Views'}
                        </span>
                      </h1>
                    </div>
                    {socket && (
                      <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-tertiary">Live</span>
                      </div>
                    )}
                    {newPredictionCount > 0 && (
                      <button
                        onClick={clearNewPredictionCount}
                        className="px-2 py-1 bg-primary text-white text-xs rounded-full animate-bounce"
                      >
                        +{newPredictionCount}
                      </button>
                    )}
                  </div>
                  <p className="text-tertiary text-sm">
                    {enhancedPredictions.length} available
                    {activeFiltersCount > 0 && ` (${activeFiltersCount} filtered)`}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowMobileFilters(true)}
                    className="p-2 bg-background rounded-lg border border-muted flex items-center space-x-1"
                  >
                    <span>🔍</span>
                    {activeFiltersCount > 0 && (
                      <span className="bg-primary text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {activeFiltersCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setCreating((c) => !c)}
                    className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg"
                  >
                    {creating ? '✕' : '➕'}
                  </button>
                </div>
              </div>

              {/* Mobile View Toggle */}
              <div className="flex bg-background rounded-lg border border-muted p-1">
                <button
                  onClick={() => setViewMode('sections')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'sections' ? 'bg-primary text-white' : 'text-content'
                  }`}
                >
                  🎯 Smart
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-primary text-white' : 'text-content'
                  }`}
                >
                  📋 List
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`flex-1 px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-primary text-white' : 'text-content'
                  }`}
                >
                  ⊞ Grid
                </button>
              </div>
            </div>
          ) : (
            /* Desktop Header */
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  <div>
                    <h1 className="text-3xl font-bold text-content">
                      Predictions Marketplace
                      <span className="text-lg font-normal text-tertiary ml-3">
                        {filters.status === 'open' && '• Live View'}
                        {filters.status === 'pending' && '• Review Queue'}
                        {filters.status === 'expired' && '• Action Needed'}
                        {filters.status === 'resolved' && '• Historical View'}
                        {filters.status === 'all' && '• All Views'}
                      </span>
                    </h1>
                    <p className="text-sm text-tertiary mt-1">
                      {filters.status === 'open' && 'Active predictions available for betting'}
                      {filters.status === 'pending' && 'Predictions awaiting moderator approval'}
                      {filters.status === 'expired' && 'Expired predictions needing resolution'}
                      {filters.status === 'resolved' && 'Completed predictions with final results'}
                      {filters.status === 'all' && 'All predictions regardless of status'}
                    </p>
                  </div>
                  {socket && (
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-tertiary">Live</span>
                    </div>
                  )}
                  {newPredictionCount > 0 && (
                    <button
                      onClick={clearNewPredictionCount}
                      className="px-2 py-1 bg-primary text-white text-xs rounded-full animate-bounce"
                    >
                      +{newPredictionCount} new
                    </button>
                  )}
                </div>
                <p className="text-tertiary mt-1">
                  {enhancedPredictions.length} predictions available
                  {activeFiltersCount > 0 && ` (${activeFiltersCount} filters active)`}
                  {hotMarketAlerts.length > 0 && (
                    <span className="ml-2 text-orange-600">
                      🔥 {hotMarketAlerts.length} hot market
                      {hotMarketAlerts.length !== 1 ? 's' : ''}
                    </span>
                  )}
                </p>
              </div>

              <div className="flex items-center space-x-3">
                {/* View Mode Toggle */}
                <div className="flex bg-background rounded-lg border border-muted">
                  <button
                    onClick={() => setViewMode('sections')}
                    className={`px-3 py-2 text-sm rounded-l-lg transition-colors ${
                      viewMode === 'sections'
                        ? 'bg-primary text-white'
                        : 'text-content hover:bg-surface'
                    }`}
                    title="Smart AI-powered sections"
                  >
                    🎯 Smart
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-2 text-sm transition-colors ${
                      viewMode === 'list'
                        ? 'bg-primary text-white'
                        : 'text-content hover:bg-surface'
                    }`}
                    title="Detailed list view"
                  >
                    📋 List
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-2 text-sm rounded-r-lg transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-primary text-white'
                        : 'text-content hover:bg-surface'
                    }`}
                    title="Compact grid view"
                  >
                    ⊞ Grid
                  </button>
                </div>

                {/* Create Button */}
                <button
                  onClick={() => setCreating((c) => !c)}
                  className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-colors flex items-center space-x-2"
                >
                  <span>{creating ? '✕' : '➕'}</span>
                  <span>{creating ? 'Cancel' : 'Create Prediction'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Form */}
      {creating && (
        <div className="bg-surface/50 border-b border-muted">
          <div className="container mx-auto px-4 py-6">
            <div className="max-w-2xl mx-auto">
              <CreatePredictionForm
                onCreated={async (input) => {
                  await createPrediction(input);
                  setCreating(false);
                }}
                onCancel={() => setCreating(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile Filters Modal */}
      {showMobileFilters && isMobile && (
        <div className="fixed inset-0 z-50 bg-black/50">
          <div className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-muted">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-content">Filters & Search</h2>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-surface rounded-lg"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4">
              <PredictionFilters
                filters={filters}
                availableCategories={availableCategories}
                onFiltersChange={updateFilters}
                onClearFilters={clearFilters}
              />

              {/* Mobile Stats */}
              <div className="mt-6 bg-surface rounded-lg p-4 border border-muted">
                <h3 className="font-semibold text-content mb-3">Quick Stats</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">
                      {enhancedPredictions.length}
                    </div>
                    <div className="text-xs text-tertiary">Predictions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-red-500">{favorites.length}</div>
                    <div className="text-xs text-tertiary">Favorites</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-orange-500">
                      {
                        enhancedPredictions.filter(
                          (p) => p.recommendation?.timing.urgency === 'high',
                        ).length
                      }
                    </div>
                    <div className="text-xs text-tertiary">Ending Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-500">
                      {
                        enhancedPredictions.filter(
                          (p) => p.recommendation?.socialProof.bettingVelocity > 70,
                        ).length
                      }
                    </div>
                    <div className="text-xs text-tertiary">Hot Markets</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-muted">
              <button
                onClick={() => setShowMobileFilters(false)}
                className="w-full py-3 bg-primary text-white rounded-lg font-medium"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className={`${isMobile ? 'space-y-4' : 'grid grid-cols-1 lg:grid-cols-4 gap-6'}`}>
          {/* Desktop Sidebar Filters */}
          {!isMobile && (
            <div className="lg:col-span-1">
              <div className="sticky top-6 space-y-4">
                <PredictionFilters
                  filters={filters}
                  availableCategories={availableCategories}
                  onFiltersChange={updateFilters}
                  onClearFilters={clearFilters}
                  className="mb-6"
                />

                {/* Desktop Quick Stats Card */}
                <div className="bg-surface rounded-lg p-4 border border-muted">
                  <h3 className="font-semibold text-content mb-3">Quick Stats</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-tertiary">Total Predictions:</span>
                      <span className="text-content font-medium">{enhancedPredictions.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-tertiary">Your Favorites:</span>
                      <span className="text-content font-medium">{favorites.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-tertiary">Ending Today:</span>
                      <span className="text-content font-medium">
                        {
                          enhancedPredictions.filter(
                            (p) => p.recommendation?.timing.urgency === 'high',
                          ).length
                        }
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-tertiary">Hot Markets:</span>
                      <span className="text-content font-medium">
                        {
                          enhancedPredictions.filter(
                            (p) => p.recommendation?.socialProof.bettingVelocity > 70,
                          ).length
                        }
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className={`${isMobile ? 'w-full' : 'lg:col-span-3'}`}>
            {viewMode === 'sections' && renderSectionsView()}
            {viewMode === 'list' && renderListView()}
            {viewMode === 'grid' && renderGridView()}
          </div>
        </div>
      </div>
    </div>
  );
}
