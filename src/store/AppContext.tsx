import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Member, Snapshot, ClaudeAnalysis, SimulationConfig } from '../types';
import { loadState, saveState } from '../utils/storage';

// ─── Action 타입 정의 ──────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD_MEMBER'; payload: Member }
  | { type: 'UPDATE_MEMBER'; payload: Member }
  | { type: 'DELETE_MEMBER'; payload: string }
  | { type: 'ADD_SNAPSHOT'; payload: Snapshot }
  | { type: 'DELETE_SNAPSHOT'; payload: string }
  | { type: 'SET_TARGET_RATIOS'; payload: AppState['targetRatios'] }
  | { type: 'ADD_CLAUDE_ANALYSIS'; payload: ClaudeAnalysis }
  | { type: 'DELETE_CLAUDE_ANALYSIS'; payload: string }
  | { type: 'SET_SIMULATION'; payload: SimulationConfig }
  | { type: 'IMPORT_STATE'; payload: AppState };

// ─── 초기 상태 ────────────────────────────────────────────────────────────────

const defaultState: AppState = {
  members: [],
  snapshots: [],
  targetRatios: { cash: 30, stock: 50, pension: 20 },
  claudeAnalyses: [],
  simulation: { targetReturnRate: 7, years: 10, monthlyAdd: 0 },
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

/** 모든 상태 변이를 처리하는 순수 함수 */
function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'ADD_MEMBER':
      return { ...state, members: [...state.members, action.payload] };

    case 'UPDATE_MEMBER':
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.payload.id ? action.payload : m,
        ),
      };

    case 'DELETE_MEMBER':
      return {
        ...state,
        members: state.members.filter((m) => m.id !== action.payload),
        snapshots: state.snapshots.filter((s) => s.memberId !== action.payload),
      };

    case 'ADD_SNAPSHOT':
      return { ...state, snapshots: [...state.snapshots, action.payload] };

    case 'DELETE_SNAPSHOT':
      return {
        ...state,
        snapshots: state.snapshots.filter((s) => s.id !== action.payload),
      };

    case 'SET_TARGET_RATIOS':
      return { ...state, targetRatios: action.payload };

    case 'ADD_CLAUDE_ANALYSIS':
      return {
        ...state,
        claudeAnalyses: [action.payload, ...state.claudeAnalyses],
      };

    case 'DELETE_CLAUDE_ANALYSIS':
      return {
        ...state,
        claudeAnalyses: state.claudeAnalyses.filter((a) => a.id !== action.payload),
      };

    case 'SET_SIMULATION':
      return { ...state, simulation: action.payload };

    case 'IMPORT_STATE':
      return action.payload;

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

/** localStorage에서 초기 상태를 복원하고 변경 시 자동 저장하는 Provider */
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState, (init) => {
    const saved = loadState();
    return saved ?? init;
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

/** AppContext를 안전하게 사용하는 커스텀 훅 */
export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
