# Pong Server - Dedicated Game Server

**Real-time multiplayer Pong game server** with 128fps game loop, client-authoritative paddles, AI opponents, MuskBucks wagering, ELO ratings, and spectator mode.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Directory Structure](#directory-structure)
- [Game Loop](#game-loop)
- [Physics Engine](#physics-engine)
- [Networking](#networking)
- [AI System](#ai-system)
- [Wagering System](#wagering-system)
- [ELO Rating System](#elo-rating-system)
- [Spectator Mode](#spectator-mode)
- [Security](#security)
- [Development](#development)
- [Build & Deployment](#build--deployment)
- [Performance](#performance)
- [Troubleshooting](#troubleshooting)

---

## Overview

The **pong-server** is a dedicated Socket.IO game server running on port 5001, isolated from the main API server (port 5000) for optimal performance.

**Key Features:**

- **128fps game loop** - 7.8ms server tick for smooth gameplay
- **Client-authoritative paddles** - Players control their own paddles with client-side prediction
- **AI opponents** - 4 difficulty levels (EASY, MEDIUM, HARD, IMPOSSIBLE)
- **MuskBucks wagering** - Bet on PVP or AI matches
- **ELO rating system** - K-factor 32 rating calculations
- **Spectator mode** - Watch live matches in real-time
- **Mobile touch controls** - Swipe/tap support
- **Collision detection** - Pixel-perfect ball-paddle physics
- **Rate limiting** - Socket event throttling to prevent abuse

**Why a Dedicated Server?**

- **Isolation** - Game server crashes don't affect API server
- **Performance** - Dedicated CPU/memory for game loop
- **Scalability** - Can scale independently from API server
- **Security** - Separate authentication flow

---

## Architecture

### High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                     Client Browser (Port 3000)                        │
├──────────────────────────────────────────────────────────────────────┤
│  Pong Game UI (React Component)                                      │
│  ├─ Canvas rendering (60fps)                                         │
│  ├─ Input handling (keyboard/touch)                                  │
│  ├─ Client-side prediction (paddle movement)                         │
│  └─ Socket.IO client connection                                      │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ Socket.IO (port 5001)
                             │ Events: paddle-move, player-ready, etc.
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  Pong Server (Port 5001)                              │
├──────────────────────────────────────────────────────────────────────┤
│  Socket.IO Server                                                     │
│  ├─ Authentication middleware (JWT)                                  │
│  ├─ Rate limiting (10 events/sec per socket)                         │
│  ├─ Payload validation                                               │
│  └─ Event handlers                                                   │
├──────────────────────────────────────────────────────────────────────┤
│  Game Manager                                                         │
│  ├─ Match creation & lobby management                                │
│  ├─ Player matching (PVP)                                            │
│  ├─ AI opponent creation                                             │
│  └─ Spectator management                                             │
├──────────────────────────────────────────────────────────────────────┤
│  Game Loop (128fps)                                                   │
│  ├─ Physics update (ball movement, collisions)                       │
│  ├─ AI paddle control (for AI opponents)                             │
│  ├─ Score tracking                                                   │
│  ├─ Win condition checking                                           │
│  └─ State broadcast (to players & spectators)                        │
├──────────────────────────────────────────────────────────────────────┤
│  Wagering Manager                                                     │
│  ├─ Wager validation (balance checks via API)                        │
│  ├─ Escrow management                                                │
│  └─ Payout processing (BullMQ jobs)                                  │
├──────────────────────────────────────────────────────────────────────┤
│  ELO Manager                                                          │
│  ├─ Rating calculations (K-factor 32)                                │
│  └─ Match history recording                                          │
└────────────────────────────┬─────────────────────────────────────────┘
                             │
                             │ HTTP API calls
                             ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     API Server (Port 5000)                            │
│  ├─ User authentication                                               │
│  ├─ Balance validation                                                │
│  ├─ Wager transaction processing                                     │
│  ├─ ELO rating updates                                                │
│  └─ Match history storage                                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Core Runtime

- **Node.js ≥24.0.0** - Strict requirement
- **TypeScript 5.8.4** - Type safety
- **Express 5.1.0** - HTTP server (minimal, for health checks)

### Real-time Communication

- **Socket.IO 4.8.1** - WebSocket server
- **IORedis 5.4.1** - Redis client (future: multi-instance scaling)

### Backend Integration

- **Axios 1.11.0** - HTTP client for API server communication
- **jsonwebtoken 9.0.2** - JWT authentication
- **Prisma Client 6.10.1** - Database access (minimal)

### Background Jobs

- **BullMQ 5.36.3** - Payout job queue

### Security & Performance

- **Helmet 7.1.0** - Security headers
- **cors 2.8.5** - CORS configuration
- **compression 1.7.5** - gzip compression
- **prom-client 15.1.3** - Prometheus metrics

### Development Tools

- **nodemon 3.1.10** - Hot reload
- **ts-node 10.9.2** - TypeScript execution
- **Jest 29.7.0** - Testing framework

---

## Directory Structure

```
apps/pong-server/
├── src/
│   ├── config/
│   │   └── env.ts              # Environment variable validation
│   │
│   ├── middleware/
│   │   ├── socketRateLimiter.ts       # Rate limit Socket.IO events
│   │   └── payloadValidator.ts        # Validate event payloads
│   │
│   ├── utils/
│   │   └── securityLogger.ts          # Security event logging
│   │
│   ├── validation/
│   │   └── socketValidation.ts        # Socket event validation schemas
│   │
│   ├── api-client.ts           # API server HTTP client
│   └── server.ts               # Main game server (5000+ lines)
│
├── dist/                       # Compiled TypeScript (gitignored)
│
├── package.json                # Dependencies & scripts
├── tsconfig.json               # TypeScript configuration
├── Dockerfile                  # Production Docker build
└── fly.toml                    # Fly.io deployment config
```

---

## Game Loop

### Overview

**128fps server-authoritative game loop** with client-authoritative paddles.

```typescript
const GAME_TICK_RATE = 128; // 128 updates per second
const TICK_INTERVAL = 1000 / GAME_TICK_RATE; // 7.8125ms per tick

function gameLoop(matchId: string, state: GameState) {
  const intervalId = setInterval(() => {
    // 1. Update ball position
    updateBallPosition(state);

    // 2. Check wall collisions (top/bottom)
    checkWallCollisions(state);

    // 3. Check paddle collisions
    checkPaddleCollisions(state);

    // 4. Check scoring (ball out of bounds left/right)
    if (checkScoring(state)) {
      if (state.leftPlayer.score >= WINNING_SCORE || state.rightPlayer.score >= WINNING_SCORE) {
        endMatch(matchId, state);
        clearInterval(intervalId);
        return;
      }
      resetBall(state);
    }

    // 5. Update AI paddle (if applicable)
    if (state.rightPlayer.id < 0) {
      // AI player
      updateAIPaddle(state);
    }

    // 6. Broadcast state to all players & spectators
    broadcastGameState(matchId, state);
  }, TICK_INTERVAL);

  return intervalId;
}
```

---

### Game State

```typescript
interface GameState {
  // Ball state
  ball: {
    x: number; // X position (0 to FIELD_WIDTH)
    y: number; // Y position (0 to FIELD_HEIGHT)
    dx: number; // X velocity (pixels/tick)
    dy: number; // Y velocity (pixels/tick)
    speed: number; // Current speed multiplier
  };

  // Players
  leftPlayer: Player; // Left paddle (creator)
  rightPlayer: Player; // Right paddle (joiner or AI)

  // Match metadata
  matchType: 'pvp' | 'ai';
  status: 'waiting' | 'countdown' | 'playing' | 'finished';
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  wagerAmount: number;
  aiDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
}

interface Player {
  id: number; // User ID (negative for AI)
  name: string;
  paddleY: number; // Paddle Y position (0 to FIELD_HEIGHT - PADDLE_HEIGHT)
  score: number; // Current score (0-11, first to 11 wins)
  ping: number; // Latency (ms)
  lastInputTime: number; // Timestamp of last input
}
```

---

### State Updates

**Ball Position Update:**

```typescript
function updateBallPosition(state: GameState) {
  state.ball.x += state.ball.dx * state.ball.speed;
  state.ball.y += state.ball.dy * state.ball.speed;
}
```

**Wall Collision (Top/Bottom):**

```typescript
function checkWallCollisions(state: GameState) {
  const { ball } = state;
  const { BALL_SIZE, FIELD_HEIGHT } = PONG_PHYSICS;

  // Top wall
  if (ball.y <= 0) {
    ball.y = 0;
    ball.dy = -ball.dy; // Reverse Y velocity
  }

  // Bottom wall
  if (ball.y >= FIELD_HEIGHT - BALL_SIZE) {
    ball.y = FIELD_HEIGHT - BALL_SIZE;
    ball.dy = -ball.dy;
  }
}
```

**Paddle Collision:**

```typescript
function checkPaddleCollisions(state: GameState) {
  const { ball, leftPlayer, rightPlayer } = state;
  const { BALL_SIZE, PADDLE_WIDTH, PADDLE_HEIGHT } = PONG_PHYSICS;

  // Left paddle collision
  if (
    ball.x <= PADDLE_WIDTH &&
    ball.y + BALL_SIZE >= leftPlayer.paddleY &&
    ball.y <= leftPlayer.paddleY + PADDLE_HEIGHT
  ) {
    ball.x = PADDLE_WIDTH;
    ball.dx = -ball.dx; // Reverse X velocity
    ball.speed += 0.05; // Increase speed slightly
  }

  // Right paddle collision
  const rightPaddleX = FIELD_WIDTH - PADDLE_WIDTH;
  if (
    ball.x + BALL_SIZE >= rightPaddleX &&
    ball.y + BALL_SIZE >= rightPlayer.paddleY &&
    ball.y <= rightPlayer.paddleY + PADDLE_HEIGHT
  ) {
    ball.x = rightPaddleX - BALL_SIZE;
    ball.dx = -ball.dx;
    ball.speed += 0.05;
  }
}
```

**Scoring:**

```typescript
function checkScoring(state: GameState): boolean {
  const { ball } = state;
  const { FIELD_WIDTH } = PONG_PHYSICS;

  // Ball out of bounds left (right player scores)
  if (ball.x < 0) {
    state.rightPlayer.score++;
    return true;
  }

  // Ball out of bounds right (left player scores)
  if (ball.x > FIELD_WIDTH) {
    state.leftPlayer.score++;
    return true;
  }

  return false;
}
```

---

## Physics Engine

### Constants

```typescript
export const PONG_PHYSICS = {
  // Field dimensions
  FIELD_WIDTH: 800,
  FIELD_HEIGHT: 600,

  // Paddle dimensions
  PADDLE_WIDTH: 10,
  PADDLE_HEIGHT: 100,
  PADDLE_SPEED: 5, // pixels per input

  // Ball dimensions
  BALL_SIZE: 10,
  BALL_BASE_SPEED: 4, // pixels per tick
  BALL_MAX_SPEED: 12, // max speed after collisions

  // Game rules
  WINNING_SCORE: 5,
  COUNTDOWN_SECONDS: 3,

  // Physics rates
  GAME_TICK_RATE: 128, // fps
  TICK_INTERVAL: 7.8125, // ms
};
```

---

### Collision Detection

**AABB (Axis-Aligned Bounding Box) collision detection:**

```typescript
function checkAABBCollision(
  box1: { x: number; y: number; width: number; height: number },
  box2: { x: number; y: number; width: number; height: number },
): boolean {
  return (
    box1.x < box2.x + box2.width &&
    box1.x + box1.width > box2.x &&
    box1.y < box2.y + box2.height &&
    box1.y + box1.height > box2.y
  );
}
```

---

### Ball Trajectory

**Ball angle calculation after paddle collision:**

```typescript
function calculateBallAngle(ball: Ball, paddle: Player): number {
  const paddleCenter = paddle.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;
  const ballCenter = ball.y + PONG_PHYSICS.BALL_SIZE / 2;

  // Relative position (-1 to 1, where 0 is center)
  const relativeIntersect = (ballCenter - paddleCenter) / (PONG_PHYSICS.PADDLE_HEIGHT / 2);

  // Convert to angle (-45° to 45°)
  const angle = relativeIntersect * (Math.PI / 4); // π/4 radians = 45°

  return angle;
}
```

---

## Networking

### Client-Authoritative Paddles

**Players control their own paddles** with client-side prediction.

**Client-Side:**

```typescript
// Client sends paddle position on every move
function movePaddle(direction: 'up' | 'down') {
  const newY = paddleY + (direction === 'up' ? -5 : 5);
  setPaddleY(Math.max(0, Math.min(FIELD_HEIGHT - PADDLE_HEIGHT, newY)));

  // Send to server immediately
  socket.emit('paddle-move', { paddleY: newY });
}
```

**Server-Side:**

```typescript
// Server trusts client paddle position (no server-side validation)
socket.on('paddle-move', (data) => {
  const { paddleY } = data;
  const player = getPlayerBySocketId(socket.id);

  if (player) {
    player.paddleY = paddleY; // Update immediately
    player.lastInputTime = Date.now();
  }
});
```

**Benefits:**

- ✅ Instant paddle response (no round-trip latency)
- ✅ Smooth gameplay even with high ping
- ❌ Requires client-side validation (prevent out-of-bounds)

---

### Server-Authoritative Ball

**Ball position is calculated on the server only.**

**Client-Side:**

```typescript
// Client receives ball state from server
socket.on('game-state', (state: GameState) => {
  // Update ball position (no prediction)
  ball.x = state.ball.x;
  ball.y = state.ball.y;

  // Update opponent paddle (interpolate for smoothness)
  opponentPaddle.y = lerp(opponentPaddle.y, state.rightPlayer.paddleY, 0.5);
});
```

**Benefits:**

- ✅ Consistent ball physics across all clients
- ✅ No cheating (ball position controlled by server)
- ❌ Slight visual lag for ball position (mitigated by 128fps)

---

### Socket.IO Events

#### **Client → Server**

| Event            | Payload                               | Description            |
| ---------------- | ------------------------------------- | ---------------------- |
| `create-match`   | `{ matchType, wager, aiDifficulty? }` | Create new match       |
| `join-match`     | `{ matchId }`                         | Join existing match    |
| `paddle-move`    | `{ paddleY }`                         | Update paddle position |
| `player-ready`   | `{ matchId }`                         | Signal ready to start  |
| `spectate-match` | `{ matchId }`                         | Start spectating       |
| `stop-spectate`  | `{ matchId }`                         | Stop spectating        |

#### **Server → Client**

| Event              | Payload              | Description                   |
| ------------------ | -------------------- | ----------------------------- |
| `match-created`    | `{ match }`          | Match created successfully    |
| `match-joined`     | `{ match }`          | Player joined match           |
| `game-state`       | `{ state }`          | Game state update (128fps)    |
| `countdown`        | `{ seconds }`        | Countdown before match starts |
| `match-ended`      | `{ result }`         | Match finished                |
| `spectator-joined` | `{ matchId, count }` | New spectator joined          |
| `spectator-left`   | `{ matchId, count }` | Spectator left                |
| `error`            | `{ message }`        | Error occurred                |

---

## AI System

### AI Difficulties

**4 difficulty levels with different paddle speeds:**

```typescript
export const AI_DIFFICULTIES: {
  readonly EASY: {
    reactionTime: 450;
    accuracy: 0.45;
    speed: 0.35;
  };
  readonly MEDIUM: {
    reactionTime: 200;
    accuracy: 0.82;
    speed: 0.85;
  };
  readonly HARD: {
    reactionTime: 120;
    accuracy: 0.88;
    speed: 0.92;
  };
  readonly IMPOSSIBLE: {
    reactionTime: 80;
    accuracy: 0.95;
    speed: 1;
  };
};
```

---

### AI Paddle Logic

**AI predicts ball position and moves paddle to intercept:**

```typescript
function updateAIPaddle(state: GameState) {
  const { ball, rightPlayer } = state;
  const difficulty = AI_DIFFICULTIES[state.aiDifficulty!];

  // Predict ball Y position when it reaches right side
  const predictedY = predictBallY(ball, PONG_PHYSICS.FIELD_WIDTH);

  // Add error margin (randomness)
  const targetY = predictedY + (Math.random() - 0.5) * difficulty.errorMargin;

  // Calculate paddle center
  const paddleCenter = rightPlayer.paddleY + PONG_PHYSICS.PADDLE_HEIGHT / 2;

  // Move paddle towards target
  if (paddleCenter < targetY - 5) {
    // Move down
    rightPlayer.paddleY = Math.min(
      PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT,
      rightPlayer.paddleY + difficulty.paddleSpeed,
    );
  } else if (paddleCenter > targetY + 5) {
    // Move up
    rightPlayer.paddleY = Math.max(0, rightPlayer.paddleY - difficulty.paddleSpeed);
  }
}

function predictBallY(ball: Ball, targetX: number): number {
  // Simple linear prediction (ignores wall bounces)
  const timeToReach = (targetX - ball.x) / (ball.dx * ball.speed);
  const predictedY = ball.y + ball.dy * ball.speed * timeToReach;

  // Clamp to field bounds
  return Math.max(0, Math.min(PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.BALL_SIZE, predictedY));
}
```

---

### AI Player IDs

**AI players have negative IDs:**

```typescript
export const AI_PLAYER_IDS = {
  EASY: -1,
  MEDIUM: -2,
  HARD: -3,
  IMPOSSIBLE: -4,
};
```

**Stored in database** with names like "AI-Easy", "AI-Medium", etc.

---

## Wagering System

### Wager Limits

```typescript
export const PONG_WAGER_LIMITS = {
  MIN_WAGER: 10, // 10 MuskBucks minimum

  // AI max wagers (per difficulty)
  AI_MAX_WAGERS: {
    EASY: null, // No max (unlimited)
    MEDIUM: 1000, // 1000 MuskBucks max
    HARD: 500, // 500 MuskBucks max
    IMPOSSIBLE: 100, // 100 MuskBucks max (high risk)
  },
};
```

**Why different limits?**

- EASY: High win rate for player → unlimited wager
- IMPOSSIBLE: Low win rate for player → limited wager (protect balance)

---

### Wager Flow

**1. Match Creation:**

```typescript
socket.on('create-match', async (data, callback) => {
  const { wager, matchType, aiDifficulty } = data;

  // Validate wager amount
  const error = validateWager(wager, matchType, aiDifficulty);
  if (error) {
    return callback({ success: false, error });
  }

  // Validate user balance (via API)
  const hasBalance = await apiClient.validateWager(userId, wager);
  if (!hasBalance) {
    return callback({ success: false, error: 'Insufficient balance' });
  }

  // Create match
  const match = createMatch(userId, wager, matchType, aiDifficulty);
  callback({ success: true, match });
});
```

**2. Match Start:**

```typescript
async function startMatch(matchId: string, state: GameState) {
  // Process wager transaction (escrow funds)
  const result = await apiClient.processWagerTransaction(
    state.leftPlayer.id,
    state.rightPlayer.id,
    state.wagerAmount,
  );

  if (!result.success) {
    // Cancel match if transaction fails
    cancelMatch(matchId, 'Wager transaction failed');
    return;
  }

  // Start game loop
  gameLoop(matchId, state);
}
```

**3. Match End:**

```typescript
async function endMatch(matchId: string, state: GameState) {
  const winner = state.leftPlayer.score >= WINNING_SCORE ? state.leftPlayer : state.rightPlayer;

  const loser = winner === state.leftPlayer ? state.rightPlayer : state.leftPlayer;

  // Queue payout job (BullMQ)
  await pongPayoutQueue.add('process-payout', {
    matchId,
    winnerId: winner.id,
    loserId: loser.id,
    wagerAmount: state.wagerAmount,
    isAI: state.matchType === 'ai',
  });

  // Emit match result
  io.to(matchId).emit('match-ended', {
    winner: winner.id,
    finalScore: {
      left: state.leftPlayer.score,
      right: state.rightPlayer.score,
    },
  });
}
```

---

## ELO Rating System

### Algorithm

**K-factor 32 ELO rating system:**

```typescript
function calculateEloChange(
  winnerRating: number,
  loserRating: number,
): { winnerDelta: number; loserDelta: number } {
  const K = 32; // K-factor

  // Expected scores (0-1)
  const expectedWinner = 1 / (1 + Math.pow(10, (loserRating - winnerRating) / 400));
  const expectedLoser = 1 / (1 + Math.pow(10, (winnerRating - loserRating) / 400));

  // Actual scores
  const actualWinner = 1; // Winner always gets 1
  const actualLoser = 0; // Loser always gets 0

  // Rating changes
  const winnerDelta = Math.round(K * (actualWinner - expectedWinner));
  const loserDelta = Math.round(K * (actualLoser - expectedLoser));

  return { winnerDelta, loserDelta };
}
```

**Example:**

- Player A (1200 ELO) beats Player B (1300 ELO)
- Player A gains +18 ELO (upset victory)
- Player B loses -18 ELO

---

### AI Match ELO

**AI matches affect player ELO:**

- **Beating EASY AI:** +5 ELO
- **Beating MEDIUM AI:** +10 ELO
- **Beating HARD AI:** +15 ELO
- **Beating IMPOSSIBLE AI:** +25 ELO

**Losing to AI:**

- **EASY/MEDIUM:** -10 ELO
- **HARD:** -5 ELO
- **IMPOSSIBLE:** -2 ELO (minimal penalty)

---

## Spectator Mode

### Spectator Management

**Players can spectate ongoing matches:**

```typescript
socket.on('spectate-match', (data, callback) => {
  const { matchId } = data;
  const match = activeMatches.get(matchId);

  if (!match) {
    return callback({ success: false, error: 'Match not found' });
  }

  // Join match room
  socket.join(matchId);

  // Track spectator
  if (!spectators.has(matchId)) {
    spectators.set(matchId, new Set());
  }
  spectators.get(matchId)!.add(socket.id);

  // Send current game state
  callback({ success: true, state: match.state });

  // Broadcast spectator count
  io.to(matchId).emit('spectator-joined', {
    matchId,
    count: spectators.get(matchId)!.size,
  });
});
```

**Benefits:**

- Spectators receive same game-state updates as players
- No performance impact (same broadcast)
- Can chat with players (future feature)

---

## Security

### JWT Authentication

**All Socket.IO connections require JWT:**

```typescript
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    socket.data.user = decoded;
    next();
  } catch (error) {
    return next(new Error('Invalid token'));
  }
});
```

---

### Rate Limiting

**Socket event rate limiting:**

```typescript
const rateLimiter = new SocketRateLimiter({
  windowMs: 1000, // 1 second window
  maxEvents: 10, // 10 events per window
});

socket.on(
  'paddle-move',
  rateLimiter.check((data) => {
    // Process paddle movement
  }),
);
```

**Benefits:**

- Prevents spam attacks
- Protects game loop performance
- Configurable per event type

---

### Payload Validation

**All incoming events are validated:**

```typescript
socket.on(
  'create-match',
  validatePayload(createMatchSchema, async (data, callback) => {
    // data is validated and type-safe
  }),
);

const createMatchSchema = {
  matchType: { type: 'string', enum: ['pvp', 'ai'] },
  wager: { type: 'number', min: 10 },
  aiDifficulty: { type: 'string', enum: ['EASY', 'MEDIUM', 'HARD', 'IMPOSSIBLE'], optional: true },
};
```

---

## Development

### Prerequisites

- **Node.js ≥24.0.0** (strict requirement)
- **Redis** (for BullMQ)
- **API server running** (port 5000)

### Environment Variables

Create `.env` in repository root:

```bash
# JWT Secret (must match API server)
JWT_SECRET=your_jwt_secret

# API Server URL
API_BASE_URL=http://localhost:5000

# Game Server Secret (for API authentication)
GAME_SERVER_SECRET=pong-internal-secret-change-in-production

# Redis
REDIS_URL=redis://localhost:6379

# Server Port
PORT=5001

# Optional
NODE_ENV=development
```

### Development Commands

```bash
# Install dependencies (run from repository root)
npm install

# Start dev server (port 5001) with hot reload
npm -w apps/pong-server run dev

# Type checking
npm -w apps/pong-server run tsc -- --noEmit

# Build for production
npm -w apps/pong-server run build

# Start production server
npm -w apps/pong-server run start
```

### Development Workflow

1. **Start Redis:**

   ```bash
   redis-server
   ```

2. **Start API server** (required for authentication):

   ```bash
   npm -w apps/server run dev
   ```

3. **Start pong server:**

   ```bash
   npm -w apps/pong-server run dev
   ```

4. **Open client app:** http://localhost:3000/pong

---

## Build & Deployment

### Production Build

```bash
# Build TypeScript to JavaScript
npm -w apps/pong-server run build

# Output: apps/pong-server/dist/
```

---

### Docker Deployment

**Dockerfile:**

```dockerfile
FROM node:24-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5001
CMD ["node", "dist/server.js"]
```

---

### Fly.io Deployment

**Configuration** (`fly.toml`):

```toml
app = "elonmusksucks-pong"
primary_region = "sjc"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "5001"
  NODE_ENV = "production"

[[services]]
  internal_port = 5001
  protocol = "tcp"

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443
```

**Deploy:**

```bash
cd apps/pong-server
fly deploy
```

---

## Performance

### Metrics

**Target Performance:**

- **Game Loop:** 128fps (7.8ms per tick)
- **Latency:** <50ms (player to server)
- **Concurrent Matches:** 100+ (single instance)
- **CPU Usage:** <30% (idle), <60% (100 matches)

---

### Optimizations

1. **Minimal Database Access** - Only auth & payouts
2. **In-Memory Game State** - No disk I/O during gameplay
3. **Efficient Broadcasts** - Socket.IO rooms per match
4. **Client-Authoritative Paddles** - No server validation
5. **Lazy AI Updates** - AI only calculates when ball approaches

---

## Troubleshooting

### Issue: Game loop lag

**Solution:**

1. Check server CPU usage
2. Reduce concurrent match count
3. Increase server resources

---

### Issue: Players can't connect

**Solution:**

1. Check JWT secret matches API server
2. Check port 5001 is accessible
3. Check CORS origins include client URL

---

### Issue: Wager transactions fail

**Solution:**

1. Check API server is running
2. Check GAME_SERVER_SECRET matches API server
3. Check user has sufficient balance

---

## Additional Resources

- [Socket.IO Documentation](https://socket.io/docs/v4/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [Main Project README](../../README.md)
- [Server App README](../server/README.md)
- [Client App README](../client/README.md)

---

## License

See [LICENSE](../../LICENSE) in repository root.
