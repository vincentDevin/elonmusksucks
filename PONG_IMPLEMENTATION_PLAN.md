# Classic Pong Implementation Plan for elonmusksucks.net

## 🎮 Executive Summary

Integrate a real-time, wagerable Classic Pong game into elonmusksucks.net, leveraging the existing Socket.IO infrastructure, MuskBucks economy, and achievement system. The implementation will be server-authoritative to prevent cheating, support both PvP and AI modes, and integrate seamlessly with the current betting and transaction systems.

## 📐 Architecture Overview

### Core Design Decisions

| Component | Decision | Rationale |
|-----------|----------|-----------|
| **Transport** | Socket.IO (existing) | - Already have Redis-backed Socket.IO with rooms<br>- Pong needs ~60Hz updates (1KB/s bandwidth)<br>- WebRTC unnecessary for this latency requirement |
| **Authority** | Server-authoritative | - Prevents client cheating for wagered games<br>- Consistent with existing betting infrastructure<br>- Enables replay/audit capabilities |
| **Game Loop** | Dedicated BullMQ worker | - Follows existing worker pattern (payout, leaderboard, feed)<br>- Isolates CPU-intensive physics from API server<br>- Scales independently |
| **State Management** | Redis + PostgreSQL | - Redis for live game state (follows activity pattern)<br>- PostgreSQL for match history and wagers<br>- Consistent with current dual-storage strategy |

## 🗃️ Data Models

### Prisma Schema Extensions

```prisma
// Add to existing schema.prisma

enum PongMatchStatus {
  WAITING     // Waiting for opponent
  ACTIVE      // Game in progress
  COMPLETED   // Game finished normally
  ABANDONED   // Player disconnected
  DISPUTED    // Under admin review
}

enum PongDifficulty {
  EASY
  MEDIUM
  HARD
  IMPOSSIBLE
}

model PongMatch {
  id              String          @id @default(cuid())
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  status          PongMatchStatus @default(WAITING)
  
  // Players
  playerOneId     Int
  playerOne       User            @relation("PlayerOne", fields: [playerOneId], references: [id])
  playerTwoId     Int?            // NULL for AI matches
  playerTwo       User?           @relation("PlayerTwo", fields: [playerTwoId], references: [id])
  aiDifficulty    PongDifficulty? // Set when playing against AI
  
  // Wager & Economy
  wagerAmount     BigInt          @default(0) // 0 for practice matches
  escrowTxId      Int?            // Reference to escrow transaction
  escrowTx        Transaction?    @relation("EscrowTransaction", fields: [escrowTxId], references: [id])
  payoutTxId      Int?            // Reference to payout transaction
  payoutTx        Transaction?    @relation("PayoutTransaction", fields: [payoutTxId], references: [id])
  
  // Game State
  playerOneScore  Int             @default(0)
  playerTwoScore  Int             @default(0)
  winnerId        Int?
  winner          User?           @relation("PongWinner", fields: [winnerId], references: [id])
  winningScore    Int             @default(11) // First to 11
  
  // Performance & Anti-cheat
  startedAt       DateTime?
  completedAt     DateTime?
  gameDuration    Int?            // Seconds
  tickLog         Json?           // Compressed replay data for disputes
  playerOnePing   Int             @default(0) // Average ping in ms
  playerTwoPing   Int             @default(0)
  
  // Integration Points
  activities      UserActivity[]
  achievements    Achievement[]   // Pong-specific achievements unlocked
  
  @@index([status, createdAt(desc)])
  @@index([playerOneId, status])
  @@index([playerTwoId, status])
  @@index([winnerId, completedAt(desc)])
}

model PongStats {
  id              Int      @id @default(autoincrement())
  userId          Int      @unique
  user            User     @relation(fields: [userId], references: [id])
  
  // Match Statistics
  totalMatches    Int      @default(0)
  wins            Int      @default(0)
  losses          Int      @default(0)
  draws           Int      @default(0)
  winStreak       Int      @default(0)
  bestWinStreak   Int      @default(0)
  
  // Economy Statistics
  totalWagered    BigInt   @default(0)
  totalWon        BigInt   @default(0)
  totalLost       BigInt   @default(0)
  biggestWin      BigInt   @default(0)
  biggestLoss     BigInt   @default(0)
  
  // Performance Statistics
  avgPing         Float    @default(0)
  avgGameDuration Int      @default(0) // Seconds
  perfectGames    Int      @default(0) // Won 11-0
  comebacks       Int      @default(0) // Won after being down 5+ points
  
  // AI Statistics
  aiWins          Int      @default(0)
  aiLosses        Int      @default(0)
  hardestAiBeaten PongDifficulty?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  @@index([wins(desc)])
  @@index([winStreak(desc)])
  @@index([totalWon(desc)])
}

// Update User model relationships
model User {
  // ... existing fields ...
  pongMatchesAsP1  PongMatch[]     @relation("PlayerOne")
  pongMatchesAsP2  PongMatch[]     @relation("PlayerTwo")
  pongWins         PongMatch[]     @relation("PongWinner")
  pongStats        PongStats?
}

// Update Transaction model for escrow
model Transaction {
  // ... existing fields ...
  pongEscrowMatches PongMatch[]    @relation("EscrowTransaction")
  pongPayoutMatches PongMatch[]    @relation("PayoutTransaction")
}
```

