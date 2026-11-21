import type { BattleUnit, SpiritCommandData } from './types';

export interface SpiritCastResult {
  updatedUnits: BattleUnit[];
  logMessage: string;
  popup?: {
    position: BattleUnit['position'];
    text: string;
    variant: 'heal' | 'damage' | 'miss' | 'destroyed';
  };
}

export function isSpiritActiveOnUnit(
  unit: BattleUnit,
  spiritId: string
): boolean {
  switch (spiritId) {
    case 'valor':
      return unit.activeSpirits.valor;
    case 'focus':
      return unit.activeSpirits.focus;
    case 'iron_wall':
      return unit.activeSpirits.ironWall;
    default:
      return false;
  }
}

export function canUseSpiritCommand(
  unit: BattleUnit,
  spirit: SpiritCommandData,
  allUnits: BattleUnit[]
): { usable: boolean; reason?: string } {
  if (unit.sp < spirit.spCost) {
    return { usable: false, reason: `SP ไม่พอ (${spirit.spCost})` };
  }

  if (isSpiritActiveOnUnit(unit, spirit.id)) {
    return { usable: false, reason: 'ใช้งานอยู่แล้ว' };
  }

  if (spirit.id === 'trust') {
    const woundedAlly = allUnits.find(
      (u) => u.faction === unit.faction && u.hp > 0 && u.hp < u.mecha.maxHp
    );
    if (!woundedAlly) {
      return { usable: false, reason: 'HP เต็มแล้ว' };
    }
  }

  return { usable: true };
}

export function applySpiritCommand(
  caster: BattleUnit,
  spirit: SpiritCommandData,
  allUnits: BattleUnit[]
): SpiritCastResult {
  const nextSp = Math.max(0, caster.sp - spirit.spCost);

  if (spirit.id === 'trust') {
    // Pick the allied unit with the lowest HP ratio (includes caster if solo)
    const allies = allUnits
      .filter((u) => u.faction === caster.faction && u.hp > 0)
      .sort((a, b) => a.hp / a.mecha.maxHp - b.hp / b.mecha.maxHp);
    const target = allies[0] ?? caster;
    const healPercent = spirit.effects.healHpPercent ?? 0;
    const rawHeal = Math.round((target.mecha.maxHp * healPercent) / 100);
    const nextHp = Math.min(target.mecha.maxHp, target.hp + rawHeal);
    const actualHeal = nextHp - target.hp;

    const updatedUnits = allUnits.map((u) => {
      let nextUnit = u;
      if (u.instanceId === caster.instanceId) {
        nextUnit = { ...nextUnit, sp: nextSp };
      }
      if (u.instanceId === target.instanceId) {
        nextUnit = { ...nextUnit, hp: nextHp };
      }
      return nextUnit;
    });

    return {
      updatedUnits,
      logMessage: `${spirit.icon ?? '💚'} ${caster.pilot.name} ใช้ ${spirit.name} (${spirit.nameTh}) [-${spirit.spCost} SP] ฟื้นฟู ${target.mecha.name} +${actualHeal.toLocaleString()} HP`,
      popup: {
        position: { ...target.position },
        text: `+${actualHeal.toLocaleString()} HP`,
        variant: 'heal',
      },
    };
  }

  const updatedUnits = allUnits.map((u) => {
    if (u.instanceId !== caster.instanceId) return u;
    return {
      ...u,
      sp: nextSp,
      activeSpirits: {
        ...u.activeSpirits,
        valor: spirit.id === 'valor' ? true : u.activeSpirits.valor,
        focus: spirit.id === 'focus' ? true : u.activeSpirits.focus,
        ironWall: spirit.id === 'iron_wall' ? true : u.activeSpirits.ironWall,
      },
    };
  });

  return {
    updatedUnits,
    logMessage: `${spirit.icon ?? '✨'} ${caster.pilot.name} ใช้ ${spirit.name} (${spirit.nameTh}) [-${spirit.spCost} SP] — ${spirit.description}`,
  };
}
