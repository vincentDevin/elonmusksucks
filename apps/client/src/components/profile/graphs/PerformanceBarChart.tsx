// apps/client/src/components/profile/graphs/PerformanceBarChart.tsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceBarChartProps {
  roi: number;
  winRate: number;
  parlayAccuracy: number;
}

function PerformanceBarChartComponent({ roi, winRate, parlayAccuracy }: PerformanceBarChartProps) {
  const [isReady, setIsReady] = useState(false);

  // Delay chart rendering to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize data array
  const data = useMemo(
    () => [
      { name: 'ROI', value: roi * 100 },
      { name: 'Win Rate', value: winRate * 100 },
      { name: 'Parlay Accuracy', value: parlayAccuracy * 100 },
    ],
    [roi, winRate, parlayAccuracy],
  );

  // Memoize tooltip formatter
  const tooltipFormatter = useCallback((value: number) => `${value.toFixed(1)}%`, []);

  if (!isReady) {
    return (
      <div className="flex flex-col items-center">
        <h4 className="font-semibold text-sm mb-2">Performance Metrics (%)</h4>
        <div className="animate-pulse bg-muted/30 rounded-lg h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="font-semibold text-sm mb-2">Performance Metrics (%)</h4>
      <div className="w-full h-[400px] min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={300}>
          <BarChart
            data={data}
            layout="horizontal"
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <XAxis type="category" dataKey="name" />
            <YAxis type="number" domain={[0, 100]} />
            <Tooltip formatter={tooltipFormatter} />
            <Legend />
            <Bar dataKey="value" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const PerformanceBarChart = React.memo(
  PerformanceBarChartComponent,
  (prev, next) =>
    prev.roi === next.roi &&
    prev.winRate === next.winRate &&
    prev.parlayAccuracy === next.parlayAccuracy,
);
