# Achievement System Data Normalization & Test Plan

This document outlines the steps required to normalize the achievement data and ensure the system correctly tracks, awards and displays achievements. It is derived from the current catalog (`prisma/achievement-catalog.ts`) and legacy seeds (`prisma/manual-migrations/002_achievement_system.sql`).

## Data normalization
- Consolidate the catalog and legacy seed achievements into a single source of truth.
- Resolve naming differences (e.g. `first_bet` vs `first-timer`) and define canonical slugs.
- Backfill missing fields for legacy entries (rarity, autoAward, manualOnly, isShame, iconUrl).
- Migrate database to match the normalized schema and regenerate seeds.

## Test coverage goals
1. **Stat Tracking**
   - Verify that every stat required by achievements is persisted (bets placed/won, streaks, profit, parlay legs, social actions, Pong stats, etc.).
   - Add regression tests for stat services to confirm counters increment/decrement correctly on events.
2. **Award Logic**
   - Unit tests for `achievement.service` and `achievementEvaluator.service` ensuring awards trigger at the correct thresholds and respect manual-only flags.
   - Integration tests simulating user activity (betting, creating predictions, following users, playing Pong) to unlock representative achievements.
   - Tests for manual admin grants/revokes and bulk operations.
3. **Progress Display**
   - API tests for `/api/users/:id/achievements` to confirm progress, targetValue and completion metadata.
   - Socket tests verifying `achievement:unlocked` and progress updates reach subscribed clients.
   - Frontend component tests to ensure achievement progress bars and notifications render expected data.

## Task breakdown
- [ ] Merge catalog and legacy achievements, produce finalized seed file.
- [ ] Implement migration script to update existing records to new slugs and fields.
- [ ] Add fixture generators for common achievement scenarios (first bet, streaks, parlays, social actions, Pong).
- [ ] Write unit tests for achievement services covering auto/manual awards and edge cases.
- [ ] Add API and socket integration tests for progress and real-time updates.
- [ ] Document testing matrix mapping achievements to required stats and test coverage.