### Shared Types (@ems/types)

```typescript
// packages/types/src/pong.ts

export interface PongMatchState {
  matchId: string;
  status: 'waiting' | 'active' | 'completed' | 'abandoned';
  players: {
    one: {
      id: number;
      name: string;
      score: number;
      paddleY: number;
      ping: number;
    };
    two: {
      id: number | 'AI';
      name: string;
      score: number;
      paddleY: number;
      ping: number;
    } | null;
  };
  ball: {
    x: number;
    y: number;
    vx: number;
    vy: number;
  };
  wager: bigint;
  serverTick: number;
  timestamp: number;
}

export interface PongInput {
  up: boolean;
  down: boolean;
  timestamp: number;
  sequenceNumber: number;
}

export interface PongMatchResult {
  matchId: string;
  winnerId: number;
  winnerName: string;
  scores: {
    playerOne: number;
    playerTwo: number;
  };
  wagerAmount: bigint;
  payoutAmount: bigint;
  duration: number; // seconds
  achievements?: Achievement[];
}

export interface PongLobbyEntry {
  matchId: string;
  hostId: number;
  hostName: string;
  wagerAmount: bigint;
  createdAt: string;
  aiDifficulty?: PongDifficulty;
}
```

## 🔧 Backend Implementation

### 1. REST API Endpoints

```typescript
// apps/server/src/routes/pong.routes.ts

// Match Management
POST   /api/pong/matches                 // Create new match (PvP or AI)
GET    /api/pong/matches                 // List open matches (lobby)
POST   /api/pong/matches/:id/join        // Join existing match
POST   /api/pong/matches/:id/spectate    // Join as spectator
DELETE /api/pong/matches/:id             // Cancel/abandon match

// Statistics & Leaderboards
GET    /api/pong/stats/:userId           // User's Pong statistics
GET    /api/pong/leaderboard             // Top Pong players
GET    /api/pong/matches/history         // User's match history

// Admin & Moderation
GET    /api/admin/pong/matches           // All matches (with filters)
GET    /api/admin/pong/matches/:id/replay // Download replay data
POST   /api/admin/pong/matches/:id/void  // Void match and refund
```

### 2. Socket.IO Events

```typescript
// apps/server/src/sockets/pong.socket.ts

// Client → Server Events
'pong:join'         { matchId: string }
'pong:input'        { input: PongInput }
'pong:ready'        { matchId: string }
'pong:forfeit'      { matchId: string }
'pong:spectate'     { matchId: string }

// Server → Client Events  
'pong:state'        { state: PongMatchState }      // 30Hz updates
'pong:matched'      { opponent: PlayerInfo }       // Opponent found
'pong:countdown'    { seconds: number }            // 3-2-1 countdown
'pong:score'        { scores: ScoreUpdate }        // Point scored
'pong:result'       { result: PongMatchResult }    // Game over
'pong:error'        { code: string, message: string }

// Server → Admin Events
'admin:pong:suspicious' { matchId, reason, data }  // Anti-cheat alerts
```

### 3. Game Worker Implementation

