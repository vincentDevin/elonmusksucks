# Achievement Tracking Infrastructure Requirements

## Executive Summary

After a comprehensive review of the 118 auto-awardable achievements and existing infrastructure, this document outlines the tracking systems needed to enable all achievements. Currently, basic counter-based achievements work (chat messages, bet counts, pong wins), but many complex achievements requiring time-based tracking, streak management, and cross-system correlation are not yet implemented.

## Current Infrastructure Status

### ✅ **Working Systems**

1. **Core Achievement Engine**
   - `AchievementEngine.ts` - Rule evaluation and unlocking
   - `RuleEvaluator.ts` - JSON rule compilation and execution
   - `AchievementEventLog` table - Idempotency and deduplication
   - `achievementEventHandler.ts` - Redis event subscription (34 channels)

2. **Basic Stats Tracking**
   - `UserStats` table - Betting statistics (bets, wins, streaks, wagered amounts)
   - `PongStats` table - Pong game statistics (matches, wins, ELO, streaks)
   - `StatsRepository.ts` - Real-time counter aggregation from multiple sources

3. **Event Publishing**
   - Chat events: `chat:message:sent`, `chat:typing:start/stop`
   - Betting events: `bet:placed`, `bet:won/lost`, `parlay:placed/won/lost`
   - Pong events: `pong:match:completed`, `pong:elo:update`
   - Prediction events: `prediction:created`, `prediction:approved`

### ❌ **Missing Infrastructure**

## Required Tracking Systems by Category

### 1. **Time-Based Tracking System** 🕐
**Needed for: 15+ achievements**

#### Requirements:
- Track actions within specific time windows (daily, weekly, monthly)
- Store historical data for pattern detection
- Support for "X actions in Y time period" queries

#### Missing Components:
```sql
-- Required table
CREATE TABLE "UserActivityLog" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  activityType VARCHAR(50) NOT NULL, -- 'chat_message', 'bet_placed', 'login', etc.
  metadata JSONB,
  occurredAt TIMESTAMP NOT NULL DEFAULT NOW(),
  dateKey VARCHAR(10) -- '2024-01-15' for daily aggregation
);

CREATE INDEX idx_activity_user_date ON "UserActivityLog"(userId, dateKey, activityType);
```

#### Achievements Blocked:
- **Chatterbox** - Send 100 messages in a single day
- **Daily Visitor** - Visit 7 days in a row
- **Daily Visit Streak** - Visit 30 days in a row
- **Weekend Warrior** - Place bets on 5 consecutive weekends
- **Speed Demon** - Place 10 bets in under 60 seconds
- **Consistent Gambler** - Place bets 30 days in a row
- **Ghost of Chat** - Go 30 days without sending a message

### 2. **Streak Management Service** 🔥
**Needed for: 20+ achievements**

#### Requirements:
- Track consecutive wins/losses across betting and pong
- Handle streak breaking and continuation logic
- Support multiple streak types per user

#### Missing Components:
```sql
-- Required table
CREATE TABLE "UserStreak" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  streakType VARCHAR(50) NOT NULL, -- 'bet_win', 'pong_win', 'daily_login', etc.
  currentStreak INTEGER DEFAULT 0,
  bestStreak INTEGER DEFAULT 0,
  lastActionAt TIMESTAMP,
  startedAt TIMESTAMP,
  UNIQUE(userId, streakType)
);
```

```typescript
// Required service: StreakManager.ts
class StreakManager {
  async updateStreak(userId: number, type: string, won: boolean): Promise<void>
  async checkDailyStreak(userId: number, type: string): Promise<void>
  async resetStreak(userId: number, type: string): Promise<void>
}
```

#### Achievements Blocked:
- **Hot Hand** - Win 5 bets in a row
- **Diamond Hands** - Win 10 bets in a row
- **Losing Spiral** - Lose 10 bets in a row
- **Lucky Seven** - Win 7 parlays in a row
- **Comeback King** - Recover from 5 losses to profit

### 3. **Social Interaction Tracking** 👥
**Needed for: 25+ achievements**

#### Requirements:
- Track post upvotes/downvotes
- Monitor comment threads and interactions
- Track emoji usage across messages
- Follow/unfollow event tracking

#### Missing Components:
```sql
-- Required tables
CREATE TABLE "PostReaction" (
  id SERIAL PRIMARY KEY,
  postId INTEGER NOT NULL,
  userId INTEGER NOT NULL,
  reactionType VARCHAR(20), -- 'upvote', 'downvote', 'laugh', etc.
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(postId, userId)
);

CREATE TABLE "UserEmojiUsage" (
  userId INTEGER NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  useCount INTEGER DEFAULT 1,
  lastUsedAt TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(userId, emoji)
);
```

#### Achievements Blocked:
- **Chief Shitposter** - Get 50+ upvotes on a single post
- **Upvote Magnet** - Get 100+ upvotes on any post
- **Viral Sensation** - Get 250+ upvotes on any post
- **Community Meme Lord** - Post a meme with 100+ upvotes
- **Emoji Master** - Use 50+ different emojis
- **Debate Champion** - 20+ back-and-forth messages in thread
- **Reply Guy** - Comment on 50 different posts
- **Social Butterfly** - Follow 50+ users
- **Influence Peddler** - Get 100+ followers

