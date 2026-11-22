import { getActiveAceStatus } from './aceLogic';
import {
  combatConfig,
  getSpiritCommandById,
  getTerrainById,
  getUnitWeapons,
} from './dataLoader';
import {
  findBestWeaponInRange,
  getManhattanDistance,
  resolveKnockback,
} from './gridLogic';
import { getUpgradeById, hasUpgrade } from './upgradeLogic';
import type {
  BattleForecast,
  BattleUnit,
  CombatPreview,
  CounterPromptData,
  DefenseAction,
  StageMapData,
  StrikeResolution,
  SupportAttackPreview,
  TerrainConfig,
  WeaponData,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isSiegeLockActive(unit: BattleUnit): boolean {
  return Boolean(unit.mecha.hasSiegeLock && !unit.hasMoved);
}

/**
 * Overdrive (ขีดจำกัดคลั่ง): automatically active for any alive unit when
 * HP <= 25% or EN <= 20% (thresholds from combatConfig.json).
 */
export function isUnitInOverdrive(unit: BattleUnit): boolean {
  if (unit.hp <= 0) return false;
  const hpPct = (unit.hp / unit.mecha.maxHp) * 100;
  const enPct = (unit.en / unit.mecha.maxEn) * 100;
  return (
    hpPct <= combatConfig.overdrive.hpThresholdPercent ||
    enPct <= combatConfig.overdrive.enThresholdPercent
  );
}

export function calculateCritRate(
  attacker: BattleUnit,
  weapon?: WeaponData
): number {
  const overdriveBonus = isUnitInOverdrive(attacker)
    ? combatConfig.overdrive.critRateBonus
    : 0;
  const weaponCritBonus = weapon?.critBonus ?? 0;
  const aceCritBonus = getActiveAceStatus(
    attacker.pilot.id,
    attacker.killCount ?? 0
  ).effects.critRateBonus;
  return Math.round(
    clamp(
      combatConfig.critical.baseRate +
        overdriveBonus +
        weaponCritBonus +
        aceCritBonus,
      0,
      100
    )
  );
}

export function calculateHitRate(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenderTerrain: TerrainConfig,
  defenseAction: DefenseAction = 'counter',
  attackerTerrain?: TerrainConfig
): number {
  const focusSpirit = getSpiritCommandById('focus');
  const attackerFocusBonus = attacker.activeSpirits.focus
    ? (focusSpirit?.effects.hitBonus ?? 0)
    : 0;
  const highGroundHitBonus = attackerTerrain?.accuracyBonus ?? 0;
  const aceHitBonus = getActiveAceStatus(
    attacker.pilot.id,
    attacker.killCount ?? 0
  ).effects.accuracyBonus;
  const siegeHitBonus = isSiegeLockActive(attacker)
    ? combatConfig.siegeLock.accuracyBonus
    : 0;
  const attackerHitBonus =
    attackerFocusBonus + highGroundHitBonus + aceHitBonus + siegeHitBonus;
  const defenderFocusBonus = defender.activeSpirits.focus
    ? (focusSpirit?.effects.evadeBonus ?? 0)
    : 0;
  const defenderAceEvadeBonus = getActiveAceStatus(
    defender.pilot.id,
    defender.killCount ?? 0
  ).effects.evadeBonus;
  const actionEvadeBonus = combatConfig.defenseActions[defenseAction].evadeBonus;

  const rawHit =
    attacker.pilot.accuracy +
    weapon.accuracy +
    attackerHitBonus -
    (defender.pilot.evade +
      defender.mecha.mobility +
      defenderTerrain.evadeBonus +
      defenderFocusBonus +
      defenderAceEvadeBonus +
      actionEvadeBonus);

  return Math.round(
    clamp(rawHit, combatConfig.hitRate.min, combatConfig.hitRate.max)
  );
}

export function calculateDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenseAction: DefenseAction = 'counter',
  isCounterAttack: boolean = false,
  damageScale: number = 1,
  attackerTerrain?: TerrainConfig
): { baseDamage: number; finalDamage: number } {
  const pilotStat =
    weapon.type === 'melee' ? attacker.pilot.melee : attacker.pilot.ranged;

  const baseDamage =
    weapon.power *
    (pilotStat / combatConfig.damage.statDivisor) *
    (attacker.will / combatConfig.damage.willDivisor);

  const valorSpirit = getSpiritCommandById('valor');
  const ironWallSpirit = getSpiritCommandById('iron_wall');

  const attackerSpiritMult = attacker.activeSpirits.valor
    ? (valorSpirit?.effects.damageMultiplier ?? 1)
    : 1;
  const defenderSpiritMult = defender.activeSpirits.ironWall
    ? (ironWallSpirit?.effects.damageTakenMultiplier ?? 1)
    : 1;

  // Tactical Chip: Hot-Blooded Core (+25% damage when Will >= 120)
  let chipMultiplier = 1;
  if (hasUpgrade(attacker.installedUpgradeIds, 'hot_blooded_core')) {
    const hotCore = getUpgradeById('hot_blooded_core');
    const threshold = hotCore?.effects.willThreshold ?? 120;
    const bonusPct = hotCore?.effects.hotBloodedDamagePercent ?? 0;
    if (attacker.will >= threshold) {
      chipMultiplier *= 1 + bonusPct / 100;
    }
  }

  // Tactical Chip: Counter Master (+30% damage when executing a Counter-Attack)
  if (
    isCounterAttack &&
    hasUpgrade(attacker.installedUpgradeIds, 'counter_master')
  ) {
    const counterChip = getUpgradeById('counter_master');
    const bonusPct = counterChip?.effects.counterDamagePercent ?? 0;
    chipMultiplier *= 1 + bonusPct / 100;
  }

  // Overdrive (+30% ATK when attacker is in Overdrive; -30% Armor when defender is in Overdrive)
  const overdriveAttackMult = isUnitInOverdrive(attacker)
    ? 1 + combatConfig.overdrive.damageBonusPercent / 100
    : 1;
  const armorAfterOverdrive = isUnitInOverdrive(defender)
    ? Math.round(
        defender.mecha.armor *
          (1 - combatConfig.overdrive.armorPenaltyPercent / 100)
      )
    : defender.mecha.armor;

  // Armor-Piercing weapons, Ace armor pierce & Siege Lock ignore a % of defender's effective Armor
  const aceEffects = getActiveAceStatus(
    attacker.pilot.id,
    attacker.killCount ?? 0
  ).effects;
  const siegePierceBonus = isSiegeLockActive(attacker)
    ? combatConfig.siegeLock.armorPierceBonus
    : 0;
  const piercePct = Math.min(
    100,
    (weapon.armorPiercePercent ?? 0) +
      aceEffects.armorPierceBonus +
      siegePierceBonus
  );
  const effectiveDefenderArmor = Math.round(
    armorAfterOverdrive * (1 - piercePct / 100)
  );

  const aceFinisherMult =
    weapon.willRequired >= 120 && aceEffects.finisherDamagePercent > 0
      ? 1 + aceEffects.finisherDamagePercent / 100
      : 1;

  const spiritMultiplier = attackerSpiritMult * defenderSpiritMult;
  const terrainDamageMult =
    1 + (attackerTerrain?.damageBonusPercent ?? 0) / 100;
  const actionMultiplier =
    combatConfig.defenseActions[defenseAction].damageTakenMultiplier;

  const finalDamage = Math.round(
    Math.max(
      combatConfig.damage.min,
      (baseDamage - effectiveDefenderArmor) *
        spiritMultiplier *
        actionMultiplier *
        chipMultiplier *
        overdriveAttackMult *
        terrainDamageMult *
        aceFinisherMult *
        damageScale
    )
  );

  return {
    baseDamage: Math.round(baseDamage),
    finalDamage,
  };
}

