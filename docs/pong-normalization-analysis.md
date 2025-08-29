# Pong System Normalization Analysis

**Date**: 2025-08-29  
**Status**: Analysis Complete  
**Priority**: Critical - Affects game integrity, payouts, and user experience

## Executive Summary

The Pong system has multiple critical inconsistencies that affect game results, payouts, Elo ratings, and match history. This analysis identifies 8 major issue categories with specific fixes to normalize the system according to the ground truth specification.

## Ground Truth Specification Recap

- **Participants & Roles**: `hostUserId` (player A) and `joinerUserId`/`aiUserId` (player B)
- **Modes**: `PVP` (human vs human) and `PVE_AI` (human vs AI)
- **Rated Logic**: `rated = (stakeMuskBucks > 0)` for both modes
- **Elo System**: Single ladder, k=32 for PVP, k=24 for PVE_AI, AI has real Elo account
- **Payouts**: PVP pot splitting, PVE_AI 2x player stake (AI/house not debited)
- **Match Lifecycle**: PENDING → join → ACTIVE (server-set) → end → finalize
- **Opponent Names**: Snapshot at ACTIVE start, fallback to live → snapshot → "Elon AI"

---

## Issue Categories & Analysis

### 1. Winner/Loser Determination Logic

**Problem**: Winner determined from UI paddle sides instead of canonical participant roles.

**Current Code Issues**:
```typescript
// apps/server/src/repositories/PongRepository.ts:344-347
const humanLoserId =
  matchData.winnerId && matchData.winnerId < 0
    ? matchData.playerOneId // AI won, human is playerOne
    : matchData.playerTwoId; // Human won, loser is playerTwo
```

**Issues**:
- Uses `playerOneId`/`playerTwoId` instead of `hostUserId`/`joinerUserId` 
- Negative `winnerId` hack for AI wins
- UI-dependent logic instead of server canonical roles

**Impact**: 
- Incorrect winner in cross-device scenarios
- Payouts to wrong players
- Elo applied to wrong participants

---

### 2. Elo Rating System Inconsistencies

**Problem**: Current hybrid Elo system doesn't match ground truth pure Elo specification.

**Current Implementation Issues**:
```typescript
// apps/server/src/services/pongElo.service.ts:52-107
// SKILL COMPONENT (50% weight) + ECONOMY COMPONENT (50% weight)
const totalChange = Math.round(skillChange * 0.5 + economyChange * 0.5);
```

**Specification Violations**:
- Uses hybrid skill+economy model vs. pure Elo
- K-factor always 32, should be 32 for PVP, 24 for PVE_AI
- Complex wager multipliers not in spec
- Missing proper AI Elo tracking

**Expected Formula**:
```
expected = 1/(1+10^((opponent-me)/400))
delta = round(k*(score-expected)) where score∈{0,1}
k = 32 for PVP, 24 for PVE_AI
```

**Impact**:
- Elo ratings don't reflect true skill
- Inconsistent progression between PVP/PVE_AI
- AI Elo not properly maintained

---

### 3. AI System Integration Problems

**Problem**: No centralized AI user account, inconsistent AI Elo handling.

**Missing Components**:
- `SYSTEM_AI_USER_ID` constant in `@ems/types`
- AI account in database with real Elo rating
- Proper AI Elo updates after matches

**Current Issues**:
```typescript
// AI difficulty mapped to fixed Elo in service
// But no real AI user account to track rating changes
```

**Impact**:
- AI can't improve/degrade over time
- Elo calculations use stale AI ratings
- Leaderboard can't optionally show AI performance

---

### 4. Payout System Architecture Flaws

**Problem**: Payouts handled in repository transactions instead of dedicated idempotent worker.

**Current Architecture Issues**:
```typescript
// apps/server/src/repositories/PongRepository.ts:406-423
// Payout logic mixed into recordCompleteMatch transaction
if (payoutAmount && payoutAmount > 0n && matchData.winnerId && matchData.winnerId > 0) {
  // Direct balance update + transaction creation
}
```

**Problems**:
- No idempotency protection
- PVP vs PVE_AI payout logic mixed
- No retry mechanism for failed payouts
- Repository doing business logic

