import dailyModifiersJson from '../data/dailyModifiers.json';
import { mulberry32 } from './prng';
import type { DailyModifierData } from './types';

export const dailyModifiersList = dailyModifiersJson as DailyModifierData[];

export function getDailyModifierById(id: string): DailyModifierData | undefined {
  return dailyModifiersList.find((m) => m.id === id);
}

export function getDailyModifiersByIds(ids: string[] = []): DailyModifierData[] {
  return ids
    .map((id) => getDailyModifierById(id))
    .filter((m): m is DailyModifierData => Boolean(m));
}

/**
 * Deterministically picks `count` non-conflicting daily challenge modifiers
 * from dailyModifiers.json using the provided daily seed.
 */
export function rollDailyModifiers(
  seed: number,
  count: number = 2
): DailyModifierData[] {
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const pool = [...dailyModifiersList];

  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i];
    pool[i] = pool[j];
    pool[j] = tmp;
  }

  const chosen: DailyModifierData[] = [];
  const usedGroups = new Set<string>();

  for (const mod of pool) {
    if (usedGroups.has(mod.conflictGroup)) continue;
    chosen.push(mod);
    usedGroups.add(mod.conflictGroup);
    if (chosen.length >= count) break;
  }

  return chosen;
}

export interface CombinedModifierEffects {
  moveBonus: number;
  allDamageMultiplier: number;
  extraEnRegen: number;
  disableBaseRepair: boolean;
  creditsMultiplier: number;
  enemyHpBonusPercent: number;
  enemyArmorBonus: number;
  startWillBonus: number;
}

export function getCombinedModifierEffects(
  modifierIds: string[] = []
): CombinedModifierEffects {
  const result: CombinedModifierEffects = {
    moveBonus: 0,
    allDamageMultiplier: 1,
    extraEnRegen: 0,
    disableBaseRepair: false,
    creditsMultiplier: 1,
    enemyHpBonusPercent: 0,
    enemyArmorBonus: 0,
    startWillBonus: 0,
  };

  for (const mod of getDailyModifiersByIds(modifierIds)) {
    const fx = mod.effects;
    if (typeof fx.moveBonus === 'number') {
      result.moveBonus += fx.moveBonus;
    }
    if (typeof fx.allDamageMultiplier === 'number') {
      result.allDamageMultiplier *= fx.allDamageMultiplier;
    }
    if (typeof fx.extraEnRegen === 'number') {
      result.extraEnRegen += fx.extraEnRegen;
    }
    if (fx.disableBaseRepair) {
      result.disableBaseRepair = true;
    }
    if (typeof fx.creditsMultiplier === 'number') {
      result.creditsMultiplier *= fx.creditsMultiplier;
    }
    if (typeof fx.enemyHpBonusPercent === 'number') {
      result.enemyHpBonusPercent += fx.enemyHpBonusPercent;
    }
    if (typeof fx.enemyArmorBonus === 'number') {
      result.enemyArmorBonus += fx.enemyArmorBonus;
    }
    if (typeof fx.startWillBonus === 'number') {
      result.startWillBonus += fx.startWillBonus;
    }
  }

  return result;
}
