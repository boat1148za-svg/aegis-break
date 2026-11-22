import { getCombinedModifierEffects } from './dailyLogic';
import {
  cloneStageMap,
  combatConfig,
  getTerrainById,
  getUnitWeapons,
} from './dataLoader';
import type {
  BattleUnit,
  CardinalDirection,
  Faction,
  GridPosition,
  KnockbackResult,
  StageMapData,
  TerrainConfig,
  WeaponData,
} from './types';

const DIRECTIONS: readonly GridPosition[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

export function posKey(pos: GridPosition): string {
  return `${pos.row},${pos.col}`;
}

export function isInBounds(pos: GridPosition, map: StageMapData): boolean {
  return (
    pos.row >= 0 &&
    pos.row < map.rows &&
    pos.col >= 0 &&
    pos.col < map.cols
  );
}

export function getManhattanDistance(a: GridPosition, b: GridPosition): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function getUnitAt(
  pos: GridPosition,
  units: BattleUnit[]
): BattleUnit | undefined {
  return units.find(
    (u) => u.hp > 0 && u.position.row === pos.row && u.position.col === pos.col
  );
}

/**
 * BFS pathfinding to find all valid tiles a unit can move to within its `move` range.
 */
export function getReachableTiles(
  unit: BattleUnit,
  map: StageMapData,
  units: BattleUnit[]
): GridPosition[] {
  const maxSteps = unit.momentumMoveLimit ?? unit.mecha.move;
  const startKey = posKey(unit.position);
  const visited = new Map<string, number>([[startKey, 0]]);
  const queue: Array<{ pos: GridPosition; steps: number }> = [
    { pos: unit.position, steps: 0 },
  ];
  const reachable: GridPosition[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.steps >= maxSteps) continue;

    for (const dir of DIRECTIONS) {
      const next: GridPosition = {
        row: current.pos.row + dir.row,
        col: current.pos.col + dir.col,
      };
      if (!isInBounds(next, map)) continue;

      const terrainId = map.tiles[next.row][next.col];
      const terrain = getTerrainById(terrainId);
      if (!terrain?.walkable) continue;

      const occupant = getUnitAt(next, units);
      if (occupant && occupant.faction !== unit.faction) continue;

      const nextSteps = current.steps + 1;
      const key = posKey(next);
      const prevSteps = visited.get(key);
      if (prevSteps !== undefined && prevSteps <= nextSteps) continue;

      visited.set(key, nextSteps);
      queue.push({ pos: next, steps: nextSteps });

      if (!occupant) {
        reachable.push(next);
      }
    }
  }

  return reachable;
}

/**
 * Returns the 4-tile straight line for a MAP Weapon in a given cardinal direction.
 */
export function getMapLineTiles(
  origin: GridPosition,
  direction: CardinalDirection,
  length: number,
  map: StageMapData
): GridPosition[] {
  const dirVec: Record<CardinalDirection, GridPosition> = {
    up: { row: -1, col: 0 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 },
    right: { row: 0, col: 1 },
  };
  const step = dirVec[direction];
  const tiles: GridPosition[] = [];
  for (let i = 1; i <= length; i++) {
    const pos: GridPosition = {
      row: origin.row + step.row * i,
      col: origin.col + step.col * i,
    };
    if (!isInBounds(pos, map)) break;
    tiles.push(pos);
  }
  return tiles;
}

/**
 * Infers the closest cardinal direction from origin -> target tile.
 */
export function getCardinalDirectionTo(
  origin: GridPosition,
  target: GridPosition
): CardinalDirection | null {
  const dr = target.row - origin.row;
  const dc = target.col - origin.col;
  if (dr === 0 && dc === 0) return null;
  if (Math.abs(dr) >= Math.abs(dc)) {
    return dr < 0 ? 'up' : 'down';
  }
  return dc < 0 ? 'left' : 'right';
}

/**
 * Returns all tiles in a full horizontal row (1 row across the 8x8 grid) for a Boss/Elite Danger Zone.
 */
