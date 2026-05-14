import { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { AppState, Member, Snapshot, ClaudeAnalysis, SimulationConfig, ClassificationOverride } from '../types';
import { loadState, saveState } from '../utils/storage';

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
  | { type: 'SET_CLASSIFICATION_OVERRIDE'; payload: { key: string; override: ClassificationOverride } }
  | { type: 'REMOVE_CLASSIFICATION_OVERRIDE'; payload: string }
  | { type: 'IMPORT_STATE'; payload: AppState };

const defaultState: AppState = {
  members: [],
  snapshots: [],
  targetRatios: { cash: 30, stock: 50, pension: 20 },
  claudeAnalyses: [],
  simulation: { targetReturnRate: 7, years: 10, monthlyAdd: 0 },
  classificationOverrides: {},
};

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

    case 'SET_CLASSIFICATION_OVERRIDE':
      return {
        ...state,
        classificationOverrides: {
          ...state.classificationOverrides,
          [action.payload.key]: action.payload.override,
        },
      };

    case 'REMOVE_CLASSIFICATION_OVERRIDE': {
      const { [action.payload]: _removed, ...rest } = state.classificationOverrides;
      return { ...state, classificationOverrides: rest };
    }

    case 'IMPORT_STATE':
      return { ...defaultState, ...action.payload, classificationOverrides: action.payload.classificationOverrides ?? {} };

    default:
      return state;
  }
}

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, defaultState, (init) => {
    const saved = loadState();
    if (!saved) return init;
    // 기존 저장 데이터에 classificationOverrides 없을 경우 기본값 보장
    return { ...init, ...saved, classificationOverrides: saved.classificationOverrides ?? {} };
  });

  useEffect(() => {
    saveState(state);
  }, [state]);

  return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
}
