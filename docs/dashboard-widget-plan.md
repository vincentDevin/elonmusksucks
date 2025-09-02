Dashboard Widgetization & Responsive Grid Refactor Plan
Why we’re doing this
Your dashboard currently mixes components that only look good at one size with others that only look good at another. To ship a user‑customizable dashboard, every module must behave like a widget with clear size variants and a consistent shell. This plan standardizes sizing, layout, data boundaries, theming, and persistence.

Target outcomes
* Every dashboard module implements a Widget API with 3 size variants: S (mini), M (tile), L (panel).
* Drag‑drop modular grid with resize + breakpoint-aware layouts (desktop/tablet/mobile).
* Per‑user layout persistence in Postgres via the existing backend (Prisma) + REST route and Socket.IO event for live layout saves.
* Consistent WidgetShell (header, actions, skeleton, error) and theme tokens.
* Strict type safety via @ems/types for registry, layouts, events.

Architecture overview
1. Widget SDK (frontend package)
    * WidgetShell, WidgetToolbar, withWidget HOC, useWidgetData hook.
    * WidgetDefinition type + global widgetRegistry for discoverability.
    * Sizing tokens + Tailwind utility variants.
2. Grid system
    * react-grid-layout wrapper: DashboardGrid with breakpoints { lg: 12, md: 8, sm: 4 } and rowHeight = 8.
    * layoutManager.ts to map registry defaults ⇒ RGL layout, per breakpoint.
3. Persistence
    * REST: GET /api/dashboard/layout & PUT /api/dashboard/layout (per user).
    * Socket: dashboard:layout:update emitted on save for multi‑tab sync.
4. Data layer
    * Separate container (data fetching via hooks) from presentation (pure widget view). No API calls inside view components.
5. Theming
    * Theme tokens for widget chrome, paddings, typography per size.

Types & contracts (shared)
// @ems/types/dashboard.ts
export type Breakpoint = 'lg' | 'md' | 'sm';
export type WidgetSize = 's' | 'm' | 'l';

export interface WidgetProps {
  size: WidgetSize;
  // Optional common affordances
  onOpenSettings?: () => void;
  className?: string;
}

export interface WidgetDefinition {
  id: string;              // unique key
  title: string;           // human‑readable
  component: React.FC<WidgetProps>;
  defaultLayout: Record<Breakpoint, { x: number; y: number; w: number; h: number }>; // RGL units
  minSize?: Partial<Record<Breakpoint, { w: number; h: number }>>;
  // optional capability flags
  resizable?: boolean;
  movable?: boolean;
}

export interface UserDashboardLayout {
  userId: string;
  // One layout array per breakpoint; each item references widget id
  layouts: Record<Breakpoint, Array<{ i: string; x: number; y: number; w: number; h: number }>>;
  hiddenWidgets: string[];
  updatedAt: string;
}

Widget SDK (frontend)
1) Widget shell & sizing utilities
// apps/client/src/widgets/WidgetShell.tsx
import React from 'react';
import clsx from 'clsx';

export type WidgetChrome = {
  title?: string;
  actions?: React.ReactNode;
  isLoading?: boolean;
  error?: string | null;
  size: 's' | 'm' | 'l';
};

export const WidgetShell: React.FC<React.PropsWithChildren<WidgetChrome>> = ({
  title,
  actions,
  isLoading,
  error,
  size,
  children,
}) => {
  return (
    <div
      className={clsx(
        'rounded-2xl shadow-sm border border-neutral-800 bg-neutral-900/60 backdrop-blur',
        size === 's' && 'p-3',
        size === 'm' && 'p-4',
        size === 'l' && 'p-6'
      )}
      role="region"
      aria-label={title}
    >
      {(title || actions) && (
        <div className={clsx('mb-2 flex items-center justify-between', size === 'l' ? 'mb-4' : 'mb-2')}>
          {title && <h3 className={clsx('font-semibold', size === 's' ? 'text-sm' : size === 'm' ? 'text-base' : 'text-lg')}>{title}</h3>}
          <div className="flex items-center gap-2">{actions}</div>
        </div>
      )}

      {isLoading ? (
        <div className="animate-pulse h-20 rounded-md bg-neutral-800" />
      ) : error ? (
        <div className="text-red-400 text-sm">{error}</div>
      ) : (
        children
      )}
    </div>
  );
};
2) Registry
// apps/client/src/widgets/registry.ts
import type { WidgetDefinition } from '@ems/types/dashboard';

