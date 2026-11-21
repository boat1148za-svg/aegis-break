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
import { AmbientBackdrop } from './AmbientBackdrop';
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
  onBackToTitle: () => void;
}

export function HangarScreen({
  meta,
  onStartRun,
  onPurchaseMetaUpgrade,
  onBackToTitle,
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

  const selectedUnit =
    playableUnits.find((u) => u.instanceId === selectedId) ?? playableUnits[0];
  const selectedIsReal = selectedUnit?.archetype === 'Real Robot';
  const selectedWeapons = selectedUnit
    ? getUnitWeapons({ mecha: selectedUnit.mecha })
    : [];

  // Derive benchmark ceiling dynamically from units.json data (no hardcoded stats)
  const benchmarkMax = {
    hp: Math.max(...playableUnits.map((u) => u.mecha.maxHp + bonuses.hpBonus), 1),
    en: Math.max(...playableUnits.map((u) => u.mecha.maxEn), 1),
    armor: Math.max(
      ...playableUnits.map((u) => u.mecha.armor + bonuses.armorBonus),
      1
    ),
    mobility: Math.max(...playableUnits.map((u) => u.mecha.mobility), 1),
  };

  const selectedStatBars = selectedUnit
    ? [
        {
          id: 'hp',
          label: 'HP (INTEGRITY)',
          value: selectedUnit.mecha.maxHp + bonuses.hpBonus,
          max: Math.round(benchmarkMax.hp * 1.08),
          barClass: 'from-emerald-400 to-[#00f0ff]',
          textClass: 'text-emerald-300',
        },
        {
          id: 'en',
          label: 'EN (REACTOR)',
          value: selectedUnit.mecha.maxEn,
          max: Math.round(benchmarkMax.en * 1.1),
          barClass: 'from-amber-400 to-[#ffb800]',
          textClass: 'text-[#ffb800]',
        },
        {
          id: 'armor',
          label: 'ARMOR (PLATING)',
          value: selectedUnit.mecha.armor + bonuses.armorBonus,
          max: Math.round(benchmarkMax.armor * 1.08),
          barClass: 'from-sky-400 to-[#00f0ff]',
          textClass: 'text-[#00f0ff]',
        },
        {
          id: 'mobility',
          label: 'MOBILITY (THRUST)',
          value: selectedUnit.mecha.mobility,
          max: Math.round(benchmarkMax.mobility * 1.12),
          barClass: 'from-fuchsia-400 to-[#00f0ff]',
          textClass: 'text-cyan-200',
        },
      ]
    : [];

  return (
    <div
      className="relative min-h-screen bg-[#080c14] px-6 py-8 text-slate-100"
      data-testid="hangar-screen"
    >
      <AmbientBackdrop />
      <div className="relative z-10 mx-auto max-w-5xl">
        {/* Top Meta Bar */}
        <div className="hud-panel mb-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span
              className="font-sci-num rounded-lg border border-violet-400/50 bg-violet-950/45 px-3 py-1.5 font-bold text-violet-200"
              data-testid="hangar-shards-display"
            >
              ✨ {meta.astralShards.toLocaleString()} Astral Shards
            </span>
            <span className="font-sci-num text-slate-400">
              Runs: {meta.totalRuns} · Victories: {meta.victories}
            </span>
            {hasAnyMetaBonus && (
              <div
                className="flex flex-wrap gap-1.5"
                data-testid="hangar-meta-bonuses"
              >
                {bonuses.hpBonus > 0 && (
                  <span className="font-sci-num rounded bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                    +{bonuses.hpBonus} HP
                  </span>
                )}
                {bonuses.spBonus > 0 && (
                  <span className="font-sci-num rounded bg-violet-500/15 px-2 py-0.5 text-[11px] font-semibold text-violet-300">
                    +{bonuses.spBonus} SP
                  </span>
                )}
                {bonuses.armorBonus > 0 && (
                  <span className="font-sci-num rounded bg-[#ffb800]/15 px-2 py-0.5 text-[11px] font-semibold text-[#ffb800]">
                    +{bonuses.armorBonus} Armor
                  </span>
                )}
                {bonuses.unlockSupportMech && (
                  <span className="rounded bg-[#00f0ff]/20 px-2 py-0.5 text-[11px] font-semibold text-[#00f0ff]">
                    🩺 Support Mech Ready
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              data-testid="hangar-back-title-btn"
              onClick={onBackToTitle}
              className="cursor-pointer rounded-lg border border-slate-700 bg-[#0b1324]/85 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-[#00f0ff]/50 hover:text-white"
            >
              ← Title
            </button>
            <button
              type="button"
              data-testid="open-compendium-btn"
              onClick={() => setShowCompendium(true)}
              className="cursor-pointer rounded-lg border border-[#00f0ff]/55 bg-[#00f0ff]/12 px-4 py-2 text-xs font-bold text-[#00f0ff] transition hover:bg-[#00f0ff]/25"
            >
              📖 Compendium
            </button>
            <button
              type="button"
              data-testid="open-meta-upgrades-btn"
              onClick={() => setShowMetaModal(true)}
              className="cursor-pointer rounded-lg border border-violet-400/55 bg-violet-600/25 px-4 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-600/40"
            >
              ✨ Meta-Upgrades
            </button>
          </div>
        </div>

        {/* Title */}
        <header className="mb-6 text-center">
          <p className="font-orbitron text-[11px] font-bold tracking-[0.28em] text-[#00f0ff] uppercase">
            Hangar Bay · Mecha Launch Platform
          </p>
          <h1 className="font-orbitron mt-1.5 text-3xl font-black tracking-wide text-slate-50 sm:text-4xl">
            PROJECT <span className="text-[#00f0ff]">AEGIS-BREAK</span>
          </h1>
          <p className="mt-1.5 text-xs text-slate-400 sm:text-sm">
            เลือกหุ่นยนต์เริ่มต้น 1 เครื่องจากแท่นปล่อยตัว เพื่อออกปฏิบัติการฝ่าแนวรบ 7 ด่าน
            และโค่นบอสใหญ่ Overlord Dreadnought
          </p>
        </header>

        {/* Featured Mecha Launch Bay Spotlight + Animated Comparative Stat Bars */}
        {selectedUnit && (
          <section
            className={`mb-6 grid gap-6 overflow-hidden p-6 backdrop-blur-md lg:grid-cols-[340px_minmax(0,1fr)] ${
              selectedIsReal ? 'hud-panel' : 'hud-panel-amber'
            }`}
            data-testid="hangar-launch-bay"
          >
            {/* Launch Bay Spotlight Pedestal */}
            <div className="radar-bg relative flex min-h-[250px] flex-col items-center justify-end overflow-hidden rounded-xl border border-[#00f0ff]/25 bg-[#060a12]/90 px-4 pt-6 pb-5">
              {/* Overhead Volumetric Spotlight Cone */}
              <div
                aria-hidden="true"
                className={`pointer-events-none absolute inset-x-6 top-0 bottom-8 blur-md ${
                  selectedIsReal
                    ? 'bg-gradient-to-b from-[#00f0ff]/25 via-[#00f0ff]/8 to-transparent'
                    : 'bg-gradient-to-b from-[#ffb800]/25 via-[#ffb800]/8 to-transparent'
                }`}
                style={{ clipPath: 'polygon(22% 0%, 78% 0%, 100% 100%, 0% 100%)' }}
              />

              {/* Top-left Launch Bay Telemetry */}
              <div className="font-orbitron absolute top-3 left-3 text-[9px] font-bold tracking-[0.2em] text-[#00f0ff]/80 uppercase">
                BAY-01 // READY
              </div>

              {/* Pilot Portrait Corner Tag */}
              <div className="absolute top-3 right-3 flex items-center gap-2 rounded-lg border border-[#00f0ff]/35 bg-[#080c14]/90 p-1.5 backdrop-blur-md">
                <PilotPortrait
                  pilotId={selectedUnit.pilot.id}
                  faction="player"
                  className="h-9 w-9 shrink-0"
                />
                <div className="pr-1 text-left">
                  <div className="text-[9px] tracking-wider text-slate-400 uppercase">
                    PILOT
                  </div>
                  <div className="text-[11px] font-bold text-slate-100">
                    {selectedUnit.pilot.name}
                  </div>
                </div>
              </div>

              {/* Mecha Standing on Launch Pad */}
              <div className="relative z-10 mb-2 flex items-center justify-center">
                <MechaSprite
                  mechaId={selectedUnit.mecha.id}
                  faction="player"
                  enableIdle
                  showShadow
                  className={`h-36 w-36 sm:h-40 sm:w-40 ${
                    selectedIsReal
                      ? 'drop-shadow-[0_0_24px_rgba(0,240,255,0.55)]'
                      : 'drop-shadow-[0_0_24px_rgba(255,184,0,0.55)]'
                  }`}
                />
              </div>

              {/* Holographic Spotlight Floor Rings under Mecha's Feet */}
              <div
                aria-hidden="true"
                className="relative flex h-12 w-56 items-center justify-center"
              >
                {/* Perspective Tilted Spinning Rings */}
                <div
                  className="absolute inset-0 flex items-center justify-center"
                  style={{ transform: 'perspective(260px) rotateX(68deg)' }}
                >
                  <div
                    className={`animate-spin-slow h-44 w-44 rounded-full border-2 border-dashed ${
                      selectedIsReal
                        ? 'border-[#00f0ff]/80 shadow-[0_0_26px_rgba(0,240,255,0.65)]'
                        : 'border-[#ffb800]/85 shadow-[0_0_26px_rgba(255,184,0,0.65)]'
                    }`}
                  />
                  <div
                    className={`absolute h-30 w-30 rounded-full border-2 ${
                      selectedIsReal
                        ? 'border-[#00f0ff] bg-[#00f0ff]/20'
                        : 'border-[#ffb800] bg-[#ffb800]/20'
                    }`}
                  />
                  <div
                    className={`absolute h-16 w-16 rounded-full blur-md ${
                      selectedIsReal ? 'bg-[#00f0ff]/45' : 'bg-[#ffb800]/45'
                    }`}
                  />
                </div>
                <span className="font-orbitron relative z-10 mt-6 rounded border border-white/15 bg-[#080c14]/85 px-3 py-0.5 text-[10px] font-bold tracking-[0.22em] text-slate-200 uppercase">
                  {selectedUnit.mecha.name}
                </span>
              </div>
            </div>

            {/* Right: Animated Stat Comparison Bars & Spec Telemetry */}
            <div className="flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span
                      className={`font-orbitron inline-block rounded px-2.5 py-0.5 text-[10px] font-bold tracking-widest uppercase ${
                        selectedIsReal
                          ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                          : 'bg-[#ffb800]/20 text-[#ffb800]'
                      }`}
                    >
                      {selectedUnit.archetype ?? 'Mecha'} · LAUNCH SPEC
                    </span>
                    <h2 className="font-orbitron mt-1 text-2xl font-black text-white">
                      {selectedUnit.mecha.name}
                    </h2>
                  </div>
                  <div className="font-sci-num rounded-lg border border-[#00f0ff]/35 bg-[#080c14]/80 px-3 py-1.5 text-right text-xs">
                    <div className="text-[10px] text-slate-400">MOVE / SP</div>
                    <div className="font-bold text-[#00f0ff]">
                      {selectedUnit.mecha.move} Tiles ·{' '}
                      <span className="text-violet-300">
                        {selectedUnit.pilot.maxSp + bonuses.spBonus} SP
                      </span>
                    </div>
                  </div>
                </div>

                {selectedUnit.description && (
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {selectedUnit.description}
                  </p>
                )}

                {/* Animated Comparative Stat Bars (HP, EN, Armor, Mobility) */}
                <div
                  className="mt-4 space-y-3 rounded-xl border border-[#00f0ff]/20 bg-[#080c14]/75 p-4"
                  data-testid="hangar-stat-bars"
                >
                  {selectedStatBars.map((stat) => {
                    const pct = Math.min(
                      100,
                      Math.max(10, Math.round((stat.value / stat.max) * 100))
                    );
                    return (
                      <div key={stat.id} data-testid={`hangar-bar-${stat.id}`}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-orbitron text-[10px] font-bold tracking-wider text-slate-400">
                            {stat.label}
                          </span>
                          <span
                            className={`font-sci-num text-sm font-extrabold ${stat.textClass}`}
                          >
                            {stat.value.toLocaleString()}
                          </span>
                        </div>
                        <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-900/95 ring-1 ring-white/10">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${stat.barClass} shadow-[0_0_12px_rgba(0,240,255,0.45)] transition-all duration-700 ease-out`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Selected Mecha Armaments Preview */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {selectedWeapons.map((w) => (
                  <div
                    key={w.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-[#080c14]/75 px-3 py-1.5 text-xs"
                  >
                    <span className="truncate font-semibold text-slate-100">
                      {w.name}
                    </span>
                    <span className="font-sci-num ml-2 shrink-0 text-[10px] text-slate-400">
                      <strong className="text-[#ff2a55]">{w.power}</strong> · R
                      {w.minRange}-{w.maxRange}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Unit Selection Switcher Cards */}
        <div className="grid gap-5 md:grid-cols-2">
          {playableUnits.map((unit) => {
            const isSelected = unit.instanceId === selectedId;
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
                className={`flex cursor-pointer flex-col justify-between p-5 text-left backdrop-blur-md transition-all ${
                  isSelected
                    ? isRealRobot
                      ? 'hud-panel ring-2 ring-[#00f0ff] shadow-[0_0_26px_rgba(0,240,255,0.22)]'
                      : 'hud-panel-amber ring-2 ring-[#ffb800] shadow-[0_0_26px_rgba(255,184,0,0.22)]'
                    : 'hud-panel opacity-80 hover:opacity-100'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-15 w-15 items-center justify-center rounded-xl border border-[#00f0ff]/25 bg-[#080c14] p-1.5">
                      <MechaSprite
                        mechaId={unit.mecha.id}
                        faction="player"
                        className="h-12 w-12"
                      />
                    </span>
                    <PilotPortrait
                      pilotId={unit.pilot.id}
                      faction="player"
                      className="h-13 w-13 shrink-0"
                    />
                    <div>
                      <span
                        className={`font-orbitron inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase ${
                          isRealRobot
                            ? 'bg-[#00f0ff]/20 text-[#00f0ff]'
                            : 'bg-[#ffb800]/20 text-[#ffb800]'
                        }`}
                      >
                        {unit.archetype ?? 'Mecha'}
                      </span>
                      <h3 className="font-orbitron mt-1 text-lg font-bold text-slate-50">
                        {unit.mecha.name}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Pilot: {unit.pilot.name}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <span className="font-orbitron rounded-full border border-emerald-400/60 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-300">
                      ✓ ACTIVE
                    </span>
                  )}
                </div>

                {/* Compact Stat Strip */}
                <div className="mt-4 grid grid-cols-5 gap-1.5 text-center text-[11px]">
                  <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 p-1.5">
                    <div className="text-[9px] text-slate-400">HP</div>
                    <div className="font-sci-num font-bold text-emerald-300">
                      {effectiveHp}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 p-1.5">
                    <div className="text-[9px] text-slate-400">EN</div>
                    <div className="font-sci-num font-bold text-[#ffb800]">
                      {unit.mecha.maxEn}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 p-1.5">
                    <div className="text-[9px] text-slate-400">ARM</div>
                    <div className="font-sci-num font-bold text-slate-100">
                      {effectiveArmor}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 p-1.5">
                    <div className="text-[9px] text-slate-400">MOB</div>
                    <div className="font-sci-num font-bold text-[#00f0ff]">
                      {unit.mecha.mobility}
                    </div>
                  </div>
                  <div className="rounded-lg border border-slate-800 bg-[#080c14]/80 p-1.5">
                    <div className="text-[9px] text-slate-400">SP</div>
                    <div className="font-sci-num font-bold text-violet-300">
                      {effectiveSp}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Squad & Wingman Selection */}
        <div
          className="hud-panel mt-6 p-5 backdrop-blur-md"
          data-testid="hangar-squad-panel"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-[#00f0ff] uppercase">
                Squad Deployment (จัดทีมลงสนามสูงสุด 3 เครื่อง)
              </h3>
              <p className="text-[11px] text-slate-400">
                ยืนติดกับเพื่อนร่วมทีมระยะ 1 ช่อง เพื่อเปิดใช้งาน Support Attack
                (+50% DMG, 0 EN) และ Support Defense (รับดาเมจแทนเมื่อ HP &lt; 30%)
              </p>
            </div>
            <span className="font-sci-num rounded border border-[#00f0ff]/40 bg-[#080c14]/85 px-2.5 py-1 text-xs font-bold text-[#00f0ff]">
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
                    : 'border-slate-800 bg-[#080c14]/70 opacity-70 hover:opacity-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <MechaSprite
                    mechaId={medicDef.mecha.id}
                    faction="player"
                    className="h-10 w-10 shrink-0"
                  />
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
                  className={`font-orbitron rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
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
                    ? 'border-[#00f0ff]/60 bg-[#00f0ff]/10'
                    : 'border-slate-800 bg-[#080c14]/50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{supportDef.icon}</span>
                  <div>
                    <div className="text-sm font-bold text-slate-100">
                      {supportDef.mecha.name}{' '}
                      <span className="text-[10px] font-semibold text-[#00f0ff]">
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
                  className={`font-orbitron rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                    bonuses.unlockSupportMech
                      ? 'bg-[#00f0ff]/25 text-[#00f0ff]'
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
          className="hud-panel-rose mt-6 p-5 backdrop-blur-md"
          data-testid="threat-level-selector"
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-orbitron text-xs font-bold tracking-wider text-[#ff2a55] uppercase">
                Threat Level (ระดับความยาก 0–5)
              </h3>
              <p className="text-[11px] text-slate-400">
                ปราบบอส Node 7 เพื่อปลดล็อกระดับถัดไปและรับตัวคูณ Astral Shards
                ที่สูงขึ้น
              </p>
            </div>
            <span className="font-sci-num rounded border border-[#ff2a55]/45 bg-[#ff2a55]/15 px-2.5 py-1 text-xs font-bold text-[#ff2a55]">
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
                  className={`font-sci-num cursor-pointer rounded-lg border px-2 py-2 text-center text-xs font-bold transition ${
                    isSelected
                      ? 'border-[#ff2a55] bg-[#ff2a55]/30 text-white ring-1 ring-[#ff2a55]/80'
                      : isUnlocked
                        ? 'border-slate-700 bg-[#080c14]/75 text-slate-200 hover:border-[#ff2a55]/55'
                        : 'border-slate-800 bg-[#080c14]/35 text-slate-600'
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
            className="mt-3 rounded-lg border border-slate-800 bg-[#080c14]/75 px-3 py-2 text-xs text-slate-300"
            data-testid="threat-level-desc"
          >
            <strong className="text-[#ff2a55]">{activeThreatCfg.name}:</strong>{' '}
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
            className="hud-btn font-orbitron cursor-pointer border border-[#00f0ff]/80 bg-gradient-to-r from-cyan-600 via-[#00b8d4] to-blue-600 px-10 py-3.5 text-sm font-black tracking-wider text-white shadow-[0_0_28px_rgba(0,240,255,0.4)] transition hover:brightness-115 sm:text-base"
          >
            🚀 LAUNCH SORTIE ({activeThreatCfg.badge}) →
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
