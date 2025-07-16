// apps/client/src/components/dashboard/MyStuffPanel.tsx
import { useMyBets, useMyParlays, useMyPredictions } from '../../hooks/useMeStubs';

export default function MyStuffPanel() {
  const myBets = useMyBets();
  const myParlays = useMyParlays();
  const myPredictions = useMyPredictions();

  return (
    <section className="bg-surface border border-muted rounded-2xl p-4 shadow">
      <h2 className="text-lg font-semibold mb-3">My Activity</h2>

      <h3 className="font-medium">Open Bets</h3>
      <ul className="text-sm mb-4">
        {myBets.data?.slice(0, 5).map((b) => (
          <li key={b.id} className="flex justify-between">
            <span>#{b.predictionId}</span>
            <span>
              {b.amount}🪙 @ {b.odds.toFixed(2)}×
            </span>
          </li>
        ))}
      </ul>

      <h3 className="font-medium">Active Parlays</h3>
      <ul className="text-sm mb-4">
        {myParlays.data?.slice(0, 5).map((p) => (
          <li key={p.id} className="flex justify-between">
            <span>{p.legs.length} legs</span>
            <span>Stake {p.amount}🪙</span>
          </li>
        ))}
      </ul>

      <h3 className="font-medium">My Predictions</h3>
      <ul className="text-sm">
        {myPredictions.data?.slice(0, 5).map((p) => (
          <li key={p.id} className="flex justify-between">
            <span>{p.title}</span>
            <span className="text-xs italic">{p.approved ? 'live' : 'pending'}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
