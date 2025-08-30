# Complex Pong Elo Calculation Fixes

## Overview

The current system has an inconsistency where **complex hybrid Elo calculations** are used for predictions (`PongEloService`) but **simple pure Elo calculations** are used for actual match results (`PureEloService`). 

This document outlines the fixes needed to make the **complex Elo system the standard** across both predictions and actual match processing, while also optimizing the client-side experience by moving calculations client-side and only calling the server when wagers are locked in.

## Current Problem

- **Predictions**: Use `PongEloService.predictEloChange()` - Complex hybrid system with wager multipliers, economy components, bonus modifiers
- **Actual Match Processing**: Use `PureEloService.calculateEloChange()` - Simple standard Elo formula
- **Client**: Calls server API every time wager amount changes for predictions
- **AI Elo Values**: Inconsistent across different services

## Proposed Solution

1. **Make Complex Elo the Standard**: Replace `PureEloService` usage with `PongEloService` in match processing
2. **Client-Side Prediction Calculations**: Move complex Elo calculations to the client to avoid excessive API calls
3. **Lock-in Wager Flow**: Only call server for prediction when user locks in their wager
4. **Standardize AI Elo Values**: Align all AI difficulty ratings across services

## Required Fixes

### 1. Server-Side Fixes

#### Fix 1: Update Match Processing to Use Complex Elo
**File**: `/apps/server/src/services/pongStats.service.ts`
**Location**: Lines 417-446 in `calculateMatchStats()`

**Current Code**:
```typescript
if (isRated) {
  // Use pure Elo calculation for rated matches
  const pureEloResult = PureEloService.calculateEloChange({
    playerElo: winnerElo,
    opponentElo: loserElo,
    won: true,
    mode: mode as 'PVP' | 'PVE_AI',
  });
  
  // Convert to legacy format for compatibility
  winnerEloChange = {
    skillChange: pureEloResult.delta,
    economyChange: 0, // Pure Elo doesn't have economy component
    economyComponent: 0,
    totalChange: pureEloResult.delta,
    newRating: pureEloResult.newRating,
    newTier: PureEloService.getTier(pureEloResult.newRating),
  };
}
```

**Replacement Code**:
```typescript
if (isRated) {
  // Use complex hybrid Elo calculation for rated matches
  winnerEloChange = PongEloService.calculateEloChange({
    playerElo: winnerElo,
    opponentElo: loserElo,
    playerWon: true,
    wagerAmount,
    amountWon: payoutAmount,
    isAiOpponent: mode === 'PVE_AI',
    isPerfectGame,
  });
  
  // Calculate loser changes if human loser
  if (loserId && loserId > 0) {
    loserEloChange = PongEloService.calculateEloChange({
      playerElo: loserElo,
      opponentElo: winnerElo,
      playerWon: false,
      wagerAmount,
      amountWon: 0n,
      isAiOpponent: mode === 'PVE_AI',
      isPerfectGame: false,
    });
  }
}
```

#### Fix 2: Standardize AI Elo Values
**File**: `/apps/server/src/services/pureElo.service.ts`
**Location**: Lines 97-107 in `getAIEloByDifficulty()`

**Update to match PongEloService values**:
```typescript
static getAIEloByDifficulty(difficulty: string): number {
  const difficultyMap: Record<string, number> = {
    EASY: 800,    // Changed from 1000
    MEDIUM: 1200, // Same
    HARD: 1600,   // Changed from 1500  
    IMPOSSIBLE: 2400, // Changed from 1800
  };

  return difficultyMap[difficulty] || 1200;
}
```

#### Fix 3: Update PongEloService AI Elo Method
**File**: `/apps/server/src/services/pongElo.service.ts`
**Location**: Lines 139-152 in `getAiElo()`

