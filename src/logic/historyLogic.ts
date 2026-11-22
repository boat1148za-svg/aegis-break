import achievementsJson from '../data/achievements.json';
import { saveMetaProgress } from './metaLogic';
import type {
  AchievementData,
  MetaProgressState,
  RunHistoryEntry,
} from './types';

export const achievementsList = achievementsJson as AchievementData[];

const HISTORY_STORAGE_KEY = 'aegis_break_history_v1';
const ACHIEVEMENTS_STORAGE_KEY = 'aegis_break_achievements_v1';
const MAX_HISTORY_ENTRIES = 20;

export function loadRunHistory(): RunHistoryEntry[] {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RunHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveRunHistory(entries: RunHistoryEntry[]): void {
  try {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(entries.slice(0, MAX_HISTORY_ENTRIES))
    );
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}

export function recordRunHistory(
  entry: Omit<RunHistoryEntry, 'id' | 'timestamp'>
): RunHistoryEntry[] {
  const existing = loadRunHistory();
  const nextEntry: RunHistoryEntry = {
    ...entry,
    id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
  };
  const updated = [nextEntry, ...existing].slice(0, MAX_HISTORY_ENTRIES);
  saveRunHistory(updated);
  return updated;
}

export function loadClaimedAchievements(): string[] {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : [];
  } catch {
    return [];
  }
}

export function saveClaimedAchievements(ids: string[]): void {
  try {
    window.localStorage.setItem(
      ACHIEVEMENTS_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(ids)))
    );
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function isAchievementUnlocked(
  achievementId: string,
  history: RunHistoryEntry[],
  meta: MetaProgressState
): boolean {
  switch (achievementId) {
    case 'ach_first_sortie':
      return history.length >= 1 || meta.totalRuns >= 1;
    case 'ach_first_victory':
      return (
        meta.victories >= 1 || history.some((r) => r.outcome === 'victory')
      );
    case 'ach_ace_pilot':
      return history.some((r) => r.kills >= 10);
    case 'ach_heavy_hitter':
      return history.some((r) => r.maxDamage >= 5000);
    case 'ach_daily_challenger':
      return history.some(
        (r) => r.isDailyChallenge && r.outcome === 'victory'
      );
    case 'ach_seraph_commander':
      return history.some(
        (r) =>
          r.unitDefId === 'player_seraph_zero' && r.outcome === 'victory'
      );
    case 'ach_endless_breaker':
      return history.some((r) => r.endlessLoop >= 2);
    case 'ach_threat_3_clear':
      return history.some(
        (r) => r.threatLevel >= 3 && r.outcome === 'victory'
      );
    case 'ach_veteran_pilot':
      return meta.victories >= 3;
    case 'ach_shard_hunter':
      return history.some((r) => r.shardsEarned >= 150);
    default:
      return false;
  }
}

export function claimAchievementReward(
  achievementId: string,
  history: RunHistoryEntry[],
  meta: MetaProgressState
): {
  claimedIds: string[];
  updatedMeta: MetaProgressState;
  claimed: boolean;
} {
  const claimedIds = loadClaimedAchievements();
  if (claimedIds.includes(achievementId)) {
    return { claimedIds, updatedMeta: meta, claimed: false };
  }

  const def = achievementsList.find((a) => a.id === achievementId);
  if (!def || !isAchievementUnlocked(achievementId, history, meta)) {
    return { claimedIds, updatedMeta: meta, claimed: false };
  }

  const nextClaimed = [...claimedIds, achievementId];
  saveClaimedAchievements(nextClaimed);

  const updatedMeta: MetaProgressState = {
    ...meta,
    astralShards: meta.astralShards + def.rewardShards,
  };
  saveMetaProgress(updatedMeta);

  return {
    claimedIds: nextClaimed,
    updatedMeta,
    claimed: true,
  };
}
