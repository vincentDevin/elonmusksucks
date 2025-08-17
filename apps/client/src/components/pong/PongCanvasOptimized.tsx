import { useRef, useEffect, useCallback } from 'react';
import { PONG_PHYSICS } from '@ems/types';

interface OptimizedGameState {
  gameId: string;
  playerSlot: 0 | 1;
  players: [any, any];
  ball: { x: number; y: number; vx: number; vy: number };
  scores: [number, number];
  status: 'waiting' | 'countdown' | 'active' | 'paused' | 'ended';
  tick: number;
  timestamp: number;
  countdown?: number;
  winner?: 0 | 1 | null;
  payout?: number;
}

interface PongCanvasOptimizedProps {
  gameState?: OptimizedGameState;
  className?: string;
  ping?: number;
}

export function PongCanvasOptimized({
  gameState,
  className = '',
  ping = 0,
}: PongCanvasOptimizedProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastUserPaddleY = useRef<number | null>(null);

  // Canvas dimensions from physics constants
  const CANVAS_WIDTH = PONG_PHYSICS.FIELD_WIDTH;
  const CANVAS_HEIGHT = PONG_PHYSICS.FIELD_HEIGHT;

  // Rendering constants
  const PADDLE_WIDTH = PONG_PHYSICS.PADDLE_WIDTH;
  const PADDLE_HEIGHT = PONG_PHYSICS.PADDLE_HEIGHT;
  const BALL_SIZE = PONG_PHYSICS.BALL_SIZE;

  // Theme-aware colors
  const colors = {
    background: '#f8fafc',
    paddle: '#1e293b',
    ball: '#10b981',
    centerLine: '#e2e8f0',
    text: '#1e293b',
    score: '#10b981',
    prediction: '#f59e0b', // Orange for client prediction
  };

  const drawGame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = colors.background;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw center line
    ctx.strokeStyle = colors.centerLine;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    if (!gameState) {
      // Draw waiting state
      ctx.fillStyle = colors.text;
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Waiting for game...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      return;
    }

    // Draw scores
    ctx.fillStyle = colors.score;
    ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';

    ctx.fillText(gameState.scores[0].toString(), CANVAS_WIDTH / 4, 80);
    ctx.fillText(gameState.scores[1].toString(), (CANVAS_WIDTH * 3) / 4, 80);

    // Draw player names with slot indication
    ctx.fillStyle = colors.text;
    ctx.font = '16px system-ui, -apple-system, sans-serif';

    const player1Name = gameState.players[0]?.name || 'Player 1';
    const player2Name = gameState.players[1]?.name || 'AI';

    // Highlight current player
    if (gameState.playerSlot === 0) {
      ctx.fillStyle = colors.score;
      ctx.fillText(`${player1Name} (YOU)`, CANVAS_WIDTH / 4, 110);
      ctx.fillStyle = colors.text;
      ctx.fillText(player2Name, (CANVAS_WIDTH * 3) / 4, 110);
    } else {
      ctx.fillStyle = colors.text;
      ctx.fillText(player1Name, CANVAS_WIDTH / 4, 110);
      ctx.fillStyle = colors.score;
      ctx.fillText(`${player2Name} (YOU)`, (CANVAS_WIDTH * 3) / 4, 110);
    }

    // Draw paddles
    ctx.fillStyle = colors.paddle;

    // Left paddle (player 0) with bounds validation
    const playerObj = gameState.players[0];
    const paddleYFromState = playerObj?.paddleY;
    const fallbackY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    const rawLeftPaddleY = paddleYFromState !== undefined ? paddleYFromState : fallbackY;
    const leftPaddleY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, rawLeftPaddleY));

    // Track paddle position for potential debugging
    if (gameState.playerSlot === 0) {
      lastUserPaddleY.current = rawLeftPaddleY;
    }

    ctx.fillRect(20, leftPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Right paddle (player 1) with bounds validation
    const aiPlayerObj = gameState.players[1];
    const aiPaddleYFromState = aiPlayerObj?.paddleY;
    const aiFallbackY = CANVAS_HEIGHT / 2 - PADDLE_HEIGHT / 2;
    const rawRightPaddleY = aiPaddleYFromState !== undefined ? aiPaddleYFromState : aiFallbackY;
    const rightPaddleY = Math.max(0, Math.min(CANVAS_HEIGHT - PADDLE_HEIGHT, rawRightPaddleY));

    ctx.fillRect(CANVAS_WIDTH - 20 - PADDLE_WIDTH, rightPaddleY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Draw ball with advanced trajectory-based prediction
    if (gameState.ball && gameState.status === 'active') {
      const timeSinceUpdate = Date.now() - gameState.timestamp;
      const deltaTime = timeSinceUpdate / 1000;

      // Simulate ball trajectory with proper physics
      let ballX = gameState.ball.x;
      let ballY = gameState.ball.y;
      let velocityX = gameState.ball.vx;
      let velocityY = gameState.ball.vy;
      let timeRemaining = deltaTime;

      // Simulate physics step by step to handle multiple bounces
      const maxIterations = 5; // Prevent infinite loops
      let iteration = 0;

      while (timeRemaining > 0.001 && iteration < maxIterations) {
        iteration++;

        // Calculate next collision times
        let timeToWallY = Infinity;
        let timeToNextBounce = Infinity;

        // Time to hit top/bottom walls
        if (velocityY > 0) {
          timeToWallY = (CANVAS_HEIGHT - BALL_SIZE / 2 - ballY) / velocityY;
        } else if (velocityY < 0) {
          timeToWallY = (BALL_SIZE / 2 - ballY) / velocityY;
        }

        // Time to reach paddle zone (but don't simulate paddle bounce)
        let timeToPaddleZone = Infinity;
        if (velocityX < 0) {
          timeToPaddleZone = (PADDLE_WIDTH + 20 + BALL_SIZE / 2 - ballX) / velocityX;
        } else if (velocityX > 0) {
          timeToPaddleZone = (CANVAS_WIDTH - PADDLE_WIDTH - 20 - BALL_SIZE / 2 - ballX) / velocityX;
        }

        // Find earliest collision
        timeToNextBounce = Math.min(timeToWallY, timeToPaddleZone);

        // If no collision within remaining time, just move linearly
        if (timeToNextBounce >= timeRemaining || timeToNextBounce < 0) {
          ballX += velocityX * timeRemaining;
          ballY += velocityY * timeRemaining;
          break;
        }

        // Move to collision point
        ballX += velocityX * timeToNextBounce;
        ballY += velocityY * timeToNextBounce;
        timeRemaining -= timeToNextBounce;

        // Handle collision
        if (timeToNextBounce === timeToWallY) {
          // Wall bounce - flip Y velocity
          velocityY = -velocityY;

          // Ensure ball is exactly at wall boundary
          if (ballY <= BALL_SIZE / 2) {
            ballY = BALL_SIZE / 2;
          } else if (ballY >= CANVAS_HEIGHT - BALL_SIZE / 2) {
            ballY = CANVAS_HEIGHT - BALL_SIZE / 2;
          }
        } else {
          // Reached paddle zone - stop prediction, let server handle
          break;
        }
      }

      // Final bounds check
      const clampedX = Math.max(BALL_SIZE / 2, Math.min(CANVAS_WIDTH - BALL_SIZE / 2, ballX));
      const clampedY = Math.max(BALL_SIZE / 2, Math.min(CANVAS_HEIGHT - BALL_SIZE / 2, ballY));

      ctx.fillStyle = colors.ball;
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, BALL_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      // Add ball trail effect for better visual feedback
      if (Math.abs(gameState.ball.vx) > 50 || Math.abs(gameState.ball.vy) > 50) {
        ctx.fillStyle = colors.ball + '40'; // Semi-transparent
        for (let i = 1; i <= 3; i++) {
          const trailX = clampedX - gameState.ball.vx * i * 0.005;
          const trailY = clampedY - gameState.ball.vy * i * 0.005;
          const trailSize = (BALL_SIZE / 2) * (0.8 - i * 0.2);

          if (trailX > 0 && trailX < CANVAS_WIDTH && trailY > 0 && trailY < CANVAS_HEIGHT) {
            ctx.beginPath();
            ctx.arc(trailX, trailY, trailSize, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // Draw game status overlays
    if (gameState.status === 'countdown') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = colors.score;
      ctx.font = 'bold 64px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('GET READY', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (gameState.status === 'paused') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.fillStyle = colors.text;
      ctx.font = '24px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('PAUSED - Player Disconnected', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    } else if (gameState.status === 'ended') {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      const winner = gameState.scores[0] > gameState.scores[1] ? 0 : 1;
      const isUserWinner = winner === gameState.playerSlot;

      ctx.fillStyle = isUserWinner ? colors.score : '#ef4444';
      ctx.font = 'bold 48px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(isUserWinner ? 'YOU WIN!' : 'YOU LOSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

      ctx.fillStyle = colors.text;
      ctx.font = '20px system-ui, -apple-system, sans-serif';
      ctx.fillText(
        `Final Score: ${gameState.scores[0]} - ${gameState.scores[1]}`,
        CANVAS_WIDTH / 2,
        CANVAS_HEIGHT / 2 + 50,
      );
    }

    // Draw debug info
    if (gameState.status === 'active') {
      ctx.fillStyle = colors.text;
      ctx.font = '12px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'left';

      // Ping and tick info
      ctx.fillText(`Ping: ${ping}ms`, 10, CANVAS_HEIGHT - 40);
      ctx.fillText(`Tick: ${gameState.tick}`, 10, CANVAS_HEIGHT - 25);
      ctx.fillText(`Status: ${gameState.status}`, 10, CANVAS_HEIGHT - 10);

      // Ball velocity (for debugging)
      ctx.textAlign = 'right';
      ctx.fillText(
        `Ball: ${Math.round(gameState.ball.vx)}, ${Math.round(gameState.ball.vy)}`,
        CANVAS_WIDTH - 10,
        CANVAS_HEIGHT - 10,
      );
    }
  }, [gameState, ping]);

  // Animation loop using requestAnimationFrame
  useEffect(() => {
    const animate = () => {
      drawGame();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [drawGame]);

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleResize = () => {
      const container = canvas.parentElement;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const aspectRatio = CANVAS_WIDTH / CANVAS_HEIGHT;

      let newWidth = containerRect.width;
      let newHeight = newWidth / aspectRatio;

      if (newHeight > containerRect.height) {
        newHeight = containerRect.height;
        newWidth = newHeight * aspectRatio;
      }

      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`pong-canvas-container relative ${className}`}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="pong-canvas border border-muted rounded-lg"
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          imageRendering: 'pixelated',
          background: 'rgb(var(--color-surface))',
        }}
      />

      {/* Game info overlay */}
      {gameState && (
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start text-sm text-tertiary pointer-events-none">
          <div className="space-y-1">
            <div>Game ID: {gameState.gameId.slice(-8)}</div>
            <div>You are: Player {gameState.playerSlot + 1}</div>
          </div>
          <div className="text-right space-y-1">
            <div
              className={`px-2 py-1 rounded text-xs font-medium ${
                gameState.status === 'active'
                  ? 'bg-success/20 text-success'
                  : gameState.status === 'countdown'
                    ? 'bg-warning/20 text-warning'
                    : gameState.status === 'ended'
                      ? 'bg-info/20 text-info'
                      : 'bg-muted/20 text-tertiary'
              }`}
            >
              {gameState.status.toUpperCase()}
            </div>
            {ping > 0 && (
              <div
                className={`text-xs ${
                  ping < 50 ? 'text-success' : ping < 100 ? 'text-warning' : 'text-error'
                }`}
              >
                {ping}ms
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
