// Basic types for pong interpolation system

export interface GameStateSnapshot {
  ball: { x: number; y: number; vx: number; vy: number };
  players: [
    { id: number; name: string; paddleY: number; score: number } | null,
    { id: number; name: string; paddleY: number; score: number } | null,
  ];
  scores: [number, number];
  tick: number;
  timestamp: number;
  serverTime: number;
  status: 'active' | 'paused' | 'ended';
}

// Simple circular buffer for storing game state history
export class GameStateBuffer {
  private states: GameStateSnapshot[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }

  addState(state: GameStateSnapshot): void {
    this.states.push(state);
    if (this.states.length > this.maxSize) {
      this.states.shift(); // Remove oldest state
    }
  }

  getStates(): GameStateSnapshot[] {
    return [...this.states]; // Return copy to prevent external mutation
  }

  clear(): void {
    this.states = [];
  }

  getLatestState(): GameStateSnapshot | null {
    return this.states.length > 0 ? this.states[this.states.length - 1] : null;
  }
}

// Simple linear interpolation utilities
export class LinearInterpolation {
  // Interpolate between two numbers
  static lerp(start: number, end: number, t: number): number {
    return start + (end - start) * t;
  }

  // Interpolate between two 2D points
  static lerpPoint(
    start: { x: number; y: number },
    end: { x: number; y: number },
    t: number,
  ): { x: number; y: number } {
    return {
      x: this.lerp(start.x, end.x, t),
      y: this.lerp(start.y, end.y, t),
    };
  }

  // Calculate interpolation factor based on timestamps
  static getInterpolationFactor(currentTime: number, startTime: number, endTime: number): number {
    if (endTime <= startTime) return 0;
    const t = (currentTime - startTime) / (endTime - startTime);
    return Math.max(0, Math.min(1, t)); // Clamp between 0 and 1
  }
}
