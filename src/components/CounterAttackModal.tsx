import type { CounterPromptData, DefenseAction } from '../logic/types';

interface CounterAttackModalProps {
  prompt: CounterPromptData;
  onSelectAction: (action: DefenseAction) => void;
}

export function CounterAttackModal({
  prompt,
  onSelectAction,
}: CounterAttackModalProps) {
  const {
    enemy,
    player,
    enemyWeapon,
    enemyPreviewCounter,
    enemyPreviewDefend,
    enemyPreviewEvade,
    playerCounterWeapon,
    playerCounterPreview,
  } = prompt;

  const canCounter =
    playerCounterWeapon !== null && playerCounterPreview !== null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      data-testid="counter-attack-modal"
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-rose-500/50 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-800 bg-rose-950/40 px-6 py-4">
          <p className="text-xs font-semibold tracking-widest text-rose-400 uppercase">
            Enemy Attack Incoming — Counter-Attack Menu
          </p>
          <h2 className="text-lg font-bold text-slate-100">
            {enemy.icon} {enemy.mecha.name} กำลังโจมตี {player.icon}{' '}
            {player.mecha.name}!
          </h2>
          <p className="mt-1 text-xs text-slate-300">
            อาวุธศัตรู:{' '}
            <strong className="text-rose-300">{enemyWeapon.name}</strong> (PWR{' '}
            {enemyWeapon.power}) · HP ของเรา:{' '}
            <strong className="text-cyan-300">
              {player.hp} / {player.mecha.maxHp}
            </strong>
            {(player.activeSpirits.focus || player.activeSpirits.ironWall) && (
              <span className="ml-2 inline-flex gap-1">
                {player.activeSpirits.focus && (
                  <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                    🎯 Focus
                  </span>
                )}
                {player.activeSpirits.ironWall && (
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                    🛡️ Iron Wall
                  </span>
                )}
              </span>
            )}
          </p>
        </div>

        {/* 3 Defense Choices */}
        <div className="grid gap-3 p-6 md:grid-cols-3">
          {/* 1. Counter */}
          <button
            type="button"
            data-testid="defense-btn-counter"
            disabled={!canCounter}
            onClick={() => onSelectAction('counter')}
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-rose-500/40 bg-rose-950/20 p-4 text-left transition hover:border-rose-400 hover:bg-rose-950/40 disabled:cursor-not-allowed disabled:opacity-45"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-rose-200">
                  ⚔️ Counter
                </span>
                <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                  สวนกลับ
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-300">
                รับดาเมจปกติ แล้วโจมตีสวนกลับทันทีหากยังไม่พัง
              </p>

              <div className="mt-3 space-y-1 rounded-lg bg-slate-950/75 p-2.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>ศัตรูยิงโดน</span>
                  <span
                    className="font-semibold text-rose-300"
                    data-testid="counter-enemy-hit"
                  >
                    {enemyPreviewCounter.hitRate}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>รับดาเมจ</span>
                  <span
                    className="font-semibold text-rose-300"
                    data-testid="counter-enemy-dmg"
                  >
                    {enemyPreviewCounter.finalDamage.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-cyan-500/30 bg-cyan-950/30 p-2.5 text-[11px]">
              {canCounter ? (
                <>
                  <div className="font-semibold text-cyan-300">
                    สวนกลับ: {playerCounterWeapon.name}
                  </div>
                  <div className="mt-1 flex justify-between text-slate-300">
                    <span>โอกาสยิงโดน</span>
                    <span
                      className="font-bold text-cyan-300"
                      data-testid="counter-player-hit"
                    >
                      {playerCounterPreview.hitRate}%
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>ดาเมจสวนกลับ</span>
                    <span
                      className="font-bold text-amber-300"
                      data-testid="counter-player-dmg"
                    >
                      {playerCounterPreview.finalDamage.toLocaleString()}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400">
                  ไม่สามารถสวนกลับได้ (นอกระยะ / EN ไม่พอ)
                </div>
              )}
            </div>
          </button>

          {/* 2. Defend */}
          <button
            type="button"
            data-testid="defense-btn-defend"
            onClick={() => onSelectAction('defend')}
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-amber-500/40 bg-amber-950/20 p-4 text-left transition hover:border-amber-400 hover:bg-amber-950/40"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-amber-200">
                  🛡️ Defend
                </span>
                <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                  ป้องกัน
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-300">
                ตั้งรับลดดาเมจที่ได้รับลง 50% (ไม่โจมตีสวนกลับ)
              </p>

              <div className="mt-3 space-y-1 rounded-lg bg-slate-950/75 p-2.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>ศัตรูยิงโดน</span>
                  <span
                    className="font-semibold text-slate-200"
                    data-testid="defend-enemy-hit"
                  >
                    {enemyPreviewDefend.hitRate}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>รับดาเมจ (-50%)</span>
                  <span
                    className="font-bold text-emerald-300"
                    data-testid="defend-enemy-dmg"
                  >
                    {enemyPreviewDefend.finalDamage.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center text-[11px] text-slate-400">
              ไม่โจมตีสวนกลับ
            </div>
          </button>

          {/* 3. Evade */}
          <button
            type="button"
            data-testid="defense-btn-evade"
            onClick={() => onSelectAction('evade')}
            className="flex cursor-pointer flex-col justify-between rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-950/40"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-cyan-200">
                  💨 Evade
                </span>
                <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                  หลบหลีก
                </span>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-300">
                เน้นหลบหลีก เพิ่มโอกาสหลบ +30% ในการปะทะนี้ (ไม่สวนกลับ)
              </p>

              <div className="mt-3 space-y-1 rounded-lg bg-slate-950/75 p-2.5 text-[11px]">
                <div className="flex justify-between text-slate-400">
                  <span>ศัตรูยิงโดน (-30%)</span>
                  <span
                    className="font-bold text-cyan-300"
                    data-testid="evade-enemy-hit"
                  >
                    {enemyPreviewEvade.hitRate}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>รับดาเมจหากโดน</span>
                  <span
                    className="font-semibold text-rose-300"
                    data-testid="evade-enemy-dmg"
                  >
                    {enemyPreviewEvade.finalDamage.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/50 p-2 text-center text-[11px] text-slate-400">
              ไม่โจมตีสวนกลับ
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