export function previewCombat(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenderTerrain: TerrainConfig,
  defenseAction: DefenseAction = 'counter',
  isCounterAttack: boolean = false,
  damageScale: number = 1,
  attackerTerrain?: TerrainConfig
): CombatPreview {
  const hitRate = calculateHitRate(
    attacker,
    defender,
    weapon,
    defenderTerrain,
    defenseAction,
    attackerTerrain
  );
  const critRate = calculateCritRate(attacker, weapon);
  const { baseDamage, finalDamage } = calculateDamage(
    attacker,
    defender,
    weapon,
    defenseAction,
    isCounterAttack,
    damageScale,
    attackerTerrain
  );

  return { hitRate, critRate, baseDamage, finalDamage };
}

/**
 * Support Attack: finds an alive adjacent ally (distance === 1) who can fire
 * its primary weapon (0 EN cost, 50% damage) to assist the attacker.
 */
export function findSupportAttacker(
  attacker: BattleUnit,
  defender: BattleUnit,
  allUnits: BattleUnit[],
  defenderTerrain: TerrainConfig,
  map?: StageMapData,
  globalDamageScale: number = 1
): SupportAttackPreview | null {
  const adjacentAllies = allUnits.filter(
    (u) =>
      u.faction === attacker.faction &&
      u.instanceId !== attacker.instanceId &&
      u.hp > 0 &&
      getManhattanDistance(attacker.position, u.position) ===
        combatConfig.support.adjacentDistance
  );

  if (adjacentAllies.length === 0) return null;

  let bestSupport: SupportAttackPreview | null = null;

  for (const ally of adjacentAllies) {
    const allyWeapons = getUnitWeapons(ally);
    if (allyWeapons.length === 0) continue;

    const allyTerrain = map
      ? getTerrainById(map.tiles[ally.position.row]?.[ally.position.col])
      : undefined;

    const distToEnemy = getManhattanDistance(ally.position, defender.position);
    // Prefer primary weapon in range, or highest-power weapon in range; fallback to primary weapon
    const inRangeWeapons = allyWeapons.filter(
      (w) =>
        distToEnemy >= w.minRange &&
        distToEnemy <= w.maxRange &&
        ally.will >= w.willRequired
    );
    const chosenWeapon =
      inRangeWeapons.length > 0
        ? inRangeWeapons.sort((a, b) => b.power - a.power)[0]
        : allyWeapons[0];

    const preview = previewCombat(
      ally,
      defender,
      chosenWeapon,
      defenderTerrain,
      'counter',
      false,
      combatConfig.support.supportAttackDamageMultiplier * globalDamageScale,
      allyTerrain
    );

    if (
      !bestSupport ||
      preview.finalDamage > bestSupport.preview.finalDamage
    ) {
      bestSupport = { ally, weapon: chosenWeapon, preview };
    }
  }

  return bestSupport;
}

