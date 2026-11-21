import combatConfigJson from '../data/combatConfig.json';
import terrainsJson from '../data/terrains.json';
import spiritsJson from '../data/spirits.json';
import weaponsJson from '../data/weapons.json';
import mechasJson from '../data/mechas.json';
import pilotsJson from '../data/pilots.json';
import unitsJson from '../data/units.json';
import stage1MapJson from '../data/stage1Map.json';
import runNodesJson from '../data/runNodes.json';
import { getMetaBonuses, getThreatLevelConfig } from './metaLogic';
import { applyUpgradesToMecha } from './upgradeLogic';
import type {
  BattleUnit,
  MechaData,
  MetaProgressState,
  PilotData,
  RunNodeData,
  RunPlayerState,
  SpiritCommandData,
  StageMapData,
  TerrainConfig,
  UnitDefinition,
  WeaponData,
} from './types';

export const combatConfig = combatConfigJson;
export const terrains = terrainsJson as TerrainConfig[];
export const spiritCommands = spiritsJson as SpiritCommandData[];
export const weapons = weaponsJson as WeaponData[];
export const mechas = mechasJson as MechaData[];
export const pilots = pilotsJson as PilotData[];
export const unitDefinitions = unitsJson as UnitDefinition[];
export const stage1Map = stage1MapJson as StageMapData;
export const runNodes = runNodesJson as RunNodeData[];

export function getWeaponById(id: string): WeaponData | undefined {
  return weapons.find((w) => w.id === id);
}

export function getSpiritCommandById(
  id: string
): SpiritCommandData | undefined {
  return spiritCommands.find((s) => s.id === id);
}

export function getUnitSpiritCommands(
  unit: Pick<BattleUnit, 'pilot'>
): SpiritCommandData[] {
  return unit.pilot.spiritCommandIds
    .map((id) => getSpiritCommandById(id))
    .filter((s): s is SpiritCommandData => Boolean(s));
}

export function getTerrainById(
  id: TerrainConfig['id']
): TerrainConfig | undefined {
  return terrains.find((t) => t.id === id);
}

export function getUnitWeapons(unit: Pick<BattleUnit, 'mecha'>): WeaponData[] {
  if (unit.mecha.weapons && unit.mecha.weapons.length > 0) {
    return unit.mecha.weapons;
  }
  return unit.mecha.weaponIds
    .map((id) => getWeaponById(id))
    .filter((w): w is WeaponData => Boolean(w));
}

export function getPlayableUnitDefs(): UnitDefinition[] {
  return unitDefinitions.filter(
    (u) => u.faction === 'player' && !u.isSupportAlly
  );
}

export function getUnitDefById(id: string): UnitDefinition | undefined {
  return unitDefinitions.find((u) => u.instanceId === id);
}

export function getEffectivePlayerMecha(
  runPlayer: RunPlayerState,
  meta?: MetaProgressState
): MechaData {
  const def = getUnitDefById(runPlayer.unitDefId) ?? getPlayableUnitDefs()[0];
  const baseWeapons = getUnitWeapons({ mecha: def.mecha });
  const metaBonuses = meta
    ? getMetaBonuses(meta)
    : { hpBonus: 0, spBonus: 0, armorBonus: 0, unlockSupportMech: false };

  const metaEnhancedMecha: MechaData = {
    ...def.mecha,
    maxHp: def.mecha.maxHp + metaBonuses.hpBonus,
    armor: def.mecha.armor + metaBonuses.armorBonus,
  };

  return applyUpgradesToMecha(
    metaEnhancedMecha,
    baseWeapons,
    runPlayer.installedUpgradeIds
  ).mecha;
}

export function getEffectivePlayerMaxSp(
  runPlayer: RunPlayerState,
  meta?: MetaProgressState
): number {
  const def = getUnitDefById(runPlayer.unitDefId) ?? getPlayableUnitDefs()[0];
  const spBonus = meta ? getMetaBonuses(meta).spBonus : 0;
  return def.pilot.maxSp + spBonus;
}

export function createRunPlayerState(
  unitDefId: string,
  meta?: MetaProgressState,
  startingAllyIds: string[] = []
): RunPlayerState {
  const def = getUnitDefById(unitDefId) ?? getPlayableUnitDefs()[0];
  const metaBonuses = meta
    ? getMetaBonuses(meta)
    : { hpBonus: 0, spBonus: 0, armorBonus: 0, unlockSupportMech: false };

  const allies = new Set<string>(startingAllyIds);
  if (metaBonuses.unlockSupportMech) {
    allies.add('ally_support_mech');
  }

  const maxAllies = Math.max(0, combatConfig.support.maxSquadSize - 1);

  return {
    unitDefId: def.instanceId,
    hp: def.mecha.maxHp + metaBonuses.hpBonus,
    en: def.mecha.maxEn,
    sp: def.pilot.maxSp + metaBonuses.spBonus,
    maxWillBonus: 0,
    installedUpgradeIds: [],
    squadAllyIds: Array.from(allies).slice(0, maxAllies),
  };
}

function buildAmmoMap(mecha: MechaData): Record<string, number> {
  const unitWeapons = getUnitWeapons({ mecha });
  const ammoByWeaponId: Record<string, number> = {};
  for (const w of unitWeapons) {
    if (w.ammo !== null) {
      ammoByWeaponId[w.id] = w.ammo;
    }
  }
  return ammoByWeaponId;
}