**Missing**:
- Dedicated BullMQ payout worker
- Idempotency key: `payout_v1:${matchId}`
- Proper PVP pot vs PVE_AI 2x logic separation

---

### 5. Match Lifecycle State Management

**Problem**: Match status transitions not properly enforced by server.

**Current Issues**:
- ACTIVE status can be set by clients
- No server-side validation of state transitions
- Disconnect/forfeit handling inconsistent

**Missing Enforcement**:
```
PENDING → (client join) → (server validates) → ACTIVE → (game end) → COMPLETED
```

**Impact**:
- Race conditions in match starts
- Invalid state transitions
- Inconsistent disconnect penalties

---

### 6. Match History Opponent Names

**Problem**: "Unknown opponent" appearing in match history.

**Root Cause Analysis**:
```typescript
// No opponent name snapshotting at match start
// Query relies on live user names which may be null/changed
```

**Current Schema Missing**:
- `hostDisplayName` field for snapshot at ACTIVE
- `joinerDisplayName` field for snapshot at ACTIVE  
- Fallback logic: live → snapshot → "Elon AI"

**Impact**:
- Poor user experience in match history
- Loss of historical context
- AI matches showing as "unknown"

---

### 7. Mode and Rated Logic Inconsistencies

**Problem**: Mode determination and rated flag not consistently applied.

**Current Issues**:
- Mode not explicitly stored (`PVP` vs `PVE_AI`)
- Rated logic scattered across different files
- Free games (stake=0) handling inconsistent

**Missing Normalization**:
```typescript
interface PongMatchNormalized {
  mode: 'PVP' | 'PVE_AI';
  rated: boolean; // = stakeMuskBucks > 0
  // ...
}
```

---

### 8. Socket Event Architecture Violations

**Problem**: Direct Redis publishing violates dependency injection pattern.

**Current Violations**:
```typescript
// apps/server/src/handlers/pongSocketHandlers.ts:203
await redisClient.publish('pong:elo:update', JSON.stringify(data));
```

**Architecture Issues**:
- Services bypass event bus interface
- Direct Redis coupling
- No event bus abstraction

**CLAUDE.md Requirement**:
```typescript
interface IEventBus {
  publish<T>(channel: string, payload: T): Promise<void>;
}
```

---

## Comprehensive Normalization Plan

### Phase 1: Database Schema Normalization

**New Fields Required**:
```sql
-- PongMatch table additions
ALTER TABLE "PongMatch" ADD COLUMN "mode" VARCHAR NOT NULL DEFAULT 'PVP';
ALTER TABLE "PongMatch" ADD COLUMN "rated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PongMatch" ADD COLUMN "hostUserId" INTEGER NOT NULL;
ALTER TABLE "PongMatch" ADD COLUMN "joinerUserId" INTEGER;
ALTER TABLE "PongMatch" ADD COLUMN "aiUserId" INTEGER; 
ALTER TABLE "PongMatch" ADD COLUMN "hostDisplayName" VARCHAR;
ALTER TABLE "PongMatch" ADD COLUMN "joinerDisplayName" VARCHAR;
ALTER TABLE "PongMatch" ADD COLUMN "aiDisplayName" VARCHAR DEFAULT 'Elon AI';

-- New constraints
ALTER TABLE "PongMatch" ADD CONSTRAINT "host_not_joiner" CHECK ("hostUserId" != "joinerUserId");
ALTER TABLE "PongMatch" ADD CONSTRAINT "valid_mode" CHECK (
  ("mode" = 'PVP' AND "joinerUserId" IS NOT NULL AND "aiUserId" IS NULL) OR
  ("mode" = 'PVE_AI' AND "joinerUserId" IS NULL AND "aiUserId" IS NOT NULL)
);
```

**Data Migration**:
```sql
-- Backfill existing matches
UPDATE "PongMatch" SET 
  "hostUserId" = "playerOneId",
  "joinerUserId" = CASE WHEN "playerTwoId" > 0 THEN "playerTwoId" ELSE NULL END,
  "aiUserId" = CASE WHEN "playerTwoId" < 0 OR "aiDifficulty" IS NOT NULL THEN -1 ELSE NULL END,
  "mode" = CASE WHEN "aiDifficulty" IS NOT NULL THEN 'PVE_AI' ELSE 'PVP' END,
  "rated" = ("wagerAmount" > 0);
```