export const widgetRegistry: Record<string, WidgetDefinition> = {};

export function registerWidget(def: WidgetDefinition) {
  widgetRegistry[def.id] = def;
}

export function getWidgets(): WidgetDefinition[] {
  return Object.values(widgetRegistry);
}
3) Size adapter helper
// apps/client/src/widgets/size.ts
import { WidgetSize } from '@ems/types/dashboard';

export function sizeFor(bp: 'lg'|'md'|'sm', w: number, h: number): WidgetSize {
  // Simple mapping: small footprint ⇒ 's', medium ⇒ 'm', otherwise 'l'
  const area = w * h;
  if (area <= 12) return 's';
  if (area <= 24) return 'm';
  return 'l';
}

Grid implementation (React Grid Layout wrapper)
// apps/client/src/dashboard/DashboardGrid.tsx
import React, { useMemo } from 'react';
import RGL, { WidthProvider, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { widgetRegistry } from '../widgets/registry';
import { sizeFor } from '../widgets/size';

const ReactGridLayout = WidthProvider(RGL);

const cols = { lg: 12, md: 8, sm: 4 } as const;
const breakpoints = { lg: 1200, md: 996, sm: 0 } as const;

interface Props {
  layouts: Record<'lg'|'md'|'sm', Layout[]>;
  onLayoutsChange: (layouts: Props['layouts']) => void;
}

export default function DashboardGrid({ layouts, onLayoutsChange }: Props) {
  const widgets = useMemo(() => Object.values(widgetRegistry), []);

  return (
    <ReactGridLayout
      className="layout"
      rowHeight={8}
      cols={cols}
      breakpoints={breakpoints}
      layouts={layouts}
      margin={[8, 8]}
      containerPadding={[8, 8]}
      onLayoutChange={(currentLayout, allLayouts) => onLayoutsChange(allLayouts as Props['layouts'])}
      draggableHandle=".widget-drag-handle"
      isBounded
      compactType="vertical"
    >
      {widgets.map((w) => (
        <div key={w.id} data-grid={undefined /* provided via layouts */}>
          <DashboardWidget instanceId={w.id} />
        </div>
      ))}
    </ReactGridLayout>
  );
}

function DashboardWidget({ instanceId }: { instanceId: string }) {
  const def = widgetRegistry[instanceId];
  // RGL injects style via parent; we need the item’s width/height to map to size
  // A simple approach is to read via ResizeObserver or measure; for brevity we
  // pass size via layout mapping in parent. Here we just default to 'm'.
  const size = 'm' as const;
  const Cmp = def.component;
  return (
    <div>
      <Cmp size={size} />
    </div>
  );
}
Note: In production, compute size from the RGL Layout (w,h) per breakpoint using sizeFor() and pass it via context or props.

Backend persistence (Prisma + REST)
Prisma model
// prisma/schema.prisma
model DashboardLayout {
  id           String   @id @default(cuid())
  userId       String   @unique
  layoutsJson  Json
  hiddenJson   Json
  updatedAt    DateTime @updatedAt
}
Routes (Express)
// apps/server/src/routes/dashboard.ts
import { Router } from 'express';
import prisma from '../prisma';
import type { UserDashboardLayout } from '@ems/types/dashboard';

const router = Router();

router.get('/layout', async (req, res) => {
  const userId = req.user!.id; // auth middleware
  const rec = await prisma.dashboardLayout.findUnique({ where: { userId } });
  if (!rec) return res.json({ layouts: {}, hiddenWidgets: [] } satisfies Partial<UserDashboardLayout>);
  res.json({
    userId,
    layouts: rec.layoutsJson,
    hiddenWidgets: rec.hiddenJson,
    updatedAt: rec.updatedAt,
  } satisfies UserDashboardLayout);
});

router.put('/layout', async (req, res) => {
  const userId = req.user!.id;
  const { layouts, hiddenWidgets } = req.body as Pick<UserDashboardLayout, 'layouts'|'hiddenWidgets'>;
  const rec = await prisma.dashboardLayout.upsert({
    where: { userId },
    update: { layoutsJson: layouts, hiddenJson: hiddenWidgets },
    create: { userId, layoutsJson: layouts, hiddenJson: hiddenWidgets },
  });
  req.io.emit(`dashboard:layout:update:${userId}`, { layouts, hiddenWidgets });
  res.json({ ok: true, updatedAt: rec.updatedAt });
});

export default router;

Sizing rules & visual guidelines
* S (mini): glanceable. Max 1–2 KPIs, sparkline or top‑3 list, 1 action (open).
* M (tile): primary dashboard usage. 3–8 items, small chart/list, 1–2 filters (pills).
* L (panel): full module with toolbar, pagination/filters, or an expanded chart/table.
Tailwind tokens (example):
/* tailwind.config.js theme.extend */
fontSize: {
  xs: '0.75rem', sm: '0.875rem', base: '1rem', lg: '1.125rem',
}
spacing: {
  'widget-s': '0.75rem', 'widget-m': '1rem', 'widget-l': '1.5rem',
}

Example: Convert Achievements to a widget
Registry entry
// apps/client/src/widgets/achievements/index.ts
import { registerWidget } from '../registry';
import type { WidgetDefinition } from '@ems/types/dashboard';
import AchievementsWidget from './view';

const def: WidgetDefinition = {
  id: 'achievements',
  title: 'Achievements',
  component: AchievementsWidget,
  defaultLayout: {
    lg: { x: 0, y: 0, w: 4, h: 16 },
    md: { x: 0, y: 0, w: 4, h: 18 },
    sm: { x: 0, y: 0, w: 4, h: 22 },
  },
  minSize: { lg: { w: 3, h: 12 }, md: { w: 3, h: 12 }, sm: { w: 2, h: 10 } },
  resizable: true,
  movable: true,
};

registerWidget(def);
View with size variants
// apps/client/src/widgets/achievements/view.tsx
import React from 'react';
import { WidgetShell } from '../WidgetShell';
import type { WidgetProps } from '@ems/types/dashboard';

const AchievementsWidget: React.FC<WidgetProps> = ({ size }) => {
  return (
    <WidgetShell title="Achievements" size={size}>
      {size === 's' && <MiniAchievements />}
      {size === 'm' && <TileAchievements />}
      {size === 'l' && <PanelAchievements />}
    </WidgetShell>
  );
};

export default AchievementsWidget;

function MiniAchievements() {
  // top 3 newest or highest rarity badges
  return (
    <ul className="space-y-1 text-xs">
      {/* map badges */}
      <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400"/> MuskBucks Rookie</li>
      <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-cyan-400"/> Parlay Pupil</li>
      <li className="flex items-center gap-2"><span className="inline-block h-2 w-2 rounded-full bg-fuchsia-400"/> Pong Novice</li>
    </ul>
  );
}

function TileAchievements() {
  // small grid of badge chips
  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border border-neutral-800 bg-neutral-800/40 px-2 py-1">Badge {i+1}</div>
      ))}
    </div>
  );
}

