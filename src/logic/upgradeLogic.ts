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
  const normalizedWeapon: WeaponData = {
    ...newWeapon,
    level: newWeapon.level ?? 1,
  };
  const current = [...runPlayer.equippedWeapons];

  if (replaceWeaponId) {
    const idx = current.findIndex((w) => w.id === replaceWeaponId);
    if (idx >= 0) {
      current[idx] = normalizedWeapon;
      return { ...runPlayer, equippedWeapons: current };
    }
  }

  if (current.length < maxSlots) {
    return {
      ...runPlayer,
      equippedWeapons: [...current, normalizedWeapon],
    };
  }

  return runPlayer;
}

export function getMaxWeaponLevel(runPlayer?: RunPlayerState): number {
  if (runPlayer && (runPlayer.endlessLoop ?? 1) > 1) {
    return combatConfigJson.endless.maxWeaponLevelEndless;
  }
  return combatConfigJson.weapons.maxLevel;
}

/**
 * Ranks up an equipped weapon by +1 level (up to maxWeaponLevel),
 * adding +250 Power and reducing EN cost by -2 (min 1).
 */
export function rankUpWeaponOnRunPlayer(
  runPlayer: RunPlayerState,
  weaponId: string
): RunPlayerState {
  const { rankUpPowerBonus, rankUpEnReduction, minEnCost } =
    combatConfigJson.weapons;
  const maxLevel = getMaxWeaponLevel(runPlayer);

  return {
    ...runPlayer,
    equippedWeapons: runPlayer.equippedWeapons.map((w) => {
      if (w.id !== weaponId) return w;
      const currentLevel = w.level ?? 1;
      if (currentLevel >= maxLevel) return w;

      const nextEn =
        w.enCost > 0
          ? Math.max(minEnCost, w.enCost - rankUpEnReduction)
          : 0;

      return {
        ...w,
        level: currentLevel + 1,
        power: w.power + rankUpPowerBonus,
        enCost: nextEn,
      };
    }),
  };
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type DraftPoolKey =
  | 'power_parts'
  | 'weapon_tech'
  | 'tactical_chips'
  | 'universal_weapon'
  | 'signature_weapon'
  | 'weapon_rankup';

const HIGH_TIER_KEYS = new Set<DraftPoolKey>([
  'tactical_chips',
  'signature_weapon',
  'weapon_rankup',
  'weapon_tech',
]);

/**
 * Rolls 3 distinct Post-Battle Draft choices weighted by current Stage (1–3):
 * - Stage 1 focuses on Power Parts & Universal Weapons + Weapon Rank-Up.
 * - Stage 2 & Stage 3 increase odds of high-tier Tactical Chips, Signature Weapons, and Rank-Ups.
 * - `highTierOnly` (Stage Clear Bonus) picks strictly from Tactical Chips, Signature Weapons,
 *   Weapon Rank-Ups, or Weapon Tech.
 */
export function rollPostBattleDraftChoices(
  runPlayer: RunPlayerState,
  mechaId: string,
  stage: 1 | 2 | 3 = 1,
  count: number = 3,
  highTierOnly: boolean = false
): DraftChoice[] {
  const { rankUpPowerBonus, rankUpEnReduction, minEnCost } =
    combatConfigJson.weapons;
  const maxLevel = getMaxWeaponLevel(runPlayer);
  const stageWeights =
    combatConfigJson.draftWeightsByStage[
      String(stage) as '1' | '2' | '3'
    ] ?? combatConfigJson.draftWeightsByStage['1'];

  const eligibleUpgrades = upgradeCards.filter(
    (card) => !(card.unique && runPlayer.installedUpgradeIds.includes(card.id))
  );
  const eligibleNewWeapons = getEligibleWeaponsForMecha(
    mechaId,
    runPlayer.equippedWeapons
  );

  const pools: Record<DraftPoolKey, DraftChoice[]> = {
    power_parts: shuffle(
      eligibleUpgrades.filter((c) => c.category === 'power_parts')
    ).map((card) => ({ kind: 'upgrade', card })),
    weapon_tech: shuffle(
      eligibleUpgrades.filter((c) => c.category === 'weapon_tech')
    ).map((card) => ({ kind: 'upgrade', card })),
    tactical_chips: shuffle(
      eligibleUpgrades.filter((c) => c.category === 'tactical_chips')
    ).map((card) => ({ kind: 'upgrade', card })),
    universal_weapon: shuffle(
      eligibleNewWeapons.filter((w) => (w.allowed_mechas ?? ['ALL']).includes('ALL'))
    ).map((weapon) => ({ kind: 'weapon', weapon })),
    signature_weapon: shuffle(
      eligibleNewWeapons.filter((w) => !(w.allowed_mechas ?? ['ALL']).includes('ALL'))
    ).map((weapon) => ({ kind: 'weapon', weapon })),
    weapon_rankup: shuffle(
      runPlayer.equippedWeapons.filter((w) => (w.level ?? 1) < maxLevel)
    ).map((weapon) => {
      const currentLevel = weapon.level ?? 1;
      const enDelta =
        weapon.enCost > minEnCost
          ? Math.min(rankUpEnReduction, weapon.enCost - minEnCost)
          : 0;
      return {
        kind: 'weapon_rankup',
        weapon,
        nextLevel: currentLevel + 1,
        powerDelta: rankUpPowerBonus,
        enDelta,
      };
    }),
  };

  const result: DraftChoice[] = [];
  const allKeys: DraftPoolKey[] = [
    'power_parts',
    'universal_weapon',
    'weapon_rankup',
    'weapon_tech',
    'tactical_chips',
    'signature_weapon',
  ];

  const pickWeightedFrom = (allowedKeys: DraftPoolKey[]): DraftChoice | null => {
    const available = allowedKeys.filter((k) => pools[k].length > 0);
    if (available.length === 0) return null;

    const totalWeight = available.reduce(
      (sum, key) => sum + (stageWeights[key] ?? 1),
      0
    );
    let roll = Math.random() * totalWeight;
    for (const key of available) {
      roll -= stageWeights[key] ?? 1;
      if (roll <= 0) {
        return pools[key].shift() ?? null;
      }
    }
    const lastKey = available[available.length - 1];
    return pools[lastKey].shift() ?? null;
  };

  // For standard post-battle drafts, guarantee at least 1 Weapon / Rank-Up option if available
  if (!highTierOnly && count >= 3) {
    const weaponChoice = pickWeightedFrom([
      'universal_weapon',
      'signature_weapon',
      'weapon_rankup',
    ]);
    if (weaponChoice) result.push(weaponChoice);
  }

  while (result.length < count) {
    const primaryKeys = highTierOnly
      ? allKeys.filter((k) => HIGH_TIER_KEYS.has(k))
      : allKeys;
    const picked =
      pickWeightedFrom(primaryKeys) ?? pickWeightedFrom(allKeys);
    if (!picked) break;
    result.push(picked);
  }

  return shuffle(result);
}

export type ShopItemRarity = 'rare' | 'epic' | 'legendary';

export function getDraftChoiceRarity(choice: DraftChoice): ShopItemRarity {
  if (choice.kind === 'weapon_rankup') {
    return choice.nextLevel >= 3 ? 'legendary' : 'epic';
  }
  if (choice.kind === 'weapon') {
    const w = choice.weapon;
    const isSignature = Boolean(
      w.allowed_mechas && !w.allowed_mechas.includes('ALL')
    );
    if (isSignature) return 'legendary';
    if (w.armorPiercePercent || w.mobilityDebuffAmount || w.power >= 2000) {
      return 'epic';
    }
    return 'rare';
  }
  const card = choice.card;
  if (card.id === 'hot_blooded_core' || card.id === 'vampire_reactor') {
    return 'legendary';
  }
  if (card.category === 'tactical_chips' || card.category === 'weapon_tech') {
    return 'epic';
  }
  return 'rare';
}

export function getShopItemPrice(choice: DraftChoice): number {
  const rarity = getDraftChoiceRarity(choice);
  return combatConfigJson.economy.shopPrices[rarity];
}

export function getSellValue(basePrice: number): number {
  return Math.max(
    10,
    Math.round((basePrice * combatConfigJson.economy.sellRefundPercent) / 100)
  );
}
