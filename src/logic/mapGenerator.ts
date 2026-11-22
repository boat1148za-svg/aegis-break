import { stage1Map, unitDefinitions } from './dataLoader';
import type {
  BranchingMapNode,
  BranchingStageMap,
  EnemySpawnConfig,
  GridPosition,
  NodeType,
} from './types';

export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRandomSeed(): number {
  return Math.floor(100000 + Math.random() * 899999);
}

export function getDailyChallengeSeed(date: Date = new Date()): number {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  const d = date.getUTCDate();
  return y * 10000 + m * 100 + d;
}

const STAGE_TITLES: Record<1 | 2 | 3, string> = {
  1: 'STAGE 1 · OUTER COLONY PERIMETER',
  2: 'STAGE 2 · ORBITAL ASTRAL CORRIDOR',
  3: 'STAGE 3 · AEGIS CORE CITADEL',
};

const STAGE_BOSS_IDS: Record<1 | 2 | 3, string> = {
  1: 'enemy_boss_stage1_ares',
  2: 'enemy_boss_stage2_chronos',
  3: 'enemy_boss_dreadnought',
};

const BATTLE_TITLES: Record<1 | 2 | 3, Record<'standard' | 'elite', string[]>> = {
  1: {
    standard: [
      'Perimeter Patrol',
      'Outpost Skirmish',
      'Industrial Sector',
      'Colony Checkpoint',
    ],
    elite: ['Ares Vanguard', 'Heavy Garrison'],
  },
  2: {
    standard: [
      'Orbital Debris Field',
      'Satellite Defense Line',
      'Void Interceptor Bay',
      'Reactor Conduit',
    ],
    elite: ['Phantom Strike Team', 'Crimson Vanguard'],
  },
  3: {
    standard: [
      'Citadel Outer Wall',
      'Praetorian Gate',
      'Singularity Approach',
      'High-Guard Corridor',
    ],
    elite: ['Royal Praetorian', 'Dreadnought Guard'],
  },
};

function getValidEnemySpawnSlots(): GridPosition[] {
  const preferred: GridPosition[] = [
    { row: 1, col: 5 },
    { row: 2, col: 6 },
    { row: 1, col: 3 },
    { row: 3, col: 6 },
    { row: 0, col: 4 },
    { row: 2, col: 4 },
    { row: 4, col: 5 },
    { row: 1, col: 6 },
  ];
  return preferred.filter((pos) => {
    const tile = stage1Map.tiles[pos.row]?.[pos.col];
    return tile && tile !== 'obstacle';
  });
}

function buildEnemySpawns(
  stage: 1 | 2 | 3,
  floor: number,
  nodeType: NodeType,
  rng: () => number
): EnemySpawnConfig[] {
  const standards = unitDefinitions.filter(
    (u) => u.faction === 'enemy' && u.stage === stage && u.enemyRole === 'standard'
  );
  const elites = unitDefinitions.filter(
    (u) => u.faction === 'enemy' && u.stage === stage && u.enemyRole === 'elite'
  );
  const bossDef = unitDefinitions.find(
    (u) => u.instanceId === STAGE_BOSS_IDS[stage]
  );

  const slots = getValidEnemySpawnSlots();
  const pickSlot = (idx: number): GridPosition =>
    slots[idx % slots.length] ?? { row: 1, col: 5 };

  const suffixes = ['A', 'B', 'C', 'D'];
  const spawns: EnemySpawnConfig[] = [];

  if (nodeType === 'boss_battle' && bossDef) {
    spawns.push({
      templateId: bossDef.instanceId,
      labelSuffix: '',
      position: pickSlot(0),
    });

    const escortCount = stage === 1 ? 1 : stage === 2 ? 2 : 2;
    for (let i = 0; i < escortCount; i++) {
      const tpl =
        i === 0 && stage === 3 && elites.length > 0
          ? elites[0]
          : standards[Math.floor(rng() * standards.length)] ?? standards[0];
      if (!tpl) continue;
      spawns.push({
        templateId: tpl.instanceId,
        labelSuffix: i === 0 ? 'Guard' : suffixes[i],
        position: pickSlot(i + 1),
      });
    }
    return spawns;
  }

  if (nodeType === 'elite_battle' || nodeType === 'hard_battle') {
    const leader = elites[0] ?? standards[0];
    if (leader) {
      spawns.push({
        templateId: leader.instanceId,
        labelSuffix: '',
        position: pickSlot(0),
      });
    }
    const gruntCount = stage >= 2 || floor >= 4 ? 3 : 2;
    for (let i = 0; i < gruntCount; i++) {
      const tpl = standards[(i + Math.floor(rng() * standards.length)) % standards.length];
      if (!tpl) continue;
      spawns.push({
        templateId: tpl.instanceId,
        labelSuffix: suffixes[i],
        position: pickSlot(i + 1),
      });
    }
    return spawns;
  }

  // Standard battle: scales 2..4 enemies based on stage & floor depth
  const count =
    stage === 1
      ? floor <= 2
        ? 2
        : 3
      : stage === 2
        ? floor <= 2
          ? 3
          : 4
        : floor <= 1
          ? 3
          : 4;

  for (let i = 0; i < count; i++) {
    const tpl =
      standards[Math.floor(rng() * standards.length)] ?? standards[0];
    if (!tpl) continue;
    spawns.push({
      templateId: tpl.instanceId,
      labelSuffix: suffixes[i],
      position: pickSlot(i),
    });
  }
  return spawns;
}

