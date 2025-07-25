// apps/client/src/components/profile/graphs/PerformanceProgressBars.tsx

interface PerformanceProgressBarsProps {
  roi: number;
  winRate: number;
  parlayAccuracy: number;
}

function ProgressBar({ label, value, max }: { label: string; value: number; max: number }) {
  let percentage: number;
  let barBgColor: string;
  const displayValue = value.toFixed(1);

  if (label === 'ROI') {
    percentage = Math.min(100, Math.max(0, (value + 100) / 2));
    barBgColor = value < 0 ? '#ef4444' : '#22c55e'; // Tailwind red-500 vs green-500
  } else {
    percentage = Math.min(100, Math.max(0, (value / max) * 100));
    barBgColor = value < 50 ? '#ef4444' : '#22c55e'; // Tailwind red-500 vs green-500
  }

  return (
    <div className="mb-4 last:mb-0">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-content">{label}</span>
        <span className="text-sm font-semibold text-primary">{displayValue}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
        <div
          className="h-2.5 rounded-full"
          style={{ width: `${percentage}%`, backgroundColor: barBgColor }}
        ></div>
      </div>
    </div>
  );
}

export function PerformanceProgressBars({ roi, winRate, parlayAccuracy }: PerformanceProgressBarsProps) {
  return (
    <div className="flex flex-col p-4">
      <h4 className="font-semibold text-sm mb-4 text-center">Performance Metrics</h4>
      <ProgressBar label="ROI" value={roi * 100} max={100} />
      <ProgressBar label="Win Rate" value={winRate * 100} max={100} />
      <ProgressBar label="Parlay Accuracy" value={parlayAccuracy * 100} max={100} />
    </div>
  );
}
