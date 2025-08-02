// apps/client/src/components/dashboard/desktop/DesktopWidgets.tsx
import { useState, useEffect } from 'react';

interface WidgetData {
  id: string;
  title: string;
  value: string;
  change: number;
  icon: string;
  color: string;
}

export default function DesktopWidgets() {
  const [widgets, setWidgets] = useState<WidgetData[]>([]);

  useEffect(() => {
    // Mock widget data - in real app, this would come from APIs
    const mockWidgets: WidgetData[] = [
      {
        id: 'total_volume',
        title: 'Total Volume',
        value: '47.2K🪙',
        change: 8.5,
        icon: '📈',
        color: 'text-blue-500',
      },
      {
        id: 'active_predictions',
        title: 'Active Markets',
        value: '234',
        change: 12,
        icon: '🎯',
        color: 'text-green-500',
      },
      {
        id: 'win_rate',
        title: 'Platform Win Rate',
        value: '64.3%',
        change: -2.1,
        icon: '🏆',
        color: 'text-yellow-500',
      },
      {
        id: 'top_category',
        title: 'Trending Category',
        value: 'Sports',
        change: 0,
        icon: '⚽',
        color: 'text-purple-500',
      },
    ];

    setWidgets(mockWidgets);
  }, []);

  const formatChange = (change: number) => {
    if (change === 0) return null;
    const sign = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-500' : 'text-red-500';
    const arrow = change > 0 ? '↗' : '↘';

    return (
      <span className={`text-xs ${color} flex items-center`}>
        <span className="mr-1">{arrow}</span>
        {sign}
        {change.toFixed(1)}%
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Widget Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-content">Market Widgets</h3>
        <button className="text-xs text-tertiary hover:text-primary transition-colors">
          Customize
        </button>
      </div>

      {/* Widgets Grid */}
      <div className="grid grid-cols-1 gap-3">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="bg-surface border border-muted rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`text-lg ${widget.color}`}>{widget.icon}</span>
              {formatChange(widget.change)}
            </div>

            <div className="space-y-1">
              <div className="text-lg font-bold text-content">{widget.value}</div>
              <div className="text-xs text-tertiary">{widget.title}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Mini Chart Widget */}
      <div className="bg-surface border border-muted rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-content">Volume Trend</h4>
          <span className="text-xs text-tertiary">24h</span>
        </div>

        {/* Simple SVG chart */}
        <div className="h-16 flex items-end space-x-1">
          {Array.from({ length: 12 }).map((_, i) => {
            const height = Math.random() * 100 + 20;
            return (
              <div
                key={i}
                className="bg-primary/60 rounded-t flex-1 transition-all duration-300 hover:bg-primary"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-surface border border-muted rounded-xl p-4">
        <h4 className="font-medium text-content mb-3">Quick Actions</h4>
        <div className="space-y-2">
          {[
            { icon: '📊', label: 'Create Prediction', href: '/create' },
            { icon: '📈', label: 'View Leaderboard', href: '/leaderboard' },
            { icon: '💰', label: 'Cashout Options', href: '/cashout' },
            { icon: '📱', label: 'Mobile App', href: '/mobile' },
          ].map((link) => (
            <button
              key={link.label}
              className="w-full flex items-center space-x-3 p-2 hover:bg-background rounded-lg transition-colors text-left"
            >
              <span className="text-lg">{link.icon}</span>
              <span className="text-sm text-content">{link.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
