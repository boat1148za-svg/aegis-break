import { useEffect, useState } from 'react';
import { getMechaCutInUrl } from '../logic/assetMap';
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
}

interface FinisherCutInProps {
  cutIn: CutInEvent | null;
  onSkip: () => void;
}

export function FinisherCutIn({ cutIn, onSkip }: FinisherCutInProps) {
  const cutInImgUrl = cutIn ? getMechaCutInUrl(cutIn.mechaId) : null;
  const [cutInImgFailed, setCutInImgFailed] = useState(false);

  useEffect(() => {
    setCutInImgFailed(false);
  }, [cutInImgUrl]);

  if (!cutIn) return null;

  const isPlayer = cutIn.faction === 'player';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSkip}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') onSkip();
      }}
      title="คลิกเพื่อข้าม Cut-in"
      className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center bg-slate-950/35"
      data-testid="finisher-cut-in"
    >
      <div
        className={`animate-cut-in flex w-full max-w-4xl items-center gap-5 border-y-2 px-8 py-4 shadow-2xl ${
          isPlayer
            ? 'border-cyan-300 bg-gradient-to-r from-slate-950/95 via-cyan-950/95 to-slate-950/95'
            : 'border-rose-400 bg-gradient-to-r from-slate-950/95 via-rose-950/95 to-slate-950/95'
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
            className="h-24 w-32 shrink-0 rounded-lg border border-white/20 bg-slate-950/70 object-contain p-1 shadow-xl"
          />
        )}

        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-extrabold tracking-[0.3em] uppercase ${
              isPlayer ? 'text-amber-300' : 'text-rose-300'
            }`}
          >
            {cutIn.bannerLabel ?? '⚡ SPECIAL ATTACK CUT-IN'}
          </div>
          <div className="truncate text-2xl font-black tracking-tight text-white">
            {cutIn.weaponName}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-300">
            <span>
              {cutIn.pilotName} · {cutIn.mechaName}
            </span>
            <span className="rounded bg-slate-900/80 px-2 py-0.5 text-[10px] text-cyan-300">
              คลิกที่หน้าจอเพื่อข้าม (Skip)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
