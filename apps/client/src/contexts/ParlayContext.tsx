// apps/client/src/contexts/ParlayContext.tsx
import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import type { ReactNode } from 'react';

/* ---------- Types ---------- */
export interface Leg {
  optionId: number;
  predictionId: number;
}
interface State {
  legs: Leg[];
  amount: number;
}

type Action =
  | { type: 'ADD_LEG'; leg: Leg }
  | { type: 'REMOVE_LEG'; optionId: number }
  | { type: 'SET_AMOUNT'; amount: number }
  | { type: 'SET_PARLAY'; state: State } // replace wholesale (sync)
  | { type: 'CLEAR' };

/* ---------- Reducer ---------- */
const initial: State = { legs: [], amount: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_LEG': {
      // Replace leg for same prediction if it already exists
      const filtered = state.legs.filter((l) => l.predictionId !== action.leg.predictionId);
      return { ...state, legs: [...filtered, action.leg] };
    }
    case 'REMOVE_LEG':
      return { ...state, legs: state.legs.filter((l) => l.optionId !== action.optionId) };
    case 'SET_AMOUNT':
      return { ...state, amount: action.amount };
    case 'SET_PARLAY':
      return action.state;
    case 'CLEAR':
      return initial;
    default:
      return state;
  }
}

/* ---------- Context ---------- */
interface Ctx {
  state: State;
  dispatch: React.Dispatch<Action>;
  addLeg: (leg: Leg) => void;
  removeLeg: (optionId: number) => void;
  setAmount: (amt: number) => void;
  clear: () => void;
}

const ParlayCtx = createContext<Ctx>({
  state: initial,
  dispatch: () => {},
  addLeg: () => {},
  removeLeg: () => {},
  setAmount: () => {},
  clear: () => {},
});

/* ---------- Provider ---------- */
export function ParlayProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial, () => {
    // hydrate from localStorage if present
    const raw = localStorage.getItem('parlay-builder');
    return raw ? (JSON.parse(raw) as State) : initial;
  });

  /* Persist to localStorage */
  useEffect(() => {
    localStorage.setItem('parlay-builder', JSON.stringify(state));
  }, [state]);

  /* ---------- Socket auto-clear on confirmed ---------- */
  const socket = useSocket(); // assumes your hook gives connected socket.io client

  useEffect(() => {
    if (!socket) return;
    function handleConfirmed() {
      dispatch({ type: 'CLEAR' });
    }
    socket.on('parlay:confirmed', handleConfirmed);
    return () => {
      socket.off('parlay:confirmed', handleConfirmed);
    };
  }, [socket]);

  /* ---------- Convenience callbacks ---------- */
  const addLeg = useCallback((leg: Leg) => dispatch({ type: 'ADD_LEG', leg }), []);
  const removeLeg = useCallback(
    (optionId: number) => dispatch({ type: 'REMOVE_LEG', optionId }),
    [],
  );
  const setAmount = useCallback((amt: number) => dispatch({ type: 'SET_AMOUNT', amount: amt }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);

  return (
    <ParlayCtx.Provider value={{ state, dispatch, addLeg, removeLeg, setAmount, clear }}>
      {children}
    </ParlayCtx.Provider>
  );
}

/* ---------- Hook ---------- */
export function useParlay() {
  return useContext(ParlayCtx);
}
