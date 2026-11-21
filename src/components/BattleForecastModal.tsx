import { isUnitInOverdrive } from '../logic/combatCalculator';
import { MechaSprite } from './MechaSprite';
import { PilotPortrait } from './PilotPortrait';
import type { BattleForecast } from '../logic/types';

interface BattleForecastModalProps {
  forecast: BattleForecast;
  onConfirm: () => void;
  onCancel: () => void;
}

export function BattleForecastModal({
  forecast,
  onConfirm,
  onCancel,
}: BattleForecastModalProps) {
  const {
    attacker,
    defender,
    attackerWeapon,
    attackerPreview,
    supportAttack,
    defenderCounterWeapon,
    defenderPreview,
  } = forecast;

  const totalCombinedDamage =
    attackerPreview.finalDamage +
    (supportAttack ? supportAttack.preview.finalDamage : 0);

  const projectedDefenderHp = Math.max(0, defender.hp - totalCombinedDamage);
  const projectedAttackerHp = defenderPreview
    ? Math.max(0, attacker.hp - defenderPreview.finalDamage)
    : attacker.hp;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md"
      data-testid="battle-forecast-modal"
    >
      <div className="hud-panel-amber radar-bg max-h-[90vh] w-full max-w-3xl overflow-y-auto bg-slate-900/95 shadow-2xl">
        {/* Radar Target-Lock Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#00f0ff]/30 bg-[#080c14]/90 px-6 py-4">
          <div>
            <p className="font-orbitron text-[10px] font-extrabold tracking-[0.26em] text-[#00f0ff] uppercase">
              🎯 TARGET LOCK-ON · RADAR FORECAST
            </p>
            <h2 className="font-orbitron text-lg font-black tracking-wide text-slate-50">
              คาดการณ์การปะทะ (BATTLE FORECAST)
            </h2>
          </div>

          {/* Facing Pilot Face-Off Strip */}
          <div className="flex items-center gap-3">
            <PilotPortrait
              pilotId={attacker.pilot.id}
              faction={attacker.faction}
              className="h-12 w-12 ring-2 ring-[#00f0ff]/80"
            />
            <span className="font-orbitron rounded border border-[#ffb800]/70 bg-[#ffb800]/20 px-2.5 py-1 text-xs font-black tracking-widest text-[#ffb800]">
              VS
            </span>
            <span className="inline-block" style={{ transform: 'scaleX(-1)' }}>
              <PilotPortrait
                pilotId={defender.pilot.id}
                faction={defender.faction}
                className="h-12 w-12 ring-2 ring-[#ff2a55]/80"
              />
            </span>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="grid gap-4 p-6 md:grid-cols-2">
          {/* Attacker Card */}
          <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PilotPortrait
                  pilotId={attacker.pilot.id}
                  faction={attacker.faction}
                  className="h-11 w-11 shrink-0"
                />
                <MechaSprite
                  mechaId={attacker.mecha.id}
                  faction={attacker.faction}
                  className="h-9 w-9 shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-cyan-200">
                    {attacker.mecha.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {attacker.pilot.name} (ฝ่ายเรา)
                  </div>
                </div>
              </div>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300 uppercase">
                Attacker
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              {(isUnitInOverdrive(attacker) ||
                attacker.activeSpirits.valor ||
                attacker.activeSpirits.focus ||
                attacker.activeSpirits.ironWall) && (
                <div
                  className="mb-2 flex flex-wrap gap-1"
                  data-testid="forecast-attacker-buffs"
                >
                  {isUnitInOverdrive(attacker) && (
                    <span className="rounded bg-gradient-to-r from-rose-600/50 to-amber-500/40 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                      ⚡ OVERDRIVE (+30% DMG / +25% CRIT)
                    </span>
                  )}
                  {attacker.activeSpirits.valor && (
                    <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                      🔥 Valor x2.0
                    </span>
                  )}
                  {attacker.activeSpirits.focus && (
                    <span className="rounded bg-cyan-500/25 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                      🎯 Focus +30%
                    </span>
                  )}
                  {attacker.activeSpirits.ironWall && (
                    <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                      🛡️ Iron Wall -50%
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between">
                <span>HP</span>
                <span>
                  {attacker.hp}
                  {defenderPreview && (
                    <span className="text-rose-300">
                      {' '}
                      → {projectedAttackerHp}
                    </span>
                  )}{' '}
                  / {attacker.mecha.maxHp}
                </span>
              </div>
              <div className="flex justify-between">
                <span>EN</span>
                <span>
                  {attacker.en} → {Math.max(0, attacker.en - attackerWeapon.enCost)}{' '}
                  / {attacker.mecha.maxEn}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Armor / Mobility / Will</span>
                <span>
                  {attacker.mecha.armor} / {attacker.mecha.mobility} /{' '}
                  {attacker.will}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/30 bg-slate-950/80 p-3">
              <div className="text-xs font-semibold text-cyan-300">
                อาวุธ: {attackerWeapon.name}
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-[10px] text-slate-400">
                    โอกาสยิงโดน (HitRate)
                  </div>
                  <div
                    className="font-sci-num text-lg font-bold text-[#00f0ff]"
                    data-testid="forecast-attacker-hit"
                  >
                    {attackerPreview.hitRate}%
                  </div>
                  <div className="font-sci-num text-[10px] text-[#ffb800]">
                    CRIT {attackerPreview.critRate}%
                  </div>
                </div>
                <div className="rounded bg-slate-900 p-2">
                  <div className="text-[10px] text-slate-400">
                    ดาเมจคาดการณ์
                  </div>
                  <div
                    className="font-sci-num text-lg font-bold text-[#ffb800]"
                    data-testid="forecast-attacker-dmg"
                  >
                    {attackerPreview.finalDamage.toLocaleString()}
                  </div>
                </div>
              </div>

              {supportAttack && (
                <div
                  className="mt-2.5 rounded-lg border border-emerald-500/40 bg-emerald-950/35 p-2.5 text-xs"
                  data-testid="forecast-support-attack"
                >
                  <div className="flex items-center justify-between font-bold text-emerald-300">
                    <span>
                      🤝 Support Attack: {supportAttack.ally.icon}{' '}
                      {supportAttack.ally.mecha.name}
                    </span>
                    <span className="text-[10px] text-emerald-200">
                      50% DMG · 0 EN
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between text-[11px] text-slate-300">
                    <span>
                      {supportAttack.weapon.name} (Hit{' '}
                      {supportAttack.preview.hitRate}%)
                    </span>
                    <span className="font-bold text-amber-300">
                      +{supportAttack.preview.finalDamage.toLocaleString()} DMG
                    </span>
                  </div>
                  <div className="mt-1 flex justify-between border-t border-emerald-500/25 pt-1 text-[11px] font-bold text-emerald-200">
                    <span>ดาเมจรวมทั้งหมด</span>
                    <span data-testid="forecast-combined-dmg">
                      {totalCombinedDamage.toLocaleString()} DMG
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Defender Card */}
          <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <PilotPortrait
                  pilotId={defender.pilot.id}
                  faction={defender.faction}
                  className="h-11 w-11 shrink-0"
                />
                <MechaSprite
                  mechaId={defender.mecha.id}
                  faction={defender.faction}
                  className="h-9 w-9 shrink-0"
                />
                <div>
                  <div className="text-sm font-bold text-rose-200">
                    {defender.mecha.name}
                  </div>
                  <div className="text-xs text-slate-400">
                    {defender.pilot.name} (ศัตรู)
                  </div>
                </div>
              </div>
              <span className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-300 uppercase">
                Defender
              </span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs text-slate-300">
              {(defender.activeSpirits.valor ||
                defender.activeSpirits.focus ||
                defender.activeSpirits.ironWall) && (
                <div
                  className="mb-2 flex flex-wrap gap-1"
                  data-testid="forecast-defender-buffs"
                >
                  {defender.activeSpirits.valor && (
                    <span className="rounded bg-rose-500/25 px-1.5 py-0.5 text-[10px] font-bold text-rose-200">
                      🔥 Valor x2.0
                    </span>
                  )}
                  {defender.activeSpirits.focus && (
                    <span className="rounded bg-cyan-500/25 px-1.5 py-0.5 text-[10px] font-bold text-cyan-200">
                      🎯 Focus +30%
                    </span>
                  )}
                  {defender.activeSpirits.ironWall && (
                    <span className="rounded bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-bold text-amber-200">
                      🛡️ Iron Wall -50%
                    </span>
                  )}
                </div>
              )}
              <div className="flex justify-between">
                <span>HP</span>
                <span>
                  {defender.hp}{' '}
                  <span className="font-semibold text-amber-300">
                    → {projectedDefenderHp}
                  </span>{' '}
                  / {defender.mecha.maxHp}
                </span>
              </div>
              <div className="flex justify-between">
                <span>EN</span>
                <span>
                  {defender.en} / {defender.mecha.maxEn}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Armor / Mobility / Will</span>
                <span>
                  {defender.mecha.armor} / {defender.mecha.mobility} /{' '}
                  {defender.will}
                </span>
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-rose-500/30 bg-slate-950/80 p-3">
              {defenderCounterWeapon && defenderPreview ? (
                <>
                  <div className="text-xs font-semibold text-rose-300">
                    สวนกลับ (Counter): {defenderCounterWeapon.name}
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-center">
                    <div className="rounded bg-slate-900 p-2">
                      <div className="text-[10px] text-slate-400">
                        โอกาสยิงโดน
                      </div>
                      <div
                        className="font-sci-num text-lg font-bold text-[#ff2a55]"
                        data-testid="forecast-defender-hit"
                      >
                        {defenderPreview.hitRate}%
                      </div>
                    </div>
                    <div className="rounded bg-slate-900 p-2">
                      <div className="text-[10px] text-slate-400">
                        ดาเมจสวนกลับ
                      </div>
                      <div
                        className="font-sci-num text-lg font-bold text-[#ff2a55]"
                        data-testid="forecast-defender-dmg"
                      >
                        {defenderPreview.finalDamage.toLocaleString()}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-4 text-center text-xs text-slate-400">
                  ศัตรูไม่สามารถโจมตีสวนกลับได้ (นอกระยะอาวุธ / EN ไม่พอ)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-800 bg-slate-950/70 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="cursor-pointer rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-700"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            data-testid="confirm-attack-btn"
            onClick={onConfirm}
            className="cursor-pointer rounded-lg border border-rose-400/60 bg-rose-600 px-5 py-2 text-sm font-bold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-500"
          >
            ยืนยันโจมตี (Attack!)
          </button>
        </div>
      </div>
    </div>
  );
}
