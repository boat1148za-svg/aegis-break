import metaUpgradesJson from '../data/metaUpgrades.json';
import threatLevelsJson from '../data/threatLevels.json';
import type {
  MetaBonuses,
  MetaProgressState,
  MetaUpgradeData,
  ThreatLevelData,
} from './types';

export const metaConfig = metaUpgradesJson;
export const metaUpgrades = metaUpgradesJson.upgrades as MetaUpgradeData[];
export const threatLevels = threatLevelsJson as ThreatLevelData[];

export function getThreatLevelConfig(level: number): ThreatLevelData {
  return (
    threatLevels.find((t) => t.level === level) ?? threatLevels[0]
  );
}

export function createDefaultMetaProgress(): MetaProgressState {
  return {
    astralShards: 0,
    upgradeLevels: {},
    totalRuns: 0,
    victories: 0,
    maxUnlockedThreatLevel: 0,
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
      maxUnlockedThreatLevel:
        typeof parsed.maxUnlockedThreatLevel === 'number'
          ? Math.max(
              0,
              Math.min(threatLevels.length - 1, parsed.maxUnlockedThreatLevel)
            )
          : 0,
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
  let wingmanHealBonus = 0;
  let wingmanArmorBonus = 0;

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
    if (upgrade.effectPerLevel.wingmanHealBonus) {
      wingmanHealBonus += upgrade.effectPerLevel.wingmanHealBonus * level;
    }
    if (upgrade.effectPerLevel.wingmanArmorBonus) {
      wingmanArmorBonus += upgrade.effectPerLevel.wingmanArmorBonus * level;
    }
  }

  return {
    hpBonus,
    spBonus,
    armorBonus,
    unlockSupportMech,
    wingmanHealBonus,
    wingmanArmorBonus,
  };
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
  isVictory: boolean,
  threatLevel: number = 0
): {
  shardsFromNodes: number;
  bonusShards: number;
  shardMultiplier: number;
  totalShardsEarned: number;
} {
  const threatCfg = getThreatLevelConfig(threatLevel);
  const shardsFromNodes =
    nodesCleared * metaConfig.rewards.shardsPerClearedNode;
  const bonusShards = isVictory
    ? metaConfig.rewards.bossClearBonus
    : metaConfig.rewards.defeatConsolationShards;

  const totalShardsEarned = Math.round(
    (shardsFromNodes + bonusShards) * threatCfg.shardMultiplier
  );

  return {
    shardsFromNodes,
    bonusShards,
    shardMultiplier: threatCfg.shardMultiplier,
    totalShardsEarned,
  };
}
