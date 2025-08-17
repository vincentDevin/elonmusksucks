// apps/client/src/components/dashboard/mobile/MobileDashboard.tsx
import { useState, useEffect } from 'react';
import { useMobileOptimization } from '../../../hooks/useMobileOptimization';
import MyStuffPanel from '../MyStuffPanel';
import PredictionPanel from '../PredictionPanel';
import UnifiedActivityFeed from '../../UnifiedActivityFeed';
import ParlayPanel from '../ParlayPanel';

type MobileTab = 'analytics' | 'predictions' | 'activity' | 'parlay';

interface MobileDashboardProps {
  className?: string;
}

export default function MobileDashboard({ className = '' }: MobileDashboardProps) {
  const [activeTab, setActiveTab] = useState<MobileTab>('analytics');
  const [showBottomNav, setShowBottomNav] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const {
    isMobile: _isMobile,
    orientation,
    shouldUseCompactLayout: _shouldUseCompactLayout,
    shouldReduceAnimations,
    getFontSizeMultiplier,
    getSpacingMultiplier,
  } = useMobileOptimization();

  // Hide/show bottom navigation on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down and past threshold - hide nav
        setShowBottomNav(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show nav
        setShowBottomNav(true);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  const tabs = [
    { id: 'analytics', label: 'Analytics', icon: '📊', component: MyStuffPanel },
    { id: 'predictions', label: 'Markets', icon: '🎯', component: PredictionPanel },
    { id: 'activity', label: 'Activity', icon: '📡', component: UnifiedActivityFeed },
    { id: 'parlay', label: 'Parlay', icon: '🎰', component: ParlayPanel },
  ] as const;

  const ActiveComponent = tabs.find((tab) => tab.id === activeTab)?.component || MyStuffPanel;

  const fontSizeMultiplier = getFontSizeMultiplier();
  const spacingMultiplier = getSpacingMultiplier();

  return (
    <div
      className={`min-h-screen pb-20 ${className}`}
      style={
        {
          fontSize: `${fontSizeMultiplier}rem`,
          '--spacing-multiplier': spacingMultiplier,
        } as any
      }
    >
      {/* Mobile Header */}
      <div className="sticky top-0 z-30 bg-surface/95 backdrop-blur-sm border-b border-muted">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-content">
                {tabs.find((tab) => tab.id === activeTab)?.label || 'Dashboard'}
              </h1>
              <p className="text-xs text-tertiary">
                {orientation === 'portrait' ? 'Portrait Mode' : 'Landscape Mode'}
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2">
              <button className="p-2 hover:bg-background rounded-lg transition-colors">
                <span className="text-lg">🔍</span>
              </button>
              <button className="p-2 hover:bg-background rounded-lg transition-colors">
                <span className="text-lg">🔔</span>
              </button>
              <button className="p-2 hover:bg-background rounded-lg transition-colors">
                <span className="text-lg">⚙️</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4 py-4">
        <div
          className={`transition-all duration-300 ${
            shouldReduceAnimations() ? 'transition-none' : ''
          }`}
          key={activeTab}
        >
          <ActiveComponent />
        </div>
      </div>

      {/* Bottom Navigation */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-sm border-t border-muted transition-transform duration-300 ${
          showBottomNav ? 'translate-y-0' : 'translate-y-full'
        } ${shouldReduceAnimations() ? 'transition-none' : ''}`}
      >
        <div className="px-2 py-2 safe-area-inset-bottom">
          <div className="grid grid-cols-4 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center py-2 px-1 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary text-white'
                    : 'text-tertiary hover:text-content hover:bg-background'
                }`}
              >
                <span className="text-lg mb-1">{tab.icon}</span>
                <span className="text-xs font-medium leading-tight">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-20 right-4 z-30">
        <button
          className={`w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center ${
            activeTab === 'predictions' ? 'scale-100' : 'scale-0 pointer-events-none'
          }`}
          onClick={() => {
            // Quick bet action
            console.log('Quick bet');
          }}
        >
          <span className="text-xl">💰</span>
        </button>
      </div>

      {/* Pull-to-refresh indicator */}
      <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none">
        <div className="px-3 py-1 bg-primary text-white text-sm rounded-full opacity-0 transition-opacity">
          Pull to refresh
        </div>
      </div>
    </div>
  );
}
