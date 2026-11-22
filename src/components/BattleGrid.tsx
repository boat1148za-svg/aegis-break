import { useState } from 'react';
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
  threatTileKeys?: Set<string>;
  floatingTexts: FloatingTextEvent[];
  unitAnimations: Record<string, UnitAnimationType>;
  combatVfx: CombatVfxEvent[];
  canvasBursts: CanvasParticleBurst[];
  cameraZoom: CameraZoomState | null;
  hitstopUnitId: string | null;
  onTileClick: (pos: GridPosition) => void;
  onHoverUnit?: (unitId: string | null) => void;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

function getTerrainStyle(terrainId: TerrainId): string {
  switch (terrainId) {
    case 'repair_zone':
      return 'tile-25d bg-emerald-950/70 border-emerald-400/55 hover:border-emerald-300/90';
    case 'obstacle':
      return 'tile-obstacle-25d border-[#ffb800]/45';
    case 'explosive_core':
      return 'tile-explosive-25d border-orange-400/80 hover:border-amber-300';
    case 'high_ground':
      return 'tile-high-ground-25d border-[#00f0ff]/65 hover:border-white/90';
    case 'plasma_hazard':
      return 'tile-plasma-hazard-25d border-fuchsia-400/75 hover:border-[#ff2a55]';
    case 'normal':
    default:
      return 'tile-25d bg-[#0b1324]/78 border-[#00f0ff]/22 hover:border-[#00f0ff]/75';
  }
}

function getFloatingTextStyle(variant: FloatingTextEvent['variant']): string {
  switch (variant) {
    case 'damage':
      return 'bg-[#ff2a55] text-white border-rose-200 shadow-[#ff2a55]/50';
    case 'destroyed':
      return 'bg-[#ffb800] text-[#080c14] border-amber-100 shadow-[#ffb800]/60';
    case 'collision':
      return 'bg-orange-500 text-white border-amber-200 shadow-orange-900/70';
    case 'miss':
      return 'bg-slate-800 text-slate-100 border-slate-400';
    case 'heal':
      return 'bg-emerald-500 text-[#080c14] border-emerald-200';
  }
}

function ObstacleCrystalSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="pointer-events-none h-9 w-9 sm:h-11 sm:w-11"
      aria-hidden="true"
      data-testid="obstacle-crystal-svg"
    >
      <defs>
        <linearGradient id="crystalMain" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#00f0ff" />
          <stop offset="55%" stopColor="#0284c7" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id="crystalHighlight" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e0faff" />
          <stop offset="100%" stopColor="#00f0ff" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient id="bastionBase" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>
      {/* Cast 2.5D Ground Shadow */}
      <ellipse
        cx="35"
        cy="54"
        rx="22"
        ry="6.5"
        fill="rgba(2, 6, 18, 0.78)"
      />
      {/* Armored Fortress Plinth */}
      <polygon
        points="11,48 20,41 44,41 53,48 47,55 17,55"
        fill="url(#bastionBase)"
        stroke="#ffb800"
        strokeOpacity="0.55"
        strokeWidth="1.2"
      />
      {/* Left Side Crystal Shard */}
      <polygon
        points="17,45 14,26 23,19 27,45"
        fill="#0369a1"
        stroke="#00f0ff"
        strokeOpacity="0.65"
        strokeWidth="1"
      />
      {/* Right Side Crystal Shard */}
      <polygon
        points="38,45 42,22 50,29 47,45"
        fill="#0c4a6e"
        stroke="#00f0ff"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      {/* Central Energy Crystal Spire */}
      <polygon
        points="23,46 21,21 32,7 43,21 41,46"
        fill="url(#crystalMain)"
        stroke="#7df9ff"
        strokeWidth="1.3"
      />
      {/* Facet Specular Highlight */}
      <polygon
        points="32,7 26,22 32,44 37,22"
        fill="url(#crystalHighlight)"
        opacity="0.7"
      />
      {/* Glowing Amber Core Rune */}
      <polygon
        points="32,26 35.5,33 32,39 28.5,33"
        fill="#ffb800"
        opacity="0.92"
      />
    </svg>
  );
}

function ExplosiveCoreSvg() {
  return (
    <svg
      viewBox="0 0 64 64"
      className="pointer-events-none h-9 w-9 sm:h-11 sm:w-11"
      aria-hidden="true"
      data-testid="explosive-core-svg"
    >
      <defs>
        <radialGradient id="coreGlowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff7ed" />
          <stop offset="45%" stopColor="#ffb800" />
          <stop offset="100%" stopColor="#ea580c" />
        </radialGradient>
      </defs>
      <ellipse cx="33" cy="54" rx="18" ry="5.5" fill="rgba(2, 6, 18, 0.8)" />
      {/* Reactor Drum Body */}
      <rect
        x="17"
        y="16"
        width="30"
        height="34"
        rx="6"
        fill="#1e293b"
        stroke="#fb923c"
        strokeWidth="2"
      />
      {/* Hazard Caution Bands */}
      <rect x="17" y="21" width="30" height="4" fill="#ffb800" opacity="0.85" />
      <rect x="17" y="41" width="30" height="4" fill="#ef4444" opacity="0.85" />
      {/* Glowing Plasma Barrel Core */}
      <circle
        cx="32"
        cy="33"
        r="7.5"
        fill="url(#coreGlowGrad)"
        className="animate-pulse"
      />
      <rect x="24" y="11" width="16" height="5" rx="2" fill="#475569" stroke="#fb923c" strokeWidth="1" />
    </svg>
  );
}

