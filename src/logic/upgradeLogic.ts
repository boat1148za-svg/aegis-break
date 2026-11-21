import upgradesJson from '../data/upgrades.json';
import type {
  MechaData,
  RunPlayerState,
  UpgradeCardData,
  WeaponData,
} from './types';

export const upgradeCards = upgradesJson as UpgradeCardData[];

export function getUpgradeById(id: string): UpgradeCardData | undefined {
  return upgradeCards.find((u) => u.id === id);
}

export function getInstalledUpgrades(
  installedUpgradeIds: string[]
): UpgradeCardData[] {
  return installedUpgradeIds
    .map((id) => getUpgradeById(id))
    .filter((u): u is UpgradeCardData => Boolean(u));
}

export function hasUpgrade(
  installedUpgradeIds: string[],
  upgradeId: string
): boolean {
  return installedUpgradeIds.includes(upgradeId);
}

/**
 * Applies static Power Parts & Weapon Tech upgrades to a mecha definition
 * without mutating the original JSON data.
 */
export function applyUpgradesToMecha(
  baseMecha: MechaData,
  baseWeapons: WeaponData[],
  installedUpgradeIds: string[]
): { mecha: MechaData; weapons: WeaponData[] } {
  const installed = getInstalledUpgrades(installedUpgradeIds);

  let maxHpBonus = 0;
  let maxEnBonus = 0;
  let armorBonus = 0;
  let mobilityBonus = 0;
  let moveBonus = 0;
  let weaponPowerBonus = 0;
  let weaponAccuracyBonus = 0;
  let finisherEnDiscountPercent = 0;

  for (const card of installed) {
    const e = card.effects;
    if (e.maxHpBonus) maxHpBonus += e.maxHpBonus;
    if (e.maxEnBonus) maxEnBonus += e.maxEnBonus;
    if (e.armorBonus) armorBonus += e.armorBonus;
    if (e.mobilityBonus) mobilityBonus += e.mobilityBonus;
    if (e.moveBonus) moveBonus += e.moveBonus;
    if (e.weaponPowerBonus) weaponPowerBonus += e.weaponPowerBonus;
    if (e.weaponAccuracyBonus) weaponAccuracyBonus += e.weaponAccuracyBonus;
    if (e.finisherEnDiscountPercent) {
      finisherEnDiscountPercent += e.finisherEnDiscountPercent;
    }
  }

  const clampedDiscount = Math.min(75, finisherEnDiscountPercent);

  const upgradedWeapons: WeaponData[] = baseWeapons.map((w) => {
    const isFinisher = w.willRequired >= 120;
    const discountedEn = isFinisher
      ? Math.max(1, Math.round(w.enCost * (1 - clampedDiscount / 100)))
      : w.enCost;

    return {
      ...w,
      power: w.power + weaponPowerBonus,
      accuracy: w.accuracy + weaponAccuracyBonus,
      enCost: discountedEn,
    };
  });

  const upgradedMecha: MechaData = {
    ...baseMecha,
    maxHp: baseMecha.maxHp + maxHpBonus,
    maxEn: baseMecha.maxEn + maxEnBonus,
    armor: baseMecha.armor + armorBonus,
    mobility: baseMecha.mobility + mobilityBonus,
    move: baseMecha.move + moveBonus,
    weapons: upgradedWeapons,
  };

  return { mecha: upgradedMecha, weapons: upgradedWeapons };
}

/**
 * Installs a chosen upgrade card into the central RunPlayerState.
 * Immediately grants bonus HP/EN if the card increases Max HP or Max EN.
 */
export function installUpgradeOnRunPlayer(
  runPlayer: RunPlayerState,
  card: UpgradeCardData
): RunPlayerState {
  const nextIds = [...runPlayer.installedUpgradeIds, card.id];
  return {
    ...runPlayer,
    hp: runPlayer.hp + (card.effects.maxHpBonus ?? 0),
    en: runPlayer.en + (card.effects.maxEnBonus ?? 0),
    installedUpgradeIds: nextIds,
  };
}

/**
 * Rolls 3 distinct upgrade cards for the Post-Battle Draft.
 * Excludes unique Tactical Chips that are already installed.
 */
export function rollUpgradeDraftChoices(
  installedUpgradeIds: string[],
  count: number = 3
): UpgradeCardData[] {
  const pool = upgradeCards.filter(
    (card) => !(card.unique && installedUpgradeIds.includes(card.id))
  );

  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, Math.min(count, shuffled.length));
}