```typescript
// apps/server/src/workers/pong.worker.ts

import { Worker, Queue } from 'bullmq';
import { PongPhysicsEngine } from '../engines/pong.physics';
import { PongMatchManager } from '../services/pong.match.service';

const TICK_RATE = 60;  // 60 FPS physics
const SEND_RATE = 30;  // 30 FPS network updates

export const pongQueue = new Queue('pong:matches', {
  connection: redisConnection
});

export const pongWorker = new Worker('pong:matches', async (job) => {
  const { matchId, type } = job.data;
  
  switch(type) {
    case 'START_MATCH':
      await startGameLoop(matchId);
      break;
    case 'PROCESS_INPUT':
      await processPlayerInput(matchId, job.data.input);
      break;
    case 'END_MATCH':
      await finalizeMatch(matchId, job.data.reason);
      break;
  }
}, {
  connection: redisConnection,
  concurrency: 10  // Handle 10 concurrent matches per worker
});

async function startGameLoop(matchId: string) {
  const engine = new PongPhysicsEngine(matchId);
  const tickInterval = 1000 / TICK_RATE;
  let lastSend = 0;
  
  const gameLoop = setInterval(async () => {
    // Update physics
    engine.tick();
    
    // Check win conditions
    if (engine.isGameOver()) {
      clearInterval(gameLoop);
      await finalizeMatch(matchId, 'completed');
      return;
    }
    
    // Send state to clients at SEND_RATE
    if (Date.now() - lastSend > (1000 / SEND_RATE)) {
      await broadcastState(matchId, engine.getState());
      lastSend = Date.now();
    }
    
    // Store tick for replay
    await storeTickData(matchId, engine.getTickData());
  }, tickInterval);
}
```

### 4. Physics Engine

```typescript
// apps/server/src/engines/pong.physics.ts

export class PongPhysicsEngine {
  private static readonly FIELD_WIDTH = 800;
  private static readonly FIELD_HEIGHT = 400;
  private static readonly PADDLE_HEIGHT = 80;
  private static readonly PADDLE_WIDTH = 10;
  private static readonly PADDLE_SPEED = 5;
  private static readonly BALL_SIZE = 10;
  private static readonly BALL_SPEED_INITIAL = 4;
  private static readonly BALL_SPEED_INCREMENT = 0.5;
  
  private ball: Ball;
  private paddles: { one: Paddle, two: Paddle };
  private scores: { one: number, two: number };
  private tick: number = 0;
  
  constructor(private matchId: string) {
    this.reset();
  }
  
  public tick(): void {
    this.tick++;
    
    // Update paddle positions based on inputs
    this.updatePaddles();
    
    // Update ball position
    this.updateBall();
    
    // Check collisions
    this.checkPaddleCollisions();
    this.checkWallCollisions();
    this.checkGoals();
  }
  
  private updateBall(): void {
    // Deterministic physics using fixed-point math
    this.ball.x += this.ball.vx;
    this.ball.y += this.ball.vy;
  }
  
  private checkPaddleCollisions(): void {
    // AABB collision detection
    // Add spin based on paddle velocity
    // Increase ball speed slightly each hit
  }
  
  private getTickData(): TickData {
    // Return compressed state for replay storage
    return {
      t: this.tick,
      b: [this.ball.x, this.ball.y, this.ball.vx, this.ball.vy],
      p: [this.paddles.one.y, this.paddles.two.y],
      s: [this.scores.one, this.scores.two]
    };
  }
}
```

### 5. AI Implementation

```typescript
// apps/server/src/engines/pong.ai.ts

export class PongAI {
  private reactionDelay: number;
  private maxSpeed: number;
  private predictionError: number;
  
  constructor(difficulty: PongDifficulty) {
    switch(difficulty) {
      case 'EASY':
        this.reactionDelay = 500;  // 500ms delay
        this.maxSpeed = 3;
        this.predictionError = 0.3;
        break;
      case 'MEDIUM':
        this.reactionDelay = 200;
        this.maxSpeed = 4;
        this.predictionError = 0.15;
        break;
      case 'HARD':
        this.reactionDelay = 50;
        this.maxSpeed = 5;
        this.predictionError = 0.05;
        break;
      case 'IMPOSSIBLE':
        this.reactionDelay = 0;
        this.maxSpeed = 6;
        this.predictionError = 0;
        break;
    }
  }
  
  public getInput(gameState: PongMatchState): PongInput {
    // Predict ball trajectory with error margin
    const prediction = this.predictBallPosition(gameState.ball);
    
    // Add reaction delay
    const targetY = prediction.y + (Math.random() - 0.5) * this.predictionError;
    
    // Move paddle toward predicted position
    const paddleY = gameState.players.two.paddleY;
    const diff = targetY - paddleY;
    
    return {
      up: diff < -5,
      down: diff > 5,
      timestamp: Date.now(),
      sequenceNumber: 0
    };
  }
}
```

