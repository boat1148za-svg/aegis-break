import metaUpgradesJson from '../data/metaUpgrades.json';
import type {
  MetaBonuses,
  MetaProgressState,
  MetaUpgradeData,
} from './types';

export const metaConfig = metaUpgradesJson;
export const metaUpgrades = metaUpgradesJson.upgrades as MetaUpgradeData[];

export function createDefaultMetaProgress(): MetaProgressState {
  return {
    astralShards: 0,
    upgradeLevels: {},
    totalRuns: 0,
    victories: 0,
  };
}

export function loadMetaProgress(): MetaProgressState {
  try {
    const raw = window.localStorage.getItem(metaConfig.storageKey);
    if (!raw) return createDefaultMetaProgress();
    const parsed = JSON.parse(raw) as Partial<MetaProgressState>;
    return {
      astralShards:
        typeof parsed.astralShards === 'number' && parsed.astralShards >= 0
          ? parsed.astralShards
          : 0,
      upgradeLevels:
        parsed.upgradeLevels && typeof parsed.upgradeLevels === 'object'
          ? parsed.upgradeLevels
          : {},
      totalRuns: typeof parsed.totalRuns === 'number' ? parsed.totalRuns : 0,
      victories: typeof parsed.victories === 'number' ? parsed.victories : 0,
    };
  } catch {
    return createDefaultMetaProgress();
  }
}

export function saveMetaProgress(state: MetaProgressState): void {
  try {
    window.localStorage.setItem(metaConfig.storageKey, JSON.stringify(state));
  } catch {
    // Ignore storage quota or private mode errors gracefully
  }
}

export function getMetaUpgradeCost(
  upgrade: MetaUpgradeData,
  currentLevel: number
): number {
  return upgrade.baseCost + currentLevel * upgrade.costStep;
}

export function getMetaBonuses(meta: MetaProgressState): MetaBonuses {
  let hpBonus = 0;
  let spBonus = 0;
  let armorBonus = 0;
  let unlockSupportMech = false;

  for (const upgrade of metaUpgrades) {
    const level = meta.upgradeLevels[upgrade.id] ?? 0;
    if (level <= 0) continue;

    if (upgrade.effectPerLevel.hpBonus) {
      hpBonus += upgrade.effectPerLevel.hpBonus * level;
    }
    if (upgrade.effectPerLevel.spBonus) {
      spBonus += upgrade.effectPerLevel.spBonus * level;
    }
    if (upgrade.effectPerLevel.armorBonus) {
      armorBonus += upgrade.effectPerLevel.armorBonus * level;
    }
    if (upgrade.effectPerLevel.unlockSupportMech) {
      unlockSupportMech = true;
    }
  }

  return { hpBonus, spBonus, armorBonus, unlockSupportMech };
}

export function purchaseMetaUpgrade(
  meta: MetaProgressState,
  upgradeId: string
): MetaProgressState {
  const upgrade = metaUpgrades.find((u) => u.id === upgradeId);
  if (!upgrade) return meta;

  const currentLevel = meta.upgradeLevels[upgradeId] ?? 0;
  if (currentLevel >= upgrade.maxLevel) return meta;

  const cost = getMetaUpgradeCost(upgrade, currentLevel);
  if (meta.astralShards < cost) return meta;

  const updated: MetaProgressState = {
    ...meta,
    astralShards: meta.astralShards - cost,
    upgradeLevels: {
      ...meta.upgradeLevels,
      [upgradeId]: currentLevel + 1,
    },
  };

  saveMetaProgress(updated);
  return updated;
}

export function calculateRunShardsReward(
  nodesCleared: number,
  isVictory: boolean
): {
  shardsFromNodes: number;
  bonusShards: number;
  totalShardsEarned: number;
} {
  const shardsFromNodes =
    nodesCleared * metaConfig.rewards.shardsPerClearedNode;
  const bonusShards = isVictory
    ? metaConfig.rewards.bossClearBonus
    : metaConfig.rewards.defeatConsolationShards;

  return {
    shardsFromNodes,
    bonusShards,
    totalShardsEarned: shardsFromNodes + bonusShards,
  };
}