function HighGroundIndicator() {
  return (
    <div
      aria-hidden="true"
      data-testid="high-ground-indicator"
      className="pointer-events-none absolute inset-0 overflow-hidden rounded-md"
    >
      {/* Top 2.5D Platform Ledge + Corner Chevron */}
      <span className="absolute inset-x-1 top-1 h-0.5 rounded bg-[#00f0ff]/65" />
      <span className="font-orbitron absolute top-0.5 right-1 text-[8px] font-black text-[#00f0ff] drop-shadow-[0_0_6px_rgba(0,240,255,0.9)]">
        ▲HG
      </span>
    </div>
  );
}

function PlasmaHazardIndicator() {
  return (
    <div
      aria-hidden="true"
      data-testid="plasma-hazard-indicator"
      className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-md"
    >
      <span className="absolute h-7 w-7 rounded-full border border-fuchsia-300/60 bg-[#ff2a55]/25 blur-[1px]" />
      <span className="relative text-xs font-black text-fuchsia-200 drop-shadow-[0_0_6px_rgba(255,42,85,0.95)]">
        ☣
      </span>
    </div>
  );
}

export function BattleGrid({
  map,
  units,
  selectedUnitId,
  reachableTileKeys,
  attackRangeTileKeys,
  mapPreviewTileKeys,
  dangerZoneTileKeys,
  threatTileKeys,
  floatingTexts,
  unitAnimations,
  combatVfx,
  canvasBursts,
  cameraZoom,
  hitstopUnitId,
  onTileClick,
  onHoverUnit,
}: BattleGridProps) {
  const [hoveredTile, setHoveredTile] = useState<{
    pos: GridPosition;
    terrainId: TerrainId;
    unitName?: string;
  } | null>(null);

  const hoveredTerrainCfg = hoveredTile
    ? getTerrainById(hoveredTile.terrainId)
    : null;

  return (
    <div className="hud-panel relative overflow-hidden p-4 backdrop-blur-md">
      {/* Legend + Dynamic Map Name */}
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
        <span className="font-orbitron text-[11px] font-bold tracking-[0.14em] text-[#00f0ff] uppercase">
          {map.name} ({map.rows}x{map.cols})
        </span>
        <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-emerald-400/70 bg-emerald-900/80" />
            Base
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-[#00f0ff]/80 bg-cyan-900/80" />
            ▲ High Ground
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-orange-400 bg-orange-950" />
            Explosive Core
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-fuchsia-400 bg-rose-900/80" />
            ☣ Plasma
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-[#00f0ff] bg-[#00f0ff]/35" />
            Move
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-[#ff2a55] bg-[#ff2a55]/40" />
            Attack
          </span>
          <span className="flex items-center gap-1">
            <span className="animate-danger-zone inline-block h-2.5 w-2.5 rounded border border-[#ff2a55]" />
            Danger
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded border border-amber-400/80 bg-amber-500/25" />
            Threat
          </span>
        </div>
      </div>

      {/* Interactive Terrain Info Tooltip Bar (updates on tile hover) */}
      <div
        data-testid="terrain-tooltip"
        className="mb-3 flex min-h-8 flex-wrap items-center justify-between gap-2 rounded-lg border border-[#00f0ff]/25 bg-[#060a12]/88 px-3 py-1.5 text-xs"
      >
        {hoveredTile && hoveredTerrainCfg ? (
          <>
            <div className="flex items-center gap-2">
              <span className="font-sci-num rounded border border-[#00f0ff]/45 bg-[#00f0ff]/12 px-1.5 py-0.5 text-[10px] font-bold text-[#00f0ff]">
                {COL_LABELS[hoveredTile.pos.col]}
                {hoveredTile.pos.row + 1}
              </span>
              <span className="font-bold text-slate-100">
                {hoveredTerrainCfg.name} ({hoveredTerrainCfg.label})
              </span>
              {hoveredTile.unitName && (
                <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-[#ffb800]">
                  {hoveredTile.unitName}
                </span>
              )}
            </div>
            <span className="text-[11px] text-cyan-200/90">
              {hoveredTerrainCfg.description ?? hoveredTerrainCfg.label}
            </span>
          </>
        ) : (
          <span className="text-[11px] text-slate-400">
            💡 เลื่อนเมาส์เหนือช่องตารางเพื่อดูรายละเอียดพื้นผิว (High Ground, Explosive Core, Plasma Hazard)
          </span>
        )}
      </div>

      {/* Column headers */}
      <div className="font-sci-num mb-1 grid grid-cols-[24px_repeat(8,minmax(0,1fr))] gap-1.5 text-center text-[11px] font-semibold text-[#00f0ff]/60">
        <div />
        {COL_LABELS.slice(0, map.cols).map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      {/* 8x8 Grid Rows + Beam/Slash VFX Overlay */}
      <div className="grid grid-cols-[24px_minmax(0,1fr)] gap-1.5">
        {/* Row labels */}
        <div className="font-sci-num grid grid-rows-8 gap-1.5">
          {map.tiles.map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center justify-center text-[11px] font-semibold text-[#00f0ff]/60"
            >
              {rowIdx + 1}
            </div>
          ))}
        </div>

        {/* 8x8 Tiles + 2.5D Camera Zoom (clipped cleanly inside viewport) + Canvas 60FPS Particle VFX */}
        <div className="overflow-hidden rounded-lg">
          <div
            className="relative rounded-lg transition-transform duration-300 ease-out"
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
                const isThreatZone = Boolean(threatTileKeys?.has(key));
                const isAttackRange =
                  !isMapPreview && attackRangeTileKeys.has(key);
                const isReachable =
                  !isMapPreview && !isAttackRange && reachableTileKeys.has(key);
                const isAttackableEnemy =
                  (isAttackRange || isMapPreview) && unit?.faction === 'enemy';
                const isTargetableCore =
                  (isAttackRange || isMapPreview) &&
                  !unit &&
                  terrainId === 'explosive_core';
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
                    data-threat-zone={isThreatZone ? 'true' : 'false'}
                    onMouseEnter={() => {
                      setHoveredTile({
                        pos,
                        terrainId,
                        unitName: unit?.mecha.name,
                      });
                      onHoverUnit?.(unit ? unit.instanceId : null);
                    }}
                    onMouseLeave={() => {
                      setHoveredTile(null);
                      onHoverUnit?.(null);
                    }}
                    onFocus={() =>
                      setHoveredTile({
                        pos,
                        terrainId,
                        unitName: unit?.mecha.name,
                      })
                    }
                    onClick={() => onTileClick(pos)}
                    title={`${COL_LABELS[colIdx]}${rowIdx + 1} - ${terrain?.name ?? terrainId}${unit ? ` (${unit.mecha.name})` : ''}${isDangerZone ? ' [⚠️ DANGER ZONE]' : ''}${isThreatZone ? ' [👁️ ENEMY THREAT]' : ''}`}
                    className={`relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border transition-all ${getTerrainStyle(
                      terrainId
                    )} ${
                      isThreatZone && !isDangerZone
                        ? 'border-amber-400/75! bg-amber-500/18! shadow-[inset_0_0_12px_rgba(245,158,11,0.3)]'
                        : ''
                    } ${
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
                      isTargetableCore
                        ? 'ring-2! ring-orange-400! cursor-crosshair!'
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
                    {/* Subtle Tech-Grid Corner Micro-Reticle */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute top-0.5 left-0.5 h-1.5 w-1.5 border-t border-l border-[#00f0ff]/35"
                    />
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute right-0.5 bottom-0.5 h-1.5 w-1.5 border-r border-b border-[#00f0ff]/35"
                    />

                    {/* Base / Repair Zone Rotating Energy Ring */}
                    {terrainId === 'repair_zone' && (
                      <span
                        aria-hidden="true"
                        className="animate-spin-slow pointer-events-none absolute inset-1.5 rounded-full border-2 border-dashed border-emerald-400/65 shadow-[0_0_10px_rgba(52,211,153,0.4)]"
                      />
                    )}

                    {/* Danger Zone Warning Icon */}
                    {isDangerZone && !unit && (
                      <span className="pointer-events-none text-xs font-extrabold text-[#ff2a55]">
                        ⚠️
                      </span>
                    )}

                    {/* Terrain subtle indicator */}
                    {terrainId === 'high_ground' && <HighGroundIndicator />}
                    {!unit && terrainId === 'plasma_hazard' && (
                      <PlasmaHazardIndicator />
                    )}
                    {!unit && !isDangerZone && terrainId === 'repair_zone' && (
                      <span className="relative z-10 text-sm font-bold text-emerald-300 drop-shadow-[0_0_8px_rgba(52,211,153,0.95)]">
                        ✚
                      </span>
                    )}
                    {!unit && terrainId === 'obstacle' && <ObstacleCrystalSvg />}
                    {!unit && terrainId === 'explosive_core' && (
                      <ExplosiveCoreSvg />
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
                        className={`font-sci-num animate-float-pop pointer-events-none absolute top-0 left-1/2 z-30 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-extrabold shadow-lg ${getFloatingTextStyle(
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
    </div>
  );
}
