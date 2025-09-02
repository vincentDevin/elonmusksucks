// apps/client/src/components/dashboard/desktop/DesktopDashboard.tsx
import { Suspense, lazy, useState, memo, useMemo, useEffect } from 'react';
import { useAdvancedThemes } from '../../../theme/hooks/useUnifiedTheme';
import { useMobileOptimization } from '../../../hooks/useMobileOptimization';
import PredictionPanel from '../PredictionPanel';
import ActivityFeed from '../../ActivityFeed';
import ParlayPanel from '../ParlayPanel';
import PersonalStatsPanel from '../PersonalStatsPanel';
import AchievementProgressPanel from '../AchievementProgressPanel';
import DashboardSettings from '../customization/DashboardSettings';
import DesktopWidgets from './DesktopWidgets';
import MarketOverview from './MarketOverview';
import QuickBetModal from '../QuickBetModal';
import CreatePredictionModal from '../CreatePredictionModal';

const ChatPanel = lazy(() => import('../ChatPanel'));

interface DesktopDashboardProps {
  className?: string;
}

const DesktopDashboard = memo(function DesktopDashboard({ className = '' }: DesktopDashboardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickBetModal, setShowQuickBetModal] = useState(false);
  const [showCreatePredictionModal, setShowCreatePredictionModal] = useState(false);
  const [pendingSourceData, setPendingSourceData] = useState<any>(null);
  const [activeMainTab, setActiveMainTab] = useState<
    'predictions' | 'achievements' | 'market' | 'stats'
  >('predictions');
  const { preferences } = useAdvancedThemes();
  const { screenWidth } = useMobileOptimization();

  // Performance preferences
  const { reducedAnimations, reducedData } = preferences.performance;

  // Memoize grid layout calculation to avoid recalculation on every render
  const gridLayout = useMemo(() => {
    // Modular grid system optimized for component space requirements
    if (screenWidth >= 2880) {
      // Ultra-wide 5K/6K: 4-column specialized layout
      return 'grid-cols-[650px_1fr_400px_350px]';
    } else if (screenWidth >= 2560) {
      // 1440p: 3-column optimized - PRIMARY TARGET
      return 'grid-cols-[600px_1fr_500px]';
    } else if (screenWidth >= 1920) {
      // 1080p: Enhanced Personal Command Center, narrower predictions
      return 'grid-cols-[550px_1fr_500px]';
    } else if (screenWidth >= 1600) {
      // Standard wide: Enhanced Personal Command Center, balanced layout
      return 'grid-cols-[500px_1fr_450px]';
    } else {
      // Compact desktop: 2-column fallback
      return 'grid-cols-[1fr_380px]';
    }
  }, [screenWidth]);

  // Memoize breakpoint calculations to avoid recalculation
  const breakpoints = useMemo(
    () => ({
      is5K: screenWidth >= 2880,
      is1440p: screenWidth >= 2560,
      is1080p: screenWidth >= 1920,
      isWide: screenWidth >= 1600,
    }),
    [screenWidth],
  );

  const { is5K, is1440p, is1080p, isWide } = breakpoints;

  // Check for pending source data from UseAsSourceModal
  useEffect(() => {
    const pendingData = localStorage.getItem('pendingPredictionSource');
    if (pendingData) {
      try {
        const sourceData = JSON.parse(pendingData);
        setPendingSourceData(sourceData);
        setShowCreatePredictionModal(true);
        localStorage.removeItem('pendingPredictionSource');
      } catch (error) {
        console.error('Failed to parse pending source data:', error);
        localStorage.removeItem('pendingPredictionSource');
      }
    }
  }, []);

  const handleCloseCreatePredictionModal = () => {
    setShowCreatePredictionModal(false);
    setPendingSourceData(null);
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Main Dashboard Grid - Modular Layout System */}
      <main className={`grid gap-6 p-6 ${gridLayout}`}>
        {/* Column 1: Analytics Hub - Combined Personal Stats */}
        {isWide && (
          <aside className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            {/* Combined Personal Stats Panel */}
            <PersonalStatsPanel />

            {/* Desktop Widgets - Compact bottom section */}
            {(is1440p || is5K) && !reducedData && (
              <div className="bg-surface border border-muted rounded-2xl">
                <DesktopWidgets />
              </div>
            )}
          </aside>
        )}

        {/* Column 2: Main Content Area with Enhanced Header */}
        <div className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
          {/* Enhanced Dashboard Header with Navigation */}
          <header className="bg-surface border border-muted rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-content">Elite Command Center</h1>
                <p className="text-sm text-tertiary mt-1">Your personalized prediction dashboard</p>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-2">
                <button
                  className={`p-2 rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-background'
                      : 'hover:bg-background transition-colors'
                  }`}
                  title="Notifications"
                >
                  <span className="text-lg">🔔</span>
                </button>
                <button
                  className={`p-2 rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-background'
                      : 'hover:bg-background transition-colors'
                  }`}
                  title="Search"
                >
                  <span className="text-lg">🔍</span>
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`p-2 rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-background'
                      : 'hover:bg-background transition-colors'
                  }`}
                  title="Dashboard Settings"
                >
                  <span className="text-lg">⚙️</span>
                </button>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="border-t border-muted pt-4">
              <div className="flex space-x-2 flex-wrap">
                <button
                  onClick={() => setActiveMainTab('predictions')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeMainTab === 'predictions'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-background text-tertiary hover:text-content hover:bg-background/80'
                  }`}
                >
                  🎯 Smart Predictions
                </button>
                <button
                  onClick={() => setActiveMainTab('market')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeMainTab === 'market'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-background text-tertiary hover:text-content hover:bg-background/80'
                  }`}
                >
                  📊 Market Overview
                </button>
                <button
                  onClick={() => setActiveMainTab('achievements')}
                  className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                    activeMainTab === 'achievements'
                      ? 'bg-primary text-white shadow-md'
                      : 'bg-background text-tertiary hover:text-content hover:bg-background/80'
                  }`}
                >
                  🏆 Achievements
                </button>
                {/* Personal Stats tab - only on compact screens */}
                {!isWide && (
                  <button
                    onClick={() => setActiveMainTab('stats')}
                    className={`px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                      activeMainTab === 'stats'
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-background text-tertiary hover:text-content hover:bg-background/80'
                    }`}
                  >
                    📈 Personal Stats
                  </button>
                )}
              </div>
            </div>
          </header>

          {/* Tab Content */}
          <div className="bg-surface border border-muted rounded-2xl">
            {activeMainTab === 'predictions' && <PredictionPanel />}
            {activeMainTab === 'market' && <MarketOverview />}
            {activeMainTab === 'achievements' && <AchievementProgressPanel />}
            {activeMainTab === 'stats' && !isWide && <PersonalStatsPanel />}
          </div>
        </div>

        {/* Column 3: Social Interaction - Chat + Parlay + Activity */}
        {isWide && (
          <aside className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            {/* Chat Panel - Primary social feature at top */}
            <div className="bg-surface border border-muted rounded-2xl">
              <Suspense
                fallback={
                  <div className="p-6">
                    <div className={reducedAnimations ? '' : 'animate-pulse'}>
                      <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-muted rounded"></div>
                        <div className="h-3 bg-muted rounded w-3/4"></div>
                      </div>
                    </div>
                  </div>
                }
              >
                <ChatPanel />
              </Suspense>
            </div>

            {/* Parlay Panel - Under chat on wide screens */}
            <div className="bg-surface border border-muted rounded-2xl">
              <ParlayPanel />
            </div>

            {/* Unified Activity Feed */}
            <div className="flex flex-col min-h-0">
              <ActivityFeed />
            </div>
          </aside>
        )}

        {/* Column 4: Widgets & Extra Tools - Only on 5K displays and when data is not reduced */}
        {is5K && !reducedData && (
          <aside className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            <div className="bg-surface border border-muted rounded-2xl">
              <DesktopWidgets />
            </div>

            {/* Additional activity or tools could go here */}
            <div className="bg-surface border border-muted rounded-2xl p-4">
              <h3 className="text-lg font-semibold text-content mb-4">Quick Tools</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setShowCreatePredictionModal(true)}
                  className={`w-full p-3 bg-primary text-white rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-primary/90'
                      : 'hover:bg-primary/90 transition-colors'
                  }`}
                >
                  📊 Create Prediction
                </button>
                <button
                  onClick={() => setShowQuickBetModal(true)}
                  className={`w-full p-3 bg-secondary text-white rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-secondary/90'
                      : 'hover:bg-secondary/90 transition-colors'
                  }`}
                >
                  💰 Quick Bet
                </button>
                <button
                  onClick={() => (window.location.href = '/leaderboard')}
                  className={`w-full p-3 bg-surface border border-muted rounded-lg ${
                    reducedAnimations
                      ? 'hover:bg-background'
                      : 'hover:bg-background transition-colors'
                  }`}
                >
                  🏆 View Leaderboard
                </button>
              </div>
            </div>
          </aside>
        )}

        {/* Fallback for compact desktop - Show essential components only */}
        {!isWide && !is5K && (
          <aside className="space-y-4 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            {/* Chat Panel - Top priority on compact */}
            <div className="bg-surface border border-muted rounded-2xl">
              <Suspense
                fallback={
                  <div className={`p-4 ${reducedAnimations ? '' : 'animate-pulse'}`}>
                    <div className="h-4 bg-muted rounded"></div>
                  </div>
                }
              >
                <ChatPanel />
              </Suspense>
            </div>

            {/* Parlay Panel - Always visible under chat */}
            <div className="bg-surface border border-muted rounded-2xl">
              <ParlayPanel />
            </div>

            {/* Activity Feed - At bottom */}
            <div className="flex flex-col min-h-0">
              <ActivityFeed />
            </div>
          </aside>
        )}
      </main>

      {/* Floating Elements */}

      {/* Quick Actions FAB Group - Desktop Style */}
      <div className="fixed bottom-8 right-8 flex flex-col space-y-3 z-40">
        {/* Primary Action - Quick Bet */}
        <button
          onClick={() => setShowQuickBetModal(true)}
          className={`w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center ${
            reducedAnimations
              ? 'hover:bg-primary/90'
              : 'hover:bg-primary/90 transition-all duration-200 hover:scale-110'
          }`}
          title="Quick Bet"
        >
          <span className="text-xl">💰</span>
        </button>

        {/* Secondary Action - Create Prediction */}
        <button
          onClick={() => setShowCreatePredictionModal(true)}
          className={`w-12 h-12 bg-secondary text-white rounded-full shadow-lg flex items-center justify-center ${
            reducedAnimations
              ? 'hover:bg-secondary/90'
              : 'hover:bg-secondary/90 transition-all duration-200 hover:scale-110'
          }`}
          title="Create Prediction"
        >
          <span className="text-lg">📊</span>
        </button>

        {/* Note: QuickThemeSwitcher positions itself above these buttons automatically when on dashboard */}
      </div>

      {/* Modals */}
      <DashboardSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <QuickBetModal isOpen={showQuickBetModal} onClose={() => setShowQuickBetModal(false)} />
      <CreatePredictionModal
        isOpen={showCreatePredictionModal}
        onClose={handleCloseCreatePredictionModal}
        sourceData={pendingSourceData}
      />
    </div>
  );
});

export default DesktopDashboard;
