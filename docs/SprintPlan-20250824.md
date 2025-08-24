# Sprint Plan — Master Order of Work
**Generated:** August 24, 2025  
**Purpose:** Consolidated single-sprint queue with all critical work items prioritized for immediate execution  

## Executive Order (Top 10)

1. **P0 Admin Route Security** — Server-enforced protection prevents client-side bypass vulnerability
2. **P0 Admin Socket Handler Stability** — Memory leak prevention in critical admin components  
3. **Harden money precision** — Financial accuracy for all betting operations
4. **Add FK constraint** — Database integrity for cascade deletes
5. **Add idempotency keys** — Prevent duplicate financial transactions
6. **Add CHECK constraints** — Database-level validation for critical invariants
7. **Add composite indexes (4x)** — Performance optimization for dashboard, timeline, bets
8. **Delete unused DashboardSettings** — Remove replaced legacy component
9. **Stabilize dashboard socket handlers** — Fix memory leaks in user-facing components
10. **Add client TypeScript script** — Enable type checking infrastructure

## Full Ordered List

### Security & RBAC (P0)
1. P0 Admin Route Security — Server-enforced 403 screen prevents client-only bypass
2. P0 Admin Socket Handler Stability — Prevent memory leaks and duplicate registrations

### Database & Schema (P0)
3. Harden money precision — Critical for financial accuracy
4. Add FK constraint — Prevent orphaned options on cascade delete
5. Fix inconsistent ON DELETE behavior — Standardize Bet.optionId handling
6. Add idempotency keys — Prevent duplicate financial operations
7. Add CHECK constraints — Database-level validation for critical fields

### Public Contracts & Cross-Boundary (P0/P1)
8. P1 Admin Role Downgrade Cleanup — Clear stale data on role changes
9. P2 Admin Socket Event Constants — Type-safe event contracts

### Performance & Stability (P1)
10. Add composite index (Bet history) — Optimize user bet history queries
11. Add composite index (Dashboard) — Speed up dashboard activity queries
12. Add composite index (Timeline) — Accelerate timeline loads
13. Add composite index (Pong) — Optimize Pong leaderboards
14. Optimize transaction scope — Reduce lock contention
15. Delete unused DashboardSettings — Remove replaced component
16. Stabilize dashboard socket handlers — Fix memory leaks in activity components
17. P1 Virtualize admin tables — Handle large data sets efficiently
18. Virtualize dashboard activity lists — Improve scroll performance

### Client Infrastructure (P1)
19. Add client TypeScript script (tsc) — Enable type checking
20. Lint gate to green (baseline) — Establish clean baseline
21. Non-null assertion cleanup — Replace with proper guards

### Component Consolidation (P1/P2)
22. Delete legacy admin components — Remove superseded components
23. Dashboard component naming normalization — Remove confusing prefixes
24. TODO cleanup — Complete timeline and admin placeholders

### Polish & Documentation (P2)
25. Dashboard grid spec — Document modular layout architecture
26. Admin parity audit — Map UI coverage to server endpoints

## Dependency Map

```
Add client TypeScript script (tsc) → Lint gate to green (baseline)
Lint gate to green (baseline) → Non-null assertion cleanup
Delete unused DashboardSettings → Dashboard component naming normalization
Dashboard grid spec → Dashboard module registry → Grid drag-drop MVP
Admin parity audit → Bulk operations UI
TODO cleanup → Content formatting utilities
```

## Risk Notes

### High Risk Items
- **P0 Admin Route Security**: Client-only protection allows bypass; needs server-side enforcement
- **Harden money precision**: Float arithmetic can cause financial discrepancies

### Medium Risk Items  
- **P0 Admin Socket Handler Stability**: Memory leaks accumulate over time
- **Add idempotency keys**: Duplicate transactions possible without keys
- **P1 Admin Role Downgrade Cleanup**: Stale admin data accessible after role change

### Low Risk Items
- Most database indexes and component cleanups are low risk with clear rollback paths

### Mitigation
- All database changes use migrations (reversible)
- Component deletions verified via ripgrep (no references)
- Socket handler fixes use established useCallback patterns

## Definition of Done

Each ticket includes explicit Exit criteria that must be met:
- Security tickets: Audit passes, vulnerabilities closed
- Database tickets: Migrations applied, queries optimized per EXPLAIN
- Performance tickets: p95 metrics meet targets
- Component tickets: No references remain, functionality preserved
- Infrastructure tickets: Scripts/commands execute successfully

## How to Run Drivers

### Pre-commit Checks
```bash
# TypeScript compilation
npm -w apps/server run tsc -- --noEmit
npm -w apps/client run tsc -- --noEmit

# Linting
npm run lint

# Verify no direct Prisma usage outside repositories
rg -n "prisma\\." apps/server/src/{routes,controllers,services} --hidden -g '!**/node_modules/**'
```

### Post-change Verification
```bash
# Run tests (when available)
npm test

# Check for unused imports/exports
npm run lint

# Verify socket handler stability
# Manual: Navigate admin/dashboard 3x, check console for duplicate registrations
```

## Change Log

- **Consolidated:** 24 items from 7 active queues
- **Duplicates Merged:** 7 tickets deduplicated
  - Delete legacy admin components (kept strictest wording)
  - Admin parity audit (consolidated references)
  - Virtualization tasks (unified approach)
  - AbortController implementations (merged)
  - Socket handler stability (combined)
- **Completed Archived:** 29 items moved to "Recently Completed"
- **Empty Queues:** Test Debt Queue, Performance & Stability Queue (marked as consolidated)
- **Partially Emptied:** Database Review, Client Review, Component Consolidation queues

## Success Metrics

- **Security:** 0 client-only protection patterns, 100% server enforcement
- **Database:** All financial operations use Decimal precision, 100% FK integrity
- **Performance:** Dashboard load <200ms, timeline <200ms, scroll jank eliminated
- **Infrastructure:** TypeScript checks pass, 0 lint errors (baseline)
- **Components:** 0 unused components, consistent naming patterns