function createNodeForFloor(
  stage: 1 | 2 | 3,
  floor: number,
  lane: number,
  laneCount: number,
  nodeType: NodeType,
  rng: () => number
): BranchingMapNode {
  const id = `s${stage}_f${floor}_l${lane}`;
  const nodeNumber = (stage - 1) * 6 + floor;

  if (nodeType === 'boss_battle') {
    const bossDef = unitDefinitions.find(
      (u) => u.instanceId === STAGE_BOSS_IDS[stage]
    );
    return {
      id,
      nodeNumber,
      stage,
      floor,
      lane,
      laneCount,
      nextNodeIds: [],
      title: bossDef?.mecha.name ?? `Stage ${stage} Boss`,
      type: 'boss_battle',
      typeLabel: `Stage ${stage} Boss`,
      description:
        bossDef?.description ??
        `ปะทะบอสประจำ Stage ${stage}: ${bossDef?.mecha.name ?? 'Boss'}`,
      enemySpawns: buildEnemySpawns(stage, floor, 'boss_battle', rng),
    };
  }

  if (nodeType === 'repair_supply') {
    return {
      id,
      nodeNumber,
      stage,
      floor,
      lane,
      laneCount,
      nextNodeIds: [],
      title: 'Forward Supply Depot',
      type: 'repair_supply',
      typeLabel: 'Repair & Supply',
      description: 'คลังเสบียงหน้าด่าน ซ่อมแซม HP/EN และฟื้นฟู SP เต็ม 100%',
      eventConfig: {
        repairHpPercent: 100,
        repairEnPercent: 100,
        restoreSpPercent: 100,
      },
    };
  }

  if (nodeType === 'repair_event') {
    return {
      id,
      nodeNumber,
      stage,
      floor,
      lane,
      laneCount,
      nextNodeIds: [],
      title: 'Tactical Sector Event',
      type: 'repair_event',
      typeLabel: 'Repair & Event',
      description: 'เหตุการณ์สุ่มกลางสมรภูมิ — ตัดสินใจรับโบนัสหรือซ่อมบำรุงหุ่น',
      eventConfig: {
        repairHpPercent: 50,
        repairEnPercent: 50,
        trainMaxWillBonus: 10,
        recruitAllyId: 'ally_support_mech',
      },
    };
  }

  const isElite = nodeType === 'elite_battle' || nodeType === 'hard_battle';
  const pool = isElite
    ? BATTLE_TITLES[stage].elite
    : BATTLE_TITLES[stage].standard;
  const title = pool[(lane + floor + Math.floor(rng() * pool.length)) % pool.length];
  const spawns = buildEnemySpawns(stage, floor, nodeType, rng);

  return {
    id,
    nodeNumber,
    stage,
    floor,
    lane,
    laneCount,
    nextNodeIds: [],
    title,
    type: nodeType,
    typeLabel: isElite ? 'Elite Battle' : 'Standard Battle',
    description: isElite
      ? `กองกำลังชั้นยอดประจำ Stage ${stage} (${spawns.length} เครื่อง)`
      : `การปะทะแนวรบ Stage ${stage} ชั้นที่ ${floor} (${spawns.length} เครื่อง)`,
    enemySpawns: spawns,
  };
}

function assignFloorTypes(
  floor: number,
  count: number,
  rng: () => number
): NodeType[] {
  if (floor === 1) {
    return Array.from({ length: count }, () => 'standard_battle');
  }
  if (floor === 5) {
    return Array.from({ length: count }, () => 'repair_supply');
  }
  if (floor === 6) {
    return ['boss_battle'];
  }

  // Floors 2–4: mix standard_battle, elite_battle, repair_event, repair_supply
  const middlePool: NodeType[] = [
    'standard_battle',
    'repair_event',
    'elite_battle',
    'repair_supply',
  ];
  const types: NodeType[] = [];

  for (let i = 0; i < count; i++) {
    const roll = rng();
    if (floor === 4 && i === 0) {
      types.push('elite_battle');
    } else if (floor === 2 && roll < 0.45) {
      types.push('standard_battle');
    } else if (roll < 0.38) {
      types.push('standard_battle');
    } else if (roll < 0.65) {
      types.push('repair_event');
    } else if (roll < 0.86) {
      types.push('elite_battle');
    } else {
      types.push(middlePool[Math.floor(rng() * middlePool.length)]);
    }
  }

  // Ensure Floor 2–4 always contains at least 1 combat node
  const hasCombat = types.some(
    (t) => t === 'standard_battle' || t === 'elite_battle'
  );
  if (!hasCombat && types.length > 0) {
    types[0] = 'standard_battle';
  }
  return types;
}

