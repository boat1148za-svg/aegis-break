import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleForecastModal } from './components/BattleForecastModal';
import { BattleGrid } from './components/BattleGrid';
import { BattleLogPanel } from './components/BattleLogPanel';
import { CounterAttackModal } from './components/CounterAttackModal';
import { SpiritMenuPanel } from './components/SpiritMenuPanel';
import { StatusHeader } from './components/StatusHeader';
import { UnitInfoPanel } from './components/UnitInfoPanel';
import { WeaponMenuPanel } from './components/WeaponMenuPanel';
import {
  buildBattleForecast,
  buildCounterPrompt,
  resolveAttackStrike,
} from './logic/combatCalculator';
import {
  createInitialBattleUnits,
  getTerrainById,
  getUnitWeapons,
  stage1Map,
} from './logic/dataLoader';
import {
  chooseEnemyMoveTarget,
  findBestWeaponInRange,
  getReachableTiles,
  getUnitAt,
  getWeaponRangeTiles,
  posKey,
  prepareUnitsForPhaseStart,
} from './logic/gridLogic';
import { applySpiritCommand } from './logic/spiritLogic';
import {
  createInitialTurnState,
  transitionTurnState,
} from './logic/turnStateMachine';
import type {
  BattleForecast,
  BattleUnit,
  CounterPromptData,
  DefenseAction,
  FloatingTextEvent,
  GridPosition,
  SpiritCommandData,
  UnitAnimationType,
  WeaponData,
} from './logic/types';

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