/**
 * Support Defense: if the defending player unit has < 30% HP and an adjacent
 * ally has higher HP, that ally jumps in to take the hit with Defend (-50% DMG).
 */
export function findSupportDefender(
  defender: BattleUnit,
  allUnits: BattleUnit[]
): BattleUnit | null {
  const hpPercent = (defender.hp / defender.mecha.maxHp) * 100;
  if (hpPercent >= combatConfig.support.supportDefenseHpThresholdPercent) {
    return null;
  }

  const candidates = allUnits
    .filter(
      (u) =>
        u.faction === defender.faction &&
        u.instanceId !== defender.instanceId &&
        u.hp > defender.hp &&
        getManhattanDistance(defender.position, u.position) ===
          combatConfig.support.adjacentDistance
    )
    .sort((a, b) => b.hp - a.hp);

  return candidates[0] ?? null;
}

export function buildBattleForecast(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: WeaponData,
  map: StageMapData,
  allUnits: BattleUnit[] = [],
  globalDamageScale: number = 1
): BattleForecast {
  const defenderTerrain =
    getTerrainById(map.tiles[defender.position.row][defender.position.col]) ??
    getTerrainById('normal')!;
  const attackerTerrain =
    getTerrainById(map.tiles[attacker.position.row][attacker.position.col]) ??
    getTerrainById('normal')!;

  const attackerPreview = previewCombat(
    attacker,
    defender,
    attackerWeapon,
    defenderTerrain,
    'counter',
    false,
    globalDamageScale,
    attackerTerrain
  );

  const supportAttack = findSupportAttacker(
    attacker,
    defender,
    allUnits,
    defenderTerrain,
    map,
    globalDamageScale
  );

  const defenderCounterWeapon = findBestWeaponInRange(defender, attacker, map);
  const defenderPreview = defenderCounterWeapon
    ? previewCombat(
        defender,
        attacker,
        defenderCounterWeapon,
        attackerTerrain,
        'counter',
        false,
        globalDamageScale,
        defenderTerrain
      )
    : null;

  let knockbackWarning: BattleForecast['knockbackWarning'] = null;
  if (attackerWeapon.knockback && attackerWeapon.knockback > 0) {
    const kbSim = resolveKnockback(
      attacker.position,
      defender.instanceId,
      attackerWeapon.knockback,
      map,
      allUnits.length > 0 ? allUnits : [attacker, defender]
    );
    if (kbSim.triggeredExplosivePos) {
      knockbackWarning = {
        kind: 'explosive_core',
        label:
          '💥 KNOCKBACK WARNING: แรงกระแทกจะผลักศัตรูชน Explosive Core (ระเบิด AoE 3×3 800 DMG)!',
      };
    } else if (kbSim.landedOnHazard) {
      knockbackWarning = {
        kind: 'plasma_hazard',
        label: `🔥 KNOCKBACK WARNING: แรงกระแทกจะผลักศัตรูตกบ่อ Plasma Hazard (-${kbSim.hazardDamage ?? '10%'} HP)!`,
      };
    } else if (kbSim.collided) {
      knockbackWarning = {
        kind: 'collision',
        label: `💫 KNOCKBACK COLLISION: จะชนสิ่งกีดขวางรับดาเมจเสริม +${kbSim.collisionDamage} & Stun!`,
      };
    }
  }

  return {
    attacker,
    defender,
    attackerWeapon,
    attackerPreview,
    supportAttack,
    defenderCounterWeapon,
    defenderPreview,
    attackerHighGround: attackerTerrain.id === 'high_ground',
    defenderHighGround: defenderTerrain.id === 'high_ground',
    attackerSiegeLock: isSiegeLockActive(attacker),
    knockbackWarning,
  };
}