### Phase 2: Pure Elo Engine Implementation

**New Elo Service**:
```typescript
export class PureEloService {
  private static readonly K_FACTOR_PVP = 32;
  private static readonly K_FACTOR_PVE_AI = 24;
  
  static calculateEloChange(input: EloInput): EloResult {
    const { playerElo, opponentElo, won, mode } = input;
    const k = mode === 'PVP' ? this.K_FACTOR_PVP : this.K_FACTOR_PVE_AI;
    const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
    const score = won ? 1 : 0;
    const delta = Math.round(k * (score - expected));
    return { delta, newRating: playerElo + delta };
  }
}
```

### Phase 3: Dedicated Payout Worker

**BullMQ Worker Architecture**:
```typescript
// apps/server/src/workers/pong-payout.worker.ts
export class PongPayoutWorker {
  static async process(job: Job<PongPayoutData>) {
    const { matchId, winnerId, mode, stakeAmount } = job.data;
    const idempotencyKey = `payout_v1:${matchId}`;
    
    // Idempotent payout logic
    const existingPayout = await checkExistingPayout(idempotencyKey);
    if (existingPayout) return existingPayout;
    
    if (mode === 'PVP') {
      return processPVPPayout(winnerId, stakeAmount * 2); // pot
    } else {
      return processPVEPayout(winnerId, stakeAmount * 2); // house pays 2x
    }
  }
}
```

### Phase 4: Canonical Match Lifecycle

**Lifecycle Service**:
```typescript
export class PongMatchLifecycle {
  async createMatch(hostUserId: number, mode: PongMode, stake: bigint) {
    return await this.repo.createMatch({
      hostUserId,
      mode,
      rated: stake > 0n,
      status: 'PENDING'
    });
  }
  
  async joinMatch(matchId: string, joinerUserId: number) {
    // Validate and transition to server-managed ACTIVE
    const match = await this.validateJoin(matchId, joinerUserId);
    await this.setActiveWithSnapshots(match);
  }
  
  private async setActiveWithSnapshots(match: PongMatch) {
    const hostUser = await this.getUser(match.hostUserId);
    const joinerUser = match.joinerUserId ? await this.getUser(match.joinerUserId) : null;
    
    await this.repo.updateMatch(match.id, {
      status: 'ACTIVE',
      startedAt: new Date(),
      hostDisplayName: hostUser.name,
      joinerDisplayName: joinerUser?.name || null,
      aiDisplayName: match.mode === 'PVE_AI' ? 'Elon AI' : null
    });
  }
}
```

### Phase 5: Event Bus Integration

**Dependency Injection Pattern**:
```typescript
// Service constructor injection
export class PongMatchService {
  constructor(private eventBus: IEventBus) {}
  
  async completeMatch(matchId: string, result: MatchResult) {
    // Business logic
    await this.processMatchEnd(matchId, result);
    
    // Event publishing through interface
    await this.eventBus.publish('pong:match:completed', {
      matchId,
      winnerId: result.winnerId,
      eloChanges: result.eloChanges
    });
  }
}
```

### Phase 6: Match History Resolution

**Query Enhancement**:
```typescript
async getMatchHistory(userId: number): Promise<PongHistoryItem[]> {
  const matches = await this.repo.getPlayerMatches(userId);
  
  return matches.map(match => ({
    ...match,
    opponentName: this.resolveOpponentName(match, userId)
  }));
}

private resolveOpponentName(match: PongMatch, currentUserId: number): string {
  if (match.mode === 'PVE_AI') return match.aiDisplayName || 'Elon AI';
  
  const isHost = match.hostUserId === currentUserId;
  const opponentDisplayName = isHost ? match.joinerDisplayName : match.hostDisplayName;
  const liveOpponentId = isHost ? match.joinerUserId : match.hostUserId;
  
  // Fallback chain: snapshot → live lookup → 'Unknown'
  return opponentDisplayName || 
         (liveOpponentId ? this.getLiveUserName(liveOpponentId) : null) || 
         'Unknown Player';
}
```

---

## Implementation Sequence

