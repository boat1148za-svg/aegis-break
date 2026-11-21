import { isUnitInOverdrive } from '../logic/combatCalculator';
import { getTerrainById } from '../logic/dataLoader';
import { getUnitAt, posKey } from '../logic/gridLogic';
import {
  CanvasParticleOverlay,
  type CanvasParticleBurst,
} from './CanvasParticleOverlay';
import {
  CombatVfxOverlay,
  type CombatVfxEvent,
} from './CombatVfxOverlay';
import { MechaSprite } from './MechaSprite';
import { TrailingHpBar } from './TrailingHpBar';
import type {
  BattleUnit,
  FloatingTextEvent,
  GridPosition,
  StageMapData,
  TerrainId,
  UnitAnimationType,
} from '../logic/types';

export interface CameraZoomState {
  originX: number;
  originY: number;
  scale: number;
}

interface BattleGridProps {
  map: StageMapData;
  units: BattleUnit[];
  selectedUnitId: string | null;
  reachableTileKeys: Set<string>;
  attackRangeTileKeys: Set<string>;
  mapPreviewTileKeys: Set<string>;
  dangerZoneTileKeys: Set<string>;
  floatingTexts: FloatingTextEvent[];
  unitAnimations: Record<string, UnitAnimationType>;
  combatVfx: CombatVfxEvent[];
  canvasBursts: CanvasParticleBurst[];
  cameraZoom: CameraZoomState | null;
  hitstopUnitId: string | null;
  onTileClick: (pos: GridPosition) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getTerrainStyle(terrainId: TerrainId): string {
  switch (terrainId) {
    case 'repair_zone':
      return 'tile-25d bg-emerald-950/80 border-emerald-500/55 hover:border-emerald-300/80';
    case 'obstacle':
      return 'tile-obstacle-25d border-amber-500/35';
    case 'normal':
    default:
      return 'tile-25d bg-slate-900/85 border-slate-700/70 hover:border-cyan-500/60';
  }
}

function getFloatingTextStyle(variant: FloatingTextEvent['variant']): string {
  switch (variant) {
    case 'damage':
      return 'bg-rose-600 text-white border-rose-300';
    case 'destroyed':
      return 'bg-amber-500 text-slate-950 border-amber-200';
    case 'collision':
      return 'bg-orange-500 text-white border-amber-200 shadow-orange-900/70';
    case 'miss':
      return 'bg-slate-700 text-slate-100 border-slate-400';
    case 'heal':
      return 'bg-emerald-600 text-white border-emerald-300';
  }
}

export function BattleGrid({
  map,
  units,
  selectedUnitId,
  reachableTileKeys,
  attackRangeTileKeys,
  mapPreviewTileKeys,
  dangerZoneTileKeys,
  floatingTexts,
  unitAnimations,
  combatVfx,
  canvasBursts,
  cameraZoom,
  hitstopUnitId,
  onTileClick,
}: BattleGridProps) {
  return (
    <div className="hud-panel overflow-hidden bg-slate-900/85 p-4 backdrop-blur-md">
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
            Attack
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-3 w-3 rounded border border-fuchsia-400 bg-fuchsia-500/45" />
            MAP AoE
          </span>
          <span className="flex items-center gap-1.5">
            <span className="animate-danger-zone inline-block h-3 w-3 rounded border border-rose-500" />
            Danger Zone
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

      {/* 8x8 Grid Rows + Beam/Slash VFX Overlay */}
      <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-1.5">
        {/* Row labels */}
        <div className="grid grid-rows-8 gap-1.5">
          {map.tiles.map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center justify-center text-[11px] font-semibold text-slate-500"
            >
              {rowIdx + 1}
            </div>
          ))}
        </div>

