// apps/client/src/components/profile/graphs/FinancialBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useEffect, useState } from 'react';

interface BarChartProps {
  wagered: number;
  won: number;
  profit: number;
}

export function FinancialBarChart({ wagered, won, profit }: BarChartProps) {
  const [colors, setColors] = useState({
    wagered: '#8b5cf6',
    won: '#22c55e',
    profitPositive: '#22c55e',
    profitNegative: '#ef4444',
    text: '#000000',
    muted: '#6b7280'
  });

  // Update colors based on theme
  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setColors({
        wagered: isDark ? '#a78bfa' : '#7c3aed',
        won: isDark ? '#4ade80' : '#16a34a',
        profitPositive: isDark ? '#4ade80' : '#16a34a',
        profitNegative: isDark ? '#f87171' : '#dc2626',
        text: isDark ? '#f1f5f9' : '#0f172a',
        muted: isDark ? '#94a3b8' : '#64748b'
      });
    };

    updateColors();
    
    // Listen for theme changes
    const observer = new MutationObserver(updateColors);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const data = [
    { 
      name: 'Wagered', 
      amount: wagered, 
      color: colors.wagered,
      displayAmount: `$${wagered.toLocaleString()}`
    },
    { 
      name: 'Won', 
      amount: won, 
      color: colors.won,
      displayAmount: `$${won.toLocaleString()}`
    },
    { 
      name: 'Profit', 
      amount: profit, 
      color: profit >= 0 ? colors.profitPositive : colors.profitNegative,
      displayAmount: `${profit >= 0 ? '+' : ''}$${profit.toLocaleString()}`
    },
  ];

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

  return (
    <div className="flex flex-col items-center h-[280px]">
      <h4 className="font-semibold text-sm mb-2 text-center text-content">Financials</h4>
      <ResponsiveContainer width="100%" height="100%">
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
            tickFormatter={(value) => `$${value.toLocaleString()}`}
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
  );
}