export function getDangerZoneRowTiles(
  row: number,
  map: StageMapData
): GridPosition[] {
  const tiles: GridPosition[] = [];
  if (row < 0 || row >= map.rows) return tiles;
  for (let col = 0; col < map.cols; col++) {
    tiles.push({ row, col });
  }
  return tiles;
}

export function getEffectiveWeaponRange(
  weapon: WeaponData,
  attackerTerrain?: TerrainConfig
): { minRange: number; maxRange: number } {
  const bonus =
    weapon.type === 'ranged' ? (attackerTerrain?.rangeBonus ?? 0) : 0;
  return {
    minRange: weapon.minRange,
    maxRange: weapon.maxRange + bonus,
  };
}

/**
 * Returns all grid tiles within [weapon.minRange, effective maxRange] (Manhattan distance).
 * High Ground grants +1 maxRange for Ranged weapons.
 */
export function getWeaponRangeTiles(
  origin: GridPosition,
  weapon: WeaponData,
  map: StageMapData
): GridPosition[] {
  const attackerTerrain = getTerrainById(map.tiles[origin.row]?.[origin.col]);
  const { minRange, maxRange } = getEffectiveWeaponRange(
    weapon,
    attackerTerrain
  );
  const tiles: GridPosition[] = [];
  for (let row = 0; row < map.rows; row++) {
    for (let col = 0; col < map.cols; col++) {
      const dist = getManhattanDistance(origin, { row, col });
      if (dist >= minRange && dist <= maxRange) {
        tiles.push({ row, col });
      }
    }
  }
  return tiles;
}

export function canUseWeapon(
  unit: BattleUnit,
  weapon: WeaponData
): { usable: boolean; reason?: string } {
  if (unit.en < weapon.enCost) {
    return { usable: false, reason: `EN ไม่พอ (ต้องการ ${weapon.enCost})` };
  }
  if (unit.will < weapon.willRequired) {
    return {
      usable: false,
      reason: `Will ไม่พอ (ต้องการ ${weapon.willRequired})`,
    };
  }
  if (weapon.ammo !== null) {
    const remaining = unit.ammoByWeaponId[weapon.id] ?? 0;
    if (remaining <= 0) {
      return { usable: false, reason: 'กระสุนหมด' };
    }
  }
  return { usable: true };
}

/**
 * Finds the highest-power usable weapon that can reach the target from the unit's position.
 */
export function findBestWeaponInRange(
  attacker: BattleUnit,
  target: BattleUnit,
  map?: StageMapData
): WeaponData | null {
  const attackerTerrain = map
    ? getTerrainById(map.tiles[attacker.position.row]?.[attacker.position.col])
    : undefined;
  const dist = getManhattanDistance(attacker.position, target.position);
  const available = getUnitWeapons(attacker).filter((weapon) => {
    const { minRange, maxRange } = getEffectiveWeaponRange(
      weapon,
      attackerTerrain
    );
    if (dist < minRange || dist > maxRange) return false;
    return canUseWeapon(attacker, weapon).usable;
  });

  if (available.length === 0) return null;
  available.sort((a, b) => b.power - a.power);
  return available[0];
}

/**
 * Enemy AI movement:
 * - Moves closer to the nearest alive player unit
 * - Strongly avoids ending turn on Plasma Hazard tiles
 * - Prioritizes High Ground vantage tiles for units with Ranged weapons
 */
