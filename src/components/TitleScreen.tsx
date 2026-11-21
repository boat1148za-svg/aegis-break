import { useState } from 'react';
import { getUnitDefById, runNodes } from '../logic/dataLoader';
import type { SavedRunState } from '../logic/runSaveLogic';
import { AmbientBackdrop } from './AmbientBackdrop';
import { CompendiumModal } from './CompendiumModal';
import { HowToPlayModal } from './HowToPlayModal';

interface TitleScreenProps {
  savedRun: SavedRunState | null;
  bgmEnabled: boolean;
  sfxEnabled: boolean;
  onToggleBgm: () => void;
  onToggleSfx: () => void;
  onNewRun: () => void;
  onContinueRun: () => void;
}

export function TitleScreen({
  savedRun,
  bgmEnabled,
  sfxEnabled,
  onToggleBgm,
  onToggleSfx,
  onNewRun,
  onContinueRun,
}: TitleScreenProps) {
  const [showCompendium, setShowCompendium] = useState(false);
  const [showHowTo, setShowHowTo] = useState(false);

  const savedMechaName = savedRun
    ? (getUnitDefById(savedRun.runPlayer.unitDefId)?.mecha.name ?? 'Mecha')
    : null;

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-between overflow-hidden bg-[#080c14] px-6 py-8 text-slate-100"
      data-testid="title-screen"
    >
      <AmbientBackdrop />

      {/* Top Audio Controls Bar */}
      <div className="relative z-10 flex w-full max-w-5xl items-center justify-between">
        <div className="font-orbitron text-[11px] font-bold tracking-[0.26em] text-[#00f0ff]/90 uppercase">
          SYS.ONLINE // TACTICAL MECHA ROGUELITE
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            data-testid="title-bgm-toggle"
            onClick={onToggleBgm}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition ${
              bgmEnabled
                ? 'border-[#00f0ff]/60 bg-[#00f0ff]/15 text-[#00f0ff] hover:bg-[#00f0ff]/25'
                : 'border-slate-700 bg-[#0b1220]/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {bgmEnabled ? '🎵 BGM: ON' : '🔇 BGM: OFF'}
          </button>
          <button
            type="button"
            data-testid="title-sfx-toggle"
            onClick={onToggleSfx}
            className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-bold backdrop-blur-md transition ${
              sfxEnabled
                ? 'border-[#ffb800]/60 bg-[#ffb800]/15 text-[#ffb800] hover:bg-[#ffb800]/25'
                : 'border-slate-700 bg-[#0b1220]/80 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {sfxEnabled ? '🔊 SFX: ON' : '🔈 SFX: OFF'}
          </button>
        </div>
      </div>

      {/* Center Hero Section: Sci-Fi Logo + 3 Mecha Lineup */}
      <div className="relative z-10 my-auto flex w-full max-w-5xl flex-col items-center py-6 text-center">
        {/* Sci-Fi Logo */}
        <div className="font-orbitron inline-flex items-center gap-2 rounded-full border border-[#00f0ff]/45 bg-[#00f0ff]/10 px-4 py-1 text-[11px] font-bold tracking-[0.28em] text-[#00f0ff] uppercase backdrop-blur-md">
          PROJECT // SUPER ROBOT TACTICS
        </div>
        <h1
          className="font-orbitron mt-3 bg-gradient-to-r from-[#00f0ff] via-white to-[#ffb800] bg-clip-text text-5xl font-black tracking-[0.12em] text-transparent drop-shadow-[0_0_28px_rgba(0,240,255,0.5)] sm:text-7xl"
          data-testid="title-logo"
        >
          AEGIS-BREAK
        </h1>
        <p className="mt-2 max-w-xl text-xs tracking-wide text-slate-300 sm:text-sm">
          บัญชาการหุ่นรบฝ่าสมรภูมิ 8x8 · ปลุกคำสั่งจิตใจ · จัดบิลด์อาวุธและชิปยุทธวิธีเพื่อโค่นบอสใหญ่
        </p>

        {/* Hero 3-Mecha Formation Showcase */}
        <div
          className="relative mt-8 flex w-full max-w-3xl items-end justify-center gap-4 px-4 sm:gap-10"
          data-testid="title-mecha-lineup"
        >
          {/* Glowing Tactical Floor Ring */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute bottom-0 left-1/2 h-12 w-4/5 -translate-x-1/2 rounded-full bg-cyan-500/20 blur-xl"
          />

          {/* Left: Valkyrie-X */}
          <div className="relative flex flex-col items-center">
            <img
              src="/assets/mech_valkyrie_x.png"
              alt="Valkyrie-X"
              draggable={false}
              data-testid="title-img-valkyrie"
              className="animate-sprite-idle h-28 w-28 object-contain drop-shadow-[0_0_18px_rgba(34,211,238,0.5)] sm:h-40 sm:w-40"
            />
            <span className="mt-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-cyan-300 uppercase">
              VALKYRIE-X
            </span>
          </div>

          {/* Center Spotlight: Giga-Rex */}
          <div className="relative z-10 flex flex-col items-center">
            <img
              src="/assets/mech_giga_rex.png"
              alt="Giga-Rex"
              draggable={false}
              data-testid="title-img-giga-rex"
              className="animate-sprite-idle h-36 w-36 object-contain drop-shadow-[0_0_24px_rgba(251,191,36,0.55)] sm:h-52 sm:w-52"
              style={{ animationDelay: '-0.6s' }}
            />
            <span className="mt-1 rounded border border-amber-400/50 bg-amber-950/70 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wider text-amber-200 uppercase">
              GIGA-REX
            </span>
          </div>

          {/* Right: Aegis-Medic (flipped left toward center) */}
          <div className="relative flex flex-col items-center">
            <span style={{ transform: 'scaleX(-1)' }} className="inline-block">
              <img
                src="/assets/mech_aegis_medic.png"
                alt="Aegis-Medic"
                draggable={false}
                data-testid="title-img-medic"
                className="animate-sprite-idle h-28 w-28 object-contain drop-shadow-[0_0_18px_rgba(16,185,129,0.5)] sm:h-40 sm:w-40"
                style={{ animationDelay: '-1.2s' }}
              />
            </span>
            <span className="mt-1 rounded bg-slate-900/80 px-2 py-0.5 text-[10px] font-bold tracking-wider text-emerald-300 uppercase">
              AEGIS-MEDIC
            </span>
          </div>
        </div>

        {/* Main Menu Buttons */}
        <div className="hud-panel mt-8 grid w-full max-w-xl gap-3 bg-slate-900/85 p-5 backdrop-blur-md sm:grid-cols-2">
          <button
            type="button"
            data-testid="title-new-run-btn"
            onClick={onNewRun}
            className="hud-btn cursor-pointer bg-gradient-to-r from-cyan-600 to-blue-600 px-6 py-3.5 text-sm font-black tracking-wider text-white shadow-lg shadow-cyan-950/70 transition hover:brightness-110"
          >
            🚀 NEW RUN
          </button>

          <button
            type="button"
            data-testid="title-continue-btn"
            disabled={!savedRun}
            onClick={onContinueRun}
            className={`hud-btn cursor-pointer px-6 py-3.5 text-sm font-black tracking-wider transition ${
              savedRun
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg hover:brightness-110'
                : 'bg-slate-800/80 text-slate-500'
            } disabled:cursor-not-allowed`}
          >
            <div>▶️ CONTINUE</div>
            <div className="text-[10px] font-medium opacity-85">
              {savedRun
                ? `${savedMechaName} · Node ${Math.min(
                    runNodes.length,
                    savedRun.currentNodeIndex + 1
                  )}/${runNodes.length}`
                : 'ไม่มีเซฟค้างอยู่'}
            </div>
          </button>

          <button
            type="button"
            data-testid="title-compendium-btn"
            onClick={() => setShowCompendium(true)}
            className="hud-btn cursor-pointer border border-cyan-500/35 bg-slate-950/80 px-5 py-2.5 text-xs font-bold tracking-wider text-cyan-200 transition hover:bg-slate-800"
          >
            📖 COMPENDIUM
          </button>

          <button
            type="button"
            data-testid="title-howto-btn"
            onClick={() => setShowHowTo(true)}
            className="hud-btn cursor-pointer border border-amber-500/35 bg-slate-950/80 px-5 py-2.5 text-xs font-bold tracking-wider text-amber-200 transition hover:bg-slate-800"
          >
            ❓ HOW TO PLAY
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 text-[11px] text-slate-500">
        Project Aegis-Break · Built with Vite + React + TypeScript + Web Audio Synth
      </footer>

      {showCompendium && (
        <CompendiumModal onClose={() => setShowCompendium(false)} />
      )}

      {showHowTo && <HowToPlayModal onClose={() => setShowHowTo(false)} />}
    </div>
  );
}