**Fix the IMPOSSIBLE difficulty**:
```typescript
static getAiElo(difficulty: PongDifficulty): number {
  switch (difficulty) {
    case 'EASY':
      return 800;
    case 'MEDIUM':
      return 1200;
    case 'HARD':
      return 1600;
    case 'IMPOSSIBLE':
      return 2400; // Changed from 2400 to match other services
    default:
      return 1200;
  }
}
```

### 2. Client-Side Fixes

#### Fix 4: Add Client-Side Complex Elo Calculation
**File**: `/apps/client/src/utils/eloCalculations.ts` (NEW FILE)

**Create a client-side implementation of the complex Elo system**:
```typescript
export interface EloChangeComponents {
  skillChange: number;
  economyChange: number;
  economyComponent: number;
  totalChange: number;
  newRating: number;
  newTier: string;
}

export interface EloCalculationInput {
  playerElo: number;
  opponentElo: number;
  playerWon: boolean;
  wagerAmount: number; // Use number on client (convert to bigint for calculation)
  amountWon: number;
  isAiOpponent?: boolean;
  isPerfectGame?: boolean;
}

export class ClientEloCalculator {
  private static readonly K_FACTOR = 32;
  private static readonly MIN_ELO = 400;
  private static readonly MAX_ELO = 3000;

  // Tier boundaries
  private static readonly TIERS = {
    BRONZE: { min: 400, max: 999 },
    SILVER: { min: 1000, max: 1399 },
    GOLD: { min: 1400, max: 1799 },
    PLATINUM: { min: 1800, max: 2199 },
    DIAMOND: { min: 2200, max: 2599 },
    MASTER: { min: 2600, max: 2999 },
    GRANDMASTER: { min: 3000, max: 10000 },
  };

  // AI Elo mappings (standardized)
  private static readonly AI_ELO_MAP = {
    easy: 800,
    medium: 1200,
    hard: 1600,
    impossible: 2400,
  };

  static calculateEloChange(input: EloCalculationInput): EloChangeComponents {
    // Implementation matching server PongEloService.calculateEloChange()
    // [Copy the exact algorithm from server]
  }

  static getTierFromElo(elo: number): string {
    for (const [tier, bounds] of Object.entries(this.TIERS)) {
      if (elo >= bounds.min && elo <= bounds.max) {
        return tier;
      }
    }
    return 'BRONZE';
  }

  static getAiElo(difficulty: string): number {
    return this.AI_ELO_MAP[difficulty as keyof typeof this.AI_ELO_MAP] || 1200;
  }

  static predictEloChange(
    playerElo: number,
    opponentElo: number,
    wagerAmount: number,
  ): {
    winChange: number;
    lossChange: number;
    skillComponent: { win: number; loss: number };
    economyComponent: { win: number; loss: number };
    confidenceLevel: 'high' | 'medium' | 'low';
  } {
    // Implementation matching server PongEloService.predictEloChange()
    // but using client-side calculations
  }
}
```

#### Fix 5: Update EloPredictionCard for Lock-in Flow
**File**: `/apps/client/src/components/pong/EloPredictionCard.tsx`

**Major changes needed**:
1. Remove automatic server API calls on wager change
2. Add "Lock Wager" button before showing predictions
3. Use client-side calculations for immediate feedback
4. Only call server when wager is locked in
5. Use standardized AI Elo values

**Key changes**:
```typescript
// Remove useEffect that calls server on every wager change (lines 67-103)
// Replace with:

const [isWagerLocked, setIsWagerLocked] = useState(false);
const [lockedWager, setLockedWager] = useState(0);

// Use client-side calculation for immediate feedback
const clientPrediction = useMemo(() => {
  if (wagerAmount === 0 || !isWagerLocked) return null;
  
  let effectiveOpponentElo = opponentElo;
  if (opponentType === 'ai') {
    effectiveOpponentElo = ClientEloCalculator.getAiElo(aiDifficulty);
  } else if (!effectiveOpponentElo) {
    effectiveOpponentElo = 1400; // Default PVP opponent Elo
  }
  
  return ClientEloCalculator.predictEloChange(
    playerElo,
    effectiveOpponentElo,
    wagerAmount
  );
}, [playerElo, opponentElo, opponentType, aiDifficulty, wagerAmount, isWagerLocked]);

// Update AI Elo map (lines 77-83)
const aiEloMap = {
  easy: 800,     // Updated
  medium: 1200,  // Same
  hard: 1600,    // Updated  
  impossible: 2400, // Updated
};
```

