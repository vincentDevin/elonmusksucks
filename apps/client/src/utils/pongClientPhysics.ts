/**
 * Client-Side Pong Physics Simulation
 *
 * This module provides a "shadow" physics simulation that runs on the client
 * in parallel with the authoritative server simulation. Benefits:
 *
 * 1. **Smoother gameplay during lag**: Predicts ball/paddle positions
 * 2. **Better packet loss handling**: Continues simulation when updates are delayed
 * 3. **Reduced visual glitches**: Smooth interpolation instead of jumps
 * 4. **Server remains authoritative**: Reconciles with server state to prevent cheating
 *
 * The shadow simulation is reconciled with server state when:
 * - Ball position diverges by >threshold
 * - Server sends a score update (reset to server state)
 * - Game state changes (countdown, paused, etc.)
 */

import { PONG_PHYSICS } from '@ems/types';

/**
 * Shadow ball state (predicted on client)
 */
export interface ShadowBallState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lastServerUpdate: number; // Timestamp of last server reconciliation
}

/**
 * Paddle position history for velocity calculation
 */
interface PaddleHistory {
  position: number;
  timestamp: number;
}

/**
 * Shadow game state (full client-side simulation)
 */
export interface ShadowGameState {
  ball: ShadowBallState;
  paddlePositions: [number, number]; // [player1Y, player2Y]
  paddleVelocities: [number, number]; // [player1Vy, player2Vy] in px/s
  paddleHistory: [PaddleHistory[], PaddleHistory[]]; // Track last 3 positions per paddle
  lastReconciliation: number; // Timestamp of last server sync
  divergenceCount: number; // Track how often we diverge from server
}

/**
 * Client-side physics simulation
 * Runs the same physics as the server but on the client for prediction
 */
export class PongClientPhysics {
  private shadowState: ShadowGameState | null = null;
  private lastUpdateTime: number = 0;

  // Reconciliation thresholds (reduced for better accuracy in 7-30ms ping range)
  private readonly BASE_DIVERGENCE_THRESHOLD = 8; // pixels (reduced from 20px)
  private readonly MAX_PREDICTION_TIME = 500; // ms - don't predict more than 500ms ahead
  private readonly PADDLE_HISTORY_SIZE = 3; // Track last 3 positions for velocity calculation
  private readonly SERVER_UPDATE_DELAY = 4; // ms - average server tick delay (120Hz = 8.3ms, half = 4ms)

  /**
   * Initialize shadow state from server state
   */
  initialize(serverBall: { x: number; y: number; vx: number; vy: number }): void {
    const now = Date.now();
    const centerY = PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2;
    this.shadowState = {
      ball: {
        x: serverBall.x,
        y: serverBall.y,
        vx: serverBall.vx,
        vy: serverBall.vy,
        lastServerUpdate: now,
      },
      paddlePositions: [centerY, centerY],
      paddleVelocities: [0, 0], // Initially stationary
      paddleHistory: [
        [{ position: centerY, timestamp: now }],
        [{ position: centerY, timestamp: now }],
      ],
      lastReconciliation: now,
      divergenceCount: 0,
    };
    this.lastUpdateTime = now;
  }

  /**
   * Update shadow simulation (call this every frame)
   * Returns predicted ball position
   * @param currentTime - Current timestamp
   * @param paddle1Y - Player 1 paddle Y position (raw from server or interpolated)
   * @param paddle2Y - Player 2 paddle Y position (raw from server or interpolated)
   * @param ping - One-way ping in milliseconds (for latency compensation)
   */
  update(
    currentTime: number = Date.now(),
    paddle1Y?: number,
    paddle2Y?: number,
    ping: number = 0,
  ): ShadowBallState | null {
    if (!this.shadowState) return null;

    // Don't predict too far ahead (prevents runaway during long disconnects)
    const timeSinceServerUpdate = currentTime - this.shadowState.ball.lastServerUpdate;
    if (timeSinceServerUpdate > this.MAX_PREDICTION_TIME) {
      // Stop predicting, just return last known state
      return this.shadowState.ball;
    }

    // Calculate delta time since last update
    const deltaTime = currentTime - this.lastUpdateTime;
    if (deltaTime <= 0) return this.shadowState.ball;

    this.lastUpdateTime = currentTime;

    // Update paddle positions and calculate velocities
    if (paddle1Y !== undefined) {
      this.updatePaddlePosition(0, paddle1Y, currentTime);
    }
    if (paddle2Y !== undefined) {
      this.updatePaddlePosition(1, paddle2Y, currentTime);
    }

    // Simulate ball physics (same as server)
    const dt = deltaTime / 1000; // Convert to seconds
    this.shadowState.ball.x += this.shadowState.ball.vx * dt;
    this.shadowState.ball.y += this.shadowState.ball.vy * dt;

    // Wall collisions
    this.simulateWallCollisions();

    // Paddle collisions (with latency compensation)
    this.simulatePaddleCollisions(ping);

    return this.shadowState.ball;
  }

