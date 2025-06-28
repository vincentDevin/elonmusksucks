interface OddsBarProps {
  options: Array<{ label: string; pct: number }>;
}

export default function OddsBar({ options }: OddsBarProps) {
  // fixed palette for up to 4 options
  const palette = ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-red-500'];

  // total should approach 1.0
  const totalPct = options.reduce((sum, o) => sum + o.pct, 0);
  if (totalPct === 0 || options.length === 0) {
    return <p className="mt-3 text-sm italic text-gray-500">No bets placed!</p>;
  }

  let cumPct = 0;
  return (
    <div className="mt-3">
      {/* Bar */}
      <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        {options.slice(0, 4).map((opt, i) => {
          const left = cumPct;
          const width = opt.pct;
          cumPct += width;
          const color = palette[i] ?? palette[palette.length - 1];
          return (
            <div
              key={opt.label}
              className={`absolute top-0 h-full ${color}`}
              style={{
                left: `${left * 100}%`,
                width: `${width * 100}%`,
              }}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap mt-2 text-sm space-x-4">
        {options.slice(0, 4).map((opt, i) => {
          const color = palette[i] ?? palette[palette.length - 1];
          return (
            <div key={opt.label} className="flex items-center space-x-1">
              <span className={`inline-block w-3 h-3 ${color} rounded-full`} />
              <span>
                {opt.label} {(opt.pct * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
