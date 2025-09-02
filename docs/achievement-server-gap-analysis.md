# Achievement System Server Gap Analysis

This document summarizes initial gaps in the server implementation that may prevent the achievement system from functioning end‑to‑end.

## 1. Multiple Achievement Systems
- Legacy `AchievementService` is still used for progress queries and trigger-based awards.
- Newer `AchievementEvaluatorService` and `AchievementEngine` exist but are not wired into request handlers or workers.
- `AchievementEngine` factory is defined yet never instantiated by the server.

## 2. Incomplete Stat Tracking
- `StatsRepository` exposes placeholder counters for Pong and social metrics and maps `betsWon` to a non-existent `totalWins` field.
- No code increments stats for social actions, Pong results, or follow counts, limiting rule evaluation.

## 3. Event Coverage Gaps
- `AchievementEvent` defines many trigger types (chat, posts, leaderboard, AI tweets, login streaks) that have no corresponding emitters in the codebase.
- Current events mostly originate from betting and payout repositories, leaving social and activity domains uncovered.

## 4. Missing Rule Data
- Many achievements lack `ruleData`; repository provides a backfill helper with naive defaults.
- Without explicit rules, auto-award logic and the engine’s cache cannot evaluate these achievements.

## 5. Socket Payload Inconsistencies
- `statisticsSocketHandlers` accepts both legacy and new achievement payload formats, indicating an unfinished schema migration.
- Clients must handle multiple shapes for unlock messages and progress updates.

## Next Steps
- Consolidate on a single achievement engine and update API handlers to use it.
- Expand stat tracking to include Pong, social, and prediction counters, fixing field mappings.
- Emit `AchievementEvent` hooks across chat, posts, leaderboard closures, bans, and login tracking.
- Backfill and test `ruleData` for all achievements before enabling auto-awards.
- Standardize socket payloads and remove compatibility layers once clients are updated.
