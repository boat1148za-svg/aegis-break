import { useState } from 'react';
import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import type {
  MetaProgressState,
  RunNodeData,
  RunPlayerState,
} from '../logic/types';

interface EventNodeScreenProps {
  node: RunNodeData;
  runPlayer: RunPlayerState;
  meta: MetaProgressState;
  onCompleteEvent: (updatedPlayer: RunPlayerState) => void;
}

export function EventNodeScreen({
  node,
  runPlayer,
  meta,
  onCompleteEvent,
}: EventNodeScreenProps) {
  const unitDef = getUnitDefById(runPlayer.unitDefId)!;
  const effectiveMecha = getEffectivePlayerMecha(runPlayer, meta);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [nextPlayerState, setNextPlayerState] =
    useState<RunPlayerState | null>(null);

  const cfg = node.eventConfig ?? {};
  const maxHp = effectiveMecha.maxHp;
  const maxEn = effectiveMecha.maxEn;
  const maxSp = getEffectivePlayerMaxSp(runPlayer, meta);
  const currentMaxWill = combatConfig.will.max + runPlayer.maxWillBonus;

  const handleRepairPercent = () => {
    const hpPercent = cfg.repairHpPercent ?? 50;
    const enPercent = cfg.repairEnPercent ?? 50;
    const spPercent = cfg.restoreSpPercent ?? 0;

    const hpGain = Math.round((maxHp * hpPercent) / 100);
    const enGain = Math.round((maxEn * enPercent) / 100);
    const spGain = Math.round((maxSp * spPercent) / 100);

    const updated: RunPlayerState = {
      ...runPlayer,
      hp: Math.min(maxHp, runPlayer.hp + hpGain),
      en: Math.min(maxEn, runPlayer.en + enGain),
      sp: Math.min(maxSp, runPlayer.sp + spGain),
    };

    setNextPlayerState(updated);
    if (spPercent > 0) {
      setResultMessage(
        `⚡ ซ่อมแซมและเติมเสบียงเต็มพิกัดสำเร็จ! HP ${updated.hp}/${maxHp}, EN ${updated.en}/${maxEn}, SP ${updated.sp}/${maxSp}`
      );
    } else {
      setResultMessage(
        `🔧 ซ่อมบำรุงฉุกเฉินสำเร็จ! HP ${runPlayer.hp} → ${updated.hp}/${maxHp}, EN ${runPlayer.en} → ${updated.en}/${maxEn}`
      );
    }
  };

  const handleTrainMaxWill = () => {
    const bonus = cfg.trainMaxWillBonus ?? 10;
    const updated: RunPlayerState = {
      ...runPlayer,
      maxWillBonus: runPlayer.maxWillBonus + bonus,
    };
    setNextPlayerState(updated);
    setResultMessage(
      `🔥 ฝึกซ้อมเข้มข้นสำเร็จ! Max Will เพิ่มขึ้น ${currentMaxWill} → ${
        currentMaxWill + bonus
      } ตลอดรอบนี้`
    );
  };

  const displayPlayer = nextPlayerState ?? runPlayer;

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
      data-testid="event-node-screen"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/40 bg-slate-900 p-8 shadow-2xl">
        <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
          NODE {node.nodeNumber} · {node.typeLabel}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-50">{node.title}</h1>
        <p className="mt-2 text-sm text-slate-300">{node.description}</p>

        {/* Current Mecha Status */}
        <div className="mt-5 grid grid-cols-4 gap-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center text-xs">
          <div>
            <div className="text-slate-400">HP</div>
            <div className="mt-0.5 font-bold text-emerald-300">
              {displayPlayer.hp} / {maxHp}
            </div>
          </div>
          <div>
            <div className="text-slate-400">EN</div>
            <div className="mt-0.5 font-bold text-amber-300">
              {displayPlayer.en} / {maxEn}
            </div>
          </div>
          <div>
            <div className="text-slate-400">SP</div>
            <div className="mt-0.5 font-bold text-violet-300">
              {displayPlayer.sp} / {maxSp}
            </div>
          </div>
          <div>
            <div className="text-slate-400">Max Will</div>
            <div className="mt-0.5 font-bold text-rose-300">
              {combatConfig.will.max + displayPlayer.maxWillBonus}
            </div>
          </div>
        </div>

        {/* Choices or Result */}
        {!resultMessage ? (
          <div className="mt-6 space-y-3">
            {node.type === 'repair_event' ? (
              <>
                <button
                  type="button"
                  data-testid="event-choice-repair"
                  onClick={handleRepairPercent}
                  className="w-full cursor-pointer rounded-xl border border-emerald-500/45 bg-emerald-950/30 p-4 text-left transition hover:border-emerald-400 hover:bg-emerald-950/50"
                >
                  <div className="text-sm font-bold text-emerald-200">
                    🔧 ซ่อมบำรุงฉุกเฉิน (ซ่อม HP / EN {cfg.repairHpPercent ?? 50}
                    %)
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    ฟื้นฟู HP +{cfg.repairHpPercent ?? 50}% และ EN +
                    {cfg.repairEnPercent ?? 50}% ของค่าสูงสุด
                  </p>
                </button>

                <button
                  type="button"
                  data-testid="event-choice-train"
                  onClick={handleTrainMaxWill}
                  className="w-full cursor-pointer rounded-xl border border-amber-500/45 bg-amber-950/25 p-4 text-left transition hover:border-amber-400 hover:bg-amber-950/45"
                >
                  <div className="text-sm font-bold text-amber-200">
                    🔥 ฝึกซ้อมเพิ่ม Max Will +{cfg.trainMaxWillBonus ?? 10}
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    ปลุกขีดจำกัดนักบิน เพิ่มค่า Max Will ถาวรเป็น{' '}
                    {currentMaxWill + (cfg.trainMaxWillBonus ?? 10)} ตลอดการเดินทางรอบนี้
                  </p>
                </button>
              </>
            ) : (
              <button
                type="button"
                data-testid="event-choice-supply"
                onClick={handleRepairPercent}
                className="w-full cursor-pointer rounded-xl border border-emerald-400/60 bg-emerald-600/20 p-5 text-left transition hover:bg-emerald-600/30"
              >
                <div className="text-base font-bold text-emerald-200">
                  ⚡ ซ่อมแซมและฟื้นฟู SP เต็ม 100%
                </div>
                <p className="mt-1 text-xs text-slate-300">
                  ฟื้นฟู HP, EN และ SP ของ {unitDef.mecha.name} กลับมาเต็ม 100%
                  เพื่อเตรียมพร้อมรับศึกหนัก
                </p>
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div
              className="rounded-xl border border-emerald-500/40 bg-emerald-950/30 p-4 text-sm font-medium text-emerald-200"
              data-testid="event-result-msg"
            >
              {resultMessage}
            </div>
            <button
              type="button"
              data-testid="event-continue-btn"
              onClick={() => onCompleteEvent(displayPlayer)}
              className="w-full cursor-pointer rounded-xl bg-cyan-600 py-3 text-sm font-bold text-white transition hover:bg-cyan-500"
            >
              กลับสู่แผนที่เส้นทาง (Continue to Node Map) →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