### 6. Transaction & Escrow Service

```typescript
// apps/server/src/services/pong.transaction.service.ts

export class PongTransactionService {
  async createEscrow(matchId: string, playerIds: number[], amount: bigint): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Validate balances
      for (const playerId of playerIds) {
        const user = await tx.user.findUnique({
          where: { id: playerId },
          select: { muskBucks: true }
        });
        
        if (user.muskBucks < amount) {
          throw new Error('Insufficient funds');
        }
      }
      
      // Create escrow transactions
      for (const playerId of playerIds) {
        await tx.user.update({
          where: { id: playerId },
          data: { muskBucks: { decrement: amount } }
        });
        
        const escrowTx = await tx.transaction.create({
          data: {
            userId: playerId,
            type: 'DEBIT',
            amount,
            description: `Pong wager escrow for match ${matchId}`,
            metadata: { matchId, type: 'pong_escrow' }
          }
        });
        
        await tx.pongMatch.update({
          where: { id: matchId },
          data: { escrowTxId: escrowTx.id }
        });
      }
    });
  }
  
  async settlePayout(matchId: string, winnerId: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const match = await tx.pongMatch.findUnique({
        where: { id: matchId },
        include: { playerOne: true, playerTwo: true }
      });
      
      const payoutAmount = match.wagerAmount * 2n * 95n / 100n; // 5% house edge
      
      // Credit winner
      await tx.user.update({
        where: { id: winnerId },
        data: { muskBucks: { increment: payoutAmount } }
      });
      
      // Create payout transaction
      const payoutTx = await tx.transaction.create({
        data: {
          userId: winnerId,
          type: 'CREDIT',
          amount: payoutAmount,
          description: `Pong winnings from match ${matchId}`,
          metadata: { matchId, type: 'pong_payout' }
        }
      });
      
      // Update match
      await tx.pongMatch.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerId,
          payoutTxId: payoutTx.id,
          completedAt: new Date()
        }
      });
      
      // Update stats
      await this.updatePlayerStats(tx, match, winnerId);
      
      // Create activity
      await tx.userActivity.create({
        data: {
          userId: winnerId,
          type: 'PONG_WIN',
          metadata: {
            matchId,
            opponent: winnerId === match.playerOneId ? 
              match.playerTwo?.name : match.playerOne.name,
            wagerAmount: match.wagerAmount.toString(),
            payoutAmount: payoutAmount.toString()
          }
        }
      });
    });
    
    // Trigger achievement check
    await achievementService.checkPongAchievements(winnerId, matchId);
    
    // Update leaderboard
    await leaderboardService.triggerUpdate({
      event: 'pong:completed',
      priority: 'immediate',
      affectedMetrics: ['pongWins', 'pongEarnings'],
      metadata: { matchId, winnerId }
    });
  }
}
```

## 🎨 Frontend Implementation

### 1. Component Architecture

```
src/components/pong/
├── PongGame.tsx           // Main game container
├── PongLobby.tsx          // Match browser & creation
├── PongCanvas.tsx         // WebGL/Canvas renderer
├── PongHUD.tsx            // Score, timer, wager display
├── PongControls.tsx       // Touch/keyboard input handler
├── PongSettings.tsx       // Game preferences
├── PongStats.tsx          // Player statistics view
└── hooks/
    ├── usePongSocket.ts   // Socket.IO connection
    ├── usePongInput.ts    // Input handling & buffering
    ├── usePongState.ts    // Game state management
    └── useInterpolation.ts // Client-side prediction
```

### 2. Game Renderer

