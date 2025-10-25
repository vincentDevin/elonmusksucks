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
 * Shadow game state (full client-side simulation)
 */
export interface ShadowGameState {
  ball: ShadowBallState;
  paddlePositions: [number, number]; // [player1Y, player2Y]
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

  // Reconciliation thresholds
  private readonly BALL_DIVERGENCE_THRESHOLD = 20; // pixels
  private readonly MAX_PREDICTION_TIME = 500; // ms - don't predict more than 500ms ahead

  /**
   * Initialize shadow state from server state
   */
  initialize(serverBall: { x: number; y: number; vx: number; vy: number }): void {
    const now = Date.now();
    this.shadowState = {
      ball: {
        x: serverBall.x,
        y: serverBall.y,
        vx: serverBall.vx,
        vy: serverBall.vy,
        lastServerUpdate: now,
      },
      paddlePositions: [
        PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
        PONG_PHYSICS.FIELD_HEIGHT / 2 - PONG_PHYSICS.PADDLE_HEIGHT / 2,
      ],
      lastReconciliation: now,
      divergenceCount: 0,
    };
    this.lastUpdateTime = now;
  }

  /**
   * Update shadow simulation (call this every frame)
   * Returns predicted ball position
   */
  update(
    currentTime: number = Date.now(),
    paddle1Y?: number,
    paddle2Y?: number,
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

    // Update paddle positions if provided
    if (paddle1Y !== undefined) {
      this.shadowState.paddlePositions[0] = paddle1Y;
    }
    if (paddle2Y !== undefined) {
      this.shadowState.paddlePositions[1] = paddle2Y;
    }

    // Simulate ball physics (same as server)
    const dt = deltaTime / 1000; // Convert to seconds
    this.shadowState.ball.x += this.shadowState.ball.vx * dt;
    this.shadowState.ball.y += this.shadowState.ball.vy * dt;

    // Wall collisions
    this.simulateWallCollisions();

    // Paddle collisions
    this.simulatePaddleCollisions();

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

    const needsReconciliation = distance > this.BALL_DIVERGENCE_THRESHOLD;

    if (needsReconciliation) {
      console.log(
        `🔄 Shadow reconciliation: divergence ${distance.toFixed(1)}px (threshold: ${this.BALL_DIVERGENCE_THRESHOLD}px)`,
      );
      this.shadowState.divergenceCount++;
    }

    // Always update with server state (soft reconciliation)
    // Use lerp to smooth the correction instead of hard snap
    const correctionFactor = needsReconciliation ? 0.8 : 0.3;
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

  private simulatePaddleCollisions(): void {
    if (!this.shadowState) return;

    const ballLeft = this.shadowState.ball.x - PONG_PHYSICS.BALL_SIZE / 2;
    const ballRight = this.shadowState.ball.x + PONG_PHYSICS.BALL_SIZE / 2;
    const ballTop = this.shadowState.ball.y - PONG_PHYSICS.BALL_SIZE / 2;
    const ballBottom = this.shadowState.ball.y + PONG_PHYSICS.BALL_SIZE / 2;

    const PADDLE_HITBOX_EXTENSION = 5; // Same as server

    // Left paddle (player 0)
    if (ballLeft <= PONG_PHYSICS.PADDLE_WIDTH && this.shadowState.ball.vx < 0) {
      const paddle1Y = this.shadowState.paddlePositions[0];
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

    // Right paddle (player 1)
    if (
      ballRight >= PONG_PHYSICS.FIELD_WIDTH - PONG_PHYSICS.PADDLE_WIDTH &&
      this.shadowState.ball.vx > 0
    ) {
      const paddle2Y = this.shadowState.paddlePositions[1];
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
