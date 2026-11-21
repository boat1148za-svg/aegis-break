import { useEffect, useMemo, useRef, useState } from 'react';
import { AmbientBackdrop } from './AmbientBackdrop';
import { BattleForecastModal } from './BattleForecastModal';
import { BattleGrid, type CameraZoomState } from './BattleGrid';
import { BattleLogPanel } from './BattleLogPanel';
import type { CanvasParticleBurst } from './CanvasParticleOverlay';
import type { CombatVfxEvent } from './CombatVfxOverlay';
import { CounterAttackModal } from './CounterAttackModal';
import { FinisherCutIn, type CutInEvent } from './FinisherCutIn';
import { InstalledUpgradesBar } from './InstalledUpgradesBar';
import { SpiritMenuPanel } from './SpiritMenuPanel';
import { StatusHeader } from './StatusHeader';
import { UnitInfoPanel } from './UnitInfoPanel';
import { WeaponMenuPanel } from './WeaponMenuPanel';
import { audioEngine } from '../logic/audioEngine';
import {
  buildBattleForecast,
  buildCounterPrompt,
  resolveAttackStrike,
} from '../logic/combatCalculator';
import {
  combatConfig,
  createBattleUnitsForNode,
  getTerrainById,
  getUnitWeapons,
  stage1Map,
} from '../logic/dataLoader';
import { getThreatLevelConfig } from '../logic/metaLogic';
import {
  chooseEnemyMoveTarget,
  findBestWeaponInRange,
  getCardinalDirectionTo,
  getDangerZoneRowTiles,
  getManhattanDistance,
  getMapLineTiles,
  getReachableTiles,
  getUnitAt,
  getWeaponRangeTiles,
  posKey,
  prepareUnitsForPhaseStart,
  resolveKnockback,
} from '../logic/gridLogic';
import { applySpiritCommand } from '../logic/spiritLogic';
import {
  createInitialTurnState,
  transitionTurnState,
} from '../logic/turnStateMachine';
import type {
  BattleForecast,
  BattleUnit,
  CardinalDirection,
  CounterPromptData,
  DangerZoneState,
  DefenseAction,
  FloatingTextEvent,
  GridPosition,
  MetaProgressState,
  RunNodeData,
  RunPlayerState,
  SpiritCommandData,
  UnitAnimationType,
  WeaponData,
} from '../logic/types';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function formatCoord(pos: GridPosition): string {
  return `${COL_LABELS[pos.col]}${pos.row + 1}`;
}

interface PendingCounterSession {
  prompt: CounterPromptData;
  remainingEnemyIds: string[];
  workingUnits: BattleUnit[];
  nextTurnNumber: number;
}

interface BattleScreenProps {
  node: RunNodeData;
  runPlayer: RunPlayerState;
  meta: MetaProgressState;
  threatLevel: number;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onBattleVictory: (updatedPlayer: RunPlayerState) => void;
  onBattleDefeat: () => void;
}