```typescript
// apps/client/src/components/pong/PongCanvas.tsx

import { useRef, useEffect } from 'react';
import { usePongState } from './hooks/usePongState';
import { useInterpolation } from './hooks/useInterpolation';

export const PongCanvas: React.FC<{ matchId: string }> = ({ matchId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { gameState, isConnected } = usePongState(matchId);
  const interpolatedState = useInterpolation(gameState);
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      // Clear canvas
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, 800, 400);
      
      // Draw center line
      ctx.strokeStyle = '#fff';
      ctx.setLineDash([5, 15]);
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 400);
      ctx.stroke();
      
      // Draw paddles
      ctx.fillStyle = '#fff';
      ctx.fillRect(10, interpolatedState.players.one.paddleY, 10, 80);
      ctx.fillRect(780, interpolatedState.players.two.paddleY, 10, 80);
      
      // Draw ball with trail effect
      const { x, y } = interpolatedState.ball;
      
      // Trail
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      for (let i = 1; i <= 3; i++) {
        const prevX = x - interpolatedState.ball.vx * i * 2;
        const prevY = y - interpolatedState.ball.vy * i * 2;
        ctx.globalAlpha = 0.3 - (i * 0.1);
        ctx.fillRect(prevX - 5, prevY - 5, 10, 10);
      }
      
      // Ball
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - 5, y - 5, 10, 10);
      
      // Draw scores
      ctx.font = '48px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(interpolatedState.players.one.score.toString(), 200, 60);
      ctx.fillText(interpolatedState.players.two.score.toString(), 600, 60);
      
      // Network indicator
      if (!isConnected) {
        ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
        ctx.font = '24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('CONNECTION LOST', 400, 200);
      }
      
      requestAnimationFrame(render);
    };
    
    render();
  }, [interpolatedState, isConnected]);
  
  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={400}
      className="border-2 border-surface-alt rounded-lg shadow-2xl"
      style={{ imageRendering: 'pixelated' }}
    />
  );
};
```

### 3. Input Handling

```typescript
// apps/client/src/components/pong/hooks/usePongInput.ts

export const usePongInput = (matchId: string) => {
  const { socket } = useSocket();
  const [inputBuffer, setInputBuffer] = useState<PongInput[]>([]);
  const sequenceNumber = useRef(0);
  const lastSent = useRef(0);
  
  useEffect(() => {
    const keys = { up: false, down: false };
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
      sendInput();
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
      if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
      sendInput();
    };
    
    const sendInput = throttle(() => {
      const input: PongInput = {
        up: keys.up,
        down: keys.down,
        timestamp: Date.now(),
        sequenceNumber: sequenceNumber.current++
      };
      
      socket.emit('pong:input', { matchId, input });
      
      // Store for reconciliation
      setInputBuffer(prev => [...prev.slice(-30), input]);
    }, 16); // 60 FPS
    
    // Touch controls for mobile
    const handleTouch = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = e.target.getBoundingClientRect();
      const y = touch.clientY - rect.top;
      const height = rect.height;
      
      keys.up = y < height / 2;
      keys.down = y > height / 2;
      sendInput();
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('touchstart', handleTouch);
    window.addEventListener('touchmove', handleTouch);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('touchstart', handleTouch);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [socket, matchId]);
  
  return { inputBuffer };
};
```

### 4. Client-Side Prediction & Interpolation

```typescript
// apps/client/src/components/pong/hooks/useInterpolation.ts

export const useInterpolation = (serverState: PongMatchState) => {
  const [localState, setLocalState] = useState(serverState);
  const lastServerTick = useRef(0);
  const localTick = useRef(0);
  
  useEffect(() => {
    if (!serverState) return;
    
    // Reconcile with server state
    if (serverState.serverTick > lastServerTick.current) {
      lastServerTick.current = serverState.serverTick;
      
      // Apply interpolation
      setLocalState(prev => {
        const alpha = 0.2; // Interpolation factor
        
        return {
          ...serverState,
          ball: {
            x: lerp(prev.ball.x, serverState.ball.x, alpha),
            y: lerp(prev.ball.y, serverState.ball.y, alpha),
            vx: serverState.ball.vx,
            vy: serverState.ball.vy
          },
          players: {
            one: {
              ...serverState.players.one,
              paddleY: lerp(prev.players.one.paddleY, 
                           serverState.players.one.paddleY, alpha)
            },
            two: {
              ...serverState.players.two,
              paddleY: lerp(prev.players.two.paddleY, 
                           serverState.players.two.paddleY, alpha)
            }
          }
        };
      });
    }
  }, [serverState]);
  
  // Local simulation between server updates
  useEffect(() => {
    const interval = setInterval(() => {
      setLocalState(prev => {
        // Simple ball position prediction
        return {
          ...prev,
          ball: {
            x: prev.ball.x + prev.ball.vx,
            y: prev.ball.y + prev.ball.vy,
            vx: prev.ball.vx,
            vy: prev.ball.vy
          }
        };
      });
      
      localTick.current++;
    }, 16); // 60 FPS local updates
    
    return () => clearInterval(interval);
  }, []);
  
  return localState;
};

const lerp = (start: number, end: number, alpha: number): number => {
  return start + (end - start) * alpha;
};
```