### 4. **Leaderboard History Tracking** 🏆
**Needed for: 14 achievements**

#### Requirements:
- Track daily/weekly/monthly leaderboard positions
- Store historical rankings for comparison
- Detect position changes and milestones

#### Missing Components:
```sql
-- Required table
CREATE TABLE "LeaderboardHistory" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL,
  leaderboardType VARCHAR(20), -- 'daily', 'weekly', 'monthly', 'allTime'
  position INTEGER NOT NULL,
  score BIGINT,
  snapshotDate DATE NOT NULL,
  metadata JSONB, -- Additional context
  UNIQUE(userId, leaderboardType, snapshotDate)
);
```

```typescript
// Required worker: leaderboardSnapshot.worker.ts
// Runs daily to capture leaderboard positions
async function captureLeaderboardSnapshot() {
  // Save current standings to history
  // Detect achievements (top 3, first time on board, etc.)
}
```

#### Achievements Blocked:
- **On the Board** - Reach top 100 leaderboard
- **Podium Finisher** - Reach top 3 any leaderboard
- **Monthly Champion** - #1 on monthly leaderboard
- **Comeback Kid** - Rise 50+ spots in a week
- **High Roller** - Top 10 in wagered amount
- **Volume Leader** - Most bets placed in a week

### 5. **Prediction Accuracy Tracking** 🔮
**Needed for: 11 achievements**

#### Requirements:
- Track prediction creation and resolution
- Calculate accuracy rates and speed metrics
- Monitor prediction popularity (views, bets)

#### Missing Components:
```typescript
// Enhancement to predictions.service.ts
interface PredictionMetrics {
  creatorId: number;
  creatorAccuracy: number;
  averageResolutionTime: number;
  totalViews: number;
  totalBettors: number;
  viralScore: number; // Based on engagement
}

// Add to Prediction table
ALTER TABLE "Prediction" ADD COLUMN "viewCount" INTEGER DEFAULT 0;
ALTER TABLE "Prediction" ADD COLUMN "firstCorrectBetUserId" INTEGER;
ALTER TABLE "Prediction" ADD COLUMN "resolvedWithinHour" BOOLEAN DEFAULT FALSE;
```

#### Achievements Blocked:
- **Crystal Ball** - 80% prediction accuracy (10+ predictions)
- **Prophet of Mars** - Create 10 correct predictions
- **Fast and Right** - First to bet correctly 5 times
- **Media Magnet** - Prediction gets 500+ views
- **Viral Predictor** - Prediction gets 100+ bettors
- **Musk Whisperer** - Correctly predict Elon tweet topic

### 6. **Financial Milestone Tracking** 💰
**Needed for: 10+ achievements**

#### Requirements:
- Track lifetime profit/loss
- Monitor balance milestones
- Detect "rags to riches" scenarios

#### Missing Components:
```typescript
// Required service: FinancialTracker.ts
class FinancialTracker {
  async checkBalanceMilestone(userId: number, newBalance: number): Promise<void>
  async trackProfitLoss(userId: number, change: number): Promise<void>
  async detectComebackScenario(userId: number): Promise<boolean>
}

// Events needed
'user:balance:milestone' // When hitting 1M, 1B, etc.
'user:profit:snapshot' // Daily P&L tracking
'user:bankruptcy' // When balance hits 0
```

#### Achievements Blocked:
- **Rags to Riches** - Go from <1000 to >1M balance
- **Bankrupt Billionaire** - Go from 1B to 0
- **Burnt a Billion** - Lose 1B+ lifetime
- **Comeback King** - Recover from -90% to profit

### 7. **Complex Event Correlation** 🔗
**Needed for: 15+ achievements**

#### Requirements:
- Track multi-step achievement progress
- Correlate events across different systems
- Support time-windowed event sequences

#### Missing Components:
```typescript
// Required service: EventCorrelator.ts
class EventCorrelator {
  async trackEventSequence(userId: number, events: string[]): Promise<void>
  async checkTimeWindowedPattern(userId: number, pattern: EventPattern): Promise<boolean>
  async detectComplexScenario(userId: number, scenario: string): Promise<boolean>
}

interface EventPattern {
  events: string[];
  timeWindow?: number; // seconds
  order: 'sequential' | 'any';
}
```

#### Achievements Blocked:
- **Statistical Anomaly** - Win 10 <10% probability bets
- **Defies Probability** - Win 5 <5% probability bets
- **YOLO All-In** - Bet entire balance and win
- **Galaxy Brain Parlay** - Win 7+ leg parlay
- **Pong Comeback King** - Win from 0-9 deficit

## Implementation Priority Matrix

### Phase 1: Foundation (Week 1-2)
1. **UserActivityLog table** - Enables all time-based tracking
2. **UserStreak table & StreakManager** - Unlocks 20+ achievements
3. **Daily snapshot worker** - Captures time-series data

### Phase 2: Social Features (Week 2-3)
1. **PostReaction system** - Upvotes/downvotes
2. **Emoji tracking** - Chat enhancement
3. **Thread detection** - Conversation tracking

