import {
  combatConfig,
  getSpiritCommandById,
  getTerrainById,
} from './dataLoader';
import { findBestWeaponInRange } from './gridLogic';
import type {
  BattleForecast,
  BattleUnit,
  CombatPreview,
  CounterPromptData,
  DefenseAction,
  StageMapData,
  StrikeResolution,
  TerrainConfig,
  WeaponData,
} from './types';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function calculateHitRate(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenderTerrain: TerrainConfig,
  defenseAction: DefenseAction = 'counter'
): number {
  const focusSpirit = getSpiritCommandById('focus');
  const attackerHitBonus = attacker.activeSpirits.focus
    ? (focusSpirit?.effects.hitBonus ?? 0)
    : 0;
  const defenderFocusBonus = defender.activeSpirits.focus
    ? (focusSpirit?.effects.evadeBonus ?? 0)
    : 0;
  const actionEvadeBonus = combatConfig.defenseActions[defenseAction].evadeBonus;

  const rawHit =
    attacker.pilot.accuracy +
    weapon.accuracy +
    attackerHitBonus -
    (defender.pilot.evade +
      defender.mecha.mobility +
      defenderTerrain.evadeBonus +
      defenderFocusBonus +
      actionEvadeBonus);

  return Math.round(
    clamp(rawHit, combatConfig.hitRate.min, combatConfig.hitRate.max)
  );
}

export function calculateDamage(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenseAction: DefenseAction = 'counter'
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

  const spiritMultiplier = attackerSpiritMult * defenderSpiritMult;
  const actionMultiplier =
    combatConfig.defenseActions[defenseAction].damageTakenMultiplier;

  const finalDamage = Math.round(
    Math.max(
      combatConfig.damage.min,
      (baseDamage - defender.mecha.armor) * spiritMultiplier * actionMultiplier
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
  defenseAction: DefenseAction = 'counter'
): CombatPreview {
  const hitRate = calculateHitRate(
    attacker,
    defender,
    weapon,
    defenderTerrain,
    defenseAction
  );
  const { baseDamage, finalDamage } = calculateDamage(
    attacker,
    defender,
    weapon,
    defenseAction
  );

  return { hitRate, baseDamage, finalDamage };
}

export function buildBattleForecast(
  attacker: BattleUnit,
  defender: BattleUnit,
  attackerWeapon: WeaponData,
  map: StageMapData
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
    'counter'
  );

  const defenderCounterWeapon = findBestWeaponInRange(defender, attacker);
  const defenderPreview = defenderCounterWeapon
    ? previewCombat(
        defender,
        attacker,
        defenderCounterWeapon,
        attackerTerrain,
        'counter'
      )
    : null;

  return {
    attacker,
    defender,
    attackerWeapon,
    attackerPreview,
    defenderCounterWeapon,
    defenderPreview,
  };
}

export function buildCounterPrompt(
  enemy: BattleUnit,
  player: BattleUnit,
  enemyWeapon: WeaponData,
  map: StageMapData
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
    'counter'
  );
  const enemyPreviewDefend = previewCombat(
    enemy,
    player,
    enemyWeapon,
    playerTerrain,
    'defend'
  );
  const enemyPreviewEvade = previewCombat(
    enemy,
    player,
    enemyWeapon,
    playerTerrain,
    'evade'
  );

  const playerCounterWeapon = findBestWeaponInRange(player, enemy);
  const playerCounterPreview = playerCounterWeapon
    ? previewCombat(
        player,
        enemy,
        playerCounterWeapon,
        enemyTerrain,
        'counter'
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
  };
}

export function resolveAttackStrike(
  attacker: BattleUnit,
  defender: BattleUnit,
  weapon: WeaponData,
  defenderTerrain: TerrainConfig,
  defenseAction: DefenseAction = 'counter',
  randomValue: number = Math.random()
): StrikeResolution {
  const preview = previewCombat(
    attacker,
    defender,
    weapon,
    defenderTerrain,
    defenseAction
  );

  const roll = Math.floor(randomValue * 100) + 1;
  const hit = roll <= preview.hitRate;
  const damage = hit ? preview.finalDamage : 0;
  const nextDefenderHp = Math.max(0, defender.hp - damage);
  const destroyed = hit && nextDefenderHp === 0;

  const nextAmmo = { ...attacker.ammoByWeaponId };
  if (weapon.ammo !== null) {
    nextAmmo[weapon.id] = Math.max(0, (nextAmmo[weapon.id] ?? weapon.ammo) - 1);
  }

  const attackerWillGain =
    (hit ? combatConfig.will.onHitLanded : 0) +
    (destroyed ? combatConfig.will.onDestroyEnemy : 0);

  const nextAttackerWill = Math.min(
    combatConfig.will.max,
    attacker.will + attackerWillGain
  );

  const nextDefenderWill = hit
    ? Math.min(
        combatConfig.will.max,
        defender.will + combatConfig.will.onHitTaken
      )
    : Math.min(
        combatConfig.will.max,
        defender.will + combatConfig.will.onEvade
      );

  const updatedAttacker: BattleUnit = {
    ...attacker,
    en: Math.max(0, attacker.en - weapon.enCost),
    ammoByWeaponId: nextAmmo,
    will: nextAttackerWill,
    activeSpirits: {
      ...attacker.activeSpirits,
      valor: false,
    },
  };

  const updatedDefender: BattleUnit = {
    ...defender,
    hp: nextDefenderHp,
    will: nextDefenderWill,
  };

  return {
    updatedAttacker,
    updatedDefender,
    hit,
    damage,
    destroyed,
    hitRate: preview.hitRate,
    roll,
  };
}
