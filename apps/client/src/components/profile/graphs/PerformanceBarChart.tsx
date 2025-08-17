// apps/client/src/components/profile/graphs/PerformanceBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PerformanceBarChartProps {
  roi: number;
  winRate: number;
  parlayAccuracy: number;
}

export function PerformanceBarChart({ roi, winRate, parlayAccuracy }: PerformanceBarChartProps) {
  const data = [
    { name: 'ROI', value: roi * 100 },
    { name: 'Win Rate', value: winRate * 100 },
    { name: 'Parlay Accuracy', value: parlayAccuracy * 100 },
  ];

  return (
    <div className="flex flex-col items-center">
      <h4 className="font-semibold text-sm mb-2">Performance Metrics (%)</h4>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart
          data={data}
          layout="horizontal"
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis type="category" dataKey="name" />
          <YAxis type="number" domain={[0, 100]} />
          <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="value" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
