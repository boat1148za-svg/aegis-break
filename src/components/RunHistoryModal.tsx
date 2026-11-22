import { useState } from 'react';
import {
  achievementsList,
  isAchievementUnlocked,
} from '../logic/historyLogic';
import type { MetaProgressState, RunHistoryEntry } from '../logic/types';

interface RunHistoryModalProps {
  history: RunHistoryEntry[];
  meta: MetaProgressState;
  claimedAchievementIds: string[];
  onClaimAchievement: (achievementId: string) => void;
  onClose: () => void;
}

export function RunHistoryModal({
  history,
  meta,
  claimedAchievementIds,
  onClaimAchievement,
  onClose,
}: RunHistoryModalProps) {
  const [activeTab, setActiveTab] = useState<'history' | 'achievements'>(
    'history'
  );

  const unlockedCount = achievementsList.filter((ach) =>
    isAchievementUnlocked(ach.id, history, meta)
  ).length;
  const claimableCount = achievementsList.filter(
    (ach) =>
      isAchievementUnlocked(ach.id, history, meta) &&
      !claimedAchievementIds.includes(ach.id)
  ).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      data-testid="run-history-modal"
    >
      <div className="hud-panel flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden bg-[#080c14]/95 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00f0ff]/25 bg-[#0b1324]/90 px-6 py-4">
          <div>
            <span className="font-orbitron text-[10px] font-bold tracking-[0.25em] text-[#00f0ff] uppercase">
              PILOT COMBAT RECORDS &amp; HONORS
            </span>
            <h2 className="font-orbitron mt-0.5 text-xl font-black text-slate-50">
              🏆 ประวัติการรบ &amp; Achievements
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="font-sci-num rounded-lg border border-violet-400/45 bg-violet-950/45 px-3 py-1.5 text-xs font-bold text-violet-200">
              ✨ {meta.astralShards.toLocaleString()} Shards
            </span>
            <button
              type="button"
              data-testid="close-records-btn"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-300 transition hover:border-[#00f0ff]/60 hover:text-white"
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 bg-[#080c14]/80 px-6 py-3">
          <button
            type="button"
            data-testid="records-tab-history"
            onClick={() => setActiveTab('history')}
            className={`font-orbitron cursor-pointer rounded-lg border px-4 py-2 text-xs font-bold transition ${
              activeTab === 'history'
                ? 'border-[#00f0ff]/80 bg-[#00f0ff]/20 text-[#00f0ff]'
                : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 RUN HISTORY ({history.length}/20)
          </button>
          <button
            type="button"
            data-testid="records-tab-achievements"
            onClick={() => setActiveTab('achievements')}
            className={`font-orbitron flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-xs font-bold transition ${
              activeTab === 'achievements'
                ? 'border-[#ffb800]/80 bg-[#ffb800]/20 text-[#ffb800]'
                : 'border-slate-800 bg-slate-900/70 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏅 ACHIEVEMENTS ({unlockedCount}/{achievementsList.length})</span>
            {claimableCount > 0 && (
              <span className="font-sci-num rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-black text-slate-950">
                +{claimableCount}
              </span>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'history' ? (
            history.length === 0 ? (
              <div
                className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-10 text-center"
                data-testid="run-history-empty"
              >
                <div className="text-3xl">🛰️</div>
                <p className="mt-2 text-sm font-bold text-slate-200">
                  ยังไม่มีประวัติการปฏิบัติการ
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  เริ่มออกรบใน Hangar เพื่อบันทึกสถิติชัยชนะ ดาเมจสูงสุด และ Endless Loop
                </p>
              </div>
            ) : (
              <div className="space-y-3" data-testid="run-history-list">
                {history.map((entry) => {
                  const isVictory = entry.outcome === 'victory';
                  const dateLabel = new Date(entry.timestamp).toLocaleString();
                  return (
                    <div
                      key={entry.id}
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                        isVictory
                          ? 'border-emerald-500/45 bg-emerald-950/20'
                          : 'border-[#ff2a55]/40 bg-rose-950/15'
                      }`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`font-orbitron rounded px-2 py-0.5 text-[10px] font-black uppercase ${
                              isVictory
                                ? 'bg-emerald-500/25 text-emerald-300'
                                : 'bg-[#ff2a55]/25 text-rose-300'
                            }`}
                          >
                            {isVictory ? 'VICTORY' : 'DEFEAT'}
                          </span>
                          <span className="font-orbitron text-sm font-bold text-slate-100">
                            {entry.mechaName}
                          </span>
                          {entry.endlessLoop > 1 && (
                            <span className="font-sci-num rounded border border-fuchsia-400/60 bg-fuchsia-950/60 px-2 py-0.5 text-[10px] font-bold text-fuchsia-200">
                              ♾️ LOOP {entry.endlessLoop}
                            </span>
                          )}
                          {entry.isDailyChallenge && (
                            <span className="rounded border border-[#00f0ff]/60 bg-[#00f0ff]/15 px-2 py-0.5 text-[10px] font-bold text-[#00f0ff]">
                              📅 DAILY
                            </span>
                          )}
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {dateLabel} · Threat Lv.{entry.threatLevel}
                        </div>
                      </div>

                      <div className="font-sci-num flex flex-wrap items-center gap-3 text-xs">
                        <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 px-2.5 py-1.5 text-center">
                          <div className="text-[9px] text-slate-400">FLOORS</div>
                          <div className="font-bold text-cyan-300">
                            {entry.floorsCleared}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 px-2.5 py-1.5 text-center">
                          <div className="text-[9px] text-slate-400">KILLS</div>
                          <div className="font-bold text-amber-300">
                            {entry.kills}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 px-2.5 py-1.5 text-center">
                          <div className="text-[9px] text-slate-400">MAX HIT</div>
                          <div className="font-bold text-rose-300">
                            {entry.maxDamage.toLocaleString()}
                          </div>
                        </div>
                        <div className="rounded-lg border border-violet-500/40 bg-violet-950/35 px-2.5 py-1.5 text-center">
                          <div className="text-[9px] text-violet-300">SHARDS</div>
                          <div className="font-bold text-violet-200">
                            +{entry.shardsEarned}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="grid gap-3 md:grid-cols-2" data-testid="achievements-list">
              {achievementsList.map((ach) => {
                const unlocked = isAchievementUnlocked(ach.id, history, meta);
                const claimed = claimedAchievementIds.includes(ach.id);
                return (
                  <div
                    key={ach.id}
                    data-testid={`achievement-card-${ach.id}`}
                    className={`flex items-center justify-between gap-3 rounded-xl border p-4 ${
                      claimed
                        ? 'border-emerald-500/45 bg-emerald-950/15'
                        : unlocked
                          ? 'border-[#ffb800]/75 bg-amber-950/25 shadow-[0_0_16px_rgba(255,184,0,0.18)]'
                          : 'border-slate-800 bg-slate-900/45 opacity-70'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-[#080c14] text-2xl">
                        {ach.icon}
                      </span>
                      <div>
                        <div className="font-orbitron text-sm font-bold text-slate-100">
                          {ach.title}
                        </div>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {ach.description}
                        </p>
                        <div className="font-sci-num mt-1 text-[11px] font-bold text-violet-300">
                          รางวัล: ✨ +{ach.rewardShards} Astral Shards
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {claimed ? (
                        <span className="font-orbitron rounded-lg border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-[10px] font-bold text-emerald-300">
                          ✓ CLAIMED
                        </span>
                      ) : unlocked ? (
                        <button
                          type="button"
                          data-testid={`claim-ach-${ach.id}`}
                          onClick={() => onClaimAchievement(ach.id)}
                          className="font-orbitron cursor-pointer rounded-lg border border-[#ffb800] bg-[#ffb800]/25 px-3 py-1.5 text-[10px] font-black text-[#ffb800] transition hover:bg-[#ffb800]/40"
                        >
                          CLAIM ✨+{ach.rewardShards}
                        </button>
                      ) : (
                        <span className="font-orbitron rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-[10px] font-bold text-slate-500">
                          🔒 LOCKED
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
