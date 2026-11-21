interface BattleLogPanelProps {
  logs: string[];
}

export function BattleLogPanel({ logs }: BattleLogPanelProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-slate-400 uppercase">
        Battle Log
      </h2>
      <div className="max-h-56 space-y-1.5 overflow-y-auto pr-1 text-xs">
        {logs.map((entry, idx) => (
          <div
            key={idx}
            className="rounded border border-slate-800/80 bg-slate-950/70 px-2.5 py-1.5 text-slate-300"
          >
            {entry}
          </div>
        ))}
      </div>
    </div>
  );
}