#### Fix 6: Update PongMatchCreator for Lock-in Flow
**File**: `/apps/client/src/components/pong/PongMatchCreator.tsx`

**Add lock-in state management**:
```typescript
const [isAiWagerLocked, setIsAiWagerLocked] = useState(false);
const [isPvpWagerLocked, setIsPvpWagerLocked] = useState(false);

// Add lock wager buttons
// Only show EloPredictionCard when wager is locked
// Add unlock/change wager functionality
```

### 3. API Endpoint Updates

#### Fix 7: Update Predict Elo Endpoint (Optional Optimization)
**File**: `/apps/server/src/controllers/pong.controller.ts`
**Location**: Lines 321-350 in `predictEloChange()`

Since we're moving to client-side calculations, this endpoint becomes optional but should still use `PongEloService` if called:

```typescript
// Replace line 339-343
const prediction = PongEloService.predictEloChange(
  playerEloNum,
  opponentEloNum,
  BigInt(wagerAmountNum),
);
```

## Implementation TODO List

### Phase 1: Server-Side Standardization
- [ ] **Fix pongStats.service.ts**: Replace PureEloService with PongEloService in match processing (Lines 417-446)
- [ ] **Fix PureEloService AI Elo values**: Update getAIEloByDifficulty to match PongEloService values
- [ ] **Fix PongEloService**: Ensure IMPOSSIBLE difficulty is 2400 (currently correct)
- [ ] **Test server-side**: Verify actual match Elo changes now use complex calculations

### Phase 2: Client-Side Implementation  
- [ ] **Create ClientEloCalculator**: New utility file with client-side complex Elo calculations
- [ ] **Update EloPredictionCard**: Implement lock-in wager flow and client-side predictions
- [ ] **Update PongMatchCreator**: Add wager lock-in UI states and controls
- [ ] **Update AI Elo values**: Standardize client-side AI difficulty mappings

### Phase 3: Integration & Testing
- [ ] **Test prediction accuracy**: Verify client predictions match server calculations
- [ ] **Test lock-in flow**: Ensure UX works smoothly with wager lock-in
- [ ] **Test all match types**: Verify PVP and PVE_AI matches use complex Elo
- [ ] **Performance test**: Ensure client-side calculations are fast enough

### Phase 4: Cleanup (Optional)
- [ ] **Deprecate predict-elo endpoint**: Since calculations are now client-side
- [ ] **Remove PureEloService**: If no longer needed elsewhere
- [ ] **Add complex Elo documentation**: Document the algorithm for future reference

## Benefits of This Approach

1. **Consistent Experience**: Predictions will exactly match actual results
2. **More Engaging**: Complex Elo system encourages strategic high-wager gameplay
3. **Better Performance**: No API calls for every wager change
4. **Better UX**: Lock-in flow prevents accidental bets and gives users control
5. **Scalable**: Client-side calculations reduce server load

## Migration Strategy

1. **Phase 1 first**: Fix server-side inconsistencies so actual matches use complex Elo
2. **Test thoroughly**: Ensure no regressions in match processing
3. **Phase 2**: Implement client-side calculations and lock-in flow
4. **Gradual rollout**: Can deploy server changes first, then client changes
5. **Monitor**: Watch for any performance or accuracy issues

## Risk Mitigation

- **Backup calculations**: Keep server endpoint as fallback if client calculation fails  
- **Validation**: Add server-side validation that client predictions are reasonable
- **Gradual deployment**: Deploy server changes first to ensure stability
- **Rollback plan**: Can quickly revert to PureEloService if issues arise