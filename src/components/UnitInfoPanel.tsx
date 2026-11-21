import { isUnitInOverdrive } from '../logic/combatCalculator';
import { combatConfig, getTerrainById } from '../logic/dataLoader';
import { MechaSprite } from './MechaSprite';
import { PilotPortrait } from './PilotPortrait';
import { TrailingHpBar } from './TrailingHpBar';
import type { BattleUnit, StageMapData } from '../logic/types';

interface UnitInfoPanelProps {
  unit: BattleUnit | null;
  map: StageMapData;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function UnitInfoPanel({ unit, map }: UnitInfoPanelProps) {
  if (!unit) {
    return (
      <div className="hud-panel bg-slate-900/85 p-4 backdrop-blur-md">
        <h2 className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
          COCKPIT TELEMETRY · UNIT STATUS
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          คลิกที่หุ่น{' '}
          <span className="font-semibold text-cyan-300">Giga-Rex</span>{' '}
          บนตารางเพื่อสั่งเดิน, ใช้คำสั่งจิตใจ (Spirit Commands) หรือเลือกอาวุธโจมตี
        </p>
      </div>
    );
  }

  const terrainId = map.tiles[unit.position.row][unit.position.col];
  const terrain = getTerrainById(terrainId);
  const coord = `${COL_LABELS[unit.position.col]}${unit.position.row + 1}`;
  const isPlayer = unit.faction === 'player';

  const activeBuffBadges: Array<{ id: string; label: string; style: string }> =
    [];
  if (unit.stunned) {
    activeBuffBadges.push({
      id: 'stunned',
      label: '💫 STUNNED (ข้ามเทิร์นถัดไป)',
      style: 'border-orange-400/80 bg-orange-500/25 text-orange-200',
    });
  }
  if (isUnitInOverdrive(unit)) {
    activeBuffBadges.push({
      id: 'overdrive',
      label: '⚡ OVERDRIVE (+30% DMG · +25% CRIT · -30% ARM)',
      style:
        'border-amber-400/80 bg-gradient-to-r from-rose-600/35 to-amber-500/30 text-amber-200',
    });
  }
  if (unit.activeSpirits.valor) {
    activeBuffBadges.push({
      id: 'valor',
      label: '🔥 Valor (x2.0 DMG)',
      style: 'border-rose-400/50 bg-rose-500/20 text-rose-200',
    });
  }
  if (unit.activeSpirits.focus) {
    activeBuffBadges.push({
      id: 'focus',
      label: '🎯 Focus (+30% Hit/Evade)',
      style: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200',
    });
  }
  if (unit.activeSpirits.ironWall) {
    activeBuffBadges.push({
      id: 'iron_wall',
      label: '🛡️ Iron Wall (-50% DMG)',
      style: 'border-amber-400/50 bg-amber-500/20 text-amber-200',
    });
  }

  const willProgress = Math.min(
    100,
    Math.max(
      0,
      ((unit.will - combatConfig.will.initial) /
        Math.max(1, unit.maxWill - combatConfig.will.initial)) *
        100
    )
  );

  return (
    <div
      className="hud-panel bg-slate-900/85 p-4 backdrop-blur-md"
      data-testid="unit-info-panel"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <PilotPortrait
            pilotId={unit.pilot.id}
            faction={unit.faction}
            className="h-11 w-11 shrink-0"
          />
          <MechaSprite
            mechaId={unit.mecha.id}
            faction={unit.faction}
            acted={unit.hasActed}
            className="h-10 w-10 shrink-0"
          />
          <div>
            <h2 className="text-base font-bold text-slate-100">
              {unit.mecha.name}
            </h2>
            <p className="text-xs text-slate-400">
              Pilot: {unit.pilot.name} · Pos: {coord}
            </p>
          </div>
        </div>
        <span
          className={`rounded px-2 py-0.5 text-[11px] font-semibold uppercase ${
            isPlayer
              ? 'bg-cyan-500/15 text-cyan-300'
              : 'bg-rose-500/15 text-rose-300'
          }`}
        >
          {unit.faction}
        </span>
      </div>

      {/* Active Spirit Buffs */}
      {activeBuffBadges.length > 0 && (
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          data-testid="active-spirit-buffs"
        >
          {activeBuffBadges.map((buff) => (
            <span
              key={buff.id}
              className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${buff.style}`}
            >
              {buff.label}
            </span>
          ))}
        </div>
      )}

      {/* HP, EN & Will Bars */}
      <div className="mt-3 space-y-2 text-xs">
        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <span className="font-orbitron text-[10px] font-bold tracking-wider text-slate-400">
              HP
            </span>
            <span className="font-sci-num font-bold text-slate-100">
              {unit.hp} / {unit.mecha.maxHp}
            </span>
          </div>
          <TrailingHpBar
            current={unit.hp}
            max={unit.mecha.maxHp}
            barColorClass={isPlayer ? 'bg-[#00f0ff]' : 'bg-[#ff2a55]'}
            heightClass="h-2.5"
          />
        </div>

        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <span className="font-orbitron text-[10px] font-bold tracking-wider text-slate-400">
              EN
            </span>
            <span className="font-sci-num font-bold text-[#ffb800]">
              {unit.en} / {unit.mecha.maxEn}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#080c14]">
            <div
              className="h-full bg-[#ffb800] transition-all duration-500 ease-out"
              style={{ width: `${(unit.en / unit.mecha.maxEn) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <span className="font-orbitron text-[10px] font-bold tracking-wider text-slate-400">
              WILL{' '}
              {unit.will >= 120 && (
                <span className="ml-1 rounded bg-[#ffb800]/25 px-1.5 py-0.5 text-[9px] font-extrabold text-[#ffb800]">
                  MAX POWER!
                </span>
              )}
            </span>
            <span className="font-sci-num font-bold text-[#ffb800]">
              {unit.will} / {unit.maxWill}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#080c14]">
            <div
              className="h-full bg-gradient-to-r from-[#ffb800] to-[#ff2a55] transition-all duration-500 ease-out"
              style={{ width: `${Math.max(8, willProgress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mecha Stats */}
      <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[11px]">
        <div className="rounded-lg border border-[#00f0ff]/20 bg-[#080c14]/80 p-1.5">
          <div className="text-[10px] text-slate-400">MOVE</div>
          <div className="font-sci-num font-bold text-[#00f0ff]">
            {unit.mecha.move}
          </div>
        </div>
        <div className="rounded-lg border border-[#00f0ff]/20 bg-[#080c14]/80 p-1.5">
          <div className="text-[10px] text-slate-400">ARMOR</div>
          <div className="font-sci-num font-bold text-slate-100">
            {unit.mecha.armor}
          </div>
        </div>
        <div className="rounded-lg border border-[#00f0ff]/20 bg-[#080c14]/80 p-1.5">
          <div className="text-[10px] text-slate-400">MOB</div>
          <div className="font-sci-num font-bold text-slate-100">
            {unit.mecha.mobility}
          </div>
        </div>
        <div className="rounded-lg border border-[#00f0ff]/20 bg-[#080c14]/80 p-1.5">
          <div className="text-[10px] text-slate-400">STATUS</div>
          <div
            className={`font-bold ${
              unit.hasActed
                ? 'text-slate-500'
                : unit.hasMoved
                  ? 'text-[#ffb800]'
                  : 'text-emerald-400'
            }`}
          >
            {unit.hasActed ? 'Done' : unit.hasMoved ? 'Moved' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Pilot Stats */}
      <div className="mt-2 grid grid-cols-5 gap-1.5 text-center text-[11px]">
        <div className="rounded-lg border border-slate-800 bg-[#080c14]/70 p-1.5">
          <div className="text-[9px] text-slate-400">MEL</div>
          <div className="font-sci-num font-bold text-slate-200">
            {unit.pilot.melee}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080c14]/70 p-1.5">
          <div className="text-[9px] text-slate-400">RNG</div>
          <div className="font-sci-num font-bold text-slate-200">
            {unit.pilot.ranged}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080c14]/70 p-1.5">
          <div className="text-[9px] text-slate-400">ACC</div>
          <div className="font-sci-num font-bold text-slate-200">
            {unit.pilot.accuracy}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080c14]/70 p-1.5">
          <div className="text-[9px] text-slate-400">EVD</div>
          <div className="font-sci-num font-bold text-slate-200">
            {unit.pilot.evade}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-[#080c14]/70 p-1.5">
          <div className="text-[9px] text-slate-400">SP</div>
          <div className="font-sci-num font-bold text-violet-300">
            {unit.sp}/{unit.pilot.maxSp}
          </div>
        </div>
      </div>

      {/* Terrain Info */}
      <div className="mt-2.5 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300">
        <span className="text-slate-400">พื้นผิว: </span>
        <span className="font-medium text-emerald-300">
          {terrain?.name} ({terrain?.label})
        </span>
      </div>
    </div>
  );
}
