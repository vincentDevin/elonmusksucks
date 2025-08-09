// apps/client/src/components/dashboard/desktop/DesktopDashboard.tsx
import { Suspense, lazy, useState } from 'react';
import { useAdvancedThemes } from '../../../theme/hooks/useUnifiedTheme';
import { useMobileOptimization } from '../../../hooks/useMobileOptimization';
import { useAuth } from '../../../contexts/AuthContext';
import { useEnhancedUserStats } from '../../../hooks/useEnhancedUserStats';
import { useEnhancedLeaderboard } from '../../../hooks/useEnhancedLeaderboard';
import MyStuffPanel from '../MyStuffPanel';
import PredictionPanel from '../PredictionPanel';
import UnifiedActivityFeed from '../../UnifiedActivityFeed';
import ParlayPanel from '../ParlayPanel';
import UnifiedDashboardSettings from '../customization/UnifiedDashboardSettings';
import DesktopWidgets from './DesktopWidgets';
import MarketOverview from './MarketOverview';
import QuickBetModal from '../QuickBetModal';
import CreatePredictionModal from '../CreatePredictionModal';

const ChatPanel = lazy(() => import('../ChatPanel'));

interface DesktopDashboardProps {
  className?: string;
}

export default function DesktopDashboard({ className = '' }: DesktopDashboardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showQuickBetModal, setShowQuickBetModal] = useState(false);
  const [showCreatePredictionModal, setShowCreatePredictionModal] = useState(false);
  const { preferences } = useAdvancedThemes();
  const { screenWidth } = useMobileOptimization();
  const { user } = useAuth();
  const { stats, loading: statsLoading } = useEnhancedUserStats();
  const { userRank } = useEnhancedLeaderboard('all-time');

  // Performance preferences
  const { reducedAnimations, reducedData } = preferences.performance;

  // Enhanced breakpoint system for modular grid
  const is5K = screenWidth >= 2880; // Ultra-wide 5K/6K displays
  const is1440p = screenWidth >= 2560; // 1440p displays (primary target)
  const is1080p = screenWidth >= 1920; // 1080p displays
  const isWide = screenWidth >= 1600; // Standard wide displays

  const getGridLayout = () => {
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
  };

  return (
    <div className={`min-h-screen bg-background ${className}`}>
      {/* Desktop Header Bar */}
      <header className="h-16 z-50 bg-surface border-b border-muted flex items-center justify-between px-6 sticky top-0">
        <div className="flex items-center space-x-6">
          <div>
            <h1 className="text-xl font-bold text-content">Elite Command Center</h1>
            <p className="text-sm text-tertiary">
              {is5K
                ? 'Ultra-Wide 5K'
                : is1440p
                  ? '1440p Optimized'
                  : is1080p
                    ? '1080p Balanced'
                    : isWide
                      ? 'Wide Layout'
                      : 'Compact'}{' '}
              •{screenWidth}px • Modular Grid
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Quick Stats - Real Data */}
          <div className="hidden lg:flex items-center space-x-6 text-sm">
            {statsLoading ? (
              <div className="flex items-center space-x-6">
                <div className={reducedAnimations ? '' : 'animate-pulse'}>
                  <div className="h-4 bg-muted rounded w-12 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-8"></div>
                </div>
                <div className={reducedAnimations ? '' : 'animate-pulse'}>
                  <div className="h-4 bg-muted rounded w-16 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-12"></div>
                </div>
                <div className={reducedAnimations ? '' : 'animate-pulse'}>
                  <div className="h-4 bg-muted rounded w-8 mb-1"></div>
                  <div className="h-3 bg-muted rounded w-8"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div
                    className={`font-bold ${
                      stats?.performance.profitLoss && stats.performance.profitLoss > 0
                        ? 'text-green-500'
                        : stats?.performance.profitLoss && stats.performance.profitLoss < 0
                          ? 'text-red-500'
                          : 'text-content'
                    }`}
                  >
                    {stats?.performance.profitLoss !== undefined
                      ? `${stats.performance.profitLoss >= 0 ? '+' : ''}${stats.performance.profitLoss.toLocaleString()}🪙`
                      : '—'}
                  </div>
                  <div className="text-tertiary">P&L</div>
                </div>
                <div className="text-center">
                  <div className="text-content font-bold">
                    {user?.muskBucks?.toLocaleString() || '—'}🪙
                  </div>
                  <div className="text-tertiary">Balance</div>
                </div>
                <div className="text-center">
                  <div className="text-primary font-bold">
                    {userRank && userRank.allTimeRank ? `#${userRank.allTimeRank}` : '—'}
                  </div>
                  <div className="text-tertiary">Rank</div>
                </div>
                <div className="text-center">
                  <div className="text-content font-bold">
                    {stats?.performance.winRate !== undefined
                      ? `${(stats.performance.winRate * 100).toFixed(1)}%`
                      : '—'}
                  </div>
                  <div className="text-tertiary">Win Rate</div>
                </div>
              </>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-2">
            <button
              className={`p-2 rounded-lg ${
                reducedAnimations ? 'hover:bg-background' : 'hover:bg-background transition-colors'
              }`}
              title="Notifications"
            >
              <span className="text-lg">🔔</span>
            </button>
            <button
              className={`p-2 rounded-lg ${
                reducedAnimations ? 'hover:bg-background' : 'hover:bg-background transition-colors'
              }`}
              title="Search"
            >
              <span className="text-lg">🔍</span>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 rounded-lg ${
                reducedAnimations ? 'hover:bg-background' : 'hover:bg-background transition-colors'
              }`}
              title="Settings"
            >
              <span className="text-lg">⚙️</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Grid - Modular Layout System */}
      <main className={`grid gap-6 p-6 ${getGridLayout()}`}>
        {/* Column 1: Analytics Hub - Personal Command Center + Market Overview */}
        {isWide && (
          <aside className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            {/* Personal Command Center - Now gets full width (600px @ 1440p) */}
            <div className="bg-surface border border-muted rounded-2xl">
              <MyStuffPanel />
            </div>

            {/* Market Overview - Dedicated space below Personal Command Center */}
            <div className="bg-surface border border-muted rounded-2xl">
              <MarketOverview />
            </div>

            {/* Desktop Widgets - Compact bottom section */}
            {(is1440p || is5K) && !reducedData && (
              <div className="bg-surface border border-muted rounded-2xl">
                <DesktopWidgets />
              </div>
            )}
          </aside>
        )}

        {/* Column 2: Content Discovery - Predictions + Live Trading */}
        <div className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
          {/* For smaller screens, show Market Overview here if not in sidebar */}
          {!isWide && (
            <div className="bg-surface border border-muted rounded-2xl">
              <MarketOverview />
            </div>
          )}

          {/* Predictions Panel - Primary content, gets full remaining width */}
          <div className="bg-surface border border-muted rounded-2xl">
            <PredictionPanel />
          </div>
        </div>

        {/* Column 3: Social Interaction - Chat + Activity + Trading + Parlay */}
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

            {/* Parlay Panel - Tool section */}
            <div className="bg-surface border border-muted rounded-2xl">
              <ParlayPanel />
            </div>

            {/* Unified Activity Feed - Adaptive height */}
            <div className="flex flex-col min-h-0">
              <UnifiedActivityFeed />
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
          <aside className="space-y-6 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40">
            {/* Personal Command Center for smaller screens */}
            <div className="bg-surface border border-muted rounded-2xl">
              <MyStuffPanel />
            </div>

            {/* Unified Activity Feed - Compact for smaller screens */}
            <div className="flex flex-col min-h-0">
              <UnifiedActivityFeed />
            </div>

            {/* Chat Panel */}
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
      <UnifiedDashboardSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <QuickBetModal isOpen={showQuickBetModal} onClose={() => setShowQuickBetModal(false)} />
      <CreatePredictionModal
        isOpen={showCreatePredictionModal}
        onClose={() => setShowCreatePredictionModal(false)}
      />
    </div>
  );
}
