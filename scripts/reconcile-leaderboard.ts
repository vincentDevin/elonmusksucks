#!/usr/bin/env node
// scripts/reconcile-leaderboard.ts
// -----------------------------------------------------------------------------
// Leaderboard Reconciliation Script - Drift Detection and Correction
// -----------------------------------------------------------------------------

import { detectLeaderboardDrift, reconcileLeaderboard } from '../apps/server/src/services/leaderboard.service';

// Mock repository for demonstration (production would use actual repository)
const mockRepository = {
  getLeaderboard: async ({ limit }: { limit: number }) => {
    // Mock leaderboard data with potential drift
    return Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
      userId: i + 1,
      eloRating: 1500 - i * 50, // Descending Elo ratings
      rank: i + 1,
    }));
  },
  refreshLeaderboard: async () => {
    console.log('[mock] Leaderboard refreshed');
  },
};

async function main() {
  const dryRun = !process.argv.includes('--apply');
  
  console.log(`[reconcile] Starting leaderboard reconciliation (${dryRun ? 'DRY RUN' : 'APPLY'})`);
  
  try {
    const result = await reconcileLeaderboard(mockRepository, dryRun);
    
    console.log(`[reconcile] Users with drift: ${result.usersDrifted}`);
    console.log(`[reconcile] Fixes applied: ${result.fixesApplied}`);
    
    if (result.driftDetails.length > 0) {
      console.log('[reconcile] Drift details:', result.driftDetails);
    }
    
    console.log('[reconcile] Reconciliation completed successfully');
  } catch (error) {
    console.error('[reconcile] Error:', error);
    process.exit(1);
  }
}

main();