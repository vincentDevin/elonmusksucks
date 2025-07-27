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
    <div className="min-h-[calc(100vh-6rem)] max-h-[calc(100vh-6rem)] overflow-hidden">
      <div
        className="grid gap-8 h-full
                      lg:grid-cols-[1fr_minmax(22rem,_32rem)]
                      xl:grid-cols-[1fr_minmax(26rem,_36rem)]"
      >
      {/* LEFT column – scrollable main feed */}
        <div className="space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 pr-2">
        <PredictionsPanel />
        <MyStuffPanel />
        </div>

      {/* RIGHT column – sticky on desktop */}
        <aside className="lg:sticky lg:top-0 space-y-8 overflow-y-auto scrollbar-thin scrollbar-track-secondary/20 scrollbar-thumb-primary/40 hover:scrollbar-thumb-primary/60 pr-2">
        <ParlayPanel />
        <Suspense fallback={null}>
          <ChatPanel />
        </Suspense>
        </aside>
      </div>
    </div>
  );
}
