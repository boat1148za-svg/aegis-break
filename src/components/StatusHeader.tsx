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
    <header className="border-b border-[#00f0ff]/30 bg-[#080c14]/82 px-4 py-3 shadow-[0_4px_24px_rgba(0,240,255,0.08)] backdrop-blur-md sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-orbitron text-[10px] font-bold tracking-[0.22em] text-[#00f0ff] uppercase">
            {stageName}
          </p>
          <h1 className="font-orbitron text-xl font-black tracking-wide text-slate-50 sm:text-2xl">
            PROJECT <span className="text-[#00f0ff]">AEGIS-BREAK</span>
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
            className={`font-sci-num cursor-pointer rounded-lg border px-2.5 py-1.5 text-xs font-bold transition ${
              speedMultiplier === 2
                ? 'border-[#ffb800]/80 bg-[#ffb800]/20 text-[#ffb800]'
                : 'border-[#00f0ff]/30 bg-[#0b1324]/80 text-slate-200 hover:border-[#00f0ff]/70'
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
                ? 'border-[#00f0ff]/60 bg-[#00f0ff]/12 text-[#00f0ff]'
                : 'border-slate-700 bg-[#0b1324]/80 text-slate-400 hover:text-slate-200'
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
                ? 'border-[#00f0ff]/55 bg-[#0b1324]/80 text-[#00f0ff]'
                : 'border-slate-700 bg-[#0b1324]/80 text-slate-500'
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
                ? 'border-[#ffb800]/55 bg-[#0b1324]/80 text-[#ffb800]'
                : 'border-slate-700 bg-[#0b1324]/80 text-slate-500'
            }`}
          >
            {sfxEnabled ? '🔊' : '🔈'}
          </button>

          {/* Turn Indicator */}
          <div className="rounded-lg border border-[#00f0ff]/30 bg-[#0b1324]/90 px-3 py-1.5 text-right">
            <div className="font-sci-num text-[10px] font-bold text-slate-400">
              TURN {turnState.turnNumber}
            </div>
            <div
              className={`font-orbitron text-[11px] font-extrabold ${
                isPlayerPhase ? 'text-[#00f0ff]' : 'text-[#ff2a55]'
              }`}
            >
              {turnState.phase}
            </div>
          </div>

          <button
            type="button"
            onClick={onEndTurn}
            disabled={!isPlayerPhase || isBusy}
            className="hud-btn cursor-pointer border border-[#ffb800]/65 bg-[#ffb800]/20 px-4 py-2 text-xs font-bold text-[#ffb800] transition hover:bg-[#ffb800]/30 disabled:cursor-not-allowed disabled:opacity-40 sm:text-sm"
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
