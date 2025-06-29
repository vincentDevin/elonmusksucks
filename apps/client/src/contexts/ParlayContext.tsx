// apps/client/src/contexts/ParlayContext.tsx
import React, { createContext, useContext, useReducer } from 'react';

interface Leg {
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
  | { type: 'CLEAR' };

const initial: State = { legs: [], amount: 0 };
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD_LEG':
      return { ...state, legs: [...state.legs, action.leg] };
    case 'REMOVE_LEG':
      return {
        ...state,
        legs: state.legs.filter((l) => l.optionId !== action.optionId),
      };
    case 'SET_AMOUNT':
      return { ...state, amount: action.amount };
    case 'CLEAR':
      return initial;
  }
}

const ParlayCtx = createContext<{
  state: State;
  dispatch: React.Dispatch<Action>;
}>({ state: initial, dispatch: () => {} });

export function ParlayProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  return <ParlayCtx.Provider value={{ state, dispatch }}>{children}</ParlayCtx.Provider>;
}

export function useParlay() {
  return useContext(ParlayCtx);
}
