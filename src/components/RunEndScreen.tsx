import { AmbientBackdrop } from './AmbientBackdrop';
import { getUnitDefById } from '../logic/dataLoader';
import type { RunSummaryData } from '../logic/types';

interface RunEndScreenProps {
  summary: RunSummaryData;
  onReturnToHangar: () => void;
}

export function RunEndScreen({
  summary,
  onReturnToHangar,
}: RunEndScreenProps) {
  const isVictory = summary.outcome === 'victory';
  const unitDef = getUnitDefById(summary.unitDefId);

  return (
    <div
      className="relative flex min-h-screen items-center justify-center bg-[#080c14] p-6 text-slate-100"
      data-testid="run-end-screen"
      data-outcome={summary.outcome}
    >
      <AmbientBackdrop />
      <div
        className={`relative z-10 w-full max-w-xl overflow-hidden shadow-2xl backdrop-blur-md ${
          isVictory ? 'hud-panel' : 'hud-panel-rose'
        }`}
      >
        {/* Top Banner */}
        <div
          className={`px-8 py-8 text-center ${
            isVictory
              ? 'bg-gradient-to-b from-emerald-950/80 to-slate-900'
              : 'bg-gradient-to-b from-rose-950/80 to-slate-900'
          }`}
        >
          <div className="text-5xl">{isVictory ? '🏆' : '💀'}</div>
          <p
            className={`mt-3 text-xs font-bold tracking-[0.25em] uppercase ${
              isVictory ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isVictory ? 'Mission Accomplished' : 'Mission Failed · Permadeath'}
          </p>
          <h1
            className={`mt-1 text-3xl font-extrabold tracking-tight ${
              isVictory ? 'text-emerald-200' : 'text-rose-200'
            }`}
            data-testid="run-end-title"
          >
            {isVictory ? 'VICTORY' : 'GAME OVER'}
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            {isVictory
              ? `${unitDef?.mecha.name} ปราบบอสใหญ่ Overlord Dreadnought สำเร็จ!`
              : `หุ่นหลัก ${unitDef?.mecha.name} ถูกทำลายกลางสนามรบ`}
          </p>
        </div>

        {/* Run Summary & Astral Shards Breakdown */}
        <div className="space-y-4 px-8 py-6">
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="text-slate-400">หุ่นที่ใช้งาน</div>
              <div className="mt-1 font-bold text-slate-100">
                {unitDef?.icon} {unitDef?.mecha.name}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="text-slate-400">ด่านที่ผ่าน</div>
              <div className="mt-1 font-bold text-cyan-300">
                {summary.nodesCleared} / {summary.totalNodes}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="text-slate-400">อัปเกรดที่ติดตั้ง</div>
              <div className="mt-1 font-bold text-amber-300">
                {summary.installedUpgradeCount} ชิ้น
              </div>
            </div>
          </div>

          <div
            className="rounded-xl border border-violet-500/40 bg-violet-950/25 p-5"
            data-testid="run-end-shards-box"
          >
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-violet-300 uppercase">
              <span>Meta-Progression Reward · Astral Shards</span>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] text-rose-200">
                Threat Lv.{summary.threatLevel} (x{summary.shardMultiplier})
              </span>
            </div>
            {summary.unlockedNewThreatLevel !== null && (
              <div className="mt-2 rounded-lg border border-amber-400/50 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-200">
                🔓 ปลดล็อก Threat Level {summary.unlockedNewThreatLevel} สำเร็จ!
              </div>
            )}
            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>รางวัลตามจำนวนด่านที่ผ่าน ({summary.nodesCleared} ด่าน)</span>
                <span className="font-semibold text-violet-200">
                  +{summary.shardsFromNodes} Shards
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  {isVictory
                    ? 'โบนัสปราบบอสใหญ่ (Boss Clear)'
                    : 'แต้มชดเชยการออกรบ (Combat Data)'}
                </span>
                <span className="font-semibold text-violet-200">
                  +{summary.bonusShards} Shards
                </span>
              </div>
              <div className="mt-2 flex justify-between border-t border-violet-500/30 pt-2 text-sm font-bold text-violet-200">
                <span>ได้รับรวมรอบนี้</span>
                <span data-testid="run-end-shards-earned">
                  ✨ +{summary.totalShardsEarned} Astral Shards
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>Astral Shards สะสมทั้งหมด (บันทึกแล้ว)</span>
                <span
                  className="font-bold text-slate-200"
                  data-testid="run-end-shards-total"
                >
                  ✨ {summary.newTotalShards.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            data-testid="run-end-return-hangar"
            onClick={onReturnToHangar}
            className="w-full cursor-pointer rounded-xl bg-cyan-600 py-3.5 text-sm font-bold text-white shadow-lg transition hover:bg-cyan-500"
          >
            กลับไปโรงเก็บหุ่น (Hangar &amp; Meta-Upgrades) →
          </button>
        </div>
      </div>
    </div>
  );
}
