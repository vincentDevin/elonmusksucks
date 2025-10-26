import { useRef, useEffect, useCallback } from 'react';
import { PONG_PHYSICS } from '@ems/types';
import {
  GameStateBuffer,
  LinearInterpolation,
  type GameStateSnapshot,
} from '../../types/pongInterpolation';
import { usePongPerformanceMonitor } from '../../hooks/usePongPerformanceMonitor';
import { PongClientPhysics } from '../../utils/pongClientPhysics';

// Match the same interface from usePongSocketOptimized
interface GameState {
  gameId: string;
  playerSlot: 0 | 1;
  players: [any, any];
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status:
    | 'waiting'
    | 'waiting_for_opponent'
    | 'waiting_for_ready'
    | 'countdown'
    | 'active'
    | 'paused'
    | 'ended';
  tick: number;
  timestamp: number;
  countdown?: number;
  winner?: 0 | 1 | null;
  payout?: number;
  readyStates?: [boolean, boolean];
  wager?: number;
  pot?: number;
}

interface PongCanvasProps {
  gameState?: GameState;
  className?: string;
  ping?: number;
  onSetReady?: (ready: boolean) => void;
  isSpectating?: boolean;
  gameStateBuffer?: GameStateBuffer;
  shadowPhysics?: PongClientPhysics; // ✅ PHASE 2: Client-side physics simulation
  // Interpolation function props (optional for backward compatibility)
  getInterpolatedGameState?: (currentTime?: number) => {
    ball: { x: number; y: number; vx: number; vy: number };
    opponentPaddleY?: number;
    player1PaddleY?: number;
    player2PaddleY?: number;
    confidence: { ball: number; opponent?: number; player1?: number; player2?: number };
  } | null;
  enableAdvancedRenderer?: boolean;
  targetFPS?: number;
  showDebugInfo?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

// Enhanced visual configuration
const VISUAL_CONFIG = {
  // Colors and gradients
  BACKGROUND: {
    PRIMARY: '#0a0a1a',
    SECONDARY: '#1a1a2e',
    ACCENT: '#16213e',
  },
  PADDLE: {
    PLAYER: '#00ff88',
    OPPONENT: '#ff4757',
    GLOW: '#ffffff',
  },
  BALL: {
    CORE: '#00ff88',
    GLOW: '#00ff88',
    TRAIL: '#00ff88',
  },
  FIELD: {
    LINE: '#4a90e2',
    WALL: '#2c5aa0',
    BACKGROUND: '#0f1419',
  },

  // Animation settings
  BALL_TRAIL_LENGTH: 20,
  PARTICLE_COUNT: 15,
  GLOW_RADIUS: 20,
  ANIMATION_SPEED: 0.0078, // 128fps (1/128)
};

export function PongCanvas({
  gameState,
  className = '',
  onSetReady,
  isSpectating = false,
  gameStateBuffer,
  shadowPhysics,
  getInterpolatedGameState,
}: PongCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]); // ✅ Use ref instead of state
  const lastBallPos = useRef({ x: 0, y: 0 });
  const backgroundCanvasRef = useRef<HTMLCanvasElement | null>(null); // ✅ Cache background

  // ✅ Smooth paddle positions (lerp for fluid movement)
  const smoothPaddlePositions = useRef<[number | null, number | null]>([null, null]);

  // ✅ Performance monitoring (only in development)
  const { measureFrame } = usePongPerformanceMonitor(
    process.env.NODE_ENV === 'development' && gameState?.status === 'active',
  );

  // Store measureFrame in ref for stable access in animation loop
  const measureFrameRef = useRef(measureFrame);
  useEffect(() => {
    measureFrameRef.current = measureFrame;
  }, [measureFrame]);

  // ✅ Improved ball interpolation with binary search and prediction fallback
  const getInterpolatedBallPosition = useCallback(
    (currentTime: number = Date.now()) => {
      if (!gameStateBuffer || !gameState || gameState.status !== 'active') {
        return null;
      }

      const states = gameStateBuffer.getStates();
      if (states.length === 0) {
        return null;
      }

      if (states.length === 1) {
        // Only one state available, use prediction
        const state = states[0];
        const dt = (currentTime - state.timestamp) / 1000;
        return {
          x: state.ball.x + state.ball.vx * dt,
          y: state.ball.y + state.ball.vy * dt,
          vx: state.ball.vx,
          vy: state.ball.vy,
        };
      }

      // ✅ Binary search instead of linear (O(log n) instead of O(n))
      let left = 0;
      let right = states.length - 1;
      let beforeState: GameStateSnapshot | null = null;
      let afterState: GameStateSnapshot | null = null;

      while (left < right - 1) {
        const mid = Math.floor((left + right) / 2);
        if (states[mid].timestamp < currentTime) {
          left = mid;
        } else {
          right = mid;
        }
      }

      if (states[left].timestamp <= currentTime && states[right].timestamp >= currentTime) {
        beforeState = states[left];
        afterState = states[right];
      }

      // ✅ Prediction fallback if interpolation not possible
      if (!beforeState || !afterState) {
        const latestState = gameStateBuffer.getLatestState();
        if (!latestState) return null;

        // Predict based on velocity
        const dt = (currentTime - latestState.timestamp) / 1000;
        return {
          x: latestState.ball.x + latestState.ball.vx * dt,
          y: latestState.ball.y + latestState.ball.vy * dt,
          vx: latestState.ball.vx,
          vy: latestState.ball.vy,
        };
      }

      // Interpolate between the two states
      const t = LinearInterpolation.getInterpolationFactor(
        currentTime,
        beforeState.timestamp,
        afterState.timestamp,
      );

      const interpolatedPosition = LinearInterpolation.lerpPoint(
        beforeState.ball,
        afterState.ball,
        t,
      );
      // Return full ball object with velocities for compatibility
      return {
        x: interpolatedPosition.x,
        y: interpolatedPosition.y,
        vx: afterState.ball.vx, // Use latest velocity
        vy: afterState.ball.vy,
      };
    },
    [gameStateBuffer, gameState],
  );

  // ✅ Improved paddle interpolation with binary search
  const getInterpolatedPaddlePosition = useCallback(
    (playerIndex: 0 | 1, currentTime: number = Date.now()) => {
      if (!gameStateBuffer || !gameState || gameState.status !== 'active') {
        return null;
      }

      const states = gameStateBuffer.getStates();
      if (states.length === 0) {
        return null;
      }

      if (states.length === 1) {
        return states[0].players[playerIndex]?.paddleY || null;
      }

      // ✅ Binary search instead of linear (O(log n) instead of O(n))
      let left = 0;
      let right = states.length - 1;
      let beforeState: GameStateSnapshot | null = null;
      let afterState: GameStateSnapshot | null = null;

      while (left < right - 1) {
        const mid = Math.floor((left + right) / 2);
        if (states[mid].timestamp < currentTime) {
          left = mid;
        } else {
          right = mid;
        }
      }

      if (states[left].timestamp <= currentTime && states[right].timestamp >= currentTime) {
        beforeState = states[left];
        afterState = states[right];
      }

      if (!beforeState || !afterState) {
        const latestState = gameStateBuffer.getLatestState();
        return latestState?.players[playerIndex]?.paddleY || null;
      }

      const beforePaddle = beforeState.players[playerIndex];
      const afterPaddle = afterState.players[playerIndex];

      if (!beforePaddle || !afterPaddle) {
        return null;
      }

      const t = LinearInterpolation.getInterpolationFactor(
        currentTime,
        beforeState.timestamp,
        afterState.timestamp,
      );

      return LinearInterpolation.lerp(beforePaddle.paddleY, afterPaddle.paddleY, t);
    },
    [gameStateBuffer, gameState],
  );
  const lastScores = useRef<[number, number]>([0, 0]);
  const lastGameBallPos = useRef({ x: 0, y: 0 }); // Track ball position in game coordinates
  const paintedLines = useRef<
    Array<{ x1: number; y1: number; x2: number; y2: number; timestamp: number; alpha: number }>
  >([]);

  const createParticles = useCallback(
    (x: number, y: number, color: string, count: number = 8, isGoal: boolean = false) => {
      const newParticles: Particle[] = [];

      if (isGoal) {
        // Goal explosion - much more dramatic!
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2;
          const speed = Math.random() * 8 + 4; // Faster particles
          newParticles.push({
            x,
            y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1,
            maxLife: 1,
            size: Math.random() * 8 + 3, // Larger particles
            color,
          });
        }

        // Add extra random particles for chaos
        for (let i = 0; i < count / 2; i++) {
          newParticles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 1,
            maxLife: 1,
            size: Math.random() * 6 + 2,
            color: '#ffffff', // White sparks
          });
        }
      } else {
        // Regular particles
        for (let i = 0; i < count; i++) {
          newParticles.push({
            x,
            y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            maxLife: 1,
            size: Math.random() * 3 + 1,
            color,
          });
        }
      }

      // ✅ Update ref directly, no React state update
      particlesRef.current = [...particlesRef.current.slice(-50), ...newParticles]; // Keep more particles for goals
    },
    [],
  );

  const updateParticles = useCallback(() => {
    // ✅ Update ref directly, no React state update (eliminates 60 setState/sec)
    particlesRef.current = particlesRef.current
      .map((particle) => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - 0.015, // Slower decay for goal particles
        vx: particle.vx * 0.98,
        vy: particle.vy * 0.98,
      }))
      .filter((particle) => particle.life > 0);
  }, []);

  // Detect goals and trigger particle explosions
  useEffect(() => {
    if (!gameState?.scores || !gameState?.ball) return;

    const [leftScore, rightScore] = gameState.scores;
    const [lastLeftScore, lastRightScore] = lastScores.current;

    // Update ball position continuously (but only when game is active)
    if (gameState.status === 'active') {
      lastGameBallPos.current = { x: gameState.ball.x, y: gameState.ball.y };
    }

    // Check if someone scored
    if (leftScore > lastLeftScore) {
      // Left player scored (ball hit right wall)
      const canvas = canvasRef.current;
      if (canvas) {
        const scaleY = (canvas.height - 40) / PONG_PHYSICS.FIELD_HEIGHT;

        // For right wall goal, clamp X to the wall position but use actual Y
        const goalX = canvas.width - 20; // Always at right wall
        const goalY = 20 + lastGameBallPos.current.y * scaleY; // Use ball's Y position

        // Green explosion for left player score
        createParticles(goalX, goalY, VISUAL_CONFIG.PADDLE.PLAYER, 20, true);
      }
    } else if (rightScore > lastRightScore) {
      // Right player scored (ball hit left wall)
      const canvas = canvasRef.current;
      if (canvas) {
        const scaleY = (canvas.height - 40) / PONG_PHYSICS.FIELD_HEIGHT;

        // For left wall goal, clamp X to the wall position but use actual Y
        const goalX = 20; // Always at left wall
        const goalY = 20 + lastGameBallPos.current.y * scaleY; // Use ball's Y position

        // Red explosion for right player score
        createParticles(goalX, goalY, VISUAL_CONFIG.PADDLE.OPPONENT, 20, true);
      }
    }

    // Update last scores
    lastScores.current = [leftScore, rightScore];
  }, [gameState?.scores, gameState?.ball, gameState?.status, createParticles]);

  const drawEnhancedBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // ✅ Cache background to offscreen canvas (draw once, reuse forever)
      if (
        !backgroundCanvasRef.current ||
        backgroundCanvasRef.current.width !== width ||
        backgroundCanvasRef.current.height !== height
      ) {
        // Create or recreate offscreen canvas
        backgroundCanvasRef.current = document.createElement('canvas');
        backgroundCanvasRef.current.width = width;
        backgroundCanvasRef.current.height = height;
        const bgCtx = backgroundCanvasRef.current.getContext('2d')!;

        // Draw expensive gradient ONCE
        const gradient = bgCtx.createRadialGradient(
          width / 2,
          height / 2,
          0,
          width / 2,
          height / 2,
          Math.max(width, height) / 2,
        );
        gradient.addColorStop(0, VISUAL_CONFIG.BACKGROUND.PRIMARY);
        gradient.addColorStop(0.6, VISUAL_CONFIG.BACKGROUND.SECONDARY);
        gradient.addColorStop(1, VISUAL_CONFIG.BACKGROUND.ACCENT);

        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, width, height);

        // Add subtle grid pattern ONCE
        bgCtx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        bgCtx.lineWidth = 1;
        const gridSize = 40;

        for (let x = 0; x < width; x += gridSize) {
          bgCtx.beginPath();
          bgCtx.moveTo(x, 0);
          bgCtx.lineTo(x, height);
          bgCtx.stroke();
        }

        for (let y = 0; y < height; y += gridSize) {
          bgCtx.beginPath();
          bgCtx.moveTo(0, y);
          bgCtx.lineTo(width, y);
          bgCtx.stroke();
        }
      }

      // ✅ Fast copy from cached canvas (no expensive operations)
      ctx.drawImage(backgroundCanvasRef.current, 0, 0);
    },
    [],
  );

  const drawGlow = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      radius: number,
      color: string,
      intensity: number = 0.5,
    ) => {
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'transparent');

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = intensity;
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
      ctx.restore();
    },
    [],
  );

  const drawEnhancedPaddle = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      x: number,
      y: number,
      width: number,
      height: number,
      color: string,
      isPlayer: boolean,
    ) => {
      // Calculate extended hitbox for visual indication (5px extension like server)
      const HITBOX_EXTENSION = 5 * (height / 80); // Scale extension based on rendered size
      const hitboxY = y - HITBOX_EXTENSION;
      const hitboxHeight = height + HITBOX_EXTENSION * 2;

      // Draw subtle hitbox indicator (only for player paddle)
      if (isPlayer) {
        ctx.save();
        ctx.globalAlpha = 0.15;
        ctx.fillStyle = color;
        ctx.fillRect(x - 1, hitboxY, width + 2, hitboxHeight);
        ctx.restore();

        // Draw hitbox border
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(x - 1, hitboxY, width + 2, hitboxHeight);
        ctx.setLineDash([]);
        ctx.restore();
      }

      // ✅ Simplified glow (less expensive)
      drawGlow(ctx, x + width / 2, y + height / 2, VISUAL_CONFIG.GLOW_RADIUS, color, 0.2);

      // Main paddle with gradient
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      // ✅ Remove expensive shadowBlur
      ctx.fillRect(x, y, width, height);

      // Border highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Add center line for better visual reference
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y + height / 2);
      ctx.lineTo(x + width, y + height / 2);
      ctx.stroke();
    },
    [drawGlow],
  );

  const drawEnhancedBall = useCallback(
    (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
      const currentTime = Date.now();

      // Check if ball position jumped significantly (indicates reset after scoring)
      const lastPos = lastBallPos.current;
      const distance = Math.sqrt(Math.pow(x - lastPos.x, 2) + Math.pow(y - lastPos.y, 2));

      if (distance > 100) {
        // Ball teleported, clear all painted lines
        paintedLines.current = [];
      } else if (distance > 0.5 && lastPos.x !== 0 && lastPos.y !== 0) {
        // ✅ Add trail point every frame for smooth continuous snake trail
        paintedLines.current.push({
          x1: lastPos.x,
          y1: lastPos.y,
          x2: x,
          y2: y,
          timestamp: currentTime,
          alpha: 1,
        });
      }

      // Update last position
      lastBallPos.current = { x, y };

      // ✅ Keep trail for 1200ms (much longer for better tracking)
      paintedLines.current = paintedLines.current.filter((line) => {
        const age = currentTime - line.timestamp;
        if (age > 1200) return false; // Keep for 1200ms (3x longer)

        // Smooth fade curve
        line.alpha = Math.max(0, 1 - age / 1200);
        return true;
      });

      // ✅ Draw smooth snake-like trail with minimal tapering (more line-like)
      if (paintedLines.current.length > 1) {
        ctx.save();

        // Draw as a continuous path with minimal width variation
        paintedLines.current.forEach((line, _idx) => {
          const age = currentTime - line.timestamp;
          const fadeProgress = age / 1200;

          // Very subtle taper - stays thick throughout (1.8x to 1.2x radius)
          const widthMultiplier = 1.8 - fadeProgress * 0.6; // Starts at 1.8x, ends at 1.2x radius
          const lineWidth = radius * widthMultiplier;

          if (lineWidth > 0.5) {
            ctx.strokeStyle = VISUAL_CONFIG.BALL.CORE;
            ctx.globalAlpha = line.alpha * 0.7; // 70% opacity max
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            ctx.moveTo(line.x1, line.y1);
            ctx.lineTo(line.x2, line.y2);
            ctx.stroke();
          }
        });

        ctx.restore();
      }

      // Draw subtle collision area indicator
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.strokeStyle = VISUAL_CONFIG.BALL.CORE;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 1]);
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Main ball - solid and clean
      ctx.fillStyle = VISUAL_CONFIG.BALL.CORE;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2); // Slightly smaller visual core
      ctx.fill();

      // Bright center dot for precise center reference
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.3, 0, Math.PI * 2);
      ctx.fill();

      // Border for definition
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.8, 0, Math.PI * 2);
      ctx.stroke();
    },
    [],
  );

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    // ✅ Read from ref instead of state
    particlesRef.current.forEach((particle) => {
      ctx.save();
      ctx.globalAlpha = particle.life;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }, []); // ✅ No dependencies - stable callback

  const drawGameField = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Center line (no glow for performance)
      const centerX = width / 2;
      ctx.strokeStyle = VISUAL_CONFIG.FIELD.LINE;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);

      ctx.beginPath();
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.stroke();

      ctx.setLineDash([]);

      // Field boundaries (no glow for performance)
      ctx.strokeStyle = VISUAL_CONFIG.FIELD.WALL;
      ctx.lineWidth = 2;

      ctx.strokeRect(10, 10, width - 20, height - 20);
    },
    [],
  );

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clear and draw background
    ctx.clearRect(0, 0, width, height);
    drawEnhancedBackground(ctx, width, height);
    drawGameField(ctx, width, height);

    if (!gameState) return;

    const scaleX = (width - 40) / PONG_PHYSICS.FIELD_WIDTH;
    const scaleY = (height - 40) / PONG_PHYSICS.FIELD_HEIGHT;

    // Draw paddles with enhanced graphics (with smooth interpolation)
    if (gameState.players) {
      gameState.players.forEach((player, index) => {
        if (player) {
          const paddleWidth = PONG_PHYSICS.PADDLE_WIDTH * scaleX;
          const x =
            index === 0
              ? 20 // Left paddle starts at field edge (20px offset for canvas border)
              : width - 20 - paddleWidth; // Right paddle ends at field edge

          // Use interpolated paddle position when available, fall back to direct server data
          let paddleY = player.paddleY;

          // Try our simple paddle interpolation first
          const interpolatedPaddleY = getInterpolatedPaddlePosition(index as 0 | 1);
          if (interpolatedPaddleY !== null) {
            // For players, only interpolate opponent paddle to avoid conflicting with local input
            if (isSpectating || index !== gameState.playerSlot) {
              paddleY = interpolatedPaddleY;
            }
          } else if (getInterpolatedGameState && gameState.status === 'active') {
            // Fallback to advanced interpolation
            const interpolated = getInterpolatedGameState();
            if (interpolated) {
              if (isSpectating) {
                // For spectators, use interpolated positions for both players
                if (index === 0 && interpolated.player1PaddleY !== undefined) {
                  paddleY = interpolated.player1PaddleY;
                } else if (index === 1 && interpolated.player2PaddleY !== undefined) {
                  paddleY = interpolated.player2PaddleY;
                }
              } else {
                // For players, only interpolate opponent paddle
                const isOpponent = index !== gameState.playerSlot;
                if (isOpponent && interpolated.opponentPaddleY !== undefined) {
                  paddleY = interpolated.opponentPaddleY;
                }
              }
            }
          }

          // ✅ Determine if this is the player's own paddle (for both smoothing and visuals)
          const isPlayerPaddle = !isSpectating && index === gameState.playerSlot;

          // ✅ CRITICAL FIX: Only smooth opponent paddle to prevent visual desync
          // Player paddle must render exactly where it is for collision accuracy
          // Opponent paddle smoothing is visual-only (doesn't affect gameplay)
          if (!isPlayerPaddle) {
            // Smooth opponent paddle for fluid animation (30% per frame)
            const smoothingFactor = 0.3;

            if (smoothPaddlePositions.current[index] === null) {
              smoothPaddlePositions.current[index] = paddleY;
            } else {
              // Lerp towards target position
              const currentSmooth = smoothPaddlePositions.current[index]!;
              smoothPaddlePositions.current[index] =
                currentSmooth + (paddleY - currentSmooth) * smoothingFactor;
              paddleY = smoothPaddlePositions.current[index]!;
            }
          } else {
            // Player paddle: NO smoothing - render exactly where it is
            // This ensures visual position matches server collision detection
            smoothPaddlePositions.current[index] = paddleY;
          }

          const y = 20 + paddleY * scaleY; // paddleY is the TOP of the paddle (server treats it this way)

          // For spectators, use different colors for each player
          // For players, use player/opponent colors based on their slot
          const paddleColor = isSpectating
            ? index === 0
              ? VISUAL_CONFIG.PADDLE.PLAYER
              : VISUAL_CONFIG.PADDLE.OPPONENT
            : index === gameState.playerSlot
              ? VISUAL_CONFIG.PADDLE.PLAYER
              : VISUAL_CONFIG.PADDLE.OPPONENT;

          drawEnhancedPaddle(
            ctx,
            x,
            y,
            paddleWidth,
            PONG_PHYSICS.PADDLE_HEIGHT * scaleY,
            paddleColor,
            isPlayerPaddle,
          );
        }
      });
    }

    // Draw ball with enhanced graphics (with shadow physics or interpolation)
    if (gameState.ball && gameState.status === 'active') {
      let ballPosition = gameState.ball;

      // ✅ PHASE 2: Prefer shadow physics (client-side prediction) for smoothest experience
      if (shadowPhysics) {
        // Update shadow physics with current paddle positions
        const paddle1Y = gameState.players[0]?.paddleY;
        const paddle2Y = gameState.players[1]?.paddleY;
        const shadowBall = shadowPhysics.update(Date.now(), paddle1Y, paddle2Y);

        if (shadowBall) {
          ballPosition = {
            x: shadowBall.x,
            y: shadowBall.y,
            vx: shadowBall.vx,
            vy: shadowBall.vy,
          };
        }
      } else {
        // Fallback to interpolation if shadow physics not available
        const interpolatedBall = getInterpolatedBallPosition();
        if (interpolatedBall) {
          ballPosition = interpolatedBall;
        } else if (getInterpolatedGameState) {
          // Fallback to the advanced interpolation if available
          const interpolated = getInterpolatedGameState();
          if (interpolated && interpolated.confidence.ball > 0.1) {
            ballPosition = interpolated.ball;
          }
        }
      }

      const ballX = 20 + ballPosition.x * scaleX;
      const ballY = 20 + ballPosition.y * scaleY;

      drawEnhancedBall(ctx, ballX, ballY, 8);
    }

    // Draw particles (goal explosions, etc.)
    drawParticles(ctx);
  }, [
    gameState,
    isSpectating,
    shadowPhysics,
    getInterpolatedGameState,
    getInterpolatedBallPosition,
    getInterpolatedPaddlePosition,
    drawEnhancedBackground,
    drawGameField,
    drawEnhancedPaddle,
    drawEnhancedBall,
    drawParticles,
  ]);

  // Store latest versions of draw and updateParticles in refs to avoid recreating animate
  const drawRef = useRef(draw);
  const updateParticlesRef = useRef(updateParticles);

  // Update refs when callbacks change
  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    updateParticlesRef.current = updateParticles;
  }, [updateParticles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (!container) return;

      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create stable animation function that uses refs
    const animate = () => {
      if (measureFrameRef.current) {
        measureFrameRef.current(); // ✅ Track performance
      }
      updateParticlesRef.current(); // Use ref to get latest function
      drawRef.current(); // Use ref to get latest function
      animationRef.current = requestAnimationFrame(animate);
    };

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0; // Clear the ref
      }
    };
  }, []); // ✅ Empty deps - runs once, no duplicate loops

  return (
    <div className={`pong-canvas-enhanced-container relative ${className}`}>
      {/* Canvas with overlays */}
      <canvas
        ref={canvasRef}
        className="w-full h-full min-h-[400px] rounded-lg"
        style={{ background: 'transparent' }}
      />

      {/* Countdown overlay - on canvas */}
      {gameState?.status === 'countdown' && gameState.countdown !== undefined && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-surface/90 p-8 rounded-2xl shadow-2xl">
            <div className="text-6xl font-bold text-accent animate-pulse">
              {gameState.countdown > 0 ? gameState.countdown : 'GO!'}
            </div>
          </div>
        </div>
      )}

      {/* Waiting for opponent overlay - on canvas */}
      {gameState?.status === 'waiting_for_opponent' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-surface/90 p-8 rounded-2xl shadow-2xl text-center">
            <div className="text-4xl font-bold mb-4 text-secondary">Waiting for Opponent...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto mb-4"></div>
            <div className="text-lg text-tertiary">Share your match to invite players!</div>
          </div>
        </div>
      )}

      {/* Spectator mode indicator */}
      {isSpectating && (
        <div className="absolute top-4 left-4 z-30">
          <div className="bg-accent/90 text-accent-foreground px-3 py-1 rounded-lg text-sm font-medium flex items-center space-x-2">
            <span>👁️</span>
            <span>Spectating</span>
          </div>
        </div>
      )}

      {/* Waiting for ready overlay - on canvas */}
      {gameState?.status === 'waiting_for_ready' &&
        gameState.readyStates &&
        onSetReady &&
        !isSpectating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-auto z-20">
            <div className="bg-surface/90 p-8 rounded-2xl shadow-2xl text-center">
              <div className="text-3xl font-bold mb-6 text-content">Ready to Play?</div>

              {/* Ready states display */}
              <div className="flex justify-center space-x-8 mb-6">
                <div className="text-center">
                  <div className="text-lg font-medium text-content">You</div>
                  <div
                    className={`text-2xl ${gameState.readyStates[gameState.playerSlot] ? 'text-success' : 'text-tertiary'}`}
                  >
                    {gameState.readyStates[gameState.playerSlot] ? '✅' : '⏳'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-medium text-content">Opponent</div>
                  <div
                    className={`text-2xl ${gameState.readyStates[gameState.playerSlot === 0 ? 1 : 0] ? 'text-success' : 'text-tertiary'}`}
                  >
                    {gameState.readyStates[gameState.playerSlot === 0 ? 1 : 0] ? '✅' : '⏳'}
                  </div>
                </div>
              </div>

              {/* Ready button */}
              <button
                onClick={() => onSetReady(!gameState.readyStates![gameState.playerSlot])}
                className={`px-8 py-4 text-xl font-bold rounded-lg transition-colors cursor-pointer ${
                  gameState.readyStates[gameState.playerSlot]
                    ? 'bg-error text-error-foreground hover:bg-error/90'
                    : 'bg-success text-success-foreground hover:bg-success/90'
                }`}
              >
                {gameState.readyStates[gameState.playerSlot] ? 'Not Ready' : 'Ready Up!'}
              </button>
            </div>
          </div>
        )}

      {/* Game ended overlay - on canvas */}
      {gameState?.status === 'ended' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="bg-surface/90 p-8 rounded-2xl shadow-2xl text-center">
            <div className="text-4xl font-bold mb-4">
              {isSpectating ? (
                // Spectator view - show winner's name
                gameState.winner === null || gameState.winner === undefined ? (
                  <span className="text-warning">Draw!</span>
                ) : (
                  <span className="text-success">
                    {gameState.players[gameState.winner]?.name || `Player ${gameState.winner + 1}`}{' '}
                    Wins! 🎉
                  </span>
                )
              ) : // Player view - show You Win/Lost
              gameState.winner === gameState.playerSlot ? (
                <span className="text-success">You Win! 🎉</span>
              ) : gameState.winner === null || gameState.winner === undefined ? (
                <span className="text-warning">Draw!</span>
              ) : (
                <span className="text-error">You Lost</span>
              )}
            </div>
            <div className="text-2xl text-content mb-2">
              Final Score: {gameState.scores[0]} - {gameState.scores[1]}
            </div>
            {!isSpectating && gameState.payout !== undefined && gameState.payout > 0 && (
              <div className="text-lg text-success">
                +{gameState.payout.toLocaleString()} MuskBucks
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