export function App() {
  const [turnState, setTurnState] = useState(createInitialTurnState);
  const [units, setUnits] = useState<BattleUnit[]>(createInitialBattleUnits);
  const [selectedWeaponId, setSelectedWeaponId] = useState<string | null>(null);
  const [pendingForecast, setPendingForecast] = useState<BattleForecast | null>(
    null
  );
  const [pendingCounter, setPendingCounter] =
    useState<PendingCounterSession | null>(null);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextEvent[]>([]);
  const [unitAnimations, setUnitAnimations] = useState<
    Record<string, UnitAnimationType>
  >({});
  const [isBusy, setIsBusy] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'เริ่มการรบ Turn 1 — PLAYER_PHASE: คลิกที่ Giga-Rex เพื่อเดิน, ใช้ Spirit Commands หรือเลือกอาวุธโจมตี',
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

  const alivePlayers = units.filter((u) => u.faction === 'player' && u.hp > 0);
  const aliveEnemies = units.filter((u) => u.faction === 'enemy' && u.hp > 0);
  const battleOutcome: 'victory' | 'defeat' | null =
    aliveEnemies.length === 0
      ? 'victory'
      : alivePlayers.length === 0
        ? 'defeat'
        : null;

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

      const playerTarget = updatedUnits.find(
        (u) => u.faction === 'player' && u.hp > 0
      );
      if (!playerTarget) {
        finishEnemyPhase(updatedUnits, nextTurnNumber);
        return;
      }

      const enemyWeapon = findBestWeaponInRange(movedEnemy, playerTarget);
      if (!enemyWeapon) {
        processNextEnemy(restQueue, updatedUnits, nextTurnNumber);
        return;
      }

      // Pause Enemy Phase and show Counter-Attack Menu to the player!
      scheduleTimer(() => {
        const prompt = buildCounterPrompt(
          movedEnemy,
          playerTarget,
          enemyWeapon,
          stage1Map
        );
        setTurnState((prev) =>
          transitionTurnState(prev, { type: 'SET_STEP', step: 'COUNTER_PROMPT' })
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
    const { enemy, player, enemyWeapon, playerCounterWeapon } = prompt;

    setPendingCounter(null);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'SET_STEP', step: 'RESOLVING' })
    );

    const playerTerrain =
      getTerrainById(
        stage1Map.tiles[player.position.row][player.position.col]
      ) ?? getTerrainById('normal')!;

    // 1. Resolve Enemy Strike with player's chosen DefenseAction
    triggerUnitAnimation(enemy.instanceId, 'attack');
    const enemyStrike = resolveAttackStrike(
      enemy,
      player,
      enemyWeapon,
      playerTerrain,
      action
    );

    const postEnemyStrikeAttacker: BattleUnit = {
      ...enemyStrike.updatedAttacker,
      hasActed: true,
    };
    const postEnemyStrikePlayer = enemyStrike.updatedDefender;

    let latestUnits = workingUnits.map((u) => {
      if (u.instanceId === postEnemyStrikeAttacker.instanceId) {
        return postEnemyStrikeAttacker;
      }
      if (u.instanceId === postEnemyStrikePlayer.instanceId) {
        return postEnemyStrikePlayer;
      }
      return u;
    });
    setUnits(latestUnits);

    const actionLabel =
      action === 'defend'
        ? ' [ป้องกัน -50%]'
        : action === 'evade'
          ? ' [หลบหลีก +30%]'
          : '';

    if (enemyStrike.hit) {
      triggerUnitAnimation(player.instanceId, 'hit');
      spawnFloatingText(
        player.position,
        enemyStrike.destroyed
          ? `-${enemyStrike.damage.toLocaleString()} 💥`
          : `-${enemyStrike.damage.toLocaleString()}`,
        enemyStrike.destroyed ? 'destroyed' : 'damage'
      );
      appendLog(
        `🔥 ${enemy.mecha.name} ใช้ ${enemyWeapon.name} โจมตี ${player.mecha.name}${actionLabel} ทำดาเมจ ${enemyStrike.damage.toLocaleString()} (Hit ${enemyStrike.hitRate}%)`
      );
    } else {
      triggerUnitAnimation(player.instanceId, 'evade');
      spawnFloatingText(player.position, 'MISS', 'miss');
      appendLog(
        `💨 ${enemy.mecha.name} ใช้ ${enemyWeapon.name} โจมตี ${player.mecha.name}${actionLabel} — MISS! (Hit ${enemyStrike.hitRate}%)`
      );
    }

    // 2. If player chose Counter and survived, fire Counter-Attack!
    if (
      action === 'counter' &&
      !enemyStrike.destroyed &&
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
        const counterResult = resolveAttackStrike(
          postEnemyStrikePlayer,
          postEnemyStrikeAttacker,
          playerCounterWeapon,
          enemyTerrain,
          'counter'
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
        } else {
          triggerUnitAnimation(postEnemyStrikeAttacker.instanceId, 'evade');
          spawnFloatingText(postEnemyStrikeAttacker.position, 'MISS', 'miss');
          appendLog(
            `💨 ${postEnemyStrikePlayer.mecha.name} สวนกลับด้วย ${playerCounterWeapon.name} — MISS! (Hit ${counterResult.hitRate}%)`
          );
        }

        // Continue to next enemy after counter-attack animation settles
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

    // 1. Weapon selected & clicking an enemy in red attack range -> Battle Forecast
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
        stage1Map
      );
      setPendingForecast(forecast);
      return;
    }

    // 2. Move selected player unit to a highlighted cyan tile
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

    // 3. Select / inspect unit
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

    // 4. Deselect
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

    const { attacker, defender, attackerWeapon } = pendingForecast;
    setPendingForecast(null);
    setSelectedWeaponId(null);
    setIsBusy(true);

    const defenderTerrain =
      getTerrainById(
        stage1Map.tiles[defender.position.row][defender.position.col]
      ) ?? getTerrainById('normal')!;

    // 1. Resolve Player Attack with lunge + hit/evade animation
    triggerUnitAnimation(attacker.instanceId, 'attack');
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
    const damagedDefender = attackResult.updatedDefender;

    setUnits((prev) =>
      prev.map((u) => {
        if (u.instanceId === finishedAttacker.instanceId) {
          return finishedAttacker;
        }
        if (u.instanceId === damagedDefender.instanceId) {
          return damagedDefender;
        }
        return u;
      })
    );

    if (attackResult.hit) {
      triggerUnitAnimation(defender.instanceId, 'hit');
      spawnFloatingText(
        defender.position,
        attackResult.destroyed
          ? `-${attackResult.damage.toLocaleString()} 💥`
          : `-${attackResult.damage.toLocaleString()}`,
        attackResult.destroyed ? 'destroyed' : 'damage'
      );
      appendLog(
        `⚔️ ${attacker.mecha.name} ใช้ ${attackerWeapon.name} โจมตี ${defender.mecha.name} ทำดาเมจ ${attackResult.damage.toLocaleString()} (Hit ${attackResult.hitRate}%)${
          attackResult.destroyed ? ' — ทำลายเป้าหมาย!' : ''
        }`
      );
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

    // 2. Enemy Counter-Attack if survived and in range
    const counterWeapon =
      !attackResult.destroyed && damagedDefender.hp > 0
        ? findBestWeaponInRange(damagedDefender, finishedAttacker)
        : null;

    if (counterWeapon) {
      scheduleTimer(() => {
        const attackerTerrain =
          getTerrainById(
            stage1Map.tiles[finishedAttacker.position.row][
              finishedAttacker.position.col
            ]
          ) ?? getTerrainById('normal')!;

        triggerUnitAnimation(damagedDefender.instanceId, 'attack');
        const counterResult = resolveAttackStrike(
          damagedDefender,
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
            `↩️ ${damagedDefender.mecha.name} สวนกลับด้วย ${counterWeapon.name} ใส่ ${finishedAttacker.mecha.name} ทำดาเมจ ${counterResult.damage.toLocaleString()} (Hit ${counterResult.hitRate}%)`
          );
        } else {
          triggerUnitAnimation(finishedAttacker.instanceId, 'evade');
          spawnFloatingText(finishedAttacker.position, 'MISS', 'miss');
          appendLog(
            `💨 ${damagedDefender.mecha.name} สวนกลับด้วย ${counterWeapon.name} — MISS! (Hit ${counterResult.hitRate}%)`
          );
        }

        scheduleTimer(() => setIsBusy(false), 450);
      }, 650);
    } else {
      scheduleTimer(() => setIsBusy(false), 450);
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
    const workingUnits = enemyPrep.units;
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

  const handleReset = () => {
    clearScheduledTimers();
    setIsBusy(false);
    setSelectedWeaponId(null);
    setPendingForecast(null);
    setPendingCounter(null);
    setFloatingTexts([]);
    setUnitAnimations({});
    setTurnState(createInitialTurnState());
    setUnits(createInitialBattleUnits());
    setLogs([
      'รีเซ็ตสนามรบ Turn 1 — PLAYER_PHASE: คลิกที่ Giga-Rex เพื่อเดิน, ใช้ Spirit Commands หรือเลือกอาวุธโจมตี',
    ]);
  };

  const showSpiritMenu =
    !battleOutcome &&
    turnState.phase === 'PLAYER_PHASE' &&
    selectedUnit !== null &&
    selectedUnit.faction === 'player';

  const showWeaponMenu = showSpiritMenu && !selectedUnit.hasActed;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StatusHeader
        stageName={stage1Map.name}
        turnState={turnState}
        isBusy={isBusy || battleOutcome !== null}
        onEndTurn={handleEndTurn}
        onReset={handleReset}
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
                ? '🏆 VICTORY — กำจัดศัตรูทั้งหมดสำเร็จ!'
                : '💥 DEFEAT — หุ่น Giga-Rex ถูกทำลาย!'}
            </div>
            <p className="text-xs opacity-80">
              กดปุ่ม "เล่นใหม่อีกครั้ง" เพื่อเริ่มทดสอบด่านใหม่
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer rounded-lg border border-slate-200/30 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            เล่นใหม่อีกครั้ง
          </button>
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
          onTileClick={handleTileClick}
        />

        <aside className="space-y-4">
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
              selectedWeaponId={selectedWeaponId}
              onSelectWeapon={handleSelectWeapon}
              onCancelWeapon={() => setSelectedWeaponId(null)}
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
    </div>
  );
}

export default App;
