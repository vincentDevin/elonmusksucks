// apps/client/src/components/profile/graphs/FinancialBarChart.tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface BarChartProps {
  wagered: number;
  won: number;
  profit: number;
}

export function FinancialBarChart({ wagered, won, profit }: BarChartProps) {
  const data = [
    { name: 'Wagered', amount: wagered },
    { name: 'Won', amount: won },
    { name: 'Profit', amount: profit },
  ];

  return (
    <div className="flex flex-col items-center">
      <h4 className="font-semibold text-sm mb-2">Financials</h4>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="horizontal">
          <YAxis type="number" />
          <XAxis type="category" dataKey="name" />
          <Tooltip />
          <Legend />
          <Bar dataKey="amount" fill={(data) => {
            if (data.name === 'Profit') {
              return data.amount < 0 ? '#ef4444' : '#22c55e'; // Tailwind red-500 vs green-500
            } else if (data.name === 'Won') {
              return '#22c55e'; // Tailwind green-500
            } else if (data.name === 'Wagered') {
              return '#8b5cf6'; // Tailwind violet-500
            }
            return '#8b5cf6'; // Default fallback to violet-500
          }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
