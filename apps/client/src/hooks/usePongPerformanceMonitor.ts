import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Performance metrics for Pong game rendering
 */
interface PerformanceMetrics {
  avgFrameTime: number; // Average time between frames in ms
  maxFrameTime: number; // Maximum frame time in ms
  minFrameTime: number; // Minimum frame time in ms
  droppedFrames: number; // Number of frames >20ms (dropped at 60fps)
  fps: number; // Current frames per second
  totalFrames: number; // Total frames measured
}

/**
 * Hook to monitor Pong game rendering performance
 * Tracks frame times, dropped frames, and FPS
 */
export function usePongPerformanceMonitor(enabled: boolean = true) {
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef(Date.now());
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    avgFrameTime: 0,
    maxFrameTime: 0,
    minFrameTime: 0,
    droppedFrames: 0,
    fps: 0,
    totalFrames: 0,
  });

  /**
   * Call this at the start of each animation frame
   * Measures time since last frame and calculates metrics
   */
  const measureFrame = useCallback(() => {
    if (!enabled) return;

    const now = Date.now();
    const frameDelta = now - lastFrameTimeRef.current;
    lastFrameTimeRef.current = now;

    // Add frame time to buffer
    frameTimesRef.current.push(frameDelta);

    // Keep last 120 frames (2 seconds at 60fps)
    if (frameTimesRef.current.length > 120) {
      frameTimesRef.current.shift();
    }
  }, [enabled]);

  /**
   * Calculate and return current metrics
   */
  const getMetrics = useCallback((): PerformanceMetrics => {
    const times = frameTimesRef.current;
    if (times.length === 0) {
      return {
        avgFrameTime: 0,
        maxFrameTime: 0,
        minFrameTime: 0,
        droppedFrames: 0,
        fps: 0,
        totalFrames: 0,
      };
    }

    const avgFrameTime = times.reduce((a, b) => a + b, 0) / times.length;
    const maxFrameTime = Math.max(...times);
    const minFrameTime = Math.min(...times);
    const droppedFrames = times.filter((t) => t > 20).length; // >20ms = dropped at 60fps
    const fps = avgFrameTime > 0 ? 1000 / avgFrameTime : 0;

    return {
      avgFrameTime,
      maxFrameTime,
      minFrameTime,
      droppedFrames,
      fps,
      totalFrames: times.length,
    };
  }, []);

  /**
   * Reset all metrics
   */
  const reset = useCallback(() => {
    frameTimesRef.current = [];
    lastFrameTimeRef.current = Date.now();
    setMetrics({
      avgFrameTime: 0,
      maxFrameTime: 0,
      minFrameTime: 0,
      droppedFrames: 0,
      fps: 0,
      totalFrames: 0,
    });
  }, []);

  // Update metrics every 2 seconds
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      const newMetrics = getMetrics();
      setMetrics(newMetrics);

      // Log warnings for poor performance
      if (newMetrics.droppedFrames > 10) {
        console.warn(
          `[Pong Performance] ${newMetrics.droppedFrames} dropped frames in last 2 seconds`,
        );
      }

      if (newMetrics.fps < 55) {
        console.warn(`[Pong Performance] Low FPS detected: ${newMetrics.fps.toFixed(1)} fps`);
      }

      // Log performance summary in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[Pong Performance]', {
          fps: newMetrics.fps.toFixed(1),
          avgFrameTime: newMetrics.avgFrameTime.toFixed(2) + 'ms',
          maxFrameTime: newMetrics.maxFrameTime.toFixed(2) + 'ms',
          droppedFrames: newMetrics.droppedFrames,
        });
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, [enabled, getMetrics]);

  return {
    measureFrame,
    getMetrics,
    reset,
    metrics,
  };
}