function PanelAchievements() {
  // full list with filters/search
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button className="widget-pill">All</button>
        <button className="widget-pill">Unlocked</button>
        <button className="widget-pill">Locked</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-neutral-800 bg-neutral-800/40 p-3">
            <div className="font-medium">Badge {i+1}</div>
            <div className="text-xs text-neutral-400">Rarity: Common</div>
          </div>
        ))}
      </div>
    </div>
  );
}

Migration plan (incremental, safe)
1. Inventory: Generate a list of all dashboard modules (current pages/components) and classify as candidate widgets. Mark those with data side‑effects.
2. SDK drop‑in: Add WidgetShell, registry, and DashboardGrid without replacing your current dashboard. Render it behind a feature flag ?betaWidgets=1.
3. Convert 3 seed widgets: Achievements, Live Bets, Pong Status. Each implements S/M/L views.
4. Persist layout: Implement REST + Prisma model and wire a simple “Save layout” button.
5. Measure: Track mount time and layout save latency; fix layout thrash or resize jank.
6. Convert remaining modules in batches of ≤3, each PR includes S/M/L screenshots.
7. Remove legacy dashboard after parity and user acceptance.

Eventing & state management sanity checklist (applies to this refactor)
* WebSocket/Event Architecture: Emit dashboard:layout:update:{userId} on save; subscribe on client and reconcile only when userId matches; unsubscribe on unmount (no memory leaks).
* Redis Job Queues: If you add async export/snapshots, enqueue jobs idempotently; include dedupe keys for layout exports.
* Tigris Integration: If widgets upload images (avatars), ensure signed URLs + cleanup on change.
* Frontend State: Make widgets stateless views; containers own fetching via hooks; grid layout is the only shared state in DashboardContext.
* Type/DTO Consistency: All widget registry and layout payloads live in @ems/types. No ad‑hoc JSON shapes.
* REST and Real‑Time Harmony: Load layout via REST first, then live updates via Socket.IO. No double‑apply; use revision timestamps.
* Security/Auth: Guard routes; server validates userId from token; rate‑limit PUT /layout.
* Scalability: Layout saves are small JSON; consider batching rapid changes with a 300ms debounce on client.
* Testing: Cypress tests for drag/resize; Vitest for size mapping; Contract tests for REST payloads.
* Polish: Remove any old “dashboard-*” CSS; rely on Tailwind tokens; lint and Storybook a11y checks.

