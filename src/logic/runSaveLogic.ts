import type { BranchingStageMap, RunPlayerState } from './types';

export interface SavedRunState {
  runPlayer: RunPlayerState;
  runThreatLevel: number;
  currentStage: 1 | 2 | 3;
  stageMap: BranchingStageMap;
  currentNodeId: string | null;
  clearedNodeIds: string[];
  totalFloorsCleared: number;
  runSeed: number;
  savedAt: number;
}

const ACTIVE_RUN_STORAGE_KEY = 'aegis_break_active_run_v2';

export function loadSavedRun(): SavedRunState | null {
  try {
    const raw = window.localStorage.getItem(ACTIVE_RUN_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedRunState>;
    if (
      !parsed.runPlayer ||
      !parsed.stageMap ||
      !Array.isArray(parsed.stageMap.floors) ||
      (parsed.currentStage !== 1 &&
        parsed.currentStage !== 2 &&
        parsed.currentStage !== 3)
    ) {
      return null;
    }
    return {
      runPlayer: parsed.runPlayer,
      runThreatLevel:
        typeof parsed.runThreatLevel === 'number' ? parsed.runThreatLevel : 0,
      currentStage: parsed.currentStage,
      stageMap: parsed.stageMap,
      currentNodeId:
        typeof parsed.currentNodeId === 'string' ? parsed.currentNodeId : null,
      clearedNodeIds: Array.isArray(parsed.clearedNodeIds)
        ? parsed.clearedNodeIds
        : [],
      totalFloorsCleared:
        typeof parsed.totalFloorsCleared === 'number'
          ? parsed.totalFloorsCleared
          : 0,
      runSeed: typeof parsed.runSeed === 'number' ? parsed.runSeed : 100001,
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
