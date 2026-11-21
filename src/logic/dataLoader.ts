import combatConfigJson from '../data/combatConfig.json';
import terrainsJson from '../data/terrains.json';
import spiritCommandsJson from '../data/spiritCommands.json';
import weaponsJson from '../data/weapons.json';
import mechasJson from '../data/mechas.json';
import pilotsJson from '../data/pilots.json';
import unitsJson from '../data/units.json';
import stage1MapJson from '../data/stage1Map.json';
import type {
  BattleUnit,
  MechaData,
  PilotData,
  SpiritCommandData,
  StageMapData,
  TerrainConfig,
  UnitDefinition,
  WeaponData,
} from './types';

export const combatConfig = combatConfigJson;
export const terrains = terrainsJson as TerrainConfig[];
export const spiritCommands = spiritCommandsJson as SpiritCommandData[];
export const weapons = weaponsJson as WeaponData[];
export const mechas = mechasJson as MechaData[];
export const pilots = pilotsJson as PilotData[];
export const unitDefinitions = unitsJson as UnitDefinition[];
export const stage1Map = stage1MapJson as StageMapData;

export function getWeaponById(id: string): WeaponData | undefined {
  return weapons.find((w) => w.id === id);
}

export function getSpiritCommandById(id: string): SpiritCommandData | undefined {
  return spiritCommands.find((s) => s.id === id);
}

export function getTerrainById(id: TerrainConfig['id']): TerrainConfig | undefined {
  return terrains.find((t) => t.id === id);
}

export function createInitialBattleUnits(): BattleUnit[] {
  return unitDefinitions.map((def) => ({
    instanceId: def.instanceId,
    faction: def.faction,
    icon: def.icon,
    shortName: def.shortName,
    mecha: def.mecha,
    pilot: def.pilot,
    position: { ...def.startPosition },
    hp: def.mecha.maxHp,
    en: def.mecha.maxEn,
    sp: def.pilot.maxSp,
    will: combatConfig.will.initial,
    hasMoved: false,
    hasActed: false,
    activeSpirits: {
      valor: false,
      focus: false,
      ironWall: false,
    },
  }));
}
