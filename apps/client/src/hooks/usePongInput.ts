import { useState, useEffect, useCallback, useRef } from 'react';

// Input state for keyboard/touch controls (paddleY is handled by socket hook)
interface InputState {
  up: boolean;
  down: boolean;
  mouseDragDelta?: number; // Mouse drag delta in pixels for 1:1 paddle control
}

interface TouchPosition {
  startY: number;
  currentY: number;
  isActive: boolean;
}

interface PongInputHook {
  inputState: InputState;
  sendInput: (input: InputState) => void;
  setSendInput: (fn: (input: InputState) => void) => void;
  isInputActive: boolean;
}

export function usePongInput(): PongInputHook {
  const [inputState, setInputState] = useState<InputState>({ up: false, down: false });
  const [isInputActive, setIsInputActive] = useState(false);

  const sendInputRef = useRef<((input: InputState) => void) | null>(null);
  const inputBufferRef = useRef<InputState>({ up: false, down: false });
  const touchPositionRef = useRef<TouchPosition>({ startY: 0, currentY: 0, isActive: false });
  const lastSentStateRef = useRef<InputState>({ up: false, down: false });

  const setSendInput = useCallback((fn: (input: InputState) => void) => {
    sendInputRef.current = fn;
  }, []);

  // Optimized input update - only send when state changes
  const updateInput = useCallback((newState: Partial<InputState>) => {
    const prevState = inputBufferRef.current;
    const updatedState = { ...prevState, ...newState };
    inputBufferRef.current = updatedState;
    setInputState(updatedState);

    // Only send if state actually changed (including mouseDragDelta)
    const stateChanged =
      lastSentStateRef.current.up !== updatedState.up ||
      lastSentStateRef.current.down !== updatedState.down ||
      lastSentStateRef.current.mouseDragDelta !== updatedState.mouseDragDelta;

    if (sendInputRef.current && stateChanged) {
      sendInputRef.current(updatedState);
      lastSentStateRef.current = { ...updatedState };
    }

    const hasInput =
      updatedState.up || updatedState.down || updatedState.mouseDragDelta !== undefined;
    setIsInputActive(hasInput);
  }, []);

  // ✅ Store updateInput in ref for stable event listeners
  const updateInputRef = useRef(updateInput);
  useEffect(() => {
    updateInputRef.current = updateInput;
  }, [updateInput]);

  // ✅ Continuous input sending for held keys (throttled for performance)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = inputBufferRef.current;
      if ((currentState.up || currentState.down) && sendInputRef.current) {
        sendInputRef.current(currentState);
      }
    }, 10); // ✅ Send input at ~100fps (1000/10 = 100fps) - Good balance of responsiveness and performance

    return () => clearInterval(interval);
  }, []);

  // ✅ Stable keyboard event handlers (use ref to avoid recreating)
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Prevent default for game keys to avoid page scrolling
    if (['ArrowUp', 'ArrowDown', 'w', 'W', 's', 'S'].includes(event.key)) {
      event.preventDefault();
    }

    // Ignore repeated keydown events when key is held
    if (event.repeat) return;

    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        updateInputRef.current({ up: true });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        updateInputRef.current({ down: true });
        break;
    }
  }, []); // ✅ No dependencies - stable callback

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        updateInputRef.current({ up: false });
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        updateInputRef.current({ down: false });
        break;
    }
  }, []); // ✅ No dependencies - stable callback

  // ✅ Stable touch event handlers for mobile
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();

    const touch = event.touches[0];
    if (!touch) return;

    touchPositionRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      isActive: true,
    };
  }, []); // ✅ No dependencies - stable callback

  const handleTouchMove = useCallback((event: TouchEvent) => {
    event.preventDefault();

    if (!touchPositionRef.current.isActive) return;

    const touch = event.touches[0];
    if (!touch) return;

    // Use velocity-based delta (from last position, not start position)
    const deltaY = touch.clientY - touchPositionRef.current.currentY;
    const threshold = 5; // Reduced threshold for better sensitivity

    if (Math.abs(deltaY) > threshold) {
      const up = deltaY < -threshold;
      const down = deltaY > threshold;

      updateInputRef.current({ up, down });
    } else {
      updateInputRef.current({ up: false, down: false });
    }

    // Update current position for next delta calculation
    touchPositionRef.current.currentY = touch.clientY;
  }, []); // ✅ No dependencies - stable callback

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    event.preventDefault();

    touchPositionRef.current.isActive = false;
    updateInputRef.current({ up: false, down: false });
  }, []); // ✅ No dependencies - stable callback

  // ✅ 1:1 mouse drag handler for direct paddle control
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!touchPositionRef.current.isActive) return;

    // Calculate drag delta from initial mouse down position
    // This gives us 1:1 movement - paddle moves exactly as mouse moves
    const dragDelta = event.clientY - touchPositionRef.current.startY;

    // Send only the drag delta, don't touch keyboard state
    updateInputRef.current({ mouseDragDelta: dragDelta });

    // Update current position for reference
    touchPositionRef.current.currentY = event.clientY;
  }, []); // ✅ No dependencies - stable callback

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      // Left mouse button - start drag
      touchPositionRef.current = {
        startY: event.clientY,
        currentY: event.clientY,
        isActive: true,
      };
    }
  }, []); // ✅ No dependencies - stable callback

  const handleMouseUp = useCallback(() => {
    touchPositionRef.current.isActive = false;
    // Clear mouse drag delta when releasing mouse
    updateInputRef.current({ mouseDragDelta: undefined });
  }, []); // ✅ No dependencies - stable callback

  // ✅ Auto-bind keyboard and mouse events (runs once, stable callbacks)
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []); // ✅ Empty deps - callbacks never change, runs once

  // ✅ Bind touch events to document for mobile (runs once, stable callbacks)
  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, []); // ✅ Empty deps - callbacks never change, runs once

  // Direct sendInput function for manual calls
  const sendInput = useCallback((input: InputState) => {
    if (sendInputRef.current) {
      sendInputRef.current(input);
    }
  }, []);

  return {
    inputState,
    sendInput,
    setSendInput,
    isInputActive,
  };
}
