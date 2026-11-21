import { useState } from 'react';
import { getPlayableUnitDefs, getUnitWeapons } from '../logic/dataLoader';
import { getMetaBonuses } from '../logic/metaLogic';
import type { MetaProgressState } from '../logic/types';
import { MetaUpgradesModal } from './MetaUpgradesModal';

interface HangarScreenProps {
  meta: MetaProgressState;
  onStartRun: (unitDefId: string) => void;
  onPurchaseMetaUpgrade: (upgradeId: string) => void;
}

export function HangarScreen({
  meta,
  onStartRun,
  onPurchaseMetaUpgrade,
}: HangarScreenProps) {
  const playableUnits = getPlayableUnitDefs();
  const [selectedId, setSelectedId] = useState<string>(
    playableUnits[0]?.instanceId ?? 'player_giga_rex'
  );
  const [showMetaModal, setShowMetaModal] = useState(false);

  const bonuses = getMetaBonuses(meta);
  const hasAnyMetaBonus =
    bonuses.hpBonus > 0 ||
    bonuses.spBonus > 0 ||
    bonuses.armorBonus > 0 ||
    bonuses.unlockSupportMech;

  return (
    <div
      className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100"
      data-testid="hangar-screen"
    >
      <div className="mx-auto max-w-5xl">
        {/* Top Meta Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/80 px-5 py-3">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className="rounded-lg border border-violet-500/40 bg-violet-950/40 px-3 py-1.5 font-bold text-violet-200"
              data-testid="hangar-shards-display"
            >
              ✨ {meta.astralShards.toLocaleString()} Astral Shards
            </span>
            <span className="text-slate-400">
              Runs: {meta.totalRuns} · Victories: {meta.victories}
            </span>
            {hasAnyMetaBonus && (
              <div
                className="flex flex-wrap gap-1.5"
                data-testid="hangar-meta-bonuses"
              >
                {bonuses.hpBonus > 0 && (
                  <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    +{bonuses.hpBonus} HP
                  </span>
                )}
                {bonuses.spBonus > 0 && (
                  <span className="rounded bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
                    +{bonuses.spBonus} SP
                  </span>
                )}
                {bonuses.armorBonus > 0 && (
                  <span className="rounded bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                    +{bonuses.armorBonus} Armor
                  </span>
                )}
                {bonuses.unlockSupportMech && (
                  <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[11px] font-semibold text-cyan-200">
                    🩺 Support Mech Ready
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            data-testid="open-meta-upgrades-btn"
            onClick={() => setShowMetaModal(true)}
            className="cursor-pointer rounded-lg border border-violet-400/50 bg-violet-600/25 px-4 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-600/40"
          >
            ✨ Meta-Upgrades
          </button>
        </div>

        {/* Title */}
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold tracking-[0.25em] text-cyan-400 uppercase">
            Hangar Bay · Unit Selection
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-50">
            PROJECT AEGIS-BREAK
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            เลือกหุ่นยนต์เริ่มต้น 1 เครื่องเพื่อออกปฏิบัติการฝ่าแนวรบ 7 ด่าน
            และปราบบอสใหญ่ Overlord Dreadnought
          </p>
        </header>

        {/* Unit Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {playableUnits.map((unit) => {
            const isSelected = unit.instanceId === selectedId;
            const unitWeapons = getUnitWeapons({ mecha: unit.mecha });
            const isRealRobot = unit.archetype === 'Real Robot';

            const effectiveHp = unit.mecha.maxHp + bonuses.hpBonus;
            const effectiveArmor = unit.mecha.armor + bonuses.armorBonus;
            const effectiveSp = unit.pilot.maxSp + bonuses.spBonus;

            return (
              <button
                key={unit.instanceId}
                type="button"
                data-testid={`hangar-unit-${unit.instanceId}`}
                onClick={() => setSelectedId(unit.instanceId)}
                className={`flex cursor-pointer flex-col justify-between rounded-2xl border p-6 text-left transition-all ${
                  isSelected
                    ? isRealRobot
                      ? 'border-cyan-400 bg-cyan-950/25 ring-2 ring-cyan-400/70 shadow-xl shadow-cyan-950/50'
                      : 'border-amber-400 bg-amber-950/20 ring-2 ring-amber-400/70 shadow-xl shadow-amber-950/40'
                    : 'border-slate-800 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-900'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-14 w-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 text-3xl">
                        {unit.icon}
                      </span>
                      <div>
                        <span
                          className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase ${
                            isRealRobot
                              ? 'bg-cyan-500/20 text-cyan-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {unit.archetype ?? 'Mecha'}
                        </span>
                        <h2 className="mt-1 text-xl font-bold text-slate-50">
                          {unit.mecha.name}
                        </h2>
                        <p className="text-xs text-slate-400">
                          Pilot: {unit.pilot.name}
                        </p>
                      </div>
                    </div>

                    {isSelected && (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                        ✓ SELECTED
                      </span>
                    )}
                  </div>

                  {unit.description && (
                    <p className="mt-3 text-xs leading-relaxed text-slate-300">
                      {unit.description}
                    </p>
                  )}

                  {/* Mecha Stats */}
                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <div className="text-[10px] text-slate-400">HP</div>
                      <div className="font-bold text-emerald-300">
                        {effectiveHp}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <div className="text-[10px] text-slate-400">EN</div>
                      <div className="font-bold text-amber-300">
                        {unit.mecha.maxEn}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <div className="text-[10px] text-slate-400">ARMOR</div>
                      <div className="font-bold text-slate-200">
                        {effectiveArmor}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <div className="text-[10px] text-slate-400">MOB</div>
                      <div className="font-bold text-cyan-300">
                        {unit.mecha.mobility}
                      </div>
                    </div>
                    <div className="rounded-lg border border-slate-800 bg-slate-950/80 p-2">
                      <div className="text-[10px] text-slate-400">MOVE</div>
                      <div className="font-bold text-cyan-300">
                        {unit.mecha.move}
                      </div>
                    </div>
                  </div>

                  {/* Pilot Stats */}
                  <div className="mt-2 grid grid-cols-5 gap-2 text-center text-[11px]">
                    <div className="rounded border border-slate-800/80 bg-slate-950/50 py-1">
                      <span className="text-slate-500">MEL </span>
                      <span className="font-semibold text-slate-200">
                        {unit.pilot.melee}
                      </span>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-slate-950/50 py-1">
                      <span className="text-slate-500">RNG </span>
                      <span className="font-semibold text-slate-200">
                        {unit.pilot.ranged}
                      </span>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-slate-950/50 py-1">
                      <span className="text-slate-500">ACC </span>
                      <span className="font-semibold text-slate-200">
                        {unit.pilot.accuracy}
                      </span>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-slate-950/50 py-1">
                      <span className="text-slate-500">EVD </span>
                      <span className="font-semibold text-slate-200">
                        {unit.pilot.evade}
                      </span>
                    </div>
                    <div className="rounded border border-slate-800/80 bg-slate-950/50 py-1">
                      <span className="text-slate-500">SP </span>
                      <span className="font-semibold text-violet-300">
                        {effectiveSp}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weapons Preview */}
                <div className="mt-4 border-t border-slate-800 pt-3">
                  <div className="mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                    Armaments
                  </div>
                  <div className="space-y-1 text-xs">
                    {unitWeapons.map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between text-slate-300"
                      >
                        <span className="font-medium">{w.name}</span>
                        <span className="text-[11px] text-slate-400">
                          PWR {w.power} · RNG {w.minRange}–{w.maxRange}
                          {w.willRequired > 100
                            ? ` · Will ${w.willRequired}+`
                            : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Start Run CTA */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-testid="start-run-btn"
            onClick={() => onStartRun(selectedId)}
            className="cursor-pointer rounded-xl border border-cyan-400/60 bg-cyan-600 px-10 py-3.5 text-base font-bold text-white shadow-lg shadow-cyan-950/60 transition hover:bg-cyan-500"
          >
            เริ่มเดินทาง (Start Run) →
          </button>
        </div>
      </div>

      {showMetaModal && (
        <MetaUpgradesModal
          meta={meta}
          onPurchase={onPurchaseMetaUpgrade}
          onClose={() => setShowMetaModal(false)}
        />
      )}
    </div>
  );
}
