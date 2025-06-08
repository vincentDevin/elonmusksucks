interface OddsBarProps {
  yesPct: number; // fraction 0–1
  noPct: number;
}

export default function OddsBar({ yesPct, noPct }: OddsBarProps) {
  // If neither side has any bets, both percentages will be zero
  if (yesPct + noPct === 0 || isNaN(yesPct) || isNaN(noPct)) {
    return <p className="mt-3 text-sm italic text-gray-500">No bets placed!</p>;
  }

  return (
    <div className="flex items-center mt-3 space-x-3 text-sm">
      <span className="font-semibold text-green-600">YES {(yesPct * 100).toFixed(0)}%</span>

      <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        {/* YES segment from left */}
        <div
          className="absolute left-0 top-0 h-full bg-green-500"
          style={{ width: `${yesPct * 100}%` }}
        />
        {/* NO segment from right */}
        <div
          className="absolute right-0 top-0 h-full bg-red-500"
          style={{ width: `${noPct * 100}%` }}
        />
      </div>

      <span className="font-semibold text-red-500">NO {(noPct * 100).toFixed(0)}%</span>
    </div>
  );
}
