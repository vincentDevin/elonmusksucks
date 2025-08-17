// apps/client/src/components/profile/graphs/PerformanceProgressBars.tsx
import { useEffect, useState } from 'react';

interface PerformanceProgressBarsProps {
  roi: number;
  betWinRate: number;
  parlayWinRate: number;
  parlayAccuracy: number;
}

function ProgressBar({
  label,
  value,
  max,
  colors,
}: {
  label: string;
  value: number;
  max: number;
  colors: any;
}) {
  let percentage: number;
  let barBgColor: string;
  const displayValue = value.toFixed(1);

  if (label === 'ROI') {
    // ROI can be negative, so we need special handling
    percentage = Math.min(100, Math.max(0, (value + 100) / 2));
    barBgColor = value < 0 ? colors.negative : colors.positive;
  } else {
    percentage = Math.min(100, Math.max(0, (value / max) * 100));
    if (value < 30) {
      barBgColor = colors.negative;
    } else if (value < 60) {
      barBgColor = colors.warning;
    } else {
      barBgColor = colors.positive;
    }
  }

  return (
    <div className="mb-2 last:mb-0">
      <div className="flex justify-between mb-1">
        <span className="text-xs font-medium text-content">{label}</span>
        <span className="text-xs font-semibold text-primary">{displayValue}%</span>
      </div>
      <div className="w-full rounded-full h-2" style={{ backgroundColor: colors.background }}>
        <div
          className="h-2 rounded-full transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: barBgColor,
            boxShadow: `0 0 3px ${barBgColor}33`,
          }}
        ></div>
      </div>
    </div>
  );
}

export function PerformanceProgressBars({
  roi,
  betWinRate,
  parlayWinRate,
  parlayAccuracy,
}: PerformanceProgressBarsProps) {
  const [colors, setColors] = useState({
    positive: '#22c55e',
    negative: '#ef4444',
    warning: '#f59e0b',
    background: '#e5e7eb',
  });

  // Update colors based on theme
  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setColors({
        positive: isDark ? '#4ade80' : '#16a34a',
        negative: isDark ? '#f87171' : '#dc2626',
        warning: isDark ? '#fbbf24' : '#d97706',
        background: isDark ? '#374151' : '#e5e7eb',
      });
    };

    updateColors();

    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const hasData = roi !== 0 || betWinRate > 0 || parlayWinRate > 0 || parlayAccuracy > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px] p-4">
        <h4 className="font-semibold text-sm mb-4 text-center text-content">Performance Metrics</h4>
        <div className="text-tertiary text-center">
          <div className="text-4xl mb-2">📈</div>
          <p>No performance data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 h-[280px] overflow-hidden">
      <h4 className="font-semibold text-sm mb-3 text-center text-content">Performance Metrics</h4>

      {/* Progress bars container with controlled height */}
      <div className="flex-1 flex flex-col justify-evenly min-h-0">
        <ProgressBar label="ROI" value={roi * 100} max={100} colors={colors} />
        <ProgressBar label="Bet Win Rate" value={betWinRate * 100} max={100} colors={colors} />
        <ProgressBar
          label="Parlay Win Rate"
          value={parlayWinRate * 100}
          max={100}
          colors={colors}
        />
        <ProgressBar
          label="Parlay Accuracy"
          value={parlayAccuracy * 100}
          max={100}
          colors={colors}
        />
      </div>

      {/* Compact color legend */}
      <div className="mt-2 text-xs text-tertiary">
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.positive }}
            ></div>
            <span>Good</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.warning }}></div>
            <span>Average</span>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: colors.negative }}
            ></div>
            <span>Poor</span>
          </div>
        </div>
      </div>
    </div>
  );
}
