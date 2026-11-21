import type { TurnState } from '../logic/types';

interface StatusHeaderProps {
  stageName: string;
  turnState: TurnState;
  isBusy: boolean;
  onEndTurn: () => void;
  onReset: () => void;
}

export function StatusHeader({
  stageName,
  turnState,
  isBusy,
  onEndTurn,
  onReset,
}: StatusHeaderProps) {
  const isPlayerPhase = turnState.phase === 'PLAYER_PHASE';

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 px-6 py-4 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
            {stageName}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            PROJECT AEGIS-BREAK
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-lg border border-slate-700 bg-slate-950 px-4 py-2 text-right">
            <div className="text-xs text-slate-400">
              TURN {turnState.turnNumber}
            </div>
            <div
              className={`text-sm font-bold ${
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
            className="cursor-pointer rounded-lg border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-sm font-semibold text-amber-200 transition hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-40"
          >
            จบเทิร์น (End Turn)
          </button>

          <button
            type="button"
            onClick={onReset}
            disabled={isBusy}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            รีเซ็ต
          </button>
        </div>
      </div>
    </header>
  );
}