## 🏆 Achievement Integration

### New Pong Achievements

```typescript
// Add to existing achievement system

const PONG_ACHIEVEMENTS = [
  // Skill-based
  { id: 'pong_first_win', name: 'First Serve', description: 'Win your first Pong match' },
  { id: 'pong_perfect', name: 'Flawless Victory', description: 'Win 11-0' },
  { id: 'pong_comeback', name: 'Never Give Up', description: 'Win after being down 10-5' },
  { id: 'pong_streak_5', name: 'On Fire', description: 'Win 5 matches in a row' },
  { id: 'pong_streak_10', name: 'Unstoppable', description: 'Win 10 matches in a row' },
  
  // AI Challenges
  { id: 'pong_beat_easy', name: 'Training Wheels Off', description: 'Beat Easy AI' },
  { id: 'pong_beat_medium', name: 'Getting Good', description: 'Beat Medium AI' },
  { id: 'pong_beat_hard', name: 'Pro Player', description: 'Beat Hard AI' },
  { id: 'pong_beat_impossible', name: 'The Chosen One', description: 'Beat Impossible AI' },
  
  // Economy
  { id: 'pong_win_1k', name: 'Small Stakes', description: 'Win 1,000 MuskBucks from Pong' },
  { id: 'pong_win_10k', name: 'High Roller', description: 'Win 10,000 MuskBucks from Pong' },
  { id: 'pong_win_100k', name: 'Pong Tycoon', description: 'Win 100,000 MuskBucks from Pong' },
  
  // Milestones
  { id: 'pong_100_matches', name: 'Century Club', description: 'Play 100 Pong matches' },
  { id: 'pong_1000_points', name: 'Point Machine', description: 'Score 1,000 total points' }
];
```

## 🧪 Testing Strategy

### Unit Tests

```typescript
// apps/server/src/engines/__tests__/pong.physics.test.ts

describe('PongPhysicsEngine', () => {
  it('should handle ball-paddle collisions correctly', () => {
    const engine = new PongPhysicsEngine('test-match');
    // Position ball to collide with paddle
    engine.setBallPosition(20, 200);
    engine.setBallVelocity(-5, 0);
    engine.setPaddlePosition('one', 195);
    
    engine.tick();
    
    // Ball should reverse direction
    expect(engine.getBall().vx).toBeGreaterThan(0);
  });
  
  it('should be deterministic', () => {
    const engine1 = new PongPhysicsEngine('test-1');
    const engine2 = new PongPhysicsEngine('test-1');
    
    // Run same inputs
    for (let i = 0; i < 100; i++) {
      engine1.tick();
      engine2.tick();
    }
    
    // States should be identical
    expect(engine1.getState()).toEqual(engine2.getState());
  });
});
```

### Integration Tests

```typescript
// apps/server/src/sockets/__tests__/pong.integration.test.ts

describe('Pong Match Flow', () => {
  it('should handle complete match lifecycle', async () => {
    const player1 = await createTestUser({ muskBucks: 5000n });
    const player2 = await createTestUser({ muskBucks: 5000n });
    
    // Create match
    const match = await request(app)
      .post('/api/pong/matches')
      .set('Authorization', `Bearer ${player1.token}`)
      .send({ wagerAmount: 1000, type: 'pvp' });
    
    // Player 2 joins
    await request(app)
      .post(`/api/pong/matches/${match.body.id}/join`)
      .set('Authorization', `Bearer ${player2.token}`);
    
    // Verify escrow
    const p1After = await prisma.user.findUnique({ where: { id: player1.id }});
    expect(p1After.muskBucks).toBe(4000n);
    
    // Simulate game completion
    await pongQueue.add('END_MATCH', {
      matchId: match.body.id,
      winnerId: player1.id
    });
    
    // Verify payout
    const p1Final = await prisma.user.findUnique({ where: { id: player1.id }});
    expect(p1Final.muskBucks).toBe(5900n); // 1000 back + 900 winnings (after house edge)
  });
});
```

### Load Testing

