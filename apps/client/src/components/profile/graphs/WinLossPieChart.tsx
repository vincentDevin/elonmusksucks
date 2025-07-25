// apps/client/src/components/profile/graphs/WinLossPieChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface PieChartProps {
  wins: number;
  losses: number;
  title: string;
}

const COLORS = ['#4ade80', '#f87171']; // green-400, red-400

export function WinLossPieChart({ wins, losses, title }: PieChartProps) {
  const data = [
    { name: 'Wins', value: wins },
    { name: 'Losses', value: losses },
  ];

  return (
    <div className="flex flex-col items-center">
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