function connectConsecutiveFloors(
  currentFloor: BranchingMapNode[],
  nextFloor: BranchingMapNode[],
  rng: () => number
): void {
  if (nextFloor.length === 1) {
    for (const node of currentFloor) {
      node.nextNodeIds = [nextFloor[0].id];
    }
    return;
  }

  const incomingCounts = new Map<string, number>();
  for (const target of nextFloor) {
    incomingCounts.set(target.id, 0);
  }

  for (let i = 0; i < currentFloor.length; i++) {
    const node = currentFloor[i];
    const norm =
      currentFloor.length === 1 ? 0.5 : i / (currentFloor.length - 1);
    const rankedTargets = [...nextFloor].sort((a, b) => {
      const aNorm = nextFloor.length === 1 ? 0.5 : a.lane / (nextFloor.length - 1);
      const bNorm = nextFloor.length === 1 ? 0.5 : b.lane / (nextFloor.length - 1);
      return Math.abs(aNorm - norm) - Math.abs(bNorm - norm);
    });

    const selected = [rankedTargets[0]];
    if (rankedTargets.length > 1 && rng() < 0.58) {
      selected.push(rankedTargets[1]);
    }

    node.nextNodeIds = selected
      .sort((a, b) => a.lane - b.lane)
      .map((t) => {
        incomingCounts.set(t.id, (incomingCounts.get(t.id) ?? 0) + 1);
        return t.id;
      });
  }

  // Reachability post-pass: guarantee every node in nextFloor has >= 1 incoming edge
  for (const target of nextFloor) {
    if ((incomingCounts.get(target.id) ?? 0) > 0) continue;
    const tNorm =
      nextFloor.length === 1 ? 0.5 : target.lane / (nextFloor.length - 1);
    const nearestSource = [...currentFloor].sort((a, b) => {
      const aNorm =
        currentFloor.length === 1 ? 0.5 : a.lane / (currentFloor.length - 1);
      const bNorm =
        currentFloor.length === 1 ? 0.5 : b.lane / (currentFloor.length - 1);
      return Math.abs(aNorm - tNorm) - Math.abs(bNorm - tNorm);
    })[0];

    if (nearestSource && !nearestSource.nextNodeIds.includes(target.id)) {
      nearestSource.nextNodeIds.push(target.id);
      incomingCounts.set(target.id, 1);
    }
  }
}

export function generateStageMap(
  stage: 1 | 2 | 3,
  seed: number
): BranchingStageMap {
  const rng = mulberry32(seed + stage * 7919);
  const floors: BranchingMapNode[][] = [];
  const nodesById: Record<string, BranchingMapNode> = {};

  for (let floor = 1; floor <= 6; floor++) {
    const laneCount = floor === 6 ? 1 : rng() < 0.45 ? 2 : 3;
    const floorTypes = assignFloorTypes(floor, laneCount, rng);
    const floorNodes: BranchingMapNode[] = [];

    for (let lane = 0; lane < laneCount; lane++) {
      const node = createNodeForFloor(
        stage,
        floor,
        lane,
        laneCount,
        floorTypes[lane],
        rng
      );
      floorNodes.push(node);
      nodesById[node.id] = node;
    }

    floors.push(floorNodes);
  }

  for (let f = 0; f < floors.length - 1; f++) {
    connectConsecutiveFloors(floors[f], floors[f + 1], rng);
  }

  return {
    stage,
    stageTitle: STAGE_TITLES[stage],
    seed,
    floors,
    nodesById,
  };
}

export function getSelectableNodeIds(
  stageMap: BranchingStageMap,
  currentNodeId: string | null,
  clearedNodeIds: string[]
): Set<string> {
  const clearedSet = new Set(clearedNodeIds);
  if (!currentNodeId) {
    const firstFloor = stageMap.floors[0] ?? [];
    return new Set(
      firstFloor.filter((n) => !clearedSet.has(n.id)).map((n) => n.id)
    );
  }

  const currentNode = stageMap.nodesById[currentNodeId];
  if (!currentNode) return new Set();

  return new Set(
    currentNode.nextNodeIds.filter((id) => !clearedSet.has(id))
  );
}
