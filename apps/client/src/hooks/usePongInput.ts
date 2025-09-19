import { useState, useEffect, useCallback, useRef } from 'react';

// Input state for keyboard/touch controls (paddleY is handled by socket hook)
interface InputState {
  up: boolean;
  down: boolean;
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

    // Only send if state actually changed
    const stateChanged =
      lastSentStateRef.current.up !== updatedState.up ||
      lastSentStateRef.current.down !== updatedState.down;

    if (sendInputRef.current && stateChanged) {
      sendInputRef.current(updatedState);
      lastSentStateRef.current = { ...updatedState };
    }

    const hasInput = updatedState.up || updatedState.down;
    setIsInputActive(hasInput);
  }, []);

  // Continuous input sending for held keys
  useEffect(() => {
    const interval = setInterval(() => {
      const currentState = inputBufferRef.current;
      if ((currentState.up || currentState.down) && sendInputRef.current) {
        sendInputRef.current(currentState);
      }
    }, 8); // Send input at ~120fps when keys are held (1000/8 = 125fps)

    return () => clearInterval(interval);
  }, []);

  // Keyboard event handlers
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
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
          updateInput({ up: true });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          updateInput({ down: true });
          break;
      }
    },
    [updateInput],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          updateInput({ up: false });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          updateInput({ down: false });
          break;
      }
    },
    [updateInput],
  );

  // Touch event handlers for mobile
  const handleTouchStart = useCallback((event: TouchEvent) => {
    event.preventDefault();

    const touch = event.touches[0];
    if (!touch) return;

    touchPositionRef.current = {
      startY: touch.clientY,
      currentY: touch.clientY,
      isActive: true,
    };
  }, []);

  const handleTouchMove = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      if (!touchPositionRef.current.isActive) return;

      const touch = event.touches[0];
      if (!touch) return;

      touchPositionRef.current.currentY = touch.clientY;

      const deltaY = touchPositionRef.current.currentY - touchPositionRef.current.startY;
      const threshold = 10; // Minimum movement threshold

      if (Math.abs(deltaY) > threshold) {
        const up = deltaY < -threshold;
        const down = deltaY > threshold;

        updateInput({ up, down });
      } else {
        updateInput({ up: false, down: false });
      }
    },
    [updateInput],
  );

  const handleTouchEnd = useCallback(
    (event: TouchEvent) => {
      event.preventDefault();

      touchPositionRef.current.isActive = false;
      updateInput({ up: false, down: false });
    },
    [updateInput],
  );

  // Mouse movement handler for precise control
  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!touchPositionRef.current.isActive) return;

      const deltaY = event.clientY - touchPositionRef.current.startY;
      const threshold = 5; // Smaller threshold for mouse precision

      if (Math.abs(deltaY) > threshold) {
        const up = deltaY < -threshold;
        const down = deltaY > threshold;
        updateInput({ up, down });
      } else {
        updateInput({ up: false, down: false });
      }
    },
    [updateInput],
  );

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button === 0) {
      // Left mouse button
      touchPositionRef.current = {
        startY: event.clientY,
        currentY: event.clientY,
        isActive: true,
      };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    touchPositionRef.current.isActive = false;
    updateInput({ up: false, down: false });
  }, [updateInput]);

  // Auto-bind keyboard and mouse events
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
  }, [handleKeyDown, handleKeyUp, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Bind touch events to document for mobile
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
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

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