export function chooseEnemyMoveTarget(
  enemy: BattleUnit,
  map: StageMapData,
  units: BattleUnit[]
): GridPosition {
  const playerUnits = units.filter((u) => u.faction === 'player' && u.hp > 0);
  if (playerUnits.length === 0) return enemy.position;

  let nearestPlayer = playerUnits[0];
  let bestTargetDist = getManhattanDistance(
    enemy.position,
    nearestPlayer.position
  );

  for (const player of playerUnits.slice(1)) {
    const dist = getManhattanDistance(enemy.position, player.position);
    if (dist < bestTargetDist) {
      bestTargetDist = dist;
      nearestPlayer = player;
    }
  }

  const enemyWeapons = getUnitWeapons(enemy);
  const hasRangedWeapon = enemyWeapons.some((w) => w.type === 'ranged');
  const maxRanged = Math.max(
    1,
    ...enemyWeapons.map((w) => w.maxRange)
  );
  const candidates = [enemy.position, ...getReachableTiles(enemy, map, units)];

  let bestTile = enemy.position;
  let bestScore = -Infinity;

  for (const tile of candidates) {
    const dist = getManhattanDistance(tile, nearestPlayer.position);
    const terrainId = map.tiles[tile.row]?.[tile.col] ?? 'normal';

    let score = -dist * 10;
    if (terrainId === 'plasma_hazard') {
      score -= 85;
    }
    if (hasRangedWeapon && terrainId === 'high_ground') {
      const hgBonusRange = maxRanged + 1;
      if (dist <= hgBonusRange) {
        score += 32;
      } else {
        score += 14;
      }
    }
    if (terrainId === 'repair_zone' && enemy.hp < enemy.mecha.maxHp) {
      score += 16;
    }
    // Slight preference to hold position on ties
    if (tile.row === enemy.position.row && tile.col === enemy.position.col) {
      score += 0.5;
    }

    if (score > bestScore) {
      bestScore = score;
      bestTile = tile;
    }
  }

  return bestTile;
}

/**
 * Hit & Away (Stage 2 Boss Chronos-Phantom): moves up to `maxSteps` tiles
 * away to maximize Manhattan distance from the nearest alive player unit.
 */
export function chooseHitAndAwayRetreatTile(
  unit: BattleUnit,
  maxSteps: number,
  map: StageMapData,
  units: BattleUnit[]
): GridPosition {
  const playerUnits = units.filter((u) => u.faction === 'player' && u.hp > 0);
  if (playerUnits.length === 0 || maxSteps <= 0) return unit.position;

  const minPlayerDist = (tile: GridPosition) =>
    Math.min(...playerUnits.map((p) => getManhattanDistance(tile, p.position)));

  const candidates = getReachableTiles(
    { ...unit, momentumMoveLimit: maxSteps },
    map,
    units
  );

  let bestTile = unit.position;
  let bestDist = minPlayerDist(unit.position);

  for (const tile of candidates) {
    const d = minPlayerDist(tile);
    if (d > bestDist) {
      bestDist = d;
      bestTile = tile;
    }
  }

  return bestTile;
}

export function computePlasmaHazardDamage(unit: BattleUnit): {
  nextHp: number;
  actualDamage: number;
} {
  if (unit.hp <= 0) return { nextHp: 0, actualDamage: 0 };
  const hazardCfg = getTerrainById('plasma_hazard');
  const pct = hazardCfg?.hazardDamagePercent ?? 10;
  const maxDmg = hazardCfg?.hazardMaxDamage ?? 450;
  const minHpRemaining = hazardCfg?.hazardMinHpRemaining ?? 1;

  const rawDamage = Math.min(
    maxDmg,
    Math.round((unit.mecha.maxHp * pct) / 100)
  );
  const nextHp = Math.max(minHpRemaining, unit.hp - rawDamage);
  return {
    nextHp,
    actualDamage: Math.max(0, unit.hp - nextHp),
  };
}

export interface ExplosiveDetonationResult {
  updatedMap: StageMapData;
  updatedUnits: BattleUnit[];
  detonatedPositions: GridPosition[];
  unitHits: Array<{
    unitId: string;
    name: string;
    position: GridPosition;
    damage: number;
    destroyed: boolean;
  }>;
}

/**
 * Resolves 3×3 AoE explosions for Explosive Cores with BFS chain-reaction
 * support and visited-key guard to prevent infinite loops.
 */
