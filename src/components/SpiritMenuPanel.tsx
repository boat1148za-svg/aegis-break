import { getUnitSpiritCommands } from '../logic/dataLoader';
import {
  canUseSpiritCommand,
  isSpiritActiveOnUnit,
} from '../logic/spiritLogic';
import type { BattleUnit, SpiritCommandData } from '../logic/types';

interface SpiritMenuPanelProps {
  unit: BattleUnit;
  allUnits: BattleUnit[];
  onCastSpirit: (spirit: SpiritCommandData) => void;
}

export function SpiritMenuPanel({
  unit,
  allUnits,
  onCastSpirit,
}: SpiritMenuPanelProps) {
  const unitSpirits = getUnitSpiritCommands(unit);

  return (
    <div
      className="rounded-xl border border-amber-500/35 bg-slate-900/90 p-4 shadow-lg"
      data-testid="spirit-menu"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-semibold tracking-wider text-amber-400 uppercase">
            คำสั่งจิตใจ (Spirit Commands)
          </h2>
          <p className="text-[11px] text-slate-400">
            กดใช้ได้ทันทีในเทิร์นตัวเองโดยไม่เสียการเดินหรือการโจมตี
          </p>
        </div>
        <span
          className="rounded-md border border-violet-500/40 bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200"
          data-testid="spirit-sp-display"
        >
          SP {unit.sp}/{unit.pilot.maxSp}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {unitSpirits.map((spirit) => {
          const isActive = isSpiritActiveOnUnit(unit, spirit.id);
          const check = canUseSpiritCommand(unit, spirit, allUnits);

          return (
            <button
              key={spirit.id}
              type="button"
              data-testid={`spirit-btn-${spirit.id}`}
              disabled={!check.usable}
              onClick={() => onCastSpirit(spirit)}
              className={`cursor-pointer rounded-lg border p-2.5 text-left transition ${
                isActive
                  ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/70'
                  : 'border-slate-800 bg-slate-950/75 hover:border-amber-400/60 hover:bg-slate-900'
              } disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-xs font-bold text-slate-100">
                  {spirit.icon} {spirit.name}
                </span>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                  {spirit.spCost} SP
                </span>
              </div>
              <div className="mt-0.5 text-[10px] text-slate-400">
                {spirit.nameTh}
              </div>
              <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-300">
                {spirit.description}
              </p>
              {isActive ? (
                <div className="mt-1 text-[10px] font-bold text-amber-300">
                  ● ACTIVE
                </div>
              ) : (
                !check.usable &&
                check.reason && (
                  <div className="mt-1 text-[10px] font-medium text-rose-400">
                    {check.reason}
                  </div>
                )
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