  /**
   * Reconcile shadow state with server state
   * Returns true if reconciliation was needed (divergence detected)
   */
  reconcile(serverBall: { x: number; y: number; vx: number; vy: number }): boolean {
    if (!this.shadowState) {
      this.initialize(serverBall);
      return false;
    }

    // Calculate divergence
    const dx = serverBall.x - this.shadowState.ball.x;
    const dy = serverBall.y - this.shadowState.ball.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Dynamic threshold based on ball speed (faster balls = higher threshold)
    const ballSpeed = Math.sqrt(serverBall.vx ** 2 + serverBall.vy ** 2);
    const dynamicThreshold = this.BASE_DIVERGENCE_THRESHOLD + ballSpeed / 100;

    const needsReconciliation = distance > dynamicThreshold;

    if (needsReconciliation) {
      console.log(
        `🔄 Shadow reconciliation: divergence ${distance.toFixed(1)}px (threshold: ${dynamicThreshold.toFixed(1)}px, speed: ${ballSpeed.toFixed(0)}px/s)`,
      );
      this.shadowState.divergenceCount++;
    }

    // Smooth reconciliation curve based on divergence amount
    // Small divergence (<threshold): 30% correction
    // Medium divergence (threshold to 2x): 60% correction
    // Large divergence (>2x threshold): 90% correction
    let correctionFactor: number;
    if (distance <= dynamicThreshold) {
      correctionFactor = 0.3; // Small correction for minor drift
    } else if (distance <= dynamicThreshold * 2) {
      correctionFactor = 0.6; // Medium correction
    } else {
      correctionFactor = 0.9; // Strong correction for large desync
    }

    this.shadowState.ball.x += dx * correctionFactor;
    this.shadowState.ball.y += dy * correctionFactor;
    this.shadowState.ball.vx = serverBall.vx;
    this.shadowState.ball.vy = serverBall.vy;
    this.shadowState.ball.lastServerUpdate = Date.now();
    this.shadowState.lastReconciliation = Date.now();

    return needsReconciliation;
  }

  /**
   * Hard reset to server state (for score events, etc.)
   */
  reset(serverBall: { x: number; y: number; vx: number; vy: number }): void {
    if (!this.shadowState) {
      this.initialize(serverBall);
      return;
    }

    // Hard snap to server position
    this.shadowState.ball.x = serverBall.x;
    this.shadowState.ball.y = serverBall.y;
    this.shadowState.ball.vx = serverBall.vx;
    this.shadowState.ball.vy = serverBall.vy;
    this.shadowState.ball.lastServerUpdate = Date.now();
    this.shadowState.lastReconciliation = Date.now();
  }

  /**
   * Get current shadow state (for rendering)
   */
  getShadowState(): ShadowGameState | null {
    return this.shadowState;
  }

  /**
   * Get divergence statistics (for debugging)
   */
  getStats(): { divergenceCount: number; timeSinceLastReconciliation: number } {
    if (!this.shadowState) {
      return { divergenceCount: 0, timeSinceLastReconciliation: 0 };
    }

    return {
      divergenceCount: this.shadowState.divergenceCount,
      timeSinceLastReconciliation: Date.now() - this.shadowState.lastReconciliation,
    };
  }

  /**
   * Clear shadow state
   */
  clear(): void {
    this.shadowState = null;
    this.lastUpdateTime = 0;
  }

  // ==================== PRIVATE PHYSICS SIMULATION ====================

  /**
   * Update paddle position and calculate velocity
   * Tracks history for smooth velocity calculation
   */
  private updatePaddlePosition(playerIndex: 0 | 1, newY: number, timestamp: number): void {
    if (!this.shadowState) return;

    const history = this.shadowState.paddleHistory[playerIndex];

    // Add new position to history
    history.push({ position: newY, timestamp });

    // Keep only last N positions
    if (history.length > this.PADDLE_HISTORY_SIZE) {
      history.shift();
    }

    // Calculate velocity from history (use first and last positions for stability)
    if (history.length >= 2) {
      const oldest = history[0];
      const newest = history[history.length - 1];
      const deltaY = newest.position - oldest.position;
      const deltaT = newest.timestamp - oldest.timestamp;

      if (deltaT > 0) {
        // Velocity in pixels per second
        this.shadowState.paddleVelocities[playerIndex] = (deltaY / deltaT) * 1000;
      } else {
        this.shadowState.paddleVelocities[playerIndex] = 0;
      }
    }

    // Update current position
    this.shadowState.paddlePositions[playerIndex] = newY;
  }

  /**
   * Get extrapolated paddle position with latency compensation
   * Predicts where paddle will be based on velocity and latency
   */
  private getExtrapolatedPaddleY(playerIndex: 0 | 1, ping: number): number {
    if (!this.shadowState) return 0;

    const currentY = this.shadowState.paddlePositions[playerIndex];
    const velocity = this.shadowState.paddleVelocities[playerIndex];

    // Total compensation time = one-way ping + average server processing delay
    const compensationTime = (ping + this.SERVER_UPDATE_DELAY) / 1000; // Convert to seconds

    // Extrapolate position
    let extrapolatedY = currentY + velocity * compensationTime;

    // Clamp to valid paddle range
    const maxY = PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.PADDLE_HEIGHT;
    extrapolatedY = Math.max(0, Math.min(maxY, extrapolatedY));

    return extrapolatedY;
  }

