import combatConfigJson from '../data/combatConfig.json';
import upgradesJson from '../data/upgrades.json';
import weaponPoolJson from '../data/weapon_pool.json';
import type {
  DraftChoice,
  MechaData,
  RunPlayerState,
  UpgradeCardData,
  WeaponData,
} from './types';

export const upgradeCards = upgradesJson as UpgradeCardData[];
export const weaponPool = weaponPoolJson as WeaponData[];

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
 * Filters weapon_pool.json for weapons compatible with the player's mecha
 * (allowed_mechas contains "ALL" or the mecha's id) that are not already equipped.
 */
export function getEligibleWeaponsForMecha(
  mechaId: string,
  equippedWeapons: WeaponData[]
): WeaponData[] {
  const equippedIds = new Set(equippedWeapons.map((w) => w.id));
  return weaponPool.filter((w) => {
    if (equippedIds.has(w.id)) return false;
    const allowed = w.allowed_mechas ?? ['ALL'];
    return allowed.includes('ALL') || allowed.includes(mechaId);
  });
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

export function equipWeaponOnRunPlayer(
  runPlayer: RunPlayerState,
  newWeapon: WeaponData,
  replaceWeaponId?: string
): RunPlayerState {
  const maxSlots = combatConfigJson.weapons.maxSlots;
  const current = [...runPlayer.equippedWeapons];

  if (replaceWeaponId) {
    const idx = current.findIndex((w) => w.id === replaceWeaponId);
    if (idx >= 0) {
      current[idx] = newWeapon;
      return { ...runPlayer, equippedWeapons: current };
    }
  }

  if (current.length < maxSlots) {
    return { ...runPlayer, equippedWeapons: [...current, newWeapon] };
  }

  return runPlayer;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Rolls 3 distinct Post-Battle Draft choices mixing Upgrades and New Weapons
 * (filtered by the player's mecha compatibility). Guarantees at least 1 Weapon
 * card whenever eligible weapons remain in the pool.
 */
export function rollPostBattleDraftChoices(
  runPlayer: RunPlayerState,
  mechaId: string,
  count: number = 3
): DraftChoice[] {
  const upgradePool: DraftChoice[] = shuffle(
    upgradeCards.filter(
      (card) => !(card.unique && runPlayer.installedUpgradeIds.includes(card.id))
    )
  ).map((card) => ({ kind: 'upgrade', card }));

  const eligibleWeapons: DraftChoice[] = shuffle(
    getEligibleWeaponsForMecha(mechaId, runPlayer.equippedWeapons)
  ).map((weapon) => ({ kind: 'weapon', weapon }));

  const result: DraftChoice[] = [];

  // Include 1 guaranteed compatible weapon if available
  if (eligibleWeapons.length > 0) {
    result.push(eligibleWeapons.shift()!);
  }

  // Mix remaining upgrades and weapons for the remaining slots
  const combinedRest = shuffle([...upgradePool, ...eligibleWeapons]);
  while (result.length < count && combinedRest.length > 0) {
    result.push(combinedRest.shift()!);
  }

  return shuffle(result);
}
