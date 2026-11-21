import {
  combatConfig,
  mechas,
  pilots,
  spiritCommands,
  terrains,
  weapons,
} from '../logic/dataLoader';

export function DataOverviewPanel() {
  return (
    <section className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-cyan-400 uppercase">
          Mechas ({mechas.length})
        </h2>
        <div className="space-y-3">
          {mechas.map((mecha) => (
            <div
              key={mecha.id}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">
                  {mecha.name}
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-medium uppercase ${
                    mecha.faction === 'player'
                      ? 'bg-cyan-500/15 text-cyan-300'
                      : 'bg-rose-500/15 text-rose-300'
                  }`}
                >
                  {mecha.faction}
                </span>
              </div>
              <div className="mt-2 grid grid-cols-5 gap-2 text-xs text-slate-400">
                <div>HP: {mecha.maxHp}</div>
                <div>EN: {mecha.maxEn}</div>
                <div>ARM: {mecha.armor}</div>
                <div>MOB: {mecha.mobility}</div>
                <div>MOV: {mecha.move}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-amber-400 uppercase">
          Spirit Commands ({spiritCommands.length})
        </h2>
        <div className="space-y-2.5">
          {spiritCommands.map((sc) => (
            <div
              key={sc.id}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-100">
                  {sc.name}{' '}
                  <span className="text-xs font-normal text-slate-400">
                    ({sc.nameTh})
                  </span>
                </span>
                <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
                  {sc.spCost} SP
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">{sc.description}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-emerald-400 uppercase">
          Weapons ({weapons.length}) &amp; Pilots ({pilots.length})
        </h2>
        <div className="space-y-2 text-xs">
          {weapons.map((w) => (
            <div
              key={w.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
            >
              <span className="font-medium text-slate-200">{w.name}</span>
              <span className="text-slate-400">
                PWR {w.power} · RNG {w.minRange}-{w.maxRange} · EN {w.enCost} ·
                Will {w.willRequired}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5">
        <h2 className="mb-3 text-sm font-semibold tracking-wider text-violet-400 uppercase">
          Grid &amp; Terrain Config
        </h2>
        <p className="mb-3 text-xs text-slate-400">
          Default Grid: {combatConfig.defaultGridSize.rows}x
          {combatConfig.defaultGridSize.cols} · Auto EN Regen: +
          {combatConfig.enRegenPerTurn}/turn · Will:{' '}
          {combatConfig.will.initial}–{combatConfig.will.max}
        </p>
        <div className="space-y-2 text-xs">
          {terrains.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2"
            >
              <span className="font-medium text-slate-200">
                {t.name} ({t.label})
              </span>
              <span className="text-slate-400">
                {t.walkable ? 'Walkable' : 'Blocked'} · HP +{t.hpRegenPercent}%
                / EN +{t.enRegenPercent}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