export function resolveExplosiveDetonation(
  initialCores: GridPosition[],
  map: StageMapData,
  allUnits: BattleUnit[]
): ExplosiveDetonationResult {
  const coreCfg = getTerrainById('explosive_core');
  const dmgPerBlast = coreCfg?.explosionDamage ?? 800;
  const radius = coreCfg?.explosionRadius ?? 1;

  const updatedMap = cloneStageMap(map);
  const detonatedKeys = new Set<string>();
  const queue: GridPosition[] = [];

  for (const pos of initialCores) {
    if (!isInBounds(pos, updatedMap)) continue;
    const key = posKey(pos);
    if (
      !detonatedKeys.has(key) &&
      updatedMap.tiles[pos.row][pos.col] === 'explosive_core'
    ) {
      detonatedKeys.add(key);
      queue.push({ ...pos });
    }
  }

  const detonatedPositions: GridPosition[] = [];
  const damageByUnitId = new Map<string, number>();

  while (queue.length > 0) {
    const corePos = queue.shift()!;
    updatedMap.tiles[corePos.row][corePos.col] = 'normal';
    detonatedPositions.push(corePos);

    for (let r = corePos.row - radius; r <= corePos.row + radius; r++) {
      for (let c = corePos.col - radius; c <= corePos.col + radius; c++) {
        if (!isInBounds({ row: r, col: c }, updatedMap)) continue;

        const key = posKey({ row: r, col: c });
        if (
          updatedMap.tiles[r][c] === 'explosive_core' &&
          !detonatedKeys.has(key)
        ) {
          detonatedKeys.add(key);
          queue.push({ row: r, col: c });
        }
      }
    }

    for (const unit of allUnits) {
      if (unit.hp <= 0) continue;
      const chebyshev = Math.max(
        Math.abs(unit.position.row - corePos.row),
        Math.abs(unit.position.col - corePos.col)
      );
      if (chebyshev <= radius) {
        damageByUnitId.set(
          unit.instanceId,
          (damageByUnitId.get(unit.instanceId) ?? 0) + dmgPerBlast
        );
      }
    }
  }

  const unitHits: ExplosiveDetonationResult['unitHits'] = [];
  const updatedUnits = allUnits.map((u) => {
    const totalDmg = damageByUnitId.get(u.instanceId) ?? 0;
    if (totalDmg <= 0 || u.hp <= 0) return u;
    const nextHp = Math.max(0, u.hp - totalDmg);
    unitHits.push({
      unitId: u.instanceId,
      name: u.mecha.name,
      position: { ...u.position },
      damage: totalDmg,
      destroyed: nextHp === 0,
    });
    return {
      ...u,
      hp: nextHp,
    };
  });

  return {
    updatedMap,
    updatedUnits,
    detonatedPositions,
    unitHits,
  };
}

/**
 * Resolves Knockback & Collision along a straight line from attacker -> target.
 * - Pushes target up to `knockbackDistance` tiles.
 * - If blocked by explosive_core: triggers 3×3 detonation + collision.
 * - If blocked by border, obstacle, or another unit: stops before blocker,
 *   deals collisionDamage (500) to target (and collided unit if any), and applies Stunned.
 * - If target finishes on plasma_hazard: applies immediate Plasma Hazard burn damage.
 */
