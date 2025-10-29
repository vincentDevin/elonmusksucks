// apps/client/src/components/profile/graphs/WinLossPieChart.tsx
import React, { useMemo, useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useLightDark } from '../../../theme';

interface PieChartProps {
  wins: number;
  losses: number;
  title: string;
}

// Custom components defined outside to prevent recreation
const CustomTooltip = ({ active, payload, total }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : 0;
    return (
      <div className="bg-surface border border-muted rounded-lg p-3 shadow-lg">
        <p className="text-content font-medium">{data.name}</p>
        <p className="text-primary">
          {data.value} ({percentage}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex justify-center gap-4 mt-2">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-sm text-content">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

function WinLossPieChartComponent({ wins, losses, title }: PieChartProps) {
  const { isDark } = useLightDark();
  const [isReady, setIsReady] = useState(false);

  // Delay chart rendering to ensure DOM is ready
  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Memoize colors based on theme
  const colors = useMemo(
    () => ({
      win: isDark ? '#4ade80' : '#16a34a',
      loss: isDark ? '#f87171' : '#dc2626',
    }),
    [isDark],
  );

  // Memoize data array
  const data = useMemo(
    () => [
      { name: 'Wins', value: wins, color: colors.win },
      { name: 'Losses', value: losses, color: colors.loss },
    ],
    [wins, losses, colors],
  );

  const total = wins + losses;

  // Memoize tooltip with total
  const TooltipWithTotal = useMemo(
    () => (props: any) => <CustomTooltip {...props} total={total} />,
    [total],
  );

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px]">
        <h4 className="font-semibold text-sm mb-4 text-center text-content">{title}</h4>
        <div className="text-tertiary text-center">
          <div className="text-4xl mb-2">📊</div>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px]">
        <h4 className="font-semibold text-sm mb-4 text-center text-content">{title}</h4>
        <div className="animate-pulse bg-muted/30 rounded-lg h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-[280px] w-full">
      <h4 className="font-semibold text-sm mb-2 text-center text-content">{title}</h4>
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius="70%"
              innerRadius="30%"
              paddingAngle={2}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={TooltipWithTotal} />
            <Legend content={CustomLegend} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoize component
export const WinLossPieChart = React.memo(
  WinLossPieChartComponent,
  (prev, next) =>
    prev.wins === next.wins && prev.losses === next.losses && prev.title === next.title,
);