### Immediate Priorities (Week 1)
1. **Create AI system user account** with starting Elo
2. **Fix winner/loser determination** to use canonical roles
3. **Implement pure Elo service** with correct K-factors
4. **Add opponent name snapshotting** to existing matches

### Short Term (Week 2-3)  
5. **Create dedicated payout worker** with idempotency
6. **Normalize match lifecycle** with server-controlled ACTIVE
7. **Implement event bus pattern** for socket events
8. **Add comprehensive test coverage** for all fixes

### Medium Term (Week 4)
9. **Schema migration and backfill** for historical data
10. **Client UI updates** to consume normalized contracts
11. **Performance optimization** for match history queries
12. **Security hardening** for match state transitions

---

## Success Metrics

### Functional Correctness
- [ ] Winner determination independent of UI paddle sides
- [ ] Correct Elo deltas: PVP ±16 equal, PVE_AI ±12 equal  
- [ ] AI Elo properly tracked and updated
- [ ] Zero "unknown opponent" in match history
- [ ] Idempotent payouts (no double payments)

### System Quality
- [ ] All payout jobs retry-safe with idempotency keys
- [ ] Match state transitions server-enforced
- [ ] Event bus pattern eliminating direct Redis calls
- [ ] 100% test coverage on Elo calculations
- [ ] Sub-100ms match history queries with proper indexing

### User Experience  
- [ ] Consistent match results across all devices
- [ ] Proper opponent names in all historical matches
- [ ] Predictable Elo progression rates
- [ ] Fair payouts for both PVP and PVE_AI modes
- [ ] Graceful disconnect/forfeit handling

---

## Risk Mitigation

### Data Integrity
- **Backup strategy**: Full database backup before schema migration
- **Rollback plan**: Migration reversals with data restoration scripts
- **Validation**: Cross-check existing vs. normalized calculations on sample data

### Performance Impact
- **Index strategy**: Add covering indexes for new query patterns
- **Migration approach**: Chunked backfill to avoid lock timeouts  
- **Monitoring**: Track query performance before/after normalization

### User Impact
- **Gradual rollout**: Feature flags for new Elo calculation
- **Communication**: Clear changelog explaining Elo system improvements
- **Compatibility**: Maintain existing API contracts during transition

---

## Testing Strategy

### Unit Tests
```typescript
describe('PureEloService', () => {
  it('calculates correct deltas for equal Elo PVP', () => {
    expect(PureEloService.calculateEloChange({
      playerElo: 1500, opponentElo: 1500, won: true, mode: 'PVP'
    })).toEqual({ delta: 16, newRating: 1516 });
  });
  
  it('uses correct K-factor for PVE_AI', () => {
    expect(PureEloService.calculateEloChange({
      playerElo: 1500, opponentElo: 1500, won: true, mode: 'PVE_AI'  
    })).toEqual({ delta: 12, newRating: 1512 });
  });
});
```

### Integration Tests
```typescript
describe('PongPayoutWorker', () => {
  it('prevents double payouts with idempotency', async () => {
    const job1 = await enqueuePayoutJob({ matchId: 'test', winnerId: 1 });
    const job2 = await enqueuePayoutJob({ matchId: 'test', winnerId: 1 });
    
    const results = await Promise.all([job1.finished(), job2.finished()]);
    expect(results[0]).toEqual(results[1]); // Same payout result
    expect(await getUserBalance(1)).toBe(2000); // Only paid once
  });
});
```

### End-to-End Tests
```typescript
describe('Full Match Lifecycle', () => {
  it('handles PVP match from creation to payout', async () => {
    const match = await createMatch(host: 1, stake: 1000);
    await joinMatch(match.id, joiner: 2);
    expect(match.status).toBe('ACTIVE');
    expect(match.hostDisplayName).toBe('Host User');
    
    await completeMatch(match.id, { winnerId: 1, score: [11, 5] });
    await waitForPayoutProcessing();
    
    expect(await getUserBalance(1)).toBe(initialBalance + 2000);
    expect(await getUserElo(1)).toBe(initialElo + expectedDelta);
  });
});
```

---

This analysis provides a complete roadmap for normalizing the Pong system to match the ground truth specification while maintaining data integrity and system performance.