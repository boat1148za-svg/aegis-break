import aceBonusesJson from '../data/aceBonuses.json';
import type { AceBonusDefinition, AceBonusEffect } from './types';

export const aceBonusDefs = aceBonusesJson as AceBonusDefinition[];

export function getAceBonusDef(pilotId: string): AceBonusDefinition | undefined {
  return aceBonusDefs.find((a) => a.pilotId === pilotId);
}

export interface ActiveAceStatus {
  tier: 0 | 1 | 2;
  tierLabel: string | null;
  badgeText: string | null;
  nextTierKills: number | null;
  effects: Required<AceBonusEffect>;
}

export function getActiveAceStatus(
  pilotId: string,
  kills: number
): ActiveAceStatus {
  const def = getAceBonusDef(pilotId);
  const emptyEffects: Required<AceBonusEffect> = {
    startWillBonus: 0,
    finisherDamagePercent: 0,
    evadeBonus: 0,
    critRateBonus: 0,
    accuracyBonus: 0,
    armorPierceBonus: 0,
  };

  if (!def) {
    return {
      tier: 0,
      tierLabel: null,
      badgeText: null,
      nextTierKills: null,
      effects: emptyEffects,
    };
  }

  let tier: 0 | 1 | 2 = 0;
  const activeLabels: string[] = [];
  const merged: Required<AceBonusEffect> = { ...emptyEffects };

  const mergeEffects = (src: AceBonusEffect) => {
    if (src.startWillBonus) merged.startWillBonus += src.startWillBonus;
    if (src.finisherDamagePercent) {
      merged.finisherDamagePercent += src.finisherDamagePercent;
    }
    if (src.evadeBonus) merged.evadeBonus += src.evadeBonus;
    if (src.critRateBonus) merged.critRateBonus += src.critRateBonus;
    if (src.accuracyBonus) merged.accuracyBonus += src.accuracyBonus;
    if (src.armorPierceBonus) merged.armorPierceBonus += src.armorPierceBonus;
  };

  if (kills >= def.tier1.killsRequired) {
    tier = 1;
    activeLabels.push(def.tier1.label);
    mergeEffects(def.tier1.effects);
  }

  if (def.tier2 && kills >= def.tier2.killsRequired) {
    tier = 2;
    activeLabels.push(def.tier2.label);
    mergeEffects(def.tier2.effects);
  }

  const nextTierKills =
    tier === 0
      ? def.tier1.killsRequired
      : tier === 1 && def.tier2
        ? def.tier2.killsRequired
        : null;

  const badgeText =
    tier === 2
      ? def.isWingman
        ? '★★ WINGMAN ACE+'
        : '★★ SUPER ACE'
      : tier === 1
        ? def.isWingman
          ? '★ WINGMAN ACE'
          : '★ ACE'
        : null;

  return {
    tier,
    tierLabel: activeLabels.length > 0 ? activeLabels.join(' · ') : null,
    badgeText,
    nextTierKills,
    effects: merged,
  };
}