export function resolveKnockback(
  attackerPos: GridPosition,
  targetId: string,
  knockbackDistance: number,
  map: StageMapData,
  allUnits: BattleUnit[]
): KnockbackResult {
  const target = allUnits.find((u) => u.instanceId === targetId);
  if (!target || target.hp <= 0 || knockbackDistance <= 0) {
    return {
      updatedUnits: allUnits,
      pushed: false,
      finalPosition: target?.position ?? attackerPos,
      stepsMoved: 0,
      collided: false,
      collisionType: 'none',
      collidedUnit: null,
      collisionDamage: 0,
      targetDestroyedByCollision: false,
      collidedUnitDestroyed: false,
      triggeredExplosivePos: null,
      landedOnHazard: false,
      hazardDamage: 0,
    };
  }

  const dr = target.position.row - attackerPos.row;
  const dc = target.position.col - attackerPos.col;
  const stepRow = Math.abs(dr) >= Math.abs(dc) ? Math.sign(dr) : 0;
  const stepCol = Math.abs(dr) >= Math.abs(dc) ? 0 : Math.sign(dc);

  let currentPos: GridPosition = { ...target.position };
  let stepsMoved = 0;
  let collided = false;
  let collisionType: KnockbackResult['collisionType'] = 'none';
  let collidedUnit: BattleUnit | null = null;
  let triggeredExplosivePos: GridPosition | null = null;

  for (let step = 0; step < knockbackDistance; step++) {
    const nextPos: GridPosition = {
      row: currentPos.row + stepRow,
      col: currentPos.col + stepCol,
    };

    if (!isInBounds(nextPos, map)) {
      collided = true;
      collisionType = 'border';
      break;
    }

    const terrainId = map.tiles[nextPos.row][nextPos.col];
    const terrain = getTerrainById(terrainId);
    if (!terrain?.walkable) {
      collided = true;
      collisionType = 'obstacle';
      if (terrainId === 'explosive_core') {
        triggeredExplosivePos = { ...nextPos };
      }
      break;
    }

    const occupant = getUnitAt(nextPos, allUnits);
    if (occupant && occupant.instanceId !== target.instanceId) {
      collided = true;
      collisionType = 'unit';
      collidedUnit = occupant;
      break;
    }

    currentPos = nextPos;
    stepsMoved += 1;
  }

  const collisionDamage = collided ? combatConfig.knockback.collisionDamage : 0;
  let targetDestroyedByCollision = false;
  let collidedUnitDestroyed = false;
  let landedOnHazard = false;
  let hazardDamage = 0;

  const updatedUnits = allUnits.map((u) => {
    if (u.instanceId === target.instanceId) {
      let nextHp = collided ? Math.max(0, u.hp - collisionDamage) : u.hp;
      if (collided && nextHp === 0) targetDestroyedByCollision = true;

      let nextUnit: BattleUnit = {
        ...u,
        position: { ...currentPos },
        hp: nextHp,
        stunned: collided ? true : u.stunned,
      };

      const endTerrainId = map.tiles[currentPos.row]?.[currentPos.col];
      if (nextHp > 0 && endTerrainId === 'plasma_hazard') {
        const burn = computePlasmaHazardDamage(nextUnit);
        if (burn.actualDamage > 0) {
          landedOnHazard = true;
          hazardDamage = burn.actualDamage;
          nextHp = burn.nextHp;
          nextUnit = { ...nextUnit, hp: nextHp };
        }
      }

      return nextUnit;
    }

    if (collided && collidedUnit && u.instanceId === collidedUnit.instanceId) {
      const nextHp = Math.max(0, u.hp - collisionDamage);
      if (nextHp === 0) collidedUnitDestroyed = true;
      return {
        ...u,
        hp: nextHp,
        stunned: true,
      };
    }

    return u;
  });

  return {
    updatedUnits,
    pushed: stepsMoved > 0 || collided,
    finalPosition: currentPos,
    stepsMoved,
    collided,
    collisionType,
    collidedUnit,
    collisionDamage,
    targetDestroyedByCollision,
    collidedUnitDestroyed,
    triggeredExplosivePos,
    landedOnHazard,
    hazardDamage,
  };
}

/**
 * Applies turn-start regeneration (auto EN regen + Base/Repair Zone HP & EN 10% regen),
 * handles Stunned turn-skip, and resets `hasMoved` / `hasActed` for the active faction.
 */
