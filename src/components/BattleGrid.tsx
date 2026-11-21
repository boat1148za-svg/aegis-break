import { getTerrainById } from '../logic/dataLoader';
import { getUnitAt, posKey } from '../logic/gridLogic';
import type {
  BattleUnit,
  FloatingTextEvent,
  GridPosition,
  StageMapData,
  TerrainId,
  UnitAnimationType,
} from '../logic/types';

interface BattleGridProps {
  map: StageMapData;
  units: BattleUnit[];
  selectedUnitId: string | null;
  reachableTileKeys: Set<string>;
  attackRangeTileKeys: Set<string>;
  floatingTexts: FloatingTextEvent[];
  unitAnimations: Record<string, UnitAnimationType>;
  onTileClick: (pos: GridPosition) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getTerrainStyle(terrainId: TerrainId): string {
  switch (terrainId) {
    case 'repair_zone':
      return 'bg-emerald-950/75 border-emerald-600/50 hover:border-emerald-400/80';
    case 'obstacle':
      return 'bg-slate-800/95 border-slate-600/70';
    case 'normal':
    default:
      return 'bg-slate-900/80 border-slate-800 hover:border-slate-600';
  }
}

function getFloatingTextStyle(variant: FloatingTextEvent['variant']): string {
  switch (variant) {
    case 'damage':
      return 'bg-rose-600 text-white border-rose-300';
    case 'destroyed':
      return 'bg-amber-500 text-slate-950 border-amber-200';
    case 'miss':
      return 'bg-slate-700 text-slate-100 border-slate-400';
    case 'heal':
      return 'bg-emerald-600 text-white border-emerald-300';
  }
}

function getUnitAnimationClass(anim?: UnitAnimationType): string {
  switch (anim) {
    case 'hit':
      return 'animate-hit-shake';
    case 'evade':
      return 'animate-evade-dodge';
    case 'attack':
      return 'animate-attack-lunge';
    default:
      return '';
  }
}

export function BattleGrid({
  map,
  units,
  selectedUnitId,
  reachableTileKeys,
  attackRangeTileKeys,
  floatingTexts,
  unitAnimations,
  onTileClick,
}: BattleGridProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 shadow-lg">
      {/* Legend */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="font-semibold tracking-wider text-slate-200 uppercase">
          Tactical Grid ({map.rows}x{map.cols})
        </span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-slate-700 bg-slate-900" />
            Normal
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-emerald-500/70 bg-emerald-900/80" />
            Base (HP/EN +10%)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-slate-500 bg-slate-700" />
            Obstacle
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-cyan-400 bg-cyan-500/40" />
            Move
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-rose-400 bg-rose-500/40" />
            Attack Range
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div className="mb-1 grid grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1.5 text-center text-[11px] font-semibold text-slate-500">
        <div />
        {COL_LABELS.slice(0, map.cols).map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      {/* 8x8 Grid Rows */}
      <div className="space-y-1.5">
        {map.tiles.map((rowTiles, rowIdx) => (
          <div
            key={rowIdx}
            className="grid grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1.5"
          >
            <div className="flex items-center justify-center text-[11px] font-semibold text-slate-500">
              {rowIdx + 1}
            </div>

            {rowTiles.map((terrainId, colIdx) => {
              const pos: GridPosition = { row: rowIdx, col: colIdx };
              const key = posKey(pos);
              const terrain = getTerrainById(terrainId);
              const unit = getUnitAt(pos, units);
              const isSelected = unit?.instanceId === selectedUnitId;
              const isAttackRange = attackRangeTileKeys.has(key);
              const isReachable = !isAttackRange && reachableTileKeys.has(key);
              const isAttackableEnemy =
                isAttackRange && unit?.faction === 'enemy';
              const tileFloats = floatingTexts.filter(
                (f) => f.position.row === rowIdx && f.position.col === colIdx
              );

              return (
                <button
                  key={key}
                  type="button"
                  data-testid={`tile-${rowIdx}-${colIdx}`}
                  data-terrain={terrainId}
                  data-reachable={isReachable ? 'true' : 'false'}
                  data-attack-range={isAttackRange ? 'true' : 'false'}
                  onClick={() => onTileClick(pos)}
                  title={`${COL_LABELS[colIdx]}${rowIdx + 1} - ${terrain?.name ?? terrainId}${unit ? ` (${unit.mecha.name})` : ''}`}
                  className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-lg border transition-all ${getTerrainStyle(
                    terrainId
                  )} ${
                    isReachable
                      ? 'bg-cyan-500/25! border-cyan-400! ring-1 ring-cyan-400/70 hover:bg-cyan-500/40!'
                      : ''
                  } ${
                    isAttackRange
                      ? 'bg-rose-500/25! border-rose-500! ring-1 ring-rose-400/70 hover:bg-rose-500/35!'
                      : ''
                  } ${
                    isAttackableEnemy
                      ? 'ring-2! ring-rose-300! cursor-crosshair!'
                      : ''
                  } ${
                    isSelected
                      ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950'
                      : ''
                  }`}
                >
                  {/* Terrain subtle indicator */}
                  {!unit && terrainId === 'repair_zone' && (
                    <span className="text-sm font-bold text-emerald-400/90">
                      ✚
                    </span>
                  )}
                  {!unit && terrainId === 'obstacle' && (
                    <span className="text-sm text-slate-400/80">▲</span>
                  )}

                  {/* Reachable dot when empty */}
                  {!unit && isReachable && terrainId === 'normal' && (
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/80 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                  )}

                  {/* Unit Token */}
                  {unit && (
                    <div
                      className={`flex h-full w-full flex-col items-center justify-center rounded-md p-1 ${
                        unit.faction === 'player'
                          ? 'bg-cyan-500/20 text-cyan-100'
                          : 'bg-rose-500/20 text-rose-100'
                      } ${unit.hasActed ? 'opacity-55' : ''} ${getUnitAnimationClass(
                        unitAnimations[unit.instanceId]
                      )}`}
                    >
                      <span className="text-lg leading-none sm:text-xl">
                        {unit.icon}
                      </span>
                      <span className="mt-0.5 truncate text-[10px] font-bold tracking-tight">
                        {unit.shortName}
                      </span>
                      {/* Mini HP Bar (smooth transition) */}
                      <div className="mt-0.5 h-1 w-4/5 overflow-hidden rounded-full bg-slate-950/90">
                        <div
                          className={`h-full transition-all duration-500 ease-out ${
                            unit.faction === 'player'
                              ? 'bg-cyan-400'
                              : 'bg-rose-400'
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, (unit.hp / unit.mecha.maxHp) * 100)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Active Spirit Buff icons on unit tile */}
                  {unit &&
                    (unit.activeSpirits.valor ||
                      unit.activeSpirits.focus ||
                      unit.activeSpirits.ironWall) && (
                      <span
                        className="absolute top-0.5 left-0.5 flex gap-0.5 text-[9px] leading-none"
                        data-testid={`tile-buffs-${unit.instanceId}`}
                      >
                        {unit.activeSpirits.valor && <span>🔥</span>}
                        {unit.activeSpirits.focus && <span>🎯</span>}
                        {unit.activeSpirits.ironWall && <span>🛡️</span>}
                      </span>
                    )}

                  {/* Base corner indicator when unit stands on Repair Zone */}
                  {unit && terrainId === 'repair_zone' && (
                    <span className="absolute top-0.5 right-1 text-[10px] font-bold text-emerald-400">
                      ✚
                    </span>
                  )}

                  {/* Floating Combat Popups (Damage / MISS / Heal) */}
                  {tileFloats.map((evt) => (
                    <span
                      key={evt.id}
                      data-testid="floating-combat-text"
                      className={`animate-float-pop pointer-events-none absolute top-0 left-1/2 z-30 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-extrabold shadow-lg ${getFloatingTextStyle(
                        evt.variant
                      )}`}
                    >
                      {evt.text}
                    </span>
                  ))}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