```javascript
// k6/pong-load-test.js

import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  vus: 100,        // 100 concurrent matches
  duration: '5m',
};

export default function() {
  const url = 'ws://localhost:5000/socket.io/';
  
  ws.connect(url, {}, function(socket) {
    socket.on('open', () => {
      // Join match
      socket.send(JSON.stringify({
        event: 'pong:join',
        data: { matchId: 'load-test-' + __VU }
      }));
    });
    
    socket.on('message', (data) => {
      const msg = JSON.parse(data);
      
      if (msg.event === 'pong:state') {
        // Send input at 60Hz
        socket.send(JSON.stringify({
          event: 'pong:input',
          data: {
            up: Math.random() > 0.5,
            down: Math.random() > 0.5,
            timestamp: Date.now()
          }
        }));
      }
    });
    
    socket.setTimeout(() => {
      socket.close();
    }, 30000); // 30 second matches
  });
}
```

## 📊 Monitoring & Analytics

### Metrics to Track

```typescript
// apps/server/src/monitoring/pong.metrics.ts

// Performance Metrics
- Average match duration
- Server tick rate consistency
- Network latency per player
- Input processing delay
- Physics simulation time

// Economy Metrics  
- Total MuskBucks wagered
- House edge realized
- Average wager size
- Wager distribution

// Engagement Metrics
- Daily active Pong players
- Matches per user
- PvP vs AI ratio
- Spectator counts
- Abandonment rate

// Technical Metrics
- Memory usage per match
- Redis operations/second
- Socket.IO connections
- Worker queue depth
- Replay storage size
```

## 🚀 Deployment Plan

### Phase 1: Core Game (Days 1-4)
- [ ] Prisma schema migration
- [ ] Physics engine implementation
- [ ] Basic Socket.IO integration
- [ ] Canvas renderer

### Phase 2: Economy Integration (Days 5-6)
- [ ] Escrow system
- [ ] Payout worker
- [ ] Transaction logging
- [ ] House edge implementation

### Phase 3: Polish & AI (Days 7-8)
- [ ] AI opponent implementation
- [ ] Client-side prediction
- [ ] Mobile touch controls
- [ ] Sound effects

### Phase 4: Testing & Launch (Days 9-10)
- [ ] Load testing
- [ ] Security audit
- [ ] Achievement integration
- [ ] Beta flag deployment

## 🔒 Security Considerations

### Anti-Cheat Measures

1. **Server Authority**: All physics calculations on server
2. **Input Validation**: Rate limiting, timestamp verification
3. **Replay System**: Store compressed game states for dispute resolution
4. **Statistical Analysis**: Detect impossible reaction times
5. **Network Monitoring**: Track latency spikes and disconnection patterns

### Secure Wager Handling

1. **Atomic Transactions**: All money operations in database transactions
2. **Escrow Pattern**: Funds locked until match completion
3. **Dispute Resolution**: Admin tools to review replays and void matches
4. **Maximum Wagers**: Configurable limits to prevent excessive losses

## 📈 Success Metrics

### Launch Goals (First Month)
- 500+ daily Pong matches
- 70% player retention (play again within 7 days)
- <50ms average latency
- <1% disputed matches
- 10% of active users try Pong

### Long-term Goals
- Pong accounts for 15% of MuskBucks circulation
- Tournament system implementation
- Spectator mode with 100+ concurrent viewers
- Mobile app integration
- Ranked competitive ladder

## 🎯 Future Enhancements

### Version 2.0 Features
- **Tournament Mode**: Bracket-style competitions with prize pools
- **Ranked Ladder**: ELO-based matchmaking system
- **Power-ups**: Special abilities purchasable with MuskBucks
- **Custom Arenas**: Themed backgrounds and physics modifiers
- **Spectator Betting**: Wager on other players' matches
- **Replay Sharing**: Social features for epic moments
- **Season Pass**: Exclusive rewards for regular players

### Technical Improvements
- WebRTC option for P2P matches (lower latency)
- WASM physics engine for better performance
- WebGL renderer with particle effects
- Dedicated game servers in multiple regions
- Machine learning for AI difficulty tuning

## 📝 Notes

This implementation plan leverages the existing elonmusksucks.net infrastructure:
- Uses established Socket.IO + Redis setup
- Integrates with current MuskBucks economy
- Follows existing worker pattern (BullMQ)
- Maintains consistent UI/UX with Tailwind theme system
- Reuses transaction and achievement services
- Compatible with current deployment pipeline

The server-authoritative approach ensures fair play for wagered matches while the modular architecture allows for incremental feature additions without disrupting the core game loop.