export function prepareUnitsForPhaseStart(
  units: BattleUnit[],
  faction: Faction,
  map: StageMapData,
  dailyModifierIds: string[] = []
): {
  units: BattleUnit[];
  regenLogs: string[];
  regenPopups: Array<{ position: GridPosition; text: string }>;
} {
  const regenLogs: string[] = [];
  const regenPopups: Array<{ position: GridPosition; text: string }> = [];
  const modEffects = getCombinedModifierEffects(dailyModifierIds);

  const updated = units.map((unit) => {
    if (unit.hp <= 0 || unit.faction !== faction) {
      return unit;
    }

    const terrainId = map.tiles[unit.position.row][unit.position.col];
    const terrain = getTerrainById(terrainId);

    const disableRepair =
      modEffects.disableBaseRepair && terrainId === 'repair_zone';
    const terrainHpGain =
      terrain && !disableRepair
        ? Math.round((unit.mecha.maxHp * terrain.hpRegenPercent) / 100)
        : 0;
    const terrainEnGain = terrain
      ? Math.round((unit.mecha.maxEn * terrain.enRegenPercent) / 100)
      : 0;

    let nextHp = Math.min(unit.mecha.maxHp, unit.hp + terrainHpGain);
    const nextEn = Math.min(
      unit.mecha.maxEn,
      unit.en +
        combatConfig.enRegenPerTurn +
        terrainEnGain +
        modEffects.extraEnRegen
    );

    const actualHpGain = nextHp - unit.hp;
    const actualEnGain = nextEn - unit.en;

    if (terrain && (terrain.hpRegenPercent > 0 || terrain.enRegenPercent > 0)) {
      if (actualHpGain > 0 || actualEnGain > 0) {
        regenLogs.push(
          `✚ ${unit.mecha.name} (${terrain.label}): ฟื้นฟู HP +${actualHpGain}, EN +${actualEnGain}`
        );
        const popupParts: string[] = [];
        if (actualHpGain > 0) popupParts.push(`+${actualHpGain} HP`);
        if (actualEnGain > 0) popupParts.push(`+${actualEnGain} EN`);
        regenPopups.push({
          position: { ...unit.position },
          text: popupParts.join(' '),
        });
      }
    }

    // Apply Plasma Hazard burn damage if standing on a plasma_hazard tile
    if (terrainId === 'plasma_hazard') {
      const burn = computePlasmaHazardDamage({ ...unit, hp: nextHp });
      if (burn.actualDamage > 0) {
        nextHp = burn.nextHp;
        regenLogs.push(
          `🔥 [Plasma Hazard] ${unit.mecha.name} โดนความร้อนจากบ่อพลาสมา -${burn.actualDamage} HP!`
        );
        regenPopups.push({
          position: { ...unit.position },
          text: `🔥 -${burn.actualDamage}`,
        });
      }
    }

    // If unit was Stunned from a Collision, skip this turn and clear Stunned
    if (unit.stunned) {
      regenLogs.push(
        `💫 ${unit.mecha.name} ติดสถานะ Stunned — ข้ามเทิร์นนี้!`
      );
      regenPopups.push({
        position: { ...unit.position },
        text: 'STUNNED!',
      });
      return {
        ...unit,
        hp: nextHp,
        en: nextEn,
        hasMoved: true,
        hasActed: true,
        stunned: false,
        activeSpirits: {
          ...unit.activeSpirits,
          focus: false,
          ironWall: false,
        },
      };
    }

    return {
      ...unit,
      hp: nextHp,
      en: nextEn,
      hasMoved: false,
      hasActed: false,
      momentumUsedThisTurn: false,
      momentumMoveLimit: null,
      overLimitActive: false,
      overLimitUsedThisTurn: false,
      activeSpirits: {
        ...unit.activeSpirits,
        focus: false,
        ironWall: false,
      },
    };
  });

  return { units: updated, regenLogs, regenPopups };
}

/**
 * Computes every grid coordinate (`"row,col"`) a single enemy can threaten
 * from its current tile or any reachable movement tile (including High Ground +1
 * ranged bonus and MAP weapon cardinal lines). Skips dead or stunned enemies.
 */
export function getEnemyThreatTiles(
  enemy: BattleUnit,
  map: StageMapData,
  units: BattleUnit[]
): Set<string> {
  const threatKeys = new Set<string>();
  if (enemy.hp <= 0 || enemy.stunned) {
    return threatKeys;
  }

  const usableWeapons = getUnitWeapons(enemy).filter(
    (w) => canUseWeapon(enemy, w).usable
  );
  if (usableWeapons.length === 0) {
    return threatKeys;
  }

  const candidateOrigins: GridPosition[] = [
    enemy.position,
    ...getReachableTiles(enemy, map, units),
  ];
  const cardinals: CardinalDirection[] = ['up', 'down', 'left', 'right'];

  for (const origin of candidateOrigins) {
    for (const weapon of usableWeapons) {
      if (weapon.is_map_weapon) {
        const length =
          weapon.mapLength ?? combatConfig.mapWeapon.defaultLineLength;
        for (const dir of cardinals) {
          for (const tile of getMapLineTiles(origin, dir, length, map)) {
            threatKeys.add(posKey(tile));
          }
        }
      } else {
        for (const tile of getWeaponRangeTiles(origin, weapon, map)) {
          threatKeys.add(posKey(tile));
        }
      }
    }
  }

  return threatKeys;
}