export function buildCounterPrompt(
  enemy: BattleUnit,
  player: BattleUnit,
  enemyWeapon: WeaponData,
  map: StageMapData,
  allUnits: BattleUnit[] = [],
  globalDamageScale: number = 1
): CounterPromptData {
  const playerTerrain =
    getTerrainById(map.tiles[player.position.row][player.position.col]) ??
    getTerrainById('normal')!;
  const enemyTerrain =
    getTerrainById(map.tiles[enemy.position.row][enemy.position.col]) ??
    getTerrainById('normal')!;

  const enemyPreviewCounter = previewCombat(
    enemy,
    player,
    enemyWeapon,
    playerTerrain,
    'counter',
    false,
    globalDamageScale,
    enemyTerrain
  );
  const enemyPreviewDefend = previewCombat(
    enemy,
    player,
    enemyWeapon,
    playerTerrain,
    'defend',
    false,
    globalDamageScale,
    enemyTerrain
  );
  const enemyPreviewEvade = previewCombat(
    enemy,
    player,
    enemyWeapon,
    playerTerrain,
    'evade',
    false,
    globalDamageScale,
    enemyTerrain
  );

  const playerCounterWeapon = findBestWeaponInRange(player, enemy, map);
  const playerCounterPreview = playerCounterWeapon
    ? previewCombat(
        player,
        enemy,
        playerCounterWeapon,
        enemyTerrain,
        'counter',
        true,
        globalDamageScale,
        playerTerrain
      )
    : null;

  const supportDefender = findSupportDefender(player, allUnits);
  const supportDefenderTerrain = supportDefender
    ? (getTerrainById(
        map.tiles[supportDefender.position.row][supportDefender.position.col]
      ) ?? getTerrainById('normal')!)
    : playerTerrain;
  const supportDefenderPreview = supportDefender
    ? previewCombat(
        enemy,
        supportDefender,
        enemyWeapon,
        supportDefenderTerrain,
        'defend',
        false,
        globalDamageScale,
        enemyTerrain
      )
    : null;

  return {
    enemy,
    player,
    enemyWeapon,
    enemyPreviewCounter,
    enemyPreviewDefend,
    enemyPreviewEvade,
    playerCounterWeapon,
    playerCounterPreview,
    supportDefender,
    supportDefenderPreview,
  };
}

