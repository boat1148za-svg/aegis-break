import { useState } from 'react';
import {
  combatConfig,
  getEffectivePlayerMaxSp,
  getEffectivePlayerMecha,
  getUnitDefById,
} from '../logic/dataLoader';
import {
  pickRandomNarrativeEvent,
  resolveNarrativeEventChoice,
} from '../logic/eventLogic';
import type {
  MetaProgressState,
  NarrativeEventChoice,
  NarrativeEventData,
  RunNodeData,
  RunPlayerState,
} from '../logic/types';

export interface AmbushRequest {
  rewardAllyId?: string;
  fallbackShards?: number;
}

interface EventNodeScreenProps {
  node: RunNodeData;
  runPlayer: RunPlayerState;
  meta: MetaProgressState;
  onCompleteEvent: (updatedPlayer: RunPlayerState, shardsEarned: number) => void;
  onTriggerAmbushBattle: (ambush: AmbushRequest) => void;
}

export function EventNodeScreen({
  node,
  runPlayer,
  meta,
  onCompleteEvent,
  onTriggerAmbushBattle,
}: EventNodeScreenProps) {
  const unitDef = getUnitDefById(runPlayer.unitDefId)!;
  const effectiveMecha = getEffectivePlayerMecha(runPlayer, meta);

  const [narrativeEvent] = useState<NarrativeEventData | null>(() =>
    node.type === 'repair_event' ? pickRandomNarrativeEvent() : null
  );
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [nextPlayerState, setNextPlayerState] =
    useState<RunPlayerState | null>(null);
  const [earnedShards, setEarnedShards] = useState(0);

  const cfg = node.eventConfig ?? {};
  const maxHp = effectiveMecha.maxHp;
  const maxEn = effectiveMecha.maxEn;
  const maxSp = getEffectivePlayerMaxSp(runPlayer, meta);

  const handleFullSupply = () => {
    const hpPercent = cfg.repairHpPercent ?? 100;
    const enPercent = cfg.repairEnPercent ?? 100;
    const spPercent = cfg.restoreSpPercent ?? 100;

    const updated: RunPlayerState = {
      ...runPlayer,
      hp: Math.min(maxHp, runPlayer.hp + Math.round((maxHp * hpPercent) / 100)),
      en: Math.min(maxEn, runPlayer.en + Math.round((maxEn * enPercent) / 100)),
      sp: Math.min(maxSp, runPlayer.sp + Math.round((maxSp * spPercent) / 100)),
    };

    setNextPlayerState(updated);
    setEarnedShards(0);
    setResultMessage(
      `⚡ ซ่อมแซมและเติมเสบียงเต็มพิกัดสำเร็จ! HP ${updated.hp}/${maxHp}, EN ${updated.en}/${maxEn}, SP ${updated.sp}/${maxSp}`
    );
  };

  const handleSelectNarrativeChoice = (choice: NarrativeEventChoice) => {
    const resolution = resolveNarrativeEventChoice(choice, runPlayer, meta);
    if (resolution.triggerAmbushBattle) {
      onTriggerAmbushBattle({
        rewardAllyId: resolution.rewardAllyId,
        fallbackShards: resolution.fallbackShards,
      });
      return;
    }

    setNextPlayerState(resolution.updatedPlayer);
    setEarnedShards(resolution.shardsEarned);
    setResultMessage(resolution.resultMessage);
  };

  const displayPlayer = nextPlayerState ?? runPlayer;
  const displayEffectiveMecha = getEffectivePlayerMecha(displayPlayer, meta);

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100"
      data-testid="event-node-screen"
    >
      <div className="w-full max-w-2xl rounded-2xl border border-emerald-500/40 bg-slate-900 p-8 shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3">
          {narrativeEvent && (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-2xl">
              {narrativeEvent.icon}
            </span>
          )}
          <div>
            <p className="text-xs font-semibold tracking-widest text-emerald-400 uppercase">
              NODE {node.nodeNumber} ·{' '}
              {narrativeEvent
                ? `Narrative Event · ${narrativeEvent.subtitle}`
                : node.typeLabel}
            </p>
            <h1
              className="mt-1 text-2xl font-bold text-slate-50"
              data-testid="event-title"
            >
              {narrativeEvent ? narrativeEvent.title : node.title}
            </h1>
          </div>
        </div>

        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          {narrativeEvent ? narrativeEvent.description : node.description}
        </p>

        {/* Current Mecha Status */}
        <div className="mt-5 grid grid-cols-4 gap-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-center text-xs">
          <div>
            <div className="text-slate-400">HP</div>
            <div className="mt-0.5 font-bold text-emerald-300">
              {displayPlayer.hp} / {displayEffectiveMecha.maxHp}
            </div>
          </div>
          <div>
            <div className="text-slate-400">EN</div>
            <div className="mt-0.5 font-bold text-amber-300">
              {displayPlayer.en} / {displayEffectiveMecha.maxEn}
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
            {narrativeEvent ? (
              narrativeEvent.choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  type="button"
                  data-testid={`narrative-choice-${idx}`}
                  onClick={() => handleSelectNarrativeChoice(choice)}
                  className="w-full cursor-pointer rounded-xl border border-slate-700/80 bg-slate-950/75 p-4 text-left transition hover:border-cyan-400/70 hover:bg-slate-800/70"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-100">
                      {choice.label}
                    </span>
                    <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                      {choice.riskTag}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    {choice.description}
                  </p>
                </button>
              ))
            ) : (
              <button
                type="button"
                data-testid="event-choice-supply"
                onClick={handleFullSupply}
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
              onClick={() => onCompleteEvent(displayPlayer, earnedShards)}
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
