// apps/client/src/pages/Dashboard.tsx
import { Suspense, lazy } from 'react';
import PredictionsPanel from '../components/dashboard/PredictionPanel';
import ParlayPanel from '../components/dashboard/ParlayPanel';
import MyStuffPanel from '../components/dashboard/MyStuffPanel';
const ChatPanel = lazy(() => import('../components/dashboard/ChatPanel'));

/**
 * Layout notes
 * ──────────────────────────────────────────────────────────────
 * • Mobile  (<lg) : single column
 * • Desktop (lg)  : fluid left column + sidebar min 22rem, max 32rem
 * • XL      (xl)  : give sidebar even more room (min 26rem, max 36rem)
 */
export default function Dashboard() {
  return (
    <div
      className="grid gap-8
                    lg:grid-cols-[1fr_minmax(22rem,_32rem)]
                    xl:grid-cols-[1fr_minmax(26rem,_36rem)]"
    >
      {/* LEFT column – scrollable main feed */}
      <div className="space-y-8">
        <PredictionsPanel />
        <MyStuffPanel />
      </div>

      {/* RIGHT column – sticky on desktop */}
      <aside className="lg:sticky lg:top-24 space-y-8">
        <ParlayPanel />
        <Suspense fallback={null}>
          <ChatPanel />
        </Suspense>
      </aside>
    </div>
  );
}
