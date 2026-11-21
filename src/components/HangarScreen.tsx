import { useState } from 'react';
import {
  getPlayableUnitDefs,
  getUnitDefById,
  getUnitWeapons,
} from '../logic/dataLoader';
import {
  getMetaBonuses,
  getThreatLevelConfig,
  threatLevels,
} from '../logic/metaLogic';
import type { MetaProgressState } from '../logic/types';
import { CompendiumModal } from './CompendiumModal';
import { MetaUpgradesModal } from './MetaUpgradesModal';
import { MechaSprite } from './MechaSprite';
import { PilotPortrait } from './PilotPortrait';

interface HangarScreenProps {
  meta: MetaProgressState;
  onStartRun: (
    unitDefId: string,
    startingAllyIds: string[],
    threatLevel: number
  ) => void;
  onPurchaseMetaUpgrade: (upgradeId: string) => void;
}

export function HangarScreen({
  meta,
  onStartRun,
  onPurchaseMetaUpgrade,
}: HangarScreenProps) {
  const playableUnits = getPlayableUnitDefs();
  const medicDef = getUnitDefById('ally_aegis_medic');
  const supportDef = getUnitDefById('ally_support_mech');
  const [selectedId, setSelectedId] = useState<string>(
    playableUnits[0]?.instanceId ?? 'player_giga_rex'
  );
  const [deployMedic, setDeployMedic] = useState<boolean>(true);
  const [selectedThreatLevel, setSelectedThreatLevel] = useState<number>(
    meta.maxUnlockedThreatLevel
  );
  const [showMetaModal, setShowMetaModal] = useState(false);
  const [showCompendium, setShowCompendium] = useState(false);

  const activeThreatCfg = getThreatLevelConfig(selectedThreatLevel);

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

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="open-compendium-btn"
              onClick={() => setShowCompendium(true)}
              className="cursor-pointer rounded-lg border border-cyan-400/50 bg-cyan-600/20 px-4 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-600/35"
            >
              📖 Compendium
            </button>
            <button
              type="button"
              data-testid="open-meta-upgrades-btn"
              onClick={() => setShowMetaModal(true)}
              className="cursor-pointer rounded-lg border border-violet-400/50 bg-violet-600/25 px-4 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-600/40"
            >
              ✨ Meta-Upgrades
            </button>
          </div>
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
                      <span className="flex h-16 w-16 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 p-1.5">
                        <MechaSprite
                          mechaId={unit.mecha.id}
                          faction="player"
                          className="h-13 w-13"
                        />
                      </span>
                      <PilotPortrait
                        pilotId={unit.pilot.id}
                        faction="player"
                        className="h-14 w-14 shrink-0"
                      />
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

        {/* Squad & Wingman Selection */}
        <div
          className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/75 p-5"
          data-testid="hangar-squad-panel"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-emerald-400 uppercase">
                Squad Deployment (จัดทีมลงสนามสูงสุด 3 เครื่อง)
              </h3>
              <p className="text-[11px] text-slate-400">
                ยืนติดกับเพื่อนร่วมทีมระยะ 1 ช่อง เพื่อเปิดใช้งาน Support Attack
                (+50% DMG, 0 EN) และ Support Defense (รับดาเมจแทนเมื่อ HP &lt; 30%)
              </p>
            </div>
            <span className="rounded bg-slate-800 px-2.5 py-1 text-xs font-bold text-cyan-300">
              Squad: {1 + (deployMedic ? 1 : 0) + (bonuses.unlockSupportMech ? 1 : 0)}{' '}
              / 3 Units
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {medicDef && (
              <button
                type="button"
                data-testid="toggle-ally-medic"
                onClick={() => setDeployMedic((prev) => !prev)}
                className={`flex cursor-pointer items-center justify-between rounded-xl border p-3.5 text-left transition ${
                  deployMedic
                    ? 'border-emerald-400/70 bg-emerald-950/30 ring-1 ring-emerald-400/50'
                    : 'border-slate-800 bg-slate-950/60 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{medicDef.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {medicDef.mecha.name}{' '}
                      <span className="text-[10px] font-semibold text-emerald-300">
                        (Wingman)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Nano-Repair ซ่อมเพื่อนติดกัน + ปืนลดเกราะ -250 Armor
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    deployMedic
                      ? 'bg-emerald-500/25 text-emerald-200'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {deployMedic ? '✓ DEPLOY' : 'OFF'}
                </span>
              </button>
            )}

            {supportDef && (
              <div
                className={`flex items-center justify-between rounded-xl border p-3.5 text-left ${
                  bonuses.unlockSupportMech
                    ? 'border-cyan-400/60 bg-cyan-950/25'
                    : 'border-slate-800 bg-slate-950/40 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{supportDef.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {supportDef.mecha.name}{' '}
                      <span className="text-[10px] font-semibold text-cyan-300">
                        (3rd Slot)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {bonuses.unlockSupportMech
                        ? 'ปลดล็อกแล้ว — ร่วมสู้ตั้งแต่ Node 1!'
                        : 'ปลดล็อกผ่าน Meta-Upgrades หรือรับเพิ่มที่ Node 3'}
                    </div>
                  </div>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    bonuses.unlockSupportMech
                      ? 'bg-cyan-500/25 text-cyan-200'
                      : 'bg-slate-800 text-slate-500'
                  }`}
                >
                  {bonuses.unlockSupportMech ? '✓ READY' : '🔒 LOCKED'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Threat Level Selector (0–5) */}
        <div
          className="mt-6 rounded-2xl border border-rose-500/30 bg-slate-900/75 p-5"
          data-testid="threat-level-selector"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold tracking-wider text-rose-400 uppercase">
                Threat Level (ระดับความยาก 0–5)
              </h3>
              <p className="text-[11px] text-slate-400">
                ปราบบอส Node 7 เพื่อปลดล็อกระดับถัดไปและรับตัวคูณ Astral Shards
                ที่สูงขึ้น
              </p>
            </div>
            <span className="rounded bg-rose-500/15 px-2.5 py-1 text-xs font-bold text-rose-300">
              Shards x{activeThreatCfg.shardMultiplier}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {threatLevels.map((tl) => {
              const isUnlocked = tl.level <= meta.maxUnlockedThreatLevel;
              const isSelected = tl.level === selectedThreatLevel;
              return (
                <button
                  key={tl.level}
                  type="button"
                  data-testid={`threat-level-btn-${tl.level}`}
                  disabled={!isUnlocked}
                  onClick={() => setSelectedThreatLevel(tl.level)}
                  className={`cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-bold transition ${
                    isSelected
                      ? 'border-rose-400 bg-rose-600/30 text-rose-100 ring-1 ring-rose-400/70'
                      : isUnlocked
                        ? 'border-slate-700 bg-slate-950/70 text-slate-200 hover:border-rose-500/50'
                        : 'border-slate-800 bg-slate-950/30 text-slate-600'
                  } disabled:cursor-not-allowed`}
                >
                  <div>{isUnlocked ? tl.badge : `🔒 ${tl.badge}`}</div>
                  <div className="mt-0.5 text-[10px] font-normal opacity-80">
                    x{tl.shardMultiplier}
                  </div>
                </button>
              );
            })}
          </div>

          <p
            className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 px-3 py-2 text-xs text-slate-300"
            data-testid="threat-level-desc"
          >
            <strong className="text-rose-300">{activeThreatCfg.name}:</strong>{' '}
            {activeThreatCfg.description}
          </p>
        </div>

        {/* Start Run CTA */}
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            data-testid="start-run-btn"
            onClick={() =>
              onStartRun(
                selectedId,
                deployMedic ? ['ally_aegis_medic'] : [],
                selectedThreatLevel
              )
            }
            className="cursor-pointer rounded-xl border border-cyan-400/60 bg-cyan-600 px-10 py-3.5 text-base font-bold text-white shadow-lg shadow-cyan-950/60 transition hover:bg-cyan-500"
          >
            เริ่มเดินทาง (Start Run · {activeThreatCfg.badge}) →
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

      {showCompendium && (
        <CompendiumModal onClose={() => setShowCompendium(false)} />
      )}
    </div>
  );
}