### Phase 3: Advanced Analytics (Week 3-4)
1. **LeaderboardHistory** - Historical rankings
2. **PredictionMetrics** - Accuracy tracking
3. **FinancialTracker** - Milestone detection

### Phase 4: Complex Logic (Week 4-5)
1. **EventCorrelator** - Multi-step achievements
2. **Time-windowed patterns** - Speed achievements
3. **Scenario detection** - Comeback logic

## Database Migrations Required

```sql
-- Migration 001: Time-based tracking
CREATE TABLE "UserActivityLog" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES "User"(id),
  activityType VARCHAR(50) NOT NULL,
  metadata JSONB,
  occurredAt TIMESTAMP NOT NULL DEFAULT NOW(),
  dateKey VARCHAR(10),
  INDEX idx_activity_user_date (userId, dateKey, activityType)
);

-- Migration 002: Streak tracking
CREATE TABLE "UserStreak" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES "User"(id),
  streakType VARCHAR(50) NOT NULL,
  currentStreak INTEGER DEFAULT 0,
  bestStreak INTEGER DEFAULT 0,
  lastActionAt TIMESTAMP,
  startedAt TIMESTAMP,
  UNIQUE(userId, streakType)
);

-- Migration 003: Social interactions
CREATE TABLE "PostReaction" (
  id SERIAL PRIMARY KEY,
  postId INTEGER NOT NULL REFERENCES "Post"(id),
  userId INTEGER NOT NULL REFERENCES "User"(id),
  reactionType VARCHAR(20),
  createdAt TIMESTAMP DEFAULT NOW(),
  UNIQUE(postId, userId)
);

-- Migration 004: Leaderboard history
CREATE TABLE "LeaderboardHistory" (
  id SERIAL PRIMARY KEY,
  userId INTEGER NOT NULL REFERENCES "User"(id),
  leaderboardType VARCHAR(20),
  position INTEGER NOT NULL,
  score BIGINT,
  snapshotDate DATE NOT NULL,
  metadata JSONB,
  UNIQUE(userId, leaderboardType, snapshotDate)
);
```

## New Event Channels Needed

```typescript
// Add to ACHIEVEMENT_CHANNELS in achievementEventHandler.ts
const NEW_CHANNELS = [
  // Time-based events
  'user:daily:login',
  'user:daily:summary',
  
  // Streak events
  'streak:updated',
  'streak:broken',
  
  // Social events
  'post:upvoted',
  'post:reaction:added',
  'user:followed',
  'emoji:used',
  
  // Leaderboard events
  'leaderboard:position:changed',
  'leaderboard:milestone:reached',
  
  // Financial events
  'balance:milestone:reached',
  'profit:milestone:reached',
  'bankruptcy:detected',
];
```

## Service Integration Points

### 1. **betting.service.ts**
- Add streak tracking on bet resolution
- Emit financial milestone events
- Track bet timing for speed achievements

### 2. **pongStats.service.ts**
- Add comeback detection logic
- Track perfect game scenarios
- Emit streak events

### 3. **message.service.ts**
- Add emoji extraction and tracking
- Detect thread participation
- Track daily message counts

### 4. **predictions.service.ts**
- Add view counting
- Track first correct bettor
- Calculate creator accuracy

### 5. **user.service.ts**
- Add daily login tracking
- Monitor profile completion
- Track follow relationships

## Testing Strategy

### Unit Tests Required
- StreakManager service logic
- Time-window detection algorithms
- Financial milestone calculations
- Event correlation patterns

### Integration Tests Required
- Achievement unlock flow with new tracking
- Daily snapshot worker execution
- Complex achievement scenarios

### Load Testing Considerations
- UserActivityLog will grow rapidly (est. 10K+ rows/day)
- Implement data retention policy (90-day window)
- Index optimization critical for time-based queries

## Estimated Timeline

- **Week 1**: Database migrations, core tables
- **Week 2**: StreakManager, ActivityLog implementation
- **Week 3**: Social tracking, leaderboard history
- **Week 4**: Complex correlation, financial tracking
- **Week 5**: Testing, optimization, backfill

## Success Metrics

- **Coverage**: 100% of auto-awardable achievements enabled
- **Performance**: Achievement evaluation < 100ms per event
- **Accuracy**: Zero false unlocks, zero missed unlocks
- **Scalability**: Support 10K+ daily active users

## Risks & Mitigations

1. **Data Volume**: ActivityLog growth
   - Mitigation: Implement archival strategy, optimize indexes

2. **Performance Impact**: Real-time evaluation overhead
   - Mitigation: Async processing, Redis caching

3. **Complexity**: Multi-system correlation
   - Mitigation: Comprehensive testing, gradual rollout

## Conclusion

Implementing complete achievement tracking requires significant infrastructure additions, primarily around time-based tracking, streak management, and social interactions. The phased approach prioritizes high-impact, low-complexity features first, enabling ~60% of blocked achievements in Phase 1-2, with full coverage by Phase 4.

Total estimated effort: **5 weeks** for full implementation with testing.