Testing plan
* Unit: sizeFor() mapping; registry contracts.
* Integration: Rendering S/M/L variants; WidgetShell skeleton + error paths; grid drag/resize callbacks.
* E2E: Save layout, refresh, and verify persistence; multi‑tab sync via socket.

Rollout
* Feature flag in env: VITE_DASHBOARD_WIDGETS=1.
* Add a one‑time “Reset to defaults” layout action.
* Telemetry: capture widget add/remove, resize, and time‑to‑interactive.

Claude prompt driver (self‑driving, chunked)
Copy‑paste into Claude when ready; it works in ≤150 LOC patches and asks for verification before applying changes.
CLAUDE DRIVER — Dashboard Widgetization
Goal: Convert the dashboard into a widgetized, resizable grid with S/M/L variants per module. Work in small patches, update CLAUDE.md Refactor Queue after each step, and ask me to verify before writing or modifying files.
Guardrails: TypeScript strict, Tailwind, React 19, Vite. No Zod in services. Use @ems/types for contracts. Keep patches ≤150 LOC. When unsure, print a short plan and wait.
Initial Tasks:
1. Create @ems/types/dashboard.ts with the types in this spec; export from package index.
2. Add WidgetShell.tsx, widgets/registry.ts, and widgets/size.ts to the client app.
3. Add DashboardGrid.tsx (RGL wrapper) behind a feature flag in the Dashboard page.
4. Convert Achievements into a widget with S/M/L views and register it.
5. Show the new dashboard when ?betaWidgets=1 is present.
Next Tasks (batch):
* Add Prisma model DashboardLayout + REST routes /api/dashboard/layout (GET/PUT). Wire socket event.
* Convert Live Bets and Pong Status widgets; ensure S/M/L fidelity.
* Persist layouts on change with 300ms debounce.
* Add “Reset layout” and “Add widget” modal (from registry).
Verification checklist per PR:
* S/M/L screenshots.
* Storybook entries for each size.
* Vitest unit tests for size mapping.
* Cypress run showing drag, resize, and save/restore.

Appendix: utility styles
// apps/client/src/styles/utilities.css (or Tailwind @layer components)
.widget-pill { @apply px-2 py-1 rounded-full border border-neutral-700 text-neutral-200 bg-neutral-800/40 hover:bg-neutral-800; }

Next steps
1. Drop in the SDK files and register Achievements first.
2. Wire the DashboardGrid behind ?betaWidgets=1.
3. Add persistence routes + Prisma model and test save/restore.
Once these land, we’ll convert the remaining modules in small batches and finalize theme polish.
