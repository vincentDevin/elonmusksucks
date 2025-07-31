// apps/client/src/components/profile/graphs/PlayerRadarChart.tsx
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from 'recharts';

interface RadarChartProps {
  roi: number;
  winRate: number;
  parlayAccuracy: number;
}

export function PlayerRadarChart({ roi, winRate, parlayAccuracy }: RadarChartProps) {
  const data = [
    { subject: 'ROI', value: roi * 100, fullMark: 100 },
    { subject: 'Win Rate', value: winRate * 100, fullMark: 100 },
    { subject: 'Parlay Accuracy', value: parlayAccuracy * 100, fullMark: 100 },
  ];

  return (
    <div className="flex flex-col items-center">
      <h4 className="font-semibold text-sm mb-2">Player Snapshot</h4>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="90%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="subject" />
          <Radar name="Player" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
          <Legend />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
