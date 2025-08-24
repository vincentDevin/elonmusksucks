# Leaderboard Reconciliation

## Overview

Leaderboard reconciliation detects and fixes ranking drift that can occur due to concurrent updates, cache inconsistencies, or calculation errors.

## Drift Detection Algorithm

1. Fetch current leaderboard from database
2. Sort users by Elo rating to determine expected order
3. Compare expected rank vs actual rank for each user
4. Report users with position mismatches as drift

## Usage

### Dry Run (Safe)
```bash
node scripts/reconcile-leaderboard.ts
```

### Apply Fixes
```bash
node scripts/reconcile-leaderboard.ts --apply
```

## Example Output

```
[reconcile] Starting leaderboard reconciliation (DRY RUN)
[reconcile] Users with drift: 3
[reconcile] Fixes applied: 0
[reconcile] Drift details: [
  { userId: 5, expectedRank: 3, actualRank: 5, eloRating: 1300 },
  { userId: 3, expectedRank: 5, actualRank: 3, eloRating: 1400 }
]
```

## Safety Features

- **Dry run by default** - Never applies fixes unless explicitly requested
- **Drift reporting** - Shows exactly which users have incorrect rankings
- **Batch refresh** - Uses repository's refreshLeaderboard() method for atomic updates

## Monitoring

Run reconciliation script regularly (daily/weekly) to detect and fix leaderboard drift before it affects user experience.