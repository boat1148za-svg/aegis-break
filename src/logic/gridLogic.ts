import { combatConfig, getTerrainById } from './dataLoader';
import type {
  BattleUnit,
  Faction,
  GridPosition,
  StageMapData,
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
 * - Cannot enter non-walkable terrain (Obstacle).
 * - Cannot pass through opposing faction units.
 * - Can pass through allied units, but cannot end movement on an occupied tile.
 */
export function getReachableTiles(
  unit: BattleUnit,
  map: StageMapData,
  units: BattleUnit[]
): GridPosition[] {
  const maxSteps = unit.mecha.move;
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
 * Simple enemy AI movement: moves toward the nearest alive player unit
 * by selecting the reachable tile with the lowest Manhattan distance.
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

  const candidates = [enemy.position, ...getReachableTiles(enemy, map, units)];

  let bestTile = enemy.position;
  let minDistance = getManhattanDistance(
    enemy.position,
    nearestPlayer.position
  );

  for (const tile of candidates) {
    const dist = getManhattanDistance(tile, nearestPlayer.position);
    if (dist < minDistance) {
      minDistance = dist;
      bestTile = tile;
    }
  }

  return bestTile;
}

/**
 * Applies turn-start regeneration (auto EN regen + Base/Repair Zone HP & EN regen)
 * and resets `hasMoved` / `hasActed` for the active faction.
 */
export function prepareUnitsForPhaseStart(
  units: BattleUnit[],
  faction: Faction,
  map: StageMapData
): { units: BattleUnit[]; regenLogs: string[] } {
  const regenLogs: string[] = [];

  const updated = units.map((unit) => {
    if (unit.hp <= 0 || unit.faction !== faction) {
      return unit;
    }

    const terrainId = map.tiles[unit.position.row][unit.position.col];
    const terrain = getTerrainById(terrainId);

    const terrainHpGain = terrain
      ? Math.round((unit.mecha.maxHp * terrain.hpRegenPercent) / 100)
      : 0;
    const terrainEnGain = terrain
      ? Math.round((unit.mecha.maxEn * terrain.enRegenPercent) / 100)
      : 0;

    const nextHp = Math.min(unit.mecha.maxHp, unit.hp + terrainHpGain);
    const nextEn = Math.min(
      unit.mecha.maxEn,
      unit.en + combatConfig.enRegenPerTurn + terrainEnGain
    );

    if (terrain && (terrainHpGain > 0 || terrainEnGain > 0)) {
      regenLogs.push(
        `${unit.mecha.name} อยู่บน ${terrain.label}: ฟื้นฟู HP +${nextHp - unit.hp}, EN +${nextEn - unit.en}`
      );
    }

    return {
      ...unit,
      hp: nextHp,
      en: nextEn,
      hasMoved: false,
      hasActed: false,
    };
  });

  return { units: updated, regenLogs };
}