  private simulateWallCollisions(): void {
    if (!this.shadowState) return;

    const ballTop = this.shadowState.ball.y - PONG_PHYSICS.BALL_SIZE / 2;
    const ballBottom = this.shadowState.ball.y + PONG_PHYSICS.BALL_SIZE / 2;

    // Top wall
    if (ballTop <= 0) {
      this.shadowState.ball.vy = Math.abs(this.shadowState.ball.vy); // Bounce down
      this.shadowState.ball.y = PONG_PHYSICS.BALL_SIZE / 2;
    }

    // Bottom wall
    if (ballBottom >= PONG_PHYSICS.FIELD_HEIGHT) {
      this.shadowState.ball.vy = -Math.abs(this.shadowState.ball.vy); // Bounce up
      this.shadowState.ball.y = PONG_PHYSICS.FIELD_HEIGHT - PONG_PHYSICS.BALL_SIZE / 2;
    }
  }

  private simulatePaddleCollisions(ping: number = 0): void {
    if (!this.shadowState) return;

    const ballLeft = this.shadowState.ball.x - PONG_PHYSICS.BALL_SIZE / 2;
    const ballRight = this.shadowState.ball.x + PONG_PHYSICS.BALL_SIZE / 2;
    const ballTop = this.shadowState.ball.y - PONG_PHYSICS.BALL_SIZE / 2;
    const ballBottom = this.shadowState.ball.y + PONG_PHYSICS.BALL_SIZE / 2;

    const PADDLE_HITBOX_EXTENSION = 5; // Same as server

    // Left paddle (player 0) - use extrapolated position for better prediction
    if (ballLeft <= PONG_PHYSICS.PADDLE_WIDTH && this.shadowState.ball.vx < 0) {
      // Use latency-compensated paddle position for collision detection
      const paddle1Y = this.getExtrapolatedPaddleY(0, ping);
      const paddleTop = paddle1Y - PADDLE_HITBOX_EXTENSION;
      const paddleBottom = paddle1Y + PONG_PHYSICS.PADDLE_HEIGHT + PADDLE_HITBOX_EXTENSION;

      if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
        // Hit detected
        const paddleCenter = paddle1Y + PONG_PHYSICS.PADDLE_HEIGHT / 2;
        const hitPosition =
          (this.shadowState.ball.y - paddleCenter) / (PONG_PHYSICS.PADDLE_HEIGHT / 2);
        const clampedHit = Math.max(-1, Math.min(1, hitPosition));

        const maxAngle = Math.PI / 3; // 60 degrees (same as server)
        const angleModifier = clampedHit * maxAngle;

        const currentSpeed = Math.sqrt(
          this.shadowState.ball.vx ** 2 + this.shadowState.ball.vy ** 2,
        );
        const newSpeed = currentSpeed * 1.05; // Speed increase (same as server)

        this.shadowState.ball.vx = Math.abs(Math.cos(angleModifier)) * newSpeed;
        this.shadowState.ball.vy = Math.sin(angleModifier) * newSpeed;
        this.shadowState.ball.x = PONG_PHYSICS.PADDLE_WIDTH + PONG_PHYSICS.BALL_SIZE / 2;
      }
    }

    // Right paddle (player 1) - use extrapolated position for better prediction
    if (
      ballRight >= PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH &&
      this.shadowState.ball.vx > 0
    ) {
      // Use latency-compensated paddle position for collision detection
      const paddle2Y = this.getExtrapolatedPaddleY(1, ping);
      const paddleTop = paddle2Y - PADDLE_HITBOX_EXTENSION;
      const paddleBottom = paddle2Y + PONG_PHYSICS.PADDLE_HEIGHT + PADDLE_HITBOX_EXTENSION;

      if (ballBottom >= paddleTop && ballTop <= paddleBottom) {
        // Hit detected
        const paddleCenter = paddle2Y + PONG_PHYSICS.PADDLE_HEIGHT / 2;
        const hitPosition =
          (this.shadowState.ball.y - paddleCenter) / (PONG_PHYSICS.PADDLE_HEIGHT / 2);
        const clampedHit = Math.max(-1, Math.min(1, hitPosition));

        const maxAngle = Math.PI / 3; // 60 degrees (same as server)
        const angleModifier = clampedHit * maxAngle;

        const currentSpeed = Math.sqrt(
          this.shadowState.ball.vx ** 2 + this.shadowState.ball.vy ** 2,
        );
        const newSpeed = currentSpeed * 1.05; // Speed increase (same as server)

        this.shadowState.ball.vx = -Math.abs(Math.cos(angleModifier)) * newSpeed;
        this.shadowState.ball.vy = Math.sin(angleModifier) * newSpeed;
        this.shadowState.ball.x =
          PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH - PONG_PHYSICS.BALL_SIZE / 2;
      }
    }
  }
}
