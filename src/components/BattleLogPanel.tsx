interface BattleLogPanelProps {
  logs: string[];
}

export function BattleLogPanel({ logs }: BattleLogPanelProps) {
  return (
    <div className="hud-panel bg-slate-900/85 p-4 backdrop-blur-md">
      <h2 className="mb-2 text-xs font-semibold tracking-wider text-cyan-400 uppercase">
        Tactical Combat Log
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
