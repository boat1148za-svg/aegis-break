import { useState } from 'react';
import { getUnitWeapons, unitDefinitions } from '../logic/dataLoader';
import { upgradeCards } from '../logic/upgradeLogic';
import type { WeaponData } from '../logic/types';
import { MechaSprite } from './MechaSprite';
import { PilotPortrait } from './PilotPortrait';

interface CompendiumModalProps {
  onClose: () => void;
}

type CompendiumTab = 'mechas' | 'weapons' | 'upgrades';

export function CompendiumModal({ onClose }: CompendiumModalProps) {
  const [tab, setTab] = useState<CompendiumTab>('mechas');

  // Collect all unique weapons across all unit definitions
  const weaponMap = new Map<string, WeaponData>();
  for (const unit of unitDefinitions) {
    for (const w of getUnitWeapons({ mecha: unit.mecha })) {
      if (!weaponMap.has(w.id)) {
        weaponMap.set(w.id, w);
      }
    }
  }
  const allWeapons = Array.from(weaponMap.values());

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm"
      data-testid="compendium-modal"
    >
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-cyan-500/40 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 bg-slate-950/90 px-6 py-4">
          <div>
            <p className="text-xs font-semibold tracking-widest text-cyan-400 uppercase">
              Tactical Database
            </p>
            <h2 className="text-xl font-bold text-slate-50">
              📖 Mecha Compendium (คลังข้อมูล)
            </h2>
          </div>

          <button
            type="button"
            data-testid="compendium-close-btn"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-700"
          >
            ปิด
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-800 bg-slate-950/50 px-6 py-3">
          <button
            type="button"
            data-testid="compendium-tab-mechas"
            onClick={() => setTab('mechas')}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              tab === 'mechas'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🤖 หุ่นยนต์ &amp; นักบิน ({unitDefinitions.length})
          </button>
          <button
            type="button"
            data-testid="compendium-tab-weapons"
            onClick={() => setTab('weapons')}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              tab === 'weapons'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ⚔️ อาวุธทั้งหมด ({allWeapons.length})
          </button>
          <button
            type="button"
            data-testid="compendium-tab-upgrades"
            onClick={() => setTab('upgrades')}
            className={`cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold transition ${
              tab === 'upgrades'
                ? 'bg-violet-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ✨ การ์ดอัปเกรด &amp; Tactical Chips ({upgradeCards.length})
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'mechas' && (
            <div className="grid gap-4 md:grid-cols-2">
              {unitDefinitions.map((unit) => (
                <div
                  key={unit.instanceId}
                  className="rounded-xl border border-slate-800 bg-slate-950/75 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <MechaSprite
                        mechaId={unit.mecha.id}
                        faction={unit.faction}
                        className="h-12 w-12 shrink-0"
                      />
                      <PilotPortrait
                        pilotId={unit.pilot.id}
                        faction={unit.faction}
                        className="h-11 w-11 shrink-0"
                      />
                      <div>
                        <div className="text-sm font-bold text-slate-100">
                          {unit.mecha.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Pilot: {unit.pilot.name}
                        </div>
                      </div>
                    </div>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        unit.faction === 'player'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {unit.isSupportAlly
                        ? 'Ally'
                        : unit.faction === 'player'
                          ? 'Starter'
                          : 'Enemy'}
                    </span>
                  </div>

                  {unit.description && (
                    <p className="mt-2 text-xs text-slate-400">
                      {unit.description}
                    </p>
                  )}

                  <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[11px]">
                    <div className="rounded bg-slate-900 py-1">
                      <div className="text-[9px] text-slate-500">HP</div>
                      <div className="font-bold text-emerald-300">
                        {unit.mecha.maxHp}
                      </div>
                    </div>
                    <div className="rounded bg-slate-900 py-1">
                      <div className="text-[9px] text-slate-500">EN</div>
                      <div className="font-bold text-amber-300">
                        {unit.mecha.maxEn}
                      </div>
                    </div>
                    <div className="rounded bg-slate-900 py-1">
                      <div className="text-[9px] text-slate-500">ARM</div>
                      <div className="font-bold text-slate-200">
                        {unit.mecha.armor}
                      </div>
                    </div>
                    <div className="rounded bg-slate-900 py-1">
                      <div className="text-[9px] text-slate-500">MOB</div>
                      <div className="font-bold text-cyan-300">
                        {unit.mecha.mobility}
                      </div>
                    </div>
                    <div className="rounded bg-slate-900 py-1">
                      <div className="text-[9px] text-slate-500">MOV</div>
                      <div className="font-bold text-cyan-300">
                        {unit.mecha.move}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'weapons' && (
            <div className="grid gap-3 md:grid-cols-2">
              {allWeapons.map((w) => (
                <div
                  key={w.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/75 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-slate-100">
                      {w.name}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        w.type === 'melee'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                      }`}
                    >
                      {w.type}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-300">
                    <span>
                      PWR <strong className="text-rose-300">{w.power}</strong>
                    </span>
                    <span>
                      RNG{' '}
                      <strong className="text-slate-100">
                        {w.minRange}–{w.maxRange}
                      </strong>
                    </span>
                    <span>
                      EN <strong className="text-amber-300">{w.enCost}</strong>
                    </span>
                    <span>ACC +{w.accuracy}</span>
                    {w.willRequired > 100 && (
                      <span className="text-violet-300">
                        Will {w.willRequired}+
                      </span>
                    )}
                    {w.armorBreakAmount && w.armorBreakAmount > 0 && (
                      <span className="rounded bg-emerald-500/20 px-1.5 text-emerald-300">
                        ARM -{w.armorBreakAmount}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="grid gap-3 md:grid-cols-3">
              {upgradeCards.map((card) => (
                <div
                  key={card.id}
                  className={`rounded-xl border p-4 ${
                    card.category === 'tactical_chips'
                      ? 'border-violet-500/45 bg-violet-950/20'
                      : card.category === 'weapon_tech'
                        ? 'border-amber-500/40 bg-amber-950/15'
                        : 'border-cyan-500/35 bg-cyan-950/15'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-200 uppercase">
                      {card.categoryLabel}
                    </span>
                    {card.unique && (
                      <span className="text-[10px] font-semibold text-violet-300">
                        UNIQUE
                      </span>
                    )}
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-xl">{card.icon}</span>
                    <div>
                      <div className="text-sm font-bold text-slate-100">
                        {card.name}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {card.nameTh}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-300">
                    {card.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
