import { useRef, useEffect, useCallback, useState } from 'react';
import { PONG_PHYSICS } from '@ems/types';

// Match the same interface from usePongSocketOptimized
interface OptimizedGameState {
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
}

interface PongCanvasEnhancedProps {
  gameState?: OptimizedGameState;
  className?: string;
  ping?: number;
  onSetReady?: (ready: boolean) => void;
  isSpectating?: boolean;
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

export function PongCanvasEnhanced({
  gameState,
  className = '',
  ping = 0,
  onSetReady,
  isSpectating = false,
}: PongCanvasEnhancedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [particles, setParticles] = useState<Particle[]>([]);
  const ballTrail = useRef<Array<{ x: number; y: number; alpha: number }>>([]);
  const lastBallPos = useRef({ x: 0, y: 0 });
  const paintedLines = useRef<
    Array<{ x1: number; y1: number; x2: number; y2: number; timestamp: number; alpha: number }>
  >([]);
  const frameCount = useRef(0);
  const lastFpsTime = useRef(Date.now());

  const createParticles = useCallback((x: number, y: number, color: string, count: number = 8) => {
    const newParticles: Particle[] = [];
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
    setParticles((prev) => [...prev.slice(-20), ...newParticles]); // Keep only recent particles
  }, []);

  const updateParticles = useCallback(() => {
    setParticles((prev) =>
      prev
        .map((particle) => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life - 0.02,
          vx: particle.vx * 0.98,
          vy: particle.vy * 0.98,
        }))
        .filter((particle) => particle.life > 0),
    );
  }, []);

  const drawEnhancedBackground = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Animated gradient background
      const gradient = ctx.createRadialGradient(
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

      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Add subtle grid pattern
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridSize = 40;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
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
      // Glow effect
      drawGlow(ctx, x + width / 2, y + height / 2, VISUAL_CONFIG.GLOW_RADIUS, color, 0.3);

      // Main paddle with gradient
      const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, color);

      ctx.fillStyle = gradient;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.fillRect(x, y, width, height);

      // Border highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      ctx.shadowBlur = 0;
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
      } else if (distance > 1 && lastPos.x !== 0 && lastPos.y !== 0) {
        // Ball moved normally, paint a line
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

      // Remove old painted lines (older than 1000ms) and fade existing ones
      paintedLines.current = paintedLines.current.filter((line) => {
        const age = currentTime - line.timestamp;
        if (age > 1000) return false; // Remove lines older than 1000ms (1 second)

        // Fade lines based on age
        line.alpha = Math.max(0, 1 - age / 1000);
        return true;
      });

      // Draw all painted lines
      paintedLines.current.forEach((line) => {
        ctx.save();
        ctx.globalAlpha = line.alpha;
        ctx.strokeStyle = VISUAL_CONFIG.BALL.CORE;
        ctx.lineWidth = radius * 1.5; // Thick paint brush effect
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();
        ctx.moveTo(line.x1, line.y1);
        ctx.lineTo(line.x2, line.y2);
        ctx.stroke();
        ctx.restore();
      });

      // Main ball - solid and clean
      ctx.fillStyle = VISUAL_CONFIG.BALL.CORE;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Simple border for definition
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    },
    [],
  );

  const drawParticles = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      particles.forEach((particle) => {
        ctx.save();
        ctx.globalAlpha = particle.life;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    },
    [particles],
  );

  const drawGameField = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      // Center line with glow
      const centerX = width / 2;
      ctx.strokeStyle = VISUAL_CONFIG.FIELD.LINE;
      ctx.lineWidth = 3;
      ctx.setLineDash([10, 10]);

      // Glow for center line
      ctx.shadowColor = VISUAL_CONFIG.FIELD.LINE;
      ctx.shadowBlur = 8;

      ctx.beginPath();
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.shadowBlur = 0;

      // Field boundaries with subtle glow
      ctx.strokeStyle = VISUAL_CONFIG.FIELD.WALL;
      ctx.lineWidth = 2;
      ctx.shadowColor = VISUAL_CONFIG.FIELD.WALL;
      ctx.shadowBlur = 5;

      ctx.strokeRect(10, 10, width - 20, height - 20);
      ctx.shadowBlur = 0;
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

    // Draw paddles with enhanced graphics
    if (gameState.players) {
      gameState.players.forEach((player, index) => {
        if (player) {
          const paddleWidth = PONG_PHYSICS.PADDLE_WIDTH * scaleX;
          const x =
            index === 0
              ? 20 // Left paddle starts at field edge (20px offset for canvas border)
              : width - 20 - paddleWidth; // Right paddle ends at field edge
          const y = 20 + player.paddleY * scaleY; // paddleY is the TOP of the paddle (server treats it this way)

          // For spectators, use different colors for each player
          // For players, use player/opponent colors based on their slot
          const paddleColor = isSpectating
            ? index === 0
              ? VISUAL_CONFIG.PADDLE.PLAYER
              : VISUAL_CONFIG.PADDLE.OPPONENT
            : index === gameState.playerSlot
              ? VISUAL_CONFIG.PADDLE.PLAYER
              : VISUAL_CONFIG.PADDLE.OPPONENT;

          const isPlayerPaddle = isSpectating ? false : index === gameState.playerSlot;

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

    // Draw ball with enhanced graphics
    if (gameState.ball && gameState.status === 'active') {
      // Use direct server position (no interpolation)
      const ballX = 20 + gameState.ball.x * scaleX;
      const ballY = 20 + gameState.ball.y * scaleY;

      drawEnhancedBall(ctx, ballX, ballY, 8);
    }
  }, [gameState, drawEnhancedBackground, drawGameField, drawEnhancedPaddle, drawEnhancedBall]);

  const animate = useCallback(() => {
    draw();
    animationRef.current = requestAnimationFrame(animate);
  }, [draw]);

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

    // Start animation loop
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate]);

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
              {gameState.winner === gameState.playerSlot ? (
                <span className="text-success">You Win! 🎉</span>
              ) : gameState.winner === null ? (
                <span className="text-warning">Draw!</span>
              ) : (
                <span className="text-error">You Lost</span>
              )}
            </div>
            <div className="text-2xl text-content mb-2">
              Final Score: {gameState.scores[0]} - {gameState.scores[1]}
            </div>
            {gameState.payout !== undefined && gameState.payout > 0 && (
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
