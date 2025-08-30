# Pong AI Difficulty-Based Payout Fix Plan

## Problem Summary
The pong payout system currently uses a fixed 2x multiplier for all AI matches, regardless of difficulty level. This doesn't match the expected payouts displayed in the client UI.

## Current State Analysis

### Expected Payout Multipliers (from client UI)
- **Easy** (Grimes' Laptop): 1.2x
- **Medium** (Zuck's Metaverse): 1.5x
- **Hard** (Bezos' Rocket): 2.0x
- **Impossible** (X Æ A-XII): 3.0x

### Current Implementation Issues
1. `PongPayoutData` interface lacks AI difficulty field
2. `pongStats.service.ts` doesn't pass AI difficulty when enqueueing payouts
3. `pong-payout.worker.ts` uses hardcoded 2x multiplier for all AI matches

### Existing Type Definitions
- `PongDifficulty` enum exists in Prisma schema: `EASY`, `MEDIUM`, `HARD`, `IMPOSSIBLE`
- `AIDifficulty` type exists in types package: `keyof typeof AI_DIFFICULTIES`
- `PongMatchResult` interface has `aiDifficulty?: any` field
- `PongMatch` database model stores `aiDifficulty` field

## Implementation Plan

### Phase 1: Update Type Definitions
**File:** `packages/types/src/index.ts`

#### Task 1.1: Update PongPayoutData Interface
```typescript
// Current
export interface PongPayoutData {
  matchId: string;
  winnerId: number;
  mode: 'PVP' | 'PVE_AI';
  stakeAmount: number;
}

// Updated
export interface PongPayoutData {
  matchId: string;
  winnerId: number;
  mode: 'PVP' | 'PVE_AI';
  stakeAmount: number;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE'; // Add this field
}
```

#### Task 1.2: Export PongDifficulty Type
```typescript
// Add this export for consistency
export type PongDifficulty = 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
```

#### Task 1.3: Rebuild Types Package
```bash
cd packages/types && npm run build
```

---

### Phase 2: Update Pong Stats Service
**File:** `apps/server/src/services/pongStats.service.ts`

#### Task 2.1: Update Payout Enqueueing Logic
Locate the payout enqueueing section (around line 313-319) and update:

```typescript
// Current (lines 313-319)
if (winnerId && winnerId > 0 && wagerAmount > 0) {
  const payoutData: PongPayoutData = {
    matchId,
    winnerId,
    mode: isAIMatch ? 'PVE_AI' : 'PVP',
    stakeAmount: wagerAmount,
  };

// Updated
if (winnerId && winnerId > 0 && wagerAmount > 0) {
  const payoutData: PongPayoutData = {
    matchId,
    winnerId,
    mode: isAIMatch ? 'PVE_AI' : 'PVP',
    stakeAmount: wagerAmount,
    aiDifficulty: isAIMatch ? matchData.aiDifficulty : undefined, // Add this line
  };
```

---

### Phase 3: Update Pong Payout Worker
**File:** `apps/server/src/workers/pong-payout.worker.ts`

#### Task 3.1: Add Difficulty-to-Multiplier Helper Function
Add this helper function near the top of the file (after imports):

```typescript
/**
 * Get payout multiplier based on AI difficulty
 */
function getAIDifficultyMultiplier(difficulty?: string): number {
  switch (difficulty) {
    case 'EASY':
      return 1.2;
    case 'MEDIUM':
      return 1.5;
    case 'HARD':
      return 2.0;
    case 'IMPOSSIBLE':
      return 3.0;
    default:
      // Default to medium difficulty if not specified (backward compatibility)
      return 1.5;
  }
}
```

#### Task 3.2: Update Worker Job Handler
Update the job handler to extract aiDifficulty:

```typescript
// Current (line 21)
const { matchId, winnerId, mode, stakeAmount } = job.data;

// Updated
const { matchId, winnerId, mode, stakeAmount, aiDifficulty } = job.data;
```

#### Task 3.3: Update processPVPPayout Call
```typescript
// Current (line 41)
result = await processPVPPayout(matchId, winnerId, stakeAmountBigInt, idempotencyKey);

// No change needed - PVP doesn't use difficulty
```

#### Task 3.4: Update processPVEPayout Call
```typescript
// Current (line 43)
result = await processPVEPayout(matchId, winnerId, stakeAmountBigInt, idempotencyKey);

// Updated
result = await processPVEPayout(matchId, winnerId, stakeAmountBigInt, idempotencyKey, aiDifficulty);
```

#### Task 3.5: Update processPVEPayout Function
```typescript
// Current function signature (line 129)
async function processPVEPayout(
  matchId: string,
  winnerId: number,
  stakeAmount: bigint,
  idempotencyKey: string,
): Promise<PongPayoutResult> {

// Updated function signature
async function processPVEPayout(
  matchId: string,
  winnerId: number,
  stakeAmount: bigint,
  idempotencyKey: string,
  aiDifficulty?: string,
): Promise<PongPayoutResult> {

  // Current payout calculation (line 144)
  const payoutAmount = stakeAmount * 2n; // House pays 2x stake

  // Updated payout calculation
  const multiplier = getAIDifficultyMultiplier(aiDifficulty);
  const payoutAmount = stakeAmount * BigInt(Math.floor(multiplier * 100)) / 100n;
  // Note: We multiply by 100 and divide by 100n to handle decimal multipliers with BigInt
```

---

### Phase 4: Testing Plan

#### Test Case 1: Easy AI (1.2x)
1. Play against "Grimes' Laptop" with 1000 MuskBucks wager
2. Win the match
3. Verify payout is 1200 MuskBucks (1000 * 1.2)

#### Test Case 2: Medium AI (1.5x)
1. Play against "Zuck's Metaverse" with 1000 MuskBucks wager
2. Win the match
3. Verify payout is 1500 MuskBucks (1000 * 1.5)

#### Test Case 3: Hard AI (2.0x)
1. Play against "Bezos' Rocket" with 1000 MuskBucks wager
2. Win the match
3. Verify payout is 2000 MuskBucks (1000 * 2.0)

#### Test Case 4: Impossible AI (3.0x)
1. Play against "X Æ A-XII" with 1000 MuskBucks wager
2. Win the match
3. Verify payout is 3000 MuskBucks (1000 * 3.0)

#### Test Case 5: PVP Match (2.0x)
1. Create PVP match with 1000 MuskBucks wager
2. Win the match
3. Verify payout is 2000 MuskBucks (unchanged behavior)

---

### Phase 5: Deployment Checklist

1. **Stop all services**
   ```bash
   # Stop workers to prevent processing with old logic
   ```

2. **Apply code changes in order**
   - Update types package
   - Rebuild types: `cd packages/types && npm run build`
   - Update pongStats.service.ts
   - Update pong-payout.worker.ts

3. **Restart services**
   ```bash
   npm run dev
   # Ensure pong-payout.worker.ts is included in worker startup
   ```

4. **Monitor logs**
   - Check for payout processing logs
   - Verify correct multipliers are being applied
   - Monitor for any errors

---

## Rollback Plan

If issues occur:
1. Revert code changes
2. Rebuild types package
3. Restart services
4. Process any failed payouts manually if needed

---

## Success Criteria

- [ ] AI Easy difficulty pays out 1.2x stake
- [ ] AI Medium difficulty pays out 1.5x stake  
- [ ] AI Hard difficulty pays out 2.0x stake
- [ ] AI Impossible difficulty pays out 3.0x stake
- [ ] PVP matches continue to pay out 2.0x stake
- [ ] No errors in payout worker logs
- [ ] All queued payouts process successfully

---

## Notes

- The multiplier calculation uses integer math with BigInt to avoid floating point issues
- Backward compatibility is maintained by defaulting to 1.5x (Medium) if difficulty is not specified
- The change is backward compatible with existing queued jobs that don't have aiDifficulty field