import { getTerrainById } from '../logic/dataLoader';
import type { BattleUnit, StageMapData } from '../logic/types';

interface UnitInfoPanelProps {
  unit: BattleUnit | null;
  map: StageMapData;
}

const COL_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export function UnitInfoPanel({ unit, map }: UnitInfoPanelProps) {
  if (!unit) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
        <h2 className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
          Unit Status
        </h2>
        <p className="mt-3 text-sm text-slate-400">
          คลิกที่หุ่น <span className="font-semibold text-cyan-300">Giga-Rex</span>{' '}
          บนตารางเพื่อแสดงระยะการเดิน (Move) แล้วคลิกช่องสีฟ้าเพื่อสั่งเคลื่อนที่
        </p>
      </div>
    );
  }

  const terrainId = map.tiles[unit.position.row][unit.position.col];
  const terrain = getTerrainById(terrainId);
  const coord = `${COL_LABELS[unit.position.col]}${unit.position.row + 1}`;
  const isPlayer = unit.faction === 'player';

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{unit.icon}</span>
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

      {/* HP & EN Bars */}
      <div className="mt-4 space-y-2.5 text-xs">
        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <span>HP</span>
            <span>
              {unit.hp} / {unit.mecha.maxHp}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-950">
            <div
              className={`h-full ${isPlayer ? 'bg-cyan-400' : 'bg-rose-400'}`}
              style={{ width: `${(unit.hp / unit.mecha.maxHp) * 100}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-slate-300">
            <span>EN</span>
            <span>
              {unit.en} / {unit.mecha.maxEn}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-950">
            <div
              className="h-full bg-amber-400"
              style={{ width: `${(unit.en / unit.mecha.maxEn) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">MOVE</div>
          <div className="font-bold text-cyan-300">{unit.mecha.move}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">ARMOR</div>
          <div className="font-bold text-slate-200">{unit.mecha.armor}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">MOBILITY</div>
          <div className="font-bold text-slate-200">{unit.mecha.mobility}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">WILL</div>
          <div className="font-bold text-amber-300">{unit.will}</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">SP</div>
          <div className="font-bold text-violet-300">
            {unit.sp}/{unit.pilot.maxSp}
          </div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-2">
          <div className="text-[10px] text-slate-400">STATUS</div>
          <div
            className={`font-bold ${
              unit.hasMoved ? 'text-slate-500' : 'text-emerald-400'
            }`}
          >
            {unit.hasMoved ? 'Moved' : 'Ready'}
          </div>
        </div>
      </div>

      {/* Terrain Info */}
      <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
        <span className="text-slate-400">พื้นผิวปัจจุบัน: </span>
        <span className="font-medium text-emerald-300">
          {terrain?.name} ({terrain?.label})
        </span>
      </div>
    </div>
  );
}
