// apps/client/src/components/profile/graphs/WinLossPieChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useEffect, useState } from 'react';

interface PieChartProps {
  wins: number;
  losses: number;
  title: string;
}

export function WinLossPieChart({ wins, losses, title }: PieChartProps) {
  const [colors, setColors] = useState({
    win: '#22c55e',
    loss: '#ef4444',
    text: '#000000',
    muted: '#6b7280',
  });

  // Update colors based on theme
  useEffect(() => {
    const updateColors = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setColors({
        win: isDark ? '#4ade80' : '#16a34a',
        loss: isDark ? '#f87171' : '#dc2626',
        text: isDark ? '#f1f5f9' : '#0f172a',
        muted: isDark ? '#94a3b8' : '#64748b',
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

  const data = [
    { name: 'Wins', value: wins, color: colors.win },
    { name: 'Losses', value: losses, color: colors.loss },
  ];

  const total = wins + losses;

  const CustomTooltip = ({ active, payload }: any) => {
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

  return (
    <div className="flex flex-col items-center h-[280px]">
      <h4 className="font-semibold text-sm mb-2 text-center text-content">{title}</h4>
      <ResponsiveContainer width="100%" height="100%">
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
          <Tooltip content={<CustomTooltip />} />
          <Legend content={<CustomLegend />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
