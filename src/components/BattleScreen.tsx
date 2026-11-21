import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleForecastModal } from './BattleForecastModal';
import { BattleGrid } from './BattleGrid';
import { BattleLogPanel } from './BattleLogPanel';
import type { CombatVfxEvent } from './CombatVfxOverlay';
import { CounterAttackModal } from './CounterAttackModal';
import { FinisherCutIn, type CutInEvent } from './FinisherCutIn';
import { InstalledUpgradesBar } from './InstalledUpgradesBar';
import { SpiritMenuPanel } from './SpiritMenuPanel';
import { StatusHeader } from './StatusHeader';
import { UnitInfoPanel } from './UnitInfoPanel';
import { WeaponMenuPanel } from './WeaponMenuPanel';
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
  getManhattanDistance,
  getReachableTiles,
  getUnitAt,
  getWeaponRangeTiles,
  posKey,
  prepareUnitsForPhaseStart,
} from '../logic/gridLogic';
import { applySpiritCommand } from '../logic/spiritLogic';
import {
  createInitialTurnState,
  transitionTurnState,
} from '../logic/turnStateMachine';
import type {
  BattleForecast,
  BattleUnit,
  CounterPromptData,
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
  onBattleVictory: (updatedPlayer: RunPlayerState) => void;
  onBattleDefeat: () => void;
}

export function BattleScreen({
  node,
  runPlayer,
  meta,
  threatLevel,
  onBattleVictory,
  onBattleDefeat,
}: BattleScreenProps) {
  const [turnState, setTurnState] = useState(createInitialTurnState);
  const [units, setUnits] = useState<BattleUnit[]>(() =>
    createBattleUnitsForNode(runPlayer, node, meta, threatLevel)
  );
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [pendingForecast, setPendingForecast] = useState<BattleForecast | null>(
    null
  );
  const [pendingCounter, setPendingCounter] =
    useState<PendingCounterSession | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextEvent[]>([]);
  const [combatVfx, setCombatVfx] = useState<CombatVfxEvent[]>([]);
  const [activeCutIn, setActiveCutIn] = useState<CutInEvent | null>(null);
  const [unitAnimations, setUnitAnimations] = useState<
    Record<string, UnitAnimationType>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    `NODE ${node.nodeNumber}: ${node.title} (${node.typeLabel}) — Turn 1 PLAYER_PHASE`,
  ]);

  const timersRef = useRef<number[]>([]);
  const floatSeqRef = useRef(0);

  const scheduleTimer = (fn: () => void, delayMs: number) => {
    const id = window.setTimeout(fn, delayMs);
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

  const spawnCombatVfx = (
    attacker: BattleUnit,
    defender: BattleUnit,
    weapon: WeaponData
  ) => {
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
    scheduleTimer(() => {
      setCombatVfx((prev) => prev.filter((item) => item.id !== id));
    }, 620);
  };

  const triggerFinisherCutIn = (attacker: BattleUnit, weapon: WeaponData) => {
    if (weapon.willRequired < 120 && !attacker.activeSpirits.valor) return;
    const id = `cutin-${++floatSeqRef.current}`;
    setActiveCutIn({
      id,
      pilotId: attacker.pilot.id,
      pilotName: attacker.pilot.name,
      mechaName: attacker.mecha.name,
      weaponName: weapon.name,
      faction: attacker.faction,
    });
    scheduleTimer(() => {
      setActiveCutIn((prev) => (prev?.id === id ? null : prev));
    }, 1150);
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

  const attackRangeTileKeys = useMemo(() => {
    if (
      battleOutcome ||
      turnState.phase !== 'PLAYER_PHASE' ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.hasActed ||
      !selectedWeapon
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
        spawnFloatingText(p.position, p.text, 'heal')
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
      if (!enemy || enemy.hp <= 0) {
        processNextEnemy(restQueue, currentUnits, nextTurnNumber);
        return;
      }

      const targetPos = chooseEnemyMoveTarget(enemy, stage1Map, currentUnits);
      const fromCoord = formatCoord(enemy.position);
      const toCoord = formatCoord(targetPos);

      const movedEnemy: BattleUnit = {
        ...enemy,
        position: { ...targetPos },
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
            ? { ...u, position: { ...pos }, hasMoved: true }
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

    // 1. Primary Player Attack
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

    const finishedAttacker: BattleUnit = {
      ...attackResult.updatedAttacker,
      hasMoved: true,
      hasActed: true,
    };
    let latestDefender = attackResult.updatedDefender;

    setUnits((prev) =>
      prev.map((u) => {
        if (u.instanceId === finishedAttacker.instanceId) {
          return finishedAttacker;
        }
        if (u.instanceId === latestDefender.instanceId) {
          return latestDefender;
        }
        return u;
      })
    );

    if (attackResult.hit) {
      triggerUnitAnimation(defender.instanceId, 'hit');
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
      spawnFloatingText(p.position, p.text, 'heal')
    );

    const enemyIds = workingUnits
      .filter((u) => u.faction === 'enemy' && u.hp > 0)
      .map((u) => u.instanceId);

    processNextEnemy(enemyIds, workingUnits, turnState.turnNumber + 1);
  };

  const handleRetryBattle = () => {
    clearScheduledTimers();
    setIsBusy(false);
    setSelectedWeaponId(null);
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
      className="min-h-screen bg-slate-950 text-slate-100"
      data-testid="battle-screen"
    >
      <StatusHeader
        stageName={`NODE ${node.nodeNumber} · ${node.title} (${node.typeLabel})`}
        turnState={turnState}
        isBusy={isBusy || battleOutcome !== null}
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
          floatingTexts={floatingTexts}
          unitAnimations={unitAnimations}
          combatVfx={combatVfx}
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
            />
          )}

          {showWeaponMenu && selectedUnit && (
            <WeaponMenuPanel
              unit={selectedUnit}
              allUnits={units}
              selectedWeaponId={selectedWeaponId}
              onSelectWeapon={handleSelectWeapon}
              onCancelWeapon={() => setSelectedWeaponId(null)}
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

      <FinisherCutIn cutIn={activeCutIn} />
    </div>
  );
}
