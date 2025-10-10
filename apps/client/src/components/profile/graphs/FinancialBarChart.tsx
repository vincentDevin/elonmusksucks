// apps/client/src/components/profile/graphs/FinancialBarChart.tsx
import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatMuskBucks } from '../../../utils/formatting';
import { useLightDark } from '../../../theme';

interface BarChartProps {
  wagered: number;
  won: number;
  profit: number;
}

// Custom Tooltip component defined outside to prevent recreation
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-surface border border-muted rounded-lg p-3 shadow-lg">
        <p className="text-content font-medium">{label}</p>
        <p className="text-primary">{data.displayAmount}</p>
      </div>
    );
  }
  return null;
};

function FinancialBarChartComponent({ wagered, won, profit }: BarChartProps) {
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
      wagered: isDark ? '#a78bfa' : '#7c3aed',
      won: isDark ? '#4ade80' : '#16a34a',
      profitPositive: isDark ? '#4ade80' : '#16a34a',
      profitNegative: isDark ? '#f87171' : '#dc2626',
      text: isDark ? '#f1f5f9' : '#0f172a',
      muted: isDark ? '#94a3b8' : '#64748b',
    }),
    [isDark],
  );

  // Memoize data array
  const data = useMemo(
    () => [
      {
        name: 'Wagered',
        amount: wagered,
        color: colors.wagered,
        displayAmount: `$${formatMuskBucks(wagered)}`,
      },
      {
        name: 'Won',
        amount: won,
        color: colors.won,
        displayAmount: `$${formatMuskBucks(won)}`,
      },
      {
        name: 'Profit',
        amount: profit,
        color: profit >= 0 ? colors.profitPositive : colors.profitNegative,
        displayAmount: `${profit >= 0 ? '+' : ''}$${formatMuskBucks(profit)}`,
      },
    ],
    [wagered, won, profit, colors],
  );

  // Memoize YAxis tick formatter
  const yAxisFormatter = useCallback((value: number) => `$${formatMuskBucks(value)}`, []);

  const maxValue = Math.max(wagered, won, Math.abs(profit));
  const hasData = maxValue > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px]">
        <h4 className="font-semibold text-sm mb-4 text-center text-content">Financials</h4>
        <div className="text-tertiary text-center">
          <div className="text-4xl mb-2">💰</div>
          <p>No financial data</p>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex flex-col items-center justify-center h-[280px]">
        <h4 className="font-semibold text-sm mb-4 text-center text-content">Financials</h4>
        <div className="animate-pulse bg-muted/30 rounded-lg h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center h-[280px] w-full">
      <h4 className="font-semibold text-sm mb-2 text-center text-content">Financials</h4>
      <div className="w-full h-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            barCategoryGap="20%"
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: colors.text }}
              axisLine={{ stroke: colors.muted }}
              tickLine={{ stroke: colors.muted }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: colors.muted }}
              axisLine={{ stroke: colors.muted }}
              tickLine={{ stroke: colors.muted }}
              tickFormatter={yAxisFormatter}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// Memoize component
export const FinancialBarChart = React.memo(
  FinancialBarChartComponent,
  (prev, next) =>
    prev.wagered === next.wagered && prev.won === next.won && prev.profit === next.profit,
);
