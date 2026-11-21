import { useEffect, useState } from 'react';
import { getMechaCutInUrl } from '../logic/assetMap';
import { MechaSprite } from './MechaSprite';
import { PilotPortrait } from './PilotPortrait';

export interface CutInEvent {
  id: string;
  pilotId: string;
  pilotName: string;
  mechaId: string;
  mechaName: string;
  weaponName: string;
  faction: 'player' | 'enemy';
  bannerLabel?: string;
  isUltimate?: boolean;
}

interface FinisherCutInProps {
  cutIn: CutInEvent | null;
  onSkip: () => void;
}

const SPEEDLINES = Array.from({ length: 22 }, (_, i) => ({
  id: i,
  top: `${12 + ((i * 3.7) % 74)}%`,
  width: `${26 + (i % 5) * 14}%`,
  height: i % 4 === 0 ? 3 : i % 2 === 0 ? 2 : 1,
  duration: `${0.32 + (i % 5) * 0.08}s`,
  delay: `-${(i * 0.13) % 0.6}s`,
  accent: i % 3 === 0 ? 'gold' : i % 2 === 0 ? 'cyan' : 'white',
}));

export function FinisherCutIn({ cutIn, onSkip }: FinisherCutInProps) {
  const cutInImgUrl = cutIn ? getMechaCutInUrl(cutIn.mechaId) : null;
  const [cutInImgFailed, setCutInImgFailed] = useState(false);

  useEffect(() => {
    setCutInImgFailed(false);
  }, [cutInImgUrl]);

  if (!cutIn) return null;

  const isPlayer = cutIn.faction === 'player';

  // === Full-Screen Cinematic Ultimate Finisher (will_req >= 120) ===
  if (cutIn.isUltimate) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onSkip}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
            onSkip();
          }
        }}
        title="คลิกที่หน้าจอเพื่อข้ามฉากไม้ตาย (Skip)"
        className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center overflow-hidden bg-[#04070e]/88 backdrop-blur-[3px]"
        data-testid="finisher-cut-in"
        data-ultimate="true"
      >
        {/* Top Cinematic Letterbox Bar */}
        <div
          data-testid="cinematic-letterbox-top"
          className="animate-letterbox-top absolute inset-x-0 top-0 z-40 flex h-[11vh] min-h-14 items-end justify-between border-b border-[#ffb800]/45 bg-black px-6 pb-2.5"
        >
          <span className="font-orbitron text-[10px] font-bold tracking-[0.3em] text-[#ffb800] uppercase">
            // ULTIMATE OVERDRIVE ENGAGED · WILL 120+
          </span>
          <span className="font-orbitron text-[10px] font-bold tracking-[0.22em] text-[#00f0ff]/80 uppercase">
            {cutIn.mechaName} // MAX OUTPUT
          </span>
        </div>

        {/* Bottom Cinematic Letterbox Bar */}
        <div
          data-testid="cinematic-letterbox-bottom"
          className="animate-letterbox-bottom absolute inset-x-0 bottom-0 z-40 flex h-[11vh] min-h-14 items-start justify-between border-t border-[#ffb800]/45 bg-black px-6 pt-2.5"
        >
          <span className="text-xs font-semibold text-slate-300">
            PILOT: <strong className="text-white">{cutIn.pilotName}</strong>
          </span>
          <span className="font-orbitron rounded border border-[#00f0ff]/40 bg-[#00f0ff]/10 px-2.5 py-0.5 text-[10px] font-bold tracking-wider text-[#00f0ff]">
            คลิกที่หน้าจอเพื่อข้าม (SKIP &gt;&gt;)
          </span>
        </div>

        {/* Dynamic Radial Energy Core Backdrop */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 ${
            isPlayer
              ? 'bg-[radial-gradient(ellipse_at_center,rgba(0,240,255,0.28)_0%,rgba(255,184,0,0.16)_36%,rgba(4,7,14,0.92)_76%)]'
              : 'bg-[radial-gradient(ellipse_at_center,rgba(255,42,85,0.34)_0%,rgba(255,184,0,0.18)_36%,rgba(4,7,14,0.92)_76%)]'
          }`}
        />

        {/* High-Speed Anime Speedlines Layer */}
        <div
          aria-hidden="true"
          data-testid="anime-speedlines"
          className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
        >
          {SPEEDLINES.map((line) => {
            const bgClass =
              line.accent === 'gold'
                ? 'bg-gradient-to-r from-transparent via-[#ffb800] to-transparent'
                : line.accent === 'cyan'
                  ? isPlayer
                    ? 'bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent'
                    : 'bg-gradient-to-r from-transparent via-[#ff2a55] to-transparent'
                  : 'bg-gradient-to-r from-transparent via-white/90 to-transparent';

            return (
              <span
                key={line.id}
                className={`animate-speedline-rush absolute left-0 block rounded-full ${bgClass}`}
                style={{
                  top: line.top,
                  width: line.width,
                  height: `${line.height}px`,
                  animationDuration: line.duration,
                  animationDelay: line.delay,
                }}
              />
            );
          })}
        </div>

        {/* Diagonal Center Energy Slash Strip */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-1/2 z-15 h-44 -translate-y-1/2 -skew-y-3 border-y-2 ${
            isPlayer
              ? 'border-[#00f0ff]/75 bg-gradient-to-r from-[#080c14]/90 via-[#042840]/80 to-[#080c14]/90 shadow-[0_0_60px_rgba(0,240,255,0.38)]'
              : 'border-[#ff2a55]/80 bg-gradient-to-r from-[#080c14]/90 via-[#3b0a19]/80 to-[#080c14]/90 shadow-[0_0_60px_rgba(255,42,85,0.42)]'
          }`}
        />

        {/* Mecha Cut-In + Pilot Portrait Clash-In Pairing */}
        <div className="relative z-20 mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 sm:px-12">
          {/* Left: Dramatic Mecha Cut-In */}
          <div className="animate-ultimate-mecha relative flex flex-1 items-center justify-center sm:justify-start">
            <div
              aria-hidden="true"
              className={`absolute h-52 w-52 rounded-full blur-3xl ${
                isPlayer ? 'bg-[#00f0ff]/35' : 'bg-[#ff2a55]/40'
              }`}
            />
            {cutInImgUrl && !cutInImgFailed ? (
              <img
                src={cutInImgUrl}
                alt={cutIn.mechaName}
                onError={() => setCutInImgFailed(true)}
                data-testid="cutin-mecha-image"
                className="relative z-10 h-44 w-64 object-contain drop-shadow-[0_0_28px_rgba(0,240,255,0.85)] sm:h-60 sm:w-80"
              />
            ) : (
              <MechaSprite
                mechaId={cutIn.mechaId}
                faction={cutIn.faction}
                className="relative z-10 h-44 w-44 drop-shadow-[0_0_28px_rgba(0,240,255,0.85)] sm:h-56 sm:w-56"
              />
            )}
          </div>

          {/* Right: Slanted Anime Pilot Portrait */}
          <div className="animate-ultimate-pilot relative flex shrink-0 items-center justify-end">
            <div
              className={`relative overflow-hidden rounded-xl border-2 p-1.5 shadow-2xl ${
                isPlayer
                  ? 'border-[#ffb800] bg-gradient-to-br from-[#00f0ff]/30 via-[#080c14]/90 to-[#ffb800]/25 shadow-[0_0_34px_rgba(255,184,0,0.45)]'
                  : 'border-[#ff2a55] bg-gradient-to-br from-[#ff2a55]/35 via-[#080c14]/90 to-[#ffb800]/25 shadow-[0_0_34px_rgba(255,42,85,0.5)]'
              }`}
            >
              <PilotPortrait
                pilotId={cutIn.pilotId}
                faction={cutIn.faction}
                className="h-32 w-32 sm:h-44 sm:w-44"
              />
              <div className="font-orbitron mt-1.5 bg-[#080c14]/90 px-2 py-0.5 text-center text-[10px] font-extrabold tracking-widest text-[#ffb800] uppercase">
                {cutIn.pilotName}
              </div>
            </div>
          </div>
        </div>

        {/* Center-Stage Giant Glowing Ultimate Attack Name */}
        <div
          className="animate-ultimate-title pointer-events-none absolute inset-x-0 z-30 flex flex-col items-center justify-center px-4 text-center"
          data-testid="ultimate-weapon-title"
        >
          <span className="font-orbitron mb-1 rounded-full border border-[#ffb800]/80 bg-[#080c14]/85 px-4 py-0.5 text-[11px] font-black tracking-[0.35em] text-[#ffb800] uppercase shadow-[0_0_18px_rgba(255,184,0,0.5)]">
            {cutIn.bannerLabel ?? '⚡ ULTIMATE FINISHER'}
          </span>
          <div
            className="font-orbitron bg-gradient-to-b from-white via-[#fff3c4] to-[#ffb800] bg-clip-text text-3xl font-black tracking-[0.14em] text-transparent uppercase sm:text-5xl md:text-6xl"
            style={{
              filter:
                'drop-shadow(0 0 18px rgba(255,184,0,0.95)) drop-shadow(0 4px 12px rgba(0,0,0,0.95))',
            }}
          >
            {cutIn.weaponName}
          </div>
          <div className="mt-2 h-1 w-64 rounded-full bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent shadow-[0_0_16px_rgba(0,240,255,0.95)] sm:w-96" />
        </div>
      </div>
    );
  }

  // === Standard Special / Valor / MAP / Boss Roar Cut-In Banner ===
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onSkip();
      }}
      title="คลิกเพื่อข้าม Cut-in"
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-[#080c14]/45 backdrop-blur-[1px]"
      data-testid="finisher-cut-in"
      data-ultimate="false"
    >
      <div
        className={`animate-cut-in flex w-full max-w-4xl items-center gap-5 border-y-2 px-8 py-4 shadow-2xl ${
          isPlayer
            ? 'border-[#00f0ff] bg-gradient-to-r from-[#080c14]/95 via-[#072b3d]/95 to-[#080c14]/95'
            : 'border-[#ff2a55] bg-gradient-to-r from-[#080c14]/95 via-[#3d0a1a]/95 to-[#080c14]/95'
        }`}
      >
        <PilotPortrait
          pilotId={cutIn.pilotId}
          faction={cutIn.faction}
          className="h-20 w-20 shrink-0 shadow-lg"
        />

        {cutInImgUrl && !cutInImgFailed && (
          <img
            src={cutInImgUrl}
            alt={cutIn.mechaName}
            onError={() => setCutInImgFailed(true)}
            data-testid="cutin-mecha-image"
            className="h-24 w-32 shrink-0 rounded-lg border border-white/20 bg-[#080c14]/75 object-contain p-1 shadow-xl"
          />
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`font-orbitron text-xs font-extrabold tracking-[0.28em] uppercase ${
              isPlayer ? 'text-[#ffb800]' : 'text-[#ff2a55]'
            }`}
          >
            {cutIn.bannerLabel ?? '⚡ SPECIAL ATTACK CUT-IN'}
          </div>
          <div className="font-orbitron truncate text-2xl font-black tracking-wide text-white">
            {cutIn.weaponName}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
            <span>
              {cutIn.pilotName} · {cutIn.mechaName}
            </span>
            <span className="font-orbitron rounded border border-[#00f0ff]/35 bg-[#080c14]/85 px-2 py-0.5 text-[10px] text-[#00f0ff]">
              คลิกที่หน้าจอเพื่อข้าม (Skip)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