        {/* 8x8 Tiles + 2.5D Camera Zoom + Canvas 60FPS Particle VFX */}
        <div
          className="relative overflow-hidden rounded-lg transition-transform duration-300 ease-out"
          data-testid="battlefield-camera-stage"
          data-zoomed={cameraZoom ? 'true' : 'false'}
          style={{
            transformOrigin: cameraZoom
              ? `${cameraZoom.originX}% ${cameraZoom.originY}%`
              : '50% 50%',
            transform: cameraZoom ? `scale(${cameraZoom.scale})` : 'scale(1)',
          }}
        >
          <div className="grid grid-cols-8 gap-1.5 p-1">
            {map.tiles.flatMap((rowTiles, rowIdx) =>
              rowTiles.map((terrainId, colIdx) => {
                const pos: GridPosition = { row: rowIdx, col: colIdx };
                const key = posKey(pos);
                const terrain = getTerrainById(terrainId);
                const unit = getUnitAt(pos, units);
                const isSelected = unit?.instanceId === selectedUnitId;
                const isMapPreview = mapPreviewTileKeys.has(key);
                const isDangerZone = dangerZoneTileKeys.has(key);
                const isAttackRange =
                  !isMapPreview && attackRangeTileKeys.has(key);
                const isReachable =
                  !isMapPreview && !isAttackRange && reachableTileKeys.has(key);
                const isAttackableEnemy =
                  (isAttackRange || isMapPreview) && unit?.faction === 'enemy';
                const isOverdrive = unit ? isUnitInOverdrive(unit) : false;
                const isHitstop = unit?.instanceId === hitstopUnitId;
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
                    data-map-preview={isMapPreview ? 'true' : 'false'}
                    data-danger-zone={isDangerZone ? 'true' : 'false'}
                    onClick={() => onTileClick(pos)}
                    title={`${COL_LABELS[colIdx]}${rowIdx + 1} - ${terrain?.name ?? terrainId}${unit ? ` (${unit.mecha.name})` : ''}${isDangerZone ? ' [⚠️ DANGER ZONE]' : ''}`}
                    className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border transition-all ${getTerrainStyle(
                      terrainId
                    )} ${
                      isDangerZone ? 'animate-danger-zone' : ''
                    } ${
                      isReachable
                        ? 'animate-tile-pulse-blue bg-cyan-500/25! border-cyan-400! hover:bg-cyan-500/40!'
                        : ''
                    } ${
                      isAttackRange
                        ? 'animate-tile-pulse-red bg-rose-500/25! border-rose-500! hover:bg-rose-500/35!'
                        : ''
                    } ${
                      isMapPreview
                        ? 'bg-fuchsia-500/35! border-fuchsia-400! ring-2 ring-fuchsia-300/80 hover:bg-fuchsia-500/45!'
                        : ''
                    } ${
                      isAttackableEnemy
                        ? 'ring-2! ring-rose-300! cursor-crosshair!'
                        : ''
                    } ${
                      unit?.overLimitActive
                        ? 'animate-overlimit-flame border-orange-400!'
                        : ''
                    } ${
                      isOverdrive
                        ? 'animate-overdrive-aura border-amber-400!'
                        : ''
                    } ${
                      isSelected
                        ? 'ring-2 ring-amber-400 ring-offset-1 ring-offset-slate-950'
                        : ''
                    }`}
                  >
                    {/* Base / Repair Zone Rotating Energy Ring */}
                    {terrainId === 'repair_zone' && (
                      <span
                        aria-hidden="true"
                        className="animate-spin-slow pointer-events-none absolute inset-1.5 rounded-full border-2 border-dashed border-emerald-400/55"
                      />
                    )}

                    {/* Danger Zone Warning Icon */}
                    {isDangerZone && !unit && (
                      <span className="pointer-events-none text-xs font-extrabold text-rose-300">
                        ⚠️
                      </span>
                    )}

                    {/* Terrain subtle indicator */}
                    {!unit && !isDangerZone && terrainId === 'repair_zone' && (
                      <span className="relative z-10 text-sm font-bold text-emerald-300 drop-shadow-[0_0_6px_rgba(52,211,153,0.9)]">
                        ✚
                      </span>
                    )}
                    {!unit && terrainId === 'obstacle' && (
                      <span className="pointer-events-none flex flex-col items-center justify-center text-amber-400/75">
                        <span className="text-xs font-bold">⛨</span>
                        <span className="h-0.5 w-5 rounded bg-amber-400/50" />
                      </span>
                    )}

                    {/* Reachable dot when empty */}
                    {!unit && isReachable && terrainId === 'normal' && (
                      <span className="h-2.5 w-2.5 rounded-full bg-cyan-300/85 shadow-[0_0_8px_rgba(34,211,238,0.9)]" />
                    )}

                    {/* Unit Token with 2D Sprite / Custom Mecha SVG & Trailing HP Bar */}
                    {unit && (
                      <div
                        className={`relative z-10 flex h-full w-full flex-col items-center justify-center rounded-md p-0.5 ${
                          unit.faction === 'player'
                            ? 'bg-cyan-500/15 text-cyan-100'
                            : 'bg-rose-500/15 text-rose-100'
                        } ${isHitstop ? 'hitstop-flash' : ''}`}
                      >
                        <MechaSprite
                          mechaId={unit.mecha.id}
                          faction={unit.faction}
                          acted={unit.hasActed}
                          facing={
                            unit.facing ??
                            (unit.faction === 'player' ? 'right' : 'left')
                          }
                          bossPhase2={unit.bossPhase2}
                          animation={
                            isHitstop ? undefined : unitAnimations[unit.instanceId]
                          }
                          showShadow
                          enableIdle
                          className="h-8 w-8 sm:h-10 sm:w-10"
                        />
                        <span className="truncate text-[9px] leading-none font-bold tracking-tight">
                          {unit.shortName}
                        </span>
                        {/* Trailing HP Bar */}
                        <div className="mt-0.5 w-4/5">
                          <TrailingHpBar
                            current={unit.hp}
                            max={unit.mecha.maxHp}
                            barColorClass={
                              unit.faction === 'player'
                                ? 'bg-cyan-400'
                                : 'bg-rose-400'
                            }
                            heightClass="h-1"
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
                          className="absolute top-0.5 left-0.5 z-10 flex gap-0.5 text-[9px] leading-none"
                          data-testid={`tile-buffs-${unit.instanceId}`}
                        >
                          {unit.activeSpirits.valor && <span>🔥</span>}
                          {unit.activeSpirits.focus && <span>🎯</span>}
                          {unit.activeSpirits.ironWall && <span>🛡️</span>}
                        </span>
                      )}

                    {/* Stunned badge */}
                    {unit && unit.stunned && (
                      <span
                        className="absolute bottom-0.5 left-0.5 z-10 rounded bg-orange-500 px-1 text-[8px] font-extrabold text-white shadow"
                        data-testid={`tile-stunned-${unit.instanceId}`}
                      >
                        STUN
                      </span>
                    )}

                    {/* Overdrive badge */}
                    {unit && isOverdrive && (
                      <span
                        className="absolute right-0.5 bottom-0.5 z-10 rounded bg-gradient-to-r from-rose-600 to-amber-500 px-1 text-[8px] font-extrabold text-white shadow"
                        data-testid={`tile-overdrive-${unit.instanceId}`}
                      >
                        OD
                      </span>
                    )}

                    {/* Base corner indicator when unit stands on Repair Zone */}
                    {unit && terrainId === 'repair_zone' && (
                      <span className="absolute top-0.5 right-1 z-10 text-[10px] font-bold text-emerald-400">
                        ✚
                      </span>
                    )}

                    {/* Floating Combat Popups (Damage / MISS / Heal / COLLISION!) */}
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
              })
            )}
          </div>

          <CombatVfxOverlay
            rows={map.rows}
            cols={map.cols}
            effects={combatVfx}
          />
          <CanvasParticleOverlay
            rows={map.rows}
            cols={map.cols}
            bursts={canvasBursts}
          />
        </div>
      </div>
    </div>
  );
}
