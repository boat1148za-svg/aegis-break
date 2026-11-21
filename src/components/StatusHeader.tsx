import type { TurnState } from '../logic/types';

interface StatusHeaderProps {
  stageName: string;
  turnState: TurnState;
  isBusy: boolean;
  speedMultiplier: 1 | 2;
  cutInEnabled: boolean;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleSpeed: () => void;
  onToggleCutIn: () => void;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onEndTurn: () => void;
  onReset: () => void;
}

export function StatusHeader({
  stageName,
  turnState,
  isBusy,
  speedMultiplier,
  cutInEnabled,
  bgmEnabled,
  sfxEnabled,
  onToggleSpeed,
  onToggleCutIn,
  onToggleBgm,
  onToggleSfx,
  onEndTurn,
  onReset,
}: StatusHeaderProps) {
  const isPlayerPhase = turnState.phase === 'PLAYER_PHASE';

  return (
    <header className="border-b border-cyan-500/25 bg-slate-900/90 px-4 py-3 backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-widest text-cyan-400 uppercase">
            {stageName}
          </p>
          <h1 className="text-xl font-black tracking-tight text-slate-50 sm:text-2xl">
            PROJECT AEGIS-BREAK
          </h1>
        </div>

        {/* Right Controls: QoL Speed/Cut-in/Audio + Turn + End Turn */}
        <div className="flex flex-wrap items-center gap-2">
          {/* QoL Toggles */}
          <button
            type="button"
            data-testid="speed-toggle-btn"
            onClick={onToggleSpeed}
            title="สลับความเร็วแอนิเมชัน 1x / 2x"
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              speedMultiplier === 2
                ? 'border-amber-400/70 bg-amber-500/20 text-amber-200'
                : 'border-slate-700 bg-slate-950/80 text-slate-300 hover:border-cyan-500/50'
            }`}
          >
            ⚡ {speedMultiplier}x
          </button>

          <button
            type="button"
            data-testid="cutin-toggle-btn"
            onClick={onToggleCutIn}
            title="เปิด/ปิดแถบ Cut-in ตอนใช้ท่าไม้ตาย"
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              cutInEnabled
                ? 'border-cyan-400/60 bg-cyan-950/50 text-cyan-200'
                : 'border-slate-700 bg-slate-950/80 text-slate-400 hover:text-slate-200'
            }`}
          >
            🎬 Cut-in: {cutInEnabled ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            data-testid="battle-bgm-toggle"
            onClick={onToggleBgm}
            title="เปิด/ปิดเพลงประกอบ (BGM)"
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              bgmEnabled
                ? 'border-cyan-500/50 bg-slate-950/80 text-cyan-300'
                : 'border-slate-700 bg-slate-950/80 text-slate-500'
            }`}
          >
            {bgmEnabled ? '🎵' : '🔇'}
          </button>

          <button
            type="button"
            data-testid="battle-sfx-toggle"
            onClick={onToggleSfx}
            title="เปิด/ปิดเสียงเอฟเฟกต์ (SFX)"
            className={`cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              sfxEnabled
                ? 'border-amber-500/50 bg-slate-950/80 text-amber-300'
                : 'border-slate-700 bg-slate-950/80 text-slate-500'
            }`}
          >
            {sfxEnabled ? '🔊' : '🔈'}
          </button>

          {/* Turn Indicator */}
          <div className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-right">
            <div className="text-[10px] text-slate-400">
              TURN {turnState.turnNumber}
            </div>
            <div
              className={`text-xs font-bold ${
                isPlayerPhase ? 'text-cyan-400' : 'text-rose-400'
              }`}
            >
              {turnState.phase}
            </div>
          </div>

          <button
            type="button"
            onClick={onEndTurn}
            disabled={!isPlayerPhase || isBusy}
            className="hud-btn cursor-pointer border border-amber-400/50 bg-amber-500/20 px-4 py-2 text-xs font-bold text-amber-200 transition hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
          >
            จบเทิร์น (End Turn)
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isBusy}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            รีเซ็ต
          </button>
        </div>
      </div>
    </header>
  );
}