/**
 * Builds the BattleUnit roster for a specific Run Node:
 * - Player unit carries over HP, EN, SP, and Max Will Bonus from RunPlayerState.
 * - Will always resets to combatConfig.will.initial (100) at the start of each battle.
 * - Enemies are spawned from the node's enemySpawns config.
 */
export function createBattleUnitsForNode(
  runPlayer: RunPlayerState,
  node: RunNodeData,
  meta?: MetaProgressState,
  threatLevel: number = 0
): BattleUnit[] {
  const playerDef =
    getUnitDefById(runPlayer.unitDefId) ?? getPlayableUnitDefs()[0];
  const effectiveMecha = getEffectivePlayerMecha(runPlayer, meta);
  const effectiveMaxSp = getEffectivePlayerMaxSp(runPlayer, meta);
  const metaBonuses = meta
    ? getMetaBonuses(meta)
    : { hpBonus: 0, spBonus: 0, armorBonus: 0, unlockSupportMech: false };
  const threatCfg = getThreatLevelConfig(threatLevel);

  const playerUnit: BattleUnit = {
    instanceId: playerDef.instanceId,
    faction: 'player',
    isMainUnit: true,
    icon: playerDef.icon,
    shortName: playerDef.shortName,
    mecha: effectiveMecha,
    pilot: {
      ...playerDef.pilot,
      maxSp: effectiveMaxSp,
    },
    position: { ...playerDef.startPosition },
    hp: Math.max(1, Math.min(effectiveMecha.maxHp, runPlayer.hp)),
    en: Math.max(0, Math.min(effectiveMecha.maxEn, runPlayer.en)),
    sp: Math.max(0, Math.min(effectiveMaxSp, runPlayer.sp)),
    will: combatConfig.will.initial,
    maxWill: combatConfig.will.max + runPlayer.maxWillBonus,
    ammoByWeaponId: buildAmmoMap(effectiveMecha),
    hasMoved: false,
    hasActed: false,
    activeSpirits: {
      valor: false,
      focus: false,
      ironWall: false,
    },
    installedUpgradeIds: [...runPlayer.installedUpgradeIds],
  };

  const alliedUnits: BattleUnit[] = [playerUnit];

  // Deploy all allies in the player's squad (capped by combatConfig.support.maxSquadSize)
  const allyIdsToDeploy = new Set<string>(runPlayer.squadAllyIds);
  if (metaBonuses.unlockSupportMech) {
    allyIdsToDeploy.add('ally_support_mech');
  }

  const maxAllies = Math.max(0, combatConfig.support.maxSquadSize - 1);
  const fallbackPositions = [
    { row: 6, col: 0 },
    { row: 6, col: 2 },
  ];

  Array.from(allyIdsToDeploy)
    .slice(0, maxAllies)
    .forEach((allyId, idx) => {
      const allyDef = getUnitDefById(allyId);
      if (!allyDef) return;
      const spawnPos = allyDef.startPosition ?? fallbackPositions[idx] ?? {
        row: 6,
        col: 2,
      };
      alliedUnits.push({
        instanceId: allyDef.instanceId,
        faction: 'player',
        isMainUnit: false,
        icon: allyDef.icon,
        shortName: allyDef.shortName,
        mecha: allyDef.mecha,
        pilot: allyDef.pilot,
        position: { ...spawnPos },
        hp: allyDef.mecha.maxHp,
        en: allyDef.mecha.maxEn,
        sp: allyDef.pilot.maxSp,
        will: combatConfig.will.initial,
        maxWill: combatConfig.will.max,
        ammoByWeaponId: buildAmmoMap(allyDef.mecha),
        hasMoved: false,
        hasActed: false,
        activeSpirits: {
          valor: false,
          focus: false,
          ironWall: false,
        },
        installedUpgradeIds: [],
      });
    });

  const enemyUnits: BattleUnit[] = (node.enemySpawns ?? []).map(
    (spawn, idx) => {
      const template = getUnitDefById(spawn.templateId)!;
      const suffix = spawn.labelSuffix ? ` ${spawn.labelSuffix}` : '';
      const shortSuffix = spawn.labelSuffix ? `-${spawn.labelSuffix[0]}` : '';

      const scaledMaxHp = Math.round(
        template.mecha.maxHp * (1 + threatCfg.enemyHpBonusPercent / 100)
      );
      const scaledArmor = template.mecha.armor + threatCfg.enemyArmorBonus;

      return {
        instanceId: `${node.id}_${spawn.templateId}_${idx + 1}`,
        faction: 'enemy',
        isMainUnit: false,
        icon: template.icon,
        shortName: `${template.shortName}${shortSuffix}`,
        mecha: {
          ...template.mecha,
          name: `${template.mecha.name}${suffix}`,
          maxHp: scaledMaxHp,
          armor: scaledArmor,
        },
        pilot: template.pilot,
        position: { ...spawn.position },
        hp: scaledMaxHp,
        en: template.mecha.maxEn,
        sp: template.pilot.maxSp,
        will: threatCfg.enemyStartWill,
        maxWill: combatConfig.will.max,
        ammoByWeaponId: buildAmmoMap(template.mecha),
        hasMoved: false,
        hasActed: false,
        activeSpirits: {
          valor: false,
          focus: false,
          ironWall: false,
        },
        installedUpgradeIds: [],
      };
    }
  );

  return [...alliedUnits, ...enemyUnits];
}