export function BattleScreen({
  node,
  runPlayer,
  meta,
  threatLevel,
  bgmEnabled,
  sfxEnabled,
  onToggleBgm,
  onToggleSfx,
  onBattleVictory,
  onBattleDefeat,
}: BattleScreenProps) {
  const [turnState, setTurnState] = useState(createInitialTurnState);
  const [units, setUnits] = useState<BattleUnit[]>(() =>
    createBattleUnitsForNode(runPlayer, node, meta, threatLevel)
  );
  const [speedMultiplier, setSpeedMultiplier] = useState<1 | 2>(1);
  const [cutInEnabled, setCutInEnabled] = useState<boolean>(true);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [mapDirection, setMapDirection] = useState<CardinalDirection>('up');
  const [dangerZones, setDangerZones] = useState<DangerZoneState[]>([]);
  const [pendingForecast, setPendingForecast] = useState<BattleForecast | null>(
    null
  );
  const [pendingCounter, setPendingCounter] =
    useState<PendingCounterSession | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextEvent[]>([]);
  const [combatVfx, setCombatVfx] = useState<CombatVfxEvent[]>([]);
  const [canvasBursts, setCanvasBursts] = useState<CanvasParticleBurst[]>([]);
  const [cameraZoom, setCameraZoom] = useState<CameraZoomState | null>(null);
  const [hitstopUnitId, setHitstopUnitId] = useState<string | null>(null);
  const [activeCutIn, setActiveCutIn] = useState<CutInEvent | null>(null);
  const [momentumBanner, setMomentumBanner] = useState<string | null>(null);
  const [screenShake, setScreenShake] = useState(false);
  const [unitAnimations, setUnitAnimations] = useState<
    Record<string, UnitAnimationType>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `NODE ${node.nodeNumber}: ${node.title} (${node.typeLabel}) — Turn 1 PLAYER_PHASE`,
  ]);

  const timersRef = useRef<number[]>([]);
  const floatSeqRef = useRef(0);
  const zoomTokenRef = useRef(0);

  const scaledDelay = (ms: number) =>
    Math.max(40, Math.round(ms / speedMultiplier));

  const scheduleTimer = (fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, scaledDelay(delayMs));
    timersRef.current.push(id);
    return id;
  };

  const clearScheduledTimers = () => {
    for (const id of timersRef.current) {
      window.clearTimeout(id);
    }
    timersRef.current = [];
  };

  useEffect(() => {
    return () => clearScheduledTimers();
  }, []);

  // Safety Watchdog: prevents isBusy / cameraZoom / hitstop from ever locking during complex combos
  useEffect(() => {
    if (!isBusy || pendingCounter || pendingForecast) return;
    const watchdogMs = Math.round(4800 / speedMultiplier);
    const watchdogId = window.setTimeout(() => {
      setIsBusy(false);
      setCameraZoom(null);
      setHitstopUnitId(null);
      setActiveCutIn(null);
    }, watchdogMs);
    return () => window.clearTimeout(watchdogId);
  }, [isBusy, pendingCounter, pendingForecast, speedMultiplier]);

  const appendLog = (message: string) => {
    setLogs((prev) => [message, ...prev].slice(0, 40));
  };

  const triggerUnitAnimation = (unitId: string, type: UnitAnimationType) => {
    setUnitAnimations((prev) => ({ ...prev, [unitId]: type }));
    scheduleTimer(() => {
      setUnitAnimations((prev) => {
        if (prev[unitId] !== type) return prev;
        const copy = { ...prev };
        delete copy[unitId];
        return copy;
      });
    }, 520);
  };

  const spawnFloatingText = (
    position: GridPosition,
    text: string,
    variant: FloatingTextEvent['variant']
  ) => {
    const id = `ft-${++floatSeqRef.current}`;
    setFloatingTexts((prev) => [...prev, { id, position, text, variant }]);
    scheduleTimer(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1400);
  };

  const spawnCanvasBurst = (
    kind: CanvasParticleBurst['kind'],
    to: GridPosition,
    color: string,
    from?: GridPosition
  ) => {
    const id = `cb-${++floatSeqRef.current}`;
    setCanvasBursts((prev) => [...prev, { id, kind, from, to, color }]);
    scheduleTimer(() => {
      setCanvasBursts((prev) => prev.filter((b) => b.id !== id));
    }, 1100);
  };

  const triggerCombatZoom = (
    from: GridPosition,
    to: GridPosition,
    durationMs: number = 1050
  ) => {
    const token = ++zoomTokenRef.current;
    const midCol = (from.col + to.col) / 2;
    const midRow = (from.row + to.row) / 2;
    const originX = ((midCol + 0.5) / stage1Map.cols) * 100;
    const originY = ((midRow + 0.5) / stage1Map.rows) * 100;
    setCameraZoom({ originX, originY, scale: 1.25 });
    scheduleTimer(() => {
      if (zoomTokenRef.current === token) {
        setCameraZoom(null);
      }
    }, durationMs);
  };

  const spawnCombatVfx = (
    attacker: BattleUnit,
    defender: BattleUnit,
    weapon: WeaponData
  ) => {
    audioEngine.playSfx(weapon.type === 'ranged' ? 'beam' : 'slash');
    const id = `vfx-${++floatSeqRef.current}`;
    const color =
      attacker.faction === 'enemy'
        ? '#f43f5e'
        : weapon.willRequired >= 120 || attacker.activeSpirits.valor
          ? '#fbbf24'
          : weapon.armorBreakAmount
            ? '#10b981'
            : '#22d3ee';

    setCombatVfx((prev) => [
      ...prev,
      {
        id,
        weaponType: weapon.type,
        from: { ...attacker.position },
        to: { ...defender.position },
        color,
      },
    ]);
    if (weapon.type === 'ranged') {
      spawnCanvasBurst('beam', defender.position, color, attacker.position);
    }
    scheduleTimer(() => {
      setCombatVfx((prev) => prev.filter((item) => item.id !== id));
    }, 620);
  };

  const triggerFinisherCutIn = (
    attacker: BattleUnit,
    weapon: WeaponData,
    forceShow: boolean = false,
    bannerLabel?: string
  ) => {
    if (!cutInEnabled) return;
    if (!forceShow && weapon.willRequired < 120 && !attacker.activeSpirits.valor) {
      return;
    }
    const id = `cutin-${++floatSeqRef.current}`;
    setActiveCutIn({
      id,
      pilotId: attacker.pilot.id,
      pilotName: attacker.pilot.name,
      mechaId: attacker.mecha.id,
      mechaName: attacker.mecha.name,
      weaponName: weapon.name,
      faction: attacker.faction,
      bannerLabel,
    });
    scheduleTimer(() => {
      setActiveCutIn((prev) => (prev?.id === id ? null : prev));
    }, 1150);
  };

  const getFacingBetween = (
    from: GridPosition,
    to: GridPosition,
    fallback: 'left' | 'right' = 'right'
  ): 'left' | 'right' => {
    if (to.col < from.col) return 'left';
    if (to.col > from.col) return 'right';
    return fallback;
  };

  const checkBossPhase2Transition = (
    currentUnits: BattleUnit[]
  ): BattleUnit[] => {
    let triggeredBoss: BattleUnit | null = null;
    const updated = currentUnits.map((u) => {
      if (
        u.faction === 'enemy' &&
        u.mecha.id === 'overlord_dreadnought' &&
        u.hp > 0 &&
        !u.bossPhase2 &&
        (u.hp / u.mecha.maxHp) * 100 <=
          combatConfig.bossPhase2.hpThresholdPercent
      ) {
        triggeredBoss = { ...u, bossPhase2: true };
        return triggeredBoss;
      }
      return u;
    });

    if (triggeredBoss) {
      const boss: BattleUnit = triggeredBoss;
      setScreenShake(true);
      scheduleTimer(() => setScreenShake(false), 550);
      setActiveCutIn({
        id: `cutin-boss-p2-${++floatSeqRef.current}`,
        pilotId: boss.pilot.id,
        pilotName: boss.pilot.name,
        mechaId: boss.mecha.id,
        mechaName: boss.mecha.name,
        weaponName: 'OVERLORD PHASE 2 AWAKENING',
        faction: 'enemy',
        bannerLabel: '👹 BOSS PHASE 2 ROAR!',
      });
      scheduleTimer(() => setActiveCutIn(null), 1300);
      spawnFloatingText(boss.position, 'PHASE 2!', 'collision');
      appendLog(
        `👹 [BOSS PHASE 2] ${boss.mecha.name} คำรามเปลี่ยนร่างเข้าสู่ Phase 2!`
      );
    }

    return updated;
  };

  const triggerMomentumBanner = (mechaName: string) => {
    setMomentumBanner(`⚡ MOMENTUM! EXTRA ACTION — ${mechaName}`);
    scheduleTimer(() => setMomentumBanner(null), 1500);
  };

  const applyMomentumIfEligible = (
    attackerId: string,
    currentUnits: BattleUnit[]
  ): BattleUnit[] => {
    const unit = currentUnits.find((u) => u.instanceId === attackerId);
    const hasRemainingEnemies = currentUnits.some(
      (u) => u.faction === 'enemy' && u.hp > 0
    );
    if (
      !unit ||
      unit.faction !== 'player' ||
      unit.hp <= 0 ||
      unit.momentumUsedThisTurn ||
      !hasRemainingEnemies
    ) {
      return currentUnits;
    }

    triggerMomentumBanner(unit.mecha.name);
    appendLog(
      `⚡ MOMENTUM! EXTRA ACTION — ${unit.mecha.name} ทำลายศัตรูสำเร็จ! เดินต่อได้อีก ${combatConfig.momentum.bonusMoveSteps} ช่องและโจมตีซ้ำได้อีก 1 ครั้ง`
    );

    return currentUnits.map((u) =>
      u.instanceId === attackerId
        ? {
            ...u,
            hasMoved: false,
            hasActed: false,
            momentumUsedThisTurn: true,
            momentumMoveLimit: combatConfig.momentum.bonusMoveSteps,
          }
        : u
    );
  };

  const handleOverLimit = () => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      isBusy ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.overLimitUsedThisTurn
    ) {
      return;
    }

    const hpPct = (selectedUnit.hp / selectedUnit.mecha.maxHp) * 100;
    if (hpPct < combatConfig.overLimit.minHpThresholdPercent) return;

    const hpCost = Math.round(
      (selectedUnit.mecha.maxHp * combatConfig.overLimit.hpCostPercent) / 100
    );
    const nextHp = Math.max(1, selectedUnit.hp - hpCost);
    const nextEn = Math.min(
      selectedUnit.mecha.maxEn,
      selectedUnit.en + combatConfig.overLimit.enGain
    );
    const nextWill = Math.min(
      selectedUnit.maxWill,
      selectedUnit.will + combatConfig.overLimit.willGain
    );

    setUnits((prev) =>
      prev.map((u) =>
        u.instanceId === selectedUnit.instanceId
          ? {
              ...u,
              hp: nextHp,
              en: nextEn,
              will: nextWill,
              overLimitActive: true,
              overLimitUsedThisTurn: true,
            }
          : u
      )
    );

    setScreenShake(true);
    audioEngine.playSfx('spirit');
    scheduleTimer(() => setScreenShake(false), 500);
    spawnFloatingText(
      selectedUnit.position,
      `OVER-LIMIT! +${nextEn - selectedUnit.en} EN +${nextWill - selectedUnit.will} WILL`,
      'collision'
    );
    appendLog(
      `🔥 [OVER-LIMIT] ${selectedUnit.mecha.name} เร่งเตาปฏิกรณ์! เสีย HP -${selectedUnit.hp - nextHp} → ฟื้นฟู EN +${nextEn - selectedUnit.en}, Will +${nextWill - selectedUnit.will}`
    );
  };

  const applyKnockbackEffect = (
    attackerPos: GridPosition,
    targetId: string,
    weapon: WeaponData,
    currentUnits: BattleUnit[]
  ): BattleUnit[] => {
    if (!weapon.knockback || weapon.knockback <= 0) return currentUnits;

    const targetBefore = currentUnits.find((u) => u.instanceId === targetId);
    if (!targetBefore || targetBefore.hp <= 0) return currentUnits;

    const kb = resolveKnockback(
      attackerPos,
      targetId,
      weapon.knockback,
      stage1Map,
      currentUnits
    );

    if (kb.collided) {
      triggerUnitAnimation(targetId, 'hit');
      spawnFloatingText(
        kb.finalPosition,
        `COLLISION! -${kb.collisionDamage}`,
        'collision'
      );

      const blockerLabel =
        kb.collisionType === 'obstacle'
          ? 'สิ่งกีดขวาง'
          : kb.collisionType === 'border'
            ? 'ขอบสนาม'
            : kb.collidedUnit
              ? kb.collidedUnit.mecha.name
              : 'สิ่งกีดขวาง';

      appendLog(
        `💥 COLLISION! ${targetBefore.mecha.name} กระเด็นชน${blockerLabel} รับดาเมจเสริม ${kb.collisionDamage} และติดสถานะ Stunned!${
          kb.targetDestroyedByCollision ? ' — ถูกทำลาย!' : ''
        }`
      );

      if (kb.collidedUnit) {
        triggerUnitAnimation(kb.collidedUnit.instanceId, 'hit');
        spawnFloatingText(
          kb.collidedUnit.position,
          `COLLISION! -${kb.collisionDamage}`,
          'collision'
        );
        appendLog(
          `💥 ${kb.collidedUnit.mecha.name} ถูกชนเข้าอย่างจัง! รับดาเมจเสริม ${kb.collisionDamage} และติดสถานะ Stunned!${
            kb.collidedUnitDestroyed ? ' — ถูกทำลาย!' : ''
          }`
        );
      }
    } else if (kb.stepsMoved > 0) {
      appendLog(
        `💨 ${targetBefore.mecha.name} ถูกแรงกระแทกผลักถอยหลัง ${kb.stepsMoved} ช่อง → ${formatCoord(kb.finalPosition)}`
      );
    }

    return kb.updatedUnits;
  };

  const mainPlayerUnit = units.find((u) => u.isMainUnit);
  const alivePlayers = units.filter((u) => u.faction === 'player' && u.hp > 0);
  const aliveEnemies = units.filter((u) => u.faction === 'enemy' && u.hp > 0);
  const isMainDestroyed = mainPlayerUnit
    ? mainPlayerUnit.hp <= 0
    : alivePlayers.length === 0;
  const battleOutcome: 'victory' | 'defeat' | null = isMainDestroyed
    ? 'defeat'
    : aliveEnemies.length === 0
      ? 'victory'
      : null;

  const defeatTriggeredRef = useRef(false);
  useEffect(() => {
    if (battleOutcome === 'defeat' && !defeatTriggeredRef.current) {
      defeatTriggeredRef.current = true;
      const id = window.setTimeout(() => {
        onBattleDefeat();
      }, 850);
      return () => window.clearTimeout(id);
    }
  }, [battleOutcome, onBattleDefeat]);

  const selectedUnit = useMemo(
    () =>
      units.find(
        (u) => u.instanceId === turnState.selectedUnitId && u.hp > 0
      ) ?? null,
    [units, turnState.selectedUnitId]
  );

  const selectedWeapon = useMemo(() => {
    if (!selectedUnit || !selectedWeaponId) return null;
    return (
      getUnitWeapons(selectedUnit).find((w) => w.id === selectedWeaponId) ??
      null
    );
  }, [selectedUnit, selectedWeaponId]);

  const reachableTileKeys = useMemo(() => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.hasMoved ||
      selectedWeapon
    ) {
      return new Set<string>();
    }
    const tiles = getReachableTiles(selectedUnit, stage1Map, units);
    return new Set(tiles.map(posKey));
  }, [battleOutcome, turnState.phase, selectedUnit, selectedWeapon, units]);

  const mapPreviewTiles = useMemo(() => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.hasActed ||
      !selectedWeapon ||
      !selectedWeapon.is_map_weapon
    ) {
      return [] as GridPosition[];
    }
    const length =
      selectedWeapon.mapLength ?? combatConfig.mapWeapon.defaultLineLength;
    return getMapLineTiles(selectedUnit.position, mapDirection, length, stage1Map);
  }, [battleOutcome, turnState.phase, selectedUnit, selectedWeapon, mapDirection]);

  const mapPreviewTileKeys = useMemo(
    () => new Set(mapPreviewTiles.map(posKey)),
    [mapPreviewTiles]
  );

  const mapTargetCount = useMemo(
    () =>
      units.filter(
        (u) =>
          u.faction === 'enemy' &&
          u.hp > 0 &&
          mapPreviewTileKeys.has(posKey(u.position))
      ).length,
    [units, mapPreviewTileKeys]
  );

  const dangerZoneTileKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const dz of dangerZones) {
      for (const tile of dz.tiles) {
        keys.add(posKey(tile));
      }
    }
    return keys;
  }, [dangerZones]);

  const attackRangeTileKeys = useMemo(() => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.hasActed ||
      !selectedWeapon ||
      selectedWeapon.is_map_weapon
    ) {
      return new Set<string>();
    }
    const tiles = getWeaponRangeTiles(
      selectedUnit.position,
      selectedWeapon,
      stage1Map
    );
    return new Set(tiles.map(posKey));
  }, [battleOutcome, turnState.phase, selectedUnit, selectedWeapon]);

  const finishEnemyPhase = (
    currentUnits: BattleUnit[],
    nextTurnNumber: number
  ) => {
    scheduleTimer(() => {
      const stillHasPlayers = currentUnits.some(
        (u) => u.faction === 'player' && u.hp > 0
      );
      const stillHasEnemies = currentUnits.some(
        (u) => u.faction === 'enemy' && u.hp > 0
      );

      if (!stillHasPlayers || !stillHasEnemies) {
        setUnits(currentUnits);
        setIsBusy(false);
        return;
      }

      const playerPrep = prepareUnitsForPhaseStart(
        currentUnits,
        'player',
        stage1Map
      );
      setUnits(playerPrep.units);
      playerPrep.regenLogs.forEach((msg) => appendLog(msg));
      playerPrep.regenPopups.forEach((p) =>
        spawnFloatingText(
          p.position,
          p.text,
          p.text === 'STUNNED!' ? 'collision' : 'heal'
        )
      );

      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'END_ENEMY_PHASE' })
      );
      appendLog(`=== เริ่ม Turn ${nextTurnNumber} — PLAYER_PHASE ===`);
      setIsBusy(false);
    }, 500);
  };

  const processNextEnemy = (
    enemyQueue: string[],
    currentUnits: BattleUnit[],
    nextTurnNumber: number
  ) => {
    const alivePlayer = currentUnits.find(
      (u) => u.faction === 'player' && u.hp > 0
    );
    if (enemyQueue.length === 0 || !alivePlayer) {
      finishEnemyPhase(currentUnits, nextTurnNumber);
      return;
    }

    const [enemyId, ...restQueue] = enemyQueue;

    scheduleTimer(() => {
      const enemy = currentUnits.find((u) => u.instanceId === enemyId);
      if (!enemy || enemy.hp <= 0 || enemy.hasActed) {
        processNextEnemy(restQueue, currentUnits, nextTurnNumber);
        return;
      }

      const targetPos = chooseEnemyMoveTarget(enemy, stage1Map, currentUnits);
      const fromCoord = formatCoord(enemy.position);
      const toCoord = formatCoord(targetPos);

      const movedEnemy: BattleUnit = {
        ...enemy,
        position: { ...targetPos },
        facing: getFacingBetween(
          enemy.position,
          targetPos,
          enemy.facing ?? 'left'
        ),
        hasMoved: true,
      };
      const updatedUnits = currentUnits.map((u) =>
        u.instanceId === enemyId ? movedEnemy : u
      );
      setUnits(updatedUnits);

      if (fromCoord !== toCoord) {
        appendLog(
          `${movedEnemy.icon} ${movedEnemy.mecha.name} เคลื่อนที่เข้าหาเป้าหมาย ${fromCoord} → ${toCoord}`
        );
      }

      const aliveTargets = updatedUnits
        .filter((u) => u.faction === 'player' && u.hp > 0)
        .sort(
          (a, b) =>
            getManhattanDistance(movedEnemy.position, a.position) -
            getManhattanDistance(movedEnemy.position, b.position)
        );
      const playerTarget = aliveTargets[0];
      if (!playerTarget) {
        finishEnemyPhase(updatedUnits, nextTurnNumber);
        return;
      }

      // Elite & Boss Danger Zone Charge-Up Skill on odd turns (Telegraphs 1 full row!)
      if (
        movedEnemy.mecha.hasDangerZoneSkill &&
        movedEnemy.mecha.dangerZoneWeapon &&
        turnState.turnNumber % 2 === 1
      ) {
        const targetRow = playerTarget.position.row;
        const rowTiles = getDangerZoneRowTiles(targetRow, stage1Map);
        const newDz: DangerZoneState = {
          id: `dz-${movedEnemy.instanceId}-${turnState.turnNumber}`,
          casterId: movedEnemy.instanceId,
          casterName: movedEnemy.mecha.name,
          weapon: movedEnemy.mecha.dangerZoneWeapon,
          row: targetRow,
          tiles: rowTiles,
        };
        setDangerZones((prev) => [
          ...prev.filter((z) => z.casterId !== movedEnemy.instanceId),
          newDz,
        ]);
        spawnFloatingText(movedEnemy.position, 'CHARGING!', 'collision');
        appendLog(
          `⚠️ [DANGER ZONE] ${movedEnemy.mecha.name} กำลังชาร์จ ${movedEnemy.mecha.dangerZoneWeapon.name} เล็งแถวที่ ${
            targetRow + 1
          }! รีบหลบออกจากแถวสีแดงก่อนเทิร์นหน้าของศัตรู!`
        );
        const chargedUnits = updatedUnits.map((u) =>
          u.instanceId === movedEnemy.instanceId ? { ...u, hasActed: true } : u
        );
        setUnits(chargedUnits);
        processNextEnemy(restQueue, chargedUnits, nextTurnNumber);
        return;
      }

      const enemyWeapon = findBestWeaponInRange(movedEnemy, playerTarget);
      if (!enemyWeapon) {
        processNextEnemy(restQueue, updatedUnits, nextTurnNumber);
        return;
      }

      scheduleTimer(() => {
        const prompt = buildCounterPrompt(
          movedEnemy,
          playerTarget,
          enemyWeapon,
          stage1Map,
          updatedUnits
        );
        setTurnState((prev) =>
          transitionTurnState(prev, {
            type: 'SET_STEP',
            step: 'COUNTER_PROMPT',
          })
        );
        setPendingCounter({
          prompt,
          remainingEnemyIds: restQueue,
          workingUnits: updatedUnits,
          nextTurnNumber,
        });
      }, 380);
    }, 480);
  };

  const handleSelectDefenseAction = (action: DefenseAction) => {
    if (!pendingCounter) return;

    const { prompt, remainingEnemyIds, workingUnits, nextTurnNumber } =
      pendingCounter;
    const {
      enemy,
      player,
      enemyWeapon,
      playerCounterWeapon,
      supportDefender,
    } = prompt;

    setPendingCounter(null);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'SET_STEP', step: 'RESOLVING' })
    );

    // If Support Defense triggers, the adjacent higher-HP ally absorbs the hit with Defend (-50%)
    const actualDefender = supportDefender ?? player;
    const effectiveDefenseAction: DefenseAction = supportDefender
      ? 'defend'
      : action;

    const defenderTerrain =
      getTerrainById(
        stage1Map.tiles[actualDefender.position.row][
          actualDefender.position.col
        ]
      ) ?? getTerrainById('normal')!;

    triggerUnitAnimation(enemy.instanceId, 'attack');
    spawnCombatVfx(enemy, actualDefender, enemyWeapon);
    const enemyStrike = resolveAttackStrike(
      enemy,
      actualDefender,
      enemyWeapon,
      defenderTerrain,
      effectiveDefenseAction
    );

    const postEnemyStrikeAttacker: BattleUnit = {
      ...enemyStrike.updatedAttacker,
      hasActed: true,
    };
    const postEnemyStrikeActualDefender = enemyStrike.updatedDefender;
    const postEnemyStrikePlayer = supportDefender
      ? player
      : postEnemyStrikeActualDefender;

    let latestUnits = workingUnits.map((u) => {
      if (u.instanceId === postEnemyStrikeAttacker.instanceId) {
        return postEnemyStrikeAttacker;
      }
      if (u.instanceId === postEnemyStrikeActualDefender.instanceId) {
        return postEnemyStrikeActualDefender;
      }
      return u;
    });
    setUnits(latestUnits);

    const actionLabel = supportDefender
      ? ` [🛡️ Support Defense โดย ${supportDefender.mecha.name} -50%]`
      : action === 'defend'
        ? ' [ป้องกัน -50%]'
        : action === 'evade'
          ? ' [หลบหลีก +30%]'
          : '';

    if (enemyStrike.hit) {
      triggerUnitAnimation(actualDefender.instanceId, 'hit');
      spawnFloatingText(
        actualDefender.position,
        enemyStrike.destroyed
          ? `-${enemyStrike.damage.toLocaleString()} 💥`
          : `-${enemyStrike.damage.toLocaleString()}`,
        enemyStrike.destroyed ? 'destroyed' : 'damage'
      );
      appendLog(
        `🔥 ${enemy.mecha.name} ใช้ ${enemyWeapon.name} โจมตี ${actualDefender.mecha.name}${actionLabel} ทำดาเมจ ${enemyStrike.damage.toLocaleString()} (Hit ${enemyStrike.hitRate}%)`
      );
      if (!enemyStrike.destroyed && enemyWeapon.knockback) {
        latestUnits = applyKnockbackEffect(
          enemy.position,
          actualDefender.instanceId,
          enemyWeapon,
          latestUnits
        );
        setUnits(latestUnits);
      }
    } else {
      triggerUnitAnimation(actualDefender.instanceId, 'evade');
      spawnFloatingText(actualDefender.position, 'MISS', 'miss');
      appendLog(
        `💨 ${enemy.mecha.name} ใช้ ${enemyWeapon.name} โจมตี ${actualDefender.mecha.name}${actionLabel} — MISS! (Hit ${enemyStrike.hitRate}%)`
      );
    }

    if (
      action === 'counter' &&
      postEnemyStrikePlayer.hp > 0 &&
      playerCounterWeapon
    ) {
      scheduleTimer(() => {
        const enemyTerrain =
          getTerrainById(
            stage1Map.tiles[postEnemyStrikeAttacker.position.row][
              postEnemyStrikeAttacker.position.col
            ]
          ) ?? getTerrainById('normal')!;

        triggerUnitAnimation(postEnemyStrikePlayer.instanceId, 'attack');
        spawnCombatVfx(
          postEnemyStrikePlayer,
          postEnemyStrikeAttacker,
          playerCounterWeapon
        );
        const counterResult = resolveAttackStrike(
          postEnemyStrikePlayer,
          postEnemyStrikeAttacker,
          playerCounterWeapon,
          enemyTerrain,
          'counter',
          Math.random(),
          true
        );

        latestUnits = latestUnits.map((u) => {
          if (u.instanceId === counterResult.updatedAttacker.instanceId) {
            return counterResult.updatedAttacker;
          }
          if (u.instanceId === counterResult.updatedDefender.instanceId) {
            return counterResult.updatedDefender;
          }
          return u;
        });
        setUnits(latestUnits);

        if (counterResult.hit) {
          triggerUnitAnimation(postEnemyStrikeAttacker.instanceId, 'hit');
          spawnFloatingText(
            postEnemyStrikeAttacker.position,
            counterResult.destroyed
              ? `-${counterResult.damage.toLocaleString()} 💥`
              : `-${counterResult.damage.toLocaleString()}`,
            counterResult.destroyed ? 'destroyed' : 'damage'
          );
          appendLog(
            `⚔️ ${postEnemyStrikePlayer.mecha.name} สวนกลับด้วย ${playerCounterWeapon.name} ใส่ ${postEnemyStrikeAttacker.mecha.name} ทำดาเมจ ${counterResult.damage.toLocaleString()} (Hit ${counterResult.hitRate}%)${
              counterResult.destroyed ? ' — ทำลายเป้าหมาย!' : ''
            }`
          );
          if (counterResult.vampireHealed > 0) {
            spawnFloatingText(
              postEnemyStrikePlayer.position,
              `+${counterResult.vampireHealed.toLocaleString()} HP`,
              'heal'
            );
            appendLog(
              `🩸 Vampire Reactor: ${postEnemyStrikePlayer.mecha.name} ฟื้นฟู HP +${counterResult.vampireHealed.toLocaleString()}`
            );
          }
          if (!counterResult.destroyed && playerCounterWeapon.knockback) {
            latestUnits = applyKnockbackEffect(
              postEnemyStrikePlayer.position,
              postEnemyStrikeAttacker.instanceId,
              playerCounterWeapon,
              latestUnits
            );
            setUnits(latestUnits);
          }
        } else {
          triggerUnitAnimation(postEnemyStrikeAttacker.instanceId, 'evade');
          spawnFloatingText(postEnemyStrikeAttacker.position, 'MISS', 'miss');
          appendLog(
            `💨 ${postEnemyStrikePlayer.mecha.name} สวนกลับด้วย ${playerCounterWeapon.name} — MISS! (Hit ${counterResult.hitRate}%)`
          );
        }

        scheduleTimer(() => {
          processNextEnemy(remainingEnemyIds, latestUnits, nextTurnNumber);
        }, 650);
      }, 650);
    } else {
      scheduleTimer(() => {
        processNextEnemy(remainingEnemyIds, latestUnits, nextTurnNumber);
      }, 650);
    }
  };

  const handleTileClick = (pos: GridPosition) => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      isBusy ||
      pendingForecast ||
      pendingCounter
    ) {
      return;
    }

    const clickedKey = posKey(pos);
    const clickedUnit = getUnitAt(pos, units);

    // 0. MAP Weapon aiming / firing by clicking on the grid
    if (
      selectedUnit &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed &&
      selectedWeapon &&
      selectedWeapon.is_map_weapon
    ) {
      if (mapPreviewTileKeys.has(clickedKey)) {
        handleFireMapWeapon();
        return;
      }
      const nextDir = getCardinalDirectionTo(selectedUnit.position, pos);
      if (nextDir) {
        setMapDirection(nextDir);
        return;
      }
    }

    if (
      selectedUnit &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasActed &&
      selectedWeapon &&
      attackRangeTileKeys.has(clickedKey) &&
      clickedUnit &&
      clickedUnit.faction === 'enemy'
    ) {
      const forecast = buildBattleForecast(
        selectedUnit,
        clickedUnit,
        selectedWeapon,
        stage1Map,
        units
      );
      setPendingForecast(forecast);
      return;
    }

    if (
      selectedUnit &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasMoved &&
      !selectedWeapon &&
      reachableTileKeys.has(clickedKey)
    ) {
      const fromCoord = formatCoord(selectedUnit.position);
      const toCoord = formatCoord(pos);

      setUnits((prev) =>
        prev.map((u) =>
          u.instanceId === selectedUnit.instanceId
            ? {
                ...u,
                position: { ...pos },
                facing: getFacingBetween(
                  selectedUnit.position,
                  pos,
                  selectedUnit.facing ?? 'right'
                ),
                hasMoved: true,
              }
            : u
        )
      );
      appendLog(
        `${selectedUnit.icon} ${selectedUnit.mecha.name} เคลื่อนที่ ${fromCoord} → ${toCoord}`
      );
      return;
    }

    if (clickedUnit) {
      setSelectedWeaponId(null);
      if (clickedUnit.instanceId === turnState.selectedUnitId) {
        setTurnState((prev) =>
          transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
        );
      } else {
        setTurnState((prev) =>
          transitionTurnState(prev, {
            type: 'SELECT_UNIT',
            unitId: clickedUnit.instanceId,
          })
        );
      }
      return;
    }

    if (selectedWeaponId) {
      setSelectedWeaponId(null);
    } else if (turnState.selectedUnitId) {
      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
      );
    }
  };

  const handleSelectWeapon = (weapon: WeaponData) => {
    if (!selectedUnit || selectedUnit.hasActed) return;
    setSelectedWeaponId(weapon.id);
    if (weapon.is_map_weapon) {
      // Auto-orient MAP line toward nearest alive enemy for convenience
      const nearestEnemy = units
        .filter((u) => u.faction === 'enemy' && u.hp > 0)
        .sort(
          (a, b) =>
            getManhattanDistance(selectedUnit.position, a.position) -
            getManhattanDistance(selectedUnit.position, b.position)
        )[0];
      if (nearestEnemy) {
        const dir = getCardinalDirectionTo(
          selectedUnit.position,
          nearestEnemy.position
        );
        if (dir) setMapDirection(dir);
      }
    }
  };

  const handleFireMapWeapon = () => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      isBusy ||
      !selectedUnit ||
      !selectedWeapon ||
      !selectedWeapon.is_map_weapon ||
      selectedUnit.hasActed ||
      mapPreviewTiles.length === 0
    ) {
      return;
    }

    const caster = selectedUnit;
    const weapon = selectedWeapon;
    const affectedKeys = new Set(mapPreviewTiles.map(posKey));
    const targets = units.filter(
      (u) =>
        u.faction === 'enemy' &&
        u.hp > 0 &&
        affectedKeys.has(posKey(u.position))
    );

    setSelectedWeaponId(null);
    setIsBusy(true);

    // Cut-in + Wide MAP Beam VFX down the entire 4-tile line
    triggerFinisherCutIn(caster, weapon, true);
    triggerUnitAnimation(caster.instanceId, 'attack');
    const furthestTile = mapPreviewTiles[mapPreviewTiles.length - 1];
    const vfxId = `vfx-map-${++floatSeqRef.current}`;
    setCombatVfx((prev) => [
      ...prev,
      {
        id: vfxId,
        weaponType: 'ranged',
        from: { ...caster.position },
        to: { ...furthestTile },
        color: '#e879f9',
      },
    ]);
    scheduleTimer(() => {
      setCombatVfx((prev) => prev.filter((item) => item.id !== vfxId));
    }, 700);

    // Deduct EN once and mark unit acted
    let updatedCaster: BattleUnit = {
      ...caster,
      en: Math.max(0, caster.en - weapon.enCost),
      hasMoved: true,
      hasActed: true,
    };

    let nextUnits = units.map((u) =>
      u.instanceId === updatedCaster.instanceId ? updatedCaster : u
    );

    if (targets.length === 0) {
      appendLog(
        `🌟 [MAP] ${caster.mecha.name} ยิง ${weapon.name} (-${weapon.enCost} EN) แต่ไม่มีศัตรูในเส้นทาง 4 ช่อง`
      );
    } else {
      appendLog(
        `🌟 [MAP] ${caster.mecha.name} ยิง ${weapon.name} (-${weapon.enCost} EN) โจมตีพื้นที่ 4 ช่อง (ศัตรูไม่สามารถสวนกลับได้)!`
      );

      for (const target of targets) {
        const defenderTerrain =
          getTerrainById(
            stage1Map.tiles[target.position.row][target.position.col]
          ) ?? getTerrainById('normal')!;

        const res = resolveAttackStrike(
          updatedCaster,
          target,
          weapon,
          defenderTerrain,
          'counter',
          Math.random(),
          false,
          1,
          true
        );

        // Preserve Valor across all targets in the same MAP blast, then clear after loop
        updatedCaster = {
          ...res.updatedAttacker,
          activeSpirits: updatedCaster.activeSpirits,
          hasMoved: true,
          hasActed: true,
        };

        nextUnits = nextUnits.map((u) => {
          if (u.instanceId === updatedCaster.instanceId) return updatedCaster;
          if (u.instanceId === res.updatedDefender.instanceId) {
            return res.updatedDefender;
          }
          return u;
        });

        if (res.hit) {
          triggerUnitAnimation(target.instanceId, 'hit');
          const critPrefix = res.isCrit ? 'CRIT! ' : '';
          spawnFloatingText(
            target.position,
            res.destroyed
              ? `${critPrefix}-${res.damage.toLocaleString()} 💥`
              : `${critPrefix}-${res.damage.toLocaleString()}`,
            res.destroyed ? 'destroyed' : 'damage'
          );
          appendLog(
            `💥 ${target.mecha.name} โดน ${weapon.name} ทำดาเมจ ${res.damage.toLocaleString()} (Hit ${res.hitRate}%)${
              res.destroyed ? ' — ทำลายเป้าหมาย!' : ''
            }`
          );
          if (res.vampireHealed > 0) {
            spawnFloatingText(
              updatedCaster.position,
              `+${res.vampireHealed.toLocaleString()} HP`,
              'heal'
            );
          }
        } else {
          triggerUnitAnimation(target.instanceId, 'evade');
          spawnFloatingText(target.position, 'MISS', 'miss');
          appendLog(`💨 ${target.mecha.name} หลบ ${weapon.name} พ้น!`);
        }
      }

      // Consume Valor after MAP Weapon finishes hitting all targets
      nextUnits = nextUnits.map((u) =>
        u.instanceId === updatedCaster.instanceId
          ? { ...u, activeSpirits: { ...u.activeSpirits, valor: false } }
          : u
      );

      // Chain-Kill Momentum if MAP weapon destroyed at least 1 enemy!
      const destroyedAny = targets.some((t) => {
        const after = nextUnits.find((u) => u.instanceId === t.instanceId);
        return after && after.hp <= 0;
      });
      if (destroyedAny) {
        nextUnits = applyMomentumIfEligible(updatedCaster.instanceId, nextUnits);
      }
    }

    nextUnits = checkBossPhase2Transition(nextUnits);
    setUnits(nextUnits);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
    );
    scheduleTimer(() => setIsBusy(false), 650);
  };

  const handleCastSpirit = (spirit: SpiritCommandData) => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      isBusy ||
      !selectedUnit ||
      selectedUnit.faction !== 'player'
    ) {
      return;
    }

    const result = applySpiritCommand(selectedUnit, spirit, units);
    audioEngine.playSfx('spirit');
    setUnits(result.updatedUnits);
    appendLog(result.logMessage);
    if (result.popup) {
      spawnFloatingText(
        result.popup.position,
        result.popup.text,
        result.popup.variant
      );
    }
  };

  const handleRepairAlly = (targetAlly: BattleUnit) => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      isBusy ||
      !selectedUnit ||
      !selectedUnit.mecha.repairSkill ||
      selectedUnit.hasActed
    ) {
      return;
    }

    const skill = selectedUnit.mecha.repairSkill;
    if (selectedUnit.en < skill.enCost) return;

    const rawHeal = Math.round(
      (targetAlly.mecha.maxHp * skill.healPercent) / 100
    );
    const nextHp = Math.min(targetAlly.mecha.maxHp, targetAlly.hp + rawHeal);
    const actualHeal = nextHp - targetAlly.hp;

    setUnits((prev) =>
      prev.map((u) => {
        if (u.instanceId === selectedUnit.instanceId) {
          return {
            ...u,
            en: Math.max(0, u.en - skill.enCost),
            hasMoved: true,
            hasActed: true,
          };
        }
        if (u.instanceId === targetAlly.instanceId) {
          return { ...u, hp: nextHp };
        }
        return u;
      })
    );

    spawnFloatingText(
      targetAlly.position,
      `+${actualHeal.toLocaleString()} HP`,
      'heal'
    );
    appendLog(
      `🚑 ${selectedUnit.mecha.name} ใช้ ${skill.name} ซ่อมแซม ${targetAlly.mecha.name} ฟื้นฟู +${actualHeal.toLocaleString()} HP (-${skill.enCost} EN)`
    );
    setSelectedWeaponId(null);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
    );
  };

  const handleWaitUnit = () => {
    if (!selectedUnit || selectedUnit.faction !== 'player') return;
    setUnits((prev) =>
      prev.map((u) =>
        u.instanceId === selectedUnit.instanceId
          ? { ...u, hasMoved: true, hasActed: true }
          : u
      )
    );
    appendLog(`${selectedUnit.icon} ${selectedUnit.mecha.name} รอ (Wait)`);
    setSelectedWeaponId(null);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
    );
  };

  const handleConfirmAttack = () => {
    if (!pendingForecast) return;

    const { attacker, defender, attackerWeapon, supportAttack } =
      pendingForecast;
    setPendingForecast(null);
    setSelectedWeaponId(null);
    setIsBusy(true);

    const defenderTerrain =
      getTerrainById(
        stage1Map.tiles[defender.position.row][defender.position.col]
      ) ?? getTerrainById('normal')!;

    // 1. Primary Player Attack with Dynamic 1.25x Combat Zoom & 80ms Hitstop!
    triggerCombatZoom(attacker.position, defender.position, 1150);
    triggerFinisherCutIn(attacker, attackerWeapon);
    triggerUnitAnimation(attacker.instanceId, 'attack');
    spawnCombatVfx(attacker, defender, attackerWeapon);

    const attackResult = resolveAttackStrike(
      attacker,
      defender,
      attackerWeapon,
      defenderTerrain,
      'counter'
    );

    const executePrimaryImpact = () => {
      setHitstopUnitId(null);

      const finishedAttacker: BattleUnit = {
        ...attackResult.updatedAttacker,
        hasMoved: true,
        hasActed: true,
      };
      let latestDefender = attackResult.updatedDefender;

      let workingUnitsAfterAttack = units.map((u) => {
        if (u.instanceId === finishedAttacker.instanceId) {
          return finishedAttacker;
        }
        if (u.instanceId === latestDefender.instanceId) {
          return latestDefender;
        }
        return u;
      });

      if (attackResult.hit) {
        audioEngine.playSfx(attackResult.destroyed ? 'explosion' : 'hit');
        triggerUnitAnimation(defender.instanceId, 'hit');
        spawnCanvasBurst(
          attackResult.destroyed ? 'explosion' : 'impact',
          defender.position,
          attackResult.destroyed ? '#f97316' : '#38bdf8'
        );
        const critPrefix = attackResult.isCrit ? 'CRIT! ' : '';
        spawnFloatingText(
          defender.position,
          attackResult.destroyed
            ? `${critPrefix}-${attackResult.damage.toLocaleString()} 💥`
            : `${critPrefix}-${attackResult.damage.toLocaleString()}`,
          attackResult.destroyed ? 'destroyed' : 'damage'
        );
        appendLog(
          `⚔️ ${attacker.mecha.name} ใช้ ${attackerWeapon.name} โจมตี ${defender.mecha.name}${
            attackResult.isCrit ? ' ⚡CRITICAL!' : ''
          } ทำดาเมจ ${attackResult.damage.toLocaleString()} (Hit ${attackResult.hitRate}%)${
            attackResult.destroyed ? ' — ทำลายเป้าหมาย!' : ''
          }`
        );
        if (attackResult.armorBroken > 0) {
          appendLog(
            `🧪 เกราะของ ${defender.mecha.name} ลดลง -${attackResult.armorBroken} (เหลือ ${latestDefender.mecha.armor})`
          );
        }
        if (attackResult.vampireHealed > 0) {
          spawnFloatingText(
            attacker.position,
            `+${attackResult.vampireHealed.toLocaleString()} HP`,
            'heal'
          );
          appendLog(
            `🩸 Vampire Reactor: ${attacker.mecha.name} ฟื้นฟู HP +${attackResult.vampireHealed.toLocaleString()}`
          );
        }
      } else {
        triggerUnitAnimation(defender.instanceId, 'evade');
        spawnFloatingText(defender.position, 'MISS', 'miss');
        appendLog(
          `💨 ${attacker.mecha.name} ใช้ ${attackerWeapon.name} โจมตี ${defender.mecha.name} — MISS! (Hit ${attackResult.hitRate}%)`
        );
      }

      if (
        attackResult.hit &&
        !attackResult.destroyed &&
        attackerWeapon.knockback
      ) {
        workingUnitsAfterAttack = applyKnockbackEffect(
          attacker.position,
          latestDefender.instanceId,
          attackerWeapon,
          workingUnitsAfterAttack
        );
        latestDefender =
          workingUnitsAfterAttack.find(
            (u) => u.instanceId === latestDefender.instanceId
          ) ?? latestDefender;
      }

      if (attackResult.mobilityDebuffed > 0) {
        appendLog(
          `⚡ EMP Disruptor ลด Mobility ของ ${defender.mecha.name} ลง -${attackResult.mobilityDebuffed} (เหลือ ${latestDefender.mecha.mobility})`
        );
      }

      if (latestDefender.hp <= 0) {
        workingUnitsAfterAttack = applyMomentumIfEligible(
          finishedAttacker.instanceId,
          workingUnitsAfterAttack
        );
      }

      workingUnitsAfterAttack = workingUnitsAfterAttack.map((u) => {
        if (u.instanceId === finishedAttacker.instanceId) {
          return {
            ...u,
            facing: getFacingBetween(
              attacker.position,
              defender.position,
              u.facing ?? 'right'
            ),
          };
        }
        if (u.instanceId === latestDefender.instanceId) {
          return {
            ...u,
            facing: getFacingBetween(
              defender.position,
              attacker.position,
              u.facing ?? 'left'
            ),
          };
        }
        return u;
      });
      workingUnitsAfterAttack = checkBossPhase2Transition(
        workingUnitsAfterAttack
      );

      setUnits(workingUnitsAfterAttack);
      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
      );

      const triggerEnemyCounterIfAlive = (defenderState: BattleUnit) => {
        const counterWeapon =
          defenderState.hp > 0
            ? findBestWeaponInRange(defenderState, finishedAttacker)
            : null;

        if (!counterWeapon) {
          scheduleTimer(() => setIsBusy(false), 450);
          return;
        }

        scheduleTimer(() => {
          const attackerTerrain =
            getTerrainById(
              stage1Map.tiles[finishedAttacker.position.row][
                finishedAttacker.position.col
              ]
            ) ?? getTerrainById('normal')!;

          triggerUnitAnimation(defenderState.instanceId, 'attack');
          spawnCombatVfx(defenderState, finishedAttacker, counterWeapon);
          const counterResult = resolveAttackStrike(
            defenderState,
            finishedAttacker,
            counterWeapon,
            attackerTerrain,
            'counter'
          );

          setUnits((prev) =>
            prev.map((u) => {
              if (u.instanceId === counterResult.updatedAttacker.instanceId) {
                return counterResult.updatedAttacker;
              }
              if (u.instanceId === counterResult.updatedDefender.instanceId) {
                return counterResult.updatedDefender;
              }
              return u;
            })
          );

          if (counterResult.hit) {
            triggerUnitAnimation(finishedAttacker.instanceId, 'hit');
            spawnCanvasBurst(
              counterResult.destroyed ? 'explosion' : 'impact',
              finishedAttacker.position,
              '#f43f5e'
            );
            spawnFloatingText(
              finishedAttacker.position,
              counterResult.destroyed
                ? `-${counterResult.damage.toLocaleString()} 💥`
                : `-${counterResult.damage.toLocaleString()}`,
              counterResult.destroyed ? 'destroyed' : 'damage'
            );
            appendLog(
              `↩️ ${defenderState.mecha.name} สวนกลับด้วย ${counterWeapon.name} ใส่ ${finishedAttacker.mecha.name} ทำดาเมจ ${counterResult.damage.toLocaleString()} (Hit ${counterResult.hitRate}%)`
            );
          } else {
            triggerUnitAnimation(finishedAttacker.instanceId, 'evade');
            spawnFloatingText(finishedAttacker.position, 'MISS', 'miss');
            appendLog(
              `💨 ${defenderState.mecha.name} สวนกลับด้วย ${counterWeapon.name} — MISS! (Hit ${counterResult.hitRate}%)`
            );
          }

          scheduleTimer(() => setIsBusy(false), 450);
        }, 600);
      };

      // 2. Support Attack from adjacent ally (50% DMG, 0 EN) if defender survived
      if (latestDefender.hp > 0 && supportAttack) {
        scheduleTimer(() => {
          triggerUnitAnimation(supportAttack.ally.instanceId, 'attack');
          spawnCombatVfx(
            supportAttack.ally,
            latestDefender,
            supportAttack.weapon
          );
          const supportResult = resolveAttackStrike(
            supportAttack.ally,
            latestDefender,
            supportAttack.weapon,
            defenderTerrain,
            'counter',
            Math.random(),
            false,
            combatConfig.support.supportAttackDamageMultiplier,
            true
          );

          latestDefender = supportResult.updatedDefender;
          setUnits((prev) =>
            prev.map((u) => {
              if (u.instanceId === supportResult.updatedAttacker.instanceId) {
                return supportResult.updatedAttacker;
              }
              if (u.instanceId === latestDefender.instanceId) {
                return latestDefender;
              }
              return u;
            })
          );

          if (supportResult.hit) {
            triggerUnitAnimation(latestDefender.instanceId, 'hit');
            spawnCanvasBurst(
              supportResult.destroyed ? 'explosion' : 'impact',
              latestDefender.position,
              supportResult.destroyed ? '#f97316' : '#10b981'
            );
            spawnFloatingText(
              latestDefender.position,
              supportResult.destroyed
                ? `-${supportResult.damage.toLocaleString()} 💥`
                : `-${supportResult.damage.toLocaleString()}`,
              supportResult.destroyed ? 'destroyed' : 'damage'
            );
            appendLog(
              `🤝 [Support Attack] ${supportAttack.ally.mecha.name} ช่วยยิงด้วย ${supportAttack.weapon.name} (0 EN) ทำดาเมจเสริม ${supportResult.damage.toLocaleString()} (Hit ${supportResult.hitRate}%)${
                supportResult.destroyed ? ' — ทำลายเป้าหมาย!' : ''
              }`
            );
            if (supportResult.armorBroken > 0) {
              appendLog(
                `🧪 เกราะของ ${latestDefender.mecha.name} ลดลง -${supportResult.armorBroken} (เหลือ ${latestDefender.mecha.armor})`
              );
            }
          } else {
            triggerUnitAnimation(latestDefender.instanceId, 'evade');
            spawnFloatingText(latestDefender.position, 'MISS', 'miss');
            appendLog(
              `💨 [Support Attack] ${supportAttack.ally.mecha.name} ช่วยยิงด้วย ${supportAttack.weapon.name} — MISS!`
            );
          }

          triggerEnemyCounterIfAlive(latestDefender);
        }, 600);
      } else {
        triggerEnemyCounterIfAlive(latestDefender);
      }
    };

    // 80ms Hitstop freeze + bright white flash before damage & knockback resolve!
    if (attackResult.hit) {
      setHitstopUnitId(defender.instanceId);
      scheduleTimer(executePrimaryImpact, 80);
    } else {
      executePrimaryImpact();
    }
  };

  const handleEndTurn = () => {
    if (battleOutcome || turnState.phase !== 'PLAYER_PHASE' || isBusy) return;

    clearScheduledTimers();
    setSelectedWeaponId(null);
    setPendingForecast(null);
    setPendingCounter(null);
    setIsBusy(true);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'END_PLAYER_PHASE' })
    );
    appendLog(
      `--- จบเทิร์นผู้เล่น: เริ่ม ENEMY_PHASE (Turn ${turnState.turnNumber}) ---`
    );

    const enemyPrep = prepareUnitsForPhaseStart(units, 'enemy', stage1Map);
    let workingUnits = enemyPrep.units;

    // Detonate any telegraphed Elite/Boss Danger Zones at the start of Enemy Phase!
    if (dangerZones.length > 0) {
      for (const dz of dangerZones) {
        const caster = workingUnits.find((u) => u.instanceId === dz.casterId);
        if (!caster || caster.hp <= 0 || caster.hasActed) continue;

        // Fire full-row crimson beam VFX
        const dzVfxId = `vfx-dz-${++floatSeqRef.current}`;
        setCombatVfx((prev) => [
          ...prev,
          {
            id: dzVfxId,
            weaponType: 'ranged',
            from: { row: dz.row, col: stage1Map.cols - 1 },
            to: { row: dz.row, col: 0 },
            color: '#f43f5e',
          },
        ]);
        scheduleTimer(() => {
          setCombatVfx((prev) => prev.filter((item) => item.id !== dzVfxId));
        }, 700);

        const rowKeySet = new Set(dz.tiles.map(posKey));
        const caughtPlayers = workingUnits.filter(
          (u) =>
            u.faction === 'player' &&
            u.hp > 0 &&
            rowKeySet.has(posKey(u.position))
        );

        appendLog(
          `☄️ [DANGER ZONE] ${dz.casterName} ยิงลำแสงทำลายล้าง ${dz.weapon.name} ใส่แถวที่ ${
            dz.row + 1
          }!`
        );

        if (caughtPlayers.length === 0) {
          appendLog(`💨 ยูนิตฝ่ายเราหลบออกจาก Danger Zone แถวที่ ${dz.row + 1} ได้ทันเวลา!`);
        } else {
          for (const target of caughtPlayers) {
            const terrain =
              getTerrainById(
                stage1Map.tiles[target.position.row][target.position.col]
              ) ?? getTerrainById('normal')!;
            const res = resolveAttackStrike(
              caster,
              target,
              dz.weapon,
              terrain,
              'counter',
              Math.random(),
              false,
              combatConfig.dangerZone.damageMultiplier,
              true
            );
            workingUnits = workingUnits.map((u) =>
              u.instanceId === res.updatedDefender.instanceId
                ? res.updatedDefender
                : u
            );
            if (res.hit) {
              triggerUnitAnimation(target.instanceId, 'hit');
              spawnFloatingText(
                target.position,
                res.destroyed
                  ? `-${res.damage.toLocaleString()} 💥`
                  : `-${res.damage.toLocaleString()}`,
                res.destroyed ? 'destroyed' : 'damage'
              );
              appendLog(
                `🔥 ${target.mecha.name} โดนลำแสง Danger Zone ทำดาเมจ ${res.damage.toLocaleString()}!`
              );
            } else {
              triggerUnitAnimation(target.instanceId, 'evade');
              spawnFloatingText(target.position, 'MISS', 'miss');
            }
          }
        }
      }
      setDangerZones([]);
    }

    // Threat Level 3+ Boss Special Skill: Overlord Dreadnought activates Aegis Overcharge on even turns
    const threatCfg = getThreatLevelConfig(threatLevel);
    if (threatCfg.bossSpecialSkill && turnState.turnNumber % 2 === 0) {
      workingUnits = workingUnits.map((u) => {
        if (
          u.faction === 'enemy' &&
          u.hp > 0 &&
          u.mecha.id === 'overlord_dreadnought'
        ) {
          const healAmt = Math.round(
            (u.mecha.maxHp * threatCfg.bossRegenPercent) / 100
          );
          const nextHp = Math.min(u.mecha.maxHp, u.hp + healAmt);
          const actualHeal = nextHp - u.hp;
          spawnFloatingText(
            u.position,
            `AEGIS PROTOCOL +${actualHeal} HP`,
            'heal'
          );
          appendLog(
            `👹 [Threat Lv.${threatLevel} Boss Skill] ${u.mecha.name} เปิดใช้งาน Aegis Overcharge! ฟื้นฟู HP +${actualHeal} และเปิด Iron Wall (-50% DMG)`
          );
          return {
            ...u,
            hp: nextHp,
            activeSpirits: { ...u.activeSpirits, ironWall: true },
          };
        }
        return u;
      });
    }

    setUnits(workingUnits);
    enemyPrep.regenLogs.forEach((msg) => appendLog(msg));
    enemyPrep.regenPopups.forEach((p) =>
      spawnFloatingText(
        p.position,
        p.text,
        p.text === 'STUNNED!' ? 'collision' : 'heal'
      )
    );

    const enemyIds = workingUnits
      .filter((u) => u.faction === 'enemy' && u.hp > 0)
      .map((u) => u.instanceId);

    processNextEnemy(enemyIds, workingUnits, turnState.turnNumber + 1);
  };

  const handleRetryBattle = () => {
    clearScheduledTimers();
    setIsBusy(false);
    // Clean reset of camera/hitstop/cutin on retry
    setCameraZoom(null);
    setHitstopUnitId(null);
    setActiveCutIn(null);
    setMomentumBanner(null);
    setSelectedWeaponId(null);
    setDangerZones([]);
    setPendingForecast(null);
    setPendingCounter(null);
    setFloatingTexts([]);
    setUnitAnimations({});
    setTurnState(createInitialTurnState());
    setUnits(createBattleUnitsForNode(runPlayer, node, meta, threatLevel));
    setLogs([
      `รีเซ็ต NODE ${node.nodeNumber}: ${node.title} — Turn 1 PLAYER_PHASE`,
    ]);
  };

  const handleContinueAfterVictory = () => {
    const survivingPlayer =
      units.find((u) => u.isMainUnit) ??
      units.find((u) => u.faction === 'player');
    onBattleVictory({
      ...runPlayer,
      hp: survivingPlayer ? survivingPlayer.hp : runPlayer.hp,
      en: survivingPlayer ? survivingPlayer.en : runPlayer.en,
      sp: survivingPlayer ? survivingPlayer.sp : runPlayer.sp,
    });
  };

  const showSpiritMenu =
    !battleOutcome &&
    turnState.phase === 'PLAYER_PHASE' &&
    selectedUnit !== null &&
    selectedUnit.faction === 'player';

  const showWeaponMenu = showSpiritMenu && !selectedUnit.hasActed;

  return (
    <div
      className={`relative min-h-screen bg-slate-950 text-slate-100 ${
        screenShake ? 'animate-screen-shake' : ''
      }`}
      data-testid="battle-screen"
    >
      <AmbientBackdrop />
      <div className="relative z-10">
      {momentumBanner && (
        <div
          className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4"
          data-testid="momentum-banner"
        >
          <div className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-600 via-orange-500 to-rose-600 px-8 py-3 text-base font-black tracking-wider text-white shadow-2xl">
            {momentumBanner}
          </div>
        </div>
      )}

      <StatusHeader
        stageName={`NODE ${node.nodeNumber} · ${node.title} (${node.typeLabel})`}
        turnState={turnState}
        isBusy={isBusy || battleOutcome !== null}
        speedMultiplier={speedMultiplier}
        cutInEnabled={cutInEnabled}
        bgmEnabled={bgmEnabled}
        sfxEnabled={sfxEnabled}
        onToggleSpeed={() => setSpeedMultiplier((prev) => (prev === 1 ? 2 : 1))}
        onToggleCutIn={() => setCutInEnabled((prev) => !prev)}
        onToggleBgm={onToggleBgm}
        onToggleSfx={onToggleSfx}
        onEndTurn={handleEndTurn}
        onReset={handleRetryBattle}
      />

      {battleOutcome && (
        <div
          className={`mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-xl border px-6 py-4 ${
            battleOutcome === 'victory'
              ? 'border-emerald-500/50 bg-emerald-950/40 text-emerald-200'
              : 'border-rose-500/50 bg-rose-950/40 text-rose-200'
          }`}
          data-testid="battle-outcome-banner"
        >
          <div>
            <div className="text-lg font-bold">
              {battleOutcome === 'victory'
                ? `🏆 NODE ${node.nodeNumber} CLEARED — กำจัดศัตรูทั้งหมดสำเร็จ!`
                : '💥 RUN FAILED — หุ่นหลักถูกทำลาย (Permadeath)!'}
            </div>
            <p className="text-xs opacity-80">
              {battleOutcome === 'victory'
                ? 'ค่า HP, EN และ SP คงเหลือจะถูกบันทึกไปยังด่านถัดไป (ค่า Will จะรีเซ็ตเป็น 100)'
                : 'กลับไปยังโรงเก็บหุ่น (Hangar) เพื่อเริ่มการเดินทางรอบใหม่'}
            </p>
          </div>
          {battleOutcome === 'victory' ? (
            <button
              type="button"
              data-testid="battle-victory-continue-btn"
              onClick={handleContinueAfterVictory}
              className="cursor-pointer rounded-lg border border-emerald-400/50 bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-500"
            >
              {node.type === 'boss_battle'
                ? 'เสร็จสิ้นภารกิจ (Finish Run) →'
                : 'สุ่มรางวัลอัปเกรด (3-Card Draft) →'}
            </button>
          ) : (
            <button
              type="button"
              data-testid="battle-defeat-hangar-btn"
              onClick={onBattleDefeat}
              className="cursor-pointer rounded-lg border border-rose-400/50 bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500"
            >
              กลับไปโรงเก็บหุ่น (Hangar)
            </button>
          )}
        </div>
      )}

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <BattleGrid
          map={stage1Map}
          units={units}
          selectedUnitId={turnState.selectedUnitId}
          reachableTileKeys={reachableTileKeys}
          attackRangeTileKeys={attackRangeTileKeys}
          mapPreviewTileKeys={mapPreviewTileKeys}
          dangerZoneTileKeys={dangerZoneTileKeys}
          floatingTexts={floatingTexts}
          unitAnimations={unitAnimations}
          combatVfx={combatVfx}
          canvasBursts={canvasBursts}
          cameraZoom={cameraZoom}
          hitstopUnitId={hitstopUnitId}
          onTileClick={handleTileClick}
        />

        <aside className="space-y-4">
          <InstalledUpgradesBar
            installedUpgradeIds={runPlayer.installedUpgradeIds}
            compact
          />

          <UnitInfoPanel unit={selectedUnit} map={stage1Map} />

          {showSpiritMenu && selectedUnit && (
            <SpiritMenuPanel
              unit={selectedUnit}
              allUnits={units}
              onCastSpirit={handleCastSpirit}
              onOverLimit={handleOverLimit}
            />
          )}

          {showWeaponMenu && selectedUnit && (
            <WeaponMenuPanel
              unit={selectedUnit}
              allUnits={units}
              selectedWeaponId={selectedWeaponId}
              mapDirection={mapDirection}
              mapTargetCount={mapTargetCount}
              onSelectWeapon={handleSelectWeapon}
              onCancelWeapon={() => setSelectedWeaponId(null)}
              onChangeMapDirection={setMapDirection}
              onFireMapWeapon={handleFireMapWeapon}
              onRepairAlly={handleRepairAlly}
              onWait={handleWaitUnit}
            />
          )}

          <BattleLogPanel logs={logs} />
        </aside>
      </main>

      {pendingForecast && (
        <BattleForecastModal
          forecast={pendingForecast}
          onConfirm={handleConfirmAttack}
          onCancel={() => setPendingForecast(null)}
        />
      )}

      {pendingCounter && (
        <CounterAttackModal
          prompt={pendingCounter.prompt}
          onSelectAction={handleSelectDefenseAction}
        />
      )}

      <FinisherCutIn
        cutIn={activeCutIn}
        onSkip={() => setActiveCutIn(null)}
      />
      </div>
    </div>
  );
}
