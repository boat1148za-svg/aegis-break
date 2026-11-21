import { useEffect, useMemo, useRef, useState } from 'react';
import { BattleGrid } from './components/BattleGrid';
import { BattleLogPanel } from './components/BattleLogPanel';
import { StatusHeader } from './components/StatusHeader';
import { UnitInfoPanel } from './components/UnitInfoPanel';
import { createInitialBattleUnits, stage1Map } from './logic/dataLoader';
import {
  chooseEnemyMoveTarget,
  getReachableTiles,
  getUnitAt,
  posKey,
  prepareUnitsForPhaseStart,
} from './logic/gridLogic';
import {
  createInitialTurnState,
  transitionTurnState,
} from './logic/turnStateMachine';
import type { BattleUnit, GridPosition } from './logic/types';

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function formatCoord(pos: GridPosition): string {
  return `${COL_LABELS[pos.col]}${pos.row + 1}`;
}

export function App() {
  const [turnState, setTurnState] = useState(createInitialTurnState);
  const [units, setUnits] = useState<BattleUnit[]>(createInitialBattleUnits);
  const [isEnemyActing, setIsEnemyActing] = useState(false);
  const [logs, setLogs] = useState<string[]>([
    'เริ่มการรบ Turn 1 — PLAYER_PHASE: คลิกที่ Giga-Rex เพื่อสั่งเคลื่อนที่',
  ]);

  const timersRef = useRef<number[]>([]);

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
    setLogs((prev) => [message, ...prev].slice(0, 30));
  };

  const selectedUnit = useMemo(
    () => units.find((u) => u.instanceId === turnState.selectedUnitId) ?? null,
    [units, turnState.selectedUnitId]
  );

  const reachableTileKeys = useMemo(() => {
    if (
      turnState.phase !== 'PLAYER_PHASE' ||
      !selectedUnit ||
      selectedUnit.faction !== 'player' ||
      selectedUnit.hasMoved
    ) {
      return new Set<string>();
    }
    const tiles = getReachableTiles(selectedUnit, stage1Map, units);
    return new Set(tiles.map(posKey));
  }, [turnState.phase, selectedUnit, units]);

  const handleTileClick = (pos: GridPosition) => {
    if (turnState.phase !== 'PLAYER_PHASE' || isEnemyActing) return;

    const clickedKey = posKey(pos);

    // Move selected player unit if clicking a highlighted reachable tile
    if (
      selectedUnit &&
      selectedUnit.faction === 'player' &&
      !selectedUnit.hasMoved &&
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
      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
      );
      appendLog(
        `${selectedUnit.icon} ${selectedUnit.mecha.name} เคลื่อนที่ ${fromCoord} → ${toCoord}`
      );
      return;
    }

    // Otherwise check if there is a unit on the clicked tile
    const clickedUnit = getUnitAt(pos, units);
    if (clickedUnit) {
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

    // Clicking an empty non-reachable tile deselects
    if (turnState.selectedUnitId) {
      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'CANCEL_SELECTION' })
      );
    }
  };

  const handleEndTurn = () => {
    if (turnState.phase !== 'PLAYER_PHASE' || isEnemyActing) return;

    clearScheduledTimers();
    setIsEnemyActing(true);
    setTurnState((prev) =>
      transitionTurnState(prev, { type: 'END_PLAYER_PHASE' })
    );
    appendLog(`--- จบเทิร์นผู้เล่น: เริ่ม ENEMY_PHASE (Turn ${turnState.turnNumber}) ---`);

    // Prepare enemy units at start of Enemy Phase
    const enemyPrep = prepareUnitsForPhaseStart(units, 'enemy', stage1Map);
    let workingUnits = enemyPrep.units;
    setUnits(workingUnits);
    enemyPrep.regenLogs.forEach((msg) => appendLog(msg));

    const enemyIds = workingUnits
      .filter((u) => u.faction === 'enemy' && u.hp > 0)
      .map((u) => u.instanceId);

    // Move each enemy sequentially with a short delay for visual clarity
    enemyIds.forEach((enemyId, index) => {
      const timerId = window.setTimeout(() => {
        const enemy = workingUnits.find((u) => u.instanceId === enemyId);
        if (!enemy || enemy.hp <= 0) return;

        const targetPos = chooseEnemyMoveTarget(enemy, stage1Map, workingUnits);
        const fromCoord = formatCoord(enemy.position);
        const toCoord = formatCoord(targetPos);

        workingUnits = workingUnits.map((u) =>
          u.instanceId === enemyId
            ? { ...u, position: { ...targetPos }, hasMoved: true }
            : u
        );
        setUnits(workingUnits);

        if (fromCoord !== toCoord) {
          appendLog(
            `${enemy.icon} ${enemy.mecha.name} เคลื่อนที่เข้าหาเป้าหมาย ${fromCoord} → ${toCoord}`
          );
        } else {
          appendLog(`${enemy.icon} ${enemy.mecha.name} คงตำแหน่งที่ ${fromCoord}`);
        }
      }, (index + 1) * 450);

      timersRef.current.push(timerId);
    });

    // Return to Player Phase after all enemies finish moving
    const nextTurnNumber = turnState.turnNumber + 1;
    const finishTimerId = window.setTimeout(() => {
      const playerPrep = prepareUnitsForPhaseStart(
        workingUnits,
        'player',
        stage1Map
      );
      setUnits(playerPrep.units);
      playerPrep.regenLogs.forEach((msg) => appendLog(msg));

      setTurnState((prev) =>
        transitionTurnState(prev, { type: 'END_ENEMY_PHASE' })
      );
      appendLog(`=== เริ่ม Turn ${nextTurnNumber} — PLAYER_PHASE ===`);
      setIsEnemyActing(false);
    }, (enemyIds.length + 1) * 450);

    timersRef.current.push(finishTimerId);
  };

  const handleReset = () => {
    clearScheduledTimers();
    setIsEnemyActing(false);
    setTurnState(createInitialTurnState());
    setUnits(createInitialBattleUnits());
    setLogs([
      'รีเซ็ตสนามรบ Turn 1 — PLAYER_PHASE: คลิกที่ Giga-Rex เพื่อสั่งเคลื่อนที่',
    ]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <StatusHeader
        stageName={stage1Map.name}
        turnState={turnState}
        isBusy={isEnemyActing}
        onEndTurn={handleEndTurn}
        onReset={handleReset}
      />

      <main className="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <BattleGrid
          map={stage1Map}
          units={units}
          selectedUnitId={turnState.selectedUnitId}
          reachableTileKeys={reachableTileKeys}
          onTileClick={handleTileClick}
        />

        <aside className="space-y-4">
          <UnitInfoPanel unit={selectedUnit} map={stage1Map} />
          <BattleLogPanel logs={logs} />
        </aside>
      </main>
    </div>
  );
}

export default App;
