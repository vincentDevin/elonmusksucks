// apps/client/src/contexts/ParlayContext.tsx
// -----------------------------------------------------------------------------
// Holds local state for the parlay bet builder (legs + amount).
// Clears itself when a parlay is successfully placed by the current user,
// using the live `parlayPlaced` broadcast.
// -----------------------------------------------------------------------------

import { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

/* ---------- Types ---------- */
export interface Leg {
  optionId: number;
  predictionId: number;
  label: string;
}
interface State {
  legs: Leg[];
  amount: number;
}

type Action =
  | { type: 'ADD_LEG'; leg: Leg }
  | { type: 'REMOVE_LEG'; optionId: number }
  | { type: 'SET_AMOUNT'; amount: number }
  | { type: 'SET_PARLAY'; state: State }
  | { type: 'CLEAR' };

/* ---------- Reducer ---------- */
const initial: State = { legs: [], amount: 0 };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_LEG': {
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
    const raw = localStorage.getItem('parlay-builder');
    return raw ? (JSON.parse(raw) as State) : initial;
  });

  /* Persist to localStorage */
  useEffect(() => {
    localStorage.setItem('parlay-builder', JSON.stringify(state));
  }, [state]);

  /* ---------- Clear builder when *our* parlay is placed ---------- */
  const socket = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    if (!socket || !user) return;
    const handlePlaced = (parlay: { userId: number }) => {
      if (parlay.userId === user.id) dispatch({ type: 'CLEAR' });
    };
    socket.on('parlayPlaced', handlePlaced);
    return () => {
      socket.off('parlayPlaced', handlePlaced);
    };
  }, [socket, user?.id]);

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

export function useParlay() {
  return useContext(ParlayCtx);
}
