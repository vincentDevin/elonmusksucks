// Enhanced Predictions page with integrated parlay workflow
import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { REDIS_CHANNELS } from '@ems/types';
import type { PredictionCreatedPayload, BetPlacedPayload } from '@ems/types';

// New components
import SimplePredictionCard from '../components/prediction/SimplePredictionCard';
import FloatingParlayBuilder from '../components/prediction/FloatingParlayBuilder';
import EnhancedPredictionFilters from '../components/prediction/EnhancedPredictionFilters';
import PredictionPreview from '../components/prediction/PredictionPreview';
import PredictionDetailView from '../components/prediction/PredictionDetailView';
import { FloatingParlayIndicator } from '../components/prediction/ParlaySelectionIndicator';

// Existing components
import PredictionCard from '../components/prediction/PredictionCard';
import PredictionSectionCard from '../components/prediction/PredictionSectionCard';

// Hooks and contexts
import { usePredictionDiscovery } from '../hooks/usePredictionDiscovery';
import { useEventBusCore } from '../contexts/EventBusCoreContext';
import { useParlay } from '../contexts/ParlayContext';
import { usePredictionMarket } from '../contexts/PredictionContext';

// Icons
import {
  Squares2X2Icon as Grid,
  ListBulletIcon as List,
  SquaresPlusIcon as Layers,
  ArrowTrendingUpIcon as TrendingUp,
  BellIcon as Bell,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';

type ViewMode = 'sections' | 'list' | 'grid';

export default function Predictions() {
  const navigate = useNavigate();
  const { id: predictionId } = useParams<{ id: string }>();
  const { state: parlayState, dispatch: parlayDispatch } = useParlay();
  const { subscribe } = useEventBusCore();
  const { openCreateModal } = usePredictionMarket();

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
    markAsViewed,
  } = usePredictionDiscovery();

  // State management
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showParlayBuilder, setShowParlayBuilder] = useState(true);
  const [liveNotifications, setLiveNotifications] = useState<any[]>([]);
  const [previewPrediction, setPreviewPrediction] = useState<any>(null);
  const [previewTriggerRef, setPreviewTriggerRef] = useState<HTMLElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Refs for hover preview
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Detect mobile screen
  useEffect(() => {
    const checkIsMobile = () => setIsMobile(window.innerWidth < 768);
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Show parlay builder when items are added
  useEffect(() => {
    if (parlayState.legs.length > 0 && !showParlayBuilder) {
      setShowParlayBuilder(true);
    }
  }, [parlayState.legs.length]);

  // Real-time event handlers
  const handleNewPrediction = useCallback((data: PredictionCreatedPayload) => {
    const notification = {
      id: `new_${data.payload.predictionId}`,
      type: 'new',
      title: 'New Prediction',
      message: data.payload.title,
      timestamp: Date.now(),
    };
    setLiveNotifications((prev) => [notification, ...prev.slice(0, 4)]);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setLiveNotifications((prev) => prev.filter((n) => n.id !== notification.id));
    }, 10000);
  }, []);

  const handleBettingActivity = useCallback((data: BetPlacedPayload) => {
    // Show high-value bets as notifications
    if (data.payload.amount > 10000) {
      toast(
        `💰 ${data.payload.amount.toLocaleString()} MuskBucks bet on ${data.payload.optionLabel}!`,
        {
          duration: 5000,
          position: 'top-right',
        },
      );
    }
  }, []);

  // Real-time event subscriptions via EventBusCore
  useEffect(() => {
    const unsubscribers = [
      subscribe(REDIS_CHANNELS.PREDICTION_CREATED, handleNewPrediction),
      subscribe(REDIS_CHANNELS.BET_PLACED, handleBettingActivity),
    ];

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [subscribe, handleNewPrediction, handleBettingActivity]);

  // Handle prediction card click for detailed view
  const handlePredictionClick = useCallback(
    (predictionId: number) => {
      navigate(`/predictions/${predictionId}`);
      markAsViewed(predictionId);
    },
    [navigate, markAsViewed],
  );

  // Handle hover preview
  const handlePredictionHover = useCallback(
    (prediction: any, triggerElement: HTMLElement) => {
      if (isMobile) return;

      hoverTimeoutRef.current = setTimeout(() => {
        setPreviewPrediction(prediction);
        setPreviewTriggerRef(triggerElement);
      }, 500);
    },
    [isMobile],
  );

  const handlePredictionLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setPreviewPrediction(null);
    setPreviewTriggerRef(null);
  }, []);

  // Handle adding to parlay
  const handleAddToParlay = useCallback(
    (prediction: any, optionId: number) => {
      const option = prediction.options.find((o: any) => o.id === optionId);
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

      toast.success(`Added "${prediction.title}" to parlay`, {
        duration: 2000,
        position: 'bottom-center',
      });
    },
    [parlayDispatch],
  );

  // Quick bet handler
  const handleQuickBet = useCallback((prediction: any) => {
    // Open bet modal or navigate to bet page
    console.log('Quick bet on:', prediction);
  }, []);

  // Render prediction cards based on view mode
  const renderPredictions = useCallback(() => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-tertiary">Loading predictions...</p>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <p className="text-error mb-4">Error loading predictions: {String(error)}</p>
          <button onClick={() => window.location.reload()} className="text-primary hover:underline">
            Try Again
          </button>
        </div>
      );
    }

    if (enhancedPredictions.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-content mb-2">No predictions found</h3>
          <p className="text-tertiary mb-6">
            Try adjusting your filters or check back later for new predictions.
          </p>
          {(filters.categories.length > 0 || filters.search) && (
            <button
              onClick={clearFilters}
              className="px-6 py-2 bg-primary text-surface rounded-lg hover:bg-primary-hover"
            >
              Clear All Filters
            </button>
          )}
        </div>
      );
    }

    switch (viewMode) {
      case 'sections':
        return (
          <div className="space-y-8">
            {predictionSections.map((section) => (
              <PredictionSectionCard
                key={section.id}
                section={section}
                onMarkViewed={markAsViewed}
                className="bg-surface border border-border shadow-sm hover:shadow-md transition-shadow rounded-xl overflow-hidden"
              />
            ))}
          </div>
        );

      case 'list':
        return (
          <div className="space-y-6">
            {enhancedPredictions.map((prediction) => (
              <div
                key={prediction.id}
                className="relative"
                onMouseEnter={(e) =>
                  handlePredictionHover(prediction, e.currentTarget as HTMLElement)
                }
                onMouseLeave={handlePredictionLeave}
              >
                {/* Parlay indicator */}
                {parlayState.legs.some((leg) => leg.predictionId === prediction.id) && (
                  <FloatingParlayIndicator predictionId={prediction.id} position="top-right" />
                )}

                <SimplePredictionCard
                  prediction={
                    {
                      ...prediction,
                      options: prediction.options.map((opt) => ({
                        ...opt,
                        createdAt:
                          typeof opt.createdAt === 'string'
                            ? new Date(opt.createdAt)
                            : opt.createdAt,
                      })),
                    } as any
                  }
                  onCardClick={() => handlePredictionClick(prediction.id)}
                  onQuickBet={handleQuickBet}
                  onAddToParlay={handleAddToParlay}
                  className="hover:shadow-lg transition-shadow"
                />
              </div>
            ))}
          </div>
        );

      case 'grid':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {enhancedPredictions.map((prediction) => (
              <div
                key={prediction.id}
                className="relative"
                onMouseEnter={(e) =>
                  handlePredictionHover(prediction, e.currentTarget as HTMLElement)
                }
                onMouseLeave={handlePredictionLeave}
              >
                <PredictionCard
                  prediction={
                    {
                      ...prediction,
                      options: prediction.options.map((opt) => ({
                        ...opt,
                        createdAt:
                          typeof opt.createdAt === 'string'
                            ? new Date(opt.createdAt)
                            : opt.createdAt,
                      })),
                    } as any
                  }
                  variant="compact"
                  showActions={true}
                  showBetsList={false}
                  showParlayActions={true}
                  onCardView={() => handlePredictionClick(prediction.id)}
                  className="h-full"
                />
              </div>
            ))}
          </div>
        );

      default:
        return null;
    }
  }, [
    viewMode,
    enhancedPredictions,
    predictionSections,
    loading,
    error,
    filters,
    parlayState.legs,
    clearFilters,
    markAsViewed,
    handlePredictionClick,
    handleQuickBet,
    handleAddToParlay,
    handlePredictionHover,
    handlePredictionLeave,
  ]);

  // If we have a prediction ID, find and display the detailed view
  if (predictionId) {
    const detailedPrediction = enhancedPredictions.find((p) => p.id?.toString() === predictionId);

    if (loading) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-tertiary">Loading prediction...</p>
          </div>
        </div>
      );
    }

    if (!detailedPrediction) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">❓</div>
            <h2 className="text-2xl font-bold text-content mb-2">Prediction Not Found</h2>
            <p className="text-tertiary mb-6">
              The prediction you're looking for doesn't exist or has been removed.
            </p>
            <button
              onClick={() => navigate('/predictions')}
              className="px-6 py-2 bg-primary text-surface rounded-lg hover:bg-primary-hover"
            >
              Back to Predictions
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <PredictionDetailView
          prediction={
            {
              ...detailedPrediction,
              options: detailedPrediction.options.map((opt) => ({
                ...opt,
                createdAt:
                  typeof opt.createdAt === 'string' ? new Date(opt.createdAt) : opt.createdAt,
              })),
            } as any
          }
          onBack={() => navigate('/predictions')}
        />

        {/* Floating Parlay Builder */}
        {parlayState.legs.length > 0 && showParlayBuilder && (
          <FloatingParlayBuilder onClose={() => setShowParlayBuilder(false)} isMinimized={false} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border sticky top-0 z-20">
        <div className="px-6 py-4 max-w-[1800px] mx-auto space-y-4">
          {/* Title Row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-content flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-primary" />
                Prediction Market
              </h1>

              {/* View Mode Toggle */}
              <div className="hidden md:flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => setViewMode('sections')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'sections'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-tertiary hover:text-content'
                  }`}
                  title="Sections View"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-tertiary hover:text-content'
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-surface text-primary shadow-sm'
                      : 'text-tertiary hover:text-content'
                  }`}
                  title="Grid View"
                >
                  <Grid className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Create Prediction Button */}
              <button
                onClick={() => openCreateModal()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-all cursor-pointer font-medium"
              >
                <PlusIcon className="w-5 h-5" />
                <span className="hidden sm:inline">Create Prediction</span>
              </button>

              {/* Live Notifications */}
              {liveNotifications.length > 0 && (
                <div className="relative">
                  <button className="p-2 hover:bg-muted rounded-lg relative">
                    <Bell className="w-5 h-5 text-tertiary" />
                    <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full animate-pulse" />
                  </button>

                  {/* Notification dropdown */}
                  <div className="absolute top-full right-0 mt-2 w-72 bg-surface border border-border rounded-lg shadow-xl hidden">
                    <div className="p-3 border-b border-border">
                      <h3 className="font-medium text-content">Live Updates</h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {liveNotifications.map((notif) => (
                        <div key={notif.id} className="p-3 border-b border-border hover:bg-muted">
                          <div className="flex items-start gap-2">
                            <span className="text-lg">{notif.type === 'new' ? '✨' : '🔥'}</span>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-content">{notif.title}</p>
                              <p className="text-xs text-tertiary">{notif.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Filters Row */}
          <EnhancedPredictionFilters
            filters={filters}
            availableCategories={availableCategories}
            onFiltersChange={updateFilters}
            onClearFilters={clearFilters}
            totalResults={enhancedPredictions.length}
            layout="horizontal"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="px-6 py-6 max-w-[1800px] mx-auto">{renderPredictions()}</div>

      {/* Floating Parlay Builder */}
      {parlayState.legs.length > 0 && showParlayBuilder && (
        <FloatingParlayBuilder onClose={() => setShowParlayBuilder(false)} isMinimized={false} />
      )}

      {/* Prediction Preview (hover) */}
      {previewPrediction && previewTriggerRef && (
        <PredictionPreview
          prediction={previewPrediction}
          triggerRef={{ current: previewTriggerRef }}
          isVisible={true}
          placement="right"
        />
      )}
    </div>
  );
}
