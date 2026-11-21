import type { RunNodeData } from './types';

const MECHA_SPRITE_MAP: Record<string, string> = {
  giga_rex: '/assets/mech_giga_rex.png',
  aegis_01: '/assets/mech_giga_rex.png',
  valkyrie_x: '/assets/mech_valkyrie_x.png',
  aegis_medic: '/assets/mech_aegis_medic.png',
  sentinel_mk1: '/assets/enemy_grunt.png',
  viper_scout: '/assets/enemy_grunt.png',
  crimson_commander: '/assets/enemy_elite.png',
  overlord_dreadnought: '/assets/boss_overlord.png',
  aegis_omega: '/assets/boss_overlord.png',
};

const MECHA_CUTIN_MAP: Record<string, string> = {
  giga_rex: '/assets/mech_giga_rex_cutin.png',
  aegis_01: '/assets/mech_giga_rex_cutin.png',
  valkyrie_x: '/assets/mech_valkyrie_x_cutin.png',
  aegis_medic: '/assets/mech_aegis_medic_cutin.png',
  overlord_dreadnought: '/assets/boss_overlord_cutin.png',
  aegis_omega: '/assets/boss_overlord_cutin.png',
};

const PILOT_PORTRAIT_MAP: Record<string, string> = {
  pilot_ren: '/assets/pilot_giga_rex.png',
  pilot_elena: '/assets/pilot_valkyrie_x.png',
  pilot_mina: '/assets/pilot_aegis_medic.png',
};

export function getMechaSpriteUrl(
  mechaId: string,
  bossPhase2: boolean = false
): string | null {
  if (
    bossPhase2 &&
    (mechaId === 'overlord_dreadnought' || mechaId === 'aegis_omega')
  ) {
    return '/assets/boss_overlord_phase2.png';
  }
  return MECHA_SPRITE_MAP[mechaId] ?? null;
}

export function getMechaCutInUrl(mechaId: string): string | null {
  return MECHA_CUTIN_MAP[mechaId] ?? null;
}

export function getPilotPortraitUrl(pilotId: string): string | null {
  return PILOT_PORTRAIT_MAP[pilotId] ?? null;
}

export function getBattleBackgroundUrl(node: RunNodeData): string {
  if (node.type === 'boss_battle' || node.nodeNumber === 7) {
    return '/assets/bg_battle_boss.png';
  }
  if (node.nodeNumber === 1 || node.nodeNumber === 2) {
    return '/assets/bg_battle_city.png';
  }
  if (
    node.nodeNumber === 4 ||
    node.nodeNumber === 6 ||
    node.type === 'elite_battle' ||
    node.type === 'hard_battle'
  ) {
    return '/assets/bg_battle_space.png';
  }
  return '/assets/bg_battle_city.png';
}
