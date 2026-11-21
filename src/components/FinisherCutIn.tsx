import { PilotPortrait } from './PilotPortrait';

export interface CutInEvent {
  id: string;
  pilotId: string;
  pilotName: string;
  mechaName: string;
  weaponName: string;
  faction: 'player' | 'enemy';
}

interface FinisherCutInProps {
  cutIn: CutInEvent | null;
}

export function FinisherCutIn({ cutIn }: FinisherCutInProps) {
  if (!cutIn) return null;

  const isPlayer = cutIn.faction === 'player';

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-1/3 z-50 flex items-center justify-center overflow-hidden"
      data-testid="finisher-cut-in"
    >
      <div
        className={`animate-cut-in flex w-full max-w-3xl items-center gap-5 border-y-2 px-8 py-4 shadow-2xl ${
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
        <div className="min-w-0 flex-1">
          <div
            className={`text-xs font-extrabold tracking-[0.3em] uppercase ${
              isPlayer ? 'text-amber-300' : 'text-rose-300'
            }`}
          >
            ⚡ SPECIAL ATTACK CUT-IN
          </div>
          <div className="truncate text-2xl font-black tracking-tight text-white">
            {cutIn.weaponName}
          </div>
          <div className="text-xs font-semibold text-slate-300">
            {cutIn.pilotName} · {cutIn.mechaName}
          </div>
        </div>
      </div>
    </div>
  );
}
