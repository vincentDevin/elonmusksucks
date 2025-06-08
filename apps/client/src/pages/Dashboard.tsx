import { useState } from 'react';
import { PredictionsComponent } from '../components/PredictionsComponent';
import { LeaderboardComponent } from '../components/LeaderboardComponent';

export default function Dashboard() {
  const [creating, setCreating] = useState(false);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      <section className="bg-surface p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Current Predictions</h2>
            <button
              onClick={() => setCreating((c) => !c)}
              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow"
            >
              {creating ? 'Cancel' : 'New'}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
            <PredictionsComponent />
          </div>
        </div>
      </section>

      <section className="bg-surface p-6 rounded-2xl shadow-lg">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Top MuskBucks Holders</h2>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted scrollbar-track-background">
            <LeaderboardComponent />
          </div>
        </div>
      </section>
    </div>
  );
}
