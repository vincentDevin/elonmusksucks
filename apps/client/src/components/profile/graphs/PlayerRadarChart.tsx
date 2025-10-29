// apps/client/src/components/profile/graphs/PlayerRadarChart.tsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface RadarChartProps {
  roi: number;
  winRate: number;
  parlayAccuracy: number;
}

function PlayerRadarChartComponent({ roi, winRate, parlayAccuracy }: RadarChartProps) {
  const [isReady, setIsReady] = useState(false);

  // Delay chart rendering to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize data array to prevent recharts from re-rendering unnecessarily
  const data = useMemo(
    () => [
      { subject: 'ROI', value: roi * 100, fullMark: 100 },
      { subject: 'Win Rate', value: winRate * 100, fullMark: 100 },
      { subject: 'Parlay Accuracy', value: parlayAccuracy * 100, fullMark: 100 },
    ],
    [roi, winRate, parlayAccuracy],
  );

  if (!isReady) {
    return (
      <div className="flex flex-col items-center">
        <h4 className="font-semibold text-sm mb-2">Player Snapshot</h4>
        <div className="animate-pulse bg-muted/30 rounded-lg h-[300px] w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="font-semibold text-sm mb-2">Player Snapshot</h4>
      <div className="w-full h-[300px] min-h-[250px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={250}>
          <RadarChart cx="50%" cy="50%" outerRadius="90%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            <Radar
              name="Player"
              dataKey="value"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.6}
            />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const PlayerRadarChart = React.memo(
  PlayerRadarChartComponent,
  (prev, next) =>
    prev.roi === next.roi &&
    prev.winRate === next.winRate &&
    prev.parlayAccuracy === next.parlayAccuracy,
);
