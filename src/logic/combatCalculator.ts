import { combatConfig, getSpiritCommandById } from './dataLoader';
import type {
  BattleUnit,
  CombatPreview,
  DefenseAction,
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
