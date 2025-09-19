import { GameStateBuffer, GameStateSnapshot, LinearInterpolation } from '../pongInterpolation';

describe('GameStateBuffer', () => {
  let buffer: GameStateBuffer;
  let mockState: GameStateSnapshot;

  beforeEach(() => {
    buffer = new GameStateBuffer(3); // Small buffer for testing
    mockState = {
      ball: { x: 100, y: 200, vx: 5, vy: -3 },
      players: [
        { id: 1, name: 'Player1', paddleY: 150, score: 0 },
        { id: 2, name: 'Player2', paddleY: 250, score: 1 },
      ],
      scores: [0, 1],
      tick: 100,
      timestamp: Date.now(),
      serverTime: Date.now(),
      status: 'active',
    };
  });

  test('should initialize with empty states', () => {
    expect(buffer.getStates()).toHaveLength(0);
    expect(buffer.getLatestState()).toBeNull();
  });

  test('should add states correctly', () => {
    buffer.addState(mockState);

    expect(buffer.getStates()).toHaveLength(1);
    expect(buffer.getLatestState()).toEqual(mockState);
  });

  test('should maintain circular buffer size', () => {
    // Add 4 states to a buffer with maxSize of 3
    for (let i = 0; i < 4; i++) {
      const state = { ...mockState, tick: i };
      buffer.addState(state);
    }

    const states = buffer.getStates();
    expect(states).toHaveLength(3);

    // Should contain the last 3 states (ticks 1, 2, 3)
    expect(states[0].tick).toBe(1);
    expect(states[1].tick).toBe(2);
    expect(states[2].tick).toBe(3);
  });

  test('should clear states correctly', () => {
    buffer.addState(mockState);
    expect(buffer.getStates()).toHaveLength(1);

    buffer.clear();
    expect(buffer.getStates()).toHaveLength(0);
    expect(buffer.getLatestState()).toBeNull();
  });

  test('should return copy of states to prevent external mutation', () => {
    buffer.addState(mockState);

    const states = buffer.getStates();
    states.push({ ...mockState, tick: 999 }); // Try to modify returned array

    // Original buffer should be unaffected
    expect(buffer.getStates()).toHaveLength(1);
    expect(buffer.getStates()[0].tick).toBe(mockState.tick);
  });
});

describe('LinearInterpolation', () => {
  test('should interpolate between two numbers', () => {
    expect(LinearInterpolation.lerp(0, 10, 0)).toBe(0);
    expect(LinearInterpolation.lerp(0, 10, 1)).toBe(10);
    expect(LinearInterpolation.lerp(0, 10, 0.5)).toBe(5);
    expect(LinearInterpolation.lerp(5, 15, 0.25)).toBe(7.5);
  });

  test('should interpolate between two points', () => {
    const start = { x: 0, y: 0 };
    const end = { x: 10, y: 20 };

    const result1 = LinearInterpolation.lerpPoint(start, end, 0);
    expect(result1).toEqual({ x: 0, y: 0 });

    const result2 = LinearInterpolation.lerpPoint(start, end, 1);
    expect(result2).toEqual({ x: 10, y: 20 });

    const result3 = LinearInterpolation.lerpPoint(start, end, 0.5);
    expect(result3).toEqual({ x: 5, y: 10 });
  });

  test('should calculate interpolation factor correctly', () => {
    expect(LinearInterpolation.getInterpolationFactor(1500, 1000, 2000)).toBe(0.5);
    expect(LinearInterpolation.getInterpolationFactor(1000, 1000, 2000)).toBe(0);
    expect(LinearInterpolation.getInterpolationFactor(2000, 1000, 2000)).toBe(1);

    // Test clamping
    expect(LinearInterpolation.getInterpolationFactor(500, 1000, 2000)).toBe(0);
    expect(LinearInterpolation.getInterpolationFactor(2500, 1000, 2000)).toBe(1);

    // Test edge case where end <= start
    expect(LinearInterpolation.getInterpolationFactor(1500, 2000, 1000)).toBe(0);
  });
});
