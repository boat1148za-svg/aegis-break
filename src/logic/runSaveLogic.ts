import type { RunPlayerState } from './types';

export interface SavedRunState {
  runPlayer: RunPlayerState;
  runThreatLevel: number;
  currentNodeIndex: number;
  clearedNodeIds: string[];
  savedAt: number;
}

const ACTIVE_RUN_STORAGE_KEY = 'aegis_break_active_run_v1';

export function loadSavedRun(): SavedRunState | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRunState>;
    if (!parsed.runPlayer || typeof parsed.currentNodeIndex !== 'number') {
      return null;
    }
    return {
      runPlayer: parsed.runPlayer,
      runThreatLevel:
        typeof parsed.runThreatLevel === 'number' ? parsed.runThreatLevel : 0,
      currentNodeIndex: parsed.currentNodeIndex,
      clearedNodeIds: Array.isArray(parsed.clearedNodeIds)
        ? parsed.clearedNodeIds
        : [],
      savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveActiveRun(state: Omit<SavedRunState, 'savedAt'>): void {
  try {
    const payload: SavedRunState = { ...state, savedAt: Date.now() };
    window.localStorage.setItem(
      ACTIVE_RUN_STORAGE_KEY,
      JSON.stringify(payload)
    );
  } catch {
    // Ignore storage errors
  }
}

export function clearSavedRun(): void {
  try {
    window.localStorage.removeItem(ACTIVE_RUN_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}
