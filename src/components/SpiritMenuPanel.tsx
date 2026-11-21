import { combatConfig, getUnitSpiritCommands } from '../logic/dataLoader';
import {
  canUseSpiritCommand,
  isSpiritActiveOnUnit,
} from '../logic/spiritLogic';
import type { BattleUnit, SpiritCommandData } from '../logic/types';

interface SpiritMenuPanelProps {
  unit: BattleUnit;
  allUnits: BattleUnit[];
  onCastSpirit: (spirit: SpiritCommandData) => void;
  onOverLimit: () => void;
}

export function SpiritMenuPanel({
  unit,
  allUnits,
  onCastSpirit,
  onOverLimit,
}: SpiritMenuPanelProps) {
  const unitSpirits = getUnitSpiritCommands(unit);
  const hpPercent = (unit.hp / unit.mecha.maxHp) * 100;
  const canOverLimit =
    hpPercent >= combatConfig.overLimit.minHpThresholdPercent &&
    !unit.overLimitUsedThisTurn;

  return (
    <div
      className="hud-panel-amber p-4 backdrop-blur-md"
      data-testid="spirit-menu"
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-orbitron text-xs font-bold tracking-wider text-[#ffb800] uppercase">
            คำสั่งจิตใจ (Spirit Commands)
          </h2>
          <p className="text-[11px] text-slate-400">
            กดใช้ได้ทันทีในเทิร์นตัวเองโดยไม่เสียการเดินหรือการโจมตี
          </p>
        </div>
        <span
          className="font-sci-num rounded-md border border-violet-400/45 bg-violet-500/15 px-2.5 py-1 text-xs font-bold text-violet-200"
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
                  <div
                    className="mt-1 inline-block rounded border border-rose-500/40 bg-rose-950/70 px-1.5 py-0.5 text-[10px] font-bold text-rose-300"
                    data-testid={`spirit-reason-${spirit.id}`}
                  >
                    🔒 {check.reason}
                  </div>
                )
              )}
            </button>
          );
        })}
      </div>
      {/* Over-Limit Special Reactor Boost Button */}
      <div className="mt-3 border-t border-slate-800 pt-3">
        <button
          type="button"
          data-testid="over-limit-btn"
          disabled={!canOverLimit}
          onClick={onOverLimit}
          className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-orange-500/60 bg-gradient-to-r from-rose-950/60 via-orange-950/60 to-amber-950/60 px-3 py-2 text-left transition hover:border-amber-400 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-45"
        >
          <div>
            <div className="text-xs font-extrabold text-amber-200">
              🔥 Over-Limit (เร่งเตาปฏิกรณ์)
            </div>
            <div className="text-[10px] text-orange-200/85">
              หัก HP {combatConfig.overLimit.hpCostPercent}% → ฟื้นฟู EN +
              {combatConfig.overLimit.enGain} และ Will +
              {combatConfig.overLimit.willGain}
            </div>
          </div>
          <span className="rounded bg-orange-500/25 px-2 py-0.5 text-[10px] font-bold text-orange-200">
            {unit.overLimitUsedThisTurn
              ? 'USED'
              : hpPercent < combatConfig.overLimit.minHpThresholdPercent
                ? 'HP < 25%'
                : 'BOOST!'}
          </span>
        </button>
      </div>
    </div>
  );
}