export function resolveAttackStrike(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenderTerrain: TerrainConfig,
  defenseAction: DefenseAction = 'counter',
  randomValue: number = Math.random(),
  isCounterAttack: boolean = false,
  damageScale: number = 1,
  freeEn: boolean = false,
  attackerTerrain?: TerrainConfig
): StrikeResolution {
  const preview = previewCombat(
    attacker,
    defender,
    weapon,
    defenderTerrain,
    defenseAction,
    isCounterAttack,
    damageScale,
    attackerTerrain
  );

  const roll = Math.floor(randomValue * 100) + 1;
  const hit = roll <= preview.hitRate;
  const critRoll = Math.floor(Math.random() * 100) + 1;
  const isCrit = hit && critRoll <= preview.critRate;
  const damage = hit
    ? isCrit
      ? Math.round(preview.finalDamage * combatConfig.critical.damageMultiplier)
      : preview.finalDamage
    : 0;
  const nextDefenderHp = Math.max(0, defender.hp - damage);
  const destroyed = hit && nextDefenderHp === 0;

  const nextAmmo = { ...attacker.ammoByWeaponId };
  if (!freeEn && weapon.ammo !== null) {
    nextAmmo[weapon.id] = Math.max(0, (nextAmmo[weapon.id] ?? weapon.ammo) - 1);
  }

  const attackerWillGain =
    (hit ? combatConfig.will.onHitLanded : 0) +
    (destroyed ? combatConfig.will.onDestroyEnemy : 0);

  const nextAttackerWill = Math.min(
    attacker.maxWill,
    attacker.will + attackerWillGain
  );

  const nextDefenderWill = hit
    ? Math.min(defender.maxWill, defender.will + combatConfig.will.onHitTaken)
    : Math.min(defender.maxWill, defender.will + combatConfig.will.onEvade);

  // Tactical Chip: Vampire Reactor (heal 20% Max HP when destroying an enemy)
  let nextAttackerHp = attacker.hp;
  let vampireHealed = 0;
  if (destroyed && hasUpgrade(attacker.installedUpgradeIds, 'vampire_reactor')) {
    const vampChip = getUpgradeById('vampire_reactor');
    const healPct = vampChip?.effects.vampireHealPercent ?? 0;
    const rawHeal = Math.round((attacker.mecha.maxHp * healPct) / 100);
    nextAttackerHp = Math.min(attacker.mecha.maxHp, attacker.hp + rawHeal);
    vampireHealed = nextAttackerHp - attacker.hp;
  }

  // Weapon Debuff: Armor Break & Mobility Debuff (EMP Disruptor)
  let armorBroken = 0;
  let nextDefenderArmor = defender.mecha.armor;
  if (
    hit &&
    !destroyed &&
    weapon.armorBreakAmount &&
    weapon.armorBreakAmount > 0
  ) {
    nextDefenderArmor = Math.max(
      0,
      defender.mecha.armor - weapon.armorBreakAmount
    );
    armorBroken = defender.mecha.armor - nextDefenderArmor;
  }

  let mobilityDebuffed = 0;
  let nextDefenderMobility = defender.mecha.mobility;
  if (
    hit &&
    !destroyed &&
    weapon.mobilityDebuffAmount &&
    weapon.mobilityDebuffAmount > 0
  ) {
    nextDefenderMobility = Math.max(
      0,
      defender.mecha.mobility - weapon.mobilityDebuffAmount
    );
    mobilityDebuffed = defender.mecha.mobility - nextDefenderMobility;
  }

  const enCost = freeEn
    ? combatConfig.support.supportAttackEnCost
    : weapon.enCost;

  const updatedAttacker: BattleUnit = {
    ...attacker,
    hp: nextAttackerHp,
    en: Math.max(0, attacker.en - enCost),
    ammoByWeaponId: nextAmmo,
    will: nextAttackerWill,
    activeSpirits: freeEn
      ? attacker.activeSpirits
      : {
          ...attacker.activeSpirits,
          valor: false,
        },
  };

  const updatedDefender: BattleUnit = {
    ...defender,
    hp: nextDefenderHp,
    will: nextDefenderWill,
    mecha:
      armorBroken > 0 || mobilityDebuffed > 0
        ? {
            ...defender.mecha,
            armor: nextDefenderArmor,
            mobility: nextDefenderMobility,
          }
        : defender.mecha,
  };

  return {
    updatedAttacker,
    updatedDefender,
    hit,
    isCrit,
    damage,
    destroyed,
    hitRate: preview.hitRate,
    roll,
    vampireHealed,
    armorBroken,
    mobilityDebuffed,
  };
}
